import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { billingApi } from '../api/billing.api';
import { confirmAction } from '../components/ui/confirm';
import { usePermission } from '../hooks/usePermission';
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

// A4 GST credit note (returns, rate differences); Print / Save as PDF makes the PDF.
export function CreditNotePrint() {
  const { id } = useParams();
  const { can, user } = usePermission();
  const canCancel = user?.role?.slug === 'super_admin' || can('accounts:update');
  const [note, setNote] = useState(null);
  const [error, setError] = useState('');

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

  if (!note) return <p className="p-6 text-sm text-slate">{error || 'Loading…'}</p>;
  const seller = note.seller || {};
  const isNote = note.kind === 'credit_note';

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
          <div>
            <h1 className="text-xl font-bold">{seller.legalName || 'Credit note'}</h1>
            <p className="whitespace-pre-line">{seller.address}</p>
            <p>{[seller.city, seller.state, seller.pinCode].filter(Boolean).join(', ')}</p>
            <p>{seller.gstin ? `GSTIN: ${seller.gstin}` : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{isNote ? 'CREDIT NOTE' : 'BAD DEBT WRITE-OFF'}</p>
            <p>
              No. <span className="font-semibold">{note.number}</span>
            </p>
            <p>Date {formatDate(note.date)}</p>
            {note.invoiceNumber ? (
              <p>
                Against invoice {note.invoiceNumber}
                {note.invoiceDate ? ` dated ${formatDate(note.invoiceDate)}` : ''}
              </p>
            ) : null}
          </div>
        </header>

        <Party title="Issued to" party={note.buyer || {}} />
        <p>
          <span className="font-semibold">Reason:</span> {note.reason}
        </p>

        {isNote ? (
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-y border-ink">
                <th className="py-1 pr-1">#</th>
                <th className="py-1 pr-1">Description</th>
                <th className="py-1 pr-1">HSN</th>
                <th className="py-1 pr-1 text-right">Qty</th>
                <th className="py-1 pr-1 text-right">Taxable</th>
                <th className="py-1 pr-1 text-right">GST %</th>
                {note.intraState ? (
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
              {note.lines.map((line, index) => (
                <tr key={index} className="border-b border-line align-top">
                  <td className="py-1 pr-1">{index + 1}</td>
                  <td className="py-1 pr-1">{line.description}</td>
                  <td className="py-1 pr-1">{line.hsnCode}</td>
                  <td className="py-1 pr-1 text-right">{line.quantity ? `${line.quantity} ${line.unit}` : '—'}</td>
                  <td className="py-1 pr-1 text-right">{rs(line.taxable)}</td>
                  <td className="py-1 pr-1 text-right">{line.gstPercent}%</td>
                  {note.intraState ? (
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
          <p className="max-w-md">
            <span className="font-semibold">Amount in words:</span> {rupeesInWords(note.total)}
          </p>
          <table className="min-w-60 text-right text-sm">
            <tbody>
              {isNote ? (
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
