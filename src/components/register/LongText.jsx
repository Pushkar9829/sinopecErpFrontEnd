import { useState } from 'react';
import { Modal } from '../ui/Modal';

const LIMIT = 30;

export function LongText({ text, title = 'Description' }) {
  const [open, setOpen] = useState(false);
  const value = String(text || '').trim();
  if (!value) return '—';
  if (value.length <= LIMIT && !value.includes('\n')) return value;

  return (
    <span className="inline-flex max-w-[16rem] items-center gap-1.5">
      <span className="min-w-0 truncate">{value.split('\n')[0]}</span>
      <button
        type="button"
        title={`Show full ${title.toLowerCase()}`}
        aria-label={`Show full ${title.toLowerCase()}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-400 bg-white text-[11px] font-semibold text-stone-800 hover:bg-amber-50"
      >
        i
      </button>
      <Modal open={open} title={title} onClose={() => setOpen(false)}>
        <p className="whitespace-pre-wrap break-words text-sm text-ink">{value}</p>
      </Modal>
    </span>
  );
}
