"""Weather widget endpoints: plain (non-chat) weather-by-location routes.

These wrap `app.services.weather_service` so the frontend widgets can fetch
structured current + forecast data without going through the Groq chat loop.
"""

from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter, HTTPException, Query
from loguru import logger

from app.services.weather_service import (
    LocationNotFoundError,
    WeatherServiceError,
    get_weather,
    search_locations,
)

router = APIRouter(tags=["weather"])


@router.get("/weather")
async def weather(
    location: str | None = Query(default=None, description="City/place name, e.g. 'London'"),
    lat: float | None = Query(default=None, description="Direct latitude (skips geocoding)"),
    lon: float | None = Query(default=None, description="Direct longitude (skips geocoding)"),
    days: int = Query(default=7, ge=1, le=7, description="Forecast days (1-7)"),
    units: Literal["metric", "imperial"] = Query(
        default="metric", description="Units: 'metric' (°C, km/h) or 'imperial' (°F, mph)"
    ),
) -> dict[str, Any]:
    """Return structured current + forecast weather for a location or coordinates."""
    if location is None and (lat is None or lon is None):
        raise HTTPException(
            status_code=400,
            detail="Provide either 'location' or both 'lat' and 'lon'.",
        )

    try:
        return await get_weather(
            location=location,
            forecast_days=days,
            units=units,
            latitude=lat,
            longitude=lon,
        )
    except LocationNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except WeatherServiceError as exc:
        logger.error("Weather endpoint failed: {}", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/search")
async def search(
    q: str = Query(..., min_length=1, description="Location search query"),
) -> list[dict[str, Any]]:
    """Return up to 5 location matches for a free-text query."""
    try:
        return await search_locations(q)
    except WeatherServiceError as exc:
        logger.error("Search endpoint failed: {}", exc)
        raise HTTPException(status_code=502, detail=str(exc)) from exc