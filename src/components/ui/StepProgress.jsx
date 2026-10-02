export const STEP_MARKS = {
  order: { badge: 'bg-sky-600 text-white', idle: 'border border-sky-300 bg-sky-100 text-sky-800', title: 'text-sky-800', shell: 'border-sky-300' },
  products: { badge: 'bg-orange-600 text-white', idle: 'border border-orange-300 bg-orange-100 text-orange-900', title: 'text-orange-900', shell: 'border-orange-300' },
  delivery: { badge: 'bg-teal-600 text-white', idle: 'border border-teal-300 bg-teal-100 text-teal-800', title: 'text-teal-800', shell: 'border-teal-300' },
  totals: { badge: 'bg-emerald-600 text-white', idle: 'border border-emerald-300 bg-emerald-100 text-emerald-800', title: 'text-emerald-800', shell: 'border-emerald-300' },
  manufacturing: { badge: 'bg-amber-500 text-white', idle: 'border border-amber-300 bg-amber-100 text-amber-900', title: 'text-amber-900', shell: 'border-amber-300' },
  documents: { badge: 'bg-violet-600 text-white', idle: 'border border-violet-300 bg-violet-100 text-violet-800', title: 'text-violet-800', shell: 'border-violet-300' },
  amounts: { badge: 'bg-emerald-600 text-white', idle: 'border border-emerald-300 bg-emerald-100 text-emerald-800', title: 'text-emerald-800', shell: 'border-emerald-300' },
  progress: { badge: 'bg-teal-600 text-white', idle: 'border border-teal-300 bg-teal-100 text-teal-800', title: 'text-teal-800', shell: 'border-teal-300' },
  work: { badge: 'bg-orange-600 text-white', idle: 'border border-orange-300 bg-orange-100 text-orange-900', title: 'text-orange-900', shell: 'border-orange-300' },
  tasks: { badge: 'bg-rose-600 text-white', idle: 'border border-rose-300 bg-rose-100 text-rose-800', title: 'text-rose-800', shell: 'border-rose-300' },
};

export function stepMark(id) {
  return STEP_MARKS[id] || STEP_MARKS.order;
}

export function StepProgress({ steps, value, onChange }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-3">
      <ol className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {steps.map((step, index) => {
          const active = step.id === value;
          const mark = stepMark(step.id);
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onChange(step.id)}
                className="flex min-w-0 items-center gap-2 rounded-lg px-1 py-1 text-left"
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? mark.badge : mark.idle}`}>
                  {index + 1}
                </span>
                <span className={`block truncate ${active ? `text-base font-semibold ${mark.title}` : `text-sm font-semibold ${mark.title}`}`}>
                  {step.label}
                  {step.count != null ? ` · ${step.count}` : ''}
                </span>
              </button>
              {index < steps.length - 1 ? <span className="hidden h-px flex-1 bg-line sm:block" /> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
