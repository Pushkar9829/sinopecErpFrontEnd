import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { confirmAction } from '../components/ui/confirm';
import { usePermission } from '../hooks/usePermission';
import { rupeesInWords } from '../lib/money';
import { formatDate } from '../lib/sales';

// GST state codes, for "Place of supply".
const STATES = { '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat', '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman & Nicobar', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh' };
const stateName = (code) => (code ? `${code} – ${STATES[code] || 'State'}` : '');

const rs = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Party({ title, party }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{title}</p>
      <p className="font-semibold">{party.companyName || party.name || party.legalName}</p>
      {party.address ? <p className="whitespace-pre-line">{party.address}</p> : null}
      {party.city ? <p>{[party.city, party.state, party.pinCode].filter(Boolean).join(', ')}</p> : null}
      {party.gstin ? <p>GSTIN: {party.gstin}{party.stateCode ? ` (State code ${party.stateCode})` : ''}</p> : null}
      {party.mobile || party.phone ? <p>Phone: {party.mobile || party.phone}</p> : null}
    </div>
  );
}

// A4 tax invoice; the browser's Print / Save as PDF makes the PDF.
export function InvoicePrint() {
  const { id } = useParams();
  const { can, user } = usePermission();
  const canCancel = user?.role?.slug === 'super_admin' || can('accounts:update');
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    billingApi
      .invoice(id)
      .then(setInvoice)
      .catch((err) => setError(err.message));
  }, [id]);

  async function cancel() {
    const reason = await confirmAction({ title: `Cancel invoice ${invoice.number}`, message: 'The invoice stays on record, marked cancelled. Its number is not used again.', withReason: true, confirmLabel: 'Cancel invoice', danger: true });
    if (reason === null) return;
    try {
      setInvoice({ ...invoice, ...(await billingApi.cancelInvoice(id, reason)) });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!invoice) return <p className="p-6 text-sm text-slate">{error || 'Loading invoice…'}</p>;
  const seller = invoice.seller || {};
  const isSale = invoice.kind === 'sale';

  return (
    <div className="min-h-screen bg-paper p-4 print:bg-white print:p-0">
      <div className="mx-auto mb-3 flex max-w-4xl flex-wrap items-center gap-2 print:hidden">
        <Link to={invoice.salesOrder ? `/sales-orders/${invoice.salesOrder}?tab=amounts` : `/customers/${invoice.customer}/account`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
          Back
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
          Print / Save as PDF
        </button>
        {canCancel && invoice.status === 'issued' ? (
          <button type="button" onClick={cancel} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800">
            Cancel invoice
          </button>
        ) : null}
        <span className="text-sm text-slate">
          Paid {rs(invoice.paid)} · Balance {rs(invoice.balance)}
        </span>
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>

      <article className="mx-auto max-w-4xl space-y-4 bg-white p-6 text-sm text-ink shadow print:max-w-none print:p-0 print:shadow-none">
        {invoice.status === 'cancelled' ? (
          <p className="rounded border-2 border-rose-600 px-3 py-2 text-center text-lg font-bold text-rose-700">
            CANCELLED on {formatDate(invoice.cancelledAt)}: {invoice.cancelReason}
          </p>
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink pb-3">
          <div>
            <h1 className="text-xl font-bold">{seller.legalName || 'Invoice'}</h1>
            <p className="whitespace-pre-line">{seller.address}</p>
            <p>{[seller.city, seller.state, seller.pinCode].filter(Boolean).join(', ')}</p>
            <p>{[seller.gstin && `GSTIN: ${seller.gstin}`, seller.udyam && `UDYAM: ${seller.udyam}`].filter(Boolean).join(' · ')}</p>
            <p>{[seller.email, seller.phone].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{isSale ? 'TAX INVOICE' : 'OPENING BALANCE BILL'}</p>
            <p>
              No. <span className="font-semibold">{invoice.number}</span>
            </p>
            <p>Date {formatDate(invoice.invoiceDate)}</p>
            <p>Due {formatDate(invoice.dueDate)}</p>
            {invoice.orderNumber ? <p>Order {invoice.orderNumber}</p> : null}
            {invoice.poNumber ? (
              <p>
                Buyer&apos;s order no. {invoice.poNumber}
                {invoice.poDate ? ` dated ${formatDate(invoice.poDate)}` : ''}
              </p>
            ) : null}
            {isSale ? <p>Place of supply: {stateName(invoice.placeOfSupply)}</p> : null}
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Party title="Bill to" party={invoice.buyer || {}} />
          {invoice.buyer?.shippingAddress && invoice.buyer.shippingAddress !== invoice.buyer.address ? (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">Ship to</p>
              <p className="whitespace-pre-line">{invoice.buyer.shippingAddress}</p>
            </div>
          ) : null}
        </div>

        {isSale ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-ink">
                <th className="py-1 pr-1">#</th>
                <th className="py-1 pr-1">Product</th>
                <th className="py-1 pr-1">HSN</th>
                <th className="py-1 pr-1 text-right">Qty</th>
                <th className="py-1 pr-1 text-right">Rate</th>
                <th className="py-1 pr-1 text-right">Discount</th>
                <th className="py-1 pr-1 text-right">Taxable</th>
                <th className="py-1 pr-1 text-right">GST %</th>
                {invoice.intraState ? (
                  <>
                    <th className="py-1 pr-1 text-right">CGST</th>
                    <th className="py-1 pr-1 text-right">SGST</th>
                  </>
                ) : (
                  <th className="py-1 pr-1 text-right">IGST</th>
                )}
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={index} className="border-b border-line align-top">
                  <td className="py-1 pr-1">{index + 1}</td>
                  <td className="py-1 pr-1">
                    {line.product}
                    {line.productCode ? <div className="text-slate">{line.productCode}</div> : null}
                  </td>
                  <td className="py-1 pr-1">{line.hsnCode}</td>
                  <td className="py-1 pr-1 text-right">
                    {line.quantity} {line.unit}
                  </td>
                  <td className="py-1 pr-1 text-right">{rs(line.rate)}</td>
                  <td className="py-1 pr-1 text-right">{line.discount ? rs(line.discount) : '—'}</td>
                  <td className="py-1 pr-1 text-right">{rs(line.taxable)}</td>
                  <td className="py-1 pr-1 text-right">{line.gstPercent}%</td>
                  {invoice.intraState ? (
                    <>
                      <td className="py-1 pr-1 text-right">{rs(line.cgst)}</td>
                      <td className="py-1 pr-1 text-right">{rs(line.sgst)}</td>
                    </>
                  ) : (
                    <td className="py-1 pr-1 text-right">{rs(line.igst)}</td>
                  )}
                  <td className="py-1 text-right">{rs(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="flex flex-wrap justify-between gap-4">
          <div className="max-w-md space-y-2">
            <p>
              <span className="font-semibold">Amount in words:</span> {rupeesInWords(invoice.total)}
            </p>
            {seller.bankName ? (
              <p>
                <span className="font-semibold">Bank:</span> {[seller.bankName, seller.bankAccountName, seller.bankAccountNumber && `A/c ${seller.bankAccountNumber}`, seller.bankIfsc && `IFSC ${seller.bankIfsc}`, seller.bankBranch].filter(Boolean).join(', ')}
              </p>
            ) : null}
            {seller.invoiceTerms ? <p className="whitespace-pre-line text-xs text-slate">{seller.invoiceTerms}</p> : null}
            {invoice.notes && isSale ? <p className="text-xs">{invoice.notes}</p> : null}
          </div>
          <table className="min-w-60 text-right text-sm">
            <tbody>
              {isSale ? (
                <>
                  <tr>
                    <td className="pr-4">Taxable value</td>
                    <td>{rs(invoice.taxable)}</td>
                  </tr>
                  {invoice.intraState ? (
                    <>
                      <tr>
                        <td className="pr-4">CGST</td>
                        <td>{rs(invoice.cgst)}</td>
                      </tr>
                      <tr>
                        <td className="pr-4">SGST</td>
                        <td>{rs(invoice.sgst)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="pr-4">IGST</td>
                      <td>{rs(invoice.igst)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pr-4">Round off</td>
                    <td>{rs(invoice.roundOff)}</td>
                  </tr>
                </>
              ) : null}
              <tr className="border-t border-ink text-base font-bold">
                <td className="pr-4">Total</td>
                <td>₹ {rs(invoice.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="flex justify-end pt-10">
          <p className="border-t border-ink pt-1 text-center">
            For {seller.legalName}
            <br />
            Authorised signatory
          </p>
        </footer>
      </article>
    </div>
  );
}
