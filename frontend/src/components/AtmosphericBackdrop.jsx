import { useEffect, useMemo, useState } from 'react';
import { fetchCityBackdrop } from '../lib/cityBackdrop';

const SCENE = {
  sunny: '/atmos/sunny.webp',
  'partly-cloudy': '/atmos/sunny.webp',
  cloudy: '/atmos/rain.webp',
  rainy: '/atmos/rain.webp',
  thunderstorm: '/atmos/storm.webp',
  snowy: '/atmos/night.webp',
  windy: '/atmos/sunny.webp',
  foggy: '/atmos/rain.webp',
  'night-clear': '/atmos/night.webp',
  'night-cloudy': '/atmos/night.webp',
};

const GRADE = {
  sunny: 'from-amber-900/20 via-transparent to-black/40',
  'partly-cloudy': 'from-sky-950/25 via-transparent to-black/45',
  cloudy: 'from-slate-950/40 via-slate-900/15 to-black/50',
  rainy: 'from-slate-950/45 via-slate-900/20 to-black/55',
  thunderstorm: 'from-indigo-950/50 via-violet-950/25 to-black/60',
  snowy: 'from-slate-200/10 via-transparent to-black/50',
  windy: 'from-cyan-950/25 via-transparent to-black/45',
  foggy: 'from-zinc-800/40 via-slate-700/20 to-black/50',
  'night-clear': 'from-indigo-950/45 via-transparent to-black/60',
  'night-cloudy': 'from-slate-950/50 via-transparent to-black/65',
};

export default function AtmosphericBackdrop({
  condition = 'sunny',
  city,
  country,
}) {
  const fallback = SCENE[condition] || SCENE.sunny;
  const [citySrc, setCitySrc] = useState(null);
  const [shown, setShown] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    setCitySrc(null);
    if (!city) {
      setShown(fallback);
      return undefined;
    }
    fetchCityBackdrop(city, country).then((url) => {
      if (cancelled) return;
      setCitySrc(url);
      setShown(url || fallback);
    });
    return () => {
      cancelled = true;
    };
  }, [city, country, fallback]);

  const src = citySrc || shown || fallback;
  const isRain = condition === 'rainy' || condition === 'thunderstorm';
  const isStorm = condition === 'thunderstorm';
  const grade = GRADE[condition] || GRADE.sunny;

  const rainDrops = useMemo(
    () =>
      Array.from({ length: isStorm ? 90 : 48 }, (_, i) => ({
        left: `${(i * 11.3) % 100}%`,
        delay: `${(i % 14) * 0.09}s`,
        duration: `${0.5 + (i % 6) * 0.07}s`,
        height: 16 + (i % 8) * 5,
        opacity: 0.2 + (i % 4) * 0.12,
      })),
    [isStorm]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0b1223]" aria-hidden>
      <img
        key={src}
        src={src}
        alt=""
        className="atmos-scene-img absolute inset-0 h-full w-full object-cover"
      />
      <div className={`absolute inset-0 bg-gradient-to-b ${grade}`} />

      {isRain && (
        <div className="absolute inset-0 overflow-hidden">
          {rainDrops.map((d, i) => (
            <span
              key={i}
              className="atmos-rain"
              style={{
                left: d.left,
                animationDelay: d.delay,
                animationDuration: d.duration,
                height: d.height,
                opacity: d.opacity,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
