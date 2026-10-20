import { Link } from 'react-router-dom';

// Shared pieces of the printable floor sheets (job sheet, stage work list,
// task sheet). They print on A4; the toolbar is hidden on paper.

export function PrintShell({ backTo, backLabel = 'Back', toolbar, children, landscape = false }) {
  return (
    <div className="min-h-screen bg-paper p-4 text-ink print:bg-white print:p-0">
      <style>{`@media print { @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; } }`}</style>
      <div className={`mx-auto mb-3 flex flex-wrap items-center gap-2 print:hidden ${landscape ? 'max-w-6xl' : 'max-w-4xl'}`}>
        {backTo ? (
          <Link to={backTo} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
            {backLabel}
          </Link>
        ) : null}
        <button type="button" onClick={() => window.print()} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
          Print / Save as PDF
        </button>
        {toolbar}
      </div>
      {children}
    </div>
  );
}

// One sheet of paper on screen; on print each Sheet starts a new page.
export function Sheet({ children, landscape = false }) {
  return (
    <article
      className={`mx-auto mb-6 bg-white p-6 text-[13px] leading-snug shadow print:mb-0 print:max-w-none print:p-0 print:shadow-none [&:not(:last-child)]:break-after-page ${
        landscape ? 'max-w-6xl' : 'max-w-4xl'
      }`}
    >
      {children}
    </article>
  );
}

export function SheetHeader({ company, title, number, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-2">
      <div>
        <p className="text-base font-bold">{company?.legalName || 'Sinopec Polymers'}</p>
        {company?.city ? <p className="text-xs text-slate">{[company.address, company.city].filter(Boolean).join(', ')}</p> : null}
      </div>
      <div className="text-right">
        <p className="text-lg font-bold uppercase tracking-wide">{title}</p>
        {number ? <p className="font-mono text-2xl font-bold">{number}</p> : null}
        {children}
      </div>
    </header>
  );
}

// Label/value facts in a compact grid.
export function Facts({ items, cols = 4 }) {
  const shown = items.filter((f) => f && f.value !== undefined && f.value !== null && String(f.value).trim() !== '');
  if (!shown.length) return null;
  return (
    <dl className={`grid gap-x-4 gap-y-1 ${cols === 2 ? 'grid-cols-2' : cols === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4'}`}>
      {shown.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate">{f.label}</dt>
          <dd className={`break-words ${f.strong ? 'text-base font-bold' : 'font-medium'}`}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// Empty rows for the operator to write the shift's figures in by hand.
export function BlankEntryTable({ columns, rows = 6 }) {
  return (
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} className="border border-ink bg-slate-100 px-1.5 py-1 font-semibold">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i}>
            {columns.map((c) => (
              <td key={c} className="h-8 border border-ink" />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SheetFooter({ printedAt, printedBy, note }) {
  return (
    <footer className="mt-4 flex flex-wrap justify-between gap-2 border-t border-line pt-2 text-[11px] text-slate">
      <span>{note}</span>
      <span>
        Printed{printedAt ? ` ${new Date(printedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
        {printedBy ? ` by ${printedBy}` : ''}
      </span>
    </footer>
  );
}

