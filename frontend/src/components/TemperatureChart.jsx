import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md glass-strong px-3 py-2 text-[12px]">
      <p className="text-text-muted">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="text-text-primary">
          {p.name} {Math.round(p.value)}°
        </p>
      ))}
    </div>
  );
}

export default function TemperatureChart({ weather }) {
  const [range, setRange] = useState('today');

  const data = useMemo(() => {
    if (!weather) return [];
    if (range === 'today') {
      return (weather.hourly || []).slice(0, 24).map((h) => ({
        label: h.label,
        High: h.temperature,
        Low: h.temperature - 2,
        Feels: h.feelsLike,
        precip: h.precipMm,
        wind: h.windSpeed,
      }));
    }
    return (weather.forecast || []).map((d) => ({
      label: d.day,
      High: d.highTemp,
      Low: d.lowTemp,
      Feels: Math.round((d.highTemp + d.lowTemp) / 2),
      precip: d.precipitationSum,
      wind: d.windSpeedMax,
    }));
  }, [weather, range]);

  if (!weather) return null;

  return (
    <section className="p-0">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
          Temperature
        </h2>
        <div className="flex gap-1">
          {[
            ['today', 'Today'],
            ['week', 'Week'],
            ['month', 'Month'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setRange(id === 'month' ? 'week' : id)}
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                range === id || (id === 'month' && range === 'week')
                  ? 'bg-white/10 text-text-primary'
                  : 'text-text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="High" stroke="#f87171" strokeWidth={1.5} fill="url(#tempFill)" dot={false} />
            <Line type="monotone" dataKey="Low" stroke="#60a5fa" strokeWidth={1.2} dot={false} />
            <Line type="monotone" dataKey="Feels" stroke="#fbbf24" strokeWidth={1} strokeDasharray="3 4" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="h-24">
          <p className="mb-1 text-[11px] text-text-muted">Precipitation</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <Bar dataKey="precip" fill="#38bdf8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="h-24">
          <p className="mb-1 text-[11px] text-text-muted">Wind</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <Line type="monotone" dataKey="wind" stroke="#67e8f9" strokeWidth={1.4} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
