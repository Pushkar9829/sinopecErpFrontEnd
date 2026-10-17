import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { intakeApi } from '../api/intake.api';
import { PermissionGate } from '../components/PermissionGate';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { CHANNEL_LABEL, INTAKE_GROUPS, intakeStatus, senderOf, timeAgo } from '../lib/intake';

const PAGE_SIZE = 20;
const REFRESH_MS = 30000;
const CHANNELS = [
  ['', 'All channels'],
  ['whatsapp', 'WhatsApp'],
  ['gmail', 'Gmail'],
  ['panel', 'Panel'],
];

function preview(draft) {
  return draft.subject || draft.matchedKeywords?.join(', ') || '—';
}

export function DraftOrders() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || 'review';
  const channel = params.get('channel') || '';
  const page = Number(params.get('page')) || 1;
  const [search, setSearch] = useState(params.get('q') || '');
  const [q, setQ] = useState(search);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  function setParam(key, value) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true }
    );
  }

  // Search waits for typing to pause.
  useEffect(() => {
    const timer = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let alive = true;
    intakeApi
      .list({ status: status === 'all' ? '' : status, channel, q, page, pageSize: PAGE_SIZE })
      .then((result) => {
        if (!alive) return;
        setData(result);
        setError('');
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [status, channel, q, page, tick]);

  const counts = data?.counts || {};
  const items = data?.items || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Draft orders"
        subtitle="Orders read from WhatsApp, Gmail and the panel. Review each one, confirm the customer, then convert it to a draft sales order."
        actions={
          <div className="flex gap-2">
            <PermissionGate permission="intake:settings">
              <Link to="/draft-orders/setup" className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold">
                Setup
              </Link>
            </PermissionGate>
            <PermissionGate permission="intake:update">
              <Link to="/draft-orders/new" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
                New draft
              </Link>
            </PermissionGate>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Tabs
          tabs={INTAKE_GROUPS.map((group) => ({ ...group, count: counts[group.id] ?? (data ? 0 : null) }))}
          value={status}
          onChange={(value) => setParam('status', value === 'review' ? '' : value)}
        />
        <select
          value={channel}
          onChange={(event) => setParam('channel', event.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold"
          aria-label="Channel"
        >
          {CHANNELS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <SearchField
          value={search}
          onChange={(value) => {
            setSearch(value);
            if (page !== 1) setParam('page', '');
          }}
          placeholder="Search number, sender, customer, order"
          className="w-full sm:w-72"
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!data && !error ? <p className="text-sm text-slate">Loading drafts…</p> : null}
      {data && !items.length ? (
        <EmptyState
          title={status === 'review' ? 'Nothing waiting for review' : 'No drafts here'}
          hint={counts.all ? 'Try another tab or clear the search.' : 'Use New draft, or connect WhatsApp and Gmail in Setup.'}
        />
      ) : null}

      {items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className="px-3 py-2 font-medium">Number</th>
                  <th className="px-3 py-2 font-medium">From</th>
                  <th className="px-3 py-2 font-medium">Subject / keywords</th>
                  <th className="px-3 py-2 font-medium">Lines</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Last message</th>
                </tr>
              </thead>
              <tbody>
                {items.map((draft) => {
                  const state = intakeStatus(draft.status);
                  return (
                    <tr key={draft.id} className="border-t border-line align-top">
                      <td className="px-3 py-2">
                        <Link to={`/draft-orders/${draft.id}`} className="font-semibold text-accent hover:underline">
                          {draft.number}
                        </Link>
                        <div className="text-xs text-slate">{CHANNEL_LABEL[draft.channel] || draft.channel}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{senderOf(draft)}</div>
                        {draft.customerName && draft.sender?.name && draft.customerName !== draft.sender.name ? (
                          <div className="text-xs text-slate">{draft.sender.name}</div>
                        ) : null}
                      </td>
                      <td className="max-w-xs px-3 py-2">
                        <div className="truncate">{preview(draft)}</div>
                        {draft.salesOrderNumber ? (
                          <Link to={`/sales-orders/${draft.salesOrder}`} className="text-xs font-semibold text-accent hover:underline">
                            {draft.salesOrderNumber}
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-3 py-2">{draft.lineCount || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={state.tone}>{state.label}</Badge>
                          {draft.overdue ? <Badge tone="danger">Overdue</Badge> : null}
                          {draft.newReadingAvailable ? <Badge tone="info">New message</Badge> : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate" title={new Date(draft.lastMessageAt || draft.receivedAt).toLocaleString()}>
                        {timeAgo(draft.lastMessageAt || draft.receivedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={PAGE_SIZE} onPage={(next) => setParam('page', String(next))} />
        </div>
      ) : null}
    </div>
  );
}
