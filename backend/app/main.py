"""FastAPI application entrypoint.

Run with:
    poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import chat, health, weather
from app.config import get_settings
from app.core.http_client import close_http_client
from app.core.logging_config import configure_logging

configure_logging()

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await close_http_client()


app = FastAPI(
    title="Weather Chatbot API",
    description=(
        "A chatbot that answers natural-language questions about current weather, "
        "forecasts, and climate conditions, powered by Groq function calling "
        "and live Open-Meteo data."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

origins = settings.cors_origin_list
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=origins != ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(weather.router)
