import { saveBlob } from '../api/client';

function cell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Downloads rows as a CSV that Excel opens directly. The byte-order mark makes
// Excel read ₹ and other non-English letters correctly.
export function downloadCsv(fileName, header, rows) {
  const text = [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
  saveBlob(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' }), fileName.endsWith('.csv') ? fileName : `${fileName}.csv`);
}

// Small CSV reader for bank statements: quoted fields, commas or tabs or
// semicolons, \r\n or \n line ends.
export function parseCsv(text) {
  const source = String(text || '').replace(/^﻿/, '');
  const firstLine = source.split(/\r?\n/, 1)[0] || '';
  const delimiter = ['\t', ';', ','].reduce((best, d) => (firstLine.split(d).length > firstLine.split(best).length ? d : best), ',');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const c = source[i];
    if (quoted) {
      if (c === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell !== ''));
}

export const STATEMENT_FIELDS = [
  { id: 'date', label: 'Date', required: true },
  { id: 'description', label: 'Description / narration' },
  { id: 'reference', label: 'Cheque / reference no.' },
  { id: 'withdrawal', label: 'Withdrawal (debit)' },
  { id: 'deposit', label: 'Deposit (credit)' },
  { id: 'amount', label: 'Amount (+ in / − out)' },
  { id: 'balance', label: 'Balance' },
];

const GUESS = {
  date: /^(txn |tran(saction)? |value )?date|^date/i,
  description: /narration|description|particulars|remarks|details/i,
  reference: /chq|cheque|ref|utr/i,
  withdrawal: /withdraw|debit|^dr\b|paid out/i,
  deposit: /deposit|credit|^cr\b|paid in/i,
  amount: /^amount|^amt/i,
  balance: /balance/i,
};

// Banks put a few lines of account details above the table: the header is
// the first row that names a date column and an amount-like column.
export function findHeader(rows) {
  const index = rows.findIndex((r) => r.some((c) => /date/i.test(c)) && r.some((c) => /withdraw|debit|deposit|credit|amount|balance/i.test(c)));
  return index === -1 ? 0 : index;
}

export function guessMapping(header) {
  const map = {};
  const used = new Set();
  for (const field of Object.keys(GUESS)) {
    const at = header.findIndex((h, i) => !used.has(i) && GUESS[field].test(h));
    if (at !== -1) {
      map[field] = String(at);
      used.add(at);
    } else map[field] = '';
  }
  // A separate debit and credit column beats a single amount column.
  if (map.withdrawal && map.deposit) map.amount = '';
  return map;
}

export function applyMapping(rows, map) {
  const pick = (r, field) => (map[field] === '' || map[field] === undefined ? '' : r[Number(map[field])] ?? '');
  return rows.map((r) => Object.fromEntries(STATEMENT_FIELDS.map((f) => [f.id, pick(r, f.id)])));
}
