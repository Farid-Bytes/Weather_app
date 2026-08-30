import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { searchCities } from '../lib/weatherApi';
import { easeOut } from '../theme/theme';

const RECENTS_KEY = 'atmos-recent-cities';

function loadRecents() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveRecent(city) {
  const next = [
    { name: city.name, country: city.country, state: city.state, lat: city.lat, lon: city.lon },
    ...loadRecents().filter((c) => c.name !== city.name),
  ].slice(0, 5);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}

export default function CitySearch({ onCitySelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState(loadRecents);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('idle');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      setStatus('idle');
      return undefined;
    }

    setIsLoading(true);
    setStatus('typing');
    const timer = setTimeout(async () => {
      try {
        const cities = await searchCities(query);
        setResults(cities);
        setStatus(cities.length ? 'ready' : 'idle');
      } catch {
        setResults([]);
        setStatus('idle');
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const handleSelect = (city) => {
    setQuery('');
    setIsOpen(false);
    setIsFocused(false);
    setStatus('success');
    saveRecent(city);
    setRecents(loadRecents());
    onCitySelect?.(city);
  };

  const showPanel = isOpen && (isLoading || results.length > 0 || (!query && recents.length > 0));

  return (
    <div ref={rootRef} className="relative w-full max-w-md">
      <motion.div
        className={`relative glass-soft overflow-hidden ${
          isFocused ? 'ring-1 ring-white/30' : ''
        }`}
        animate={{
          scale: isFocused ? 1.01 : 1,
          boxShadow: isFocused
            ? '0 8px 30px rgba(0,0,0,0.35)'
            : '0 2px 10px rgba(0,0,0,0.2)',
        }}
        transition={{ duration: 0.2, ease: easeOut }}
        style={{ borderRadius: 999 }}
      >
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsFocused(true);
            setIsOpen(true);
          }}
          placeholder="Search city, country..."
          className="w-full bg-transparent py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted outline-none"
          aria-label="Search city, country"
          aria-autocomplete="list"
          aria-expanded={showPanel}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="absolute top-full z-modal mt-2 w-full overflow-hidden rounded-lg glass-strong py-2"
          >
            {isLoading && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-text-secondary">
                <Loader2 size={14} className="animate-spin" />
                Searching...
              </div>
            )}
            {!isLoading && results.map((city) => (
              <button
                key={`${city.name}-${city.lat}-${city.lon}`}
                type="button"
                onClick={() => handleSelect(city)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 active:scale-[0.98]"
              >
                <MapPin size={14} className="text-primary-strong" />
                <span>
                  <span className="block text-sm text-text-primary">{city.name}</span>
                  <span className="block text-xs text-text-muted">
                    {[city.state, city.country].filter(Boolean).join(', ')}
                  </span>
                </span>
              </button>
            ))}
            {!query && recents.length > 0 && (
              <div className="px-4 pb-1 pt-2">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-text-muted">Recent</p>
                {recents.map((city) => (
                  <button
                    key={`r-${city.name}`}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className="block w-full py-1.5 text-left text-sm text-text-secondary hover:text-text-primary"
                  >
                    {city.name}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">{status}</span>
    </div>
  );
}
