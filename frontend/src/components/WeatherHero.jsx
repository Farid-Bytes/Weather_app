import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { easeOut } from '../theme/theme';

export default function WeatherHero({ weather, reducedMotion, compact = false }) {
  if (!weather) return null;

  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const time = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="px-1">
      <motion.div
        key={`${weather.city}-name`}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut, delay: 0.1 }}
        className="flex items-start gap-2"
      >
        <MapPin size={18} className="mt-2 text-white/80" />
        <div>
          <p
            className={`leading-none text-white ${compact ? 'text-[26px] md:text-[32px]' : 'text-[32px] md:text-[40px]'}`}
            style={{
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 500,
              textShadow: '0 2px 16px rgba(0,0,0,0.45)',
            }}
          >
            {weather.city}
          </p>
          {weather.country && (
            <p className="mt-1 text-[14px] text-white/70">{weather.country}</p>
          )}
        </div>
      </motion.div>
      <p className="mt-3 text-[13px] text-white/60">
        {date} · {time}
      </p>

      <motion.p
        key={`${weather.city}-temp-${weather.temperature}`}
        initial={reducedMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut, delay: 0.18 }}
        className={`font-light tracking-tight text-white ${compact ? 'mt-3' : 'mt-8'}`}
        style={{
          fontSize: compact ? 'clamp(3.4rem, 7vw, 5.2rem)' : 'clamp(5.5rem, 11vw, 8rem)',
          lineHeight: 0.85,
          textShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {weather.temperature}°
      </motion.p>
      <p className={`text-white/90 ${compact ? 'mt-1 text-[16px]' : 'mt-3 text-[20px]'}`}>
        {weather.conditionText}
      </p>
      <p className="mt-1 text-[14px] text-white/60">Feels like {weather.feelsLike}°</p>
    </div>
  );
}
