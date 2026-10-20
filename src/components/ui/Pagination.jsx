const PAGE_SIZES = [10, 25, 50, 100];

// Page numbers to show: first, last, and a window around the current page,
// with gaps marked null (e.g. 1 … 4 5 6 … 20).
function pageList(page, totalPages) {
  const pages = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= totalPages - 2) [totalPages - 1, totalPages - 2, totalPages - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out = [];
  for (const p of sorted) {
    if (out.length && p - out[out.length - 1] > 1) out.push(null);
    out.push(p);
  }
  return out;
}

const button = 'inline-flex min-w-9 items-center justify-center rounded-lg border px-2.5 py-1.5 text-sm font-semibold disabled:opacity-40';

// Shows "21–30 of 245", page numbers, and (when onPageSize is given) a
// rows-per-page choice.
export function Pagination({ page, totalPages, total, pageSize, onPage, onPageSize, pageSizes = PAGE_SIZES }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-slate print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <p>
          {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
        </p>
        {onPageSize ? (
          <label className="flex items-center gap-1.5">
            Rows
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="rounded-lg border border-line bg-white px-2 py-1 text-sm text-ink">
              {[...new Set([...pageSizes, pageSize])].sort((a, b) => a - b).map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {totalPages > 1 ? (
        <nav className="flex flex-wrap items-center gap-1" aria-label="Pages">
          <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={`${button} border-line bg-white text-ink hover:bg-paper`}>
            Prev
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === null ? (
              <span key={`gap-${i}`} className="px-1">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${button} ${p === page ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-ink hover:bg-paper'}`}
              >
                {p}
              </button>
            )
          )}
          <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={`${button} border-line bg-white text-ink hover:bg-paper`}>
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
