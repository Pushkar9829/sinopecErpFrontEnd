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
