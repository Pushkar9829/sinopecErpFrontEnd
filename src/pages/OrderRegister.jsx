import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { registersApi } from '../api/registers.api';
import { BackButton } from '../components/ui/BackButton';
import { badgeTones, stepTone, tabActiveTones } from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { OPERATOR_LABEL, bookColumns, frozenColumns, isSuperAdmin, savedValue } from '../lib/registerBooks';
import { formatDate, formatQty, statusLabel } from '../lib/sales';

const cell = 'whitespace-nowrap border-b border-r border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border-b border-r border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

function qtyOf(value, unit) {
  return `${formatQty(value)} ${unit || ''}`.trim();
}

function byNewest(a, b) {
  return new Date(b.workDate || b.markedAt) - new Date(a.workDate || a.markedAt);
}

function StageBook({ stage, customerName, customerCode, orderNumber, orderId, fromFloor, showCustomerName }) {
  const columns = bookColumns(stage.id, showCustomerName);
  const plainSpan = showCustomerName ? 10 : 9;
  const isDispatch = stage.id === 'dispatch';
  const backTo = `/registers/${orderId}?stage=${stage.id}${fromFloor ? '&from=floor' : ''}`;
  const entries = [];
  const openLines = [];
  const blocked = [];
  for (const line of stage.lines || []) {
    for (const entry of line.entries || []) {
      entries.push({
        ...entry,
        product: entry.product || line.product,
        unit: entry.unit || line.unit,
        customerName: entry.customerName || customerName,
        customerCode: entry.customerCode || customerCode,
      });
    }
    if (line.canEnter) openLines.push(line);
    else if (line.canMark && line.blockedReason) blocked.push(line);
  }
  entries.sort(byNewest);
  const showMark = openLines.length > 0;
  const frozen = columns ? frozenColumns(columns) : {};
  const headAt = (key) => (frozen[key] ? { className: `${head} ${frozen[key].className} z-20`, style: frozen[key].style } : { className: head });
  const cellAt = (key, extra = '') =>
    frozen[key] ? { className: `${cell} ${extra} ${frozen[key].className} bg-inherit`, style: frozen[key].style } : { className: `${cell} ${extra}` };

  return (
    <section>
      <table className="w-full border-separate border-spacing-0 border-l border-t border-stone-300 text-sm">
        <thead className="sticky top-0 z-20">
          <tr>
            <th {...headAt('no')}>No</th>
            <th {...headAt('date')}>Date</th>
            {columns ? (
              columns.map((column) => (
                <th key={column.key} {...headAt(column.key)}>
                  {column.label}
                </th>
              ))
            ) : (
              <>
                <th className={head}>Customer code</th>
                {showCustomerName ? <th className={head}>Customer name</th> : null}
                <th className={head}>Product</th>
                <th className={head}>Production</th>
                {isDispatch ? (
                  <>
                    <th className={head}>Used</th>
                    <th className={head}>Waste</th>
                    <th className={head}>From</th>
                  </>
                ) : (
                  <>
                    <th className={head}>Who</th>
                    <th className={head}>Person</th>
                    <th className={head}>Vehicle</th>
                  </>
                )}
              </>
            )}
            <th className={head}>{columns ? OPERATOR_LABEL[stage.id] : 'Operator'}</th>
            {showMark ? <th className={head} /> : null}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && openLines.length === 0 && blocked.length === 0 ? (
            <tr>
              <td className={`${cell} text-stone-500`} colSpan={columns ? columns.length + 3 : plainSpan}>
                No entry on this stage yet.
              </td>
            </tr>
          ) : null}
          {openLines.map((line) => (
            <tr key={line.jobId} className="bg-amber-50">
              <td {...cellAt('no', 'text-stone-500')} />
              <td {...cellAt('date')}>{formatDate(new Date())}</td>
              {columns ? (
                columns.map((column) => (
                  <td key={column.key} {...cellAt(column.key)}>
                    {column.edit ? '—' : savedValue({ ...line, orderNumber, customerName, customerCode, details: line.specs }, column.key, customerName) || '—'}
                  </td>
                ))
              ) : (
                <>
                  <td className={cell}>{customerCode || '—'}</td>
                  {showCustomerName ? <td className={cell}>{customerName || '—'}</td> : null}
                  <td className={cell}>{line.product || '—'}</td>
                  <td className={cell}>{qtyOf(line.remaining, line.unit)} left</td>
                  <td className={cell}>—</td>
                  <td className={cell}>—</td>
                  <td className={cell}>—</td>
                </>
              )}
              <td className={cell}>—</td>
              <td className={cell}>
                <Link
                  to={`/registers?view=stage&stage=${stage.id}&job=${encodeURIComponent(line.jobId)}&back=${encodeURIComponent(backTo)}`}
                  className="font-semibold text-ink underline"
                >
                  Enter
                </Link>
              </td>
            </tr>
          ))}
          {blocked.map((line) => (
            <tr key={`${line.jobId}-blocked`}>
              <td className={`${cell} text-stone-500`} colSpan={columns ? columns.length + (showMark ? 4 : 3) : plainSpan + (showMark ? 1 : 0)}>
                {line.product || 'This line'}: {line.blockedReason}
              </td>
            </tr>
          ))}
          {entries.map((entry, index) => (
            <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
              <td {...cellAt('no', 'text-stone-500')}>{index + 1}</td>
              <td {...cellAt('date')}>{formatDate(entry.workDate || entry.markedAt)}</td>
              {columns ? (
                columns.map((column) => (
                  <td key={column.key} {...cellAt(column.key)}>
                    {savedValue(entry, column.key, customerName) || '—'}
                  </td>
                ))
              ) : (
                <>
                  <td className={cell}>{entry.customerCode || customerCode || '—'}</td>
                  {showCustomerName ? <td className={cell}>{entry.customerName || '—'}</td> : null}
                  <td className={cell}>{entry.product || '—'}</td>
                  <td className={`${cell} font-semibold`}>{qtyOf(entry.outputQty, entry.unit)}</td>
                  {isDispatch ? (
                    <>
                      <td className={cell}>{formatQty(entry.inputQty)}</td>
                      <td className={cell}>{entry.wasteQty ? formatQty(entry.wasteQty) : '—'}</td>
                      <td className={cell}>{entry.pickedLotName || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td className={cell}>{entry.deliveryPartner || '—'}</td>
                      <td className={cell}>{entry.handoverPerson || '—'}</td>
                      <td className={cell}>{entry.vehicleNumber || '—'}</td>
                    </>
                  )}
                </>
              )}
              <td className={cell}>{entry.markedByName || '—'}</td>
              {showMark ? <td className={cell} /> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function stageWaiting(stage) {
  return (stage.lines || []).some((line) => line.canEnter);
}

const TAB_RING = {
  accent: 'ring-orange-900',
  info: 'ring-sky-900',
  purple: 'ring-violet-900',
  teal: 'ring-teal-900',
  success: 'ring-emerald-900',
  muted: 'ring-slate-800',
};

const TAB_BAR = {
  accent: 'border-orange-700',
  info: 'border-sky-700',
  purple: 'border-violet-700',
  teal: 'border-teal-700',
  success: 'border-emerald-700',
  muted: 'border-slate-600',
};

export function OrderRegister() {
  const { orderId } = useParams();
  const { user } = useAuth();
  const showCustomerName = isSuperAdmin(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const fromFloor = searchParams.get('from') === 'floor';
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');
  const stages = book?.stages || [];
  const requested = searchParams.get('stage') || '';
  const activeId = stages.some((stage) => stage.id === requested) ? requested : stages[0]?.id || '';
  const active = stages.find((stage) => stage.id === activeId);

  useEffect(() => {
    setError('');
    registersApi.order(orderId).then(setBook).catch((err) => setError(err.message));
  }, [orderId]);

  function selectStage(id) {
    const next = new URLSearchParams(searchParams);
    next.set('stage', id);
    setSearchParams(next, { replace: true });
  }

  return (
    <div className="-mx-3 -my-3 flex h-[calc(100dvh-3rem)] min-h-0 flex-col sm:-mx-5 sm:-my-4 lg:-mx-6 lg:h-dvh">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-stone-800 bg-[#fffdf6]">
        <div className="relative z-30 flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-800 bg-[#f6f1e4] px-3 py-2 lg:px-4">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <BackButton fallback={fromFloor ? '/production' : '/registers?view=orders'} />
            <h1 className="text-lg font-semibold text-stone-900">{book?.orderNumber || 'Order'}</h1>
            {book?.customerCode ? <p className="text-sm text-stone-700">{book.customerCode}</p> : null}
            {showCustomerName && book?.customerName ? <p className="text-sm text-stone-700">{book.customerName}</p> : null}
            {book?.status ? <p className="text-sm text-stone-600">{statusLabel(book.status)}</p> : null}
          </div>
          <p className="text-sm font-semibold text-stone-900">{formatDate(new Date())}</p>
        </div>

        {error ? <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p> : null}

        {stages.length ? (
          <div className={`border-b-4 bg-[#efe8d8] ${TAB_BAR[stepTone(activeId)] || TAB_BAR.muted}`} role="tablist" aria-label="Stages">
            <div className="flex gap-2 overflow-x-auto px-3 py-2.5">
              {stages.map((stage) => {
                const on = stage.id === activeId;
                const tone = stepTone(stage.id);
                const waiting = stageWaiting(stage);
                return (
                  <button
                    key={stage.id}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => selectStage(stage.id)}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3.5 py-1.5 text-sm font-semibold ${
                      on
                        ? `${tabActiveTones[tone] || tabActiveTones.muted} shadow-md ring-2 ring-offset-2 ring-offset-[#efe8d8] ${TAB_RING[tone] || TAB_RING.muted}`
                        : `${badgeTones[tone] || badgeTones.muted} hover:brightness-95`
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${on ? 'bg-white' : 'bg-current'}`} />
                    {stage.label}
                    {waiting ? (
                      <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none ${on ? 'bg-white/25 text-white' : 'bg-amber-200 text-amber-950'}`}>
                        Open
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          {active ? (
            <StageBook
              stage={active}
              customerName={book.customerName || ''}
              customerCode={book.customerCode || ''}
              orderNumber={book.orderNumber || ''}
              orderId={orderId}
              fromFloor={fromFloor}
              showCustomerName={showCustomerName}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
