"""Open-Meteo integration: geocoding, current conditions, and forecasts.

Open-Meteo (https://open-meteo.com) is free and requires no API key. This
module wraps its two relevant endpoints:

- Geocoding: https://geocoding-api.open-meteo.com/v1/search
- Forecast:  https://api.open-meteo.com/v1/forecast

All network calls are async (httpx.AsyncClient) so they play nicely inside
FastAPI's event loop and Groq's function-calling loop.
"""

from __future__ import annotations

import asyncio
from typing import Any, Literal

import httpx
from loguru import logger

from app.core.http_client import get_http_client

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

# WMO Weather interpretation codes (WW), as documented by Open-Meteo:
# https://open-meteo.com/en/docs
WMO_WEATHER_CODES: dict[int, str] = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def wmo_code_to_text(code: int | None) -> str:
    """Translate a WMO weather interpretation code into human-readable text.

    Unknown or missing codes fall back to "Unknown conditions" rather than
    raising, since this is used for display purposes only.
    """
    if code is None:
        return "Unknown conditions"
    return WMO_WEATHER_CODES.get(code, "Unknown conditions")


class LocationNotFoundError(Exception):
    """Raised when the geocoding API returns no matches for a location string."""


class WeatherServiceError(Exception):
    """Raised when the Open-Meteo API is unreachable or returns an error response."""


async def geocode_location(
    client: httpx.AsyncClient, location: str
) -> dict[str, Any]:
    """Resolve a free-text location name to coordinates via Open-Meteo geocoding.

    Returns the top match as a dict with at least `name`, `latitude`,
    `longitude`, `country`, and optionally `admin1` (state/province).

    Raises:
        LocationNotFoundError: if no matches are found for `location`.
        WeatherServiceError: if the geocoding API request fails.
    """
    try:
        response = await client.get(
            GEOCODING_URL,
            params={"name": location, "count": 1, "language": "en", "format": "json"},
            timeout=10.0,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("Geocoding request failed for '{}': {}", location, exc)
        raise WeatherServiceError(f"Geocoding request failed: {exc}") from exc

    data = response.json()
    results = data.get("results") or []
    if not results:
        logger.info("No geocoding results for location='{}'", location)
        raise LocationNotFoundError(f"No location found matching '{location}'")

    top = results[0]
    logger.debug("Geocoded '{}' -> {}", location, top.get("name"))
    return top


async def reverse_geocode(
    client: httpx.AsyncClient, latitude: float, longitude: float
) -> dict[str, Any] | None:
    """Resolve coordinates to a place name. Returns None on failure."""
    try:
        response = await client.get(
            GEOCODING_URL.replace("/search", "/reverse"),
            params={
                "latitude": latitude,
                "longitude": longitude,
                "language": "en",
                "format": "json",
            },
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        results = data.get("results") or []
        if results:
            return results[0]
        # Some reverse responses put the place at the top level.
        if data.get("name"):
            return data
    except httpx.HTTPError as exc:
        logger.warning("Reverse geocoding failed for ({}, {}): {}", latitude, longitude, exc)
    return None


async def search_locations(
    query: str, count: int = 5, client: httpx.AsyncClient | None = None
) -> list[dict[str, Any]]:
    """Search for locations matching a free-text query via Open-Meteo geocoding.

    Returns up to `count` matches as dicts with at least `name`, `latitude`,
    `longitude`, `country`, and optionally `admin1` (state/province).

    Args:
        query: Free-text location query, e.g. "London".
        count: Maximum number of matches to return.
        client: Optional pre-existing httpx.AsyncClient. Defaults to the
            shared process client.

    Raises:
        WeatherServiceError: if the geocoding API request fails.
    """
    client = client or get_http_client()
    try:
        response = await client.get(
            GEOCODING_URL,
            params={"name": query, "count": count, "language": "en", "format": "json"},
            timeout=10.0,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("results") or []
    except httpx.HTTPError as exc:
        logger.error("Location search failed for '{}': {}", query, exc)
        raise WeatherServiceError(f"Location search failed: {exc}") from exc


def _resolved_name(geo: dict[str, Any]) -> str:
    """Build a human-readable resolved location string, e.g. 'Lahore, Punjab, Pakistan'."""
    parts = [geo.get("name")]
    if geo.get("admin1"):
        parts.append(geo["admin1"])
    if geo.get("country"):
        parts.append(geo["country"])
    return ", ".join(p for p in parts if p)


async def fetch_forecast(
    client: httpx.AsyncClient,
    latitude: float,
    longitude: float,
    forecast_days: int = 1,
    units: Literal["metric", "imperial"] = "metric",
) -> dict[str, Any]:
    """Fetch current conditions and a daily forecast for given coordinates.

    Raises:
        WeatherServiceError: if the forecast API request fails.
    """
    forecast_days = max(1, min(forecast_days, 7))
    temperature_unit = "fahrenheit" if units == "imperial" else "celsius"
    wind_speed_unit = "mph" if units == "imperial" else "kmh"

    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "visibility",
            "pressure_msl",
            "uv_index",
            "precipitation",
            "dew_point_2m",
            "is_day",
            "cloud_cover",
        ]),
        "hourly": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "weather_code",
            "precipitation_probability",
            "precipitation",
            "wind_speed_10m",
            "wind_direction_10m",
            "relative_humidity_2m",
            "uv_index",
            "cloud_cover",
            "is_day",
        ]),
        "daily": ",".join([
            "temperature_2m_max",
            "temperature_2m_min",
            "weather_code",
            "precipitation_probability_max",
            "precipitation_sum",
            "sunrise",
            "sunset",
            "uv_index_max",
            "wind_speed_10m_max",
            "wind_direction_10m_dominant",
        ]),
        "forecast_days": forecast_days,
        "forecast_hours": 24,
        "temperature_unit": temperature_unit,
        "wind_speed_unit": wind_speed_unit,
        "timezone": "auto",
    }

    try:
        response = await client.get(FORECAST_URL, params=params, timeout=10.0)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.error("Forecast request failed for ({}, {}): {}", latitude, longitude, exc)
        raise WeatherServiceError(f"Forecast request failed: {exc}") from exc

    return response.json()


async def fetch_air_quality(
    client: httpx.AsyncClient,
    latitude: float,
    longitude: float,
) -> dict[str, Any] | None:
    """Fetch current air quality. Returns None if the request fails."""
    try:
        response = await client.get(
            AIR_QUALITY_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": ",".join([
                    "european_aqi",
                    "pm2_5",
                    "pm10",
                    "carbon_monoxide",
                    "nitrogen_dioxide",
                    "sulphur_dioxide",
                    "ozone",
                    "us_aqi",
                ]),
                "timezone": "auto",
            },
            timeout=10.0,
        )
        response.raise_for_status()
        return response.json()
    except httpx.HTTPError as exc:
        logger.warning("Air quality request failed for ({}, {}): {}", latitude, longitude, exc)
        return None


def _zip_hourly(hourly_raw: dict[str, Any]) -> list[dict[str, Any]]:
    times = hourly_raw.get("time") or []
    n = len(times)
    temps = hourly_raw.get("temperature_2m") or [None] * n
    feels = hourly_raw.get("apparent_temperature") or [None] * n
    codes = hourly_raw.get("weather_code") or [None] * n
    precip_prob = hourly_raw.get("precipitation_probability") or [None] * n
    precip = hourly_raw.get("precipitation") or [None] * n
    wind = hourly_raw.get("wind_speed_10m") or [None] * n
    wind_dir = hourly_raw.get("wind_direction_10m") or [None] * n
    humidity = hourly_raw.get("relative_humidity_2m") or [None] * n
    uv = hourly_raw.get("uv_index") or [None] * n
    clouds = hourly_raw.get("cloud_cover") or [None] * n
    is_day = hourly_raw.get("is_day") or [1] * n
    return [
        {
            "time": times[i],
            "temperature": temps[i],
            "feels_like": feels[i],
            "condition": wmo_code_to_text(codes[i]),
            "precipitation_probability_percent": precip_prob[i],
            "precipitation": precip[i],
            "wind_speed": wind[i],
            "wind_direction": wind_dir[i],
            "humidity_percent": humidity[i],
            "uv_index": uv[i],
            "cloud_cover": clouds[i],
            "is_day": bool(is_day[i]),
        }
        for i in range(n)
    ]


async def get_weather(
    location: str | None = None,
    forecast_days: int = 1,
    units: Literal["metric", "imperial"] = "metric",
    client: httpx.AsyncClient | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict[str, Any]:
    """Resolve a location and return structured current + forecast weather data.

    This is the single entry point used by the Groq function-calling tool
    handler. It combines geocoding and forecast lookup, and post-processes
    the raw Open-Meteo response into a compact, LLM- and UI-friendly shape.

    Either ``location`` (geocoded to coordinates) or both ``latitude`` and
    ``longitude`` (used directly, skipping geocoding) must be provided.

    Args:
        location: Free-text location, e.g. "Lahore", "Tokyo, Japan".
        forecast_days: Number of forecast days to include (1-7).
        units: "metric" (°C, km/h) or "imperial" (°F, mph).
        client: Optional pre-existing httpx.AsyncClient. Defaults to the
            shared process client.
        latitude: Optional direct latitude (skips geocoding when paired with
            ``longitude``).
        longitude: Optional direct longitude (skips geocoding when paired with
            ``latitude``).

    Returns:
        A dict with keys: `resolved_location`, `latitude`, `longitude`,
        `units`, `current` (temperature, feels_like, condition, humidity,
        wind_speed), and `forecast` (list of per-day summaries).

    Raises:
        LocationNotFoundError: if the location cannot be resolved.
        WeatherServiceError: if either upstream API call fails.
    """
    client = client or get_http_client()
    if latitude is not None and longitude is not None:
        geo = await reverse_geocode(client, latitude, longitude)
        if geo is None:
            geo = {"name": "Current location", "latitude": latitude, "longitude": longitude}
    elif not location:
        raise ValueError("Either 'location' or both 'latitude' and 'longitude' must be provided.")
    else:
        geo = await geocode_location(client, location)
    latitude, longitude = geo["latitude"], geo["longitude"]
    raw, aqi_raw = await asyncio.gather(
        fetch_forecast(client, latitude, longitude, forecast_days, units),
        fetch_air_quality(client, latitude, longitude),
    )

    current_raw = raw.get("current", {})
    daily_raw = raw.get("daily", {})
    hourly_raw = raw.get("hourly", {})

    current = {
        "temperature": current_raw.get("temperature_2m"),
        "feels_like": current_raw.get("apparent_temperature"),
        "condition": wmo_code_to_text(current_raw.get("weather_code")),
        "humidity_percent": current_raw.get("relative_humidity_2m"),
        "wind_speed": current_raw.get("wind_speed_10m"),
        "wind_direction": current_raw.get("wind_direction_10m"),
        "visibility_m": current_raw.get("visibility"),
        "pressure_hpa": current_raw.get("pressure_msl"),
        "uv_index": current_raw.get("uv_index"),
        "precipitation": current_raw.get("precipitation"),
        "dew_point": current_raw.get("dew_point_2m"),
        "is_day": bool(current_raw.get("is_day", 1)),
        "cloud_cover": current_raw.get("cloud_cover"),
        "sunrise": (daily_raw.get("sunrise") or [None])[0],
        "sunset": (daily_raw.get("sunset") or [None])[0],
    }

    forecast: list[dict[str, Any]] = []
    daily_times = daily_raw.get("time", [])
    n = len(daily_times)
    temp_max = daily_raw.get("temperature_2m_max") or [None] * n
    temp_min = daily_raw.get("temperature_2m_min") or [None] * n
    codes = daily_raw.get("weather_code") or [None] * n
    precip_prob = daily_raw.get("precipitation_probability_max") or [None] * n
    precip_sum = daily_raw.get("precipitation_sum") or [None] * n
    sunrise = daily_raw.get("sunrise") or [None] * n
    sunset = daily_raw.get("sunset") or [None] * n
    uv_max = daily_raw.get("uv_index_max") or [None] * n
    wind_max = daily_raw.get("wind_speed_10m_max") or [None] * n
    wind_dir = daily_raw.get("wind_direction_10m_dominant") or [None] * n
    for i, day in enumerate(daily_times):
        forecast.append({
            "date": day,
            "temp_max": temp_max[i],
            "temp_min": temp_min[i],
            "condition": wmo_code_to_text(codes[i]),
            "precipitation_probability_percent": precip_prob[i],
            "precipitation_sum": precip_sum[i],
            "sunrise": sunrise[i],
            "sunset": sunset[i],
            "uv_index_max": uv_max[i],
            "wind_speed_max": wind_max[i],
            "wind_direction": wind_dir[i],
        })

    aqi: dict[str, Any] | None = None
    if aqi_raw:
        aqi_current = aqi_raw.get("current") or {}
        aqi = {
            "european_aqi": aqi_current.get("european_aqi"),
            "us_aqi": aqi_current.get("us_aqi"),
            "pm2_5": aqi_current.get("pm2_5"),
            "pm10": aqi_current.get("pm10"),
            "o3": aqi_current.get("ozone"),
            "no2": aqi_current.get("nitrogen_dioxide"),
            "so2": aqi_current.get("sulphur_dioxide"),
            "co": aqi_current.get("carbon_monoxide"),
        }

    return {
        "resolved_location": _resolved_name(geo),
        "latitude": latitude,
        "longitude": longitude,
        "units": units,
        "timezone": raw.get("timezone"),
        "utc_offset_seconds": raw.get("utc_offset_seconds"),
        "current": current,
        "forecast": forecast,
        "hourly": _zip_hourly(hourly_raw),
        "air_quality": aqi,
    }
