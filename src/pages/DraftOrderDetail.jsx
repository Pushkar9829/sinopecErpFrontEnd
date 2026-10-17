import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { ConvertStep } from '../components/intake/ConvertStep';
import { CustomerStep } from '../components/intake/CustomerStep';
import { IntakeFiles } from '../components/intake/IntakeFiles';
import { Badge } from '../components/ui/Badge';
import { confirmAction } from '../components/ui/confirm';
import { PageHeader } from '../components/ui/PageHeader';
import { useLeaveGuard } from '../hooks/useLeaveGuard';
import { usePermission } from '../hooks/usePermission';
import { CHANNEL_LABEL, intakeStatus, senderOf } from '../lib/intake';
import { toEditable, toPayload } from '../lib/intakeProposal';
import { DraftOrderProposalEditor } from './DraftOrderProposalEditor';

const button = 'rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-60';
const POLL_MS = 3000;
const ACTION_LABELS = {
  received: 'Received',
  created: 'Created',
  edited: 'Edited',
  reread: 'Asked to read again',
  used_reading: 'Used an earlier reading',
  not_order: 'Marked not an order',
  discarded: 'Discarded',
  restored: 'Restored',
  customer_confirmed: 'Customer confirmed',
  customer_cleared: 'Customer changed',
  converted: 'Converted',
};

function when(value) {
  return value ? new Date(value).toLocaleString() : '';
}

function Step({ number, title, done, children, aside }) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-white ${done ? 'bg-emerald-600' : 'bg-ink'}`}>{done ? '✓' : number}</span>
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function DraftOrderDetail() {
  const { id } = useParams();
  const { can } = usePermission();
  const canEdit = can('intake:update');
  const canConvert = canEdit && can('sales:create') && can('sales:update');
  const [draft, setDraft] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  useLeaveGuard(dirty);

  const load = useCallback((row, { keepForm = false } = {}) => {
    setDraft(row);
    if (!keepForm) {
      setForm(toEditable(row?.proposal));
      setDirty(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    intakeApi
      .get(id)
      .then((row) => alive && load(row))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [id, load]);

  // While the reader works, check back every few seconds. Unsaved edits are kept.
  const working = Boolean(draft && (draft.readPending || ['received', 'reading'].includes(draft.status)));
  useEffect(() => {
    if (!working) return undefined;
    const timer = setInterval(() => {
      intakeApi
        .get(id)
        .then((row) => load(row, { keepForm: dirty }))
        .catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [working, id, dirty, load]);

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

  async function guardDirty(text) {
    if (!dirty) return true;
    return confirmAction({ title: 'Unsaved changes', message: text, confirmLabel: 'Continue', danger: true });
  }

  async function discard() {
    const reason = await confirmAction({
      title: `Discard ${draft.number}`,
      message: 'The draft stays in the Discarded tab and can be restored.',
      withReason: true,
      confirmLabel: 'Discard',
      danger: true,
    });
    if (reason === null) return;
    await run('discard', () => intakeApi.discard(id, reason, draft.version), 'Discarded.');
  }

  async function notOrder() {
    if (!(await guardDirty('Your unsaved changes will be lost.'))) return;
    await run('not', () => intakeApi.markNotOrder(id, draft.version), 'Marked as not an order.');
  }

  async function reread() {
    if (!(await guardDirty('Reading again does not replace your saved edits, but unsaved changes are lost.'))) return;
    await run('reread', () => intakeApi.reread(id), 'Reading again…');
  }

  if (!draft && !error) return <p className="text-sm text-slate">Loading draft…</p>;
  if (!draft) return <p className="text-sm text-red-700">{error}</p>;

  const state = intakeStatus(draft.status);
  const closed = ['converted', 'discarded'].includes(draft.status);
  const locked = closed || !canEdit;
  const proposal = draft.proposal;
  const filesById = new Map((draft.files || []).map((file) => [file.id, file]));
  const latestReading = (draft.readings || []).at(-1);

  return (
    <div className="space-y-4">
      <PageHeader
        title={draft.number}
        subtitle={
          <>
            <span>{CHANNEL_LABEL[draft.channel] || draft.channel}</span>
            <span>·</span>
            <span>{senderOf(draft)}</span>
            <Badge tone={state.tone}>{state.label}</Badge>
            {working ? <Badge tone="info">Reading…</Badge> : null}
          </>
        }
        backTo="/draft-orders"
        backLabel="Draft orders"
        actions={
          canEdit ? (
            <div className="flex flex-wrap gap-2">
              {draft.status === 'discarded' ? (
                <button type="button" disabled={Boolean(busy)} className={button} onClick={() => run('restore', () => intakeApi.restore(id), 'Restored.')}>
                  Restore
                </button>
              ) : null}
              {!closed ? (
                <>
                  <button type="button" disabled={Boolean(busy) || working} className={button} onClick={reread}>
                    {draft.potentialOrder ? 'Read again' : 'This is an order — read it'}
                  </button>
                  {draft.potentialOrder ? (
                    <button type="button" disabled={Boolean(busy)} className={button} onClick={notOrder}>
                      Not an order
                    </button>
                  ) : null}
                  <button type="button" onClick={discard} disabled={Boolean(busy)} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800 disabled:opacity-60">
                    Discard
                  </button>
                </>
              ) : null}
            </div>
          ) : null
        }
      />

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}
      {draft.status === 'converted' ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Converted to draft sales order{' '}
          <Link to={`/sales-orders/${draft.salesOrder}`} className="font-semibold underline">
            {draft.salesOrderNumber}
          </Link>
          .
        </p>
      ) : null}
      {draft.status === 'discarded' ? <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm">Discarded: {draft.discardReason}</p> : null}
      {draft.error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{draft.error}</p> : null}
      {draft.bodyRemovedAt ? (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm">The message text and files were removed on {new Date(draft.bodyRemovedAt).toLocaleDateString()} (not an order).</p>
      ) : null}
      {draft.newReadingAvailable && !closed ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span>A new message came in and was read. Your edits are kept until you choose the new reading.</span>
          {canEdit && latestReading?.proposal ? (
            <button type="button" disabled={Boolean(busy)} className={button} onClick={() => run('use', () => intakeApi.useReading(id, latestReading.id, draft.version), 'Using the new reading.')}>
              Use the new reading
            </button>
          ) : null}
        </div>
      ) : null}
      {draft.warnings?.length ? (
        <ul className="list-disc space-y-1 rounded-lg bg-amber-50 px-6 py-3 text-sm text-amber-950">
          {draft.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border border-line bg-white p-4">
            <h2 className="text-lg font-semibold">Conversation</h2>
            {draft.subject ? <p className="text-sm font-semibold">{draft.subject}</p> : null}
            {draft.matchedKeywords?.length ? <p className="text-xs text-slate">Order words found: {draft.matchedKeywords.join(', ')}</p> : null}
            <ol className="space-y-3">
              {(draft.messages || []).map((message) => (
                <li key={message.id} className="rounded-lg border border-line p-3">
                  <div className="mb-1 flex flex-wrap justify-between gap-2 text-xs text-slate">
                    <span className="font-semibold text-ink">{message.fromName || message.from || 'Panel'}</span>
                    <span>{when(message.receivedAt)}</span>
                  </div>
                  {message.automated ? <Badge tone="muted">Automated mail</Badge> : null}
                  <p className="whitespace-pre-wrap break-words text-sm">{message.body || (message.fileIds?.length ? '' : '(no text)')}</p>
                  <div className="mt-2">
                    <IntakeFiles draftId={draft.id} files={(message.fileIds || []).map((fileId) => filesById.get(fileId)).filter(Boolean)} />
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {draft.replies?.length ? (
            <section className="space-y-2 rounded-xl border border-line bg-white p-4 text-sm">
              <h2 className="text-lg font-semibold">Automatic replies</h2>
              <ul className="space-y-1">
                {draft.replies.map((reply, index) => (
                  <li key={index} className="flex flex-wrap gap-2">
                    <Badge tone={reply.status === 'sent' ? 'success' : reply.status === 'failed' ? 'danger' : 'muted'}>{reply.status}</Badge>
                    <span>{when(reply.at)}</span>
                    <span className="text-slate">{reply.to}</span>
                    {reply.reason ? <span className="text-slate">— {reply.reason}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <details className="rounded-xl border border-line bg-white p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Readings and history</summary>
            <ul className="mt-3 space-y-2">
              {(draft.readings || [])
                .slice()
                .reverse()
                .map((reading) => (
                  <li key={reading.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                    <span>
                      {when(reading.at)} · {reading.error ? <span className="text-rose-700">{reading.error}</span> : `${reading.provider} ${reading.model}`}
                      {reading.applied ? ' · in use' : ''}
                    </span>
                    {canEdit && !closed && reading.proposal && !reading.applied ? (
                      <button type="button" disabled={Boolean(busy)} className="text-xs font-semibold text-accent" onClick={() => run('use', () => intakeApi.useReading(id, reading.id, draft.version), 'Using that reading.')}>
                        Use this reading
                      </button>
                    ) : null}
                  </li>
                ))}
            </ul>
            <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs text-slate">
              {(draft.history || []).map((entry, index) => (
                <li key={index}>
                  {when(entry.at)} · {ACTION_LABELS[entry.action] || entry.action} · {entry.byName}
                  {entry.note ? ` — ${entry.note}` : ''}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <div className="space-y-4">
          <Step number={1} title="Customer" done={Boolean(draft.customer)}>
            <CustomerStep draft={draft} proposal={proposal} disabled={locked || dirty} onDone={(row) => load(row, { keepForm: dirty })} onError={setError} />
            {dirty && !draft.customer ? <p className="text-xs text-slate">Save your changes first.</p> : null}
          </Step>

          <Step
            number={2}
            title="Order details"
            done={Boolean(proposal?.lines?.length) && !dirty}
            aside={proposal ? <p className="text-xs text-slate">Reader certainty · customer {proposal.certainty?.customer || 'missing'} · lines {proposal.certainty?.lines || 'missing'}</p> : null}
          >
            {!proposal && !working ? <p className="text-sm text-slate">Nothing was read yet. Type the order below, or use “Read again”.</p> : null}
            {form ? <DraftOrderProposalEditor value={form} onChange={(next) => {
                  setForm(next);
                  setDirty(true);
                }} disabled={locked || Boolean(busy)} /> : null}
            {!locked ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!dirty || Boolean(busy)}
                  onClick={() => run('save', () => intakeApi.saveProposal(id, toPayload(form), draft.version), 'Saved.')}
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
          </Step>

          {canConvert && !closed ? (
            <Step number={3} title="Create the sales order" done={false}>
              {!draft.customer ? (
                <p className="text-sm text-slate">Confirm the customer first.</p>
              ) : dirty ? (
                <p className="text-sm text-slate">Save your changes first.</p>
              ) : (
                <ConvertStep draft={draft} disabled={Boolean(busy) || working} onError={setError} />
              )}
            </Step>
          ) : null}
        </div>
      </div>
    </div>
  );
}
