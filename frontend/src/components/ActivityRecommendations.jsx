import { Bike, Camera, Footprints, Mountain, Utensils } from 'lucide-react';
import { getActivityRecommendations } from '../lib/activities';

const ICONS = {
  run: Footprints,
  cycle: Bike,
  dining: Utensils,
  photo: Camera,
  hike: Mountain,
};

export default function ActivityRecommendations({ weather, limit }) {
  const items = getActivityRecommendations(weather);
  const shown = limit ? items.slice(0, limit) : items;
  if (!shown.length) return null;

  return (
    <section>
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-text-muted">
        Good conditions for outdoors
      </h2>
      <div className="grid gap-3 md:grid-cols-5">
        {shown.map((a) => {
          const Icon = ICONS[a.icon] || Footprints;
          return (
            <article key={a.id} className="atmos-inset p-4">
              <div className="mb-3 flex items-center justify-between">
                <Icon size={18} className="text-primary-strong" />
                <span className="text-[12px] text-text-muted">{a.score}/10</span>
              </div>
              <h3 className="text-sm font-medium text-text-primary">{a.title}</h3>
              <p className="mt-1 text-[12px] text-success">{a.status}</p>
              <p className="mt-2 text-[12px] text-text-muted">{a.note}</p>
              <p className="mt-3 text-[11px] text-text-secondary">Best window: {a.best}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
