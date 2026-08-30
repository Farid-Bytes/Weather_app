const TEMPLATES = [
  {
    id: 'run',
    title: 'Morning run',
    icon: 'run',
    best: '6:00 – 8:00 AM',
  },
  {
    id: 'cycle',
    title: 'Cycling',
    icon: 'cycle',
    best: '6:30 – 8:30 AM',
  },
  {
    id: 'dining',
    title: 'Outdoor dining',
    icon: 'dining',
    best: '7:00 – 9:00 PM',
  },
  {
    id: 'photo',
    title: 'Photography',
    icon: 'photo',
    best: '5:30 – 7:00 PM',
  },
  {
    id: 'hike',
    title: 'Hiking',
    icon: 'hike',
    best: '7:00 – 10:00 AM',
  },
];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function scoreActivity(id, weather) {
  const temp = weather.temperature;
  const wind = weather.windSpeed;
  const rain = weather.hourly?.[0]?.precipitation ?? weather.forecast?.[0]?.precipitation ?? 0;
  const uv = weather.uvIndex;
  const aqi = weather.airQuality?.aqi ?? 0;
  const storm = weather.condition === 'thunderstorm';
  const snow = weather.condition === 'snowy';

  let score = 8;
  let note = 'Comfortable conditions';

  if (storm) {
    score = 2;
    note = 'Storm risk — stay sheltered';
  } else if (rain > 50) {
    score = 3;
    note = 'Wet conditions';
  } else if (snow) {
    score = id === 'hike' ? 4 : 5;
    note = 'Cold and icy underfoot';
  }

  if (id === 'run' || id === 'cycle' || id === 'hike') {
    if (temp >= 12 && temp <= 26 && wind < 20 && rain < 30) {
      score = Math.max(score, 9);
      note = 'Low heat · Low wind';
    } else if (temp > 32) {
      score -= 3;
      note = 'Heat stress — go early';
    }
  }

  if (id === 'dining') {
    if (temp >= 18 && temp <= 30 && rain < 20) {
      score = 9;
      note = 'Comfortable evening';
    }
  }

  if (id === 'photo') {
    if (weather.condition === 'partly-cloudy' || weather.condition === 'cloudy') {
      score = 9;
      note = 'Soft light and texture';
    } else if (weather.visibility > 8) {
      note = 'Good visibility';
    }
  }

  if (id === 'hike' && weather.visibility > 8 && rain < 20) {
    note = 'Good visibility. Perfect for trails';
  }

  if (aqi > 100) {
    score -= 2;
    note = 'Air quality is limiting';
  }
  if (uv >= 8 && (id === 'run' || id === 'hike')) {
    score -= 1;
  }

  const final = clamp(score, 1, 10);
  let status = 'Fair';
  if (final >= 8) status = 'Great';
  else if (final >= 6) status = 'Good';
  else if (final >= 4) status = 'Fair';
  else status = 'Poor';

  return { score: final, status, note };
}

export function getActivityRecommendations(weather) {
  if (!weather) return [];
  return TEMPLATES.map((t) => ({
    ...t,
    ...scoreActivity(t.id, weather),
  }));
}
