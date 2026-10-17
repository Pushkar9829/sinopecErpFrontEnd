import { useEffect, useState } from 'react';
import { intakeApi } from '../../api/intake.api';
import { saveBlob } from '../../api/client';

const IMAGE = /^image\/(png|jpe?g|gif|webp)$/i;

// A customer's file: images show as a thumbnail (fetched with the session,
// never a public link); every file can be opened or downloaded.
function FileChip({ draftId, file }) {
  const [thumb, setThumb] = useState('');
  const [error, setError] = useState('');
  const isImage = IMAGE.test(file.mimeType || '');

  useEffect(() => {
    if (!isImage) return undefined;
    let url = '';
    let alive = true;
    intakeApi
      .file(draftId, file.id)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setThumb(url);
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [draftId, file.id, isImage]);

  async function open() {
    setError('');
    try {
      const blob = await intakeApi.file(draftId, file.id);
      const url = URL.createObjectURL(blob);
      const viewable = isImage || /pdf/i.test(file.mimeType || '');
      if (viewable && window.open(url, '_blank', 'noopener')) {
        setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
      } else {
        URL.revokeObjectURL(url);
        saveBlob(blob, file.originalName);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="w-36 rounded-lg border border-line bg-paper p-2 text-xs">
      <button type="button" onClick={open} className="block w-full text-left" title={`Open ${file.originalName}`}>
        {thumb ? (
          <img src={thumb} alt={file.originalName} className="mb-1 h-24 w-full rounded object-cover" />
        ) : (
          <div className="mb-1 flex h-24 w-full items-center justify-center rounded bg-white text-sm font-semibold text-slate">
            {(file.originalName || '').split('.').pop()?.toUpperCase() || 'FILE'}
          </div>
        )}
        <span className="block truncate font-semibold text-accent">{file.originalName || 'File'}</span>
      </button>
      {error ? <span className="text-rose-700">{error}</span> : null}
    </div>
  );
}

export function IntakeFiles({ draftId, files }) {
  if (!files?.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((file) => (
        <FileChip key={file.id} draftId={draftId} file={file} />
      ))}
    </div>
  );
}
