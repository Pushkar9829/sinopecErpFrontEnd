import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';
import { inputClass } from './FormField';
import { setConfirmHandler } from './confirm';

export function ConfirmHost() {
  const [request, setRequest] = useState(null);
  const [reason, setReason] = useState('');
  const pending = useRef(null);

  useEffect(() => {
    setConfirmHandler((next) => {
      // Only one dialog at a time: answer the one being replaced as "cancel"
      // so its caller's await doesn't hang forever.
      const previous = pending.current;
      if (previous) previous.resolve(previous.withReason ? null : false);
      pending.current = next;
      setReason('');
      setRequest(next);
    });
    return () => {
      setConfirmHandler(null);
    };
  }, []);

  function finish(ok) {
    if (!request) return;
    const { resolve, withReason } = request;
    pending.current = null;
    setRequest(null);
    if (withReason) resolve(ok ? reason.trim() : null);
    else resolve(ok);
  }

  return (
    <Modal open={Boolean(request)} title={request?.title || 'Please confirm'} onClose={() => finish(false)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          finish(true);
        }}
        className="space-y-4"
      >
        {request?.message ? <p className="whitespace-pre-wrap text-sm text-ink">{request.message}</p> : null}
        {request?.withReason ? (
          <label className="block text-sm font-semibold text-ink">
            {request.reasonLabel || (request.reasonRequired ? 'Reason' : 'Reason (optional)')}
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={inputClass} required={Boolean(request.reasonRequired)} autoFocus />
          </label>
        ) : null}
        <div className="flex justify-end gap-2">
          {request?.hideCancel ? null : (
            <button
              type="button"
              onClick={() => finish(false)}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-paper"
            >
              {request?.cancelLabel || 'Keep'}
            </button>
          )}
          <button
            type="submit"
            autoFocus={!request?.withReason}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${request?.danger ? 'bg-red-700 hover:bg-red-800' : 'bg-accent hover:bg-accent-dark'}`}
          >
            {request?.confirmLabel || 'Confirm'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
