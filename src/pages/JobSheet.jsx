import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { companyApi } from '../api/company.api';
import { productionApi } from '../api/production.api';
import { BlankEntryTable, Facts, PrintShell, Sheet, SheetFooter, SheetHeader } from '../components/print/PrintKit';
import { PRODUCTION_STAGES, formatDate, formatQtyUnit, orderTypeLabel } from '../lib/sales';

// What the operator writes in by hand on each stage's sheet.
const BLANK_COLUMNS = {
  rolling: ['Date', 'Shift', 'Machine', 'Operator', 'Material in (kg)', 'Rolls made', 'Output (kg)', 'Waste (kg)', 'Sign'],
  printing: ['Date', 'Shift', 'Machine', 'Operator', 'Input', 'Printed', 'Waste', 'Sign'],
  cutting: ['Date', 'Shift', 'Machine', 'Operator', 'Input', 'Bags cut', 'Waste', 'Sign'],
  other: ['Date', 'Shift', 'Machine', 'Done by', 'Used (note)', 'Made', 'Waste', 'Sign'],
  dispatch: ['Date', 'Quantity sent', 'Vehicle no.', 'Delivery partner', 'Handed to', 'Sign'],
};

// Job sheet of one order for the floor: a page per stage with what to make,
// the specs, what is done so far, and rows to fill in during the shift.
export function JobSheet() {
  const { orderId } = useParams();
  const [params, setParams] = useSearchParams();
  const stage = params.get('stage') || '';
  const [sheet, setSheet] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');

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
  if (!sheet) return <p className="p-6 text-sm text-slate">Loading job sheet…</p>;
  const { order } = sheet;

  return (
    <PrintShell
      backTo={`/sales-orders/${order.id}`}
      toolbar={
        <label className="text-sm font-semibold">
          Stage{' '}
          <select value={stage} onChange={(e) => setParams(e.target.value ? { stage: e.target.value } : {}, { replace: true })} className="ml-1 rounded-lg border border-line bg-white px-2 py-1.5">
            <option value="">All stages ({sheet.stages.length} pages)</option>
            {PRODUCTION_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {sheet.stages.map((page) => (
        <Sheet key={page.stage}>
          <SheetHeader company={company} title={`${page.label} job sheet`} number={order.number}>
            <p className="text-xs">{orderTypeLabel(order.orderType)}</p>
          </SheetHeader>
          <div className="mt-2 space-y-3">
            <Facts
              items={[
                { label: 'Priority', value: order.priority ? order.priority.toUpperCase() : '', strong: order.priority !== 'normal' },
                { label: 'Deliver by', value: formatDate(order.deliveryDate), strong: true },
                { label: 'Customer', value: order.customer },
                { label: 'Ordered', value: formatDate(order.orderDate) },
              ]}
            />
            {order.productionInstructions ? (
              <p className="rounded border border-ink px-2 py-1.5">
                <span className="font-semibold">Instructions: </span>
                {order.productionInstructions}
              </p>
            ) : null}

            {page.lines.map((line, index) => (
              <section key={line.itemId} className="break-inside-avoid space-y-2 rounded border border-line p-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-bold">
                    Line {index + 1}: {line.product}
                    {line.process ? ` · ${line.process}` : ''}
                    {line.finished ? (
                      <span className="ml-2 rounded bg-slate-200 px-1.5 text-[11px] font-semibold">{line.closedShort ? 'Closed short' : 'Stage finished'}</span>
                    ) : null}
                  </h2>
                  <p className="text-sm">
                    Make <span className="font-bold">{formatQtyUnit(line.target, line.unit)}</span> · Done {formatQtyUnit(line.done, line.unit)} · Left{' '}
                    <span className="font-bold">{formatQtyUnit(line.remaining, line.unit)}</span>
                    {line.wasteText ? <> · Waste {line.wasteText}</> : null}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 print:grid-cols-3 sm:grid-cols-3">
                  {line.specs.map((spec) => (
                    <div key={spec.label} className="flex gap-1.5">
                      <dt className="shrink-0 text-slate">{spec.label}:</dt>
                      <dd className="font-medium">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
                {line.images.length ? (
                  <div className="flex flex-wrap gap-2">
                    {line.images.map((src) => (
                      <img key={src.slice(0, 80)} src={src} alt="Artwork" className="h-28 max-w-[45%] rounded border border-line object-contain" />
                    ))}
                  </div>
                ) : null}
                {line.entries.length ? (
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
                {line.finished ? null : <BlankEntryTable columns={BLANK_COLUMNS[page.stage] || BLANK_COLUMNS.cutting} rows={page.lines.length > 2 ? 3 : 5} />}
              </section>
            ))}
            <div className="grid grid-cols-3 gap-4 pt-4 text-xs">
              {['Operator', 'Supervisor', 'Checked by'].map((who) => (
                <p key={who} className="border-t border-ink pt-1 text-center">
                  {who}
                </p>
              ))}
            </div>
          </div>
          <SheetFooter printedAt={sheet.printedAt} printedBy={sheet.printedBy} note="Enter these figures in the app's register at the end of the shift." />
        </Sheet>
      ))}
    </PrintShell>
  );
}
