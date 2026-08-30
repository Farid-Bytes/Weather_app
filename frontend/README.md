# ATMOS frontend

React + Vite weather dashboard. It talks to the FastAPI backend over the Vite proxy (`/weather`, `/search`, `/chat`). Weather data is Open-Meteo via that API — no Google or MapTiler keys.

## Setup

From the repo root, start the backend on port 8000, then:

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` only if you want a local env file; none is required for development.

```bash
npm run build
npm run preview
```

## Features

- Current conditions, hourly and 7-day forecast
- Leaflet weather map (OpenStreetMap tiles)
- Charts, air quality, activity suggestions
- AI chat panel (Groq through `POST /chat`)
- Dark/light theme, saved cities, installable PWA (custom `sw.js`)

## Layout

```
src/
├── App.jsx
├── main.jsx
├── components/
├── hooks/
├── lib/
│   ├── weatherApi.js      # backend client
│   ├── cityBackdrop.js    # Wikipedia city photos
│   └── ...
├── styles/
└── theme/
public/
├── atmos/                 # compressed WebP backdrops
├── sw.js
├── manifest.json
└── favicon.svg
```

## Troubleshooting

**Unable to load weather data** — the backend is not running on port 8000, or the Vite proxy cannot reach it.

**Chat says the assistant is unavailable** — set `GROQ_API_KEY` in `backend/.env` and restart the API.
