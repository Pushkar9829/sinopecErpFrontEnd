import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { resolveMediaUrl } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';

const STATUS_LABEL = {
  stored: 'In mailbox',
  received: 'Queued for reading',
  reading: 'Reading',
  needs_review: 'Draft ready',
  reading_failed: 'Reading failed',
  discarded: 'Discarded',
};

function senderOf(draft) {
  return [draft.sender?.name, draft.sender?.phone, draft.sender?.email].filter(Boolean).join(' · ') || 'Unknown sender';
}

function sizeOf(line) {
  return [line.width, line.length].filter(Boolean).join(' × ');
}

function FieldLine({ label, value }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  );
}

export function DraftOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    let alive = true;
    intakeApi
      .get(id)
      .then((row) => {
        if (alive) setDraft(row);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  async function reread() {
    setBusy('reread');
    setError('');
    try {
      setDraft(await intakeApi.reread(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  async function discard() {
    setBusy('discard');
    setError('');
    try {
      await intakeApi.discard(id);
      navigate('/draft-orders');
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  if (!draft && !error) return <p className="text-sm text-slate">Loading draft…</p>;

  const proposal = draft?.proposal || {};
  const customer = proposal.customer || {};
  const lines = Array.isArray(proposal.lines) ? proposal.lines : [];

  return (
    <div className="space-y-4">
      <PageHeader
        title={draft?.number || 'Draft'}
        subtitle={draft ? `${draft.channel} · ${senderOf(draft)} · ${STATUS_LABEL[draft.status] || draft.status}` : ''}
        backTo="/draft-orders"
        backLabel="Draft orders"
        actions={
          draft ? (
            <div className="flex gap-2">
              <button type="button" onClick={reread} disabled={Boolean(busy)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-60">
                {busy === 'reread' ? 'Reading…' : 'Read again'}
              </button>
              <button type="button" onClick={discard} disabled={Boolean(busy) || draft.status === 'discarded'} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 disabled:opacity-60">
                Discard
              </button>
            </div>
          ) : null
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {draft?.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{draft.error}</p> : null}
      {draft?.warnings?.length ? (
        <ul className="list-disc space-y-1 rounded-lg bg-amber-50 px-6 py-3 text-sm text-amber-950">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {draft ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-line bg-white p-4">
            <h2 className="text-lg font-semibold">Original</h2>
            {draft.subject ? <p className="text-sm font-semibold">{draft.subject}</p> : null}
            {draft.potentialOrder ? (
              <p className="text-sm text-amber-950">
                Potential order{draft.matchedKeywords?.length ? ` · ${draft.matchedKeywords.join(', ')}` : ''}
              </p>
            ) : null}
            {draft.channel === 'gmail' && draft.status === 'stored' ? (
              <p className="text-sm text-slate">No order keywords, so this mail was not sent to the reader.</p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm">{draft.rawBody || 'No text was sent with this message.'}</p>
            {draft.files?.length ? (
              <ul className="space-y-1 text-sm">
                {draft.files.map((file) => (
                  <li key={file.key || file.url}>
                    <a className="font-semibold text-accent hover:underline" href={resolveMediaUrl(file.url)} target="_blank" rel="noreferrer">
                      {file.originalName || 'File'}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <section className="space-y-3 rounded-xl border border-line bg-white p-4">
            <h2 className="text-lg font-semibold">Reading</h2>
            <dl className="grid gap-2 sm:grid-cols-2">
              <FieldLine label="Name" value={customer.name} />
              <FieldLine label="Company" value={customer.companyName} />
              <FieldLine label="Mobile" value={customer.mobile} />
              <FieldLine label="Email" value={customer.email} />
              <FieldLine label="GST" value={customer.gstNumber} />
              <FieldLine label="Delivery" value={proposal.deliveryDate} />
            </dl>
            <p className="text-xs text-slate">
              Customer certainty: {proposal.certainty?.customer || 'missing'} · Lines certainty: {proposal.certainty?.lines || 'missing'}
            </p>
            {lines.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-slate">
                    <tr>
                      <th className="py-1 pr-2 font-medium">Product</th>
                      <th className="py-1 pr-2 font-medium">Qty</th>
                      <th className="py-1 pr-2 font-medium">Unit</th>
                      <th className="py-1 pr-2 font-medium">Size</th>
                      <th className="py-1 font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={`${line.product}-${index}`} className="border-t border-line">
                        <td className="py-1 pr-2">
                          <div>{line.product || '—'}</div>
                          {line.material || line.notes ? (
                            <div className="text-xs text-slate">{[line.material, line.notes].filter(Boolean).join(' · ')}</div>
                          ) : null}
                        </td>
                        <td className="py-1 pr-2">{line.quantity ?? '—'}</td>
                        <td className="py-1 pr-2">{line.unit || '—'}</td>
                        <td className="py-1 pr-2">{sizeOf(line) || '—'}</td>
                        <td className="py-1">{line.rate ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate">No lines were read.</p>
            )}
            {proposal.notes ? <p className="text-sm">{proposal.notes}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
