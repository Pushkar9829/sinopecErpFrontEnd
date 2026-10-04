import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { EmptyState } from '../components/ui/EmptyState';
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
  return draft.sender?.name || draft.sender?.phone || draft.sender?.email || 'Unknown sender';
}

export function DraftOrders() {
  const [drafts, setDrafts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [onlyPotential, setOnlyPotential] = useState(false);

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

  const visible = onlyPotential ? drafts.filter((draft) => draft.potentialOrder) : drafts;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Draft orders"
        subtitle="Every mail is listed. The reader runs only on mail marked Potential order."
        actions={
          <Link to="/draft-orders/setup" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
            Setup and test
          </Link>
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate">Loading drafts…</p> : null}
      {!loading && drafts.length ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setOnlyPotential(false)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${onlyPotential ? 'border border-line bg-white' : 'bg-accent text-white'}`}>
            All mail
          </button>
          <button type="button" onClick={() => setOnlyPotential(true)} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${onlyPotential ? 'bg-accent text-white' : 'border border-line bg-white'}`}>
            Potential orders
          </button>
        </div>
      ) : null}
      {!loading && !drafts.length ? (
        <EmptyState title="No mail yet" hint="Mail from the connected mailbox appears here. A paste from Setup and test does too." />
      ) : null}
      {!loading && drafts.length && !visible.length ? (
        <p className="text-sm text-slate">No mail is marked Potential order yet.</p>
      ) : null}
      {visible.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className="px-3 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">Subject</th>
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
                  <td className="px-3 py-2 capitalize">{draft.channel}</td>
                  <td className="px-3 py-2">{senderOf(draft)}</td>
                  <td className="px-3 py-2">{draft.subject || '—'}</td>
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
