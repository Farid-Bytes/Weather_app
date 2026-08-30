# Weather Chatbot API

FastAPI backend for ATMOS. Conversation uses **Groq** tool calling; live weather comes from the free **Open-Meteo** API (no weather API key).

## Run

```bash
cd backend
poetry install
cp .env.example .env   # set GROQ_API_KEY
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
poetry run pytest
```

Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Endpoints

### `GET /health`

`{"status": "ok"}`

### `GET /weather`

Query either `location` (city name) or `lat` + `lon`. Optional: `days` (1–7), `units` (`metric` | `imperial`).

Returns current conditions, hourly, daily forecast, and air quality.

### `GET /search?q=`

Up to 5 geocoding matches for city autocomplete.

### `POST /chat`

```json
{
  "message": "What's the weather in Lahore right now?",
  "session_id": null,
  "history": null
}
```

Pass `session_id` on later turns for conversation context. History is kept in memory (last 20 turns) and does not survive restarts.

If the configured Groq model is missing/decommissioned, the API tries a fallback model. Other Groq errors skip extra model attempts and answer from Open-Meteo when a city can be parsed.

## Configuration

See `.env.example`.

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | — | Required |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Must support tool calling |
| `APP_HOST` | `0.0.0.0` | Bind host |
| `APP_PORT` | `8000` | Bind port |
| `LOG_LEVEL` | `INFO` | Log verbosity |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated origins |

## Tests

- `tests/test_weather_service.py` — geocode/forecast mapping with HTTP mocked via `respx`
- `tests/test_health.py` — `/health`
- `tests/test_chat.py` — `/chat` with a mocked Groq client, including Open-Meteo fallback
- `tests/test_weather_routes.py` — `/weather` and `/search`
