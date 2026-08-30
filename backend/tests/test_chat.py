"""Integration tests for POST /chat with a fully mocked Groq client.

We fake the minimal shape of the Groq/OpenAI-style response objects that
`app.core.groq_client.run_chat` relies on, so these tests exercise the real
function-calling loop and route logic without any live network calls.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

import pytest
from fastapi.testclient import TestClient

import app.api.routes.chat as chat_route
import app.core.groq_client as groq_client_module
from app.main import app


@dataclass
class FakeFunction:
    name: str
    arguments: str  # JSON-encoded string, matching the real Groq/OpenAI SDK shape


@dataclass
class FakeToolCall:
    id: str
    function: FakeFunction


@dataclass
class FakeMessage:
    content: str | None
    tool_calls: list[FakeToolCall] = field(default_factory=list)


@dataclass
class FakeChoice:
    message: FakeMessage


@dataclass
class FakeResponse:
    choices: list[FakeChoice]


class FakeCompletions:
    """Simulates client.chat.completions with a scripted sequence of responses."""

    def __init__(self, responses: list[FakeResponse]) -> None:
        self._responses = list(responses)
        self.call_count = 0

    async def create(self, model: str, messages: list, tools, tool_choice) -> FakeResponse:  # noqa: ANN001
        response = self._responses[self.call_count]
        self.call_count += 1
        return response


class FakeChat:
    def __init__(self, completions: FakeCompletions) -> None:
        self.completions = completions


class FakeGroqClient:
    def __init__(self, responses: list[FakeResponse]) -> None:
        self.chat = FakeChat(FakeCompletions(responses))


@pytest.fixture(autouse=True)
def reset_chat_state():
    """Reset in-memory session store, rate limiter, and cached Groq client between tests."""
    chat_route._SESSIONS.clear()
    chat_route._request_log.clear()
    chat_route._groq_client_singleton = None
    yield
    chat_route._SESSIONS.clear()
    chat_route._request_log.clear()
    chat_route._groq_client_singleton = None


def test_chat_with_tool_call_returns_weather_reply(monkeypatch: pytest.MonkeyPatch) -> None:
    """A message that triggers a function call should resolve weather data and reply."""
    # Round 1: the model asks for weather data via a tool call.
    tool_call_response = FakeResponse(
        choices=[
            FakeChoice(
                message=FakeMessage(
                    content=None,
                    tool_calls=[
                        FakeToolCall(
                            id="call_1",
                            function=FakeFunction(
                                name="get_weather",
                                arguments=json.dumps(
                                    {"location": "Lahore", "forecast_days": 1, "units": "metric"}
                                ),
                            ),
                        )
                    ],
                )
            )
        ]
    )
    # Round 2: the model produces the final natural-language reply.
    final_response = FakeResponse(
        choices=[
            FakeChoice(
                message=FakeMessage(
                    content="It's sunny in Lahore, Punjab, Pakistan at 34°C.",
                    tool_calls=[],
                )
            )
        ]
    )

    fake_client = FakeGroqClient([tool_call_response, final_response])
    monkeypatch.setattr(chat_route, "_get_groq_client", lambda: fake_client)

    fake_weather_payload = {
        "resolved_location": "Lahore, Punjab, Pakistan",
        "latitude": 31.55,
        "longitude": 74.35,
        "units": "metric",
        "current": {
            "temperature": 34.0,
            "feels_like": 36.0,
            "condition": "Clear sky",
            "humidity_percent": 40,
            "wind_speed": 10.0,
        },
        "forecast": [],
    }

    async def fake_get_weather(**kwargs) -> dict[str, Any]:
        return fake_weather_payload

    monkeypatch.setattr(groq_client_module, "get_weather", fake_get_weather)

    client = TestClient(app)
    response = client.post("/chat", json={"message": "What's the weather in Lahore right now?"})

    assert response.status_code == 200
    body = response.json()
    assert body["location_resolved"] == "Lahore, Punjab, Pakistan"
    assert body["weather_data"] == fake_weather_payload
    assert "Lahore" in body["reply"]
    assert "session_id" in body and body["session_id"]


def test_chat_accepts_assistant_history_role(monkeypatch: pytest.MonkeyPatch) -> None:
    """History turns sent from the frontend using the assistant role should be accepted."""
    final_response = FakeResponse(
        choices=[
            FakeChoice(
                message=FakeMessage(
                    content="I can help with the weather.",
                    tool_calls=[],
                )
            )
        ]
    )
    fake_client = FakeGroqClient([final_response])
    monkeypatch.setattr(chat_route, "_get_groq_client", lambda: fake_client)

    client = TestClient(app)
    response = client.post(
        "/chat",
        json={
            "message": "What's the weather in Lahore?",
            "history": [{"role": "assistant", "content": "Hello there"}],
        },
    )

    assert response.status_code == 200


def test_chat_without_tool_call_for_non_weather_question(monkeypatch: pytest.MonkeyPatch) -> None:
    """A non-weather question should return a redirect reply with no weather_data."""
    final_response = FakeResponse(
        choices=[
            FakeChoice(
                message=FakeMessage(
                    content="I'm a weather assistant — ask me about conditions or forecasts!",
                    tool_calls=[],
                )
            )
        ]
    )
    fake_client = FakeGroqClient([final_response])
    monkeypatch.setattr(chat_route, "_get_groq_client", lambda: fake_client)

    client = TestClient(app)
    response = client.post("/chat", json={"message": "Tell me a joke"})

    assert response.status_code == 200
    body = response.json()
    assert body["weather_data"] is None
    assert body["location_resolved"] is None
    assert "weather" in body["reply"].lower()


def test_chat_groq_failure_falls_back_to_direct_weather(monkeypatch: pytest.MonkeyPatch) -> None:
    """If Groq fails, /chat should still answer from live Open-Meteo data."""

    async def failing_run_chat(*args, **kwargs):
        raise groq_client_module.GroqClientError("boom")

    async def fake_get_weather(**kwargs) -> dict[str, Any]:
        return {
            "resolved_location": "Lahore, Punjab, Pakistan",
            "current": {
                "temperature": 34.0,
                "feels_like": 36.0,
                "condition": "Clear sky",
                "humidity_percent": 40,
                "wind_speed": 10.0,
            },
        }

    monkeypatch.setattr(chat_route, "run_chat", failing_run_chat)
    monkeypatch.setattr(chat_route, "get_weather", fake_get_weather)
    monkeypatch.setattr(chat_route, "_get_groq_client", lambda: FakeGroqClient([]))

    client = TestClient(app)
    response = client.post("/chat", json={"message": "What's the weather in Lahore right now?"})

    assert response.status_code == 200
    body = response.json()
    assert "Lahore" in body["reply"]
    assert body["location_resolved"] == "Lahore, Punjab, Pakistan"


def test_chat_groq_and_weather_failure_returns_502(monkeypatch: pytest.MonkeyPatch) -> None:
    """If Groq and the Open-Meteo fallback both fail, /chat returns a clean 502."""

    async def failing_run_chat(*args, **kwargs):
        raise groq_client_module.GroqClientError("boom")

    async def failing_weather(**kwargs):
        raise chat_route.WeatherServiceError("down")

    monkeypatch.setattr(chat_route, "run_chat", failing_run_chat)
    monkeypatch.setattr(chat_route, "get_weather", failing_weather)
    monkeypatch.setattr(chat_route, "_get_groq_client", lambda: FakeGroqClient([]))

    client = TestClient(app)
    response = client.post("/chat", json={"message": "What's the weather in Lahore?"})

    assert response.status_code == 502
    assert "unavailable" in response.json()["detail"].lower()
