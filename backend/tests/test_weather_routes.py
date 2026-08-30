"""Integration tests for GET /weather and GET /search."""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services import weather_service


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_weather_requires_location_or_coords(client: TestClient) -> None:
    response = client.get("/weather")
    assert response.status_code == 400


def test_weather_by_location(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    async def fake_get_weather(**kwargs: Any) -> dict[str, Any]:
        return {
            "resolved_location": "Lahore, Punjab, Pakistan",
            "latitude": 31.55,
            "longitude": 74.35,
            "units": "metric",
            "current": {"temperature": 34.0, "condition": "Clear sky"},
            "forecast": [],
            "hourly": [],
            "air_quality": None,
        }

    monkeypatch.setattr(weather_service, "get_weather", fake_get_weather)
    monkeypatch.setattr("app.api.routes.weather.get_weather", fake_get_weather)

    response = client.get("/weather", params={"location": "Lahore"})
    assert response.status_code == 200
    body = response.json()
    assert body["resolved_location"] == "Lahore, Punjab, Pakistan"
    assert body["current"]["temperature"] == 34.0


def test_weather_location_not_found(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    async def fake_get_weather(**kwargs: Any) -> dict[str, Any]:
        raise weather_service.LocationNotFoundError("No location found matching 'Nowhere'")

    monkeypatch.setattr("app.api.routes.weather.get_weather", fake_get_weather)
    response = client.get("/weather", params={"location": "Nowhere"})
    assert response.status_code == 404


def test_search_locations(monkeypatch: pytest.MonkeyPatch, client: TestClient) -> None:
    async def fake_search(query: str, **kwargs: Any) -> list[dict[str, Any]]:
        return [{"name": "Lahore", "latitude": 31.55, "longitude": 74.35, "country": "Pakistan"}]

    monkeypatch.setattr("app.api.routes.weather.search_locations", fake_search)
    response = client.get("/search", params={"q": "Lahore"})
    assert response.status_code == 200
    body = response.json()
    assert body[0]["name"] == "Lahore"
