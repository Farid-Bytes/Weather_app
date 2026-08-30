"""Groq SDK wrapper implementing the weather function-calling loop.

Groq's chat completions API is OpenAI-compatible. This module is responsible
for:
1. Sending the user's message (plus history) to Groq with the `get_weather`
   tool registered.
2. When the model emits a tool call, executing it against
   `app.services.weather_service.get_weather` and feeding the result back
   as a "tool" role message.
3. Repeating step 2 for up to `MAX_TOOL_ROUNDS` round trips (the model may
   need to call the tool more than once, e.g. to compare two cities).
4. Returning the model's final natural-language reply, along with the last
   resolved location and weather payload (for the API response body).
"""

from __future__ import annotations

import json
from typing import Any

import httpx
from groq import AsyncGroq
from loguru import logger

from app.core.http_client import get_http_client
from app.schemas.chat import HistoryTurn
from app.services.weather_service import (
    LocationNotFoundError,
    WeatherServiceError,
    get_weather,
)
from app.tools.weather_tool import GET_WEATHER_FUNCTION_NAME, SYSTEM_INSTRUCTION, weather_tools

# Maximum number of model <-> tool round trips per single /chat request.
# The task spec requires supporting at least 2; we allow a small buffer above
# that so multi-city comparisons still resolve, while still bounding cost/latency.
MAX_TOOL_ROUNDS = 4


class GroqClientError(Exception):
    """Raised when the Groq API call fails (network error, bad response, etc.)."""


def build_client(api_key: str) -> AsyncGroq:
    """Construct an async Groq SDK client for the given API key.

    Kept as a thin factory so tests can monkeypatch/mock it easily instead of
    hitting the real network.
    """
    return AsyncGroq(api_key=api_key)


def _history_to_messages(history: list[HistoryTurn] | None) -> list[dict[str, Any]]:
    """Convert our `HistoryTurn` schema into OpenAI/Groq-style chat messages.

    Our schema uses "model" for assistant turns (a holdover-neutral name);
    Groq/OpenAI expect "assistant".
    """
    messages: list[dict[str, Any]] = []
    for turn in history or []:
        if turn.role in {"model", "assistant"}:
            role = "assistant"
        else:
            role = "user"
        messages.append({"role": role, "content": turn.content})
    return messages


def _compact_tool_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Shrink weather JSON sent back to Groq; keep tokens and latency down."""
    if payload.get("error"):
        return payload
    current = payload.get("current") or {}
    forecast = payload.get("forecast") or []
    return {
        "resolved_location": payload.get("resolved_location"),
        "units": payload.get("units"),
        "current": {
            "temperature": current.get("temperature"),
            "feels_like": current.get("feels_like"),
            "condition": current.get("condition"),
            "humidity_percent": current.get("humidity_percent"),
            "wind_speed": current.get("wind_speed"),
        },
        "forecast": [
            {
                "date": day.get("date"),
                "temp_max": day.get("temp_max"),
                "temp_min": day.get("temp_min"),
                "condition": day.get("condition"),
                "precipitation_probability_percent": day.get(
                    "precipitation_probability_percent"
                ),
            }
            for day in forecast[:7]
        ],
    }


async def _execute_weather_tool_call(
    arguments_json: str,
    http_client: httpx.AsyncClient,
) -> tuple[dict[str, Any], str | None]:
    """Execute the `get_weather` function call requested by the model.

    Returns a tuple of (function_response_payload, resolved_location_or_None).
    Errors are translated into a structured payload (rather than raised) so
    the model can see the failure and ask the user to clarify, per spec.
    """
    try:
        args = json.loads(arguments_json) if arguments_json else {}
    except json.JSONDecodeError:
        logger.warning("Could not parse tool call arguments as JSON: {!r}", arguments_json)
        args = {}

    location = args.get("location", "")
    forecast_days = int(args.get("forecast_days", 1) or 1)
    units = args.get("units", "metric") or "metric"

    try:
        result = await get_weather(
            location=location,
            forecast_days=forecast_days,
            units=units,
            client=http_client,
        )
        return result, result.get("resolved_location")
    except LocationNotFoundError as exc:
        logger.info("Location not resolved: {}", exc)
        return {"error": "location_not_found", "message": str(exc)}, None
    except WeatherServiceError as exc:
        logger.error("Weather service error: {}", exc)
        return {"error": "weather_service_unavailable", "message": str(exc)}, None


async def run_chat(
    client: AsyncGroq,
    model: str,
    message: str,
    history: list[HistoryTurn] | None,
) -> tuple[str, str | None, dict[str, Any] | None]:
    """Run one full chat turn, including any Groq function-calling loop.

    Args:
        client: A constructed `AsyncGroq` client.
        model: Groq model name (e.g. "llama-3.3-70b-versatile").
        message: The user's new message for this turn.
        history: Prior conversation turns to include as context.

    Returns:
        (reply_text, location_resolved, weather_data) — `location_resolved`
        and `weather_data` are None if no tool call occurred (e.g. for a
        redirected non-weather question).

    Raises:
        GroqClientError: if the underlying Groq API call fails.
    """
    messages: list[dict[str, Any]] = [{"role": "system", "content": SYSTEM_INSTRUCTION}]
    messages.extend(_history_to_messages(history))
    messages.append({"role": "user", "content": message})

    last_location: str | None = None
    last_weather_data: dict[str, Any] | None = None
    http_client = get_http_client()

    for round_index in range(MAX_TOOL_ROUNDS):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                tools=weather_tools,
                tool_choice="auto",
            )
        except Exception as exc:
            logger.error("Groq API call failed on round {}: {}", round_index, exc)
            raise GroqClientError(f"Groq API call failed: {exc}") from exc

        choice = response.choices[0] if response.choices else None
        if choice is None or choice.message is None:
            raise GroqClientError("Groq returned an empty response.")

        assistant_message = choice.message
        tool_calls = assistant_message.tool_calls or []

        messages.append(
            {
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in tool_calls
                ]
                or None,
            }
        )

        if not tool_calls:
            reply_text = (assistant_message.content or "").strip()
            logger.info(
                "Groq replied without tool call (round {}): {} chars",
                round_index,
                len(reply_text),
            )
            return reply_text, last_location, last_weather_data

        for tc in tool_calls:
            if tc.function.name != GET_WEATHER_FUNCTION_NAME:
                logger.warning("Model requested unknown function '{}'", tc.function.name)
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "name": tc.function.name,
                        "content": json.dumps(
                            {"error": f"Unknown function '{tc.function.name}'"}
                        ),
                    }
                )
                continue

            payload, resolved = await _execute_weather_tool_call(
                tc.function.arguments, http_client
            )
            if resolved:
                last_location = resolved
                last_weather_data = payload
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tc.function.name,
                    "content": json.dumps(_compact_tool_payload(payload)),
                }
            )

        logger.debug("Completed tool round {} with {} call(s)", round_index, len(tool_calls))

    logger.warning("Exceeded max tool rounds ({}) without final reply", MAX_TOOL_ROUNDS)
    return (
        "I'm having trouble pulling that together right now — could you try rephrasing "
        "your question or asking about one location at a time?",
        last_location,
        last_weather_data,
    )
