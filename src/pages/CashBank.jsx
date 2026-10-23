import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bankApi } from '../api/bank.api';
import { booksApi } from '../api/books.api';
import { AddBankForm, ExpenseForm, MatchLine, StatementImport } from '../components/bank/BankForms';
import { confirmAction, notify } from '../components/ui/confirm';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportMenu } from '../components/ui/ExportMenu';
import { ClearFilters, DateRangeFilter, FilterBar, FilterSelect } from '../components/ui/Filters';
import { inputClass } from '../components/ui/FormField';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { useDebounced, useListParams, useUrlState } from '../hooks/useListParams';
import { usePermission } from '../hooks/usePermission';
import { amount } from '../lib/books';
import { exportTable, localToday } from '../lib/exporters';
import { fetchAllPages } from '../lib/fetchAll';
import { formatDate, formatMoney } from '../lib/sales';

const TABS = [
  { id: 'accounts', label: 'Cash & bank' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'matching', label: 'Bank matching' },
];
const td = 'px-3 py-2';
const right = `${td} whitespace-nowrap text-right`;
const bookLink = (id) => `/books?tab=ledger&account=${id}`;

// ---------------------------------------------------------------- accounts

function MoneyAccounts({ accounts, canEnter, onAdd, onMatch }) {
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a) => (
          <div key={a.id} className="space-y-2 rounded-xl border border-line bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-slate">{a.group === 'cash' ? 'Cash' : 'Bank'}</p>
              </div>
              <p className={`text-lg font-semibold ${a.balance < 0 ? 'text-red-700' : ''}`}>{formatMoney(a.balance)}</p>
            </div>
            {a.group === 'bank' ? (
              <p className="text-xs text-slate">
                {a.statementUpTo ? `Statement up to ${formatDate(a.statementUpTo)}` : 'No statement imported yet'}
                {a.statementBalance != null ? ` · bank says ${formatMoney(a.statementBalance)}` : ''}
                {a.unmatched ? <span className="font-semibold text-amber-700"> · {a.unmatched} line(s) to match</span> : null}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3 text-sm font-semibold">
              <Link to={bookLink(a.id)} className="text-accent hover:underline">
                {a.group === 'cash' ? 'Cash book' : 'Bank book'}
              </Link>
              {a.group === 'bank' ? (
                <button type="button" onClick={() => onMatch(a.id)} className="text-accent hover:underline">
                  Match statement
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <p className="text-sm text-slate">
        Total cash and bank: <span className="font-semibold text-ink">{formatMoney(total)}</span>
        {canEnter ? (
          <>
            {' · '}
            <button type="button" onClick={onAdd} className="font-semibold text-accent hover:underline">
              Add a bank or cash account
            </button>
          </>
        ) : null}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- expenses

function Expenses({ refreshKey, canCancel, heads }) {
  // Prefixed (exp.page, ...) so the Matching tab's page and rows stay its own.
  const list = useListParams({ from: '', to: '', account: '', status: '', q: '' }, { pageSize: 25, prefix: 'exp' });
  const f = list.values;
  const [query, setQuery] = useState(f.q || '');
  const search = useDebounced(query.trim(), 300);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (search !== f.q) list.set('q', search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  const key = JSON.stringify(f);
  useEffect(() => {
    let live = true;
    bankApi
      .expenses({ ...f, page: list.page, pageSize: list.pageSize })
      .then((d) => {
        if (!live) return;
        setData(d);
        setError('');
      })
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, list.page, list.pageSize, refreshKey, tick]);

  async function cancel(x) {
    const reason = await confirmAction({ title: `Cancel expense ${x.number}?`, withReason: true, reasonRequired: true, confirmLabel: 'Cancel expense', danger: true });
    if (reason === null) return;
    try {
      await booksApi.cancelVoucher(x.id, reason);
      setTick((t) => t + 1);
    } catch (err) {
      notify(err.message, 'Expense not cancelled');
    }
  }
  async function download(format) {
    const rows = await fetchAllPages(bankApi.expenses, { from: f.from, to: f.to, account: f.account, status: f.status, q: f.q });
    return exportTable(format, {
      fileName: `expenses_${localToday()}`,
      title: 'Expenses',
      subtitle: `${data.from} to ${data.to} · ${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`,
      rows,
      totals: { amount: data.summary.amount, gst: data.summary.gst, total: data.summary.total },
      columns: [
        { key: 'date', label: 'Date', type: 'date', get: (x) => x.date },
        { key: 'number', label: 'Number', type: 'text', get: (x) => x.number },
        { key: 'head', label: 'Head', type: 'text', get: (x) => x.head },
        { key: 'paidTo', label: 'Paid to', type: 'text', get: (x) => x.paidTo },
        { key: 'billNo', label: 'Bill no.', type: 'text', get: (x) => x.billNo },
        { key: 'paidFrom', label: 'Paid from', type: 'text', get: (x) => x.paidFrom },
        { key: 'amount', label: 'Amount', type: 'money', get: (x) => x.amount },
        { key: 'gst', label: 'GST', type: 'money', get: (x) => x.gst || null },
        { key: 'total', label: 'Total', type: 'money', get: (x) => x.total },
      ],
    });
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Date" from={f.from} to={f.to} onChange={(r) => list.setMany(r)} />
        <FilterSelect label="Head" value={f.account} onChange={(v) => list.set('account', v)} options={[{ id: '', label: 'All heads' }, ...heads.map((h) => ({ id: h.id, label: h.name }))]} />
        <FilterSelect label="Show" value={f.status} onChange={(v) => list.set('status', v)} options={[{ id: '', label: 'Entered' }, { id: 'cancelled', label: 'Cancelled' }]} />
        <div className="self-end">
          <SearchField value={query} onChange={setQuery} placeholder="Paid to, bill no." />
        </div>
        <ClearFilters
          count={list.active}
          onClear={() => {
            setQuery('');
            list.reset();
          }}
        />
        <div className="ml-auto self-end">
          <ExportMenu onExport={download} disabled={!data?.total} />
        </div>
      </FilterBar>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {data ? (
        <div className="flex flex-wrap gap-2">
          <div className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
            <span className="text-slate">
              {formatDate(data.from)} to {formatDate(data.to)}:
            </span>{' '}
            <span className="font-semibold">{formatMoney(data.summary.amount)}</span>
            {data.summary.gst ? <span className="text-slate"> + GST {formatMoney(data.summary.gst)}</span> : null}
          </div>
          {data.summary.byHead.slice(0, 6).map((h) => (
            <div key={h.head} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
              <span className="text-slate">{h.head}</span> <span className="font-semibold">{formatMoney(h.amount)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {data && !data.items.length ? <EmptyState title="No expenses" hint="Enter what was paid out with New expense." /> : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className={td}>Date</th>
                  <th className={td}>Head</th>
                  <th className={td}>Paid to</th>
                  <th className={td}>Paid from</th>
                  <th className={`${td} text-right`}>Amount</th>
                  <th className={`${td} text-right`}>GST</th>
                  <th className={`${td} text-right`}>Total</th>
                  <th className={td} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((x) => (
                  <tr key={x.id} className={`border-t border-line ${x.status === 'cancelled' ? 'text-steel line-through' : ''}`}>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatDate(x.date)}
                      <span className="block text-xs text-slate">{x.number}</span>
                    </td>
                    <td className={td}>{x.head}</td>
                    <td className={td}>
                      {x.paidTo || '—'}
                      {x.billNo ? <span className="block text-xs text-slate">Bill {x.billNo}</span> : null}
                    </td>
                    <td className={td}>{x.paidFrom}</td>
                    <td className={right}>{amount(x.amount)}</td>
                    <td className={right}>{amount(x.gst)}</td>
                    <td className={`${right} font-semibold`}>{amount(x.total)}</td>
                    <td className={`${td} text-right`}>
                      {canCancel && x.status === 'posted' ? (
                        <button type="button" onClick={() => cancel(x)} className="text-sm font-semibold text-red-700 hover:underline">
                          Cancel
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={data.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- matching

const STATUS_LABEL = { unmatched: 'To match', matched: 'Matched', ignored: 'Ignored' };

function Reconciliation({ accountId, refreshKey }) {
  const [asOf, setAsOf] = useState(localToday());
  const [rec, setRec] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    bankApi
      .reconciliation(accountId, asOf)
      .then((r) => live && setRec(r))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
  }, [accountId, asOf, refreshKey]);
  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!rec) return null;
  const row = (label, value, strong = false) => (
    <div className={`flex justify-between gap-4 px-3 py-1.5 ${strong ? 'font-semibold' : ''}`}>
      <span>{label}</span>
      <span className="whitespace-nowrap">{formatMoney(value)}</span>
    </div>
  );
  function download(format) {
    const rows = [
      { label: 'Balance as per books', value: rec.bookBalance },
      ...rec.notInBank.map((e) => ({ label: `Less: ${e.kind} · ${e.number} ${formatDate(e.date)}`, value: -e.amount })),
      ...rec.notInBooks.map((l) => ({ label: `Add: in the bank, not in books · ${formatDate(l.date)} ${l.description}`, value: l.amount })),
      { label: 'Balance as per bank (worked out)', value: rec.expectedBank },
      { label: 'Balance shown on the statement', value: rec.statementBalance },
      { label: 'Difference', value: rec.difference },
    ];
    return exportTable(format, {
      fileName: `bank-reconciliation_${rec.asOf}`,
      title: `Bank reconciliation: ${rec.account.name}`,
      subtitle: `As on ${formatDate(rec.asOf)}`,
      rows,
      columns: [
        { key: 'label', label: 'Particulars', type: 'text', get: (r) => r.label },
        { key: 'value', label: 'Amount', type: 'money', get: (r) => r.value },
      ],
    });
  }
  const balanced = rec.difference !== null && Math.abs(rec.difference) < 0.01;
  return (
    <div className="space-y-2 rounded-xl border border-line bg-white p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h3 className="font-semibold">Bank reconciliation</h3>
        <div className="flex items-end gap-2">
          <label className="text-xs font-semibold text-slate">
            As on
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="mt-1 block rounded-lg border border-line bg-white px-2 py-1.5 text-sm text-ink" />
          </label>
          <ExportMenu onExport={download} />
        </div>
      </div>
      <div className="divide-y divide-line rounded-lg border border-line text-sm">
        {row('Balance as per books', rec.bookBalance, true)}
        {rec.notInBank.length ? row(`Less: ${rec.notInBank.length} entr${rec.notInBank.length === 1 ? 'y' : 'ies'} not yet in the bank (uncleared cheques, deposits in transit)`, -rec.inBooksNotBank) : null}
        {rec.notInBooks.length ? row(`Add: ${rec.notInBooks.length} bank line(s) not yet in the books`, rec.inBankNotBooks) : null}
        {row('Balance as per bank (worked out)', rec.expectedBank, true)}
        {rec.statementBalance !== null ? row(`Statement shows (${formatDate(rec.statementBalanceDate)})`, rec.statementBalance) : null}
      </div>
      {rec.statementBalance === null ? (
        <p className="text-sm text-slate">Import the statement with its Balance column to check the worked-out figure against the bank.</p>
      ) : balanced ? (
        <p className="text-sm font-semibold text-emerald-700">Agrees with the bank.</p>
      ) : (
        <p className="text-sm font-semibold text-amber-700">
          Off by {formatMoney(rec.difference)}. Usually a missing statement period, an entry with the wrong amount, or opening balance not set.
        </p>
      )}
      {rec.notInBank.length ? (
        <details className="text-sm">
          <summary className="cursor-pointer font-semibold text-accent">Entries not yet in the bank</summary>
          <ul className="mt-1 divide-y divide-line rounded-lg border border-line">
            {rec.notInBank.map((e) => (
              <li key={e.id} className="flex flex-wrap justify-between gap-2 px-3 py-1.5">
                <span>
                  {formatDate(e.date)} · {e.number} · {e.narration}
                </span>
                <span className="whitespace-nowrap">{formatMoney(e.amount)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

// An import's batch id is the time it was imported (ms).
const importedOn = (batch) => (/^\d+$/.test(String(batch || '')) ? formatDate(new Date(Number(batch))) : '');

function Matching({ banks, accounts, canWork, canUndoImport, onChanged }) {
  const [accountId] = useUrlState('bank', '');
  const [, setParams] = useSearchParams();
  const current = banks.find((b) => b.id === accountId) || banks[0];
  const list = useListParams({ lines: 'unmatched', lfrom: '', lto: '' }, { pageSize: 50, prefix: 'm' });
  const f = list.values;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [matching, setMatching] = useState(null);
  const [busy, setBusy] = useState(false);
  const key = JSON.stringify(f);
  useEffect(() => {
    if (!current) return undefined;
    let live = true;
    bankApi
      .lines(current.id, { status: f.lines, from: f.lfrom, to: f.lto, page: list.page, pageSize: list.pageSize })
      .then((d) => {
        if (!live) return;
        setData(d);
        setError('');
      })
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, key, list.page, list.pageSize, tick]);
  const refresh = () => {
    setTick((t) => t + 1);
    onChanged();
  };
  async function act(action) {
    setBusy(true);
    try {
      await action();
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function undoImport(batch) {
    const on = importedOn(batch);
    const ok = await confirmAction({
      title: 'Undo this import?',
      message: `Every line of the statement imported${on ? ` on ${on}` : ''} is removed from ${current.name}, with its matches. Entries in the books stay as they are.`,
      confirmLabel: 'Undo import',
      danger: true,
    });
    if (ok) act(() => bankApi.deleteImport(current.id, batch));
  }
  // A new bank starts at its own first page (one address-bar change).
  const chooseBank = (id) =>
    setParams(
      (now) => {
        const next = new URLSearchParams(now);
        next.set('bank', id);
        next.delete('m.page');
        return next;
      },
      { replace: true }
    );

  if (!current) return <EmptyState title="No bank account" hint="Add one on the Cash & bank tab." />;
  const counts = data?.counts || {};
  return (
    <div className="space-y-3">
      <FilterBar>
        <label className="text-xs font-semibold text-slate">
          Bank account
          <select value={current.id} onChange={(e) => chooseBank(e.target.value)} className={`${inputClass} mt-1`}>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <FilterSelect
          label="Lines"
          value={f.lines}
          onChange={(v) => list.set('lines', v)}
          options={[
            { id: 'unmatched', label: `To match (${counts.unmatched || 0})` },
            { id: 'matched', label: `Matched (${counts.matched || 0})` },
            { id: 'ignored', label: `Ignored (${counts.ignored || 0})` },
            { id: 'all', label: 'All' },
          ]}
        />
        <DateRangeFilter label="Date" from={f.lfrom} to={f.lto} onChange={(r) => list.setMany({ lfrom: r.from, lto: r.to })} />
        {canWork ? (
          <div className="ml-auto flex gap-2 self-end">
            <button type="button" disabled={busy} onClick={() => act(() => bankApi.autoMatch(current.id))} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold hover:bg-paper disabled:opacity-60">
              Match again
            </button>
            <button type="button" onClick={() => setImportOpen(true)} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              Import statement
            </button>
          </div>
        ) : null}
      </FilterBar>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {data && !data.items.length ? (
        <EmptyState
          title={f.lines === 'unmatched' && (counts.matched || counts.ignored) ? 'Everything is matched' : 'No statement lines'}
          hint={f.lines === 'unmatched' && (counts.matched || counts.ignored) ? 'Import the next statement when it comes.' : 'Import the bank statement (CSV) to tick off entries.'}
        />
      ) : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className={td}>Date</th>
                  <th className={td}>Description</th>
                  <th className={`${td} text-right`}>Withdrawal</th>
                  <th className={`${td} text-right`}>Deposit</th>
                  <th className={td}>In the books</th>
                  <th className={td} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((l, i) => (
                  <tr key={l.id} className="border-t border-line align-top">
                    <td className={`${td} whitespace-nowrap`}>{formatDate(l.date)}</td>
                    <td className={td}>
                      {l.description || '—'}
                      {l.reference ? <span className="block text-xs text-slate">Ref {l.reference}</span> : null}
                      {canUndoImport && l.batch && l.batch !== data.items[i - 1]?.batch ? (
                        <span className="block text-xs text-slate">
                          {importedOn(l.batch) ? `Imported ${importedOn(l.batch)} · ` : ''}
                          <button type="button" disabled={busy} onClick={() => undoImport(l.batch)} className="font-semibold text-red-700 hover:underline">
                            Undo this import
                          </button>
                        </span>
                      ) : null}
                    </td>
                    <td className={right}>{amount(l.withdrawal)}</td>
                    <td className={right}>{amount(l.deposit)}</td>
                    <td className={td}>
                      {l.matchedEntry ? (
                        <>
                          <span className="font-semibold">{l.matchedEntry.number}</span>
                          <span className="block text-xs text-slate">
                            {l.matchedBy === 'Automatic' ? 'Matched automatically' : `Matched by ${l.matchedBy}`} · {l.matchedEntry.narration}
                          </span>
                        </>
                      ) : (
                        <span className={l.status === 'ignored' ? 'text-slate' : 'font-semibold text-amber-700'}>{STATUS_LABEL[l.status]}</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      {canWork && l.status === 'unmatched' ? (
                        <>
                          <button type="button" onClick={() => setMatching(l)} className="font-semibold text-accent hover:underline">
                            Match
                          </button>
                          {' · '}
                          <button type="button" disabled={busy} onClick={() => act(() => bankApi.ignore(l.id))} className="text-slate hover:underline">
                            Ignore
                          </button>
                        </>
                      ) : null}
                      {canWork && l.status === 'matched' ? (
                        <button type="button" disabled={busy} onClick={() => act(() => bankApi.unmatch(l.id))} className="text-slate hover:underline">
                          Unmatch
                        </button>
                      ) : null}
                      {canWork && l.status === 'ignored' ? (
                        <button type="button" disabled={busy} onClick={() => act(() => bankApi.ignore(l.id))} className="text-slate hover:underline">
                          Bring back
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} totalPages={data.pages} total={data.total} pageSize={data.pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        </div>
      ) : null}
      <Reconciliation accountId={current.id} refreshKey={tick} />
      {importOpen ? <StatementImport open account={current} onClose={() => setImportOpen(false)} onDone={refresh} /> : null}
      {matching ? <MatchLine key={matching.id} line={matching} accounts={accounts} onClose={() => setMatching(null)} onDone={refresh} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------- page

export function CashBank() {
  const { can } = usePermission();
  const [tab, setTab] = useUrlState('tab', 'accounts');
  const [, setParams] = useSearchParams();
  const [money, setMoney] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [heads, setHeads] = useState([]);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState('');
  const load = useCallback(() => {
    Promise.all([bankApi.accounts(), booksApi.accounts(), bankApi.expenseOptions()])
      .then(([m, a, o]) => {
        setMoney(m);
        setAccounts(a);
        setHeads(o.heads);
      })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load, refreshKey]);
  const changed = () => setRefreshKey((k) => k + 1);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!money) return <p className="text-sm text-slate">Loading…</p>;
  const canEnter = can('accounts:create');
  const banks = money.filter((a) => a.group === 'bank' && a.isActive !== false);
  const toMatch = banks.reduce((s, b) => s + b.unmatched, 0);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Cash & bank"
        subtitle="What is in each account, money spent, and the bank statement ticked off against the books."
        actions={
          canEnter ? (
            <button type="button" onClick={() => setDialog('expense')} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              New expense
            </button>
          ) : null
        }
      />
      <Tabs tabs={TABS.map((t) => (t.id === 'matching' && toMatch ? { ...t, label: `${t.label} (${toMatch})` } : t))} value={tab} onChange={setTab} />
      {tab === 'accounts' ? (
        <MoneyAccounts
          accounts={money}
          canEnter={canEnter}
          onAdd={() => setDialog('bank')}
          onMatch={(id) =>
            // One address-bar change, so the tab and the bank switch together.
            setParams(
              (current) => {
                const next = new URLSearchParams(current);
                next.set('tab', 'matching');
                next.set('bank', id);
                return next;
              },
              { replace: true }
            )
          }
        />
      ) : null}
      {tab === 'expenses' ? <Expenses refreshKey={refreshKey} canCancel={can('accounts:update')} heads={heads} /> : null}
      {tab === 'matching' ? <Matching banks={banks} accounts={accounts} canWork={canEnter} canUndoImport={can('accounts:update')} onChanged={changed} /> : null}
      {dialog === 'expense' ? <ExpenseForm open onClose={() => setDialog('')} onSaved={changed} /> : null}
      {dialog === 'bank' ? <AddBankForm open onClose={() => setDialog('')} onSaved={changed} /> : null}
    </div>
  );
}
