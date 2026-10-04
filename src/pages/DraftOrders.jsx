import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

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

const CHANNELS = [
  ['all', 'All channels'],
  ['panel', 'Panel'],
  ['gmail', 'Mail'],
  ['whatsapp', 'WhatsApp'],
];

function senderOf(draft) {
  return draft.sender?.name || draft.sender?.phone || draft.sender?.email || 'Unknown sender';
}

function channelOf(draft) {
  return draft.channel === 'paste' ? 'panel' : draft.channel;
}

function preview(draft) {
  return draft.subject || String(draft.rawBody || '').replace(/\s+/g, ' ').slice(0, 80) || '—';
}

function toggleClass(active) {
  return `rounded-lg px-3 py-1.5 text-sm font-semibold ${active ? 'bg-accent text-white' : 'border border-line bg-white'}`;
}

export function DraftOrders() {
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlyPotential, setOnlyPotential] = useState(true);
  const [channel, setChannel] = useState('all');
  const [showDiscarded, setShowDiscarded] = useState(false);

  useEffect(() => {
    let alive = true;
    intakeApi
      .list()
      .then((rows) => {
        if (alive) setDrafts(rows || []);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const visible = drafts.filter((draft) => {
    if (onlyPotential && !draft.potentialOrder) return false;
    if (channel !== 'all' && channelOf(draft) !== channel) return false;
    if (!showDiscarded && draft.status === 'discarded') return false;
    return true;
  });
  const readyCount = drafts.filter((draft) => draft.potentialOrder && draft.status === 'needs_review').length;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Draft orders"
        subtitle="Orders from the panel, mail, and WhatsApp. AI reads only messages marked Potential order. Nothing here is a sales order yet."
        actions={
          <div className="flex gap-2">
            <Link to="/draft-orders/setup" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold">
              Setup
            </Link>
            <Link to="/draft-orders/new" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
              New draft
            </Link>
          </div>
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate">Loading drafts…</p> : null}
      {!loading && drafts.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOnlyPotential(true)} className={toggleClass(onlyPotential)}>
            Potential orders
          </button>
          <button type="button" onClick={() => setOnlyPotential(false)} className={toggleClass(!onlyPotential)}>
            All messages
          </button>
          <select value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold" aria-label="Channel">
            {CHANNELS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate">
            <input type="checkbox" checked={showDiscarded} onChange={(event) => setShowDiscarded(event.target.checked)} />
            Show discarded
          </label>
          <span className="text-sm text-slate">{readyCount} ready to check</span>
        </div>
      ) : null}
      {!loading && !drafts.length ? (
        <EmptyState title="No drafts yet" hint="Use New draft, or connect mail and WhatsApp in Setup." />
      ) : null}
      {!loading && drafts.length && !visible.length ? <p className="text-sm text-slate">Nothing matches these filters.</p> : null}
      {visible.length ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className="px-3 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">Subject or message</th>
                <th className="px-3 py-2 font-medium">Mark</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((draft) => (
                <tr key={draft.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <Link to={`/draft-orders/${draft.id}`} className="font-semibold text-accent hover:underline">
                      {draft.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{CHANNEL_LABEL[draft.channel] || draft.channel}</td>
                  <td className="px-3 py-2">{senderOf(draft)}</td>
                  <td className="max-w-xs truncate px-3 py-2">{preview(draft)}</td>
                  <td className="px-3 py-2">
                    {draft.potentialOrder ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-950">Potential order</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2">{STATUS_LABEL[draft.status] || draft.status}</td>
                  <td className="px-3 py-2 text-slate">{draft.receivedAt ? new Date(draft.receivedAt).toLocaleString() : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
