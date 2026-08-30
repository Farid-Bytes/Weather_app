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

## Deploy (Vercel UI + Render API)

The frontend is a static Vite app. The API is FastAPI and needs a Python host (Render free tier works). Do not put `GROQ_API_KEY` in Vercel `VITE_*` variables — those are public in the browser.

### 1. Push the latest code to GitHub

### 2. Backend on Render

- New **Web Service** from this repo, **root directory** `backend`
- Build: `pip install poetry && poetry install --no-root`
- Start: `poetry run uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env vars:
  - `GROQ_API_KEY` — your Groq key
  - `CORS_ORIGINS` — `https://YOUR-APP.vercel.app` (add after step 3 if needed)

Confirm `https://YOUR-API.onrender.com/health` returns `{"status":"ok"}`.

### 3. Frontend on Vercel

- Import the repo, **root directory** `frontend`
- Env var: `VITE_API_BASE` = `https://YOUR-API.onrender.com` (no trailing slash)
- Redeploy after adding the variable so the build picks it up

Then set Render `CORS_ORIGINS` to the Vercel URL and redeploy the API.

Share the **Vercel** URL with clients. Render’s free service may sleep; the first load after idle can take up to a minute.

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
