import { dotTones, tabActiveTones } from './Badge';

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-paper p-1">
      {tabs.map((tab) => {
        const active = value === tab.id;
        const activeClass = tab.tone && tabActiveTones[tab.tone] ? tabActiveTones[tab.tone] : 'bg-ink text-paper';
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`rounded-md px-3 py-1.5 text-sm transition ${
              active ? activeClass : 'text-slate hover:bg-white'
            }`}
          >
            {tab.tone && dotTones[tab.tone] ? (
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${dotTones[tab.tone]} ${active ? 'bg-white' : ''}`} />
            ) : null}
            {tab.label}
            {tab.count != null ? (
              <span className={`ml-1.5 ${active ? 'text-white/75' : 'text-steel'}`}>{tab.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
