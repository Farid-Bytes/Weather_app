import { degreesToCompass, getAqiLevel, getUvLevel, resolveConditionKey, splitLocation } from '../theme/theme';
import { getMoonPhase } from './moon';

const API_BASE = '';

function round(n, digits = 0) {
  if (n == null || Number.isNaN(Number(n))) return 0;
  const f = 10 ** digits;
  return Math.round(Number(n) * f) / f;
}

function formatClock(isoString) {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHourLabel(isoString) {
  if (!isoString) return '--';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
}

async function apiGet(path) {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed: ${response.status}`);
  }
  return response.json();
}

export function mapCondition(conditionText, isDay = true) {
  return resolveConditionKey(conditionText, isDay);
}

export function formatWeatherState(data, unit = 'metric') {
  const current = data.current || {};
  const isDay = current.is_day !== false && current.is_day !== 0;
  const locationParts = splitLocation(data.resolved_location || '');
  const aqiValue = round(data.air_quality?.us_aqi || data.air_quality?.european_aqi || 0);
  const visibilityKm =
    unit === 'imperial'
      ? round((current.visibility_m || 0) / 1609.34, 1)
      : round((current.visibility_m || 0) / 1000, 1);

  const now = new Date();
  const hourly = (data.hourly || []).map((h, i) => {
    const t = h.time ? new Date(h.time) : null;
    const hourIsDay = h.is_day !== false && h.is_day !== 0;
    return {
      time: h.time,
      label: formatHourLabel(h.time),
      hour: t ? t.getHours() : i,
      isNow: t ? Math.abs(t.getTime() - now.getTime()) < 30 * 60 * 1000 : i === 0,
      temperature: round(h.temperature),
      feelsLike: round(h.feels_like),
      condition: mapCondition(h.condition, hourIsDay),
      conditionText: h.condition || '',
      precipitation: Math.min(round(h.precipitation_probability_percent), 100),
      precipMm: round(h.precipitation, 1),
      windSpeed: round(h.wind_speed),
      windDirection: round(h.wind_direction),
      humidity: round(h.humidity_percent),
      uvIndex: round(h.uv_index, 1),
      isDay: hourIsDay,
    };
  });

  const nowIndex = hourly.findIndex((h) => h.isNow);
  if (nowIndex > 0) {
    hourly.forEach((h, i) => {
      h.isNow = i === nowIndex;
    });
  } else if (hourly[0]) {
    hourly[0].isNow = true;
  }

  const forecast = (data.forecast || []).map((day) => ({
    date: day.date,
    day: day.date
      ? new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })
      : '',
    condition: mapCondition(day.condition, true),
    conditionText: day.condition || '',
    highTemp: round(day.temp_max),
    lowTemp: round(day.temp_min),
    precipitation: Math.min(round(day.precipitation_probability_percent), 100),
    precipitationSum: round(day.precipitation_sum, 1),
    sunrise: formatClock(day.sunrise),
    sunset: formatClock(day.sunset),
    uvIndexMax: round(day.uv_index_max, 1),
    windSpeedMax: round(day.wind_speed_max),
    windDirection: round(day.wind_direction),
  }));

  const highs = forecast.map((d) => d.highTemp);
  const lows = forecast.map((d) => d.lowTemp);
  const rainWeek = forecast.reduce((s, d) => s + (d.precipitationSum || 0), 0);
  const windWeek = forecast.length
    ? round(forecast.reduce((s, d) => s + (d.windSpeedMax || 0), 0) / forecast.length)
    : 0;

  const uv =
    round(current.uv_index, 1) ||
    hourly.find((h) => h.isNow)?.uvIndex ||
    hourly[0]?.uvIndex ||
    0;
  const uvMeta = getUvLevel(uv);
  const aqiMeta = getAqiLevel(aqiValue);
  const moon = getMoonPhase(now);

  return {
    location: data.resolved_location || '',
    city: locationParts.city,
    region: locationParts.region,
    country: locationParts.country,
    lat: data.latitude,
    lon: data.longitude,
    timezone: data.timezone,
    unit,
    temperature: round(current.temperature),
    feelsLike: round(current.feels_like ?? current.temperature),
    condition: mapCondition(current.condition, isDay),
    conditionText: current.condition || 'Unknown',
    humidity: round(current.humidity_percent),
    windSpeed: round(current.wind_speed),
    windDirection: round(current.wind_direction),
    windCompass: degreesToCompass(current.wind_direction),
    uvIndex: uv,
    uvLabel: uvMeta.label,
    uvColor: uvMeta.color,
    visibility: visibilityKm,
    visibilityUnit: unit === 'imperial' ? 'mi' : 'km',
    pressure: round(current.pressure_hpa),
    dewPoint: round(current.dew_point),
    precipitation: round(current.precipitation, 1),
    isDay,
    sunrise: formatClock(current.sunrise),
    sunset: formatClock(current.sunset),
    sunriseIso: current.sunrise,
    sunsetIso: current.sunset,
    airQuality: {
      aqi: aqiValue,
      label: aqiMeta.label,
      color: aqiMeta.color,
      pm25: round(data.air_quality?.pm2_5, 1),
      pm10: round(data.air_quality?.pm10, 1),
      o3: round(data.air_quality?.o3, 1),
      no2: round(data.air_quality?.no2, 1),
      so2: round(data.air_quality?.so2, 1),
      co: round(data.air_quality?.co, 1),
    },
    moon,
    hourly,
    forecast,
    weekly: {
      max: highs.length ? Math.max(...highs) : 0,
      min: lows.length ? Math.min(...lows) : 0,
      rain: round(rainWeek, 1),
      wind: windWeek,
    },
    speedUnit: unit === 'imperial' ? 'mph' : 'km/h',
    tempUnit: unit === 'imperial' ? '°F' : '°C',
  };
}

export async function fetchWeatherByCoords(lat, lon, unit = 'metric') {
  const data = await apiGet(
    `/weather?lat=${lat}&lon=${lon}&days=7&units=${unit === 'imperial' ? 'imperial' : 'metric'}`
  );
  return formatWeatherState(data, unit);
}

export async function fetchWeatherByCity(city, unit = 'metric') {
  const data = await apiGet(
    `/weather?location=${encodeURIComponent(city)}&days=7&units=${unit === 'imperial' ? 'imperial' : 'metric'}`
  );
  return formatWeatherState(data, unit);
}

export async function searchCities(query) {
  const results = await apiGet(`/search?q=${encodeURIComponent(query)}`);
  if (!results || results.length === 0) return [];
  return results.slice(0, 5).map((item) => ({
    name: item.name,
    country: item.country || '',
    state: item.admin1 || '',
    lat: item.latitude,
    lon: item.longitude,
  }));
}

export async function sendChatMessage(message, sessionId, history = []) {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      session_id: sessionId,
      history,
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Chat failed: ${response.status}`);
  }
  return response.json();
}
