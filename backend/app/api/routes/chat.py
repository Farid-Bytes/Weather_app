"""POST /chat endpoint: the main chatbot conversation route.

Wires together session/history management, a simple per-IP rate limiter,
and the Groq function-calling loop in `app.core.groq_client`.
"""

from __future__ import annotations

import re
import time
import uuid
from collections import defaultdict, deque

from fastapi import APIRouter, HTTPException, Request
from groq import AsyncGroq
from loguru import logger

from app.config import get_settings
from app.core.groq_client import GroqClientError, build_client, run_chat
from app.schemas.chat import ChatRequest, ChatResponse, HistoryTurn
from app.services.weather_service import get_weather, LocationNotFoundError, WeatherServiceError

router = APIRouter(tags=["chat"])

# --- In-memory session store -------------------------------------------------
# Maps session_id -> list of prior HistoryTurn objects.
#
# NOTE (production): this in-memory dict is fine for a single-process v1 demo,
# but will not survive restarts or work across multiple workers/replicas. Swap
# this for a Redis-backed store (e.g. `redis.asyncio` with a TTL per session
# key) before running with more than one uvicorn worker or behind a load
# balancer with multiple instances.
_SESSIONS: dict[str, list[HistoryTurn]] = {}

# --- In-memory rate limiter ---------------------------------------------------
# Simple sliding-window token bucket per client IP: allows `_RATE_LIMIT`
# requests per `_RATE_WINDOW_SECONDS`. Sufficient for a single-process v1.
#
# NOTE (production): replace with a Redis-backed limiter (e.g. `slowapi` with
# a Redis backend, or a token bucket stored in Redis with atomic Lua scripts)
# so limits are enforced consistently across multiple worker processes/hosts.
_RATE_LIMIT = 20
_RATE_WINDOW_SECONDS = 60
_request_log: dict[str, deque[float]] = defaultdict(deque)


def _check_rate_limit(client_ip: str) -> None:
    """Raise HTTP 429 if `client_ip` has exceeded the allowed request rate."""
    now = time.monotonic()
    window = _request_log[client_ip]

    while window and now - window[0] > _RATE_WINDOW_SECONDS:
        window.popleft()

    if len(window) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please slow down and try again shortly.",
        )
    window.append(now)


_GROQ_FALLBACK_MODELS = (
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
)
_MAX_HISTORY_TURNS = 20


def _is_model_unavailable(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(
        token in text
        for token in ("not found", "does not exist", "decommissioned", "model_not_found", "404")
    )


def _extract_location(message: str) -> str | None:
    ctx = re.search(r"context:\s*([^)\n]+)", message, re.I)
    if ctx:
        return ctx.group(1).split(",")[0].strip()
    match = re.search(
        r"\b(?:in|for|at)\s+([A-Za-z][A-Za-z\s.'-]{1,48}?)(?:\s+right now|\s*\?|$)",
        message,
        re.I,
    )
    if match:
        return match.group(1).strip(" .")
    return None


async def _direct_weather_reply(message: str) -> tuple[str, str | None, dict | None]:
    location = _extract_location(message)
    if not location:
        return (
            "I can look up live weather for any city. Try: “What is the weather in Lahore?”",
            None,
            None,
        )
    data = await get_weather(location=location, forecast_days=1, units="metric")
    current = data.get("current") or {}
    reply = (
        f"Right now in {data.get('resolved_location')}: "
        f"{current.get('temperature')}°, {current.get('condition')}. "
        f"Feels like {current.get('feels_like')}°. "
        f"Humidity {current.get('humidity_percent')}%, "
        f"wind {current.get('wind_speed')}."
    )
    return reply, data.get("resolved_location"), data


_groq_client_singleton: AsyncGroq | None = None


def _get_groq_client() -> AsyncGroq:
    """Lazily build and cache a single Groq client for the process lifetime."""
    global _groq_client_singleton
    if _groq_client_singleton is None:
        settings = get_settings()
        _groq_client_singleton = build_client(settings.groq_api_key)
    return _groq_client_singleton


@router.post("/chat", response_model=ChatResponse)
async def chat(request: Request, body: ChatRequest) -> ChatResponse:
    """Handle a single chatbot turn.

    - Resolves/creates a session id and merges history.
    - Runs the Groq function-calling loop against the weather tool.
    - Maps upstream failures to clean HTTP responses (502 for Groq errors;
      weather/geocoding errors are already handled gracefully inside the
      Groq loop, which asks the user to clarify instead of erroring out).
    """
    settings = get_settings()
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)

    session_id = body.session_id or str(uuid.uuid4())
    history = body.history if body.history is not None else _SESSIONS.get(session_id, [])

    start = time.monotonic()
    logger.info(
        "Incoming /chat request | session_id={} | message={!r}",
        session_id,
        body.message,
    )

    try:
        groq_client = _get_groq_client()
        models = list(dict.fromkeys([settings.groq_model, *_GROQ_FALLBACK_MODELS]))
        last_error: Exception | None = None
        reply = location_resolved = weather_data = None
        for index, model in enumerate(models):
            try:
                reply, location_resolved, weather_data = await run_chat(
                    client=groq_client,
                    model=model,
                    message=body.message,
                    history=history,
                )
                last_error = None
                break
            except GroqClientError as exc:
                last_error = exc
                logger.warning("Groq model {} failed: {}", model, exc)
                if not _is_model_unavailable(exc):
                    break
                if index == len(models) - 1:
                    break
        if last_error is not None:
            raise last_error
    except (GroqClientError, LocationNotFoundError, WeatherServiceError) as exc:
        logger.error("Chat fallback for session {}: {}", session_id, exc)
        try:
            reply, location_resolved, weather_data = await _direct_weather_reply(body.message)
        except Exception as fallback_exc:
            logger.error("Direct weather fallback failed: {}", fallback_exc)
            raise HTTPException(
                status_code=502,
                detail="The weather assistant is temporarily unavailable. Please try again shortly.",
            ) from fallback_exc

    updated_history = list(history) + [
        HistoryTurn(role="user", content=body.message),
        HistoryTurn(role="model", content=reply),
    ]
    _SESSIONS[session_id] = updated_history[-_MAX_HISTORY_TURNS:]

    elapsed_ms = (time.monotonic() - start) * 1000
    logger.info(
        "Completed /chat request | session_id={} | location={} | tool_used={} | took={:.1f}ms",
        session_id,
        location_resolved,
        weather_data is not None,
        elapsed_ms,
    )

    return ChatResponse(
        reply=reply,
        location_resolved=location_resolved,
        weather_data=weather_data,
        session_id=session_id,
    )
