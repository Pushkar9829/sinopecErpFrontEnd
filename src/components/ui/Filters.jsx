const input = 'mt-1 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink';

export function FilterSelect({ label, value, onChange, options, className = '' }) {
  return (
    <label className={`text-xs font-semibold text-slate ${className}`}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${input} w-full`}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DateRangeFilter({ label = 'Dates', from, to, onChange, field, fieldOptions, onField }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {fieldOptions ? <FilterSelect label={label} value={field} onChange={onField} options={fieldOptions} /> : null}
      <label className="text-xs font-semibold text-slate">
        {fieldOptions ? 'From' : `${label} from`}
        <input type="date" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} className={input} />
      </label>
      <label className="text-xs font-semibold text-slate">
        To
        <input type="date" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} className={input} />
      </label>
    </div>
  );
}

export function ClearFilters({ count, onClear }) {
  if (!count) return null;
  return (
    <button type="button" onClick={onClear} className="self-end rounded-lg px-2 py-1.5 text-sm font-semibold text-accent hover:underline">
      Clear {count} filter{count > 1 ? 's' : ''}
    </button>
  );
}

// A row of filters that wraps on small screens; hidden when printing.
export function FilterBar({ children }) {
  return <div className="flex flex-wrap items-end gap-3 rounded-xl border border-line bg-white px-3 py-2.5 print:hidden">{children}</div>;
}
