import { useEffect, useMemo, useRef, useState } from 'react';

export function SearchMultiSelect({ options, value, onChange, placeholder = 'Select', searchPlaceholder = 'Search', disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const selected = useMemo(
    () => options.filter((option) => value.includes(option.id)),
    [options, value]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || String(option.hint || '').toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    function handleClick(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(id) {
    const next = value.includes(id) ? value.filter((item) => item !== id) : [...value, id];
    onChange(next);
  }

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map((item) => item.label).join(', ')
        : `${selected[0].label} +${selected.length - 1}`;

  return (
    <div ref={rootRef} className="relative min-w-44" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="w-full truncate rounded-md border border-line bg-white px-2 py-1.5 text-left text-sm disabled:bg-paper"
      >
        {summary}
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-64 rounded-lg border border-line bg-card shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            className="w-full border-b border-line px-3 py-2 text-sm outline-none"
          />
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-steel">No matches</p>
            ) : (
              filtered.map((option) => (
                <label key={option.id} className="flex cursor-pointer items-start gap-2 px-3 py-1.5 text-sm hover:bg-paper">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={value.includes(option.id)}
                    onChange={() => toggle(option.id)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block font-medium">{option.label}</span>
                    {option.hint ? <span className="block text-xs text-steel">{option.hint}</span> : null}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
