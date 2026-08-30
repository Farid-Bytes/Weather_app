import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, Heart, Moon, MoreVertical, Sun } from 'lucide-react';
import CitySearch from './CitySearch';
import { easeOut } from '../theme/theme';

export default function Navigation({
  onCitySelect,
  unit = 'metric',
  onUnitToggle,
  theme = 'dark',
  onThemeToggle,
  favorites = [],
  onFavoriteSelect,
  onToggleFavorite,
  isFavorite = false,
  onOpenDetails,
}) {
  const [favOpen, setFavOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.header
      className="relative z-10 px-2 pt-2 md:px-0"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: easeOut }}
    >
      <div className="flex items-center gap-3 px-3 py-2 md:px-4">
        <div className="flex shrink-0 items-center gap-2 px-2 text-sm font-medium tracking-[0.22em] text-text-primary">
          <Cloud size={16} strokeWidth={1.6} />
          ATMOS
        </div>

        <div className="hidden min-w-0 flex-1 justify-center md:flex">
          <CitySearch onCitySelect={onCitySelect} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <div className="relative">
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => {
                setFavOpen((v) => !v);
                onToggleFavorite?.();
              }}
              className="rounded-full p-2 text-text-secondary hover:text-text-primary"
              aria-label="Favorites"
            >
              <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
            </motion.button>
            <AnimatePresence>
              {favOpen && favorites.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.2, ease: easeOut }}
                  className="absolute right-0 top-full z-modal mt-2 w-48 overflow-hidden rounded-lg glass-strong py-2"
                >
                  {favorites.map((fav) => (
                    <button
                      key={fav.name || fav}
                      type="button"
                      onClick={() => {
                        onFavoriteSelect?.(typeof fav === 'string' ? { name: fav } : fav);
                        setFavOpen(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/5"
                    >
                      {fav.name || fav}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onUnitToggle}
            className="min-w-[44px] rounded-full px-2 py-2 text-sm font-medium text-text-primary"
            aria-label="Toggle temperature unit"
          >
            {unit === 'metric' ? '°C' : '°F'}
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onThemeToggle}
            className="rounded-full p-2 text-text-secondary hover:text-text-primary"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
          </motion.button>

          <div className="relative">
            <motion.button
              type="button"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded-full p-2 text-text-secondary hover:text-text-primary"
              aria-label="More"
            >
              <MoreVertical size={18} />
            </motion.button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute right-0 top-full z-modal mt-2 w-44 rounded-lg glass-strong py-2 text-sm"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDetails?.();
                      setMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/5"
                  >
                    More details
                  </button>
                  <p className="px-3 py-1 text-text-muted">ATMOS</p>
                  <p className="px-3 py-1 text-text-secondary">Precision weather</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-3 md:hidden">
        <CitySearch onCitySelect={onCitySelect} />
      </div>
    </motion.header>
  );
}
