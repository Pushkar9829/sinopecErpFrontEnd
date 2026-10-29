import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { companyApi } from '../api/company.api';
import { DocFootnotes } from '../components/print/PrintKit';
import { blockText } from '../components/print/blockText';
import { useDocumentLayout } from '../lib/documentLayout';
import { formatDate, toDateInput } from '../lib/sales';

const rs = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const drcr = (n) => `${rs(Math.abs(n))} ${n < 0 ? 'Cr' : 'Dr'}`;
const LABEL = { invoice: 'Invoice', opening: 'Opening bill', receipt: 'Payment received', order_payment: 'Payment received', advance: 'Advance received', credit_note: 'Credit note', write_off: 'Written off' };

// Statement of account for a period, to send to the customer (Print / Save as PDF).
// Layout from Settings → Documents → Customer statement.
export function CustomerStatement() {
  const { id } = useParams();
  const [ledger, setLedger] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const doc = useDocumentLayout('customerStatement');
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

  if (!ledger || !company || !doc.ready) return <p className="p-6 text-sm text-slate">{error || 'Loading statement…'}</p>;
  const { customer, summary } = ledger;
  const headerFields = doc.fields({
    period: `${formatDate(from)} to ${formatDate(to)}`,
    customerCode: customer.code,
    customerGstin: customer.gstNumber,
  });

  // Each column says what it prints on entry rows and on the opening and
  // closing rows, so those rows line up with whatever columns are shown.
  const cell = 'py-1 pr-2';
  const num = `${cell} text-right`;
  const columns = doc.columns([
    { key: 'date', label: 'Date', head: cell, cls: cell, row: (e) => formatDate(e.date), opening: formatDate(from), closing: formatDate(to) },
    {
      key: 'particulars',
      label: 'Particulars',
      head: cell,
      cls: cell,
      row: (e) => (
        <>
          {LABEL[e.type] || e.type} {e.ref}
          {e.detail ? <span className="text-slate"> · {e.detail}</span> : null}
        </>
      ),
      opening: 'Opening balance',
      closing: 'Closing balance',
    },
    { key: 'debit', label: 'Debit', head: num, cls: num, row: (e) => (e.debit ? rs(e.debit) : ''), opening: '', closing: rs(view.debit) },
    { key: 'credit', label: 'Credit', head: num, cls: num, row: (e) => (e.credit ? rs(e.credit) : ''), opening: '', closing: rs(view.credit) },
    { key: 'balance', label: 'Balance', head: 'py-1 text-right', cls: 'py-1 text-right', row: (e) => drcr(e.running), opening: drcr(view.opening), closing: drcr(view.closing) },
  ]);

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
          {doc.block('companyDetails') ? (
            <div>
              <h1 className="text-xl font-bold">{company.legalName}</h1>
              <p>{company.address}</p>
              <p>{[company.city, company.state, company.pinCode].filter(Boolean).join(', ')}</p>
              {company.gstin ? <p>GSTIN: {company.gstin}</p> : null}
            </div>
          ) : (
            <span />
          )}
          <div className="text-right">
            <p className="text-lg font-bold">{doc.title('STATEMENT OF ACCOUNT')}</p>
            {headerFields.map((f) =>
              f.key === 'period' ? (
                <p key={f.key}>{f.value}</p>
              ) : f.key === 'customerCode' || f.key === 'customerGstin' ? null : (
                <p key={f.key} className="whitespace-pre-line">
                  {f.label} {f.value}
                </p>
              )
            )}
          </div>
        </header>

        {doc.block('customer') ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">{blockText(doc, 'customer', 'Customer')}</p>
            <p className="font-semibold">{customer.companyName || customer.name}</p>
            <p>
              {[
                doc.field('customerCode') && customer.code,
                doc.field('customerGstin') && customer.gstNumber && `${doc.fieldLabel('customerGstin', 'GSTIN')} ${customer.gstNumber}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        ) : null}

        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-y border-ink">
              {columns.map((c) => (
                <th key={c.key} className={c.head}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.block('openingRow') ? (
              <tr className="border-b border-line font-semibold">
                {columns.map((c) => (
                  <td key={c.key} className={c.cls}>
                    {c.opening}
                  </td>
                ))}
              </tr>
            ) : null}
            {view.lines.map((e, index) => (
              <tr key={index} className="border-b border-line">
                {columns.map((c) => (
                  <td key={c.key} className={c.cls}>
                    {c.row(e)}
                  </td>
                ))}
              </tr>
            ))}
            {doc.block('closingRow') ? (
              <tr className="border-y border-ink font-bold">
                {columns.map((c) => (
                  <td key={c.key} className={c.cls}>
                    {c.closing}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
        {doc.block('outstanding') ? (
          <p>
            As of today: outstanding ₹{rs(summary.outstanding)}, of which overdue ₹{rs(summary.overdue)}.
            {summary.advance > 0 ? ` Advance held: ₹${rs(summary.advance)}.` : ''}
          </p>
        ) : null}
        {doc.block('bankDetails') && company.bankName ? (
          <p>
            {blockText(doc, 'bankDetails', 'Please pay to')}:{' '}
            {[company.bankName, company.bankAccountName, company.bankAccountNumber && `A/c ${company.bankAccountNumber}`, company.bankIfsc && `IFSC ${company.bankIfsc}`].filter(Boolean).join(', ')}
          </p>
        ) : null}
        <DocFootnotes note={doc.footerNote} computerGenerated={doc.block('computerGenerated')} />
      </article>
    </div>
  );
}
