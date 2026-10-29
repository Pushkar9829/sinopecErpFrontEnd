import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { DocFootnotes } from '../components/print/PrintKit';
import { blockText } from '../components/print/blockText';
import { confirmAction } from '../components/ui/confirm';
import { usePermission } from '../hooks/usePermission';
import { GST_STATES, useDocumentLayout } from '../lib/documentLayout';
import { rupeesInWords } from '../lib/money';
import { PAYMENT_TERMS, formatDate } from '../lib/sales';

const stateName = (code) => (code ? `${code} – ${GST_STATES[code] || 'State'}` : '');
const termsLabel = (id) => (id === 'cod' ? 'Cash on delivery' : PAYMENT_TERMS.find((t) => t.id === id)?.label || id || '');

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

// Tax column headings: one per tax, keeping the owner's name when renamed.
function taxHeads(column, intraState) {
  const heads = intraState ? ['CGST', 'SGST'] : ['IGST'];
  return column.label === 'CGST / SGST / IGST' ? heads : heads.map((h) => `${column.label} ${h}`);
}

// A4 tax invoice; the browser's Print / Save as PDF makes the PDF. What shows,
// and under which names, follows Settings → Documents → Tax invoice.
export function InvoicePrint() {
  const { id } = useParams();
  const { can, user } = usePermission();
  const canCancel = user?.role?.slug === 'super_admin' || can('accounts:update');
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState('');
  const doc = useDocumentLayout('taxInvoice');

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

  if (!invoice || !doc.ready) return <p className="p-6 text-sm text-slate">{error || 'Loading invoice…'}</p>;
  const seller = invoice.seller || {};
  const isSale = invoice.kind === 'sale';
  const extra = invoice.documentFields || {};
  const headerFields = doc.fields(
    {
      invoiceNo: invoice.number,
      invoiceDate: formatDate(invoice.invoiceDate),
      dueDate: formatDate(invoice.dueDate),
      orderNo: invoice.orderNumber,
      buyerRef: invoice.poNumber ? `${invoice.poNumber}${invoice.poDate ? ` dated ${formatDate(invoice.poDate)}` : ''}` : '',
      placeOfSupply: isSale ? stateName(invoice.placeOfSupply) : '',
      paymentTerms: termsLabel(invoice.paymentTerms),
      otherReferences: extra.otherReferences,
      dispatchedThrough: extra.dispatchedThrough,
      destination: extra.destination,
      deliveryTerms: extra.deliveryTerms,
    },
    extra
  );

  const cell = 'py-1 pr-1';
  const num = `${cell} text-right`;
  // Charge lines (freight...) have no quantity or rate.
  const isCharge = (line) => Boolean(line.chargeId);
  const columns = doc.columns([
    { key: 'sl', label: '#', head: cell, render: (line, index) => <td key="sl" className={cell}>{index + 1}</td> },
    {
      key: 'description',
      label: 'Product',
      head: cell,
      render: (line) => (
        <td key="description" className={cell}>
          {line.product}
          {line.productCode ? <div className="text-slate">{line.productCode}</div> : null}
        </td>
      ),
    },
    { key: 'hsn', label: 'HSN', head: cell, render: (line) => <td key="hsn" className={cell}>{line.hsnCode}</td> },
    { key: 'quantity', label: 'Qty', head: num, render: (line) => <td key="quantity" className={num}>{isCharge(line) ? '' : `${line.quantity} ${line.unit}`}</td> },
    { key: 'rate', label: 'Rate', head: num, render: (line) => <td key="rate" className={num}>{isCharge(line) ? '' : rs(line.rate)}</td> },
    { key: 'discount', label: 'Discount', head: num, render: (line) => <td key="discount" className={num}>{line.discount ? rs(line.discount) : '—'}</td> },
    { key: 'taxable', label: 'Taxable', head: num, render: (line) => <td key="taxable" className={num}>{rs(line.taxable)}</td> },
    { key: 'gstPercent', label: 'GST %', head: num, render: (line) => <td key="gstPercent" className={num}>{line.gstPercent}%</td> },
    {
      key: 'tax',
      label: 'CGST / SGST / IGST',
      head: num,
      tax: true,
      render: (line) =>
        invoice.intraState
          ? [
              <td key="cgst" className={num}>
                {rs(line.cgst)}
              </td>,
              <td key="sgst" className={num}>
                {rs(line.sgst)}
              </td>,
            ]
          : (
              <td key="igst" className={num}>
                {rs(line.igst)}
              </td>
            ),
    },
    { key: 'amount', label: 'Amount', head: 'py-1 text-right', render: (line) => <td key="amount" className="py-1 text-right">{rs(line.amount)}</td> },
  ]);

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
          {doc.block('companyDetails') ? (
            <div>
              <h1 className="text-xl font-bold">{seller.legalName || 'Invoice'}</h1>
              <p className="whitespace-pre-line">{seller.address}</p>
              <p>{[seller.city, seller.state, seller.pinCode].filter(Boolean).join(', ')}</p>
              <p>{[seller.gstin && `GSTIN: ${seller.gstin}`, seller.udyam && `UDYAM: ${seller.udyam}`].filter(Boolean).join(' · ')}</p>
              <p>{[seller.email, seller.phone].filter(Boolean).join(' · ')}</p>
            </div>
          ) : (
            <span />
          )}
          <div className="text-right">
            <p className="text-lg font-bold">{isSale ? doc.title('TAX INVOICE') : 'OPENING BALANCE BILL'}</p>
            {headerFields.map((f) => (
              <p key={f.key} className="whitespace-pre-line">
                {f.label} <span className={f.key === 'invoiceNo' ? 'font-semibold' : ''}>{f.value}</span>
              </p>
            ))}
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {doc.block('billTo') ? <Party title={blockText(doc, 'billTo', 'Bill to')} party={invoice.buyer || {}} /> : null}
          {doc.block('shipTo') && invoice.buyer?.shippingAddress && invoice.buyer.shippingAddress !== invoice.buyer.address ? (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate">{blockText(doc, 'shipTo', 'Ship to')}</p>
              <p className="whitespace-pre-line">{invoice.buyer.shippingAddress}</p>
            </div>
          ) : null}
        </div>

        {isSale ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-ink">
                {columns.map((c) =>
                  c.tax ? (
                    taxHeads(c, invoice.intraState).map((h) => (
                      <th key={h} className={c.head}>
                        {h}
                      </th>
                    ))
                  ) : (
                    <th key={c.key} className={c.head}>
                      {c.label}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={index} className="border-b border-line align-top">
                  {columns.map((c) => c.render(line, index))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="flex flex-wrap justify-between gap-4">
          <div className="max-w-md space-y-2">
            {doc.block('amountInWords') ? (
              <p>
                <span className="font-semibold">{blockText(doc, 'amountInWords', 'Amount in words')}:</span> {rupeesInWords(invoice.total)}
              </p>
            ) : null}
            {doc.block('bankDetails') && seller.bankName ? (
              <p>
                <span className="font-semibold">{blockText(doc, 'bankDetails', 'Bank')}:</span>{' '}
                {[seller.bankName, seller.bankAccountName, seller.bankAccountNumber && `A/c ${seller.bankAccountNumber}`, seller.bankIfsc && `IFSC ${seller.bankIfsc}`, seller.bankBranch].filter(Boolean).join(', ')}
              </p>
            ) : null}
            {doc.block('companyPan') && seller.pan ? (
              <p>
                <span className="font-semibold">{blockText(doc, 'companyPan', "Company's PAN")}:</span> {seller.pan}
              </p>
            ) : null}
            {doc.block('terms') && seller.invoiceTerms ? <p className="whitespace-pre-line text-xs text-slate">{seller.invoiceTerms}</p> : null}
            {doc.block('notes') && invoice.notes && isSale ? <p className="text-xs">{invoice.notes}</p> : null}
          </div>
          <table className="min-w-60 text-right text-sm">
            <tbody>
              {isSale && doc.block('totals') ? (
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

        {doc.block('signatory') ? (
          <footer className="flex justify-end pt-10">
            <p className="border-t border-ink pt-1 text-center">
              For {seller.legalName}
              <br />
              {blockText(doc, 'signatory', 'Authorised signatory')}
            </p>
          </footer>
        ) : null}
        <DocFootnotes note={doc.footerNote} computerGenerated={doc.block('computerGenerated')} />
      </article>
    </div>
  );
}
