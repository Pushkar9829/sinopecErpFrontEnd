import { useEffect, useState } from 'react';
import { fetchArtworkFile, registersApi } from '../../api/registers.api';
import { ImageGallery } from '../ui/ImageGallery';
import { Modal } from '../ui/Modal';

function Line({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="whitespace-pre-wrap break-words text-sm text-ink">{value}</p>
    </div>
  );
}

function FileRow({ orderId, file }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function open(download) {
    setBusy(true);
    setError('');
    try {
      const blob = await fetchArtworkFile(orderId, file.id);
      const url = URL.createObjectURL(blob);
      if (download) {
        const link = document.createElement('a');
        link.href = url;
        link.download = file.originalName || 'artwork';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
      <span className="min-w-0 truncate text-sm font-semibold text-ink">{file.originalName}</span>
      <span className="flex gap-3 text-sm">
        <button type="button" disabled={busy} onClick={() => open(false)} className="font-semibold text-ink hover:underline disabled:opacity-50">
          Open
        </button>
        <button type="button" disabled={busy} onClick={() => open(true)} className="font-semibold text-ink hover:underline disabled:opacity-50">
          Download
        </button>
      </span>
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </li>
  );
}

export function ArtworkButton({ orderId, itemId, label = 'View', className = '' }) {
  const [open, setOpen] = useState(false);
  // Each answer is tagged with the request it belongs to; anything for an
  // earlier order/item (or a closed viewer) is simply not shown.
  const requestKey = open && orderId && itemId ? `${orderId}:${itemId}` : '';
  const [result, setResult] = useState({ key: '', data: null, error: '' });
  const data = result.key === requestKey ? result.data : null;
  const error = result.key === requestKey ? result.error : '';

  useEffect(() => {
    if (!requestKey) return undefined;
    let alive = true;
    registersApi
      .artwork(orderId, itemId)
      .then((next) => alive && setResult({ key: requestKey, data: next, error: '' }))
      .catch((err) => alive && setResult({ key: requestKey, data: null, error: err.message }));
    return () => {
      alive = false;
    };
  }, [requestKey, orderId, itemId]);

  if (!orderId || !itemId) return null;
  const empty = data && !data.note && !data.design && !data.images.length && !data.files.length;

  return (
    <span className="contents" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex shrink-0 items-center rounded border border-stone-400 bg-white px-2 py-0.5 text-xs font-semibold text-stone-800 hover:bg-amber-50 ${className}`}
      >
        {label}
      </button>
      <Modal open={open} title="Artwork" onClose={() => setOpen(false)} wide>
        <div className="space-y-4">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {!data && !error ? <p className="text-sm text-slate">Loading…</p> : null}
          {data ? (
            <>
              <p className="text-sm font-semibold text-ink">
                {data.orderNumber} · {data.product}
                {data.productCode ? ` (${data.productCode})` : ''}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Line label="Printing note" value={data.note} />
                <Line label="Design" value={data.design} />
                <Line label="Colours" value={[data.colorCount, data.colors].filter(Boolean).join(' · ')} />
                <Line label="Impressions" value={data.impressions} />
              </div>
              {data.images.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Product images</p>
                  <ImageGallery images={data.images} />
                </div>
              ) : null}
              {data.files.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Artwork files</p>
                  <ul className="space-y-2">
                    {data.files.map((file) => (
                      <FileRow key={file.id} orderId={data.orderId} file={file} />
                    ))}
                  </ul>
                </div>
              ) : null}
              {empty ? <p className="text-sm text-slate">No artwork has been added to this order yet.</p> : null}
            </>
          ) : null}
        </div>
      </Modal>
    </span>
  );
}
