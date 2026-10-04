export const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 font-normal outline-none focus:border-accent disabled:bg-paper';

// `mark` only shows an asterisk; it does not block saving a draft.
export function Field({ label, children, className = '', mark = false }) {
  return (
    <label className={`block text-base font-semibold text-ink ${className}`}>
      {label}
      {mark ? (
        <span className="text-red-700" aria-hidden="true">
          {' *'}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function Section({ title, children, actions, mark }) {
  return (
    <section className={`space-y-3 rounded-xl border-2 bg-card p-5 ${mark?.shell || 'border-line'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`inline-flex items-center gap-2 text-lg font-semibold ${mark?.title || 'text-ink'}`}>
          {mark?.number ? (
            <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${mark.badge}`}>{mark.number}</span>
          ) : null}
          {title}
        </h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Grid({ children, cols = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return <div className={`grid gap-3 ${cols}`}>{children}</div>;
}
