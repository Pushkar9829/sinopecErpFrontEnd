import { useEffect, useState } from 'react';

const STAGE_COLORS = {
  all: { chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  rolling: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  printing: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  cutting: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  dispatch: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  delivery: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
};

export function StageMenu({ stages, value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = stages.find((item) => item.id === value) || stages[0];
  const tone = STAGE_COLORS[current?.id] || { chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' };

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  if (!current) return null;

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Stage"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${tone.chip}`}
      >
        <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
        {current.label}
        {current.count != null ? <span className="text-xs">· {current.count}</span> : null}
        <svg viewBox="0 0 20 20" className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-48 rounded-lg border border-line bg-white p-1 shadow-md">
          {stages.map((item) => {
            const itemTone = STAGE_COLORS[item.id] || tone;
            const on = item.id === value;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  on ? itemTone.chip : 'text-ink hover:bg-paper'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${itemTone.dot}`} />
                <span className="flex-1">{item.label}</span>
                {item.count != null ? <span className="text-xs">{item.count}</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
