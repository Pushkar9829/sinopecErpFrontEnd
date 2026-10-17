import { useState } from 'react';
import { billingApi } from '../api/billing.api';
import { saveBlob } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { formatMoney } from '../lib/sales';

const HEADERS = ['customer', 'number', 'date', 'amount', 'dueDate'];
const TEMPLATE = 'customer,number,date,amount,dueDate\nCUST-00001,INV-1234,2026-09-15,25000,2026-10-15\n27AABCU9603R1ZM,INV-1240,2026-09-20,18000,\n';

// CSV from Excel (File → Save as → CSV). Handles quoted cells with commas.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// Excel saves dates as 15/09/2026; the API wants 2026-09-15.
function isoDate(value) {
  const text = String(value || '').trim();
  const dmy = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return text;
}

export function OpeningImport() {
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function pick(event) {
    setError('');
    setResult(null);
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const table = parseCsv(await file.text());
    const header = (table.shift() || []).map((h) => h.trim().replace(/^﻿/, '').toLowerCase());
    const index = Object.fromEntries(HEADERS.map((h) => [h, header.indexOf(h.toLowerCase())]));
    if (index.customer < 0 || index.number < 0 || index.date < 0 || index.amount < 0) {
      setError(`The first row must have the columns: ${HEADERS.join(', ')}`);
      return;
    }
    const parsed = table.map((r) => ({
      customer: r[index.customer]?.trim(),
      number: r[index.number]?.trim(),
      date: isoDate(r[index.date]),
      amount: String(r[index.amount] || '').replace(/[,₹\s]/g, ''),
      dueDate: index.dueDate >= 0 ? isoDate(r[index.dueDate]) : '',
    }));
    setRows(parsed);
    await send(parsed, false);
  }

  async function send(list, apply) {
    setBusy(true);
    try {
      setResult(await billingApi.importOpenings(list, apply));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Import opening balances" subtitle="Unpaid bills from before the app: one row per bill." backTo="/customers" backLabel="Customers" />
      <ol className="list-decimal space-y-1 pl-6 text-sm">
        <li>
          <button type="button" className="font-semibold text-accent underline" onClick={() => saveBlob(new Blob([TEMPLATE], { type: 'text/csv' }), 'opening-balances-template.csv')}>
            Download the template
          </button>{' '}
          and fill one row per unpaid bill. <span className="text-slate">customer = customer code, GST number or exact name; dates as 2026-09-15 or 15/09/2026; due date optional.</span>
        </li>
        <li>Save it as CSV and choose it below. You see a check first; nothing is saved until you press Import.</li>
      </ol>
      <input type="file" accept=".csv,text/csv" onChange={pick} className="text-sm" />
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      {busy ? <p className="text-sm text-slate">Checking…</p> : null}
      {result?.applied ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Imported {result.added} bill(s).{result.skipped.length ? ` Skipped ${result.skipped.length}: ${result.skipped.map((s) => `row ${s.line} (${s.reason})`).join('; ')}` : ''}
        </p>
      ) : null}
      {result && !result.applied ? (
        <div className="space-y-3">
          <p className="text-sm">
            {result.rows.length} bill(s), total {formatMoney(result.total)}.{' '}
            {result.errors ? <span className="font-semibold text-red-700">{result.errors} row(s) need fixing; correct the file and choose it again.</span> : <span className="font-semibold text-emerald-800">All rows look right.</span>}
          </p>
          <div className="max-h-96 overflow-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-paper text-slate">
                <tr>
                  <th className="px-3 py-2 font-medium">Row</th>
                  <th className="px-3 py-2 font-medium">Customer</th>
                  <th className="px-3 py-2 font-medium">Bill</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Check</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.line} className={`border-t border-line ${r.problems.length ? 'bg-rose-50' : ''}`}>
                    <td className="px-3 py-1.5">{r.line}</td>
                    <td className="px-3 py-1.5">{r.customer}</td>
                    <td className="px-3 py-1.5">{r.number}</td>
                    <td className="px-3 py-1.5">{r.date}</td>
                    <td className="px-3 py-1.5 text-right">{formatMoney(r.amount)}</td>
                    <td className="px-3 py-1.5 text-xs">{r.problems.length ? r.problems.join('; ') : 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!result.errors ? (
            <button type="button" disabled={busy} onClick={() => send(rows, true)} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Import {result.rows.length} bill(s)
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
