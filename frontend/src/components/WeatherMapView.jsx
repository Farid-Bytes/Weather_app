import { useEffect, useRef, useState } from 'react';
import { Locate, Minus, Pause, Play, Plus } from 'lucide-react';

const LAYERS = ['Radar', 'Wind', 'Temperature', 'Precipitation', 'Clouds'];
const BASE_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const RADAR_MAX_ZOOM = 7;
const RADAR_MIN_ZOOM = 3;
const RADAR_DEFAULT_ZOOM = 6;

function tempColor(t) {
  if (t <= 5) return '#3b82f6';
  if (t <= 15) return '#22d3ee';
  if (t <= 24) return '#facc15';
  if (t <= 32) return '#fb923c';
  return '#ef4444';
}

function buildGrid(lat, lon, size = 5, span = 2.4) {
  const points = [];
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < size; j += 1) {
      points.push({
        lat: lat - span / 2 + (i * span) / (size - 1),
        lon: lon - span / 2 + (j * span) / (size - 1),
      });
    }
  }
  return points;
}

function precipColor(p) {
  if (p <= 0) return '#94a3b8';
  if (p < 20) return '#67e8f9';
  if (p < 40) return '#38bdf8';
  if (p < 70) return '#3b82f6';
  return '#1d4ed8';
}

function cloudColor(c) {
  const a = 0.25 + Math.min(c, 100) / 180;
  return `rgba(226, 232, 240, ${a})`;
}

async function fetchGridWeather(lat, lon, unit) {
  const points = buildGrid(lat, lon);
  const latitudes = points.map((p) => p.lat.toFixed(3)).join(',');
  const longitudes = points.map((p) => p.lon.toFixed(3)).join(',');
  const tempUnit = unit === 'imperial' ? 'fahrenheit' : 'celsius';
  const windUnit = unit === 'imperial' ? 'mph' : 'kmh';
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}` +
    `&longitude=${longitudes}` +
    `&current=temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover` +
    `&hourly=precipitation_probability,cloud_cover,precipitation` +
    `&forecast_hours=1` +
    `&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Grid weather failed');
  const data = await res.json();
  const rows = Array.isArray(data) ? data : [data];
  return rows.map((row, i) => {
    const hourlyPrecip = row.hourly?.precipitation_probability?.[0];
    const hourlyCloud = row.hourly?.cloud_cover?.[0];
    return {
      lat: points[i].lat,
      lon: points[i].lon,
      temp: row.current?.temperature_2m,
      wind: row.current?.wind_speed_10m,
      dir: row.current?.wind_direction_10m,
      precip: hourlyPrecip ?? row.current?.precipitation ?? 0,
      cloud: hourlyCloud ?? row.current?.cloud_cover ?? 0,
    };
  });
}

export default function WeatherMapView({ lat, lon, weather, fill = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const overlayRef = useRef(null);
  const gridRef = useRef(null);
  const [layer, setLayer] = useState('Radar');
  const [frames, setFrames] = useState([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  const isRadarLayer = layer === 'Radar';

  useEffect(() => {
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json())
      .then((json) => {
        const past = json?.radar?.past || [];
        const nowcast = json?.radar?.nowcast || [];
        setFrames([...past, ...nowcast]);
        setFrameIndex(Math.max(0, past.length - 1));
      })
      .catch(() => setFrames([]));
  }, []);

  useEffect(() => {
    if (!lat || !lon || typeof window === 'undefined') return undefined;
    let cancelled = false;

    import('leaflet').then((mod) => {
      const L = mod.default || mod;
      import('leaflet/dist/leaflet.css');
      if (cancelled || !mapRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: true,
          minZoom: RADAR_MIN_ZOOM,
          maxZoom: 12,
        }).setView([lat, lon], RADAR_DEFAULT_ZOOM);

        L.tileLayer(BASE_TILE, {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map);

        markerRef.current = L.circleMarker([lat, lon], {
          radius: 8,
          color: '#fff',
          weight: 2,
          fillColor: '#3b82f6',
          fillOpacity: 1,
        })
          .bindPopup(weather?.city || 'Selected location')
          .addTo(map);

        mapInstanceRef.current = map;
        setReady(true);
        window.setTimeout(() => map.invalidateSize(), 80);
        window.setTimeout(() => map.invalidateSize(), 400);
      } else {
        mapInstanceRef.current.setView([lat, lon], isRadarLayer ? RADAR_DEFAULT_ZOOM : 7);
        markerRef.current?.setLatLng([lat, lon]);
        mapInstanceRef.current.invalidateSize();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lon, weather?.city, isRadarLayer]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const el = mapRef.current;
    if (!ready || !map || !el) return undefined;
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !ready) return undefined;

    if (isRadarLayer && map.getZoom() > RADAR_MAX_ZOOM) {
      map.setZoom(RADAR_DEFAULT_ZOOM);
    }

    import('leaflet').then(async (mod) => {
      const L = mod.default || mod;
      if (overlayRef.current) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
      if (gridRef.current) {
        map.removeLayer(gridRef.current);
        gridRef.current = null;
      }

      if (isRadarLayer) {
        const frame = frames[frameIndex];
        const ts = frame?.time;
        if (!ts) return;
        overlayRef.current = L.tileLayer(
          `https://tilecache.rainviewer.com/v2/radar/${ts}/256/{z}/{x}/{y}/2/1_1.png`,
          {
            opacity: layer === 'Clouds' ? 0.45 : 0.72,
            maxZoom: RADAR_MAX_ZOOM,
            maxNativeZoom: RADAR_MAX_ZOOM,
            minZoom: RADAR_MIN_ZOOM,
          }
        ).addTo(map);
        return;
      }

      try {
        const grid = await fetchGridWeather(lat, lon, weather?.unit);
        const group = L.layerGroup();
        grid.forEach((p) => {
          if (layer === 'Temperature') {
            const color = tempColor(p.temp ?? 0);
            L.circleMarker([p.lat, p.lon], {
              radius: 14,
              color,
              fillColor: color,
              fillOpacity: 0.55,
              weight: 1,
            })
              .bindTooltip(`${Math.round(p.temp)}°`, {
                permanent: true,
                direction: 'center',
                className: 'atmos-map-label',
              })
              .addTo(group);
          } else if (layer === 'Precipitation') {
            const value = Math.round(p.precip ?? 0);
            const color = precipColor(value);
            L.circleMarker([p.lat, p.lon], {
              radius: 16,
              color,
              fillColor: color,
              fillOpacity: 0.6,
              weight: 1,
            })
              .bindTooltip(`${value}% rain`, {
                permanent: true,
                direction: 'center',
                className: 'atmos-map-label',
              })
              .addTo(group);
          } else if (layer === 'Clouds') {
            const value = Math.round(p.cloud ?? 0);
            L.circleMarker([p.lat, p.lon], {
              radius: 18,
              color: '#e2e8f0',
              fillColor: cloudColor(value),
              fillOpacity: 0.85,
              weight: 1,
            })
              .bindTooltip(`${value}% cloud`, {
                permanent: true,
                direction: 'center',
                className: 'atmos-map-label',
              })
              .addTo(group);
          } else {
            const deg = (p.dir ?? 0) + 180;
            const icon = L.divIcon({
              className: 'atmos-wind-icon',
              html: `<div style="transform:rotate(${deg}deg);font-size:18px;color:#67e8f9;text-shadow:0 1px 4px #000">▲</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10],
            });
            L.marker([p.lat, p.lon], { icon })
              .bindTooltip(`${Math.round(p.wind)} ${weather?.speedUnit || 'km/h'}`, {
                direction: 'top',
              })
              .addTo(group);
          }
        });
        group.addTo(map);
        gridRef.current = group;
      } catch (err) {
        console.error(err);
      }
    });

    return undefined;
  }, [layer, frameIndex, frames, ready, lat, lon, weather?.unit, weather?.speedUnit, isRadarLayer]);

  useEffect(() => {
    if (!playing || !frames.length || !isRadarLayer) return undefined;
    const id = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length);
    }, 700);
    return () => clearInterval(id);
  }, [playing, frames.length, isRadarLayer]);

  useEffect(
    () => () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    },
    []
  );

  const zoom = (dir) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const next = map.getZoom() + dir;
    if (isRadarLayer && next > RADAR_MAX_ZOOM) return;
    if (dir > 0) map.zoomIn();
    else map.zoomOut();
  };

  return (
    <section
      className={`atmos-inset relative flex min-h-0 flex-col overflow-hidden p-3 ${
        fill ? 'h-full' : ''
      }`}
    >
      <div className="mb-2 flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
          Weather map
        </h2>
        <div className="flex flex-wrap gap-1">
          {LAYERS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setLayer(name)}
              className={`rounded-full px-3 py-1 text-[11px] ${
                layer === name
                  ? 'border border-white/30 bg-white/10 text-text-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <div
        className={`relative min-h-0 overflow-hidden rounded-lg bg-[#1a2332] ${
          fill ? 'flex-1' : 'h-[320px] md:h-[520px] lg:h-[560px]'
        }`}
      >
        <div ref={mapRef} className="h-full w-full" />
        <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1">
          <button type="button" onClick={() => zoom(1)} className="glass-soft p-2" aria-label="Zoom in">
            <Plus size={14} />
          </button>
          <button type="button" onClick={() => zoom(-1)} className="glass-soft p-2" aria-label="Zoom out">
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={() =>
              mapInstanceRef.current?.setView([lat, lon], isRadarLayer ? RADAR_DEFAULT_ZOOM : 7)
            }
            className="glass-soft p-2"
            aria-label="Current location"
          >
            <Locate size={14} />
          </button>
        </div>
        <div className="absolute bottom-3 left-3 z-[500] max-w-[70%] rounded-md glass-soft px-2 py-2 text-[10px] text-text-muted">
          {layer === 'Radar' && 'Live rain radar. Empty = no rain in this region right now.'}
          {layer === 'Wind' && 'Wind direction and speed around this city'}
          {layer === 'Temperature' && 'Temperature around this city'}
          {layer === 'Precipitation' && 'Chance of rain around this city'}
          {layer === 'Clouds' && 'Cloud cover around this city'}
          {layer === 'Radar' && (
            <div className="mt-1 h-1.5 w-24 rounded-full bg-gradient-to-r from-lime-400 via-yellow-400 to-fuchsia-500" />
          )}
        </div>
      </div>
      {isRadarLayer && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="glass-soft p-2"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={Math.max(frames.length - 1, 0)}
            value={frameIndex}
            onChange={(e) => setFrameIndex(Number(e.target.value))}
            className="flex-1 accent-sky-400"
          />
          <span className="text-[11px] text-text-muted">Replay radar</span>
        </div>
      )}
    </section>
  );
}
