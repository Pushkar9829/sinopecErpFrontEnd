import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { saveBlob } from '../api/client';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchField } from '../components/ui/SearchField';
import { formatDate, formatMoney } from '../lib/sales';

const BUCKETS = [
  ['current', 'Not due'],
  ['d1_30', '1–30 days'],
  ['d31_60', '31–60'],
  ['d61_90', '61–90'],
  ['d90plus', 'Over 90'],
];

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function Receivables() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  useEffect(() => {
    billingApi
      .receivables()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.rows || []).filter((r) => (!onlyOverdue || r.overdue > 0) && (!q || `${r.code} ${r.name} ${r.mobile}`.toLowerCase().includes(q)));
  }, [data, search, onlyOverdue]);

  function exportCsv() {
    const header = ['Code', 'Customer', 'Mobile', 'Outstanding', 'Overdue', ...BUCKETS.map(([, label]) => label), 'Advance', 'Credit limit', 'Oldest overdue (days)', 'Last payment'];
    const lines = rows.map((r) =>
      [r.code, r.name, r.mobile, r.outstanding, r.overdue, ...BUCKETS.map(([key]) => r.ageing[key]), r.advance, r.creditLimit || '', r.oldestOverdueDays, r.lastPaymentAt ? formatDate(r.lastPaymentAt) : ''].map(csvCell).join(',')
    );
    saveBlob(new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' }), `receivables-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Receivables"
        subtitle="What every customer owes, how late it is, and what is paid in advance."
        search={<SearchField value={search} onChange={setSearch} placeholder="Search customer" className="w-full sm:w-56" />}
        actions={
          <button type="button" onClick={exportCsv} disabled={!rows.length} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold disabled:opacity-50">
            Download Excel (CSV)
          </button>
        }
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!data && !error ? <p className="text-sm text-slate">Loading…</p> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <div className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate">Outstanding</p>
              <p className="mt-1 text-xl font-semibold">{formatMoney(data.totals.outstanding)}</p>
            </div>
            <div className="rounded-xl border border-line bg-white px-4 py-3">
              <p className="text-sm font-semibold text-slate">Overdue</p>
              <p className={`mt-1 text-xl font-semibold ${data.totals.overdue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatMoney(data.totals.overdue)}</p>
            </div>
            {BUCKETS.map(([key, label]) => (
              <div key={key} className="rounded-xl border border-line bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate">{label}</p>
                <p className="mt-1 text-lg font-semibold">{formatMoney(data.totals.ageing[key])}</p>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={onlyOverdue} onChange={(e) => setOnlyOverdue(e.target.checked)} />
            Only customers with overdue bills
          </label>
          {!rows.length ? (
            <EmptyState title="Nothing to collect" hint={data.rows.length ? 'No customer matches the filter.' : 'Bills appear here once invoices or opening balances are entered.'} />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-paper text-slate">
                  <tr>
                    <th className="px-3 py-2 font-medium">Customer</th>
                    <th className="px-3 py-2 text-right font-medium">Outstanding</th>
                    <th className="px-3 py-2 text-right font-medium">Overdue</th>
                    {BUCKETS.slice(1).map(([key, label]) => (
                      <th key={key} className="px-3 py-2 text-right font-medium">
                        {label}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium">Advance</th>
                    <th className="px-3 py-2 font-medium">Limit</th>
                    <th className="px-3 py-2 font-medium">Last payment</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const overLimit = r.creditLimit > 0 && r.outstanding > r.creditLimit;
                    return (
                      <tr key={r.id} className="border-t border-line">
                        <td className="px-3 py-2">
                          <Link to={`/customers/${r.id}/account`} className="font-semibold text-accent hover:underline">
                            {r.name}
                          </Link>
                          <div className="text-xs text-slate">
                            {r.code} · {r.openBills} open bill(s){r.oldestOverdueDays ? ` · oldest ${r.oldestOverdueDays} days late` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{formatMoney(r.outstanding)}</td>
                        <td className={`px-3 py-2 text-right ${r.overdue > 0 ? 'font-semibold text-red-700' : ''}`}>{formatMoney(r.overdue)}</td>
                        {BUCKETS.slice(1).map(([key]) => (
                          <td key={key} className="px-3 py-2 text-right">
                            {r.ageing[key] ? formatMoney(r.ageing[key]) : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">{r.advance ? formatMoney(r.advance) : '—'}</td>
                        <td className="px-3 py-2">{r.creditLimit ? <Badge tone={overLimit ? 'danger' : 'muted'}>{formatMoney(r.creditLimit)}</Badge> : '—'}</td>
                        <td className="px-3 py-2">{r.lastPaymentAt ? formatDate(r.lastPaymentAt) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
