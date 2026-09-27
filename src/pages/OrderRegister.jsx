import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { registersApi } from '../api/registers.api';
import { BackButton } from '../components/ui/BackButton';
import { badgeTones, stepTone, tabActiveTones } from '../components/ui/Badge';
import { OPERATOR_LABEL, STAGE_COLUMNS, savedValue } from '../lib/registerBooks';
import { formatDate, formatQty, statusLabel } from '../lib/sales';

const cell = 'whitespace-nowrap border border-stone-300 px-2 py-1.5 align-middle text-sm';
const head = 'whitespace-nowrap border border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

function qtyOf(value, unit) {
  return `${formatQty(value)} ${unit || ''}`.trim();
}

function byNewest(a, b) {
  return new Date(b.workDate || b.markedAt) - new Date(a.workDate || a.markedAt);
}

function StageBook({ stage, customerName, orderNumber, fromFloor }) {
  const columns = STAGE_COLUMNS[stage.id];
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
      });
    }
    if (line.canEnter) openLines.push(line);
    else if (line.canMark && line.blockedReason) blocked.push(line);
  }
  entries.sort(byNewest);
  const showMark = openLines.length > 0;

  return (
    <section>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className={head}>No</th>
            <th className={head}>Date</th>
            {columns ? (
              columns.map((column) => (
                <th key={column.key} className={head}>
                  {column.label}
                </th>
              ))
            ) : (
              <>
                <th className={head}>Party</th>
                <th className={head}>Product</th>
                <th className={head}>Production</th>
                <th className={head}>Who</th>
                <th className={head}>Person</th>
                <th className={head}>Vehicle</th>
              </>
            )}
            <th className={head}>{columns ? OPERATOR_LABEL[stage.id] : 'Operator'}</th>
            {showMark ? <th className={head} /> : null}
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 && openLines.length === 0 && blocked.length === 0 ? (
            <tr>
              <td className={`${cell} text-stone-500`} colSpan={columns ? columns.length + 3 : 9}>
                No entry on this stage yet.
              </td>
            </tr>
          ) : null}
          {openLines.map((line) => (
            <tr key={line.jobId} className="bg-amber-50">
              <td className={`${cell} text-stone-500`} />
              <td className={cell}>{formatDate(new Date())}</td>
              {columns ? (
                columns.map((column) => (
                  <td key={column.key} className={cell}>
                    {column.edit ? '—' : savedValue({ ...line, orderNumber, customerName, details: line.specs }, column.key, customerName) || '—'}
                  </td>
                ))
              ) : (
                <>
                  <td className={cell}>{customerName || '—'}</td>
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
                  to={`/registers?view=stage&stage=${stage.id}&job=${encodeURIComponent(line.jobId)}${fromFloor ? '&from=floor' : ''}`}
                  className="font-semibold text-ink underline"
                >
                  Enter
                </Link>
              </td>
            </tr>
          ))}
          {blocked.map((line) => (
            <tr key={`${line.jobId}-blocked`}>
              <td className={`${cell} text-stone-500`} colSpan={columns ? columns.length + (showMark ? 4 : 3) : showMark ? 10 : 9}>
                {line.product || 'This line'}: {line.blockedReason}
              </td>
            </tr>
          ))}
          {entries.map((entry, index) => (
            <tr key={entry.id} className={index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'}>
              <td className={`${cell} text-stone-500`}>{index + 1}</td>
              <td className={cell}>{formatDate(entry.workDate || entry.markedAt)}</td>
              {columns ? (
                columns.map((column) => (
                  <td key={column.key} className={cell}>
                    {savedValue(entry, column.key, customerName) || '—'}
                  </td>
                ))
              ) : (
                <>
                  <td className={cell}>{customerName || '—'}</td>
                  <td className={cell}>{entry.product || '—'}</td>
                  <td className={`${cell} font-semibold`}>{qtyOf(entry.outputQty, entry.unit)}</td>
                  <td className={cell}>{entry.deliveryPartner || '—'}</td>
                  <td className={cell}>{entry.handoverPerson || '—'}</td>
                  <td className={cell}>{entry.vehicleNumber || '—'}</td>
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
    <div className="-mx-5 -my-4 flex h-dvh min-h-0 flex-col md:-mx-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-stone-800 bg-[#fffdf6]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-stone-800 bg-[#f6f1e4] px-4 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <BackButton fallback={fromFloor ? '/production' : '/registers?view=orders'} />
            <h1 className="text-lg font-semibold text-stone-900">{book?.orderNumber || 'Sales order'}</h1>
            {book?.customerName ? <p className="text-sm text-stone-700">{book.customerName}</p> : null}
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
              orderNumber={book.orderNumber || ''}
              fromFloor={fromFloor}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
