"""Pydantic models for the /chat endpoint request and response bodies."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class HistoryTurn(BaseModel):
    """A single prior turn in the conversation history.

    "user" for the human, "model" for the assistant's prior replies. (Kept as
    "model" rather than "assistant" for API stability; it's translated to the
    provider's expected role internally in `app.core.groq_client`.)
    """

    role: Literal["user", "model", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """Incoming request body for POST /chat."""

    message: str = Field(..., min_length=1, description="The user's natural-language message.")
    session_id: str | None = Field(
        default=None,
        description="Client-supplied session identifier for multi-turn context. "
        "If omitted, a new session is created and its id returned.",
    )
    history: list[HistoryTurn] | None = Field(
        default=None,
        description="Optional explicit history to seed/override the server-side session "
        "history for this request.",
    )


class ChatResponse(BaseModel):
    """Response body returned by POST /chat."""

    reply: str = Field(..., description="The model's final natural-language reply to the user.")
    location_resolved: str | None = Field(
        default=None,
        description="Human-readable resolved location name (e.g. 'Lahore, Punjab, Pakistan'), "
        "if a location lookup occurred.",
    )
    weather_data: dict[str, Any] | None = Field(
        default=None,
        description="Raw structured weather data used to produce the reply, if any tool call "
        "was made.",
    )
    session_id: str = Field(..., description="Session id to pass on subsequent requests.")
