export const inputClass =
  'mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 outline-none focus:border-accent disabled:bg-paper';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block text-sm text-slate ${className}`}>
      {label}
      {children}
    </label>
  );
}

export function Section({ title, children, actions }) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-medium">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Grid({ children, cols = 'sm:grid-cols-2 lg:grid-cols-3' }) {
  return <div className={`grid gap-3 ${cols}`}>{children}</div>;
}
