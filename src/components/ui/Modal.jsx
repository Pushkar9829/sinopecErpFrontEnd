import { useEffect, useId, useRef } from 'react';

const openStack = [];

export function Modal({ open, title, onClose, children, wide = false }) {
  const id = useId();
  const pressedOnBackdrop = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    openStack.push(id);
    function onKey(event) {
      if (event.key !== 'Escape' || openStack[openStack.length - 1] !== id) return;
      event.stopPropagation();
      closeRef.current?.();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const at = openStack.lastIndexOf(id);
      if (at >= 0) openStack.splice(at, 1);
    };
  }, [open, id]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/40 ${wide === 'entry' ? 'p-2 sm:p-4' : 'p-4'}`}
      onMouseDown={(event) => {
        pressedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (pressedOnBackdrop.current && event.target === event.currentTarget) onClose();
        pressedOnBackdrop.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : 'Dialog'}
        className={`overflow-y-auto rounded-xl border border-line bg-card ${
          wide === 'fit'
            ? 'max-h-[85vh] w-full max-w-2xl p-3'
            : wide === 'entry'
              ? 'max-h-[96dvh] w-full max-w-4xl p-3 sm:p-5 lg:max-h-[92vh]'
              : `max-h-[90vh] p-5 ${wide === 'xl' ? 'w-full max-w-5xl' : wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`
        }`}
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
