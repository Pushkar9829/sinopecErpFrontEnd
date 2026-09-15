import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesOrdersApi } from '../api/salesOrders.api';
import { PermissionGate } from '../components/PermissionGate';
import { ProductionProgressModal } from '../components/sales/ProductionProgressModal';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';
import { Badge, PriorityBadge, StatusBadge, orderStatusTone } from '../components/ui/Badge';
import {
  canSeeCommercial,
  formatDate,
  formatMoney,
  isFloorStatus,
  orderActiveStages,
  STATUS_LABELS,
  stageLabel,
  statusLabel,
} from '../lib/sales';

const PAGE_SIZE = 8;
const STATUS_ORDER = Object.keys(STATUS_LABELS).filter(
  (status) => status !== 'ready_for_packing' && status !== 'packed'
);

export function SalesOrders() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const showMoney = canSeeCommercial(can);
  const [orders, setOrders] = useState([]);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progressOrder, setProgressOrder] = useState(null);

  async function load() {
    setOrders(await salesOrdersApi.list());
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  const counts = useMemo(() => {
    const next = { all: orders.length };
    for (const status of STATUS_ORDER) {
      next[status] = orders.filter((order) => order.status === status).length;
    }
    return next;
  }, [orders]);

  const statusTabs = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        id: status,
        label: STATUS_LABELS[status],
        count: counts[status],
        tone: orderStatusTone(status),
      })),
    [counts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (tab !== 'all' && order.status !== tab) return false;
      if (!q) return true;
      return [
        order.number,
        order.customer?.name,
        order.customer?.code,
        order.customer?.companyName,
        statusLabel(order.status),
        ...orderActiveStages(order).map(stageLabel),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [orders, tab, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${tab}|${query}` });

  async function handleDelete(id) {
    if (!window.confirm('Delete this draft sales order?')) return;
    setError('');
    try {
      await salesOrdersApi.remove(id);
      await load();
      setNotice('Sales order deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales orders"
        subtitle="Commercial document that starts production. Route is chosen per product."
        search={<SearchField value={query} onChange={setQuery} placeholder="Search number or customer" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/sales-settings" className="rounded-lg border border-line px-3 py-1.5 text-sm hover:bg-paper">
              Product setup
            </Link>
            <PermissionGate permission="sales:create">
              <Link
                to="/sales-orders/new"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
              >
                New sales order
              </Link>
            </PermissionGate>
          </div>
        }
        extra={
          <Tabs
            tabs={[{ id: 'all', label: 'All', count: counts.all }, ...statusTabs]}
            value={tab}
            onChange={setTab}
          />
        }
      />

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              {showMoney ? <th className="px-4 py-3 font-medium">Total</th> : null}
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.paged.map((order) => (
              <tr
                key={order.id}
                tabIndex={0}
                onClick={() => navigate(`/sales-orders/${order.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/sales-orders/${order.id}`);
                  }
                }}
                className="cursor-pointer border-t border-line hover:bg-paper/70"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{order.number}</p>
                  <p className="text-xs text-slate">{formatDate(order.orderDate)}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{order.customer?.name || '—'}</p>
                  <p className="text-xs text-slate">{order.customer?.code || ''}</p>
                </td>
                <td className="px-4 py-3 text-slate">{formatDate(order.deliveryDate)}</td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={order.priority} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} label={statusLabel(order.status)} />
                </td>
                <td className="px-4 py-3">
                  {isFloorStatus(order.status) ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {orderActiveStages(order).map((stage) => (
                        <Badge key={stage} tone="accent">
                          {stageLabel(stage)}
                        </Badge>
                      ))}
                      <button
                        type="button"
                        title="See all stages and production totals"
                        aria-label={`Production stages for ${order.number}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          setProgressOrder(order);
                        }}
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-line text-xs font-semibold text-ink hover:bg-paper"
                      >
                        i
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate">—</span>
                  )}
                </td>
                {showMoney ? <td className="px-4 py-3">{formatMoney(order.grandTotal)}</td> : null}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(`/sales-orders/${order.id}`);
                      }}
                      className="text-ink hover:underline"
                    >
                      Open
                    </button>
                    {can('sales:delete') && order.status === 'draft' ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(order.id);
                        }}
                        className="text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.total === 0 ? (
          <EmptyState title="No sales orders found" hint="Create a draft, then submit it for approval." />
        ) : (
          <Pagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            pageSize={list.pageSize}
            onPage={list.setPage}
          />
        )}
      </div>
      <ProductionProgressModal order={progressOrder} onClose={() => setProgressOrder(null)} />
    </div>
  );
}
