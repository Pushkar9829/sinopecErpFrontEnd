import { useState } from 'react';
import { billingApi } from '../../api/billing.api';
import { formatDate, formatMoney, toDateInput } from '../../lib/sales';
import { Field, inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
const blank = () => ({ description: '', hsnCode: '', quantity: '', unit: '', rate: 0, amount: '', gstPercent: '18' });

function Footer({ busy, onClose, label }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold">
        Close
      </button>
      <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}

// Goods returned or a rate difference. Choosing a bill copies its products,
// HSN and GST; a returned quantity is priced at the bill's rate.
export function CreditNoteForm({ customerId, invoices, onClose, onDone }) {
  const [form, setForm] = useState({ date: toDateInput(new Date()), invoiceId: '', reason: '' });
  const [lines, setLines] = useState([blank()]);
  const [intraState, setIntraState] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pickInvoice(invoiceId) {
    setForm((f) => ({ ...f, invoiceId }));
    if (!invoiceId) return;
    try {
      const inv = await billingApi.invoice(invoiceId);
      setIntraState(inv.intraState !== false);
      if (inv.kind === 'sale' && inv.lines?.length) {
        setLines(inv.lines.map((l) => ({ description: l.product, hsnCode: l.hsnCode || '', quantity: '', unit: l.unit || '', rate: l.taxable && l.quantity ? num(l.taxable / l.quantity) : num(l.rate), amount: '', gstPercent: String(l.gstPercent ?? 0) })));
      }
    } catch (err) {
      setError(err.message);
    }
  }
  const setLine = (i, key, value) =>
    setLines((all) =>
      all.map((l, j) => {
        if (j !== i) return l;
        const next = { ...l, [key]: value };
        // A returned quantity is valued at the bill's rate (after discount).
        if (key === 'quantity' && l.rate) next.amount = value ? String(num(Number(value) * l.rate)) : '';
        return next;
      })
    );
  const used = lines.filter((l) => num(l.amount) > 0);
  const taxable = num(used.reduce((s, l) => s + num(l.amount), 0));
  const tax = num(used.reduce((s, l) => s + (num(l.amount) * num(l.gstPercent)) / 100, 0));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const note = await billingApi.createCreditNote(customerId, {
        ...form,
        invoiceId: form.invoiceId || undefined,
        lines: used.map((l) => ({ description: l.description, hsnCode: l.hsnCode, quantity: l.quantity, unit: l.unit, amount: num(l.amount), gstPercent: num(l.gstPercent) })),
      });
      onDone(`Credit note ${note.number} made.`, note);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open wide title="Credit note" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Against bill">
            <select value={form.invoiceId} onChange={(e) => pickInvoice(e.target.value)} className={inputClass}>
              <option value="">Not against one bill</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.number} · {formatDate(inv.invoiceDate)} · {formatMoney(inv.total)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" mark>
            <input type="date" required value={form.date} max={toDateInput(new Date())} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Reason" mark>
            <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Goods returned, rate difference…" className={inputClass} />
          </Field>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate">
              <tr>
                <th className="py-1 pr-2">Description</th>
                <th className="py-1 pr-2">HSN</th>
                <th className="py-1 pr-2">Qty returned</th>
                <th className="py-1 pr-2">Amount before GST</th>
                <th className="py-1 pr-2">GST %</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2">
                    <input value={l.description} onChange={(e) => setLine(i, 'description', e.target.value)} className={`${inputClass} mt-0 min-w-40`} />
                  </td>
                  <td className="py-1 pr-2">
                    <input value={l.hsnCode} onChange={(e) => setLine(i, 'hsnCode', e.target.value)} className={`${inputClass} mt-0 w-24`} />
                  </td>
                  <td className="py-1 pr-2">
                    <div className="flex items-center gap-1">
                      <input type="number" min="0" step="any" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} className={`${inputClass} mt-0 w-24`} />
                      <span className="text-xs text-slate">{l.unit}</span>
                    </div>
                    {l.rate ? <span className="text-xs text-slate">@ ₹{l.rate}</span> : null}
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" step="0.01" value={l.amount} onChange={(e) => setLine(i, 'amount', e.target.value)} className={`${inputClass} mt-0 w-32`} />
                  </td>
                  <td className="py-1 pr-2">
                    <input type="number" min="0" max="40" step="0.01" value={l.gstPercent} onChange={(e) => setLine(i, 'gstPercent', e.target.value)} className={`${inputClass} mt-0 w-20`} />
                  </td>
                  <td className="py-1">
                    {lines.length > 1 ? (
                      <button type="button" onClick={() => setLines(lines.filter((_, j) => j !== i))} className="text-sm text-rose-700">
                        Remove
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={() => setLines([...lines, blank()])} className="mt-1 text-sm font-semibold text-accent">
            + Add line
          </button>
        </div>
        <p className="rounded-lg bg-paper px-3 py-2 text-sm">
          Taxable {formatMoney(taxable)} · {intraState ? `CGST ${formatMoney(tax / 2)} + SGST ${formatMoney(tax / 2)}` : `IGST ${formatMoney(tax)}`} ·{' '}
          <span className="font-semibold">Credit about {formatMoney(Math.round(taxable + tax))}</span>
          <span className="block text-xs text-slate">Lines left at 0 are skipped. Sales and the GST on them come down; it shows in GSTR-1 as a credit note.</span>
        </p>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Make credit note" />
      </form>
    </Modal>
  );
}

// A debt that will not be paid, cleared to Bad debts.
export function WriteOffForm({ customerId, invoices, outstanding, onClose, onDone }) {
  const open = invoices.filter((i) => i.balance > 0.004);
  const [form, setForm] = useState({ date: toDateInput(new Date()), invoiceId: '', amount: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bill = open.find((i) => i.id === form.invoiceId);
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const note = await billingApi.writeOff(customerId, { ...form, invoiceId: form.invoiceId || undefined, amount: num(form.amount) });
      onDone(`Written off as ${note.number}.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open title="Write off a bad debt" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-slate">For money that will not come: the customer no longer owes it, and it shows as an expense (Bad debts written off). GST is not changed.</p>
        <Field label="Bill">
          <select
            value={form.invoiceId}
            onChange={(e) => {
              const b = open.find((i) => i.id === e.target.value);
              setForm({ ...form, invoiceId: e.target.value, amount: b ? String(b.balance) : form.amount });
            }}
            className={inputClass}
          >
            <option value="">Oldest bills first (owes {formatMoney(outstanding)})</option>
            {open.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.number} · balance {formatMoney(inv.balance)}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount" mark>
            <input type="number" required min="0.01" step="0.01" max={bill ? bill.balance : outstanding} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Date" mark>
            <input type="date" required value={form.date} max={toDateInput(new Date())} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <Field label="Reason" mark>
          <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Party closed down, not traceable…" className={inputClass} />
        </Field>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Write off" />
      </form>
    </Modal>
  );
}
