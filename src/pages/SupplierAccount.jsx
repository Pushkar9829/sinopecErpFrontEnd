import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { purchasesApi } from '../api/purchases.api';
import { BillForm, DebitNoteForm, SupplierOpeningForm, SupplierPaymentForm } from '../components/purchases/PurchaseForms';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportMenu } from '../components/ui/ExportMenu';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { useUrlState } from '../hooks/useListParams';
import { usePermission } from '../hooks/usePermission';
import { amount } from '../lib/books';
import { exportTable, localToday } from '../lib/exporters';
import { formatDate, formatMoney } from '../lib/sales';

const td = 'px-3 py-2';
const right = `${td} whitespace-nowrap text-right`;
const ENTRY = { bill: 'Bill', opening: 'Opening bill', payment: 'Payment', debit_note: 'Debit note' };
const STATE = { paid: 'Paid', partly_paid: 'Part paid', unpaid: 'Unpaid' };

// One supplier: what we owe, their bills, the ledger, payments and returns.
export function SupplierAccount() {
  const { id } = useParams();
  const { can } = usePermission();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useUrlState('tab', 'bills');
  const [dialog, setDialog] = useState('');
  const load = useCallback(() => {
    purchasesApi
      .account(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);
  useEffect(load, [load]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-slate">Loading…</p>;
  const { supplier, summary } = data;
  const canEnter = can('accounts:create');

  function download(format) {
    const base = { fileName: `${supplier.code}-${tab}_${localToday()}`, subtitle: `${supplier.name} (${supplier.code}) · owed ${formatMoney(summary.outstanding)}` };
    if (tab === 'ledger') {
      return exportTable(format, {
        ...base,
        title: `Ledger: ${supplier.name}`,
        rows: data.entries,
        columns: [
          { label: 'Date', type: 'date', get: (e) => e.date },
          { label: 'Entry', type: 'text', get: (e) => `${ENTRY[e.type] || e.type} ${e.ref}` },
          { label: 'Detail', type: 'text', get: (e) => e.detail },
          { label: 'Paid / returned', type: 'money', get: (e) => e.debit || null },
          { label: 'Billed', type: 'money', get: (e) => e.credit || null },
          { label: 'We owe', type: 'money', get: (e) => e.balance },
        ],
      });
    }
    return exportTable(format, {
      ...base,
      title: `Bills: ${supplier.name}`,
      rows: data.bills,
      columns: [
        { label: 'Their bill', type: 'text', get: (b) => b.supplierBillNo },
        { label: 'Our ref', type: 'text', get: (b) => b.number },
        { label: 'Date', type: 'date', get: (b) => b.billDate },
        { label: 'Due', type: 'date', get: (b) => b.dueDate },
        { label: 'Total', type: 'money', get: (b) => b.total },
        { label: 'Paid', type: 'money', get: (b) => b.paid },
        { label: 'Owed', type: 'money', get: (b) => b.balance },
        { label: 'Days late', type: 'number', get: (b) => b.overdueDays || null },
      ],
    });
  }

  const button = 'rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper';
  return (
    <div className="space-y-4">
      <PageHeader
        title={supplier.name}
        subtitle={`${supplier.code}${supplier.gstNumber ? ` · GSTIN ${supplier.gstNumber}` : ''}${supplier.creditDays != null ? ` · ${supplier.creditDays} days credit` : ''}`}
        backTo="/purchases?tab=payables"
        backLabel="Purchases"
        actions={
          canEnter ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setDialog('bill')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
                New bill
              </button>
              <button type="button" onClick={() => setDialog('pay')} className={button}>
                Pay
              </button>
              <button type="button" onClick={() => setDialog('note')} className={button}>
                Debit note
              </button>
              <button type="button" onClick={() => setDialog('opening')} className={button}>
                Opening bill
              </button>
            </div>
          ) : null
        }
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          ['We owe', summary.outstanding],
          ['Overdue', summary.overdue],
          ['Due in 7 days', summary.dueThisWeek],
          ['Billed (all time)', summary.billed],
          ['Paid ahead', summary.advance],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-3 py-3">
            <p className="text-sm font-semibold text-slate">{label}</p>
            <p className={`mt-1 text-lg font-semibold ${label === 'Overdue' && value > 0 ? 'text-red-700' : ''}`}>{formatMoney(value)}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          tabs={[
            { id: 'bills', label: 'Bills', count: data.bills.length },
            { id: 'ledger', label: 'Ledger', count: data.entries.length },
            { id: 'payments', label: 'Payments', count: data.payments.length },
            { id: 'notes', label: 'Debit notes', count: data.debitNotes.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        {['bills', 'ledger'].includes(tab) ? <ExportMenu onExport={download} /> : null}
      </div>

      {tab === 'bills' ? (
        data.bills.length ? (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className={td}>Their bill</th>
                  <th className={td}>Date</th>
                  <th className={td}>Due</th>
                  <th className={`${td} text-right`}>Total</th>
                  <th className={`${td} text-right`}>Paid</th>
                  <th className={`${td} text-right`}>Owed</th>
                  <th className={td}>State</th>
                </tr>
              </thead>
              <tbody>
                {data.bills.map((b) => (
                  <tr key={b.id} className="border-t border-line">
                    <td className={td}>
                      <span className="font-semibold">{b.supplierBillNo}</span>
                      <span className="block text-xs text-slate">{b.kind === 'opening' ? 'Opening bill' : b.number}</span>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatDate(b.billDate)}</td>
                    <td className={`${td} whitespace-nowrap ${b.overdueDays ? 'font-semibold text-red-700' : ''}`}>
                      {formatDate(b.dueDate)}
                      {b.overdueDays ? ` · ${b.overdueDays} days late` : ''}
                    </td>
                    <td className={right}>{amount(b.total)}</td>
                    <td className={right}>{amount(b.paid)}</td>
                    <td className={`${right} font-semibold`}>{amount(b.balance) || '—'}</td>
                    <td className={td}>{STATE[b.payState]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No bills yet" hint="Enter their bills with New bill, or old unpaid ones with Opening bill." />
        )
      ) : null}

      {tab === 'ledger' ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className={td}>Date</th>
                <th className={td}>Entry</th>
                <th className={`${td} text-right`}>Paid / returned</th>
                <th className={`${td} text-right`}>Billed</th>
                <th className={`${td} text-right`}>We owe</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, i) => (
                <tr key={`${e.id}-${i}`} className="border-t border-line">
                  <td className={`${td} whitespace-nowrap`}>{formatDate(e.date)}</td>
                  <td className={td}>
                    {ENTRY[e.type] || e.type} <span className="font-semibold">{e.ref}</span>
                    {e.detail ? <span className="block text-xs text-slate">{e.detail}</span> : null}
                  </td>
                  <td className={right}>{amount(e.debit)}</td>
                  <td className={right}>{amount(e.credit)}</td>
                  <td className={`${right} font-semibold`}>{amount(e.balance) || '0.00'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'payments' ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {data.payments.map((p) => (
            <li key={p.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${p.voidedAt ? 'text-slate line-through' : ''}`}>
              <span className="font-semibold">{p.number}</span>
              <span>{formatDate(p.paidAt)}</span>
              <span>
                {formatMoney(p.amount)}
                {p.tds ? ` + TDS ${formatMoney(p.tds)}${p.tdsSection ? ` (${p.tdsSection})` : ''}` : ''}
              </span>
              <span>{[p.methodLabel, p.reference].filter(Boolean).join(' · ')}</span>
              {p.voidedAt ? <span className="no-underline">Voided: {p.voidReason}</span> : null}
            </li>
          ))}
          {!data.payments.length ? <li className="px-3 py-4 text-sm text-slate">No payments yet.</li> : null}
        </ul>
      ) : null}

      {tab === 'notes' ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {data.debitNotes.map((n) => (
            <li key={n.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${n.status === 'cancelled' ? 'text-slate line-through' : ''}`}>
              <span className="font-semibold">{n.number}</span>
              <span>{formatDate(n.date)}</span>
              <span>{formatMoney(n.total)}</span>
              <span>{n.reason}</span>
            </li>
          ))}
          {!data.debitNotes.length ? <li className="px-3 py-4 text-sm text-slate">No debit notes.</li> : null}
        </ul>
      ) : null}

      <p className="text-sm text-slate">
        Every bill, payment and debit note here also posts to the{' '}
        <Link to="/books?tab=trial" className="font-semibold text-accent hover:underline">
          books
        </Link>
        .
      </p>

      <BillForm open={dialog === 'bill'} supplierId={id} onClose={() => setDialog('')} onSaved={load} />
      <SupplierPaymentForm open={dialog === 'pay'} supplierId={id} bills={data.bills} onClose={() => setDialog('')} onSaved={load} />
      <DebitNoteForm open={dialog === 'note'} supplierId={id} bills={data.bills} onClose={() => setDialog('')} onSaved={load} />
      <SupplierOpeningForm open={dialog === 'opening'} supplierId={id} onClose={() => setDialog('')} onSaved={load} />
    </div>
  );
}
