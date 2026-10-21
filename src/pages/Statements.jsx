import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { booksApi } from '../api/books.api';
import { fetchBlob, saveBlob } from '../api/client';
import { confirmAction } from '../components/ui/confirm';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportMenu } from '../components/ui/ExportMenu';
import { DateRangeFilter, FilterBar } from '../components/ui/Filters';
import { Field, inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { useUrlState } from '../hooks/useListParams';
import { usePermission } from '../hooks/usePermission';
import { amount } from '../lib/books';
import { exportTable, localToday } from '../lib/exporters';
import { formatDate, formatMoney } from '../lib/sales';

const TABS = [
  { id: 'pl', label: 'Profit & loss' },
  { id: 'bs', label: 'Balance sheet' },
  { id: 'cf', label: 'Cash flow' },
  { id: 'gst', label: 'GSTR-3B' },
  { id: 'close', label: 'Closing stock, lock & year end' },
];
const td = 'px-3 py-1.5';
const ledgerLink = (id) => `/books?tab=ledger&account=${id}`;
const fyStart = (ymd) => (Number(ymd.slice(5, 7)) >= 4 ? `${ymd.slice(0, 4)}-04-01` : `${Number(ymd.slice(0, 4)) - 1}-04-01`);
const signed = (n) => (n < 0 ? `(${amount(-n)})` : amount(n) || '0.00');

// Loads again whenever `deps` change; results of an older request are dropped.
function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: '' });
  const key = JSON.stringify(deps);
  useEffect(() => {
    let live = true;
    fn()
      .then((data) => live && setState({ data, error: '' }))
      .catch((err) => live && setState({ data: null, error: err.message }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return state;
}

// A statement as rows: { label, amount, level (0 heading, 1 group, 2 account), strong, link }.
function StatementTable({ rows, columns = ['Amount'] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper text-slate">
          <tr>
            <th className={td}>Particulars</th>
            {columns.map((c) => (
              <th key={c} className={`${td} text-right`}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-t border-line ${r.level === 0 ? 'bg-paper/60' : ''} ${r.strong ? 'font-semibold' : ''}`}>
              <td className={td} style={{ paddingLeft: `${0.75 + (r.level || 0) * 1.25}rem` }}>
                {r.link ? (
                  <Link to={r.link} className="text-accent hover:underline">
                    {r.label}
                  </Link>
                ) : (
                  r.label
                )}
              </td>
              {(r.values || [r.amount]).map((v, j) => (
                <td key={j} className={`${td} whitespace-nowrap text-right`}>
                  {v === null || v === undefined ? '' : signed(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function download(format, { fileName, title, subtitle, rows, columns = ['Amount'] }) {
  return exportTable(format, {
    fileName,
    title,
    subtitle,
    rows,
    columns: [
      { key: 'label', label: 'Particulars', type: 'text', get: (r) => `${'    '.repeat(r.level || 0)}${r.label}` },
      ...columns.map((c, i) => ({ key: `v${i}`, label: c, type: 'money', get: (r) => (r.values ? r.values[i] : r.amount) ?? null })),
    ],
  });
}

const Warnings = ({ list }) =>
  list?.length ? (
    <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      {list.map((w) => (
        <p key={w}>{w}</p>
      ))}
    </div>
  ) : null;

// ---------------------------------------------------------------- P&L

function ProfitLoss({ startDate }) {
  const today = localToday();
  const [range, setRange] = useState({ from: fyStart(today) < startDate ? startDate : fyStart(today), to: today });
  const { data, error } = useLoad(() => booksApi.profitLoss(range), [range.from, range.to]);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  const accounts = (section, level = 2) => section.accounts.map((a) => ({ label: a.name, amount: a.amount, level, link: ledgerLink(a.id) }));
  const rows = data
    ? [
        { label: 'Income from sales', level: 0, strong: true },
        ...accounts(data.trading.sales),
        ...accounts(data.trading.directIncome),
        { label: 'Total sales & direct income', amount: data.trading.sales.total + data.trading.directIncome.total, level: 1, strong: true },
        { label: 'Cost of goods sold', level: 0, strong: true },
        { label: 'Opening stock', amount: data.trading.openingStock, level: 2 },
        ...accounts(data.trading.purchases),
        ...accounts(data.trading.directExpenses),
        { label: 'Less: closing stock', amount: -data.trading.closingStock, level: 2 },
        { label: 'Cost of goods sold', amount: data.trading.openingStock + data.trading.purchases.total + data.trading.directExpenses.total - data.trading.closingStock, level: 1, strong: true },
        { label: 'Gross profit', amount: data.grossProfit, level: 0, strong: true },
        { label: 'Other income', level: 0, strong: true },
        ...accounts(data.indirectIncome),
        { label: 'Total other income', amount: data.indirectIncome.total, level: 1 },
        { label: 'Expenses', level: 0, strong: true },
        ...accounts(data.indirectExpenses),
        { label: 'Total expenses', amount: data.indirectExpenses.total, level: 1 },
        { label: data.netProfit >= 0 ? 'Net profit' : 'Net loss', amount: data.netProfit, level: 0, strong: true },
      ]
    : [];
  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Period" from={range.from} to={range.to} onChange={(r) => setRange({ from: r.from || startDate, to: r.to || today })} />
        <div className="ml-auto self-end">
          <ExportMenu disabled={!data} onExport={(format) => download(format, { fileName: `profit-loss_${range.from}_to_${range.to}`, title: 'Profit & loss account', subtitle: `${formatDate(range.from)} to ${formatDate(range.to)}`, rows })} />
        </div>
      </FilterBar>
      {!data ? <p className="text-sm text-slate">Working it out…</p> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['Income', data.revenue, data.previous?.revenue],
              [data.grossProfit >= 0 ? 'Gross profit' : 'Gross loss', data.grossProfit, data.previous?.grossProfit],
              [data.netProfit >= 0 ? 'Net profit' : 'Net loss', data.netProfit, data.previous?.netProfit],
            ].map(([label, value, prev]) => (
              <div key={label} className="rounded-xl border border-line bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate">{label}</p>
                <p className={`mt-1 text-xl font-semibold ${value < 0 ? 'text-red-700' : ''}`}>{formatMoney(Math.abs(value))}</p>
                {prev !== undefined && prev !== null ? <p className="text-xs text-slate">Previous period {formatMoney(prev)}</p> : null}
              </div>
            ))}
          </div>
          <Warnings list={data.warnings} />
          <StatementTable rows={rows} />
          <p className="text-xs text-slate">Amounts in brackets reduce the total. Click an account for its ledger.</p>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- balance sheet

function BalanceSheet() {
  const [asOf, setAsOf] = useState(localToday());
  const { data, error } = useLoad(() => booksApi.balanceSheet(asOf), [asOf]);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  const side = (title, groups, total) => [
    { label: title, level: 0, strong: true },
    ...groups.flatMap((g) => [
      { label: g.label, amount: g.total, level: 1, strong: true },
      ...(g.accounts.length > 1 || (g.accounts[0]?.id && g.accounts[0].name !== g.label) ? g.accounts.map((a) => ({ label: a.name, amount: a.amount, level: 2, link: a.id ? ledgerLink(a.id) : null })) : []),
    ]),
    { label: `Total ${title.toLowerCase()}`, amount: total, level: 0, strong: true },
  ];
  const liab = data ? side('Capital & liabilities', data.liabilities, data.totalLiabilities) : [];
  const assets = data ? side('Assets', data.assets, data.totalAssets) : [];
  return (
    <div className="space-y-3">
      <FilterBar>
        <label className="text-xs font-semibold text-slate">
          As on
          <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value || localToday())} className="mt-1 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink" />
        </label>
        <div className="ml-auto self-end">
          <ExportMenu disabled={!data} onExport={(format) => download(format, { fileName: `balance-sheet_${asOf}`, title: 'Balance sheet', subtitle: `As on ${formatDate(asOf)}`, rows: [...liab, ...assets] })} />
        </div>
      </FilterBar>
      {!data ? <p className="text-sm text-slate">Working it out…</p> : null}
      {data ? (
        <>
          <Warnings list={data.warnings} />
          {Math.abs(data.difference) > 0.01 ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">Assets and liabilities differ by {formatMoney(data.difference)}.</p> : <p className="text-sm font-semibold text-emerald-700">Balanced: {formatMoney(data.totalAssets)} on each side.</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <StatementTable rows={liab} />
            <StatementTable rows={assets} />
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- cash flow

function CashFlow({ startDate }) {
  const today = localToday();
  const [range, setRange] = useState({ from: fyStart(today) < startDate ? startDate : fyStart(today), to: today });
  const { data, error } = useLoad(() => booksApi.cashFlow(range), [range.from, range.to]);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  const section = (title, s) => [
    { label: title, level: 0, strong: true },
    ...s.rows.map((r) => ({ label: r.label, values: [r.inflow, -r.outflow, r.net], level: 1 })),
    { label: `Net cash from ${title.toLowerCase()}`, values: [s.inflow, -s.outflow, s.net], level: 0, strong: true },
  ];
  const rows = data
    ? [
        { label: 'Cash and bank at the start', values: [null, null, data.opening], level: 0, strong: true },
        ...section('Operating activities', data.operating),
        ...section('Investing activities', data.investing),
        ...section('Financing activities', data.financing),
        { label: 'Net change in cash and bank', values: [null, null, data.net], level: 0, strong: true },
        { label: 'Cash and bank at the end', values: [null, null, data.closing], level: 0, strong: true },
      ]
    : [];
  const columns = ['Money in', 'Money out', 'Net'];
  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Period" from={range.from} to={range.to} onChange={(r) => setRange({ from: r.from || startDate, to: r.to || today })} />
        <div className="ml-auto self-end">
          <ExportMenu disabled={!data} onExport={(format) => download(format, { fileName: `cash-flow_${range.from}_to_${range.to}`, title: 'Cash flow statement', subtitle: `${formatDate(range.from)} to ${formatDate(range.to)}`, rows, columns })} />
        </div>
      </FilterBar>
      {!data ? <p className="text-sm text-slate">Working it out…</p> : <StatementTable rows={rows} columns={columns} />}
      <p className="text-xs text-slate">Every cash and bank entry, sorted by what the money was for. Moves between your own cash and bank accounts are left out.</p>
    </div>
  );
}

// ---------------------------------------------------------------- GSTR-3B

function Gstr3b() {
  const [month, setMonth] = useState(localToday().slice(0, 7));
  const { data, error } = useLoad(() => booksApi.gstr3b(month), [month]);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  const heads = ['igst', 'cgst', 'sgst'];
  const tax = (o) => heads.map((h) => o?.[h] ?? 0);
  const rows = data
    ? [
        { label: '3.1 Outward supplies', level: 0, strong: true },
        { label: '(a) Taxable supplies (less credit notes)', values: [data.outward.taxable, ...tax(data.outward)], level: 1 },
        { label: '(c) Nil-rated supplies', values: [data.nilRated, null, null, null], level: 1 },
        { label: '4 Input tax credit', level: 0, strong: true },
        { label: 'Brought forward from last month', values: [null, ...tax(data.broughtForward)], level: 1 },
        { label: `This month (purchases ₹${amount(data.inwardTaxable) || '0'} taxable, expenses, less debit notes)`, values: [null, ...tax(data.itc)], level: 1 },
        { label: 'Credit available', values: [null, ...tax(data.creditAvailable)], level: 1, strong: true },
        { label: '6.1 Payment of tax', level: 0, strong: true },
        { label: 'Tax due', values: [null, ...tax(data.liability)], level: 1 },
        { label: 'Paid from IGST credit', values: [null, data.used.igst.igst, data.used.igst.cgst, data.used.igst.sgst], level: 2 },
        { label: 'Paid from CGST credit', values: [null, data.used.cgst.igst, data.used.cgst.cgst, null], level: 2 },
        { label: 'Paid from SGST credit', values: [null, data.used.sgst.igst, null, data.used.sgst.sgst], level: 2 },
        { label: 'To pay in cash', values: [null, ...tax(data.cash)], level: 1, strong: true },
        { label: 'Credit carried to next month', values: [null, ...tax(data.carried)], level: 1 },
      ]
    : [];
  const columns = ['Taxable value', 'IGST', 'CGST', 'SGST'];
  const cash = data ? data.cash.igst + data.cash.cgst + data.cash.sgst : 0;
  return (
    <div className="space-y-3">
      <FilterBar>
        <label className="text-xs font-semibold text-slate">
          Month
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value || localToday().slice(0, 7))} className="mt-1 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink" />
        </label>
        <div className="ml-auto self-end">
          <ExportMenu disabled={!data} onExport={(format) => download(format, { fileName: `GSTR-3B_${month}`, title: 'GSTR-3B summary', subtitle: month, rows, columns })} />
        </div>
      </FilterBar>
      {!data ? <p className="text-sm text-slate">Working it out…</p> : null}
      {data ? (
        <>
          <p className={`rounded-lg px-3 py-2 text-sm font-semibold ${cash > 0 ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-900'}`}>
            {cash > 0 ? `GST to pay in cash for ${month}: ${formatMoney(cash)}` : `Nothing to pay in cash for ${month}; input credit covers the tax.`}
          </p>
          <StatementTable rows={rows} columns={columns} />
          <p className="text-xs text-slate">
            Set-off order as per GST rules: IGST credit first (IGST, then CGST, SGST); CGST credit for CGST then IGST; SGST credit for SGST then IGST. Record the cash payment as a Payment entry in the books against the output GST accounts. Check figures with your CA before filing; reverse charge and ineligible credit are not worked out here.
          </p>
          <h3 className="font-semibold">Last months</h3>
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  {['Month', 'Tax due', 'Input credit', 'Cash to pay', 'Credit carried'].map((h, i) => (
                    <th key={h} className={`${td} ${i ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.history.map((m) => (
                  <tr key={m.month} className="border-t border-line">
                    <td className={td}>
                      <button type="button" onClick={() => setMonth(m.month)} className="font-semibold text-accent hover:underline">
                        {m.month}
                      </button>
                    </td>
                    <td className={`${td} text-right`}>{amount(m.tax)}</td>
                    <td className={`${td} text-right`}>{amount(m.itc)}</td>
                    <td className={`${td} text-right font-semibold`}>{amount(m.cash)}</td>
                    <td className={`${td} text-right`}>{amount(m.carried)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- closing stock, lock, year end, Tally

function YearEnd({ settings, canCorrect, isOwner, onSettings }) {
  const today = localToday();
  const [tick, setTick] = useState(0);
  const { data, error } = useLoad(() => booksApi.closingStock(), [tick]);
  const [form, setForm] = useState({ day: today, value: '', note: '' });
  const [lock, setLock] = useState(settings.lockDate || '');
  const [tally, setTally] = useState({ from: fyStart(today) < settings.startDate ? settings.startDate : fyStart(today), to: today });
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  async function run(action, done) {
    setProblem('');
    setMessage('');
    try {
      await action();
      setMessage(done);
      setTick((t) => t + 1);
      onSettings();
    } catch (err) {
      setProblem(err.message);
    }
  }
  // Years that have ended since the books started.
  const years = [];
  for (let y = Number(settings.startDate.slice(0, 4)) - (Number(settings.startDate.slice(5, 7)) >= 4 ? 0 : 1); `${y + 1}-03-31` < today; y += 1) years.push(`${String(y).slice(2)}-${String(y + 1).slice(2)}`);
  const closed = new Set((data?.closedYears || []).map((c) => c.fy));
  const open = years.filter((fy) => !closed.has(fy));
  async function tallyFile(part) {
    await run(async () => {
      const blob = await fetchBlob(`/api/books/export/tally?part=${part}&from=${tally.from}&to=${tally.to}`);
      saveBlob(blob, part === 'masters' ? `tally-ledgers_${tally.to}.xml` : `tally-vouchers_${tally.from}_to_${tally.to}.xml`);
    }, 'Downloaded.');
  }
  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      {problem ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{problem}</p> : null}

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h3 className="font-semibold">Closing stock</h3>
        <p className="text-sm text-slate">Value of raw material, work in progress and finished goods on hand, from the stock count (at cost or market value, whichever is lower). Enter it at least at every year end; monthly makes the monthly P&L right.</p>
        {canCorrect ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => booksApi.saveClosingStock(form), 'Closing stock saved.');
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <Field label="As on" className="text-sm">
              <input type="date" required value={form.day} max={today} onChange={(e) => setForm({ ...form, day: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Value (₹)" className="text-sm">
              <input type="number" required min="0" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={inputClass} />
            </Field>
            <Field label="Note" className="min-w-48 flex-1 text-sm">
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. physical count 31 March" className={inputClass} />
            </Field>
            <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              Save
            </button>
          </form>
        ) : null}
        {data?.stock.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {data.stock.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                <span>
                  {formatDate(s.day)} · <span className="font-semibold">{formatMoney(s.value)}</span>
                  <span className="text-slate">{[s.note, s.byName && `by ${s.byName}`].filter(Boolean).map((x) => ` · ${x}`)}</span>
                </span>
                {canCorrect ? (
                  <button type="button" onClick={() => run(() => booksApi.deleteClosingStock(s.day), 'Removed.')} className="text-sm text-rose-700">
                    Remove
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No closing stock entered yet" hint="Until you enter it, the opening stock value is used." />
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h3 className="font-semibold">Lock the books</h3>
        <p className="text-sm text-slate">After filing GST for a month, lock up to its last day. Nothing dated on or before it can then be added, cancelled or voided: invoices, payments, bills, expenses, credit notes or entries.</p>
        <p className="text-sm">{settings.lockDate ? <>Locked up to <span className="font-semibold">{formatDate(settings.lockDate)}</span>.</> : 'Not locked.'}</p>
        {canCorrect ? (
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Lock up to" className="text-sm">
              <input type="date" value={lock} max={today} onChange={(e) => setLock(e.target.value)} className={inputClass} />
            </Field>
            <button type="button" onClick={() => run(() => booksApi.saveSettings({ lockDate: lock }), lock ? `Locked up to ${lock}.` : 'Unlocked.')} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              {lock ? 'Lock' : 'Unlock'}
            </button>
          </div>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h3 className="font-semibold">Close a year</h3>
        <p className="text-sm text-slate">Needs the closing stock on 31 March. Closing locks the year and keeps its result; next year starts from the closing stock, and the profit is carried in the balance sheet.</p>
        {canCorrect && open.length ? (
          <div className="flex flex-wrap gap-2">
            {open.map((fy) => (
              <button
                key={fy}
                type="button"
                onClick={async () => {
                  if (await confirmAction({ title: `Close ${fy}?`, message: 'The books will be locked up to 31 March. Only the owner can reopen it.', confirmLabel: 'Close the year' })) run(() => booksApi.closeYear(fy), `${fy} closed.`);
                }}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper"
              >
                Close {fy}
              </button>
            ))}
          </div>
        ) : !open.length ? (
          <p className="text-sm text-slate">No finished year waiting to be closed.</p>
        ) : null}
        {data?.closedYears.length ? (
          <ul className="divide-y divide-line rounded-lg border border-line text-sm">
            {data.closedYears.map((c) => (
              <li key={c.fy} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
                <span>
                  <span className="font-semibold">{c.fy}</span> closed {formatDate(c.createdAt)} by {c.closedByName} · {c.netProfit >= 0 ? 'profit' : 'loss'} {formatMoney(Math.abs(c.netProfit))} · closing stock {formatMoney(c.closingStock)}
                </span>
                {isOwner ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (await confirmAction({ title: `Reopen ${c.fy}?`, message: 'The lock moves back and the year can be changed again.', confirmLabel: 'Reopen', danger: true })) run(() => booksApi.reopenYear(c.fy), `${c.fy} reopened.`);
                    }}
                    className="text-sm text-rose-700"
                  >
                    Reopen
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl border border-line bg-white p-4">
        <h3 className="font-semibold">Export to Tally</h3>
        <p className="text-sm text-slate">For your CA: in Tally, Gateway of Tally → Import → Masters (the ledgers file first), then Import → Transactions (the vouchers file).</p>
        <div className="flex flex-wrap items-end gap-2">
          <DateRangeFilter label="Vouchers" from={tally.from} to={tally.to} onChange={(r) => setTally({ from: r.from || settings.startDate, to: r.to || today })} />
          <button type="button" onClick={() => tallyFile('masters')} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper">
            Ledgers (XML)
          </button>
          <button type="button" onClick={() => tallyFile('vouchers')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
            Vouchers (XML)
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- page

export function Statements() {
  const { can, user } = usePermission();
  const isOwner = user?.role?.slug === 'super_admin';
  const [tab, setTab] = useUrlState('tab', 'pl');
  const [tick, setTick] = useState(0);
  const { data: settings, error } = useLoad(() => booksApi.settings(), [tick]);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!settings) return <p className="text-sm text-slate">Loading…</p>;
  return (
    <div className="space-y-4">
      <PageHeader title="Statements" subtitle={`Worked out from the books (from ${formatDate(settings.startDate)})${settings.lockDate ? ` · locked up to ${formatDate(settings.lockDate)}` : ''}.`} />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'pl' ? <ProfitLoss startDate={settings.startDate} /> : null}
      {tab === 'bs' ? <BalanceSheet /> : null}
      {tab === 'cf' ? <CashFlow startDate={settings.startDate} /> : null}
      {tab === 'gst' ? <Gstr3b /> : null}
      {tab === 'close' ? <YearEnd settings={settings} canCorrect={isOwner || can('accounts:update')} isOwner={isOwner} onSettings={() => setTick((t) => t + 1)} /> : null}
    </div>
  );
}
