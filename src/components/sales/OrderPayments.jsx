import { useState } from 'react';
import { salesOrdersApi } from '../../api/salesOrders.api';
import { PAYMENT_METHODS, formatDate, formatMoney, toDateInput } from '../../lib/sales';
import { confirmAction } from '../ui/ConfirmHost';
import { Field, inputClass } from '../ui/FormField';

const methodLabel = (id) => PAYMENT_METHODS.find((item) => item.id === id)?.label || id || '—';

export function OrderPayments({ order, canRecord, onChanged }) {
  const due = Number(order.remainingAmount) || 0;
  const open = !['draft', 'cancelled'].includes(order.status);
  const [form, setForm] = useState({
    amount: '',
    method: order.paymentMethod || 'bank_transfer',
    receivedAt: toDateInput(new Date()),
    reference: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const payments = order.payments || [];
  const canRemove = canRecord && order.status !== 'cancelled';

  function set(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) {
      setError('Enter an amount more than 0');
      return;
    }
    if (amount > due + 0.001) {
      setError(`Amount cannot be more than the ${formatMoney(due)} still due`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await salesOrdersApi.recordPayment(order.id, { ...form, amount });
      setForm((current) => ({ ...current, amount: '', reference: '' }));
      await onChanged('Payment recorded.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(payment) {
    const ok = await confirmAction({
      message: `Remove the payment of ${formatMoney(payment.amount)} received ${formatDate(payment.receivedAt)}? The balance goes back up.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    setError('');
    try {
      await salesOrdersApi.removePayment(order.id, payment.id);
      await onChanged('Payment removed.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      {payments.length ? (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table data-no-row-select className="min-w-full text-left text-sm">
            <thead className="bg-paper text-ink">
              <tr>
                <th className="px-3 py-2 font-semibold">Received</th>
                <th className="px-3 py-2 font-semibold">Amount</th>
                <th className="px-3 py-2 font-semibold">Method</th>
                <th className="px-3 py-2 font-semibold">Reference</th>
                <th className="px-3 py-2 font-semibold">Recorded by</th>
                {canRemove ? <th className="px-3 py-2" /> : null}
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-line">
                  <td className="px-3 py-2">{formatDate(payment.receivedAt)}</td>
                  <td className="px-3 py-2 font-semibold">{formatMoney(payment.amount)}</td>
                  <td className="px-3 py-2">{methodLabel(payment.method)}</td>
                  <td className="px-3 py-2">{payment.reference || '—'}</td>
                  <td className="px-3 py-2 text-slate">{payment.byName || '—'}</td>
                  {canRemove ? (
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove(payment)} className="text-sm font-semibold text-red-700 hover:underline">
                        Remove
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-slate">No payments recorded yet.</p>
      )}

      {canRecord && open && due > 0 ? (
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr_auto] lg:items-end">
          <Field label={`Amount (due ${formatMoney(due)})`}>
            <input type="number" min="0" step="any" inputMode="decimal" value={form.amount} onChange={(event) => set('amount', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Method">
            <select value={form.method} onChange={(event) => set('method', event.target.value)} className={inputClass}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Received on">
            <input type="date" value={form.receivedAt} onChange={(event) => set('receivedAt', event.target.value)} className={inputClass} />
          </Field>
          <Field label="Reference">
            <input value={form.reference} onChange={(event) => set('reference', event.target.value)} placeholder="UTR, cheque no." className={inputClass} />
          </Field>
          <div className="flex gap-2">
            <button type="button" onClick={() => set('amount', String(due))} className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:bg-paper">
              Full
            </button>
            <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60">
              {busy ? 'Saving…' : 'Record payment'}
            </button>
          </div>
        </form>
      ) : null}
      {canRecord && !open ? <p className="text-sm text-slate">Payments can be recorded once the order is submitted.</p> : null}
      {open && due <= 0 ? <p className="text-sm font-semibold text-emerald-700">Fully paid.</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
