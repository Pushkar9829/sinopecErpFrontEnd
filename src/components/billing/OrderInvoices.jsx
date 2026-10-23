import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { billingApi } from '../../api/billing.api';
import { formatDate, formatMoney, toDateInput } from '../../lib/sales';
import { Badge } from '../ui/Badge';
import { inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

const money = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Same working as the API (billing priceLine): the line discount plus its
// share of the order discount, in proportion to the quantity billed now, and
// GST rounded per line. So the preview total is the invoice total.
function preview(lines, intraState) {
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  for (const line of lines) {
    const quantity = Number(line.quantity) || 0;
    if (quantity <= 0) continue;
    const fraction = line.ordered > 0 ? quantity / line.ordered : 0;
    const value = money(Math.max(0, quantity * (Number(line.rate) || 0) - money((Number(line.discount) || 0) * fraction)));
    const tax = (value * (Number(line.gstPercent) || 0)) / 100;
    taxable += value;
    if (intraState) {
      cgst += money(tax / 2);
      sgst += money(tax / 2);
    } else igst += money(tax);
  }
  const exact = money(taxable) + money(cgst) + money(sgst) + money(igst);
  return { taxable: money(taxable), cgst: money(cgst), sgst: money(sgst), igst: money(igst), total: Math.round(exact) };
}

const limitOf = (line, ahead) => (ahead ? line.aheadAvailable ?? line.available : line.available);

function CreateInvoice({ orderId, open, onClose }) {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [lines, setLines] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState(toDateInput(new Date()));
  const [creditDays, setCreditDays] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // Owner only: bill goods not dispatched yet, with a reason kept on the invoice.
  const [billAhead, setBillAhead] = useState(false);
  const [aheadReason, setAheadReason] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    billingApi
      .invoiceDraft(orderId)
      .then((data) => {
        if (!alive) return;
        setDraft(data);
        setCreditDays(String(data.creditDays ?? ''));
        setLines(data.lines.map((line) => ({ ...line, quantity: line.suggested > 0 ? String(line.suggested) : '' })));
      })
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [open, orderId]);

  const totals = useMemo(() => preview(lines, draft?.intraState), [lines, draft]);
  const tooMuch = lines.find((l) => (Number(l.quantity) || 0) > limitOf(l, billAhead) + 1e-6);
  const ahead = lines.some((l) => (Number(l.quantity) || 0) > l.available + 1e-6);
  const reasonMissing = billAhead && ahead && aheadReason.trim().length < 3;

  async function create() {
    setBusy(true);
    setError('');
    try {
      const invoice = await billingApi.createInvoice(orderId, {
        invoiceDate,
        creditDays,
        ...(billAhead && ahead ? { billAhead: true, billAheadReason: aheadReason.trim() } : {}),
        lines: lines.filter((l) => Number(l.quantity) > 0).map((l) => ({ itemId: l.itemId, quantity: Number(l.quantity) })),
      });
      navigate(`/invoices/${invoice.id}/print`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} title="Create invoice" onClose={onClose} wide>
      {!draft && !error ? <p className="text-sm text-slate">Loading…</p> : null}
      {error ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {draft ? (
        <div className="space-y-4">
          {!draft.seller.gstin ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Add your GSTIN in <Link to="/company" className="font-semibold underline">Company details</Link> first.
            </p>
          ) : null}
          <p className="text-sm text-slate">
            {draft.buyer.companyName || draft.buyer.name} · GSTIN {draft.buyer.gstin || '—'} · {draft.intraState ? 'Same state: CGST + SGST' : 'Other state: IGST'}
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm font-semibold">
              Invoice date
              <input type="date" value={invoiceDate} max={toDateInput(new Date())} onChange={(e) => setInvoiceDate(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm font-semibold">
              Credit days
              <input type="number" min="0" value={creditDays} onChange={(e) => setCreditDays(e.target.value)} className={inputClass} />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-slate">
                <tr>
                  <th className="py-1 pr-2 font-medium">Product</th>
                  <th className="py-1 pr-2 font-medium">Ordered</th>
                  <th className="py-1 pr-2 font-medium">Dispatched</th>
                  <th className="py-1 pr-2 font-medium">Invoiced</th>
                  <th className="py-1 pr-2 font-medium">Bill now</th>
                  <th className="py-1 pr-2 font-medium">Rate</th>
                  <th className="py-1 font-medium">GST</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.itemId} className="border-t border-line">
                    <td className="py-1.5 pr-2">
                      {line.product}
                      <div className="text-xs text-slate">HSN {line.hsnCode || '—'}</div>
                    </td>
                    <td className="py-1.5 pr-2">{line.ordered} {line.unit}</td>
                    <td className="py-1.5 pr-2">{line.dispatched}</td>
                    <td className="py-1.5 pr-2">{line.invoiced}</td>
                    <td className="w-28 py-1.5 pr-2">
                      <input
                        type="number"
                        min="0"
                        max={limitOf(line, billAhead)}
                        step="any"
                        value={line.quantity}
                        disabled={limitOf(line, billAhead) <= 0}
                        onChange={(e) => setLines((all) => all.map((l, at) => (at === index ? { ...l, quantity: e.target.value } : l)))}
                        className={`${inputClass} mt-0 px-2 py-1`}
                        aria-label={`Quantity to bill for ${line.product}`}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      {formatMoney(line.rate)}
                      {line.netRate !== undefined && line.netRate < line.rate - 0.004 ? <div className="text-xs text-slate">{formatMoney(line.netRate)} after discount</div> : null}
                    </td>
                    <td className="py-1.5">{line.gstPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {draft.canBillAhead ? (
            <div className="space-y-2 rounded-lg border border-line px-3 py-2 text-sm">
              <label className="flex items-center gap-2 font-semibold">
                <input type="checkbox" checked={billAhead} onChange={(e) => setBillAhead(e.target.checked)} />
                Bill ahead of dispatch (owner only)
              </label>
              {billAhead ? (
                <label className="block font-semibold">
                  Reason (kept on the invoice)
                  <input value={aheadReason} onChange={(e) => setAheadReason(e.target.value)} placeholder="e.g. goods held at the plant for the customer" className={inputClass} />
                </label>
              ) : null}
            </div>
          ) : null}
          {tooMuch ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
              {tooMuch.product}: at most {limitOf(tooMuch, billAhead)} {tooMuch.unit} can be billed{billAhead ? ' on this order' : ' (dispatched and not yet invoiced)'}.
            </p>
          ) : null}
          <p className="text-sm">
            Taxable {formatMoney(totals.taxable)} · {draft.intraState ? `CGST ${formatMoney(totals.cgst)} · SGST ${formatMoney(totals.sgst)}` : `IGST ${formatMoney(totals.igst)}`} ·{' '}
            <span className="font-semibold">Total {formatMoney(totals.total)}</span>
            <span className="text-slate"> (after line and order discounts)</span>
          </p>
          <div className="flex gap-3">
            <button type="button" disabled={busy || !draft.canInvoice || !draft.seller.gstin || Boolean(tooMuch) || reasonMissing} onClick={create} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {busy ? 'Creating…' : 'Create invoice'}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-semibold">
              Close
            </button>
          </div>
          {!draft.canInvoice ? <p className="text-sm text-slate">The order must be approved before it can be invoiced.</p> : null}
        </div>
      ) : null}
    </Modal>
  );
}

const STATE_TONE = { issued: 'info', cancelled: 'muted' };

export function OrderInvoices({ orderId, canCreate }) {
  const [invoices, setInvoices] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    billingApi
      .invoices({ order: orderId })
      .then(setInvoices)
      .catch((err) => setError(err.message));
  }, [orderId]);
  useEffect(load, [load]);

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {invoices && !invoices.length ? <p className="text-sm text-slate">No invoices yet.</p> : null}
      {invoices?.length ? (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <Link to={`/invoices/${inv.id}/print`} className="font-semibold text-accent hover:underline">
                {inv.number}
              </Link>
              <span>{formatDate(inv.invoiceDate)}</span>
              <span>Due {formatDate(inv.dueDate)}</span>
              <span className="font-semibold">{formatMoney(inv.total)}</span>
              <Badge tone={STATE_TONE[inv.status]}>{inv.status}</Badge>
            </li>
          ))}
        </ul>
      ) : null}
      {canCreate ? (
        <button type="button" onClick={() => setCreating(true)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark">
          Create invoice
        </button>
      ) : null}
      {/* Mounted only while open, so each opening starts fresh. */}
      {creating ? <CreateInvoice orderId={orderId} open onClose={() => {
          setCreating(false);
          load();
        }} /> : null}
    </div>
  );
}
