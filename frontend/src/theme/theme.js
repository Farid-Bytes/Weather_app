export const breakpoints = {
  mobile: 768,
  tablet: 1200,
};

export const durations = {
  fast: 0.16,
  base: 0.22,
  slow: 0.3,
  stagger: 0.08,
  data: 0.8,
  city: 1.0,
};

export const easeOut = [0.22, 1, 0.36, 1];

export const pressScale = 0.98;
export const touchScale = 0.985;

export const CONDITION_KEYS = [
  'sunny',
  'partly-cloudy',
  'cloudy',
  'rainy',
  'thunderstorm',
  'snowy',
  'windy',
  'foggy',
  'night-clear',
  'night-cloudy',
];

export const conditionMeta = {
  sunny: { label: 'Sunny', gradientDay: ['#4FC3F7', '#81D4FA'] },
  'partly-cloudy': { label: 'Partly Cloudy', gradientDay: ['#5AA9E6', '#9AD1F0'] },
  cloudy: { label: 'Cloudy', gradientDay: ['#607D8B', '#90A4AE'] },
  rainy: { label: 'Rainy', gradientDay: ['#37474F', '#546E7A'] },
  thunderstorm: { label: 'Thunderstorm', gradientDay: ['#1a1a2e', '#16213e'] },
  snowy: { label: 'Snowy', gradientDay: ['#E3F2FD', '#BBDEFB'] },
  windy: { label: 'Windy', gradientDay: ['#79A7C9', '#B7D6E8'] },
  foggy: { label: 'Foggy', gradientDay: ['#8E9BA3', '#B7C2C8'] },
  'night-clear': { label: 'Clear Night', gradientDay: ['#0D1B2A', '#1B2838'] },
  'night-cloudy': { label: 'Cloudy Night', gradientDay: ['#111826', '#242f42'] },
};

export function resolveConditionKey(conditionText = '', isDay = true) {
  const text = conditionText.toLowerCase();

  let key = 'cloudy';

  if (text.includes('thunder')) key = 'thunderstorm';
  else if (text.includes('snow')) key = 'snowy';
  else if (text.includes('fog') || text.includes('rime')) key = 'foggy';
  else if (
    text.includes('rain') ||
    text.includes('drizzle') ||
    text.includes('shower')
  )
    key = 'rainy';
  else if (text.includes('overcast')) key = 'cloudy';
  else if (text.includes('partly') || text.includes('mainly clear'))
    key = 'partly-cloudy';
  else if (text.includes('clear')) key = 'sunny';
  else if (text.includes('wind')) key = 'windy';

  if (!isDay) {
    if (key === 'sunny' || key === 'partly-cloudy') return 'night-clear';
    if (key === 'cloudy' || key === 'windy' || key === 'foggy') return 'night-cloudy';
    return key;
  }

  return key;
}

export function isDaytimeHour(hour, sunriseHour = 6, sunsetHour = 19) {
  return hour >= sunriseHour && hour < sunsetHour;
}

export function getUvLevel(uv) {
  if (uv >= 11) return { label: 'Extreme', color: '#8E24AA' };
  if (uv >= 8) return { label: 'Very High', color: '#E53935' };
  if (uv >= 6) return { label: 'High', color: '#FB8C00' };
  if (uv >= 3) return { label: 'Moderate', color: '#FDD835' };
  return { label: 'Low', color: '#43A047' };
}

export function getAqiLevel(aqi) {
  if (aqi > 300) return { label: 'Hazardous', color: '#8f2b46' };
  if (aqi > 200) return { label: 'Very Unhealthy', color: '#8E24AA' };
  if (aqi > 150) return { label: 'Unhealthy', color: '#E53935' };
  if (aqi > 100) return { label: 'Unhealthy (SG)', color: '#FB8C00' };
  if (aqi > 50) return { label: 'Moderate', color: '#FDD835' };
  return { label: 'Good', color: '#43A047' };
}

export function degreesToCompass(deg) {
  const directions = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round((Number(deg) || 0) / 22.5) % 16;
  return directions[index];
}

export function splitLocation(resolved = '') {
  const parts = resolved.split(',').map((p) => p.trim()).filter(Boolean);
  return {
    city: parts[0] || 'Unknown',
    region: parts.length > 2 ? parts[1] : '',
    country: parts.length > 1 ? parts[parts.length - 1] : '',
  };
}
