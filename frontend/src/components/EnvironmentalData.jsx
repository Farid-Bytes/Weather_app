import { getAqiLevel } from '../theme/theme';

function SunArc({ weather }) {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const t = Math.max(0.08, Math.min(0.92, minutes / (24 * 60)));
  const x = 20 + t * 160;
  const y = 70 - Math.sin(t * Math.PI) * 48;

  return (
    <svg viewBox="0 0 200 90" className="w-full">
      <path d="M10 70 Q100 0 190 70" fill="none" stroke="rgba(251,191,36,0.45)" strokeWidth="2" />
      <circle cx={x} cy={y} r="6" fill="#fbbf24" />
      <text x="10" y="86" fill="rgba(255,255,255,0.55)" fontSize="9">
        {weather.sunrise}
      </text>
      <text x="150" y="86" fill="rgba(255,255,255,0.55)" fontSize="9">
        {weather.sunset}
      </text>
    </svg>
  );
}

export default function EnvironmentalData({ weather, compact = false }) {
  if (!weather) return null;
  const aqi = weather.airQuality || {};
  const aqiMeta = getAqiLevel(aqi.aqi);
  const aqiPct = Math.min(100, (aqi.aqi / 300) * 100);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="atmos-inset p-4 md:p-5">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Air quality
        </h2>
        <p className="text-4xl font-light text-text-primary">
          {aqi.aqi}{' '}
          <span className="text-lg" style={{ color: aqiMeta.color }}>
            {aqiMeta.label}
          </span>
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${aqiPct}%`, background: aqiMeta.color }}
          />
        </div>
        {!compact && (
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-text-muted">
            <div className="flex justify-between"><dt>PM2.5</dt><dd>{aqi.pm25}</dd></div>
            <div className="flex justify-between"><dt>PM10</dt><dd>{aqi.pm10}</dd></div>
            <div className="flex justify-between"><dt>O3</dt><dd>{aqi.o3}</dd></div>
            <div className="flex justify-between"><dt>NO2</dt><dd>{aqi.no2}</dd></div>
            <div className="flex justify-between"><dt>SO2</dt><dd>{aqi.so2}</dd></div>
            <div className="flex justify-between"><dt>CO</dt><dd>{aqi.co}</dd></div>
          </dl>
        )}
      </section>

      <section className="atmos-inset p-4 md:p-5">
        <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Sun & moon
        </h2>
        <SunArc weather={weather} />
        <p className="mt-2 text-sm text-text-primary">{weather.moon.name}</p>
        <p className="text-[12px] text-text-muted">Illumination {weather.moon.illumination}%</p>
        <p className="mt-2 text-[12px] text-text-muted">
          Moonrise {weather.moon.moonrise} · Moonset {weather.moon.moonset}
        </p>
      </section>
    </div>
  );
}
