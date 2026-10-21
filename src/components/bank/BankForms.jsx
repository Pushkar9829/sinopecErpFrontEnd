import { useEffect, useMemo, useState } from 'react';
import { bankApi } from '../../api/bank.api';
import { amount } from '../../lib/books';
import { STATEMENT_FIELDS, applyMapping, findHeader, guessMapping, parseCsv } from '../../lib/csv';
import { formatDate, toDateInput } from '../../lib/sales';
import { Field, inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

const num = (v) => Math.round((Number(v) || 0) * 100) / 100;

function Footer({ busy, onClose, label, disabled = false }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold">
        Close
      </button>
      <button type="submit" disabled={busy || disabled} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}

function useSubmit(action, onDone) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await action();
      onDone?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, submit };
}

// The dialogs below are mounted only while open, so each opening starts clean.

// ---------------------------------------------------------------- expense

export function ExpenseForm({ open, onClose, onSaved }) {
  const [options, setOptions] = useState({ heads: [], moneyAccounts: [], gstRates: [] });
  const empty = () => ({ date: toDateInput(new Date()), paidFrom: '', account: '', amount: '', gstMode: 'none', gstRate: '18', paidTo: '', billNo: '', narration: '' });
  const [form, setForm] = useState(empty);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  useEffect(() => {
    if (!open) return;
    bankApi
      .expenseOptions()
      .then((o) => {
        setOptions(o);
        setForm((f) => ({ ...f, paidFrom: f.paidFrom || o.moneyAccounts.find((a) => a.group === 'cash')?.id || o.moneyAccounts[0]?.id || '' }));
      })
      .catch(() => {});
  }, [open]);
  const tax = form.gstMode === 'none' ? 0 : num((num(form.amount) * num(form.gstRate)) / 100);
  const { busy, error, submit } = useSubmit(
    () =>
      bankApi.createExpense({
        date: form.date,
        paidFrom: form.paidFrom,
        account: form.account,
        amount: form.amount,
        gst: { mode: form.gstMode, rate: Number(form.gstRate) },
        paidTo: form.paidTo,
        billNo: form.billNo,
        narration: form.narration,
      }),
    () => {
      onSaved?.();
      onClose();
    }
  );
  const groups = useMemo(() => {
    const map = new Map();
    for (const h of options.heads) {
      if (!map.has(h.groupLabel)) map.set(h.groupLabel, []);
      map.get(h.groupLabel).push(h);
    }
    return [...map.entries()];
  }, [options.heads]);
  if (!open) return null;
  return (
    <Modal open title="New expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Spent on" mark>
            <select value={form.account} onChange={set('account')} className={inputClass} required>
              <option value="">Choose the expense head</option>
              {groups.map(([label, list]) => (
                <optgroup key={label} label={label}>
                  {list.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Paid from" mark>
            <select value={form.paidFrom} onChange={set('paidFrom')} className={inputClass} required>
              {options.moneyAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (before GST)" mark>
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={set('amount')} className={inputClass} required />
          </Field>
          <Field label="Date" mark>
            <input type="date" value={form.date} max={toDateInput(new Date())} onChange={set('date')} className={inputClass} required />
          </Field>
          <Field label="GST on the bill">
            <select value={form.gstMode} onChange={set('gstMode')} className={inputClass}>
              <option value="none">No GST / not claimable</option>
              <option value="intra">CGST + SGST (same state)</option>
              <option value="inter">IGST (other state)</option>
            </select>
          </Field>
          {form.gstMode !== 'none' ? (
            <Field label="GST rate">
              <select value={form.gstRate} onChange={set('gstRate')} className={inputClass}>
                {options.gstRates
                  .filter((r) => r > 0)
                  .map((r) => (
                    <option key={r} value={r}>
                      {r}%
                    </option>
                  ))}
              </select>
            </Field>
          ) : (
            <div />
          )}
          <Field label="Paid to">
            <input value={form.paidTo} onChange={set('paidTo')} placeholder="Shop, person or company" className={inputClass} />
          </Field>
          <Field label="Their bill / receipt no.">
            <input value={form.billNo} onChange={set('billNo')} className={inputClass} />
          </Field>
        </div>
        <Field label="Note">
          <input value={form.narration} onChange={set('narration')} placeholder="Written for you if left blank" className={inputClass} />
        </Field>
        <p className="rounded-lg bg-paper px-3 py-2 text-sm">
          {form.gstMode === 'intra' ? `CGST ₹${amount(tax / 2) || '0.00'} + SGST ₹${amount(tax / 2) || '0.00'} · ` : ''}
          {form.gstMode === 'inter' ? `IGST ₹${amount(tax) || '0.00'} · ` : ''}
          <span className="font-semibold">Total paid ₹{amount(num(form.amount) + tax) || '0.00'}</span>
          {tax ? <span className="block text-xs text-slate">The GST goes to input credit, to set off against GST on sales.</span> : null}
        </p>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Save expense" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- bank account

export function AddBankForm({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', group: 'bank', notes: '' });
  const { busy, error, submit } = useSubmit(
    () => bankApi.addAccount(form),
    () => {
      setForm({ name: '', group: 'bank', notes: '' });
      onSaved?.();
      onClose();
    }
  );
  if (!open) return null;
  return (
    <Modal open title="Add a cash or bank account" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" mark>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. HDFC current a/c 1234" className={inputClass} required />
        </Field>
        <Field label="Kind">
          <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} className={inputClass}>
            <option value="bank">Bank account</option>
            <option value="cash">Cash (e.g. petty cash at the factory)</option>
          </select>
        </Field>
        <Field label="Notes (account no., branch)">
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
        </Field>
        <p className="text-sm text-slate">Its opening balance goes in Books → Setup & opening balances.</p>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <Footer busy={busy} onClose={onClose} label="Add account" />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------- statement import

export function StatementImport({ open, account, onClose, onDone }) {
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [headerAt, setHeaderAt] = useState(0);
  const [map, setMap] = useState({});
  const [result, setResult] = useState(null);
  const [readError, setReadError] = useState('');

  function read(file) {
    if (!file) return;
    setReadError('');
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setReadError('Choose a CSV file. In Excel: File → Save As → CSV, then choose that file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(reader.result);
      if (parsed.length < 2) {
        setReadError('No lines found in that file.');
        return;
      }
      const at = findHeader(parsed);
      setRows(parsed);
      setFileName(file.name);
      setHeaderAt(at);
      setMap(guessMapping(parsed[at]));
    };
    reader.readAsText(file);
  }

  const header = rows ? rows[headerAt] || [] : [];
  const body = rows ? rows.slice(headerAt + 1) : [];
  const mapped = useMemo(() => (rows ? applyMapping(body, map) : []), [rows, body, map]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = map.date !== '' && (map.amount !== '' || (map.withdrawal !== '' && map.deposit !== ''));
  const { busy, error, submit } = useSubmit(() => bankApi.importStatement(account.id, mapped), (r) => {
    setResult(r);
    onDone?.();
  });
  if (!open) return null;
  return (
    <Modal open wide title={`Import statement: ${account?.name || ''}`} onClose={onClose}>
      {result ? (
        <div className="space-y-3 text-sm">
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">
            {result.added} line(s) added, {result.matched} matched automatically.
            {result.duplicates ? ` ${result.duplicates} already imported earlier, skipped.` : ''}
          </p>
          {result.problems?.length ? (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
              <p className="font-semibold">{result.skipped} line(s) skipped:</p>
              <ul className="list-disc pl-5">
                {result.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm text-slate">
            Download the statement from net banking as CSV (or Excel, then save it as CSV). Lines already imported are skipped, so overlapping dates are fine.
          </p>
          <input type="file" accept=".csv,.txt,text/csv" onChange={(e) => read(e.target.files?.[0])} className="block text-sm" />
          {readError ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{readError}</p> : null}
          {rows ? (
            <>
              <div className="grid gap-2 sm:grid-cols-4">
                <label className="text-xs font-semibold text-slate">
                  Column names are on row
                  <select value={headerAt} onChange={(e) => {
                    const at = Number(e.target.value);
                    setHeaderAt(at);
                    setMap(guessMapping(rows[at]));
                  }} className={`${inputClass} mt-1`}>
                    {rows.slice(0, 30).map((r, i) => (
                      <option key={i} value={i}>
                        {i + 1}: {r.slice(0, 3).join(' | ').slice(0, 40)}
                      </option>
                    ))}
                  </select>
                </label>
                {STATEMENT_FIELDS.map((f) => (
                  <label key={f.id} className="text-xs font-semibold text-slate">
                    {f.label}
                    <select value={map[f.id] ?? ''} onChange={(e) => setMap({ ...map, [f.id]: e.target.value })} className={`${inputClass} mt-1`}>
                      <option value="">—</option>
                      {header.map((h, i) => (
                        <option key={i} value={String(i)}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate">
                {fileName}: {body.length} line(s). Choose Date, and either Withdrawal + Deposit or one Amount column. Preview:
              </p>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-paper text-slate">
                    <tr>
                      {STATEMENT_FIELDS.map((f) => (
                        <th key={f.id} className="px-2 py-1">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapped.slice(0, 6).map((r, i) => (
                      <tr key={i} className="border-t border-line">
                        {STATEMENT_FIELDS.map((f) => (
                          <td key={f.id} className="max-w-48 truncate px-2 py-1">
                            {r[f.id]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
          <Footer busy={busy} onClose={onClose} label={`Import ${body.length || ''} line(s)`} disabled={!rows || !ready} />
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- match by hand

export function MatchLine({ line, accounts, onClose, onDone }) {
  const [options, setOptions] = useState(null);
  const [account, setAccount] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!line) return;
    bankApi
      .candidates(line.id)
      .then(setOptions)
      .catch((err) => setError(err.message));
  }, [line]);
  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
      onDone?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  if (!line) return null;
  const isIn = line.deposit > 0;
  // Tax, sales and purchase accounts are posted by their own documents.
  const SYSTEM_ONLY = ['sales', 'purchases', 'round_off', 'output_cgst', 'output_sgst', 'output_igst', 'input_cgst', 'input_sgst', 'input_igst'];
  const heads = accounts.filter((a) => !a.party && a.isActive !== false && !['bank', 'cash'].includes(a.group) && !SYSTEM_ONLY.includes(a.key));
  return (
    <Modal open wide title="Match a bank line" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <p className="rounded-lg bg-paper px-3 py-2">
          {formatDate(line.date)} · <span className="font-semibold">{isIn ? 'Deposit' : 'Withdrawal'} ₹{amount(line.deposit || line.withdrawal)}</span>
          <span className="block text-slate">
            {line.description}
            {line.reference ? ` · ${line.reference}` : ''}
          </span>
        </p>
        <div>
          <h3 className="font-semibold">Entries in the books with this amount</h3>
          {!options ? <p className="text-slate">Looking…</p> : null}
          {options && !options.length ? <p className="text-slate">None within 15 days. If it is only in the bank (charges, interest), make the entry below.</p> : null}
          <ul className="mt-1 divide-y divide-line rounded-lg border border-line">
            {(options || []).map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                <span>
                  {formatDate(o.date)} · <span className="font-semibold">{o.number}</span>
                  <span className="block text-xs text-slate">{o.narration}</span>
                </span>
                <button type="button" disabled={busy} onClick={() => run(() => bankApi.match(line.id, o.id))} className="rounded-lg bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-60">
                  This one
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">Or make the entry from this line</h3>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-64 flex-1 text-xs font-semibold text-slate">
              {isIn ? 'Money came from (e.g. Interest received)' : 'Money went to (e.g. Bank charges)'}
              <select value={account} onChange={(e) => setAccount(e.target.value)} className={`${inputClass} mt-1`}>
                <option value="">Choose an account</option>
                {heads.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.groupLabel})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" disabled={busy || !account} onClick={() => run(() => bankApi.entryFromLine(line.id, { account }))} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
              Make entry & match
            </button>
          </div>
          <p className="text-xs text-slate">Customer and supplier money is entered on their account pages first; then match it here.</p>
        </div>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-rose-800">{error}</p> : null}
      </div>
    </Modal>
  );
}
