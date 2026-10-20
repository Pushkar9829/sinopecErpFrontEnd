import { createContext } from 'react';
import { exportColumns, exportTable } from './exporters';
import { formatDate, formatMoney } from './sales';

// ------------------------------------------------------------------ period

const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const lastDay = (y, m) => new Date(y, m + 1, 0);

// Preset periods, worked out on the viewer's calendar (India).
export function presetPeriod(id, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  const fyStart = m >= 3 ? y : y - 1;
  const today = ymd(now);
  switch (id) {
    case 'month':
      return { from: ymd(new Date(y, m, 1)), to: today };
    case 'lastMonth':
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(lastDay(y, m - 1)) };
    case 'quarter': {
      // Financial-year quarters: Apr-Jun, Jul-Sep, Oct-Dec, Jan-Mar.
      const q = Math.floor(((m + 9) % 12) / 3);
      const startMonth = (q * 3 + 3) % 12;
      const startYear = startMonth > m ? y - 1 : y;
      return { from: ymd(new Date(startYear, startMonth, 1)), to: today };
    }
    case 'lastFy':
      return { from: `${fyStart - 1}-04-01`, to: `${fyStart}-03-31` };
    case 'fy':
    default:
      return { from: `${fyStart}-04-01`, to: today };
  }
}

export const PERIOD_PRESETS = [
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'quarter', label: 'This quarter' },
  { id: 'fy', label: 'This financial year' },
  { id: 'lastFy', label: 'Last financial year' },
  { id: 'custom', label: 'Custom dates' },
];

export const fmt = {
  money: (v) => formatMoney(v),
  int: (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN')),
  qty: (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })),
  pct: (v) => (v == null ? '—' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 })}%`),
  date: (v) => (v ? formatDate(v) : '—'),
  days: (v) => (v == null ? '—' : `${v} days`),
  month: (v) => {
    if (!v) return '—';
    const [y, m] = v.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  },
};

// Short money for chart axes: ₹950, ₹12.5K, ₹3.4L, ₹1.2Cr.
export function shortMoney(value) {
  const n = Math.abs(Number(value) || 0);
  const sign = value < 0 ? '-' : '';
  const trim = (x) => String(Number(x.toFixed(x >= 10 ? 1 : 2)));
  if (n >= 1e7) return `${sign}₹${trim(n / 1e7)}Cr`;
  if (n >= 1e5) return `${sign}₹${trim(n / 1e5)}L`;
  if (n >= 1e3) return `${sign}₹${trim(n / 1e3)}K`;
  return `${sign}₹${Math.round(n)}`;
}

// Download a report table as Excel, CSV or PDF. `subtitle` is usually the period.
export function downloadTable(format, { fileName, title, subtitle, columns, rows, totals }) {
  return exportTable(format, { fileName, title, subtitle, columns: exportColumns(columns, fmt.month), rows, totals });
}

// The period a report covers, for the downloads' subtitles.
export const ReportPeriodContext = createContext('');

export const totalOf = (rows, keys) => Object.fromEntries(keys.map((k) => [k, Math.round(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100) / 100]));
