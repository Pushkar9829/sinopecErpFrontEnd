import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { companyApi } from '../api/company.api';
import { formatDate, toDateInput } from '../lib/sales';

const rs = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const drcr = (n) => `${rs(Math.abs(n))} ${n < 0 ? 'Cr' : 'Dr'}`;
const LABEL = { invoice: 'Invoice', opening: 'Opening bill', receipt: 'Payment received', order_payment: 'Payment received', advance: 'Advance received' };

// Statement of account for a period, to send to the customer (Print / Save as PDF).
export function CustomerStatement() {
  const { id } = useParams();
  const [ledger, setLedger] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const today = toDateInput(new Date());
  const [from, setFrom] = useState(`${Number(today.slice(5, 7)) >= 4 ? today.slice(0, 4) : Number(today.slice(0, 4)) - 1}-04-01`);
  const [to, setTo] = useState(today);

  useEffect(() => {
    Promise.all([billingApi.ledger(id), companyApi.get()])
      .then(([l, c]) => {
        setLedger(l);
        setCompany(c);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  const view = useMemo(() => {
    if (!ledger) return null;
    const start = new Date(`${from}T00:00:00+05:30`).getTime();
    const end = new Date(`${to}T23:59:59+05:30`).getTime();
    const before = ledger.entries.filter((e) => new Date(e.date).getTime() < start);
    const opening = before.length ? before.at(-1).balance : 0;
    const rows = ledger.entries.filter((e) => {
      const t = new Date(e.date).getTime();
      return t >= start && t <= end;
    });
    let running = opening;
    const lines = rows.map((e) => {
      running = Math.round((running + e.debit - e.credit) * 100) / 100;
      return { ...e, running };
    });
    return {
      opening,
      lines,
      closing: running,
      debit: rows.reduce((s, e) => s + e.debit, 0),
      credit: rows.reduce((s, e) => s + e.credit, 0),
    };
  }, [ledger, from, to]);

  if (!ledger || !company) return <p className="p-6 text-sm text-slate">{error || 'Loading statement…'}</p>;
  const { customer, summary } = ledger;

  return (
    <div className="min-h-screen bg-paper p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex max-w-4xl flex-wrap items-end gap-3 print:hidden">
        <Link to={`/customers/${id}/account`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
          Back
        </Link>
        <label className="text-sm font-semibold">
          From
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="ml-2 rounded-lg border border-line px-2 py-1" />
        </label>
        <label className="text-sm font-semibold">
          To
          <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="ml-2 rounded-lg border border-line px-2 py-1" />
        </label>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
          Print / Save as PDF
        </button>
      </div>

      <article className="mx-auto max-w-4xl space-y-4 bg-white p-6 text-sm text-ink shadow print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap justify-between gap-4 border-b border-ink pb-3">
          <div>
            <h1 className="text-xl font-bold">{company.legalName}</h1>
            <p>{company.address}</p>
            <p>{[company.city, company.state, company.pinCode].filter(Boolean).join(', ')}</p>
            {company.gstin ? <p>GSTIN: {company.gstin}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">STATEMENT OF ACCOUNT</p>
            <p>
              {formatDate(from)} to {formatDate(to)}
            </p>
          </div>
        </header>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Customer</p>
          <p className="font-semibold">{customer.companyName || customer.name}</p>
          <p>
            {customer.code}
            {customer.gstNumber ? ` · GSTIN ${customer.gstNumber}` : ''}
          </p>
        </div>
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-ink">
              <th className="py-1 pr-2">Date</th>
              <th className="py-1 pr-2">Particulars</th>
              <th className="py-1 pr-2 text-right">Debit</th>
              <th className="py-1 pr-2 text-right">Credit</th>
              <th className="py-1 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line font-semibold">
              <td className="py-1 pr-2">{formatDate(from)}</td>
              <td className="py-1 pr-2">Opening balance</td>
              <td />
              <td />
              <td className="py-1 text-right">{drcr(view.opening)}</td>
            </tr>
            {view.lines.map((e, index) => (
              <tr key={index} className="border-b border-line">
                <td className="py-1 pr-2">{formatDate(e.date)}</td>
                <td className="py-1 pr-2">
                  {LABEL[e.type] || e.type} {e.ref}
                  {e.detail ? <span className="text-slate"> · {e.detail}</span> : null}
                </td>
                <td className="py-1 pr-2 text-right">{e.debit ? rs(e.debit) : ''}</td>
                <td className="py-1 pr-2 text-right">{e.credit ? rs(e.credit) : ''}</td>
                <td className="py-1 text-right">{drcr(e.running)}</td>
              </tr>
            ))}
            <tr className="border-y border-ink font-bold">
              <td className="py-1 pr-2">{formatDate(to)}</td>
              <td className="py-1 pr-2">Closing balance</td>
              <td className="py-1 pr-2 text-right">{rs(view.debit)}</td>
              <td className="py-1 pr-2 text-right">{rs(view.credit)}</td>
              <td className="py-1 text-right">{drcr(view.closing)}</td>
            </tr>
          </tbody>
        </table>
        <p>
          As of today: outstanding ₹{rs(summary.outstanding)}, of which overdue ₹{rs(summary.overdue)}.
          {summary.advance > 0 ? ` Advance held: ₹${rs(summary.advance)}.` : ''}
        </p>
        {company.bankName ? (
          <p>
            Please pay to: {[company.bankName, company.bankAccountName, company.bankAccountNumber && `A/c ${company.bankAccountNumber}`, company.bankIfsc && `IFSC ${company.bankIfsc}`].filter(Boolean).join(', ')}
          </p>
        ) : null}
      </article>
    </div>
  );
}
