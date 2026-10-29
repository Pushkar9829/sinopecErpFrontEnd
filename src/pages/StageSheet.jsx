import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { companyApi } from '../api/company.api';
import { productionApi } from '../api/production.api';
import { DocFootnotes, PrintShell, Sheet, SheetFooter, SheetHeader } from '../components/print/PrintKit';
import { useDocumentLayout } from '../lib/documentLayout';
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
  const doc = useDocumentLayout('stageSheet');

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
  if (!sheet || !doc.ready) return <p className="p-6 text-sm text-slate">Loading work list…</p>;
  // Layout from Settings → Documents → Stage work list.
  const renamedTitle = doc.layout?.title && doc.layout.title !== doc.layout.defaultTitle ? doc.layout.title : '';
  const facts = doc.fields({ date: formatDate(new Date()), lineCount: `${sheet.lines.length}` });
  const td = 'border border-ink px-1 py-1';
  const today = new Date(new Date().toDateString());
  const columns = doc.columns([
    { key: 'sl', label: '#', cell: (line, i) => <td key="sl" className={td}>{i + 1}</td> },
    { key: 'order', label: 'Order', cell: (line) => <td key="order" className={`${td} font-mono font-bold`}>{line.number}</td> },
    { key: 'priority', label: 'Priority', cell: (line) => <td key="priority" className={`${td} ${line.priority !== 'normal' ? 'font-bold uppercase' : ''}`}>{line.priority}</td> },
    {
      key: 'deliverBy',
      label: 'Deliver by',
      cell: (line) => {
        const late = line.deliveryDate && new Date(line.deliveryDate) < today;
        return (
          <td key="deliverBy" className={`${td} ${late ? 'font-bold' : ''}`}>
            {formatDate(line.deliveryDate)}
            {late ? ' (late)' : ''}
          </td>
        );
      },
    },
    { key: 'customer', label: 'Customer', cell: (line) => <td key="customer" className={td}>{line.customer}</td> },
    {
      key: 'product',
      label: 'Product & specs',
      cell: (line) => (
        <td key="product" className={td}>
          <p className="font-semibold">{line.product}</p>
          <p className="text-slate">
            {line.specs
              .filter((s) => s.label !== 'Product')
              .map((s) => `${s.label}: ${s.value}`)
              .join(' · ')}
          </p>
        </td>
      ),
    },
    { key: 'toMake', label: 'To make', cell: (line) => <td key="toMake" className={`whitespace-nowrap ${td} text-right`}>{formatQtyUnit(line.target, line.unit)}</td> },
    { key: 'done', label: 'Done', cell: (line) => <td key="done" className={`whitespace-nowrap ${td} text-right`}>{formatQtyUnit(line.done, line.unit)}</td> },
    { key: 'left', label: 'Left', cell: (line) => <td key="left" className={`whitespace-nowrap ${td} text-right font-bold`}>{formatQtyUnit(line.remaining, line.unit)}</td> },
    { key: 'doneToday', label: 'Done today', cell: () => <td key="doneToday" className="w-20 border border-ink" /> },
    { key: 'machine', label: 'Machine / operator', cell: () => <td key="machine" className="w-28 border border-ink" /> },
    { key: 'sign', label: 'Sign', cell: () => <td key="sign" className="w-16 border border-ink" /> },
  ]);

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
        <SheetHeader company={company} title={renamedTitle ? `${sheet.label} ${renamedTitle}` : `${sheet.label} work list`}>
          {facts.map((f) =>
            f.key === 'date' ? (
              <p key={f.key} className="text-sm font-semibold">
                {f.value}
              </p>
            ) : f.key === 'lineCount' ? (
              <p key={f.key} className="text-xs">
                {f.value} line(s) to do
              </p>
            ) : (
              <p key={f.key} className="text-xs">
                {f.label}: {f.value}
              </p>
            )
          )}
        </SheetHeader>
        {!sheet.lines.length ? (
          <p className="py-8 text-center text-slate">Nothing is waiting at {sheet.label.toLowerCase()} right now.</p>
        ) : (
          <table className="mt-3 w-full border-collapse text-left text-[11px]">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="border border-ink bg-slate-100 px-1 py-1 font-semibold">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheet.lines.map((line, i) => (
                <tr key={line.id} className="break-inside-avoid align-top">
                  {columns.map((c) => c.cell(line, i))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <DocFootnotes note={doc.footerNote} />
        {doc.block('footer') ? <SheetFooter printedAt={sheet.printedAt} printedBy={sheet.printedBy} note="Write today's figures here, then enter them in the app's register." /> : null}
      </Sheet>
    </PrintShell>
  );
}
