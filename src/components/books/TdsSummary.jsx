import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { booksApi } from '../../api/books.api';
import { amount } from '../../lib/books';
import { exportWorkbook } from '../../lib/exporters';
import { formatDate, formatMoney } from '../../lib/sales';
import { EmptyState } from '../ui/EmptyState';
import { DateRangeFilter, FilterBar } from '../ui/Filters';

const td = 'px-3 py-2';
const right = `${td} whitespace-nowrap text-right`;

function PartyTable({ rows, partyLabel, linkTo }) {
  if (!rows.length) return <EmptyState title="None in this period" />;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-paper text-slate">
          <tr>
            <th className={td}>{partyLabel}</th>
            <th className={td}>Section</th>
            <th className={`${td} text-right`}>Payments</th>
            <th className={`${td} text-right`}>Bills settled</th>
            <th className={`${td} text-right`}>TDS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.partyId}-${r.section}`} className="border-t border-line">
              <td className={td}>
                <Link to={linkTo(r.partyId)} className="font-semibold text-accent hover:underline">
                  {r.party}
                </Link>
                <span className="block text-xs text-slate">{[r.code, r.gstin].filter(Boolean).join(' · ')}</span>
              </td>
              <td className={td}>{r.section || '—'}</td>
              <td className={right}>{r.count}</td>
              <td className={right}>{amount(r.gross)}</td>
              <td className={`${right} font-semibold`}>{amount(r.tds)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// TDS for a period: deducted by customers from what they paid us, and
// deducted by us from supplier payments (owed to the government).
export function TdsSummary({ startDate, refreshKey, onOpenLedger }) {
  const [range, setRange] = useState({ from: startDate, to: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    booksApi
      .tds(range)
      .then((d) => live && setData(d))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [range, refreshKey]);

  function download() {
    const cols = (partyLabel) => [
      { label: 'Date', type: 'date', get: (r) => r.date },
      { label: 'Number', type: 'text', get: (r) => r.number },
      { label: partyLabel, type: 'text', get: (r) => r.party },
      { label: 'Section', type: 'text', get: (r) => r.section },
      { label: 'Money', type: 'money', get: (r) => r.received ?? r.paid },
      { label: 'TDS', type: 'money', get: (r) => r.tds },
    ];
    return exportWorkbook(`TDS_${data.from}_to_${data.to}`, [
      { name: 'Deducted by customers', title: 'TDS deducted by customers', subtitle: `${data.from} to ${data.to}`, columns: cols('Customer'), rows: data.deductedFromUs.lines },
      { name: 'Deducted by us', title: 'TDS deducted from supplier payments', subtitle: `${data.from} to ${data.to}`, columns: cols('Supplier'), rows: data.deductedByUs.lines },
    ]);
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate">Loading…</p>;
  const { deductedFromUs: fromUs, deductedByUs: byUs } = data;
  return (
    <div className="space-y-4">
      <FilterBar>
        <DateRangeFilter label="Dates" from={range.from} to={range.to} onChange={setRange} />
        <div className="ml-auto self-end">
          <button type="button" onClick={download} disabled={!fromUs.lines.length && !byUs.lines.length} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-50">
            Download Excel
          </button>
        </div>
      </FilterBar>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Deducted by customers', fromUs.total, 'Claim against your income tax; check with Form 26AS'],
          ['Deducted by us', byUs.total, 'From supplier payments in the period'],
          ['Deposited with the government', byUs.deposited, 'Payment entries to TDS payable in the period'],
          ['TDS payable now', byUs.owedNow, `As of ${formatDate(data.to)}`],
        ].map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-3 py-3">
            <p className="text-sm font-semibold text-slate">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${label === 'TDS payable now' && value > 0 ? 'text-amber-700' : ''}`}>{formatMoney(value)}</p>
            <p className="text-xs text-slate">{hint}</p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Deducted by customers</h3>
          <button type="button" onClick={() => onOpenLedger(data.accounts.receivable)} className="text-sm font-semibold text-accent hover:underline">
            TDS receivable ledger
          </button>
        </div>
        <PartyTable rows={fromUs.byCustomer} partyLabel="Customer" linkTo={(id) => `/customers/${id}/account?tab=payments`} />
      </section>

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Deducted by us from suppliers</h3>
          <button type="button" onClick={() => onOpenLedger(data.accounts.payable)} className="text-sm font-semibold text-accent hover:underline">
            TDS payable ledger
          </button>
        </div>
        <PartyTable rows={byUs.bySupplier} partyLabel="Supplier" linkTo={(id) => `/suppliers/${id}/account?tab=payments`} />
        {byUs.deposits.length ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-white text-sm">
            {byUs.deposits.map((d) => (
              <li key={d.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                <span>
                  {formatDate(d.date)} · {d.number} · {d.narration}
                </span>
                <span className="font-semibold">{formatMoney(d.amount)}</span>
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-slate">To record a deposit (challan), make a Payment entry in the books: TDS payable on the debit side, the bank on the credit side.</p>
      </section>
    </div>
  );
}
