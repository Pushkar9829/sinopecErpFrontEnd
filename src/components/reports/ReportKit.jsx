import { useContext, useState } from 'react';
import { PERIOD_PRESETS, ReportPeriodContext, downloadTable, fmt, presetPeriod, shortMoney } from '../../lib/reports';
import { ExportMenu } from '../ui/ExportMenu';
import { formatDate, formatMoney } from '../../lib/sales';
import { EmptyState } from '../ui/EmptyState';

export function PeriodPicker({ preset, period, onChange }) {
  const input = 'rounded-lg border border-line bg-white px-2 py-1.5 text-sm';
  return (
    <div className="flex flex-wrap items-end gap-2 print:hidden">
      <label className="text-xs font-semibold text-slate">
        Period
        <select
          value={preset}
          onChange={(e) => onChange(e.target.value, e.target.value === 'custom' ? period : presetPeriod(e.target.value))}
          className={`${input} mt-1 block`}
        >
          {PERIOD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      {preset === 'custom' ? (
        <>
          <label className="text-xs font-semibold text-slate">
            From
            <input type="date" value={period.from} max={period.to} onChange={(e) => e.target.value && onChange('custom', { ...period, from: e.target.value })} className={`${input} mt-1 block`} />
          </label>
          <label className="text-xs font-semibold text-slate">
            To
            <input type="date" value={period.to} min={period.from} onChange={(e) => e.target.value && onChange('custom', { ...period, to: e.target.value })} className={`${input} mt-1 block`} />
          </label>
        </>
      ) : (
        <p className="pb-2 text-sm text-slate">
          {formatDate(period.from)} – {formatDate(period.to)}
        </p>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ formats

// ------------------------------------------------------------------ tiles

export function Kpi({ label, value, hint, delta, tone }) {
  const toneClass = tone === 'bad' ? 'text-red-700' : tone === 'good' ? 'text-emerald-700' : 'text-ink';
  return (
    <div className="min-w-0 rounded-xl border border-line bg-white px-3 py-3 sm:px-4 print:break-inside-avoid">
      <p className="text-sm font-semibold text-slate">{label}</p>
      <p className={`mt-1 break-words text-lg font-semibold sm:text-xl ${toneClass}`}>{value}</p>
      {delta != null || hint ? (
        <p className="mt-0.5 text-xs text-slate">
          {delta != null ? (
            <span className={delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-red-700' : ''}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '='} {Math.abs(delta)}% vs previous period
            </span>
          ) : null}
          {delta != null && hint ? ' · ' : null}
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function KpiGrid({ children }) {
  return <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">{children}</div>;
}

// ------------------------------------------------------------------ panel + table

export function Panel({ title, hint, actions, children }) {
  return (
    <section className="space-y-3 rounded-xl border border-line bg-white p-4 print:break-inside-avoid print:border-0 print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {hint ? <p className="text-xs text-slate">{hint}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2 print:hidden">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

const shown = (col, row) => (col.render ? col.render(row) : col.format ? fmt[col.format](row[col.key]) : row[col.key] ?? '—');
const NUMERIC = new Set(['money', 'int', 'qty', 'pct', 'days']);

// A table with an Excel / CSV / PDF download of exactly what it shows, and a total
// row when `totals` is given. Long tables show the first `limit` rows on
// screen (the download always has everything).
export function ReportTable({ title, hint, columns, rows, totals, fileName, empty = 'Nothing in this period', limit = 50, extraActions }) {
  const [all, setAll] = useState(false);
  const period = useContext(ReportPeriodContext);
  const visible = all ? rows : rows.slice(0, limit);
  return (
    <Panel
      title={title}
      hint={hint}
      actions={
        <>
          {extraActions}
          {fileName ? <ExportMenu onExport={(format) => downloadTable(format, { fileName, title, subtitle: period, columns, rows, totals })} disabled={!rows.length} /> : null}
        </>
      }
    >
      {!rows.length ? (
        <EmptyState title={empty} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                {columns.filter((c) => !c.csvOnly).map((c) => (
                  <th key={c.key} className={`whitespace-nowrap px-3 py-2 font-medium ${c.align === 'right' || NUMERIC.has(c.format) ? 'text-right' : ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, index) => (
                <tr key={row.id || row.key || index} className={`border-t border-line ${row.muted ? 'text-steel line-through' : ''}`}>
                  {columns.filter((c) => !c.csvOnly).map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.align === 'right' || NUMERIC.has(c.format) ? 'whitespace-nowrap text-right' : ''}`}>
                      {shown(c, row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals ? (
              <tfoot>
                <tr className="border-t-2 border-ink font-semibold">
                  {columns.filter((c) => !c.csvOnly).map((c, i) => (
                    <td key={c.key} className={`px-3 py-2 ${c.align === 'right' || NUMERIC.has(c.format) ? 'whitespace-nowrap text-right' : ''}`}>
                      {i === 0 ? 'Total' : totals[c.key] != null ? (c.format ? fmt[c.format](totals[c.key]) : totals[c.key]) : ''}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
          {rows.length > limit ? (
            <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-sm font-semibold text-accent print:hidden">
              {all ? 'Show fewer' : `Show all ${rows.length} rows`}
            </button>
          ) : null}
        </div>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------ chart

// Side-by-side bars per period for a few series in the same unit (one axis).
// Hovering a period shows its exact values above the chart.
export function GroupedBars({ data, labelKey, series, format = shortMoney, fullFormat = formatMoney, ariaLabel }) {
  const [active, setActive] = useState(null);
  if (!data.length) return <EmptyState title="Nothing in this period" />;
  const width = Math.max(320, Math.min(900, data.length * 70 + 60));
  const height = 200;
  const p = { top: 10, right: 8, bottom: 26, left: 56 };
  const innerW = width - p.left - p.right;
  const innerH = height - p.top - p.bottom;
  const raw = Math.max(0, ...data.flatMap((row) => series.map((s) => Number(row[s.key]) || 0)));
  const exp = raw > 0 ? 10 ** Math.floor(Math.log10(raw)) : 1;
  const norm = raw / exp;
  const max = raw > 0 ? (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * exp : 1;
  const slot = innerW / data.length;
  const groupW = Math.min(slot * 0.7, series.length * 22);
  const barW = Math.max(4, (groupW - (series.length - 1) * 2) / series.length);
  const y = (v) => p.top + innerH - (Math.max(0, v) / max) * innerH;
  const shownRow = active == null ? null : data[active];

  return (
    <div>
      <div className="mb-2 flex min-h-6 flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap gap-3">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-slate">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
        <p className="text-ink" aria-live="polite">
          {shownRow ? (
            <>
              <span className="font-semibold">{shownRow[`${labelKey}Label`] || shownRow[labelKey]}</span>
              {series.map((s) => (
                <span key={s.key} className="ml-3">
                  {s.label}: <span className="font-semibold">{fullFormat(shownRow[s.key])}</span>
                </span>
              ))}
            </>
          ) : (
            <span className="text-steel print:hidden">Point at a bar to see the amounts</span>
          )}
        </p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label={ariaLabel} onMouseLeave={() => setActive(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={p.left} x2={width - p.right} y1={y(max * t)} y2={y(max * t)} stroke="#e2e8f0" strokeWidth="1" />
            <text x={p.left - 6} y={y(max * t) + 3} textAnchor="end" fontSize="10" fill="#64748b">
              {format(max * t)}
            </text>
          </g>
        ))}
        {data.map((row, i) => {
          const x0 = p.left + i * slot + (slot - groupW) / 2;
          return (
            <g key={row[labelKey]}>
              {active === i ? <rect x={p.left + i * slot} y={p.top} width={slot} height={innerH} fill="#f1f5f9" /> : null}
              {series.map((s, j) => {
                const v = Number(row[s.key]) || 0;
                const top = y(v);
                const h = Math.max(0, p.top + innerH - top);
                const x = x0 + j * (barW + 2);
                const r = Math.min(4, barW / 2, h);
                // Rounded at the top only; the bottom sits flat on the baseline.
                return h > 0 ? (
                  <path key={s.key} d={`M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + h} Z`} fill={s.color} />
                ) : null;
              })}
              <text x={p.left + i * slot + slot / 2} y={height - 8} textAnchor="middle" fontSize="10" fill="#64748b">
                {row[`${labelKey}Label`] || row[labelKey]}
              </text>
              <rect
                x={p.left + i * slot}
                y={p.top}
                width={slot}
                height={innerH + p.bottom}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                tabIndex={0}
                aria-label={`${row[`${labelKey}Label`] || row[labelKey]}: ${series.map((s) => `${s.label} ${fullFormat(row[s.key])}`).join(', ')}`}
              />
            </g>
          );
        })}
        <line x1={p.left} x2={width - p.right} y1={p.top + innerH} y2={p.top + innerH} stroke="#94a3b8" strokeWidth="1" />
      </svg>
    </div>
  );
}

// Horizontal share bars (e.g. money by payment mode), labelled with values.
export function ShareBars({ rows, labelKey, valueKey, color, format = formatMoney }) {
  const total = rows.reduce((s, r) => s + (Number(r[valueKey]) || 0), 0);
  if (!rows.length || !total) return <EmptyState title="Nothing in this period" />;
  return (
    <ul className="space-y-2">
      {rows.map((r) => {
        const share = (Number(r[valueKey]) || 0) / total;
        return (
          <li key={r[labelKey]} className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="font-medium text-ink">{r[labelKey]}</span>
              <span className="text-slate">
                {format(r[valueKey])} · {Math.round(share * 1000) / 10}%
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-paper">
              <div className="h-2 rounded-full" style={{ width: `${Math.max(1, share * 100)}%`, background: color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
