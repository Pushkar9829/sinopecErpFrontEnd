import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { StageRegister } from '../components/register/StageRegister';
import { registersApi } from '../api/registers.api';
import { BackButton } from '../components/ui/BackButton';
import { ExportMenu } from '../components/ui/ExportMenu';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { useUrlState } from '../hooks/useListParams';
import { usePagedList } from '../hooks/usePagedList';
import { exportTable, localToday } from '../lib/exporters';
import { StageMenu } from '../components/ui/StageMenu';
import { useAuth } from '../context/auth';
import { usePermission } from '../hooks/usePermission';
import { isSuperAdmin } from '../lib/registerBooks';
import { PRODUCTION_STAGES, PRODUCTION_VIEW_KEYS, formatDate, orderTypeLabel, statusLabel } from '../lib/sales';

const cell = 'whitespace-nowrap border border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

function safeBack(value) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '';
}

export function Registers() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = usePermission();
  const isAdmin =
    can('production:read') ||
    can('sales:read') ||
    can('accounts:read') ||
    can('inventory:read');
  const showCustomerName = isSuperAdmin(user);
  // The printable work list needs floor access (sales/accounts/inventory cannot open it).
  const canPrintWorkList = PRODUCTION_VIEW_KEYS.some((key) => can(key));
  const view = isAdmin && searchParams.get('view') === 'orders' ? 'orders' : 'stage';
  const stage = searchParams.get('stage') || '';
  const presetJob = searchParams.get('job') || '';
  const backTo = safeBack(searchParams.get('back') || '');
  const fromTask = backTo.startsWith('/tasks') ? searchParams.get('task') || '' : '';
  // Whether this visit started from a job link (fixed for the visit).
  const [openedFromJob] = useState(() => Boolean(presetJob));
  const stages = useMemo(
    () => (isAdmin ? PRODUCTION_STAGES : PRODUCTION_STAGES.filter((item) => can(item.read))),
    [can, isAdmin]
  );
  // Order-wise list: loaded the first time that view opens; a later visit
  // shows the last list while the fresh one loads.
  const [orderList, setOrderList] = useState({ loaded: false, rows: [], error: '' });
  const allRows = orderList.rows;
  // Orders view: search and paging, kept in the address bar.
  const [q, setQ] = useUrlState('q', '');
  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    if (!text) return allRows;
    return allRows.filter((row) => [row.orderNumber, row.customerCode, row.customerName, orderTypeLabel(row.orderType), statusLabel(row.status)].some((v) => String(v || '').toLowerCase().includes(text)));
  }, [allRows, q]);
  const list = usePagedList(rows, { pageSize: 25, resetKey: q, url: view === 'orders' });
  const offset = (list.page - 1) * list.pageSize;
  const downloadOrders = (format) =>
    exportTable(format, {
      fileName: `register-orders_${localToday()}`,
      title: 'Register: orders',
      subtitle: `${rows.length} order(s)${q ? ` · search: ${q}` : ''}`,
      rows,
      columns: [
        { label: 'Order', type: 'text', get: (r) => r.orderNumber },
        { label: 'Type', type: 'text', get: (r) => orderTypeLabel(r.orderType) },
        { label: 'Customer code', type: 'text', get: (r) => r.customerCode },
        ...(showCustomerName ? [{ label: 'Customer name', type: 'text', get: (r) => r.customerName }] : []),
        { label: 'Status', type: 'text', get: (r) => statusLabel(r.status) },
        { label: 'Due', type: 'date', get: (r) => r.deliveryDate },
        { label: 'Stages', type: 'text', get: (r) => (r.stages || []).map((item) => item.label).join(' · ') },
      ],
    });
  const loading = view === 'orders' && !orderList.loaded;
  const error = view === 'orders' ? orderList.error : '';

  useEffect(() => {
    if (view === 'orders' || !stages.length) return;
    if (stage && stages.some((item) => item.id === stage)) return;
    const next = { stage: stages[0].id };
    if (isAdmin) next.view = 'stage';
    setSearchParams(next, { replace: true });
  }, [view, stage, stages, isAdmin, setSearchParams]);

  useEffect(() => {
    if (view !== 'orders') return undefined;
    let alive = true;
    registersApi
      .list()
      .then((data) => alive && setOrderList({ loaded: true, rows: data, error: '' }))
      .catch((err) => alive && setOrderList((current) => ({ ...current, loaded: true, error: err.message })));
    return () => {
      alive = false;
    };
  }, [view]);

  function stageParams(id) {
    const next = { stage: id };
    if (isAdmin) next.view = 'stage';
    return next;
  }

  function setView(next) {
    if (next === 'orders') {
      setSearchParams({ view: 'orders' });
      return;
    }
    setSearchParams(stageParams(stage || stages[0]?.id || 'rolling'));
  }

  function clearJob() {
    const next = stageParams(stage || stages[0]?.id || 'rolling');
    if (backTo) next.back = backTo;
    setSearchParams(next, { replace: true });
  }

  function afterSave() {
    if (!fromTask) return false;
    navigate(`${backTo}${backTo.includes('?') ? '&' : '?'}saved=${encodeURIComponent(fromTask)}`);
    return true;
  }

  function openOrder(orderId) {
    navigate(`/registers/${orderId}`);
  }

  const fallback = isAdmin ? '/registers?view=orders' : '/tasks';

  return (
    <div className="-mx-3 -my-3 flex h-[calc(100dvh-3rem)] min-h-0 flex-col sm:-mx-5 sm:-my-4 lg:-mx-6 lg:h-dvh">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-stone-800 bg-[#fffdf6]">
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-800 bg-[#f6f1e4] px-3 py-2 lg:px-4">
          <div className="flex flex-wrap items-center gap-2">
            {backTo ? (
              <BackButton to={backTo} label={backTo.startsWith('/tasks') ? 'Tasks' : 'Order book'} />
            ) : openedFromJob ? (
              <BackButton fallback={fallback} />
            ) : null}
            <h1 className="text-lg font-semibold text-stone-900">Register</h1>
            {isAdmin ? (
              <div className="flex overflow-hidden rounded-sm border border-stone-800">
                <button
                  type="button"
                  onClick={() => setView('orders')}
                  className={`px-3 py-2 text-sm font-semibold lg:py-1 ${view === 'orders' ? 'bg-stone-900 text-white' : 'bg-white text-stone-800'}`}
                >
                  Order
                </button>
                <button
                  type="button"
                  onClick={() => setView('stage')}
                  className={`px-3 py-2 text-sm font-semibold lg:py-1 ${view === 'stage' ? 'bg-stone-900 text-white' : 'bg-white text-stone-800'}`}
                >
                  Stage wise
                </button>
              </div>
            ) : null}
            {view === 'stage' && stages.length ? (
              <StageMenu
                stages={stages}
                value={stage || stages[0].id}
                onChange={(id) => setSearchParams(stageParams(id))}
              />
            ) : null}
          </div>
          <div className="flex w-full items-center justify-between gap-3 lg:w-auto lg:justify-start">
            <p className="text-sm font-semibold text-stone-900">{formatDate(new Date())}</p>
          </div>
        </div>

        {view === 'orders' ? (
          <>
            {error ? <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-300 bg-white px-3 py-2 print:hidden">
              <SearchField value={q} onChange={setQ} placeholder="Search order, customer, status" />
              <ExportMenu onExport={downloadOrders} disabled={!rows.length} />
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className={head}>No</th>
                    <th className={head}>Order</th>
                    <th className={head}>Type</th>
                    <th className={head}>Customer code</th>
                    {showCustomerName ? <th className={head}>Customer name</th> : null}
                    <th className={head}>Status</th>
                    <th className={head}>Due</th>
                    <th className={head}>Stages</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td className={`${cell} text-stone-500`} colSpan={showCustomerName ? 8 : 7}>
                        {loading ? 'Loading…' : q ? 'No order matches the search.' : 'No order is on the register yet.'}
                      </td>
                    </tr>
                  ) : (
                    list.paged.map((row, i) => {
                      const index = offset + i;
                      return (
                      <tr
                        key={row.orderId}
                        tabIndex={0}
                        onClick={() => openOrder(row.orderId)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openOrder(row.orderId);
                          }
                        }}
                        className={`cursor-pointer ${index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'} hover:bg-amber-50 focus:bg-amber-50 focus:outline-none`}
                      >
                        <td className={`${cell} w-12 text-stone-500`}>{index + 1}</td>
                        <td className={`${cell} font-semibold`}>{row.orderNumber}</td>
                        <td className={cell}>{orderTypeLabel(row.orderType)}</td>
                        <td className={cell}>{row.customerCode || '—'}</td>
                        {showCustomerName ? <td className={cell}>{row.customerName || '—'}</td> : null}
                        <td className={cell}>{statusLabel(row.status)}</td>
                        <td className={cell}>{formatDate(row.deliveryDate)}</td>
                        <td className={cell}>{(row.stages || []).map((item) => item.label).join(' · ') || '—'}</td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
          </>
        ) : (
          <>
          <StageRegister
              key={stage}
              stage={stage}
              isAdmin={isAdmin}
              presetJob={presetJob}
              fromTask={presetJob ? fromTask : ''}
              operatorName={user?.fullName || user?.username || ''}
              onConsumePreset={clearJob}
              onSaved={afterSave}
              extraActions={
                canPrintWorkList ? (
                  <Link to={`/job-sheets/stage/${stage}`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper">
                    Print work list
                  </Link>
                ) : null
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
