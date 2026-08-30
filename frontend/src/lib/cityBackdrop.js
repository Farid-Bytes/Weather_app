const CACHE_KEY = 'atmos-city-bg-v1';

function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeCache(map) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function isUsablePhoto(img) {
  if (!img?.source) return false;
  const w = img.width || 0;
  const h = img.height || 0;
  if (w && h && (w < 640 || h < 360 || w / h > 3.2 || h / w > 1.6)) return false;
  const src = img.source.toLowerCase();
  if (src.endsWith('.svg') || src.includes('flag_of') || src.includes('coat_of_arms')) return false;
  return true;
}

async function wikiSummary(title) {
  const res = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (isUsablePhoto(data.originalimage)) return data.originalimage.source;
  if (isUsablePhoto(data.thumbnail)) return data.thumbnail.source;
  return null;
}

/**
 * Landmark / skyline photo for a city (Wikipedia). Cached per session.
 * Tries the city page first, then "City, Country" in parallel only if needed.
 */
export async function fetchCityBackdrop(city, country) {
  if (!city) return null;
  const key = `${city}|${country || ''}`.toLowerCase();
  const cache = readCache();
  if (key in cache) return cache[key];

  let url = await wikiSummary(city);
  if (!url && country) {
    url = await wikiSummary(`${city}, ${country}`);
  }

  cache[key] = url;
  writeCache(cache);
  return url;
}
