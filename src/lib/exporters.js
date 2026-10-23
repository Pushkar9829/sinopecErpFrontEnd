import { downloadCsv } from './csv';
import { saveBlob } from '../api/client';

// Turns a table (columns + rows) into an Excel (.xlsx), CSV or PDF download.
//
// A column is { label, type, get(row) } where type is one of
// 'text' | 'number' | 'money' | 'date'. The libraries load only when someone
// downloads, so they cost nothing on normal page loads.

const NUMERIC = new Set(['number', 'money']);

// Today as YYYY-MM-DD on the viewer's calendar (for file names).
export function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const stamp = () => new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const safeName = (name) => String(name || 'export').replace(/[\\/:*?"<>|]+/g, '-');

function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function cellValue(col, row) {
  const v = col.get(row);
  if (v === undefined || v === null || v === '') return null;
  if (col.type === 'date') return toDate(v) || String(v);
  if (NUMERIC.has(col.type)) {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/[₹,\s]/g, ''));
    return Number.isFinite(n) ? n : String(v);
  }
  return typeof v === 'number' || typeof v === 'boolean' ? v : String(v);
}

function dateText(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
}

function plainText(col, value) {
  if (value === null) return '';
  if (value instanceof Date) return dateText(value);
  if (typeof value === 'number' && col.type === 'money') return value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (typeof value === 'number') return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  return String(value);
}

// ------------------------------------------------------------------ Excel

function sheetOf({ name, title, subtitle, columns, rows, totals }) {
  const bold = (value) => ({ value, fontWeight: 'bold' });
  const data = [];
  if (title) data.push([{ value: title, fontWeight: 'bold', fontSize: 13 }]);
  data.push([`${subtitle ? `${subtitle} · ` : ''}Downloaded ${stamp()}`]);
  data.push([]);
  data.push(columns.map((c) => ({ ...bold(c.label), backgroundColor: '#E2E8F0', wrap: true })));
  for (const row of rows) {
    data.push(
      columns.map((c) => {
        const value = cellValue(c, row);
        if (value === null) return null;
        // write-excel-file writes dates as UTC; pass the viewer's calendar day
        // at UTC midnight or Indian dates show a day early in Excel.
        if (value instanceof Date) return { value: new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())), type: Date, format: 'dd-mmm-yyyy' };
        if (typeof value === 'number') return { value, type: Number, format: c.type === 'money' ? '#,##0.00' : '#,##0.##' };
        return { value: String(value), type: String };
      })
    );
  }
  if (totals) {
    data.push(
      columns.map((c, i) => {
        const v = totals[c.key];
        if (i === 0) return bold('Total');
        return typeof v === 'number' ? { value: v, type: Number, fontWeight: 'bold', format: c.type === 'money' ? '#,##0.00' : '#,##0.##' } : null;
      })
    );
  }
  const widths = columns.map((c) => {
    const longest = Math.max(c.label.length, ...rows.slice(0, 200).map((r) => plainText(c, cellValue(c, r)).length));
    return { width: Math.min(48, Math.max(10, longest + 2)) };
  });
  return { data, sheet: safeName(name || 'Sheet1').slice(0, 31), columns: widths, stickyRowsCount: title ? 4 : 3 };
}

async function writeXlsx(fileName, sheets) {
  const { default: writeXlsxFile } = await import('write-excel-file/browser');
  const list = sheets.map(sheetOf);
  const blob = list.length === 1 ? await writeXlsxFile(list[0].data, { ...list[0], data: undefined }).toBlob() : await writeXlsxFile(list).toBlob();
  saveBlob(blob, `${safeName(fileName)}.xlsx`);
}

// ------------------------------------------------------------------ PDF

async function writePdf(fileName, { title, subtitle, columns, rows, totals }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const landscape = columns.length > 6;
  const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' });
  // The built-in PDF fonts have no rupee sign, so amounts are written "Rs."
  const pdfText = (text) => String(text).replace(/₹\s?/g, 'Rs. ');
  doc.setFontSize(14);
  doc.text(pdfText(title || fileName), 36, 40);
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(pdfText(`${subtitle ? `${subtitle}  ·  ` : ''}Downloaded ${stamp()}`), 36, 56);
  const body = rows.map((row) => columns.map((c) => pdfText(plainText(c, cellValue(c, row)))));
  const foot = totals ? [columns.map((c, i) => (i === 0 ? 'Total' : typeof totals[c.key] === 'number' ? pdfText(plainText(c, totals[c.key])) : ''))] : undefined;
  autoTable(doc, {
    startY: 68,
    head: [columns.map((c) => pdfText(c.label))],
    body,
    foot,
    showFoot: 'lastPage',
    theme: 'grid',
    styles: { fontSize: columns.length > 10 ? 6.5 : 8, cellPadding: 3, overflow: 'linebreak' },
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    footStyles: { fillColor: [226, 232, 240], textColor: 20, fontStyle: 'bold' },
    columnStyles: Object.fromEntries(columns.map((c, i) => [i, NUMERIC.has(c.type) ? { halign: 'right' } : {}])),
    margin: { left: 36, right: 36, bottom: 36 },
    didDrawPage: () => {
      const { width, height } = doc.internal.pageSize;
      doc.setFontSize(8);
      doc.setTextColor(120);
      doc.text(`Page ${doc.internal.getNumberOfPages()}`, width - 36, height - 18, { align: 'right' });
    },
  });
  saveBlob(doc.output('blob'), `${safeName(fileName)}.pdf`);
}

// ------------------------------------------------------------------ public

export async function exportTable(format, table) {
  const { fileName, columns, rows } = table;
  if (format === 'xlsx') return writeXlsx(fileName, [{ ...table, name: table.sheetName || table.title }]);
  if (format === 'pdf') return writePdf(fileName, table);
  const body = rows.map((row) => columns.map((c) => {
    const v = cellValue(c, row);
    return v instanceof Date ? dateText(v) : v ?? '';
  }));
  if (table.totals) body.push(columns.map((c, i) => (i === 0 ? 'Total' : table.totals[c.key] ?? '')));
  return downloadCsv(safeName(fileName), columns.map((c) => c.label), body);
}

// Several tables in one Excel file, one sheet each.
export async function exportWorkbook(fileName, sheets) {
  return writeXlsx(fileName, sheets);
}

// Report-table columns ({ key, label, format, csv(row), csvLabel, csv: false })
// to export columns. A column's own csv(row) gives the exact value to write.
const NUMBER_FORMATS = new Set(['int', 'qty', 'pct', 'days']);
export function exportColumns(columns, monthLabel) {
  return columns
    .filter((c) => c.csv !== false)
    .map((c) => {
      const type = c.format === 'money' ? 'money' : NUMBER_FORMATS.has(c.format) ? 'number' : c.format === 'date' && !c.csv ? 'date' : 'text';
      const get = c.csv || (c.format === 'month' && monthLabel ? (row) => monthLabel(row[c.key]) : (row) => row[c.key]);
      return { key: c.key, label: c.csvLabel || c.label, type, get };
    });
}
