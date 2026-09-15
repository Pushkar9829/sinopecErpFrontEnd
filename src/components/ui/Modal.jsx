import { useEffect } from 'react';

export function Modal({ open, title, onClose, children, wide = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={`max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-card p-5 ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">{typeof title === 'string' ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : title}</div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-lg border border-line px-2 py-1 text-sm hover:bg-paper">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
