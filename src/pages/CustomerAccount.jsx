import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { Badge } from '../components/ui/Badge';
import { confirmAction } from '../components/ui/confirm';
import { Field, Grid, inputClass } from '../components/ui/FormField';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { usePermission } from '../hooks/usePermission';
import { formatDate, formatMoney, toDateInput } from '../lib/sales';
import { ExportMenu } from '../components/ui/ExportMenu';
import { exportTable, localToday } from '../lib/exporters';

const PAY_STATE = { paid: ['Paid', 'success'], partly_paid: ['Part paid', 'warning'], unpaid: ['Unpaid', 'muted'] };
const METHODS = [
  ['bank_transfer', 'Bank transfer'],
  ['upi', 'UPI'],
  ['cheque', 'Cheque'],
  ['cash', 'Cash'],
  ['other', 'Other'],
];
const ENTRY_LABEL = { invoice: 'Invoice', opening: 'Opening bill', receipt: 'Payment', order_payment: 'Payment on order', advance: 'Advance on order' };

function Card({ label, value, tone = 'text-ink' }) {
  return (
    <div className="rounded-xl border border-line bg-white px-4 py-3">
      <p className="text-sm font-semibold text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function PaymentForm({ customerId, invoices, open, onClose, onDone }) {
  const [form, setForm] = useState({ receivedAt: toDateInput(new Date()), amount: '', method: 'bank_transfer', reference: '', note: '', invoiceId: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await billingApi.addReceipt(customerId, { ...form, amount: Number(form.amount), invoiceId: form.invoiceId || undefined });
      onDone('Payment recorded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} title="Record payment" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Grid cols="sm:grid-cols-2">
          <Field label="Received on" mark>
            <input type="date" required value={form.receivedAt} max={toDateInput(new Date())} onChange={set('receivedAt')} className={inputClass} />
          </Field>
          <Field label="Amount (₹)" mark>
            <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={set('amount')} className={inputClass} />
          </Field>
          <Field label="Method">
            <select value={form.method} onChange={set('method')} className={inputClass}>
              {METHODS.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference (UTR, cheque no.)">
            <input value={form.reference} onChange={set('reference')} className={inputClass} />
          </Field>
        </Grid>
        <Field label="For bill">
          <select value={form.invoiceId} onChange={set('invoiceId')} className={inputClass}>
            <option value="">Oldest bills first (automatic)</option>
            {invoices
              .filter((inv) => inv.balance > 0)
              .map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · due {formatDate(inv.dueDate)} · balance {formatMoney(inv.balance)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Note">
          <input value={form.note} onChange={set('note')} className={inputClass} />
        </Field>
        <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? 'Saving…' : 'Record payment'}
        </button>
      </form>
    </Modal>
  );
}

function OpeningForm({ customerId, open, onClose, onDone }) {
  const [form, setForm] = useState({ number: '', date: '', amount: '', dueDate: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await billingApi.addOpening(customerId, { ...form, amount: Number(form.amount), dueDate: form.dueDate || undefined });
      onDone('Opening bill added.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} title="Add opening bill" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-slate">An unpaid bill from before you started using the app.</p>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Grid cols="sm:grid-cols-2">
          <Field label="Bill number" mark>
            <input required value={form.number} onChange={set('number')} className={inputClass} />
          </Field>
          <Field label="Amount due (₹)" mark>
            <input type="number" required min="0.01" step="0.01" value={form.amount} onChange={set('amount')} className={inputClass} />
          </Field>
          <Field label="Bill date" mark>
            <input type="date" required value={form.date} onChange={set('date')} className={inputClass} />
          </Field>
          <Field label="Due date (blank = bill date + credit days)">
            <input type="date" value={form.dueDate} onChange={set('dueDate')} className={inputClass} />
          </Field>
        </Grid>
        <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? 'Saving…' : 'Add bill'}
        </button>
      </form>
    </Modal>
  );
}

export function CustomerAccount() {
  const { id } = useParams();
  const { can, user } = usePermission();
  const isOwner = user?.role?.slug === 'super_admin';
  const canReceive = isOwner || can('accounts:create') || can('accounts:update') || can('sales:update');
  const canCorrect = isOwner || can('accounts:update');
  const canOpening = canCorrect || can('accounts:create');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState('bills');
  const [dialog, setDialog] = useState('');

  const load = useCallback(() => {
    billingApi
      .ledger(id)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);
  useEffect(load, [load]);

  function done(message) {
    setDialog('');
    setNotice(message);
    load();
  }

  async function voidReceipt(receipt) {
    const reason = await confirmAction({ title: `Void payment ${receipt.number}`, message: 'It stays on record, struck out, and no longer counts.', withReason: true, confirmLabel: 'Void', danger: true });
    if (reason === null) return;
    try {
      await billingApi.voidReceipt(receipt.id, reason);
      done('Payment voided.');
    } catch (err) {
      setError(err.message);
    }
  }

  if (!data) return <p className="text-sm text-slate">{error || 'Loading account…'}</p>;
  const { customer, summary } = data;
  const who = customer.companyName || customer.name;
  const day = localToday();
  // Download the open tab for this customer.
  function downloadTab(format) {
    if (tab === 'bills') {
      return exportTable(format, {
        fileName: `${customer.code}-bills_${day}`,
        title: `Bills: ${who}`,
        subtitle: `${customer.code} · outstanding ${formatMoney(summary.outstanding)}`,
        rows: data.invoices,
        columns: [
          { label: 'Bill', type: 'text', get: (i) => i.number },
          { label: 'Kind', type: 'text', get: (i) => (i.kind === 'opening' ? 'Opening bill' : 'Invoice') },
          { label: 'Order', type: 'text', get: (i) => i.orderNumber },
          { label: 'Date', type: 'date', get: (i) => i.invoiceDate },
          { label: 'Due', type: 'date', get: (i) => i.dueDate },
          { label: 'Total', type: 'money', get: (i) => i.total },
          { label: 'Paid', type: 'money', get: (i) => i.paid },
          { label: 'Balance', type: 'money', get: (i) => i.balance },
          { label: 'Days overdue', type: 'number', get: (i) => i.overdueDays || null },
        ],
      });
    }
    if (tab === 'ledger') {
      return exportTable(format, {
        fileName: `${customer.code}-ledger_${day}`,
        title: `Ledger: ${who}`,
        subtitle: customer.code,
        rows: data.entries,
        columns: [
          { label: 'Date', type: 'date', get: (e) => e.date },
          { label: 'Entry', type: 'text', get: (e) => `${ENTRY_LABEL[e.type] || e.type} ${e.ref || ''}`.trim() },
          { label: 'Detail', type: 'text', get: (e) => e.detail },
          { label: 'Debit', type: 'money', get: (e) => e.debit || null },
          { label: 'Credit', type: 'money', get: (e) => e.credit || null },
          { label: 'Balance', type: 'money', get: (e) => e.balance },
        ],
      });
    }
    return exportTable(format, {
      fileName: `${customer.code}-payments_${day}`,
      title: `Payments: ${who}`,
      subtitle: customer.code,
      rows: data.receipts,
      columns: [
        { label: 'Receipt', type: 'text', get: (r) => r.number },
        { label: 'Date', type: 'date', get: (r) => r.receivedAt },
        { label: 'Amount', type: 'money', get: (r) => r.amount },
        { label: 'Mode', type: 'text', get: (r) => r.method },
        { label: 'Reference', type: 'text', get: (r) => r.reference },
        { label: 'Status', type: 'text', get: (r) => (r.voidedAt ? `Voided: ${r.voidReason || ''}` : 'Valid') },
      ],
    });
  }
  const limit = customer.creditLimit || 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${customer.companyName || customer.name}: account`}
        subtitle={`${customer.code}${customer.gstNumber ? ` · GSTIN ${customer.gstNumber}` : ''} · credit days: ${customer.creditDays ?? 'company default'}`}
        backTo={`/customers/${customer.id}`}
        backLabel="Customer"
        actions={
          <div className="flex flex-wrap gap-2">
            {canReceive ? (
              <button type="button" onClick={() => setDialog('payment')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
                Record payment
              </button>
            ) : null}
            <Link to={`/customers/${customer.id}/statement`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
              Statement
            </Link>
            {canOpening ? (
              <button type="button" onClick={() => setDialog('opening')} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
                Add opening bill
              </button>
            ) : null}
          </div>
        }
      />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card label="Outstanding" value={formatMoney(summary.outstanding)} tone={summary.outstanding > 0 ? 'text-ink' : 'text-emerald-700'} />
        <Card label="Overdue" value={formatMoney(summary.overdue)} tone={summary.overdue > 0 ? 'text-red-700' : 'text-emerald-700'} />
        <Card label="Advance / unused" value={formatMoney(summary.advance)} />
        <Card label="Credit limit" value={limit ? formatMoney(limit) : 'No limit'} />
        <Card label="Available" value={limit ? formatMoney(summary.available) : '—'} tone={limit && summary.available < 0 ? 'text-red-700' : 'text-ink'} />
      </div>
      <p className="text-sm text-slate">
        Overdue by age: 1–30 days {formatMoney(summary.ageing.d1_30)} · 31–60 {formatMoney(summary.ageing.d31_60)} · 61–90 {formatMoney(summary.ageing.d61_90)} · over 90 {formatMoney(summary.ageing.d90plus)}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          tabs={[
            { id: 'bills', label: 'Bills', count: data.invoices.length },
            { id: 'ledger', label: 'Ledger', count: data.entries.length },
            { id: 'payments', label: 'Payments', count: data.receipts.length },
          ]}
          value={tab}
          onChange={setTab}
        />
        <ExportMenu onExport={(format) => downloadTab(format)} disabled={!(tab === 'bills' ? data.invoices : tab === 'ledger' ? data.entries : data.receipts).length} />
      </div>

      {tab === 'bills' ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className="px-3 py-2 font-medium">Bill</th>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Due</th>
                <th className="px-3 py-2 text-right font-medium">Amount</th>
                <th className="px-3 py-2 text-right font-medium">Paid</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => {
                const [label, tone] = PAY_STATE[inv.payState];
                return (
                  <tr key={inv.id} className="border-t border-line">
                    <td className="px-3 py-2">
                      <Link to={`/invoices/${inv.id}/print`} className="font-semibold text-accent hover:underline">
                        {inv.number}
                      </Link>
                      <div className="text-xs text-slate">{inv.kind === 'opening' ? 'Opening balance' : inv.orderNumber}</div>
                    </td>
                    <td className="px-3 py-2">{formatDate(inv.invoiceDate)}</td>
                    <td className="px-3 py-2">{formatDate(inv.dueDate)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(inv.total)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(inv.paid)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{formatMoney(inv.balance)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={tone}>{label}</Badge>
                        {inv.overdueDays > 0 ? <Badge tone="danger">{inv.overdueDays} days late</Badge> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!data.invoices.length ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-slate">
                    No bills yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'ledger' ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Entry</th>
                <th className="px-3 py-2 font-medium">Detail</th>
                <th className="px-3 py-2 text-right font-medium">Debit</th>
                <th className="px-3 py-2 text-right font-medium">Credit</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((e, index) => (
                <tr key={index} className="border-t border-line">
                  <td className="px-3 py-2">{formatDate(e.date)}</td>
                  <td className="px-3 py-2">
                    {ENTRY_LABEL[e.type] || e.type} <span className="font-semibold">{e.ref}</span>
                  </td>
                  <td className="px-3 py-2 text-slate">{e.detail}</td>
                  <td className="px-3 py-2 text-right">{e.debit ? formatMoney(e.debit) : ''}</td>
                  <td className="px-3 py-2 text-right">{e.credit ? formatMoney(e.credit) : ''}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {formatMoney(Math.abs(e.balance))} {e.balance < 0 ? 'Cr' : 'Dr'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'payments' ? (
        <ul className="divide-y divide-line rounded-xl border border-line bg-white">
          {data.receipts.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm ${r.voidedAt ? 'text-slate line-through' : ''}`}>
              <span className="font-semibold">{r.number}</span>
              <span>{formatDate(r.receivedAt)}</span>
              <span>{formatMoney(r.amount)}</span>
              <span>{[r.method, r.reference].filter(Boolean).join(' · ')}</span>
              {r.voidedAt ? <span className="no-underline">Voided: {r.voidReason}</span> : canCorrect ? (
                <button type="button" onClick={() => voidReceipt(r)} className="text-sm font-semibold text-rose-700">
                  Void
                </button>
              ) : null}
            </li>
          ))}
          {!data.receipts.length ? <li className="px-3 py-4 text-sm text-slate">No payments recorded here. Payments taken on orders show in the ledger.</li> : null}
        </ul>
      ) : null}

      <PaymentForm customerId={id} invoices={data.invoices} open={dialog === 'payment'} onClose={() => setDialog('')} onDone={done} />
      <OpeningForm customerId={id} open={dialog === 'opening'} onClose={() => setDialog('')} onDone={done} />
    </div>
  );
}
