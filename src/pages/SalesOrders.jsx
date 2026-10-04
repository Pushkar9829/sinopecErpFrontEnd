import { confirmAction } from '../components/ui/ConfirmHost';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { salesOrdersApi } from '../api/salesOrders.api';
import { PermissionGate } from '../components/PermissionGate';
import { ProductionProgressModal } from '../components/sales/ProductionProgressModal';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { usePagedList } from '../hooks/usePagedList';
import { usePermission } from '../hooks/usePermission';
import { Badge, PriorityBadge, StatusBadge } from '../components/ui/Badge';
import {
  canSeeCommercial,
  formatDate,
  formatMoney,
  isFloorStatus,
  copyItemsForNewOrder,
  deliveryDateForCopy,
  ORDER_TYPES,
  orderActiveStages,
  orderTypeLabel,
  STATUS_LABELS,
  stageLabel,
  statusLabel,
  toDateInput,
} from '../lib/sales';

const PAGE_SIZE = 8;
// No route has a packing stage any more; these only show for older orders still in them.
const LEGACY_STATUSES = new Set(['ready_for_packing', 'packed']);
const STATUS_ORDER = Object.keys(STATUS_LABELS);

const STATUS_CHIPS = {
  all: { chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  draft: { chip: 'border-slate-300 bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  submitted: { chip: 'border-amber-300 bg-amber-100 text-amber-900', dot: 'bg-amber-500' },
  approved: { chip: 'border-sky-300 bg-sky-100 text-sky-800', dot: 'bg-sky-600' },
  production_planned: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  in_production: { chip: 'border-orange-300 bg-orange-100 text-orange-900', dot: 'bg-orange-600' },
  ready_for_packing: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  packed: { chip: 'border-violet-300 bg-violet-100 text-violet-800', dot: 'bg-violet-600' },
  ready_for_dispatch: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  dispatched: { chip: 'border-teal-300 bg-teal-100 text-teal-800', dot: 'bg-teal-600' },
  delivered: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  completed: { chip: 'border-emerald-300 bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  cancelled: { chip: 'border-rose-300 bg-rose-100 text-rose-800', dot: 'bg-rose-600' },
};

function StatusMenu({ value, counts, onChange }) {
  const [open, setOpen] = useState(false);
  const options = [
    { id: 'all', label: 'All' },
    ...STATUS_ORDER.filter((id) => !LEGACY_STATUSES.has(id) || counts[id] > 0 || id === value).map((id) => ({ id, label: STATUS_LABELS[id] })),
  ];
  const current = options.find((item) => item.id === value) || options[0];
  const tone = STATUS_CHIPS[current.id] || STATUS_CHIPS.all;

  useEffect(() => {
    if (!open) return undefined;
    function close() {
      setOpen(false);
    }
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-label="Status"
        aria-expanded={open}
        onClick={() => setOpen((next) => !next)}
        className={`inline-flex max-w-56 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold ${tone.chip}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <span className="truncate">{current.label} · {counts[current.id] ?? 0}</span>
        <svg viewBox="0 0 20 20" className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div className="absolute left-0 z-20 mt-1 max-h-80 w-56 overflow-auto rounded-lg border border-line bg-white p-1 shadow-md">
          {options.map((item) => {
            const itemTone = STATUS_CHIPS[item.id] || STATUS_CHIPS.all;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                  item.id === value ? itemTone.chip : 'text-ink hover:bg-paper'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${itemTone.dot}`} />
                <span className="flex-1">{item.label}</span>
                <span className="text-xs">{counts[item.id] ?? 0}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function IconButton({ label, className = '', children, ...props }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12.5 3.5l4 4L7 17H3v-4L12.5 3.5z" strokeLinejoin="round" />
      <path d="M10.5 5.5l4 4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 6h12" strokeLinecap="round" />
      <path d="M8 6V4h4v2" />
      <path d="M6 6l.7 10h6.6L14 6" strokeLinejoin="round" />
      <path d="M8.5 9v5M11.5 9v5" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 4v12M4 10h12" strokeLinecap="round" />
    </svg>
  );
}

export function SalesOrders() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const showMoney = canSeeCommercial(can);
  const canCreate = can('sales:create');
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const requested = searchParams.get('status') || 'all';
  const tab = requested === 'all' || STATUS_ORDER.includes(requested) ? requested : 'all';
  function setTab(next) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    setSearchParams(params, { replace: true });
  }
  const requestedType = searchParams.get('type') || 'all';
  const typeFilter = ORDER_TYPES.some((type) => type.id === requestedType) ? requestedType : 'all';
  function setTypeFilter(next) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('type');
    else params.set('type', next);
    setSearchParams(params, { replace: true });
  }
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progressOrder, setProgressOrder] = useState(null);

  async function load() {
    setOrders(await salesOrdersApi.list());
  }

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    load()
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, []);

  const typed = useMemo(
    () => (typeFilter === 'all' ? orders : orders.filter((order) => (order.orderType || 'sales_order') === typeFilter)),
    [orders, typeFilter]
  );

  const counts = useMemo(() => {
    const next = { all: typed.length };
    for (const status of STATUS_ORDER) {
      next[status] = typed.filter((order) => order.status === status).length;
    }
    return next;
  }, [typed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return typed.filter((order) => {
      if (tab !== 'all' && order.status !== tab) return false;
      if (!q) return true;
      return [
        order.number,
        orderTypeLabel(order.orderType),
        order.customer?.name,
        order.customer?.code,
        order.customer?.companyName,
        statusLabel(order.status),
        ...orderActiveStages(order).map(stageLabel),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [typed, tab, query]);

  const list = usePagedList(filtered, { pageSize: PAGE_SIZE, resetKey: `${typeFilter}|${tab}|${query}` });

  async function duplicateOrder(order) {
    setError('');
    setNotice('');
    try {
      const source = await salesOrdersApi.get(order.id);
      const created = await salesOrdersApi.create({
        orderType: source.orderType || 'sales_order',
        customerId: source.customer?.id,
        orderDate: toDateInput(new Date()),
        deliveryDate: deliveryDateForCopy(source.deliveryDate),
        priority: source.priority,
        paymentTerms: source.paymentTerms,
        paymentMethod: source.paymentMethod,
        creditDays: source.creditDays,
        advanceAmount: 0,
        paymentRemarks: source.paymentRemarks,
        billingAddress: source.billingAddress,
        shippingAddress: source.shippingAddress,
        deliveryLocation: source.deliveryLocation,
        deliveryInstructions: source.deliveryInstructions,
        remarks: source.remarks,
        productionInstructions: source.productionInstructions,
        discount: source.discount,
        items: copyItemsForNewOrder(source.items),
      });
      navigate(`/sales-orders/${created.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!(await confirmAction({ message: 'Delete this draft order?', confirmLabel: 'Delete', danger: true }))) return;
    setError('');
    try {
      await salesOrdersApi.remove(id);
      await load();
      setNotice('Order deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Orders</h1>
        <div className="inline-flex rounded-lg border border-line bg-white p-0.5" role="group" aria-label="Order type">
          {[{ id: 'all', label: 'All' }, ...ORDER_TYPES].map((type) => (
            <button
              key={type.id}
              type="button"
              aria-pressed={typeFilter === type.id}
              onClick={() => setTypeFilter(type.id)}
              className={`rounded-md px-2.5 py-1 text-sm font-semibold ${typeFilter === type.id ? 'bg-ink text-paper' : 'text-ink hover:bg-paper'}`}
            >
              {type.label}
            </button>
          ))}
        </div>
        <StatusMenu value={tab} counts={counts} onChange={setTab} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search number or customer" />
          {can('sales:read') ? (
            <Link to="/sales-settings" className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper">
              Product setup
            </Link>
          ) : null}
          <PermissionGate permission="sales:create">
            <Link
              to="/sales-orders/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <PlusIcon />
              New order
            </Link>
          </PermissionGate>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full whitespace-nowrap text-left text-sm lg:whitespace-normal">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Delivery</th>
              <th className="px-4 py-3 font-semibold">Priority</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Stage</th>
              {showMoney ? <th className="px-4 py-3 font-semibold">Total</th> : null}
              <th className="px-4 py-3 font-semibold">Actions</th>
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
                  <p className="font-semibold text-ink">{order.number}</p>
                  <p className="text-sm font-normal text-slate">
                    {orderTypeLabel(order.orderType)} · {formatDate(order.orderDate)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink">{order.customer?.name || '—'}</p>
                  <p className="text-sm font-normal text-slate">{order.customer?.code || ''}</p>
                </td>
                <td className="px-4 py-3 font-normal text-ink">{formatDate(order.deliveryDate)}</td>
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
                {showMoney ? <td className="px-4 py-3 font-semibold text-ink">{formatMoney(order.grandTotal)}</td> : null}
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <div className="flex items-center gap-1.5">
                    <IconButton label="Open order" className="text-ink hover:bg-paper" onClick={() => navigate(`/sales-orders/${order.id}`)}>
                      <PencilIcon />
                    </IconButton>
                    {canCreate ? (
                      <IconButton label="Duplicate order" className="text-ink hover:bg-paper" onClick={() => duplicateOrder(order)}>
                        <CopyIcon />
                      </IconButton>
                    ) : null}
                    {can('sales:delete') && order.status === 'draft' ? (
                      <IconButton label="Delete order" className="text-red-700 hover:bg-red-50" onClick={() => handleDelete(order.id)}>
                        <TrashIcon />
                      </IconButton>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loaded ? (
          <p className="px-4 py-6 text-sm text-slate">Loading…</p>
        ) : list.total === 0 ? (
          <EmptyState title="No orders found" hint="Create a sales order or job work draft, then submit it for approval." />
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
