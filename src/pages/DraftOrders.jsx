import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';

const STATUS_LABEL = {
  received: 'Waiting to read',
  reading: 'Reading',
  needs_review: 'Needs review',
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Draft orders"
        subtitle="Messages from WhatsApp and Gmail. Nothing here is a sales order yet."
        actions={
          <Link to="/draft-orders/setup" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
            Setup and test
          </Link>
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="text-sm text-slate">Loading drafts…</p> : null}
      {!loading && !drafts.length ? (
        <EmptyState title="No drafts yet" hint="Send a WhatsApp message, or paste one from Setup and test." />
      ) : null}
      {drafts.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className="px-3 py-2 font-medium">Number</th>
                <th className="px-3 py-2 font-medium">Channel</th>
                <th className="px-3 py-2 font-medium">From</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Received</th>
              </tr>
            </thead>
            <tbody>
              {drafts.map((draft) => (
                <tr key={draft.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <Link to={`/draft-orders/${draft.id}`} className="font-semibold text-accent hover:underline">
                      {draft.number}
                    </Link>
                  </td>
                  <td className="px-3 py-2 capitalize">{draft.channel}</td>
                  <td className="px-3 py-2">{senderOf(draft)}</td>
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
