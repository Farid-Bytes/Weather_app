import { motion } from 'framer-motion';
import WeatherIcon from './WeatherIcon';
import { easeOut } from '../theme/theme';

export default function HourlyForecast({ weather, compact = false, showTooltip = true }) {
  if (!weather?.hourly?.length) return null;
  const hours = weather.hourly.slice(0, 8);

  return (
    <section>
      <h2 className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
        Hourly forecast
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {hours.map((h, i) => (
          <motion.div
            key={h.time || i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: easeOut, delay: i * 0.03 }}
            className={`group relative rounded-xl text-center ${compact ? 'min-w-[56px] px-2 py-2' : 'min-w-[72px] px-3 py-3'}`}
            style={
              h.isNow
                ? {
                    background: 'rgba(255,255,255,0.12)',
                    boxShadow: '0 0 0 1px rgba(167,139,250,0.85), 0 8px 24px rgba(0,0,0,0.25)',
                  }
                : {
                    background: 'rgba(255,255,255,0.05)',
                  }
            }
          >
            <p className="text-[11px] text-text-muted">{h.isNow ? 'NOW' : h.label}</p>
            <motion.div
              className="mx-auto my-2 flex justify-center text-text-primary"
              whileHover={{ y: -2 }}
            >
              <WeatherIcon condition={h.condition} size={20} />
            </motion.div>
            <p className="text-sm text-text-primary">{h.temperature}°</p>
            {!compact && (
              <p className="mt-1 text-[10px] text-primary-soft">{h.precipitation}%</p>
            )}
            {h.isNow && (
              <span className="mt-2 mx-auto block h-0.5 w-6 rounded-full bg-white/80" />
            )}
            {showTooltip && (
              <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-40 -translate-x-1/2 rounded-md glass-strong p-2 text-left text-[11px] group-hover:block">
                <p>Feels like {h.feelsLike}°</p>
                <p>Precip {h.precipitation}%</p>
                <p>Wind {h.windSpeed} {weather.speedUnit}</p>
                <p>Humidity {h.humidity}%</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
