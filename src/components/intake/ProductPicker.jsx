import { useEffect, useRef, useState } from 'react';
import { intakeApi } from '../../api/intake.api';
import { inputClass } from '../ui/FormField';

const LIMIT = 30;

function details(spec) {
  return [
    spec.productCode,
    spec.material,
    spec.width && spec.length ? `${spec.width}×${spec.length}` : '',
    spec.source === 'customer' && spec.rate ? `₹${spec.rate}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function Group({ title, group, onPick }) {
  if (!group) return null;
  return (
    <div>
      <p className="sticky top-0 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate">
        {title} {group.total > group.items.length ? `(${group.items.length} of ${group.total}, type to narrow)` : `(${group.total})`}
      </p>
      {group.items.length ? (
        group.items.map((spec) => (
          <button
            key={`${spec.source}:${spec.id}`}
            type="button"
            onClick={() => onPick(spec)}
            className="block w-full px-3 py-1.5 text-left text-sm hover:bg-accent/10"
          >
            <span className="font-semibold">{spec.label}</span>
            {spec.strong ? <span className="ml-2 text-xs text-emerald-700">good match</span> : null}
            {details(spec) ? <span className="block text-xs text-slate">{details(spec)}</span> : null}
          </button>
        ))
      ) : (
        <p className="px-3 py-1.5 text-xs text-slate">None found.</p>
      )}
    </div>
  );
}

// Searchable list of the customer's products and the saved products, best
// matches for the draft line first. onPick(spec), or onPick(null) for "New product".
export function ProductPicker({ draftId, lineIndex, selectedLabel, disabled, allowNew = true, buttonLabel, buttonClass, onPick }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    function close(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    const timer = setTimeout(
      () =>
        intakeApi
          .products(draftId, { q: search.trim(), line: lineIndex, limit: LIMIT })
          .then((result) => {
            if (!alive) return;
            setData(result);
            setError('');
          })
          .catch((err) => alive && setError(err.message)),
      search ? 250 : 0
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, search, draftId, lineIndex]);

  function pick(spec) {
    setOpen(false);
    setSearch('');
    onPick(spec);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className={buttonClass || `${inputClass} mt-0 truncate px-2 py-1.5 text-left text-sm`}
      >
        {buttonLabel || selectedLabel || 'New product'}
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 w-full min-w-72 rounded-lg border border-line bg-white shadow-lg">
          <div className="p-2">
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
              placeholder="Search name, code, material…"
              className={`${inputClass} mt-0 px-2 py-1.5 text-sm`}
            />
          </div>
          <div className="max-h-72 overflow-y-auto pb-1">
            {allowNew ? (
              <button type="button" onClick={() => pick(null)} className="block w-full px-3 py-1.5 text-left text-sm font-semibold text-accent hover:bg-accent/10">
                New product (not saved yet)
              </button>
            ) : null}
            {error ? <p className="px-3 py-1.5 text-xs text-rose-700">{error}</p> : null}
            {!data && !error ? <p className="px-3 py-1.5 text-xs text-slate">Loading…</p> : null}
            {data ? (
              <>
                <Group title="This customer's products" group={data.customer} onPick={pick} />
                <Group title="Saved products" group={data.saved} onPick={pick} />
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
