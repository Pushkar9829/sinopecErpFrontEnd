import { confirmAction } from '../components/ui/confirm';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { salesOrdersApi } from '../api/salesOrders.api';
import { PermissionGate } from '../components/PermissionGate';
import { ProductionProgressModal } from '../components/sales/ProductionProgressModal';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ClearFilters, DateRangeFilter, FilterBar, FilterSelect } from '../components/ui/Filters';
import { Pagination } from '../components/ui/Pagination';
import { useDebounced, useListParams } from '../hooks/useListParams';
import { exportTable } from '../lib/exporters';
import { fetchAllPages } from '../lib/fetchAll';
import { SearchField } from '../components/ui/SearchField';
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
  orderTypeLabel,
  PRODUCTION_VIEW_KEYS,
  STATUS_LABELS,
  stageLabel,
  statusLabel,
  toDateInput,
} from '../lib/sales';

const LIST_DEFAULTS = { status: 'all', type: 'all', q: '', from: '', to: '', dateField: 'order', priority: 'all', sort: 'newest' };
const PRIORITY_OPTIONS = [
  { id: 'all', label: 'Any priority' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];
const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'delivery', label: 'Delivery date, soonest' },
  { id: 'delivery_desc', label: 'Delivery date, latest' },
];
const DATE_FIELDS = [
  { id: 'order', label: 'Order date' },
  { id: 'delivery', label: 'Delivery date' },
];
// No route has a packing stage any more; these only show for older orders still in them.
const LEGACY_STATUSES = new Set(['ready_for_packing', 'packed']);
const STATUS_ORDER = Object.keys(STATUS_LABELS);

// Status filter options with how many orders each holds (for the type picked).
// Old statuses only show while an order still has them.
function statusOptions(counts, value) {
  return [
    { id: 'all', label: `Any status (${counts.all ?? 0})` },
    ...STATUS_ORDER.filter((id) => !LEGACY_STATUSES.has(id) || counts[id] > 0 || id === value).map((id) => ({ id, label: `${STATUS_LABELS[id]} (${counts[id] ?? 0})` })),
  ];
}

// No job sheet before approval or after cancelling (same rule as the order page).
const JOB_SHEET_HIDDEN = ['draft', 'submitted', 'cancelled'];

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

function JobSheetIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M5 7V3h10v4" strokeLinejoin="round" />
      <rect x="2.5" y="7" width="15" height="7" rx="1.5" />
      <path d="M5 12h10v5H5z" strokeLinejoin="round" />
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
  // Same rule as the order page: production roles, once the order is approved.
  const canJobSheet = PRODUCTION_VIEW_KEYS.some(can);
  const showMoney = canSeeCommercial(can);
  const canCreate = can('sales:create');
  const list = useListParams(LIST_DEFAULTS, { pageSize: 25 });
  const { values: filters, page, pageSize } = list;
  const EMPTY = { items: [], total: 0, pages: 1, counts: { all: 0 } };
  const [data, setData] = useState(EMPTY);
  const tab = filters.status === 'all' || STATUS_ORDER.includes(filters.status) ? filters.status : 'all';
  const setTab = (next) => list.set('status', next);
  const typeFilter = ORDER_TYPES.some((type) => type.id === filters.type) ? filters.type : 'all';
  const setTypeFilter = (next) => list.set('type', next);
  const [query, setQuery] = useState(filters.q);
  const search = useDebounced(query.trim(), 300);
  const listQuery = { status: tab, type: typeFilter, q: filters.q, from: filters.from, to: filters.to, dateField: filters.dateField, priority: filters.priority, sort: filters.sort };
  const listKey = JSON.stringify(listQuery);
  const [error, setError] = useState('');
  const [duplicating, setDuplicating] = useState('');
  const [notice, setNotice] = useState('');
  const [progressOrder, setProgressOrder] = useState(null);

  // The server filters, counts and pages the orders; only the visible page
  // (with just the table's columns) is downloaded.
  const [loaded, setLoaded] = useState(false);
  const latest = useRef(0);

  async function load(targetPage = page) {
    const request = ++latest.current;
    const next = await salesOrdersApi.page({ ...listQuery, page: targetPage, pageSize });
    if (request === latest.current) setData(next);
  }

  useEffect(() => {
    if (search !== filters.q) list.set('q', search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    load(page)
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, listKey]);

  // Download every order matching the filters, not just this page.
  async function exportOrders(format) {
    const rows = await fetchAllPages(salesOrdersApi.page, listQuery);
    const title = typeFilter === 'job_work' ? 'Job work' : typeFilter === 'sales_order' ? 'Sales orders' : 'Orders';
    const range = filters.from || filters.to ? `${filters.dateField === 'delivery' ? 'Delivery' : 'Ordered'} ${filters.from ? formatDate(filters.from) : '...'} to ${filters.to ? formatDate(filters.to) : '...'}` : null;
    const parts = [tab !== 'all' ? statusLabel(tab) : null, range, filters.priority !== 'all' ? `${filters.priority} priority` : null, filters.q ? `search: ${filters.q}` : null].filter(Boolean);
    await exportTable(format, {
      fileName: `${title.toLowerCase().replace(/ /g, '-')}_${toDateInput(new Date())}`,
      title,
      subtitle: [`${rows.length} order(s)`, ...parts].join(' · '),
      rows,
      columns: [
        { label: 'Order', type: 'text', get: (o) => o.number },
        { label: 'Type', type: 'text', get: (o) => orderTypeLabel(o.orderType) },
        { label: 'Order date', type: 'date', get: (o) => o.orderDate },
        { label: 'Customer', type: 'text', get: (o) => o.customer?.companyName || o.customer?.name || '' },
        { label: 'Customer code', type: 'text', get: (o) => o.customer?.code || '' },
        { label: 'Delivery date', type: 'date', get: (o) => o.deliveryDate },
        { label: 'Priority', type: 'text', get: (o) => o.priority },
        { label: 'Status', type: 'text', get: (o) => statusLabel(o.status) },
        { label: 'Stage now', type: 'text', get: (o) => (isFloorStatus(o.status) ? (o.activeStages || []).map(stageLabel).join(', ') : '') },
        ...(showMoney ? [{ label: 'Total', type: 'money', get: (o) => o.grandTotal }] : []),
      ],
    });
  }

  const counts = data.counts || { all: 0 };

  async function openProgress(order) {
    setError('');
    try {
      setProgressOrder(await salesOrdersApi.get(order.id));
    } catch (err) {
      setError(err.message);
    }
  }

  async function duplicateOrder(order) {
    if (duplicating) return;
    setDuplicating(order.id);
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
        charges: (source.charges || []).map(({ name, sac, amount, gstPercent }) => ({ name, sac, amount, gstPercent })),
        documentFields: source.documentFields || {},
        items: copyItemsForNewOrder(source.items),
      });
      navigate(`/sales-orders/${created.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setDuplicating('');
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

      <FilterBar>
        <DateRangeFilter
          label="Dates"
          field={filters.dateField}
          fieldOptions={DATE_FIELDS}
          onField={(value) => list.set('dateField', value)}
          from={filters.from}
          to={filters.to}
          onChange={(range) => list.setMany(range)}
        />
        <FilterSelect label="Status" value={tab} onChange={setTab} options={statusOptions(counts, tab)} />
        <FilterSelect label="Priority" value={filters.priority} onChange={(value) => list.set('priority', value)} options={PRIORITY_OPTIONS} />
        <FilterSelect label="Sort" value={filters.sort} onChange={(value) => list.set('sort', value)} options={SORT_OPTIONS} />
        <ClearFilters
          count={list.active}
          onClear={() => {
            setQuery('');
            list.reset();
          }}
        />
        <div className="ml-auto self-end">
          <ExportMenu onExport={exportOrders} disabled={!data.total} label={data.total ? `Download ${data.total.toLocaleString('en-IN')}` : 'Download'} />
        </div>
      </FilterBar>

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
            {data.items.map((order) => (
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
                      {(order.activeStages || []).map((stage) => (
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
                          openProgress(order);
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
                    {can('sales:delete') ? (
                      <IconButton
                        label={order.status === 'draft' ? 'Delete order' : 'Only a draft can be deleted'}
                        className="text-red-700 hover:bg-red-50"
                        disabled={order.status !== 'draft'}
                        onClick={() => handleDelete(order.id)}
                      >
                        <TrashIcon />
                      </IconButton>
                    ) : null}
                    {canJobSheet ? (
                      <IconButton
                        label={JOB_SHEET_HIDDEN.includes(order.status) ? 'Job sheet is ready once the order is approved' : 'Job sheet (print or save as PDF)'}
                        className="text-ink hover:bg-paper"
                        disabled={JOB_SHEET_HIDDEN.includes(order.status)}
                        onClick={() => navigate(`/job-sheets/${order.id}`)}
                      >
                        <JobSheetIcon />
                      </IconButton>
                    ) : null}
                    {canCreate ? (
                      <IconButton label="Duplicate order" className="text-ink hover:bg-paper" disabled={Boolean(duplicating)} onClick={() => duplicateOrder(order)}>
                        <CopyIcon />
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
        ) : data.total === 0 ? (
          <EmptyState title="No orders found" hint="Create a sales order or job work draft, then submit it for approval." />
        ) : (
          <Pagination page={data.page || page} totalPages={data.pages} total={data.total} pageSize={data.pageSize || pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        )}
      </div>
      <ProductionProgressModal order={progressOrder} onClose={() => setProgressOrder(null)} />
    </div>
  );
}
