import { useEffect, useState } from 'react';

const MANAGER_SLUGS = ['sales_manager', 'production_manager', 'inventory_manager', 'dispatch_manager', 'accounts'];
const OPERATOR_SLUGS = ['rolling_operator', 'printing_operator', 'cutting_operator', 'packing_operator'];

const TONES = {
  admin: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  managers: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  operators: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  other: { chip: 'border-slate-300 bg-white text-ink', dot: 'bg-slate-500' },
};

function roleTone(slug) {
  if (slug === 'super_admin') return TONES.admin;
  if (MANAGER_SLUGS.includes(slug)) return TONES.managers;
  if (OPERATOR_SLUGS.includes(slug)) return TONES.operators;
  return TONES.other;
}

export function RoleMenu({ roles, value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const current = roles.find((role) => role._id === value);
  const tone = current ? roleTone(current.slug) : TONES.other;

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative mt-1" onClick={(event) => event.stopPropagation()}>
      <input type="text" required value={value} onChange={() => {}} tabIndex={-1} className="sr-only" aria-hidden="true" />
      <button
        type="button"
        aria-label="Role"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
        className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60 ${tone.chip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <span className="min-w-0 flex-1 truncate">{current?.name || 'Choose a role'}</span>
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-line bg-white p-1 shadow-md">
          {roles.map((role) => {
            const itemTone = roleTone(role.slug);
            const selected = role._id === value;
            return (
              <button
                key={role._id}
                type="button"
                onClick={() => {
                  onChange(role._id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  selected ? itemTone.chip : 'text-ink hover:bg-paper'
                }`}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${itemTone.dot}`} />
                <span className="flex-1">{role.name}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
