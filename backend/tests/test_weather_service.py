"""Unit tests for app.services.weather_service.

All HTTP calls are mocked with `respx` — no live network calls are made.
"""

import httpx
import pytest
import respx

from app.services.weather_service import (
    AIR_QUALITY_URL,
    FORECAST_URL,
    GEOCODING_URL,
    LocationNotFoundError,
    WeatherServiceError,
    get_weather,
    wmo_code_to_text,
)


class TestWmoCodeToText:
    """Tests for the WMO weather-code-to-text mapping."""

    def test_known_code_clear_sky(self) -> None:
        assert wmo_code_to_text(0) == "Clear sky"

    def test_known_code_thunderstorm(self) -> None:
        assert wmo_code_to_text(95) == "Thunderstorm"

    def test_unknown_code_falls_back(self) -> None:
        assert wmo_code_to_text(999) == "Unknown conditions"

    def test_none_code_falls_back(self) -> None:
        assert wmo_code_to_text(None) == "Unknown conditions"


GEOCODE_RESPONSE = {
    "results": [
        {
            "name": "Lahore",
            "latitude": 31.55,
            "longitude": 74.35,
            "country": "Pakistan",
            "admin1": "Punjab",
        }
    ]
}

FORECAST_RESPONSE = {
    "current": {
        "temperature_2m": 34.2,
        "apparent_temperature": 37.1,
        "relative_humidity_2m": 40,
        "weather_code": 1,
        "wind_speed_10m": 12.5,
    },
    "daily": {
        "time": ["2026-07-07", "2026-07-08"],
        "temperature_2m_max": [36.0, 35.5],
        "temperature_2m_min": [27.0, 26.5],
        "weather_code": [1, 2],
        "precipitation_probability_max": [10, 20],
    },
}


@pytest.mark.asyncio
@respx.mock
async def test_get_weather_happy_path() -> None:
    """get_weather should geocode, fetch forecast, and return a structured payload."""
    respx.get(GEOCODING_URL).mock(
        return_value=httpx.Response(200, json=GEOCODE_RESPONSE)
    )
    respx.get(FORECAST_URL).mock(
        return_value=httpx.Response(200, json=FORECAST_RESPONSE)
    )
    respx.get(AIR_QUALITY_URL).mock(
        return_value=httpx.Response(200, json={"current": {"us_aqi": 42, "european_aqi": 30}})
    )

    result = await get_weather(location="Lahore", forecast_days=2, units="metric")

    assert result["resolved_location"] == "Lahore, Punjab, Pakistan"
    assert result["current"]["temperature"] == 34.2
    assert result["current"]["condition"] == "Mainly clear"
    assert len(result["forecast"]) == 2
    assert result["forecast"][0]["condition"] == "Mainly clear"
    assert result["forecast"][1]["condition"] == "Partly cloudy"


@pytest.mark.asyncio
@respx.mock
async def test_get_weather_location_not_found() -> None:
    """An empty geocoding result set should raise LocationNotFoundError."""
    respx.get(GEOCODING_URL).mock(return_value=httpx.Response(200, json={"results": []}))

    with pytest.raises(LocationNotFoundError):
        await get_weather(location="Nowheresville")


@pytest.mark.asyncio
@respx.mock
async def test_get_weather_geocoding_api_error() -> None:
    """A geocoding API failure should raise WeatherServiceError, not crash."""
    respx.get(GEOCODING_URL).mock(return_value=httpx.Response(500))

    with pytest.raises(WeatherServiceError):
        await get_weather(location="Lahore")


@pytest.mark.asyncio
@respx.mock
async def test_get_weather_forecast_api_error() -> None:
    """A forecast API failure (after successful geocoding) should raise WeatherServiceError."""
    respx.get(GEOCODING_URL).mock(
        return_value=httpx.Response(200, json=GEOCODE_RESPONSE)
    )
    respx.get(FORECAST_URL).mock(return_value=httpx.Response(503))
    respx.get(AIR_QUALITY_URL).mock(return_value=httpx.Response(200, json={"current": {}}))

    with pytest.raises(WeatherServiceError):
        await get_weather(location="Lahore")
