import { AlertTriangle } from 'lucide-react';

export default function StormAlert({ weather }) {
  if (!weather || weather.condition !== 'thunderstorm') return null;
  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-violet-400/30 bg-violet-500/15 px-4 py-3 text-sm text-text-primary">
      <AlertTriangle size={16} className="text-violet-300" />
      Thunderstorms possible for the next 2 hours.
    </div>
  );
}
