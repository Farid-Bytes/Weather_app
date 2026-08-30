import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'framer-motion';
import Navigation from './components/Navigation';
import AtmosphericBackdrop from './components/AtmosphericBackdrop';
import WeatherHero from './components/WeatherHero';
import HourlyForecast from './components/HourlyForecast';
import LiveConditions from './components/LiveConditions';
import StormAlert from './components/StormAlert';
import DailyForecast from './components/DailyForecast';
import ConditionsGrid from './components/ConditionsGrid';
import EnvironmentalData from './components/EnvironmentalData';
import ActivityRecommendations from './components/ActivityRecommendations';
import ChatPanel from './components/ChatPanel';
import BottomNav from './components/BottomNav';
import DetailModal from './components/DetailModal';
import Loader, { Skeleton } from './components/Loader';
import { useTheme } from './hooks/useTheme';
import { useWeather } from './hooks/useWeather';
import { useReducedMotion } from './hooks/useReducedMotion';
import { easeOut } from './theme/theme';

const WeatherMapView = lazy(() => import('./components/WeatherMapView'));
const TemperatureChart = lazy(() => import('./components/TemperatureChart'));

const FAV_KEY = 'atmos-favorites';

function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
  } catch {
    return [];
  }
}

function HeroBlock({ weather, reducedMotion, onSeeWeek, onSeeCharts, onSeeDetails }) {
  return (
    <div className="px-4 pb-3 pt-1 md:px-5">
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_300px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <WeatherHero weather={weather} reducedMotion={reducedMotion} compact />
          <div className="mt-4">
            <StormAlert weather={weather} />
            <HourlyForecast weather={weather} compact />
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <LiveConditions weather={weather} compact />
          <div className="hidden md:block">
            <DailyForecast
              weather={weather}
              compact
              onSeeWeek={onSeeWeek}
              onSeeCharts={onSeeCharts}
              onSeeDetails={onSeeDetails}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

const OVERLAY_TITLES = {
  forecast: '7-day forecast',
  charts: 'Temperature & precipitation',
  details: 'Conditions & environment',
};

export default function App() {
  const [unit, setUnit] = useState(() => localStorage.getItem('atmos-unit') || 'metric');
  const { theme, toggleTheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const { weather, isLoading, error, selectCity, refresh, transitioning } = useWeather(unit);
  const [favorites, setFavorites] = useState(loadFavorites);
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState('home');
  const [overlay, setOverlay] = useState(null);

  useEffect(() => {
    localStorage.setItem('atmos-unit', unit);
  }, [unit]);

  useEffect(() => {
    if (weather?.condition) {
      document.documentElement.setAttribute('data-weather', weather.condition);
    }
  }, [weather?.condition]);

  useEffect(() => {
    const onFlash = () => {
      document.documentElement.classList.add('lightning-flash');
      window.setTimeout(() => {
        document.documentElement.classList.remove('lightning-flash');
      }, 180);
    };
    window.addEventListener('atmos:lightning', onFlash);
    return () => window.removeEventListener('atmos:lightning', onFlash);
  }, []);

  const isFavorite = Boolean(weather && favorites.some((f) => f.name === weather.city));

  const toggleFavorite = () => {
    if (!weather) return;
    const entry = { name: weather.city, lat: weather.lat, lon: weather.lon };
    const exists = favorites.some((f) => f.name === weather.city);
    const next = exists
      ? favorites.filter((f) => f.name !== weather.city)
      : [entry, ...favorites].slice(0, 8);
    setFavorites(next);
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
  };

  const closeOverlay = () => {
    setOverlay(null);
    if (mobileTab === 'forecast' || mobileTab === 'more') {
      setMobileTab('home');
    }
  };

  const handleTab = (tab) => {
    if (tab === 'forecast') {
      setOverlay('forecast');
      setMobileTab('forecast');
      return;
    }
    if (tab === 'more') {
      setOverlay('details');
      setMobileTab('more');
      return;
    }
    setOverlay(null);
    setMobileTab(tab);
  };

  const pullY = useRef(null);
  const condition = weather?.condition || 'sunny';

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="relative min-h-svh font-sans text-text-primary"
        onTouchStart={(e) => {
          if (window.scrollY <= 4) pullY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (pullY.current != null && e.changedTouches[0].clientY - pullY.current > 88) {
            refresh();
          }
          pullY.current = null;
        }}
      >
        <AtmosphericBackdrop
          condition={condition}
          city={weather?.city}
          country={weather?.country}
        />

        <div className="relative z-10 mx-auto max-w-[1400px] px-2 py-3 pb-28 md:px-5 md:pb-8">
          <div className="atmos-panel">
            <Navigation
              onCitySelect={selectCity}
              unit={unit}
              onUnitToggle={() => setUnit((u) => (u === 'metric' ? 'imperial' : 'metric'))}
              theme={theme}
              onThemeToggle={toggleTheme}
              favorites={favorites}
              onFavoriteSelect={(city) => {
                selectCity(city);
                setMobileTab('home');
              }}
              onToggleFavorite={toggleFavorite}
              isFavorite={isFavorite}
              onOpenDetails={() => setOverlay('details')}
            />

            {error && (
              <p className="mx-5 mb-2 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm">
                {error}
              </p>
            )}

            {isLoading && !weather && (
              <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
                <Loader size="lg" text="Loading weather..." />
                <Skeleton height="h-8" width="w-48" />
              </div>
            )}

            {weather && (
              <motion.div
                animate={{ opacity: transitioning && !reducedMotion ? 0.55 : 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.45, ease: easeOut }}
              >
                <div className={mobileTab === 'map' || mobileTab === 'saved' ? 'max-md:hidden' : ''}>
                  <HeroBlock
                    weather={weather}
                    reducedMotion={reducedMotion}
                    onSeeWeek={() => setOverlay('forecast')}
                    onSeeCharts={() => setOverlay('charts')}
                    onSeeDetails={() => setOverlay('details')}
                  />
                </div>

                <div className="hidden px-4 pb-5 md:block">
                  <Suspense fallback={<Skeleton height="h-64" width="w-full" />}>
                    <WeatherMapView lat={weather.lat} lon={weather.lon} weather={weather} />
                  </Suspense>
                </div>

                <div className="px-4 pb-4 md:hidden">
                  {mobileTab === 'home' && (
                    <DailyForecast
                      weather={weather}
                      compact
                      onSeeWeek={() => setOverlay('forecast')}
                      onSeeCharts={() => setOverlay('charts')}
                      onSeeDetails={() => setOverlay('details')}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {weather && mobileTab === 'map' && (
            <div className="mt-3 min-h-[55vh] md:hidden">
              <Suspense fallback={<Skeleton height="h-64" width="w-full" />}>
                <WeatherMapView lat={weather.lat} lon={weather.lon} weather={weather} />
              </Suspense>
            </div>
          )}

          {weather && mobileTab === 'saved' && (
            <div className="mt-3 space-y-2 px-1 md:hidden">
              <h2 className="text-[11px] uppercase tracking-[0.18em] text-white/70">Saved</h2>
              {favorites.length === 0 && (
                <p className="text-sm text-white/70">No saved cities yet.</p>
              )}
              {favorites.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => {
                    selectCity(f);
                    setMobileTab('home');
                  }}
                  className="atmos-inset w-full px-4 py-3 text-left text-white"
                >
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <DetailModal
          open={Boolean(overlay)}
          title={OVERLAY_TITLES[overlay] || ''}
          onClose={closeOverlay}
        >
          {weather && overlay === 'forecast' && (
            <DailyForecast weather={weather} framed={false} />
          )}
          {weather && overlay === 'charts' && (
            <Suspense fallback={<Skeleton height="h-52" width="w-full" />}>
              <TemperatureChart weather={weather} />
            </Suspense>
          )}
          {weather && overlay === 'details' && (
            <div className="space-y-6">
              <ConditionsGrid weather={weather} />
              <EnvironmentalData weather={weather} />
              <ActivityRecommendations weather={weather} />
            </div>
          )}
        </DetailModal>

        <ChatPanel
          open={chatOpen}
          onOpen={() => setChatOpen(true)}
          onClose={() => setChatOpen(false)}
          weather={weather}
        />
        <BottomNav tab={mobileTab} onChange={handleTab} />
      </div>
    </MotionConfig>
  );
}
