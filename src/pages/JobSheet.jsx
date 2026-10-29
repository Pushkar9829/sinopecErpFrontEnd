import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { companyApi } from '../api/company.api';
import { productionApi } from '../api/production.api';
import { BlankEntryTable, DocFootnotes, Facts, PrintShell, Sheet, SheetFooter, SheetHeader } from '../components/print/PrintKit';
import { blockText } from '../components/print/blockText';
import { useDocumentLayout } from '../lib/documentLayout';
import { PRODUCTION_STAGES, formatDate, formatQtyUnit, orderTypeLabel } from '../lib/sales';

// What the operator writes in by hand on each stage's sheet.
const BLANK_COLUMNS = {
  rolling: ['Date', 'Shift', 'Machine', 'Operator', 'Material in (kg)', 'Rolls made', 'Output (kg)', 'Waste (kg)', 'Sign'],
  printing: ['Date', 'Shift', 'Machine', 'Operator', 'Input', 'Printed', 'Waste', 'Sign'],
  cutting: ['Date', 'Shift', 'Machine', 'Operator', 'Input', 'Bags cut', 'Waste', 'Sign'],
  other: ['Date', 'Shift', 'Machine', 'Done by', 'Used (note)', 'Made', 'Waste', 'Sign'],
  dispatch: ['Date', 'Quantity sent', 'Vehicle no.', 'Delivery partner', 'Handed to', 'Sign'],
};

// The order's instructions as separate points: one per line, sentence or "; " part.
function instructionPoints(text) {
  return String(text || '')
    .split(/\r?\n|;\s*|\.\s+(?=[A-Z0-9])/)
    .map((part) => part.replace(/^[\s•*-]+|[\s.]+$/g, ''))
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1));
}

// Specs as a ruled table, two label/value pairs per row.
function SpecTable({ specs }) {
  if (!specs.length) return null;
  const rows = [];
  for (let i = 0; i < specs.length; i += 2) rows.push(specs.slice(i, i + 2));
  return (
    <table className="w-full table-fixed border-collapse text-xs">
      <tbody>
        {rows.map((pair) => (
          <tr key={pair[0].label}>
            {pair.map((spec) => (
              <SpecCell key={spec.label} spec={spec} />
            ))}
            {pair.length === 1 ? <td colSpan={2} className="border border-line" /> : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SpecCell({ spec }) {
  return (
    <>
      <th className="w-[18%] border border-line bg-slate-50 px-1.5 py-1 text-left font-semibold text-slate">{spec.label}</th>
      <td className="border border-line px-1.5 py-1 font-medium">{spec.value}</td>
    </>
  );
}

// Job sheet of one order for the floor: a page per stage with what to make,
// the specs, what is done so far, and rows to fill in during the shift.
export function JobSheet() {
  const { orderId } = useParams();
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage') || '';
  const [sheet, setSheet] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const doc = useDocumentLayout('jobSheet');

  useEffect(() => {
    companyApi
      .get()
      .then(setCompany)
      .catch(() => setCompany({}));
  }, []);
  useEffect(() => {
    let live = true;
    productionApi
      .jobSheet(orderId, stage)
      .then((data) => live && setSheet(data))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [orderId, stage]);

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!sheet || !doc.ready) return <p className="p-6 text-sm text-slate">Loading job sheet…</p>;
  const { order } = sheet;
  // Layout from Settings → Documents → Job sheet.
  const renamedTitle = doc.layout?.title && doc.layout.title !== doc.layout.defaultTitle ? doc.layout.title : '';
  const facts = doc
    .fields(
      {
        customer: order.customer,
        deliverBy: formatDate(order.deliveryDate),
        priority: order.priority ? order.priority.toUpperCase() : '',
        orderDate: order.orderDate ? formatDate(order.orderDate) : '',
        customerPo: order.customerPoNumber,
      },
      order.documentFields
    )
    .map((f) => ({ label: f.label, value: f.value, strong: f.key === 'deliverBy' || (f.key === 'priority' && order.priority !== 'normal') }));
  // "All stages" leaves out stages that are already finished (pick the stage to reprint one).
  const open = sheet.stages.filter((page) => page.lines.some((line) => !line.finished));
  const pages = stage || !open.length ? sheet.stages : open;
  const skipped = sheet.stages.length - pages.length;

  return (
    <PrintShell
      backTo={`/sales-orders/${order.id}`}
      toolbar={
        <label className="text-sm font-semibold">
          Stage{' '}
          <select value={stage} onChange={(e) => setParams(e.target.value ? { stage: e.target.value } : {}, { replace: true })} className="ml-1 rounded-lg border border-line bg-white px-2 py-1.5">
            <option value="">All open stages ({pages.length} {pages.length === 1 ? 'page' : 'pages'})</option>
            {PRODUCTION_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {skipped ? <span className="ml-2 font-normal text-slate">{skipped} finished {skipped === 1 ? 'stage' : 'stages'} left out</span> : null}
        </label>
      }
    >
      {pages.map((page) => (
        <Sheet key={page.stage}>
          <SheetHeader company={company} title={renamedTitle ? `${page.label} ${renamedTitle}` : `${page.label} job sheet`} number={order.number}>
            <p className="text-xs">{orderTypeLabel(order.orderType)}</p>
          </SheetHeader>
          <div className="mt-2 space-y-3">
            <Facts cols={3} items={facts} />
            {doc.block('instructions') && order.productionInstructions ? (
              <div className="rounded border border-line bg-slate-50 px-2 py-1.5 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">{blockText(doc, 'instructions', 'Production instructions')}</p>
                <ul className="mt-0.5 list-disc space-y-0.5 pl-4 font-medium">
                  {instructionPoints(order.productionInstructions).map((point, at) => (
                    <li key={at}>{point}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {page.lines.map((line, index) => {
              const name = [line.product, line.productCode && line.productCode !== line.product ? `(${line.productCode})` : '', line.process ? `· ${line.process}` : ''].filter(Boolean).join(' ');
              if (line.finished) {
                return (
                  <p key={line.itemId} className="rounded border border-line px-2 py-1.5 text-slate">
                    <span className="font-semibold text-ink">
                      {index + 1}. {name}
                    </span>{' '}
                    · {line.closedShort ? 'closed short' : 'stage finished'} · {formatQtyUnit(line.done, line.unit)} made
                  </p>
                );
              }
              return (
              <section key={line.itemId} className="break-inside-avoid space-y-2 rounded border border-ink p-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold">
                      {index + 1}. {name}
                    </h2>
                    {doc.block('route') && line.route?.length ? (
                      <p className="text-xs text-slate">
                        Route:{' '}
                        {line.route.map((label, at) => (
                          <span key={`${label}-${at}`}>
                            {at ? ' → ' : ''}
                            <span className={label === page.label || (page.stage === 'other' && label === line.process) ? 'font-bold text-ink' : ''}>{label}</span>
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                  {doc.block('target') ? (
                    <div className="shrink-0 rounded border-2 border-ink px-2 py-0.5 text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate">{page.stage === 'dispatch' ? 'Send' : 'Make'}</p>
                      <p className="text-base font-bold leading-tight">{formatQtyUnit(line.target, line.unit)}</p>
                    </div>
                  ) : null}
                </div>
                {doc.block('specs') ? <SpecTable specs={line.specs} /> : null}
                {doc.block('specs') && line.images.length ? (
                  <div className="flex flex-wrap gap-2">
                    {line.images.map((src) => (
                      <img key={src.slice(0, 80)} src={src} alt="Artwork" className="h-28 max-w-[45%] rounded border border-line object-contain" />
                    ))}
                  </div>
                ) : null}
                {doc.block('progress') && line.entries.length ? (
                  <p className="text-xs">
                    Done so far <span className="font-bold">{formatQtyUnit(line.done, line.unit)}</span> · Left <span className="font-bold">{formatQtyUnit(line.remaining, line.unit)}</span>
                    {line.wasteText ? <> · Waste {line.wasteText}</> : null}
                  </p>
                ) : null}
                {doc.block('entries') && line.entries.length ? (
                  <table className="w-full border-collapse text-[11px]">
                    <caption className="pb-0.5 text-left font-semibold">Entered so far</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-slate">
                        <th className="py-0.5 pr-2">Date</th>
                        <th className="pr-2">Operator</th>
                        <th className="pr-2">Machine</th>
                        <th className="pr-2 text-right">In</th>
                        <th className="pr-2 text-right">Out</th>
                        <th className="pr-2 text-right">Waste</th>
                        {page.stage === 'dispatch' ? <th>Vehicle</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {line.entries.map((e, i) => (
                        <tr key={i} className="border-b border-line/60">
                          <td className="py-0.5 pr-2">{formatDate(e.date)}</td>
                          <td className="pr-2">{e.operator}</td>
                          <td className="pr-2">{e.machine}</td>
                          <td className="pr-2 text-right">{e.input || ''}</td>
                          <td className="pr-2 text-right">{e.output}</td>
                          <td className="pr-2 text-right">{e.waste ? formatQtyUnit(e.waste, e.wasteUnit || line.unit) : ''}</td>
                          {page.stage === 'dispatch' ? <td>{e.vehicle}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
                {doc.block('blankEntry') ? <BlankEntryTable columns={BLANK_COLUMNS[page.stage] || BLANK_COLUMNS.cutting} rows={page.lines.length > 2 ? 3 : 5} /> : null}
              </section>
              );
            })}
            <div className="grid grid-cols-3 gap-4 pt-4 text-xs">
              {['Operator', 'Supervisor', 'Checked by'].map((who) => (
                <p key={who} className="border-t border-ink pt-1 text-center">
                  {who}
                </p>
              ))}
            </div>
          </div>
          <DocFootnotes note={doc.footerNote} />
          {doc.block('footer') ? <SheetFooter printedAt={sheet.printedAt} printedBy={sheet.printedBy} note="Enter these figures in the app's register at the end of the shift." /> : null}
        </Sheet>
      ))}
    </PrintShell>
  );
}
