import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSnow, Moon, Sun, Wind } from 'lucide-react';

const MAP = {
  sunny: Sun,
  'partly-cloudy': Cloud,
  cloudy: Cloud,
  rainy: CloudRain,
  thunderstorm: CloudLightning,
  snowy: CloudSnow,
  windy: Wind,
  foggy: CloudFog,
  'night-clear': Moon,
  'night-cloudy': Cloud,
};

export default function WeatherIcon({ condition = 'sunny', size = 20, className = '' }) {
  const Icon = MAP[condition] || Cloud;
  return <Icon size={size} className={className} strokeWidth={1.6} />;
}
