import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { inputClass } from './FormField';

let show = null;

export function confirmAction(options) {
  const settings = typeof options === 'string' ? { message: options } : options || {};
  if (!show) return Promise.resolve(settings.withReason ? null : false);
  return new Promise((resolve) => show({ ...settings, resolve }));
}

export function notify(message, title = 'Notice') {
  return confirmAction({ title, message, confirmLabel: 'OK', hideCancel: true });
}

export function ConfirmHost() {
  const [request, setRequest] = useState(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    show = (next) => {
      setReason('');
      setRequest(next);
    };
    return () => {
      show = null;
    };
  }, []);

  function finish(ok) {
    if (!request) return;
    const { resolve, withReason } = request;
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
            {request.reasonLabel || 'Reason (optional)'}
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={inputClass} autoFocus />
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
