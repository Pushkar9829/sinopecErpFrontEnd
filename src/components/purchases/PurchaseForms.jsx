import { useEffect, useMemo, useState } from 'react';
import { companyApi } from '../../api/company.api';
import { purchasesApi } from '../../api/purchases.api';
import { suppliersApi } from '../../api/suppliers.api';
import { amount } from '../../lib/books';
import { toDateInput } from '../../lib/sales';
import { Field, inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

const num = (v) => Math.round((Number(v) || 0) * 100) / 100;
const blank = () => ({ description: '', account: '', quantity: '', unit: 'kg', rate: '', amount: '', gstPercent: '18', lot: '' });
const METHODS = [
  ['bank_transfer', 'Bank transfer'],
  ['upi', 'UPI'],
  ['cheque', 'Cheque'],
  ['cash', 'Cash'],
  ['other', 'Other'],
];

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

// Shared by the bill and debit-note forms: the lines and the GST preview.
function useLineMaths(lines, intraState) {
  return useMemo(() => {
    let taxable = 0;
    let tax = 0;
    for (const l of lines) {
      const q = num(l.quantity);
      const value = q > 0 ? num(q * num(l.rate)) : num(l.amount);
      taxable += value;
      tax += (value * (Number(l.gstPercent) || 0)) / 100;
    }
    taxable = num(taxable);
    const half = num(tax / 2);
    return { taxable, cgst: intraState ? half : 0, sgst: intraState ? half : 0, igst: intraState ? 0 : num(tax), gross: num(taxable + (intraState ? half * 2 : num(tax))) };
  }, [lines, intraState]);
}

function Lines({ lines, setLines, accounts, lots }) {
  const setLine = (i, patch) => setLines((list) => list.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      {lines.map((l, i) => (
        <div key={i} className="grid gap-2 rounded-lg border border-line p-2 sm:grid-cols-6">
          <input placeholder="What (e.g. LDPE granules)" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} className={`${inputClass} sm:col-span-2`} />
          <select value={l.account} onChange={(e) => setLine(i, { account: e.target.value })} className={`${inputClass} sm:col-span-2`}>
            <option value="">Purchases (default)</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <input type="number" min="0" step="any" placeholder="GST %" value={l.gstPercent} onChange={(e) => setLine(i, { gstPercent: e.target.value })} className={inputClass} />
          <button type="button" onClick={() => setLines((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : list))} className="rounded-lg text-sm text-slate hover:bg-paper" aria-label="Remove line">
            ✕ Remove
          </button>
          <input type="number" min="0" step="any" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} className={inputClass} />
          <input placeholder="Unit" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} className={inputClass} />
          <input type="number" min="0" step="any" placeholder="Rate" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} className={inputClass} />
          <input type="number" min="0" step="any" placeholder="or Amount" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} disabled={num(l.quantity) > 0} className={inputClass} />
          {lots ? (
            <select value={l.lot} onChange={(e) => setLine(i, { lot: e.target.value })} className={`${inputClass} sm:col-span-2`}>
              <option value="">Link a material lot (optional)</option>
              {lots.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name} · {lot.quantity} {lot.unit}
                  {lot.unitPrice == null ? ' · no price yet' : ''}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ))}
      <button type="button" onClick={() => setLines((list) => [...list, blank()])} className="text-sm font-semibold text-accent">
        + Add line
      </button>
    </div>
  );
}

function TaxPreview({ maths, intraState, roundOff = 0 }) {
  return (
    <p className="rounded-lg bg-paper px-3 py-2 text-sm">
      Taxable ₹{amount(maths.taxable) || '0.00'} ·{' '}
      {intraState ? `CGST ₹${amount(maths.cgst) || '0.00'} · SGST ₹${amount(maths.sgst) || '0.00'}` : `IGST ₹${amount(maths.igst) || '0.00'}`} ·{' '}
      <span className="font-semibold">Total ₹{amount(maths.gross + roundOff) || '0.00'}</span>
      <span className="ml-2 text-xs text-slate">({intraState ? 'same state as us' : 'other state'})</span>
    </p>
  );
}

function useSupplierPlace(supplierId) {
  const [company, setCompany] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  useEffect(() => {
    companyApi
      .get()
      .then(setCompany)
      .catch(() => setCompany({}));
    suppliersApi
      .list()
      .then((rows) => setSuppliers(rows.filter((s) => s.isActive !== false)))
      .catch(() => setSuppliers([]));
  }, []);
  const supplier = suppliers.find((s) => s.id === supplierId);
  const theirs = /^\d{2}/.test(supplier?.gstNumber || '') ? supplier.gstNumber.slice(0, 2) : '';
  const intraState = !theirs || !company?.stateCode || theirs === company.stateCode;
  return { suppliers, supplier, company, intraState };
}

// ---------------------------------------------------------------- bill

export function BillForm({ open, supplierId: fixedSupplier, onClose, onSaved }) {
  const [supplierId, setSupplierId] = useState(fixedSupplier || '');
  const { suppliers, supplier, company, intraState } = useSupplierPlace(supplierId);
  const [options, setOptions] = useState({ lineAccounts: [] });
  const [lots, setLots] = useState([]);
  const [form, setForm] = useState({ supplierBillNo: '', billDate: toDateInput(new Date()), creditDays: '', billTotal: '', notes: '' });
  const [lines, setLines] = useState([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const maths = useLineMaths(lines, intraState);
  const roundOff = form.billTotal !== '' ? num(Number(form.billTotal) - maths.gross) : num(Math.round(maths.gross) - maths.gross);

  useEffect(() => {
    purchasesApi
      .options()
      .then(setOptions)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!supplierId) return;
    purchasesApi
      .lots(supplierId)
      .then(setLots)
      .catch(() => setLots([]));
  }, [supplierId]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const bill = await purchasesApi.createBill({ ...form, supplierId, lines });
      onSaved?.(bill);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  const defaultDays = supplier?.creditDays ?? company?.defaultCreditDays ?? 30;

  return (
    <Modal open title="Enter a supplier bill" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Supplier" mark>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={Boolean(fixedSupplier)} className={inputClass} required>
              <option value="">Choose supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Their bill no." mark>
            <input value={form.supplierBillNo} onChange={(e) => setForm({ ...form, supplierBillNo: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Bill date" mark>
            <input type="date" value={form.billDate} max={toDateInput(new Date())} onChange={(e) => setForm({ ...form, billDate: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Credit days">
            <input type="number" min="0" value={form.creditDays} placeholder={String(defaultDays)} onChange={(e) => setForm({ ...form, creditDays: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Total as printed on the bill">
            <input type="number" min="0" step="0.01" value={form.billTotal} placeholder={amount(Math.round(maths.gross))} onChange={(e) => setForm({ ...form, billTotal: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Notes">
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <Lines lines={lines} setLines={setLines} accounts={options.lineAccounts} lots={supplierId ? lots : null} />
        <TaxPreview maths={maths} intraState={intraState} roundOff={roundOff} />
        {Math.abs(roundOff) > 0.004 ? <p className="text-xs text-slate">Round off ₹{amount(roundOff)}</p> : null}
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Save bill" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- payment

export function SupplierPaymentForm({ open, supplierId, bills = [], onClose, onSaved }) {
  const [options, setOptions] = useState({ moneyAccounts: [], defaultBank: '' });
  const [form, setForm] = useState({ amount: '', paidAt: toDateInput(new Date()), method: 'bank_transfer', fromAccount: '', billId: '', reference: '', note: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    purchasesApi
      .options()
      .then(setOptions)
      .catch(() => {});
  }, []);
  const openBills = bills.filter((b) => b.balance > 0.004);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await purchasesApi.pay(supplierId, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <Modal open title="Pay the supplier" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount" mark>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Paid on" mark>
            <input type="date" value={form.paidAt} max={toDateInput(new Date())} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Mode">
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className={inputClass}>
              {METHODS.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Paid from">
            <select value={form.fromAccount} onChange={(e) => setForm({ ...form, fromAccount: e.target.value })} className={inputClass}>
              <option value="">{form.method === 'cash' ? 'Cash in hand' : 'Default bank'}</option>
              {options.moneyAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Against bill">
            <select value={form.billId} onChange={(e) => setForm({ ...form, billId: e.target.value })} className={inputClass}>
              <option value="">Oldest bills first</option>
              {openBills.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.supplierBillNo || b.number} · owes ₹{amount(b.balance)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference (UTR / cheque no.)">
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className={inputClass} />
          </Field>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Save payment" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- debit note

export function DebitNoteForm({ open, supplierId, bills = [], onClose, onSaved }) {
  const { intraState: defaultIntra } = useSupplierPlace(supplierId);
  const [options, setOptions] = useState({ lineAccounts: [] });
  const [form, setForm] = useState({ date: toDateInput(new Date()), billId: '', reason: '' });
  const [lines, setLines] = useState([blank()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bill = bills.find((b) => b.id === form.billId);
  const intraState = bill?.intraState ?? defaultIntra;
  const maths = useLineMaths(lines, intraState);
  useEffect(() => {
    purchasesApi
      .options()
      .then(setOptions)
      .catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await purchasesApi.debitNote(supplierId, { ...form, lines });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <Modal open title="Debit note (return or rate difference)" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Date" mark>
            <input type="date" value={form.date} max={toDateInput(new Date())} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Against bill">
            <select value={form.billId} onChange={(e) => setForm({ ...form, billId: e.target.value })} className={inputClass}>
              <option value="">Not one bill</option>
              {bills
                .filter((b) => b.kind === 'purchase')
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.supplierBillNo || b.number} · ₹{amount(b.total)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Reason" mark>
            <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="20 kg returned, wet" className={inputClass} required />
          </Field>
        </div>
        <Lines lines={lines} setLines={setLines} accounts={options.lineAccounts} />
        <TaxPreview maths={maths} intraState={intraState} />
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Save debit note" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- opening bill

export function SupplierOpeningForm({ open, supplierId, onClose, onSaved }) {
  const [form, setForm] = useState({ number: '', date: '', dueDate: '', amount: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await purchasesApi.addOpening(supplierId, form);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!open) return null;
  return (
    <Modal open title="Unpaid bill from before the app" onClose={onClose}>
      <form onSubmit={save} className="space-y-3">
        <p className="text-sm text-slate">It counts in the opening balance of this supplier in the books.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Their bill no." mark>
            <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Amount still owed" mark>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Bill date" mark>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputClass} required />
          </Field>
          <Field label="Due date">
            <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputClass} />
          </Field>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Save" />
      </form>
    </Modal>
  );
}
