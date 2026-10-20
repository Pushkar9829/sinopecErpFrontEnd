import { useEffect, useRef, useState } from 'react';

const FORMATS = [
  { id: 'xlsx', label: 'Excel (.xlsx)', hint: 'Opens in Excel with numbers and dates' },
  { id: 'csv', label: 'CSV', hint: 'Plain text, for other programs' },
  { id: 'pdf', label: 'PDF', hint: 'To print or send on WhatsApp' },
];

// "Download" button with a choice of format. `onExport(format)` may be async
// (e.g. it first fetches every page of a list); the button shows progress.
export function ExportMenu({ onExport, disabled = false, label = 'Download', formats = ['xlsx', 'csv', 'pdf'], className = '' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (e.type === 'keydown' ? e.key === 'Escape' : !box.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  async function run(format) {
    setOpen(false);
    setBusy(format);
    setError('');
    try {
      await onExport(format);
    } catch (err) {
      setError(err?.message || 'Download failed');
    } finally {
      setBusy('');
    }
  }

  return (
    <div ref={box} className={`relative inline-block print:hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || Boolean(busy)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50"
      >
        {busy ? 'Preparing…' : label}
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-line bg-white p-1 shadow-lg">
          {FORMATS.filter((f) => formats.includes(f.id)).map((f) => (
            <button key={f.id} type="button" role="menuitem" onClick={() => run(f.id)} className="block w-full rounded-md px-3 py-2 text-left hover:bg-paper">
              <span className="block text-sm font-semibold text-ink">{f.label}</span>
              <span className="block text-xs text-slate">{f.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="absolute right-0 mt-1 w-56 rounded bg-rose-50 px-2 py-1 text-xs text-rose-800">{error}</p> : null}
    </div>
  );
}
