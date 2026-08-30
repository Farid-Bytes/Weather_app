# ATMOS — Weather chatbot

A weather dashboard with an AI chat assistant. The React frontend (ATMOS) talks to a FastAPI backend that uses **Groq** function calling and live **Open-Meteo** data (no weather API key).

```
Browser (Vite :3000)
  → GET /weather  GET /search  POST /chat
FastAPI (:8000)
  → Groq (chat + tools)
  → Open-Meteo (geocode, forecast, air quality)
```

## Requirements

- Python 3.11+
- Node.js 20+
- A Groq API key from [console.groq.com/keys](https://console.groq.com/keys)

## Setup

### Backend

```bash
cd backend
poetry install
cp .env.example .env   # then set GROQ_API_KEY
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Tests:

```bash
cd backend
poetry run pytest
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server runs on [http://localhost:3000](http://localhost:3000) and proxies `/weather`, `/search`, and `/chat` to the API on port 8000. No frontend API keys are required.

## API (short)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness |
| `GET` | `/weather` | Current + 7-day forecast (`location=` or `lat`+`lon`) |
| `GET` | `/search` | City autocomplete |
| `POST` | `/chat` | Natural-language weather Q&A |

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

## Secrets

Never commit `.env` files. Rotate any keys that were previously stored locally (Groq, leftover MapTiler / Google keys) before making this repository public.

## License

MIT — see [LICENSE](LICENSE).
