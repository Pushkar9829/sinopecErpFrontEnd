import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { resolveMediaUrl } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { DraftOrderProposalEditor, toEditable, toPayload } from './DraftOrderProposalEditor';

const STATUS_LABEL = {
  stored: 'Listed only',
  received: 'Queued for reading',
  reading: 'Reading',
  needs_review: 'Draft ready',
  reading_failed: 'Reading failed',
  discarded: 'Discarded',
};

const CHANNEL_LABEL = {
  panel: 'Panel',
  paste: 'Panel',
  gmail: 'Mail',
  whatsapp: 'WhatsApp',
};

function senderOf(draft) {
  return [draft.sender?.name, draft.sender?.phone, draft.sender?.email].filter(Boolean).join(' · ') || 'Unknown sender';
}

const button = 'rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-60';

export function DraftOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');

  function load(row) {
    setDraft(row);
    setForm(toEditable(row?.proposal));
    setDirty(false);
  }

  useEffect(() => {
    let alive = true;
    intakeApi
      .get(id)
      .then((row) => {
        if (alive) load(row);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  async function run(name, action, message) {
    setBusy(name);
    setError('');
    setNotice('');
    try {
      const row = await action();
      load(row);
      if (message) setNotice(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  function edit(next) {
    setForm(next);
    setDirty(true);
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

  const proposal = draft?.proposal || null;
  const discarded = draft?.status === 'discarded';
  const reading = draft?.status === 'reading' || draft?.status === 'received';
  const confirm = (text) => !dirty || window.confirm(text);

  return (
    <div className="space-y-4">
      <PageHeader
        title={draft?.number || 'Draft'}
        subtitle={draft ? `${CHANNEL_LABEL[draft.channel] || draft.channel} · ${senderOf(draft)} · ${STATUS_LABEL[draft.status] || draft.status}` : ''}
        backTo="/draft-orders"
        backLabel="Draft orders"
        actions={
          draft ? (
            <div className="flex flex-wrap gap-2">
              {draft.potentialOrder ? (
                <button
                  type="button"
                  disabled={Boolean(busy) || discarded}
                  className={button}
                  onClick={() => confirm('Unsaved changes will be lost. Continue?') && run('not', () => intakeApi.markNotOrder(id), 'Marked as not an order.')}
                >
                  {busy === 'not' ? 'Saving…' : 'Not an order'}
                </button>
              ) : (
                <button type="button" disabled={Boolean(busy) || discarded} className={button} onClick={() => run('potential', () => intakeApi.markPotential(id), 'Marked Potential order and read by AI.')}>
                  {busy === 'potential' ? 'Reading…' : 'Mark potential order'}
                </button>
              )}
              {draft.rawBody || draft.files?.length ? (
                <button
                  type="button"
                  disabled={Boolean(busy) || discarded}
                  className={button}
                  onClick={() => confirm('Reading again replaces your unsaved changes. Continue?') && run('reread', () => intakeApi.reread(id), 'Read again.')}
                >
                  {busy === 'reread' ? 'Reading…' : 'Read again'}
                </button>
              ) : null}
              <button type="button" onClick={discard} disabled={Boolean(busy) || discarded} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 disabled:opacity-60">
                Discard
              </button>
            </div>
          ) : null
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {draft?.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{draft.error}</p> : null}
      {draft?.warnings?.length ? (
        <ul className="list-disc space-y-1 rounded-lg bg-amber-50 px-6 py-3 text-sm text-amber-950">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      {draft ? (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="space-y-3 rounded-xl border border-line bg-white p-4">
            <h2 className="text-lg font-semibold">Original</h2>
            {draft.subject ? <p className="text-sm font-semibold">{draft.subject}</p> : null}
            {draft.potentialOrder ? (
              <p className="text-sm text-amber-950">
                Potential order{draft.matchedKeywords?.length ? ` · matched ${draft.matchedKeywords.join(', ')}` : ''}
              </p>
            ) : (
              <p className="text-sm text-slate">No order keywords were found, so AI did not read this message.</p>
            )}
            <p className="whitespace-pre-wrap text-sm">
              {draft.rawBody || (draft.channel === 'panel' ? 'Typed on the panel.' : 'No text was sent with this message.')}
            </p>
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
            <dl className="space-y-1 border-t border-line pt-3 text-xs text-slate">
              <div>Received {draft.receivedAt ? new Date(draft.receivedAt).toLocaleString() : '—'}</div>
              {draft.createdBy ? <div>Entered by {draft.createdBy}</div> : null}
              {draft.editedAt ? (
                <div>
                  Last corrected {draft.editedBy ? `by ${draft.editedBy} ` : ''}on {new Date(draft.editedAt).toLocaleString()}
                </div>
              ) : null}
            </dl>
          </section>

          <section className="space-y-3 rounded-xl border border-line bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Order details</h2>
              {proposal ? (
                <p className="text-xs text-slate">
                  AI certainty · customer {proposal.certainty?.customer || 'missing'} · lines {proposal.certainty?.lines || 'missing'}
                </p>
              ) : null}
            </div>
            {!proposal && !draft.potentialOrder ? (
              <p className="text-sm text-slate">Mark this as a potential order to let AI fill the fields, or type them below and save.</p>
            ) : null}
            {reading ? <p className="text-sm text-slate">AI is reading this message. Refresh in a few seconds.</p> : null}
            {form ? <DraftOrderProposalEditor value={form} onChange={edit} disabled={discarded || reading || Boolean(busy)} /> : null}
            {!discarded ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!dirty || Boolean(busy) || reading}
                  onClick={() => run('save', () => intakeApi.saveProposal(id, toPayload(form)), 'Saved.')}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60"
                >
                  {busy === 'save' ? 'Saving…' : 'Save changes'}
                </button>
                {dirty ? (
                  <button type="button" onClick={() => load(draft)} className="text-sm font-semibold text-slate">
                    Undo changes
                  </button>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
