import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeolocation } from './useGeolocation';
import { fetchWeatherByCity, fetchWeatherByCoords } from '../lib/weatherApi';

const FALLBACK_CITY = 'Lahore';

export function useWeather(unit = 'metric') {
  const { position, error: geoError, isLoading: geoLoading } = useGeolocation();
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const targetRef = useRef(null);

  const load = useCallback(
    async (next, { transition = false } = {}) => {
      targetRef.current = next;
      if (transition) setTransitioning(true);
      setIsLoading(true);
      setError(null);
      try {
        const data =
          next.type === 'coords'
            ? await fetchWeatherByCoords(next.lat, next.lon, unit)
            : await fetchWeatherByCity(next.city, unit);
        setWeather(data);
      } catch (err) {
        setError(err.message || 'Unable to load weather');
      } finally {
        setIsLoading(false);
        if (transition) {
          window.setTimeout(() => setTransitioning(false), 1100);
        }
      }
    },
    [unit]
  );

  useEffect(() => {
    if (targetRef.current) {
      load(targetRef.current);
      return;
    }
    if (position) {
      load({ type: 'coords', lat: position.lat, lon: position.lon });
      return;
    }
    if (!geoLoading && (geoError || !position)) {
      load({ type: 'city', city: FALLBACK_CITY });
    }
  }, [position, geoError, geoLoading, unit, load]);

  const selectCity = useCallback(
    (city) => {
      if (city?.name) {
        load({ type: 'city', city: city.name }, { transition: true });
        return;
      }
      if (city.lat != null && city.lon != null) {
        load({ type: 'coords', lat: city.lat, lon: city.lon }, { transition: true });
      }
    },
    [load]
  );

  const refresh = useCallback(() => {
    if (targetRef.current) load(targetRef.current);
  }, [load]);

  return { weather, isLoading, error, selectCity, refresh, transitioning };
}
