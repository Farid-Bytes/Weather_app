import { Bookmark, Home, Map, MoreHorizontal, CalendarDays } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'forecast', label: 'Forecast', icon: CalendarDays },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'more', label: 'More', icon: MoreHorizontal },
];

export default function BottomNav({ tab, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-nav border-t border-white/10 bg-[#0b1223]/85 px-2 py-2 backdrop-blur-xl md:hidden">
      <ul className="flex items-center justify-around">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onChange(t.id)}
                className={`flex flex-col items-center gap-1 px-3 py-1 text-[10px] ${
                  active ? 'text-text-primary' : 'text-text-muted'
                }`}
              >
                <Icon size={18} />
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
