import { Droplets, Eye, Gauge, SunMedium, Thermometer, Waves, Wind } from 'lucide-react';
import { getUvLevel } from '../theme/theme';

function Card({ icon: Icon, label, value, detail, accent }) {
  return (
    <div className="atmos-inset p-3">
      <div className="mb-2 flex items-center gap-2 text-text-muted">
        <Icon size={14} style={{ color: accent }} />
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg text-text-primary">{value}</p>
      {detail && <p className="mt-1 text-[12px] text-text-muted">{detail}</p>}
    </div>
  );
}

export default function ConditionsGrid({ weather }) {
  if (!weather) return null;
  const uv = getUvLevel(weather.uvIndex);
  const windLabel = weather.windSpeed < 12 ? 'Light breeze' : weather.windSpeed < 28 ? 'Breezy' : 'Windy';
  const humidityLabel = weather.humidity < 40 ? 'Dry' : weather.humidity < 70 ? 'Comfortable' : 'Humid';
  const visLabel = weather.visibility >= 8 ? 'Excellent' : weather.visibility >= 4 ? 'Moderate' : 'Poor';
  const precipChance = weather.hourly?.[0]?.precipitation ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card icon={Droplets} label="Humidity" value={`${weather.humidity}%`} detail={humidityLabel} accent="#60a5fa" />
      <Card icon={Wind} label="Wind" value={`${weather.windSpeed} ${weather.speedUnit}`} detail={`${weather.windCompass} · ${windLabel}`} accent="#93c5fd" />
      <Card icon={Thermometer} label="Feels like" value={`${weather.feelsLike}°`} detail={`${weather.feelsLike - weather.temperature >= 0 ? '↑' : '↓'} ${Math.abs(weather.feelsLike - weather.temperature)}° from actual`} accent="#fbbf24" />
      <Card icon={SunMedium} label="UV Index" value={weather.uvIndex} detail={uv.label} accent={uv.color} />
      <Card icon={Waves} label="Dew point" value={`${weather.dewPoint}°`} detail="Moderate" accent="#67e8f9" />
      <Card icon={Eye} label="Visibility" value={`${weather.visibility} ${weather.visibilityUnit}`} detail={visLabel} accent="#86efac" />
      <Card icon={Gauge} label="Pressure" value={`${weather.pressure} hPa`} detail="Steady" accent="#cbd5e1" />
      <Card icon={Droplets} label="Precipitation" value={`${precipChance}%`} detail={precipChance < 20 ? 'Low chance' : 'Likely'} accent="#38bdf8" />
    </div>
  );
}
