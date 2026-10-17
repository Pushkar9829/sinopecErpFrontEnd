import { Link } from 'react-router-dom';
import { useIntakeSummary } from '../../hooks/useIntakeSummary';
import { panelTones, valueTones } from '../ui/badgeTones';
import { timeAgo } from '../../lib/intake';

// Dashboard: draft orders waiting for review, and how long the oldest has waited.
export function DraftOrdersCard() {
  const summary = useIntakeSummary();
  if (!summary) return null;
  const cards = [
    { label: 'To review', value: summary.needsReview, tone: summary.needsReview ? 'warning' : 'muted', to: '/draft-orders' },
    { label: 'Past review time', value: summary.overdue, tone: summary.overdue ? 'danger' : 'muted', to: '/draft-orders' },
    { label: 'Being read', value: summary.waiting, tone: 'info', to: '/draft-orders?status=waiting' },
    { label: 'Reading failed', value: summary.failed, tone: summary.failed ? 'danger' : 'muted', to: '/draft-orders?status=failed' },
  ];
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Draft orders</h2>
        {summary.oldestWaitingSince ? (
          <p className="text-sm font-normal text-slate">
            Oldest waiting: {summary.oldestNumber}, {timeAgo(summary.oldestWaitingSince)}
          </p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className={`rounded-xl border px-4 py-3 transition hover:brightness-95 ${panelTones[card.tone]}`}>
            <p className="text-sm font-semibold text-ink">{card.label}</p>
            <p className={`mt-1 text-xl font-semibold ${valueTones[card.tone]}`}>{card.value ?? 0}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
