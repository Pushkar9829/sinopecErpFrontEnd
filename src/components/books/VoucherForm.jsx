import { useState } from 'react';
import { booksApi } from '../../api/books.api';
import { MONEY_GROUPS, VOUCHER_TYPES, accountOptions, amount } from '../../lib/books';
import { toDateInput } from '../../lib/sales';
import { Field, inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';

function AccountSelect({ accounts, value, onChange, onlyGroups, exceptGroups, placeholder = 'Choose account' }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
      <option value="">{placeholder}</option>
      {accountOptions(accounts, { onlyGroups, exceptGroups }).map(([group, list]) => (
        <optgroup key={group} label={group}>
          {list.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

const blankLine = () => ({ account: '', amount: '', debit: '', credit: '', note: '' });
const num = (v) => Math.round((Number(v) || 0) * 100) / 100;

// New entry in the books. Payment / receipt / contra use simple forms (one
// cash or bank account against one or more other accounts); journal shows
// full debit and credit columns.
export function VoucherForm({ open, accounts, defaultBank, onClose, onSaved }) {
  const [type, setType] = useState('payment');
  const [date, setDate] = useState(toDateInput(new Date()));
  const [moneyAccount, setMoneyAccount] = useState(defaultBank || '');
  const [toAccount, setToAccount] = useState('');
  const [lines, setLines] = useState([blankLine()]);
  const [narration, setNarration] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isJournal = type === 'journal';
  const isContra = type === 'contra';
  const setLine = (i, patch) => setLines((list) => list.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = num(lines.reduce((s, l) => s + num(l.amount), 0));
  const dr = num(lines.reduce((s, l) => s + num(l.debit), 0));
  const cr = num(lines.reduce((s, l) => s + num(l.credit), 0));

  function reset(nextType) {
    setType(nextType);
    setLines([blankLine()]);
    setToAccount('');
    setMoneyAccount(nextType === 'contra' ? '' : defaultBank || '');
    setError('');
  }

  function buildLines() {
    if (isJournal) return lines.map((l) => ({ account: l.account, debit: num(l.debit), credit: num(l.credit), note: l.note }));
    if (isContra) {
      const value = num(lines[0].amount);
      return [
        { account: toAccount, debit: value, credit: 0 },
        { account: moneyAccount, debit: 0, credit: value },
      ];
    }
    const others = lines.filter((l) => l.account || num(l.amount));
    // Payment: Dr each expense, Cr the cash/bank account. Receipt: the reverse.
    if (type === 'payment') return [...others.map((l) => ({ account: l.account, debit: num(l.amount), credit: 0, note: l.note })), { account: moneyAccount, debit: 0, credit: total }];
    return [{ account: moneyAccount, debit: total, credit: 0 }, ...others.map((l) => ({ account: l.account, debit: 0, credit: num(l.amount), note: l.note }))];
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const saved = await booksApi.createVoucher({ type, date, narration, lines: buildLines() });
      onSaved?.(saved);
      reset(type);
      setNarration('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  const typeInfo = VOUCHER_TYPES.find((t) => t.id === type);

  return (
    <Modal open title="New entry in the books" onClose={onClose} wide>
      <form onSubmit={save} className="space-y-4">
        <div className="flex flex-wrap gap-1 rounded-lg bg-paper p-1" role="tablist">
          {VOUCHER_TYPES.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={type === t.id} onClick={() => reset(t.id)} className={`rounded-md px-3 py-1.5 text-sm font-semibold ${type === t.id ? 'bg-ink text-paper' : 'text-slate hover:bg-white'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate">{typeInfo.hint}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date">
            <input type="date" value={date} max={toDateInput(new Date())} onChange={(e) => setDate(e.target.value)} className={inputClass} required />
          </Field>
          {isJournal ? null : (
            <Field label={type === 'payment' ? 'Paid from' : type === 'receipt' ? 'Received into' : 'From (money goes out of)'}>
              <AccountSelect accounts={accounts} value={moneyAccount} onChange={setMoneyAccount} onlyGroups={MONEY_GROUPS} placeholder="Cash or bank" />
            </Field>
          )}
          {isContra ? (
            <>
              <Field label="To (money goes into)">
                <AccountSelect accounts={accounts} value={toAccount} onChange={setToAccount} onlyGroups={MONEY_GROUPS} placeholder="Cash or bank" />
              </Field>
              <Field label="Amount">
                <input type="number" min="0" step="0.01" value={lines[0].amount} onChange={(e) => setLine(0, { amount: e.target.value })} className={inputClass} required />
              </Field>
            </>
          ) : null}
        </div>

        {isContra ? null : (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ink">{isJournal ? 'Lines' : type === 'payment' ? 'Paid for' : 'Received for'}</p>
            {lines.map((line, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]">
                <AccountSelect accounts={accounts} value={line.account} onChange={(v) => setLine(i, { account: v })} exceptGroups={isJournal ? undefined : MONEY_GROUPS} />
                {isJournal ? (
                  <>
                    <input type="number" min="0" step="0.01" placeholder="Debit" value={line.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? '' : line.credit })} className={inputClass} />
                    <input type="number" min="0" step="0.01" placeholder="Credit" value={line.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? '' : line.debit })} className={inputClass} />
                  </>
                ) : (
                  <>
                    <input type="number" min="0" step="0.01" placeholder="Amount" value={line.amount} onChange={(e) => setLine(i, { amount: e.target.value })} className={inputClass} />
                    <input placeholder="Note (optional)" value={line.note} onChange={(e) => setLine(i, { note: e.target.value })} className={inputClass} />
                  </>
                )}
                <button type="button" onClick={() => setLines((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : list))} className="rounded-lg px-2 py-2 text-sm text-slate hover:bg-paper" aria-label="Remove line">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setLines((list) => [...list, blankLine()])} className="text-sm font-semibold text-accent">
              + Add line
            </button>
            <p className={`text-sm font-semibold ${isJournal && Math.abs(dr - cr) > 0.004 ? 'text-red-700' : 'text-ink'}`}>
              {isJournal ? `Debits ${amount(dr) || '0.00'} · Credits ${amount(cr) || '0.00'}${Math.abs(dr - cr) > 0.004 ? ` · difference ${amount(Math.abs(dr - cr))}` : ' · balanced'}` : `Total ${amount(total) || '0.00'}`}
            </p>
          </div>
        )}

        <Field label="Narration">
          <textarea value={narration} onChange={(e) => setNarration(e.target.value)} rows={2} className={inputClass} placeholder="What this entry is for, bill number, cheque number…" />
        </Field>
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold">
            Close
          </button>
          <button type="submit" disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            {busy ? 'Saving…' : 'Save entry'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
