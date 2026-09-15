export function EmptyState({ title, hint }) {
  return (
    <div className="px-4 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {hint ? <p className="mt-1 text-sm text-slate">{hint}</p> : null}
    </div>
  );
}
