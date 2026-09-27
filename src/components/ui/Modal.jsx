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
        className={`overflow-y-auto rounded-xl border border-line bg-card ${wide === 'fit' ? 'max-h-[85vh] w-full max-w-2xl p-3' : `max-h-[90vh] p-5 ${wide === 'xl' ? 'w-full max-w-5xl' : wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={`${wide === 'fit' ? 'mb-2' : 'mb-4'} flex items-start justify-between gap-3`}>
          <div className="min-w-0">{typeof title === 'string' ? <h2 className="text-lg font-semibold text-ink">{title}</h2> : title}</div>
          <button type="button" onClick={onClose} className="inline-flex shrink-0 items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
