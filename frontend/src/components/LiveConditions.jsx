import { Droplets, Eye, Gauge, SunMedium, Wind } from 'lucide-react';
import { getUvLevel } from '../theme/theme';

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 py-2 last:border-0">
      <Icon size={14} className="shrink-0 text-white/55" strokeWidth={1.7} />
      <span className="flex-1 text-[13px] text-white/65">{label}</span>
      <span className="text-[13px] text-white">{value}</span>
    </div>
  );
}

export default function LiveConditions({ weather, compact = false }) {
  if (!weather) return null;
  const uv = getUvLevel(weather.uvIndex);

  return (
    <section
      className={`rounded-2xl border border-white/15 bg-black/15 backdrop-blur-sm md:min-w-[240px] ${
        compact ? 'p-3' : 'p-4 md:p-5'
      }`}
    >
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/50">
        Live conditions
      </h2>
      <Row icon={Droplets} label="Humidity" value={`${weather.humidity}%`} />
      <Row icon={Wind} label="Wind" value={`${weather.windSpeed} ${weather.speedUnit} ${weather.windCompass}`} />
      {!compact && (
        <Row icon={Eye} label="Visibility" value={`${weather.visibility} ${weather.visibilityUnit}`} />
      )}
      {!compact && <Row icon={Gauge} label="Pressure" value={`${weather.pressure} hPa`} />}
      <Row
        icon={SunMedium}
        label="UV Index"
        value={
          <span>
            {weather.uvIndex}{' '}
            <span style={{ color: uv.color }}>({uv.label})</span>
          </span>
        }
      />
    </section>
  );
}
