import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { purchasesApi } from '../api/purchases.api';
import { BillForm } from '../components/purchases/PurchaseForms';
import { confirmAction, notify } from '../components/ui/confirm';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ClearFilters, DateRangeFilter, FilterBar, FilterSelect } from '../components/ui/Filters';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { useDebounced, useListParams, useUrlState } from '../hooks/useListParams';
import { usePermission } from '../hooks/usePermission';
import { amount } from '../lib/books';
import { exportTable, localToday } from '../lib/exporters';
import { fetchAllPages } from '../lib/fetchAll';
import { formatDate, formatMoney } from '../lib/sales';

const TABS = [
  { id: 'bills', label: 'Bills' },
  { id: 'payments', label: 'Payments' },
  { id: 'notes', label: 'Debit notes' },
  { id: 'payables', label: 'What we owe' },
];
const td = 'px-3 py-2';
const right = `${td} whitespace-nowrap text-right`;
const supplierLink = (id, name) => (
  <Link to={`/suppliers/${id}/account`} className="font-semibold text-accent hover:underline">
    {name}
  </Link>
);

// Each tab keeps its own filters and page in the address bar (bill.page,
// pay.page, ...), so switching tabs doesn't carry one list's filters to another.
function useServerList(load, defaults, prefix) {
  const list = useListParams(defaults, { pageSize: 25, prefix });
  const [query, setQuery] = useState(list.values.q || '');
  const search = useDebounced(query.trim(), 300);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const key = JSON.stringify(list.values);
  useEffect(() => {
    if ('q' in list.values && search !== list.values.q) list.set('q', search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    load({ ...list.values, page: list.page, pageSize: list.pageSize })
      .then((d) => {
        if (!live) return;
        setData(d);
        setError('');
      })
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, list.page, list.pageSize, tick]);
  return { list, data, error, query, setQuery, reload: () => setTick((t) => t + 1) };
}

// ---------------------------------------------------------------- bills

function Bills({ canCancel, reloadKey }) {
  const { list, data, error, query, setQuery, reload } = useServerList(purchasesApi.bills, { from: '', to: '', kind: '', status: '', q: '' }, 'bill');
  const f = list.values;
  useEffect(reload, [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  async function cancel(b) {
    const reason = await confirmAction({ title: `Cancel bill ${b.supplierBillNo || b.number}?`, withReason: true, reasonRequired: true, confirmLabel: 'Cancel bill', danger: true });
    if (reason === null) return;
    try {
      await purchasesApi.cancelBill(b.id, reason);
      reload();
    } catch (err) {
      notify(err.message, 'Bill not cancelled');
    }
  }
  async function download(format) {
    const rows = await fetchAllPages(purchasesApi.bills, { from: f.from, to: f.to, kind: f.kind, status: f.status, q: f.q });
    return exportTable(format, {
      fileName: `purchase-register_${localToday()}`,
      title: 'Purchase register',
      subtitle: `${rows.length} bill(s)${f.from || f.to ? ` · ${f.from || '…'} to ${f.to || '…'}` : ''}`,
      rows,
      columns: [
        { label: 'Date', type: 'date', get: (b) => b.billDate },
        { label: 'Our ref', type: 'text', get: (b) => b.number },
        { label: 'Supplier', type: 'text', get: (b) => b.supplierName },
        { label: 'GSTIN', type: 'text', get: (b) => b.supplierGstin },
        { label: 'Their bill no.', type: 'text', get: (b) => b.supplierBillNo },
        { label: 'Taxable', type: 'money', get: (b) => b.taxable },
        { label: 'CGST', type: 'money', get: (b) => b.cgst },
        { label: 'SGST', type: 'money', get: (b) => b.sgst },
        { label: 'IGST', type: 'money', get: (b) => b.igst },
        { label: 'Total', type: 'money', get: (b) => b.total },
        { label: 'Due', type: 'date', get: (b) => b.dueDate },
        { label: 'Status', type: 'text', get: (b) => (b.status === 'cancelled' ? `Cancelled: ${b.cancelReason}` : b.kind === 'opening' ? 'Opening bill' : 'Entered') },
      ],
    });
  }
  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Bill date" from={f.from} to={f.to} onChange={(r) => list.setMany(r)} />
        <FilterSelect label="Kind" value={f.kind} onChange={(v) => list.set('kind', v)} options={[{ id: '', label: 'All bills' }, { id: 'purchase', label: 'Purchase bills' }, { id: 'opening', label: 'Opening bills' }]} />
        <FilterSelect label="Show" value={f.status} onChange={(v) => list.set('status', v)} options={[{ id: '', label: 'Entered' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'all', label: 'Both' }]} />
        <div className="self-end">
          <SearchField value={query} onChange={setQuery} placeholder="Supplier or bill no." />
        </div>
        <ClearFilters
          count={list.active}
          onClear={() => {
            setQuery('');
            list.reset();
          }}
        />
        <div className="ml-auto self-end">
          <ExportMenu onExport={download} disabled={!data?.total} />
        </div>
      </FilterBar>
      {data?.sums ? (
        <p className="text-sm text-slate">
          Taxable ₹{amount(data.sums.taxable)} · GST ₹{amount(data.sums.cgst + data.sums.sgst + data.sums.igst)} · Total ₹{amount(data.sums.total)}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {data && !data.items.length ? <EmptyState title="No bills" hint="Enter supplier bills with New bill." /> : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className={td}>Date</th>
                  <th className={td}>Supplier</th>
                  <th className={td}>Their bill</th>
                  <th className={`${td} text-right`}>Taxable</th>
                  <th className={`${td} text-right`}>GST</th>
                  <th className={`${td} text-right`}>Total</th>
                  <th className={td}>Due</th>
                  <th className={td} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <tr key={b.id} className={`border-t border-line ${b.status === 'cancelled' ? 'text-steel line-through' : ''}`}>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(b.billDate)}</td>
                    <td className={td}>{supplierLink(b.supplier, b.supplierName)}</td>
                    <td className={td}>
                      {b.supplierBillNo}
                      <span className="block text-xs text-slate">{b.kind === 'opening' ? 'Opening bill' : b.number}</span>
                    </td>
                    <td className={right}>{amount(b.taxable)}</td>
                    <td className={right}>{amount(b.cgst + b.sgst + b.igst)}</td>
                    <td className={`${right} font-semibold`}>{amount(b.total)}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(b.dueDate)}</td>
                    <td className={`${td} text-right`}>
                      {canCancel && b.status === 'issued' ? (
                        <button type="button" onClick={() => cancel(b)} className="text-sm font-semibold text-red-700 hover:underline">
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={data.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- payments & notes

function Payments({ canVoid }) {
  const { list, data, error, reload } = useServerList(purchasesApi.payments, { from: '', to: '', status: '' }, 'pay');
  const f = list.values;
  async function voidIt(p) {
    const reason = await confirmAction({ title: `Void payment ${p.number}?`, withReason: true, reasonRequired: true, confirmLabel: 'Void', danger: true });
    if (reason === null) return;
    try {
      await purchasesApi.voidPayment(p.id, reason);
      reload();
    } catch (err) {
      notify(err.message, 'Payment not voided');
    }
  }
  const download = async (format) => {
    const rows = await fetchAllPages(purchasesApi.payments, { from: f.from, to: f.to, status: f.status });
    return exportTable(format, {
      fileName: `supplier-payments_${localToday()}`,
      title: 'Payments to suppliers',
      subtitle: `${rows.length} payment(s)`,
      rows,
      columns: [
        { label: 'Date', type: 'date', get: (p) => p.paidAt },
        { label: 'Number', type: 'text', get: (p) => p.number },
        { label: 'Supplier', type: 'text', get: (p) => p.supplierName },
        { label: 'Mode', type: 'text', get: (p) => p.methodLabel },
        { label: 'Reference', type: 'text', get: (p) => p.reference },
        { label: 'Amount paid', type: 'money', get: (p) => p.amount },
        { label: 'TDS deducted', type: 'money', get: (p) => p.tds || null },
        { label: 'TDS section', type: 'text', get: (p) => p.tdsSection || '' },
        { label: 'Status', type: 'text', get: (p) => (p.voidedAt ? `Voided: ${p.voidReason}` : 'Paid') },
      ],
    });
  };
  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Paid" from={f.from} to={f.to} onChange={(r) => list.setMany(r)} />
        <FilterSelect label="Show" value={f.status} onChange={(v) => list.set('status', v)} options={[{ id: '', label: 'Paid' }, { id: 'voided', label: 'Voided' }, { id: 'all', label: 'Both' }]} />
        <div className="ml-auto self-end">
          <ExportMenu onExport={download} disabled={!data?.total} />
        </div>
      </FilterBar>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {data && !data.items.length ? <EmptyState title="No payments" hint="Pay a supplier from their account page." /> : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className={td}>Date</th>
                <th className={td}>Supplier</th>
                <th className={td}>Mode</th>
                <th className={`${td} text-right`}>Amount</th>
                <th className={td} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => (
                <tr key={p.id} className={`border-t border-line ${p.voidedAt ? 'text-steel line-through' : ''}`}>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(p.paidAt)}</td>
                  <td className={td}>
                    {supplierLink(p.supplierId, p.supplierName)}
                    <span className="block text-xs text-slate">{p.number}</span>
                  </td>
                  <td className={td}>{[p.methodLabel, p.reference].filter(Boolean).join(' · ')}</td>
                  <td className={`${right} font-semibold`}>
                    {amount(p.amount)}
                    {p.tds ? <span className="block text-xs font-normal text-slate">+ TDS {amount(p.tds)}{p.tdsSection ? ` (${p.tdsSection})` : ''}</span> : null}
                  </td>
                  <td className={`${td} text-right`}>
                    {canVoid && !p.voidedAt ? (
                      <button type="button" onClick={() => voidIt(p)} className="text-sm font-semibold text-red-700 hover:underline">
                        Void
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={data.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        </div>
      ) : null}
    </div>
  );
}

function DebitNotes({ canCancel }) {
  const { list, data, error, reload } = useServerList(purchasesApi.debitNotes, { from: '', to: '', status: '' }, 'note');
  const f = list.values;
  async function cancel(n) {
    const reason = await confirmAction({ title: `Cancel ${n.number}?`, withReason: true, reasonRequired: true, confirmLabel: 'Cancel note', danger: true });
    if (reason === null) return;
    try {
      await purchasesApi.cancelDebitNote(n.id, reason);
      reload();
    } catch (err) {
      notify(err.message, 'Debit note not cancelled');
    }
  }
  const download = async (format) => {
    const rows = await fetchAllPages(purchasesApi.debitNotes, { from: f.from, to: f.to, status: f.status });
    return exportTable(format, {
      fileName: `debit-notes_${localToday()}`,
      title: 'Debit notes',
      subtitle: `${rows.length} note(s)`,
      rows,
      columns: [
        { label: 'Date', type: 'date', get: (n) => n.date },
        { label: 'Number', type: 'text', get: (n) => n.number },
        { label: 'Supplier', type: 'text', get: (n) => n.supplierName },
        { label: 'Reason', type: 'text', get: (n) => n.reason },
        { label: 'Taxable', type: 'money', get: (n) => n.taxable },
        { label: 'GST', type: 'money', get: (n) => n.cgst + n.sgst + n.igst },
        { label: 'Total', type: 'money', get: (n) => n.total },
      ],
    });
  };
  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Date" from={f.from} to={f.to} onChange={(r) => list.setMany(r)} />
        <FilterSelect label="Show" value={f.status} onChange={(v) => list.set('status', v)} options={[{ id: '', label: 'Valid' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'all', label: 'Both' }]} />
        <div className="ml-auto self-end">
          <ExportMenu onExport={download} disabled={!data?.total} />
        </div>
      </FilterBar>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {data && !data.items.length ? <EmptyState title="No debit notes" hint="Make one from the supplier's account page when goods go back or the rate was wrong." /> : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className={td}>Date</th>
                <th className={td}>Supplier</th>
                <th className={td}>Reason</th>
                <th className={`${td} text-right`}>Total</th>
                <th className={td} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((n) => (
                <tr key={n.id} className={`border-t border-line ${n.status === 'cancelled' ? 'text-steel line-through' : ''}`}>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(n.date)}</td>
                  <td className={td}>
                    {supplierLink(n.supplierId, n.supplierName)}
                    <span className="block text-xs text-slate">{n.number}</span>
                  </td>
                  <td className={td}>{n.reason}</td>
                  <td className={`${right} font-semibold`}>{amount(n.total)}</td>
                  <td className={`${td} text-right`}>
                    {canCancel && n.status === 'issued' ? (
                      <button type="button" onClick={() => cancel(n)} className="text-sm font-semibold text-red-700 hover:underline">
                        Cancel
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={data.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- payables

const BUCKETS = [
  ['current', 'Not due'],
  ['d1_30', '1–30 late'],
  ['d31_60', '31–60'],
  ['d61_90', '61–90'],
  ['d90plus', 'Over 90'],
];

function Payables({ reloadKey }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useUrlState('overdue', '');
  useEffect(() => {
    purchasesApi
      .payables()
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [reloadKey]);
  const rows = (data?.rows || []).filter((r) => !onlyOverdue || r.overdue > 0);
  const download = (format) =>
    exportTable(format, {
      fileName: `payables_${localToday()}`,
      title: 'What we owe suppliers',
      subtitle: `${rows.length} supplier(s)`,
      rows,
      totals: { outstanding: data.totals.outstanding, overdue: data.totals.overdue, dueThisWeek: data.totals.dueThisWeek },
      columns: [
        { key: 'code', label: 'Code', type: 'text', get: (r) => r.code },
        { key: 'name', label: 'Supplier', type: 'text', get: (r) => r.name },
        { key: 'outstanding', label: 'Owed', type: 'money', get: (r) => r.outstanding },
        { key: 'overdue', label: 'Overdue', type: 'money', get: (r) => r.overdue },
        { key: 'dueThisWeek', label: 'Due in 7 days', type: 'money', get: (r) => r.dueThisWeek },
        ...BUCKETS.map(([k, label]) => ({ key: k, label, type: 'money', get: (r) => r.ageing[k] })),
        { key: 'advance', label: 'Paid ahead', type: 'money', get: (r) => r.advance },
        { key: 'last', label: 'Last payment', type: 'date', get: (r) => r.lastPaymentAt },
      ],
    });
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate">Loading…</p>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['We owe', data.totals.outstanding],
          ['Overdue', data.totals.overdue],
          ['Due in 7 days', data.totals.dueThisWeek],
          ['Paid ahead', data.totals.advance],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-3 py-3">
            <p className="text-sm font-semibold text-slate">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${label === 'Overdue' && value > 0 ? 'text-red-700' : ''}`}>{formatMoney(value)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={Boolean(onlyOverdue)} onChange={(e) => setOnlyOverdue(e.target.checked ? '1' : '')} />
          Only suppliers with overdue bills
        </label>
        <ExportMenu onExport={download} disabled={!rows.length} />
      </div>
      {!rows.length ? (
        <EmptyState title="Nothing owed" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className={td}>Supplier</th>
                <th className={`${td} text-right`}>Owed</th>
                <th className={`${td} text-right`}>Overdue</th>
                <th className={`${td} text-right`}>Due in 7 days</th>
                {BUCKETS.slice(1).map(([k, label]) => (
                  <th key={k} className={`${td} text-right`}>
                    {label}
                  </th>
                ))}
                <th className={td}>Last payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-line">
                  <td className={td}>
                    {supplierLink(r.id, r.name)}
                    <span className="block text-xs text-slate">
                      {r.code} · {r.openBills} open bill(s){r.oldestOverdueDays ? ` · oldest ${r.oldestOverdueDays} days late` : ''}
                    </span>
                  </td>
                  <td className={`${right} font-semibold`}>{amount(r.outstanding) || '—'}</td>
                  <td className={`${right} ${r.overdue > 0 ? 'font-semibold text-red-700' : ''}`}>{amount(r.overdue) || '—'}</td>
                  <td className={right}>{amount(r.dueThisWeek) || '—'}</td>
                  {BUCKETS.slice(1).map(([k]) => (
                    <td key={k} className={right}>
                      {amount(r.ageing[k]) || '—'}
                    </td>
                  ))}
                  <td className={td}>{r.lastPaymentAt ? formatDate(r.lastPaymentAt) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Purchases() {
  const { can } = usePermission();
  const [tab, setTab] = useUrlState('tab', 'bills');
  const [billOpen, setBillOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchases"
        subtitle="Supplier bills with GST input, payments to suppliers, returns, and what we owe. Everything posts to the books by itself."
        actions={
          can('accounts:create') ? (
            <button type="button" onClick={() => setBillOpen(true)} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              New bill
            </button>
          ) : null
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'bills' ? <Bills canCancel={can('accounts:update')} reloadKey={reloadKey} /> : null}
      {tab === 'payments' ? <Payments canVoid={can('accounts:update')} /> : null}
      {tab === 'notes' ? <DebitNotes canCancel={can('accounts:update')} /> : null}
      {tab === 'payables' ? <Payables reloadKey={reloadKey} /> : null}
      <BillForm open={billOpen} onClose={() => setBillOpen(false)} onSaved={() => setReloadKey((k) => k + 1)} />
    </div>
  );
}
