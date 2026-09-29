import { useEffect, useState } from 'react';
import { resolveMediaUrl } from '../../api/client';

export function imageSrc(image) {
  return resolveMediaUrl(image?.url || image?.dataUrl || '');
}

export function ImageLightbox({ images, index, onClose, onIndex }) {
  const image = images[index];
  const src = image ? imageSrc(image) : '';

  useEffect(() => {
    if (!image) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') {
        event.stopImmediatePropagation();
        onClose();
      }
      if (event.key === 'ArrowRight' && index < images.length - 1) onIndex(index + 1);
      if (event.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
    }
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [image, images.length, index, onClose, onIndex]);

  if (!image || !src) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={image.originalName || 'Image preview'}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-line bg-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p className="min-w-0 truncate text-sm font-semibold text-ink">{image.originalName || 'Image'}</p>
          <div className="flex shrink-0 items-center gap-2">
            {images.length > 1 ? (
              <span className="text-sm text-slate">
                {index + 1} / {images.length}
              </span>
            ) : null}
            <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
              Close
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 items-center justify-center bg-stone-950/90 p-3">
          <img src={src} alt={image.originalName || 'Preview'} className="max-h-[70vh] max-w-full object-contain" />
        </div>
        {images.length > 1 ? (
          <div className="flex justify-between gap-2 border-t border-line px-4 py-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onIndex(index - 1)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={index >= images.length - 1}
              onClick={() => onIndex(index + 1)}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ImageGallery({ images, canEdit = false, busy = false, onUpload, onRemove, hint }) {
  const [preview, setPreview] = useState(-1);
  const list = (images || []).filter((image) => imageSrc(image));

  return (
    <div className="space-y-3">
      {canEdit ? (
        <div>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={(event) => {
              const files = [...(event.target.files || [])];
              event.target.value = '';
              if (files.length) onUpload?.(files);
            }}
            className="block w-full text-sm text-slate file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-1.5"
          />
          <p className="mt-1 text-sm font-normal text-slate">{hint || 'Choose one or more images. PNG or JPG, up to 15 MB each.'}</p>
          {busy ? <p className="mt-1 text-sm font-semibold text-ink">Uploading…</p> : null}
        </div>
      ) : null}

      {list.length ? (
        <ul className="flex flex-wrap gap-3">
          {list.map((image, index) => (
            <li key={`${image.key || image.url || image.originalName}-${index}`} className="w-32 space-y-1.5">
              <button type="button" onClick={() => setPreview(index)} className="block overflow-hidden rounded-lg border border-line bg-white">
                <img src={imageSrc(image)} alt={image.originalName || 'Product'} className="h-28 w-32 object-cover" />
              </button>
              <p className="truncate text-sm text-slate">{image.originalName || 'Image'}</p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreview(index)}
                  className="rounded-lg border border-line bg-white px-2 py-1 text-xs font-semibold text-ink hover:bg-paper"
                >
                  Preview
                </button>
                {canEdit ? (
                  <button
                    type="button"
                    onClick={() => onRemove?.(index)}
                    className="rounded-lg border border-rose-300 bg-white px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : canEdit ? null : (
        <p className="text-sm text-slate">No images.</p>
      )}

      {preview >= 0 ? <ImageLightbox images={list} index={preview} onClose={() => setPreview(-1)} onIndex={setPreview} /> : null}
    </div>
  );
}
