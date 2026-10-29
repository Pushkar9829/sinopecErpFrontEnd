import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { companyApi } from '../api/company.api';
import { salesOrdersApi } from '../api/salesOrders.api';
import { GST_STATES, stateCodeOf, useDocumentLayout } from '../lib/documentLayout';
import { rupeesInWords } from '../lib/money';
import { PAYMENT_TERMS, formatDate, lineSize } from '../lib/sales';

// Customer copy of a sales order / job work, laid out like the Tally voucher
// the office sends. Every part follows Settings → Documents → Sales order.

const rs = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qty = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
const money = (n) => Math.round((Number(n) || 0) * 100) / 100;
const cell = 'border border-ink px-1.5 py-1 align-top';

function stateLine(code) {
  return code && GST_STATES[code] ? `${GST_STATES[code]}, Code : ${code}` : '';
}

function Party({ title, name, address, mobile, gstin, stateCode }) {
  return (
    <div className="border-b border-ink px-1.5 py-1 last:border-b-0">
      <p className="text-[11px]">{title}</p>
      <p className="font-bold">{name}</p>
      {address ? <p className="whitespace-pre-line">{address}</p> : null}
      {mobile ? <p>CONTACT NO- {mobile}</p> : null}
      <table className="text-left">
        <tbody>
          {gstin ? (
            <tr>
              <td className="pr-2">GSTIN/UIN</td>
              <td>: {gstin}</td>
            </tr>
          ) : null}
          {stateCode ? (
            <tr>
              <td className="pr-2">State Name</td>
              <td>: {stateLine(stateCode)}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

// Order discount spread over the lines by value, then each line (and each
// charge) taxed at its own rate, as the order's totals are worked out.
function taxRows(order) {
  const items = order.items || [];
  const values = items.map((item) => Math.max(0, (Number(item.quantity) || 0) * (Number(item.rate) || 0) - (Number(item.discount) || 0)));
  const subtotal = values.reduce((sum, v) => sum + v, 0);
  const discount = Math.min(Math.max(0, Number(order.discount) || 0), subtotal);
  const byRate = new Map();
  const add = (rate, tax) => rate > 0 && byRate.set(rate, (byRate.get(rate) || 0) + tax);
  items.forEach((item, i) => {
    const share = subtotal > 0 ? (discount * values[i]) / subtotal : 0;
    add(Number(item.taxPercent) || 0, money(((values[i] - share) * (Number(item.taxPercent) || 0)) / 100));
  });
  for (const charge of order.charges || []) add(Number(charge.gstPercent) || 0, money(((Number(charge.amount) || 0) * (Number(charge.gstPercent) || 0)) / 100));
  return { discount, rates: [...byRate.entries()].sort((a, b) => a[0] - b[0]) };
}

export function SalesOrderPrint() {
  const { id } = useParams();
  const doc = useDocumentLayout('salesOrder');
  const [order, setOrder] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([salesOrdersApi.get(id), companyApi.get()])
      .then(([nextOrder, nextCompany]) => {
        setOrder(nextOrder);
        setCompany(nextCompany);
      })
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!order || !company || !doc.ready) return <p className="p-6 text-sm text-slate">Loading sales order…</p>;

  const customer = order.customer || {};
  const buyerState = customer.stateCode || stateCodeOf(customer.gstNumber);
  const ownState = stateCodeOf(company.gstin, '07');
  const intraState = !buyerState || buyerState === ownState;
  const { discount, rates } = taxRows(order);
  const docValues = order.documentFields || {};
  const paymentTerms = PAYMENT_TERMS.find((t) => t.id === order.paymentTerms)?.label || '';
  const buyerRef = [order.customerPoNumber, order.customerPoDate ? `dt. ${formatDate(order.customerPoDate)}` : ''].filter(Boolean).join(' ');

  const header = doc.fields(
    {
      voucherNo: order.number,
      orderDate: formatDate(order.orderDate),
      paymentTerms: order.paymentTerms === 'credit' && order.creditDays ? `${paymentTerms} ${order.creditDays} days` : paymentTerms,
      buyerRef,
      otherReferences: docValues.otherReferences,
      dispatchedThrough: docValues.dispatchedThrough,
      destination: docValues.destination || (order.deliveryLocation || '').split('\n')[0],
      deliveryTerms: docValues.deliveryTerms,
      deliveryDate: order.deliveryDate ? formatDate(order.deliveryDate) : '',
    },
    docValues
  );
  // Tally leaves the voucher boxes in pairs even when empty; keep the ones the
  // owner shows so the grid reads the same on every order.
  const shownKeys = (doc.layout?.fields || []).filter((f) => f.show).map((f) => f.key);
  const boxes = shownKeys.map((key) => header.find((f) => f.key === key) || { key, label: doc.fieldLabel(key, key), value: '' });

  const columns = doc.columns([
    { key: 'sl', label: 'Sl No.', className: 'w-8 text-center' },
    { key: 'description', label: 'Description of Goods and Services' },
    { key: 'hsn', label: 'HSN/SAC', className: 'w-20' },
    { key: 'dueOn', label: 'Due on', className: 'w-20 whitespace-nowrap' },
    { key: 'quantity', label: 'Quantity', className: 'w-28 whitespace-nowrap text-right' },
    { key: 'rate', label: 'Rate', className: 'w-16 text-right' },
    { key: 'per', label: 'per', className: 'w-10' },
    { key: 'discount', label: 'Disc.', className: 'w-16 text-right' },
    { key: 'amount', label: 'Amount', className: 'w-24 whitespace-nowrap text-right' },
  ]);
  const at = (key) => columns.findIndex((c) => c.key === key);
  const span = (from, to) => Math.max(1, to - from);

  // A row with values placed under named columns; text in Description.
  function row(key, values, { right = false } = {}) {
    return (
      <tr key={key}>
        {columns.map((c) => (
          <td key={c.key} className={`border-x border-ink px-1.5 py-0.5 align-top ${c.className || ''} ${c.key === 'description' && right ? 'text-right italic font-semibold' : ''}`}>
            {values[c.key] ?? ''}
          </td>
        ))}
      </tr>
    );
  }

  const units = [...new Set((order.items || []).map((item) => String(item.unit || '').toUpperCase()))];
  const totalQty = units.length === 1 ? (order.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) : null;
  const totalSpanEnd = at('quantity') >= 0 ? at('quantity') : at('amount') >= 0 ? at('amount') : columns.length;

  return (
    <div className="min-h-screen bg-paper p-4 print:bg-white print:p-0">
      <style>{'@media print { @page { size: A4 portrait; margin: 10mm; } }'}</style>
      <div className="mx-auto mb-3 flex max-w-4xl flex-wrap items-center gap-2 print:hidden">
        <Link to={`/sales-orders/${order.id}`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
          Back
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
          Print / Save as PDF
        </button>
        <Link to="/settings/documents?doc=salesOrder" className="text-sm font-semibold text-accent">
          Change what this shows
        </Link>
      </div>

      <article className="mx-auto max-w-4xl bg-white p-6 text-[12px] leading-snug text-ink shadow print:max-w-none print:p-0 print:shadow-none">
        <h1 className="mb-1 text-center text-base font-bold uppercase tracking-wide">{doc.title(order.orderType === 'job_work' ? 'JOB WORK ORDER' : 'SALES ORDER')}</h1>
        {order.status === 'cancelled' ? <p className="mb-1 border-2 border-rose-600 py-1 text-center font-bold text-rose-700">CANCELLED</p> : null}

        <div className="grid grid-cols-2 border border-ink">
          <div className="border-r border-ink">
            {doc.block('companyDetails') ? (
              <div className="border-b border-ink px-1.5 py-1">
                <p className="text-sm font-bold">{company.legalName}</p>
                <p className="whitespace-pre-line">{company.address}</p>
                <p>{[company.city, company.pinCode && `PIN CODE - ${company.pinCode}`].filter(Boolean).join(' ')}</p>
                {company.udyam ? <p>{company.udyam}</p> : null}
                {company.gstin ? <p>GSTIN/UIN: {company.gstin}</p> : null}
                {ownState ? <p>State Name : {stateLine(ownState)}</p> : null}
                {company.email ? <p>E-Mail : {company.email}</p> : null}
                {company.phone ? <p>Phone : {company.phone}</p> : null}
              </div>
            ) : null}
            {doc.block('consignee') ? (
              <Party
                title={doc.blockLabel('consignee', 'Consignee (Ship to)')}
                name={customer.companyName || customer.name}
                address={order.shippingAddress || customer.shippingAddress || order.billingAddress}
                mobile={customer.mobile}
                gstin={customer.gstNumber}
                stateCode={buyerState}
              />
            ) : null}
            {doc.block('buyer') ? (
              <Party
                title={doc.blockLabel('buyer', 'Buyer (Bill to)')}
                name={customer.companyName || customer.name}
                address={order.billingAddress || customer.billingAddress}
                mobile={customer.mobile}
                gstin={customer.gstNumber}
                stateCode={buyerState}
              />
            ) : null}
          </div>
          <div className="grid auto-rows-min grid-cols-2">
            {boxes.map((f) => (
              <div key={f.key} className="min-h-[2.4rem] border-b border-r border-ink px-1.5 py-1 even:border-r-0">
                <p className="text-[11px]">{f.label}</p>
                <p className="whitespace-pre-line font-bold">{f.value}</p>
              </div>
            ))}
          </div>
        </div>

        <table className="w-full border-collapse border-x border-b border-ink text-left">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`${cell} text-center text-[11px] font-normal`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(order.items || []).map((item, index) => {
              const size = item.size || lineSize(item);
              const details = [size, item.productCode && item.productCode !== item.product ? item.productCode : '', item.color].filter(Boolean);
              return row(item.id || index, {
                    sl: index + 1,
                    description: (
                      <>
                        <p className="font-bold">{item.product}</p>
                        {doc.block('productDetails')
                          ? details.map((d) => (
                              <p key={d} className="pl-3 italic">
                                {d}
                              </p>
                            ))
                          : null}
                      </>
                    ),
                    hsn: item.hsnCode,
                    dueOn: order.deliveryDate ? formatDate(order.deliveryDate) : '',
                    quantity: <span className="font-bold">{`${qty(item.quantity)} ${String(item.unit || '').toUpperCase()}`}</span>,
                    rate: rs(item.rate),
                    per: String(item.unit || '').toUpperCase(),
                    discount: item.discount ? rs(item.discount) : '',
                    amount: <span className="font-bold">{rs(Math.max(0, item.quantity * item.rate - (item.discount || 0)))}</span>,
              });
            })}
            {discount > 0 ? row('discount', { description: 'Less : Discount', amount: `(-) ${rs(discount)}` }, { right: true }) : null}
            {doc.block('charges')
              ? (order.charges || []).map((charge) => row(charge.id, { description: charge.name, hsn: charge.sac, amount: rs(charge.amount) }, { right: true }))
              : null}
            {doc.block('taxRows')
              ? rates.flatMap(([rate, tax]) =>
                  intraState
                    ? [
                        row(`c${rate}`, { description: `OUTPUT CGST@${rate / 2}%`, rate: `${rate / 2} %`, amount: rs(tax / 2) }, { right: true }),
                        row(`s${rate}`, { description: `OUTPUT SGST@${rate / 2}%`, rate: `${rate / 2} %`, amount: rs(tax / 2) }, { right: true }),
                      ]
                    : [row(`i${rate}`, { description: `OUTPUT IGST@${rate}%`, rate: `${rate} %`, amount: rs(tax) }, { right: true })]
                )
              : null}
            <tr>
              {columns.map((c) => (
                <td key={c.key} className="h-16 border-x border-ink" />
              ))}
            </tr>
            {doc.block('total') ? (
              <tr className="font-bold">
                <td colSpan={span(0, totalSpanEnd)} className={`${cell} text-right font-normal`}>
                  Total
                </td>
                {columns.slice(totalSpanEnd).map((c) => (
                  <td key={c.key} className={`${cell} ${c.className || ''}`}>
                    {c.key === 'quantity' && totalQty !== null ? `${qty(totalQty)} ${units[0]}` : c.key === 'amount' ? `₹ ${rs(order.grandTotal)}` : ''}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="border-x border-b border-ink px-1.5 py-1">
          {doc.block('amountInWords') ? (
            <div className="flex justify-between gap-2">
              <div>
                <p className="text-[11px]">{doc.blockLabel('amountInWords', 'Amount Chargeable (in words)')}</p>
                <p className="font-bold">INR {rupeesInWords(order.grandTotal).replace(/^Rupees\s*/i, '')}</p>
              </div>
              <p className="text-[11px] italic">E. &amp; O.E</p>
            </div>
          ) : null}
          {doc.block('remarks') && order.remarks ? (
            <p className="mt-1">
              <span className="text-[11px]">{doc.blockLabel('remarks', 'Remarks')}: </span>
              {order.remarks}
            </p>
          ) : null}
          {doc.block('terms') && company.invoiceTerms ? (
            <div className="mt-1">
              <p className="text-[11px]">{doc.blockLabel('terms', 'Terms & conditions')}</p>
              <p className="whitespace-pre-line">{company.invoiceTerms}</p>
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-2 items-end gap-4">
            <div>
              {doc.block('companyPan') && company.pan ? (
                <p>
                  {doc.blockLabel('companyPan', "Company's PAN")} <span className="ml-6 font-bold">: {company.pan}</span>
                </p>
              ) : null}
            </div>
            <div>
              {doc.block('bankDetails') && company.bankName ? (
                <table className="text-left">
                  <tbody>
                    <tr>
                      <td colSpan={2}>{doc.blockLabel('bankDetails', "Company's Bank Details")}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">Bank Name</td>
                      <td className="font-bold">: {company.bankName}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">A/c No.</td>
                      <td className="font-bold">: {company.bankAccountNumber}</td>
                    </tr>
                    <tr>
                      <td className="pr-2">Branch &amp; IFS Code</td>
                      <td className="font-bold">: {[company.bankBranch, company.bankIfsc].filter(Boolean).join(' & ')}</td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
              {doc.block('signatory') ? (
                <div className="mt-2 border-l border-t border-ink pl-2 pt-1 text-right">
                  <p className="font-bold">for {company.legalName}</p>
                  <p className="mt-8 text-[11px]">{doc.blockLabel('signatory', 'Authorised Signatory')}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {doc.footerNote ? <p className="mt-1 whitespace-pre-line text-center text-[11px]">{doc.footerNote}</p> : null}
        {doc.block('computerGenerated') ? <p className="mt-1 text-center text-[11px]">{doc.blockLabel('computerGenerated', 'This is a Computer Generated Document')}</p> : null}
      </article>
    </div>
  );
}
