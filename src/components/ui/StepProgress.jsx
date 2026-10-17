import { stepMark } from '../../lib/steps';


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
