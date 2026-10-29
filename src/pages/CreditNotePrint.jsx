import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { DocFootnotes } from '../components/print/PrintKit';
import { blockText } from '../components/print/blockText';
import { confirmAction } from '../components/ui/confirm';
import { usePermission } from '../hooks/usePermission';
import { useDocumentLayout } from '../lib/documentLayout';
import { rupeesInWords } from '../lib/money';
import { formatDate } from '../lib/sales';

const rs = (n) => Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Party({ title, party }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate">{title}</p>
      <p className="font-semibold">{party.companyName || party.name || party.legalName}</p>
      {party.address ? <p className="whitespace-pre-line">{party.address}</p> : null}
      {party.gstin ? <p>GSTIN: {party.gstin}{party.stateCode ? ` (State code ${party.stateCode})` : ''}</p> : null}
      {party.mobile ? <p>Phone: {party.mobile}</p> : null}
    </div>
  );
}

function taxHeads(column, intraState) {
  const heads = intraState ? ['CGST', 'SGST'] : ['IGST'];
  return column.label === 'CGST / SGST / IGST' ? heads : heads.map((h) => `${column.label} ${h}`);
}

// A4 GST credit note (returns, rate differences); Print / Save as PDF makes the PDF.
// Layout from Settings → Documents → Credit note.
export function CreditNotePrint() {
  const { id } = useParams();
  const { can, user } = usePermission();
  const canCancel = user?.role?.slug === 'super_admin' || can('accounts:update');
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');
  const doc = useDocumentLayout('creditNote');

  useEffect(() => {
    billingApi
      .creditNote(id)
      .then(setNote)
      .catch((err) => setError(err.message));
  }, [id]);

  async function cancel() {
    const reason = await confirmAction({ title: `Cancel ${note.number}`, message: 'It stays on record, marked cancelled, and the customer owes the amount again.', withReason: true, confirmLabel: 'Cancel', danger: true });
    if (reason === null) return;
    try {
      setNote({ ...note, ...(await billingApi.cancelCreditNote(id, reason)) });
    } catch (err) {
      setError(err.message);
    }
  }

  if (!note || !doc.ready) return <p className="p-6 text-sm text-slate">{error || 'Loading…'}</p>;
  const seller = note.seller || {};
  const isNote = note.kind === 'credit_note';
  const headerFields = doc.fields({
    noteNo: note.number,
    noteDate: formatDate(note.date),
    againstInvoice: note.invoiceNumber ? `${note.invoiceNumber}${note.invoiceDate ? ` dated ${formatDate(note.invoiceDate)}` : ''}` : '',
  });
  const showReason = doc.field('reason');

  const cell = 'py-1 pr-1';
  const num = `${cell} text-right`;
  const columns = doc.columns([
    { key: 'sl', label: '#', head: cell, render: (line, index) => <td key="sl" className={cell}>{index + 1}</td> },
    { key: 'description', label: 'Description', head: cell, render: (line) => <td key="description" className={cell}>{line.description}</td> },
    { key: 'hsn', label: 'HSN', head: cell, render: (line) => <td key="hsn" className={cell}>{line.hsnCode}</td> },
    { key: 'quantity', label: 'Qty', head: num, render: (line) => <td key="quantity" className={num}>{line.quantity ? `${line.quantity} ${line.unit}` : '—'}</td> },
    { key: 'taxable', label: 'Taxable', head: num, render: (line) => <td key="taxable" className={num}>{rs(line.taxable)}</td> },
    { key: 'gstPercent', label: 'GST %', head: num, render: (line) => <td key="gstPercent" className={num}>{line.gstPercent}%</td> },
    {
      key: 'tax',
      label: 'CGST / SGST / IGST',
      head: num,
      tax: true,
      render: (line) =>
        note.intraState
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
        <Link to={`/customers/${note.customer}/account?tab=notes`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
          Back
        </Link>
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
          Print / Save as PDF
        </button>
        {canCancel && note.status === 'issued' ? (
          <button type="button" onClick={cancel} className="rounded-lg border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-800">
            Cancel
          </button>
        ) : null}
        {error ? <span className="text-sm text-red-700">{error}</span> : null}
      </div>

      <article className="mx-auto max-w-4xl space-y-4 bg-white p-6 text-sm text-ink shadow print:max-w-none print:p-0 print:shadow-none">
        {note.status === 'cancelled' ? (
          <p className="rounded border-2 border-rose-600 px-3 py-2 text-center text-lg font-bold text-rose-700">
            CANCELLED on {formatDate(note.cancelledAt)}: {note.cancelReason}
          </p>
        ) : null}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink pb-3">
          {doc.block('companyDetails') ? (
            <div>
              <h1 className="text-xl font-bold">{seller.legalName || 'Credit note'}</h1>
              <p className="whitespace-pre-line">{seller.address}</p>
              <p>{[seller.city, seller.state, seller.pinCode].filter(Boolean).join(', ')}</p>
              <p>{seller.gstin ? `GSTIN: ${seller.gstin}` : ''}</p>
            </div>
          ) : (
            <span />
          )}
          <div className="text-right">
            <p className="text-lg font-bold">{isNote ? doc.title('CREDIT NOTE') : 'BAD DEBT WRITE-OFF'}</p>
            {headerFields.map((f) => (
              <p key={f.key} className="whitespace-pre-line">
                {f.label} <span className={f.key === 'noteNo' ? 'font-semibold' : ''}>{f.value}</span>
              </p>
            ))}
          </div>
        </header>

        {doc.block('issuedTo') ? <Party title={blockText(doc, 'issuedTo', 'Issued to')} party={note.buyer || {}} /> : null}
        {showReason && note.reason ? (
          <p>
            <span className="font-semibold">{doc.fieldLabel('reason', 'Reason')}:</span> {note.reason}
          </p>
        ) : null}

        {isNote ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-ink">
                {columns.map((c) =>
                  c.tax ? (
                    taxHeads(c, note.intraState).map((h) => (
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
              {note.lines.map((line, index) => (
                <tr key={index} className="border-b border-line align-top">
                  {columns.map((c) => c.render(line, index))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}

        <div className="flex flex-wrap justify-between gap-4">
          {doc.block('amountInWords') ? (
            <p className="max-w-md">
              <span className="font-semibold">{blockText(doc, 'amountInWords', 'Amount in words')}:</span> {rupeesInWords(note.total)}
            </p>
          ) : (
            <span />
          )}
          <table className="min-w-60 text-right text-sm">
            <tbody>
              {isNote && doc.block('totals') ? (
                <>
                  <tr>
                    <td className="pr-4">Taxable value</td>
                    <td>{rs(note.taxable)}</td>
                  </tr>
                  {note.intraState ? (
                    <>
                      <tr>
                        <td className="pr-4">CGST</td>
                        <td>{rs(note.cgst)}</td>
                      </tr>
                      <tr>
                        <td className="pr-4">SGST</td>
                        <td>{rs(note.sgst)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="pr-4">IGST</td>
                      <td>{rs(note.igst)}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="pr-4">Round off</td>
                    <td>{rs(note.roundOff)}</td>
                  </tr>
                </>
              ) : null}
              <tr className="border-t border-ink text-base font-bold">
                <td className="pr-4">Total credit</td>
                <td>₹ {rs(note.total)}</td>
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
