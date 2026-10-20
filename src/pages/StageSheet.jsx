import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyApi } from '../api/company.api';
import { productionApi } from '../api/production.api';
import { PrintShell, Sheet, SheetFooter, SheetHeader } from '../components/print/PrintKit';
import { formatDate, formatQtyUnit } from '../lib/sales';

// The work list of one stage, to hand to the operators: every line waiting
// at (or being worked at) that stage, urgent and soonest first, with columns
// to write today's figures in.
export function StageSheet() {
  const { stage } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState({ stage: '', data: null });
  const sheet = result.stage === stage ? result.data : null;
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
      .stageSheet(stage)
      .then((data) => live && setResult({ stage, data }))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [stage]);

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!sheet) return <p className="p-6 text-sm text-slate">Loading work list…</p>;

  return (
    <PrintShell
      landscape
      backTo={`/registers?stage=${stage}`}
      toolbar={
        sheet.stages.length > 1 ? (
          <label className="text-sm font-semibold">
            Stage{' '}
            <select value={stage} onChange={(e) => navigate(`/job-sheets/stage/${e.target.value}`, { replace: true })} className="ml-1 rounded-lg border border-line bg-white px-2 py-1.5">
              {sheet.stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : null
      }
    >
      <Sheet landscape>
        <SheetHeader company={company} title={`${sheet.label} work list`}>
          <p className="text-sm font-semibold">{formatDate(new Date())}</p>
          <p className="text-xs">{sheet.lines.length} line(s) to do</p>
        </SheetHeader>
        {!sheet.lines.length ? (
          <p className="py-8 text-center text-slate">Nothing is waiting at {sheet.label.toLowerCase()} right now.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-left text-[11px]">
            <thead>
              <tr>
                {['#', 'Order', 'Priority', 'Deliver by', 'Customer', 'Product & specs', 'To make', 'Done', 'Left', 'Done today', 'Machine / operator', 'Sign'].map((h) => (
                  <th key={h} className="border border-ink bg-slate-100 px-1 py-1 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.lines.map((line, i) => {
                const late = line.deliveryDate && new Date(line.deliveryDate) < new Date(new Date().toDateString());
                return (
                  <tr key={line.id} className="break-inside-avoid align-top">
                    <td className="border border-ink px-1 py-1">{i + 1}</td>
                    <td className="border border-ink px-1 py-1 font-mono font-bold">{line.number}</td>
                    <td className={`border border-ink px-1 py-1 ${line.priority !== 'normal' ? 'font-bold uppercase' : ''}`}>{line.priority}</td>
                    <td className={`border border-ink px-1 py-1 ${late ? 'font-bold' : ''}`}>
                      {formatDate(line.deliveryDate)}
                      {late ? ' (late)' : ''}
                    </td>
                    <td className="border border-ink px-1 py-1">{line.customer}</td>
                    <td className="border border-ink px-1 py-1">
                      <p className="font-semibold">{line.product}</p>
                      <p className="text-slate">
                        {line.specs
                          .filter((s) => s.label !== 'Product')
                          .map((s) => `${s.label}: ${s.value}`)
                          .join(' · ')}
                      </p>
                    </td>
                    <td className="whitespace-nowrap border border-ink px-1 py-1 text-right">{formatQtyUnit(line.target, line.unit)}</td>
                    <td className="whitespace-nowrap border border-ink px-1 py-1 text-right">{formatQtyUnit(line.done, line.unit)}</td>
                    <td className="whitespace-nowrap border border-ink px-1 py-1 text-right font-bold">{formatQtyUnit(line.remaining, line.unit)}</td>
                    <td className="w-20 border border-ink" />
                    <td className="w-28 border border-ink" />
                    <td className="w-16 border border-ink" />
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <SheetFooter printedAt={sheet.printedAt} printedBy={sheet.printedBy} note="Write today's figures here, then enter them in the app's register." />
      </Sheet>
    </PrintShell>
  );
}
