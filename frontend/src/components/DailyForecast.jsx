import WeatherIcon from './WeatherIcon';

export default function DailyForecast({
  weather,
  compact = false,
  onSeeWeek,
  onSeeCharts,
  onSeeDetails,
  framed = true,
}) {
  if (!weather?.forecast?.length) return null;
  const days = compact ? weather.forecast.slice(0, 3) : weather.forecast;
  const highs = weather.forecast.map((d) => d.highTemp);
  const lows = weather.forecast.map((d) => d.lowTemp);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = Math.max(max - min, 1);

  return (
    <section className={`${framed ? 'atmos-inset h-full min-h-0' : ''} flex flex-col p-3 md:p-4`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          {compact ? '3-day forecast' : '7-day forecast'}
        </h2>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {days.map((day) => {
          const left = ((day.lowTemp - min) / span) * 100;
          const width = ((day.highTemp - day.lowTemp) / span) * 100;
          return (
            <li
              key={day.date}
              className={`grid items-center gap-2 border-b border-white/10 last:border-0 ${
                compact
                  ? 'grid-cols-[52px_22px_1fr] py-1.5'
                  : 'grid-cols-[48px_28px_1fr_88px_40px] gap-3 py-2.5'
              }`}
            >
              <span className="text-sm text-white">{day.day}</span>
              <WeatherIcon condition={day.condition} size={compact ? 16 : 18} className="text-white" />
              {!compact && (
                <span className="truncate text-[13px] text-white/65">{day.conditionText}</span>
              )}
              <span className="text-right text-sm text-white">
                {day.highTemp}° <span className="text-white/55">/ {day.lowTemp}°</span>
              </span>
              {!compact && (
                <span className="text-right text-xs text-sky-200">{day.precipitation}%</span>
              )}
              <div className={`${compact ? 'col-span-3' : 'col-span-5'} mt-1 h-1.5 rounded-full bg-white/15`}>
                <div
                  className="h-1.5 rounded-full bg-gradient-to-r from-sky-400 to-orange-400"
                  style={{ marginLeft: `${left}%`, width: `${Math.max(width, 8)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-[12px] text-white md:grid-cols-4">
          <p className="text-red-300">Max {weather.weekly.max}°</p>
          <p className="text-sky-300">Min {weather.weekly.min}°</p>
          <p className="text-sky-200">
            Rain {weather.weekly.rain} {weather.unit === 'imperial' ? 'in' : 'mm'}
          </p>
          <p className="text-teal-200">
            Wind {weather.weekly.wind} {weather.speedUnit}
          </p>
        </div>
      )}
      {compact && (onSeeWeek || onSeeCharts || onSeeDetails) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {onSeeWeek && (
            <button
              type="button"
              onClick={onSeeWeek}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] text-white hover:bg-white/20"
            >
              See full week
            </button>
          )}
          {onSeeCharts && (
            <button
              type="button"
              onClick={onSeeCharts}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] text-white hover:bg-white/20"
            >
              Charts
            </button>
          )}
          {onSeeDetails && (
            <button
              type="button"
              onClick={onSeeDetails}
              className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-[11px] text-white hover:bg-white/20"
            >
              More details
            </button>
          )}
        </div>
      )}
    </section>
  );
}
