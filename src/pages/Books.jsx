import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { booksApi } from '../api/books.api';
import { TdsSummary } from '../components/books/TdsSummary';
import { VoucherForm } from '../components/books/VoucherForm';
import { confirmAction } from '../components/ui/confirm';
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
import { accountOptions, amount, drCr } from '../lib/books';
import { exportTable, localToday } from '../lib/exporters';
import { fetchAllPages } from '../lib/fetchAll';
import { formatDate } from '../lib/sales';

const TABS = [
  { id: 'daybook', label: 'Day book' },
  { id: 'ledger', label: 'Ledger' },
  { id: 'trial', label: 'Trial balance' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'tds', label: 'TDS' },
  { id: 'setup', label: 'Setup & opening balances' },
];
const TYPE_OPTIONS = [
  { id: '', label: 'All entries' },
  { id: 'sales', label: 'Sales' },
  { id: 'receipt', label: 'Receipts' },
  { id: 'payment', label: 'Payments' },
  { id: 'contra', label: 'Cash ↔ bank' },
  { id: 'journal', label: 'Journals' },
];
const td = 'px-3 py-2';
const right = `${td} whitespace-nowrap text-right`;

// ---------------------------------------------------------------- Day book

function DayBook({ startDate, canCancel, refreshKey, onChanged }) {
  const list = useListParams({ from: startDate, to: '', type: '', status: '', q: '' }, { pageSize: 25 });
  const { values: f, page, pageSize } = list;
  const [query, setQuery] = useState(f.q);
  const search = useDebounced(query.trim(), 300);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState('');
  const params = { from: f.from, to: f.to, type: f.type, status: f.status, q: f.q };
  const key = JSON.stringify(params);

  useEffect(() => {
    if (search !== f.q) list.set('q', search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);
  useEffect(() => {
    let live = true;
    booksApi
      .vouchers({ ...params, page, pageSize })
      .then((d) => live && setData(d))
      .catch((err) => live && setError(err.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, pageSize, refreshKey]);

  async function cancel(v) {
    const reason = await confirmAction({ title: `Cancel ${v.number}?`, message: 'The entry stays in the day book, struck out, and no longer counts.', withReason: true, reasonRequired: true, confirmLabel: 'Cancel entry', danger: true });
    if (reason === null) return;
    try {
      await booksApi.cancelVoucher(v.id, reason);
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  async function download(format) {
    const rows = await fetchAllPages(booksApi.vouchers, params);
    const flat = rows.flatMap((v) => v.lines.map((l, i) => ({ v, l, first: i === 0 })));
    await exportTable(format, {
      fileName: `day-book_${data?.from}_to_${data?.to}`,
      title: 'Day book',
      subtitle: `${formatDate(data?.from)} to ${formatDate(data?.to)} · ${rows.length} entries`,
      rows: flat,
      columns: [
        { label: 'Date', type: 'date', get: (r) => (r.first ? r.v.date : null) },
        { label: 'Type', type: 'text', get: (r) => (r.first ? r.v.typeLabel : '') },
        { label: 'Number', type: 'text', get: (r) => (r.first ? r.v.number : '') },
        { label: 'Account', type: 'text', get: (r) => r.l.accountName },
        { label: 'Debit', type: 'money', get: (r) => r.l.debit || null },
        { label: 'Credit', type: 'money', get: (r) => r.l.credit || null },
        { label: 'Narration', type: 'text', get: (r) => (r.first ? r.v.narration : r.l.note) },
        { label: 'Status', type: 'text', get: (r) => (r.first && r.v.status === 'cancelled' ? `Cancelled: ${r.v.cancelReason}` : '') },
      ],
    });
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <DateRangeFilter label="Dates" from={f.from} to={f.to} onChange={(range) => list.setMany(range)} />
        <FilterSelect label="Type" value={f.type} onChange={(v) => list.set('type', v)} options={TYPE_OPTIONS} />
        <FilterSelect label="Show" value={f.status} onChange={(v) => list.set('status', v)} options={[{ id: '', label: 'Posted' }, { id: 'cancelled', label: 'Cancelled' }, { id: 'all', label: 'Both' }]} />
        <div className="self-end">
          <SearchField value={query} onChange={setQuery} placeholder="Number or narration" />
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
      {data?.byType?.length ? (
        <p className="text-sm text-slate">
          {data.byType.map((t) => `${t.label}: ${t.count} · ₹${amount(t.total) || 0}`).join('   |   ')}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {!data ? <p className="text-sm text-slate">Loading…</p> : null}
      {data && !data.items.length ? <EmptyState title="No entries in this period" /> : null}
      {data?.items.length ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className={td}>Date</th>
                  <th className={td}>Type</th>
                  <th className={td}>Number</th>
                  <th className={td}>Particulars</th>
                  <th className={`${td} text-right`}>Amount</th>
                  <th className={td} />
                </tr>
              </thead>
              <tbody>
                {data.items.map((v) => (
                  <Fragment key={v.id}>
                    <tr className={`cursor-pointer border-t border-line hover:bg-paper/60 ${v.status === 'cancelled' ? 'text-steel line-through' : ''}`} onClick={() => setOpen(open === v.id ? '' : v.id)}>
                      <td className={`${td} whitespace-nowrap`}>{formatDate(v.date)}</td>
                      <td className={td}>{v.typeLabel}</td>
                      <td className={`${td} font-semibold`}>{v.number}</td>
                      <td className={td}>
                        {v.lines.map((l) => l.accountName).filter((n, i, all) => all.indexOf(n) === i).slice(0, 3).join(' · ')}
                        {v.narration ? <span className="block text-xs text-slate">{v.narration}</span> : null}
                      </td>
                      <td className={right}>{amount(v.total)}</td>
                      <td className={`${td} text-xs text-slate`}>{v.auto ? 'Automatic' : v.createdByName}</td>
                    </tr>
                    {open === v.id ? (
                      <tr className="bg-paper/40">
                        <td colSpan={6} className="px-3 pb-3">
                          <table className="w-full text-sm">
                            <tbody>
                              {v.lines.map((l, i) => (
                                <tr key={i}>
                                  <td className={`py-1 ${l.credit ? 'pl-8' : ''}`}>{l.accountName}</td>
                                  <td className="py-1 text-right">{l.debit ? `${amount(l.debit)} Dr` : ''}</td>
                                  <td className="py-1 text-right">{l.credit ? `${amount(l.credit)} Cr` : ''}</td>
                                  <td className="py-1 pl-3 text-xs text-slate">{l.note}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="mt-2 flex flex-wrap gap-3 text-sm">
                            {v.sourceLink ? (
                              <Link to={v.sourceLink} className="font-semibold text-accent hover:underline">
                                Open {v.sourceRef}
                              </Link>
                            ) : null}
                            {v.status === 'cancelled' ? <span className="text-red-700">Cancelled: {v.cancelReason}</span> : null}
                            {!v.auto && v.status === 'posted' && canCancel ? (
                              <button type="button" onClick={() => cancel(v)} className="font-semibold text-red-700 hover:underline">
                                Cancel this entry
                              </button>
                            ) : null}
                            {v.auto ? <span className="text-slate">Made automatically from {v.sourceRef}; it changes when that does.</span> : null}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
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

// ---------------------------------------------------------------- Ledger

function Ledger({ accounts, startDate, refreshKey }) {
  const [accountId, setAccountId] = useUrlState('account', '');
  const [from, setFrom] = useUrlState('from', startDate);
  const [to, setTo] = useUrlState('to', '');
  const [result, setResult] = useState({ key: '', data: null, error: '' });
  const key = `${accountId}|${from}|${to}|${refreshKey}`;

  useEffect(() => {
    if (!accountId) return undefined;
    let live = true;
    booksApi
      .ledger(accountId, { from, to })
      .then((data) => live && setResult({ key, data, error: '' }))
      .catch((err) => live && setResult({ key, data: null, error: err.message }));
    return () => {
      live = false;
    };
  }, [key, accountId, from, to]);
  const data = result.key === key ? result.data : null;

  const options = useMemo(() => {
    const groups = new Map();
    for (const a of accounts) {
      if (!groups.has(a.groupLabel)) groups.set(a.groupLabel, []);
      groups.get(a.groupLabel).push(a);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [accounts]);

  function download(format) {
    return exportTable(format, {
      fileName: `ledger-${data.account.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}_${data.from}_to_${data.to}`,
      title: `Ledger: ${data.account.name}`,
      subtitle: `${formatDate(data.from)} to ${formatDate(data.to)} · opening ${drCr(data.opening)} · closing ${drCr(data.closing)}`,
      rows: [{ date: data.from, typeLabel: '', number: '', against: 'Opening balance', narration: '', debit: 0, credit: 0, balance: data.opening }, ...data.entries],
      totals: { debit: data.debit, credit: data.credit },
      columns: [
        { key: 'date', label: 'Date', type: 'date', get: (e) => e.date },
        { key: 'type', label: 'Type', type: 'text', get: (e) => e.typeLabel },
        { key: 'number', label: 'Number', type: 'text', get: (e) => e.number },
        { key: 'against', label: 'Against', type: 'text', get: (e) => e.against },
        { key: 'narration', label: 'Narration', type: 'text', get: (e) => e.narration },
        { key: 'debit', label: 'Debit', type: 'money', get: (e) => e.debit || null },
        { key: 'credit', label: 'Credit', type: 'money', get: (e) => e.credit || null },
        { key: 'balance', label: 'Balance', type: 'text', get: (e) => drCr(e.balance) },
      ],
    });
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <label className="min-w-64 flex-1 text-xs font-semibold text-slate">
          Account
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={`${inputClass} mt-1`}>
            <option value="">Choose an account</option>
            {options.map(([group, list]) => (
              <optgroup key={group} label={group}>
                {list.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <DateRangeFilter
          label="Dates"
          from={from}
          to={to}
          onChange={(range) => {
            setFrom(range.from);
            setTo(range.to);
          }}
        />
        <div className="ml-auto self-end">
          <ExportMenu onExport={download} disabled={!data} />
        </div>
      </FilterBar>
      {!accountId ? <EmptyState title="Choose an account" hint="Every entry for that account, with the running balance." /> : null}
      {accountId && result.key === key && result.error ? <p className="text-sm text-red-700">{result.error}</p> : null}
      {accountId && !data && !result.error ? <p className="text-sm text-slate">Loading…</p> : null}
      {data ? (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-slate">
              <tr>
                <th className={td}>Date</th>
                <th className={td}>Entry</th>
                <th className={td}>Against</th>
                <th className={`${td} text-right`}>Debit</th>
                <th className={`${td} text-right`}>Credit</th>
                <th className={`${td} text-right`}>Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line bg-paper/40 font-semibold">
                <td className={td}>{formatDate(data.from)}</td>
                <td className={td} colSpan={4}>
                  Opening balance
                </td>
                <td className={right}>{drCr(data.opening)}</td>
              </tr>
              {data.entries.map((e) => (
                <tr key={e.id} className="border-t border-line">
                  <td className={`${td} whitespace-nowrap`}>{formatDate(e.date)}</td>
                  <td className={td}>
                    <span className="font-semibold">{e.number}</span> <span className="text-xs text-slate">{e.typeLabel}</span>
                    {e.narration ? <span className="block text-xs text-slate">{e.narration}</span> : null}
                  </td>
                  <td className={td}>{e.sourceLink ? <Link to={e.sourceLink} className="text-accent hover:underline">{e.against}</Link> : e.against}</td>
                  <td className={right}>{amount(e.debit)}</td>
                  <td className={right}>{amount(e.credit)}</td>
                  <td className={right}>{drCr(e.balance)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink font-semibold">
                <td className={td}>{formatDate(data.to)}</td>
                <td className={td} colSpan={2}>
                  Closing balance
                </td>
                <td className={right}>{amount(data.debit)}</td>
                <td className={right}>{amount(data.credit)}</td>
                <td className={right}>{drCr(data.closing)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Trial balance

function TrialBalance({ refreshKey, onOpenLedger }) {
  const [asOf, setAsOf] = useUrlState('asOf', '');
  const [result, setResult] = useState({ key: '', data: null, error: '' });
  const key = `${asOf}|${refreshKey}`;
  useEffect(() => {
    let live = true;
    booksApi
      .trialBalance(asOf)
      .then((data) => live && setResult({ key, data, error: '' }))
      .catch((err) => live && setResult({ key, data: null, error: err.message }));
    return () => {
      live = false;
    };
  }, [key, asOf]);
  const data = result.key === key ? result.data : null;

  function download(format) {
    const rows = data.groups.flatMap((g) => [{ name: g.label, debit: g.debit, credit: g.credit, isGroup: true }, ...g.accounts.map((a) => ({ name: `   ${a.name}`, debit: a.debit, credit: a.credit }))]);
    return exportTable(format, {
      fileName: `trial-balance_${data.asOf}`,
      title: 'Trial balance',
      subtitle: `As on ${formatDate(data.asOf)}${data.difference ? ` · difference ${amount(Math.abs(data.difference))}` : ''}`,
      rows,
      totals: { debit: data.debit, credit: data.credit },
      columns: [
        { key: 'name', label: 'Account', type: 'text', get: (r) => r.name },
        { key: 'debit', label: 'Debit', type: 'money', get: (r) => r.debit || null },
        { key: 'credit', label: 'Credit', type: 'money', get: (r) => r.credit || null },
      ],
    });
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <label className="text-xs font-semibold text-slate">
          As on
          <input type="date" value={asOf || (data?.asOf ?? '')} onChange={(e) => setAsOf(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <div className="ml-auto self-end">
          <ExportMenu onExport={download} disabled={!data} />
        </div>
      </FilterBar>
      {result.key === key && result.error ? <p className="text-sm text-red-700">{result.error}</p> : null}
      {!data ? <p className="text-sm text-slate">Loading…</p> : null}
      {data ? (
        <>
          {Math.abs(data.difference) > 0.004 ? (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Debits and credits differ by ₹{amount(Math.abs(data.difference))}. This comes from the opening balances: enter the remaining ones on the Setup tab until the difference is zero.
            </p>
          ) : (
            <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">Debits equal credits.</p>
          )}
          {data.entriesBeforeStart ? <p className="text-sm text-amber-900">{data.entriesBeforeStart} entr{data.entriesBeforeStart === 1 ? 'y is' : 'ies are'} dated before the books start ({formatDate(data.startDate)}).</p> : null}
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-paper text-slate">
                <tr>
                  <th className={td}>Account</th>
                  <th className={`${td} text-right`}>Debit</th>
                  <th className={`${td} text-right`}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {data.groups.map((g) => (
                  <Fragment key={g.id}>
                    <tr className="border-t border-line bg-paper/50 font-semibold">
                      <td className={td}>{g.label}</td>
                      <td className={right}>{amount(g.debit)}</td>
                      <td className={right}>{amount(g.credit)}</td>
                    </tr>
                    {g.accounts.map((a) => (
                      <tr key={a.id} className="border-t border-line/60">
                        <td className={`${td} pl-8`}>
                          <button type="button" onClick={() => onOpenLedger(a.id)} className="text-left text-accent hover:underline">
                            {a.name}
                          </button>
                        </td>
                        <td className={right}>{amount(a.debit)}</td>
                        <td className={right}>{amount(a.credit)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr className="border-t-2 border-ink font-bold">
                  <td className={td}>Total</td>
                  <td className={right}>{amount(data.debit)}</td>
                  <td className={right}>{amount(data.credit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Accounts

function Accounts({ accounts, groups, canEdit, canDelete, onChanged, onOpenLedger }) {
  const [query, setQuery] = useUrlState('q', '');
  const [showCustomers, setShowCustomers] = useState(false);
  const [form, setForm] = useState({ name: '', group: 'indirect_expenses' });
  const [error, setError] = useState('');
  const shown = accounts.filter((a) => (showCustomers || (!a.customer && !a.supplier)) && (!query || `${a.name} ${a.groupLabel}`.toLowerCase().includes(query.toLowerCase())));
  const grouped = accountOptions(shown.map((a) => ({ ...a, customer: null, supplier: null })));

  async function add(event) {
    event.preventDefault();
    setError('');
    try {
      await booksApi.createAccount(form);
      setForm((f) => ({ ...f, name: '' }));
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }
  async function act(fn) {
    setError('');
    try {
      await fn();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-3">
      {canEdit ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-white px-3 py-2.5">
          <label className="text-xs font-semibold text-slate">
            New account
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Electricity, HDFC Bank, Loan from …" className={`${inputClass} mt-1 w-64`} required />
          </label>
          <label className="text-xs font-semibold text-slate">
            Group
            <select value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value })} className={`${inputClass} mt-1`}>
              {groups.filter((g) => g.id !== 'sundry_debtors').map((g) => (
                <option key={g.id} value={g.id}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
            Add account
          </button>
        </form>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField value={query} onChange={setQuery} placeholder="Search accounts" />
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={showCustomers} onChange={(e) => setShowCustomers(e.target.checked)} />
          Show customer and supplier accounts
        </label>
        <div className="ml-auto">
          <ExportMenu
            disabled={!shown.length}
            onExport={(format) =>
              exportTable(format, {
                fileName: `chart-of-accounts_${localToday()}`,
                title: 'Chart of accounts',
                subtitle: `${shown.length} account(s)`,
                rows: shown,
                columns: [
                  { label: 'Account', type: 'text', get: (a) => a.name },
                  { label: 'Group', type: 'text', get: (a) => a.groupLabel },
                  { label: 'Balance', type: 'text', get: (a) => drCr(a.balance) },
                  { label: 'Status', type: 'text', get: (a) => (a.isActive ? 'Active' : 'Inactive') },
                ],
              })
            }
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-slate">
            <tr>
              <th className={td}>Account</th>
              <th className={`${td} text-right`}>Balance now</th>
              <th className={td} />
            </tr>
          </thead>
          <tbody>
            {grouped.map(([group, list]) => (
              <Fragment key={group}>
                <tr className="border-t border-line bg-paper/50">
                  <td className={`${td} font-semibold`} colSpan={3}>
                    {group}
                  </td>
                </tr>
                {list.map((a) => (
                  <tr key={a.id} className={`border-t border-line/60 ${a.isActive ? '' : 'text-steel'}`}>
                    <td className={`${td} pl-8`}>
                      <button type="button" onClick={() => onOpenLedger(a.id)} className="text-left text-accent hover:underline">
                        {a.name}
                      </button>
                      {a.system ? <span className="ml-2 text-xs text-slate">used by the app</span> : null}
                      {a.isActive ? null : <span className="ml-2 text-xs">inactive</span>}
                    </td>
                    <td className={right}>{drCr(a.balance)}</td>
                    <td className={`${td} whitespace-nowrap text-right`}>
                      {canEdit && !a.system && !a.party ? (
                        <button
                          type="button"
                          className="mr-3 text-sm font-semibold text-accent hover:underline"
                          onClick={async () => {
                            const name = window.prompt('New name for the account', a.name);
                            if (name && name.trim() !== a.name) act(() => booksApi.updateAccount(a.id, { name: name.trim() }));
                          }}
                        >
                          Rename
                        </button>
                      ) : null}
                      {canEdit && !a.system ? (
                        <button type="button" className="mr-3 text-sm font-semibold text-slate hover:underline" onClick={() => act(() => booksApi.updateAccount(a.id, { isActive: !a.isActive }))}>
                          {a.isActive ? 'Make inactive' : 'Make active'}
                        </button>
                      ) : null}
                      {canDelete && !a.system && !a.party && !a.used ? (
                        <button
                          type="button"
                          className="text-sm font-semibold text-red-700 hover:underline"
                          onClick={async () => {
                            if (await confirmAction({ message: `Delete ${a.name}?`, confirmLabel: 'Delete', danger: true })) act(() => booksApi.deleteAccount(a.id));
                          }}
                        >
                          Delete
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Setup

function Setup({ settings, accounts, canEdit, onChanged }) {
  const [form, setForm] = useState({ startDate: settings.startDate, lockDate: settings.lockDate, defaultBank: settings.defaultBank || '' });
  const editable = accounts.filter((a) => !a.customer && !a.supplier);
  const [openings, setOpenings] = useState(() => Object.fromEntries(editable.map((a) => [a.id, { debit: a.openingDr || '', credit: a.openingCr || '' }])));
  const [trial, setTrial] = useState(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const customersOpening = accounts.filter((a) => a.customer || a.supplier).reduce((s, a) => s + (a.opening || 0), 0);
  const typedDr = Object.values(openings).reduce((s, o) => s + (Number(o.debit) || 0), 0);
  const typedCr = Object.values(openings).reduce((s, o) => s + (Number(o.credit) || 0), 0);
  const difference = Math.round((typedDr + customersOpening - typedCr) * 100) / 100;

  async function saveSettings(event) {
    event.preventDefault();
    setError('');
    try {
      await booksApi.saveSettings(form);
      setNotice('Settings saved.');
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }
  async function saveOpenings() {
    setError('');
    try {
      const rows = Object.entries(openings).map(([accountId, o]) => ({ accountId, debit: Number(o.debit) || 0, credit: Number(o.credit) || 0 }));
      setTrial(await booksApi.saveOpenings(rows));
      setNotice('Opening balances saved.');
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p> : null}
      <form onSubmit={saveSettings} className="space-y-3 rounded-xl border border-line bg-white p-4">
        <h2 className="text-base font-semibold">Books settings</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            Books start on
            <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} disabled={!canEdit} className={`${inputClass} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate">The first day the app keeps the books. Opening balances are as of this day.</span>
          </label>
          <label className="text-sm font-semibold">
            Locked up to
            <input type="date" value={form.lockDate} onChange={(e) => setForm({ ...form, lockDate: e.target.value })} disabled={!canEdit} className={`${inputClass} mt-1`} />
            <span className="mt-1 block text-xs font-normal text-slate">After the CA closes a month or year, nobody can add or cancel entries up to this day.</span>
          </label>
          <label className="text-sm font-semibold">
            Customer payments go to
            <select value={form.defaultBank} onChange={(e) => setForm({ ...form, defaultBank: e.target.value })} disabled={!canEdit} className={`${inputClass} mt-1`}>
              {accounts.filter((a) => a.group === 'bank').map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate">Bank account for payments by transfer, UPI or cheque. Cash goes to Cash in hand.</span>
          </label>
        </div>
        {canEdit ? (
          <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
            Save settings
          </button>
        ) : null}
      </form>

      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">Opening balances on {formatDate(settings.startDate)}</h2>
            <p className="text-sm text-slate">
              Copy them from your CA&apos;s trial balance on that day. Customers&apos; balances ({drCr(customersOpening)}) come from their opening bills; add those under{' '}
              <Link to="/billing/openings-import" className="font-semibold text-accent hover:underline">
                Import opening balances
              </Link>
              .
            </p>
          </div>
          <p className={`text-sm font-semibold ${Math.abs(difference) > 0.004 ? 'text-red-700' : 'text-emerald-700'}`}>
            {Math.abs(difference) > 0.004 ? `Difference: ₹${amount(Math.abs(difference))} ${difference > 0 ? 'more debit' : 'more credit'}` : 'Debits equal credits'}
          </p>
        </div>
        <div className="max-h-[32rem] overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-paper text-slate">
              <tr>
                <th className={td}>Account</th>
                <th className={`${td} w-40 text-right`}>Debit</th>
                <th className={`${td} w-40 text-right`}>Credit</th>
              </tr>
            </thead>
            <tbody>
              {accountOptions(editable).map(([group, list]) => (
                <Fragment key={group}>
                  <tr className="border-t border-line bg-paper/50">
                    <td className={`${td} font-semibold`} colSpan={3}>
                      {group}
                    </td>
                  </tr>
                  {list.map((a) => (
                    <tr key={a.id} className="border-t border-line/60">
                      <td className={`${td} pl-8`}>{a.name}</td>
                      {['debit', 'credit'].map((side) => (
                        <td key={side} className="px-2 py-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!canEdit}
                            value={openings[a.id]?.[side] ?? ''}
                            onChange={(e) => setOpenings((o) => ({ ...o, [a.id]: { debit: side === 'debit' ? e.target.value : e.target.value ? '' : o[a.id]?.debit ?? '', credit: side === 'credit' ? e.target.value : e.target.value ? '' : o[a.id]?.credit ?? '' } }))}
                            className={`${inputClass} text-right`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {canEdit ? (
          <button type="button" onClick={saveOpenings} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">
            Save opening balances
          </button>
        ) : null}
        {trial && Math.abs(trial.openingDifference) > 0.004 ? <p className="text-sm text-amber-900">Saved. The opening balances still differ by ₹{amount(Math.abs(trial.openingDifference))}.</p> : null}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------- page

export function Books() {
  const { can } = usePermission();
  const [tab, setTab] = useUrlState('tab', 'daybook');
  const [, setParams] = useSearchParams();
  const [settings, setSettings] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [entryOpen, setEntryOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([booksApi.settings(), booksApi.accounts()])
      .then(([s, a]) => {
        setSettings(s);
        setAccounts(a);
      })
      .catch((err) => setError(err.message));
  }, []);
  useEffect(load, [load]);
  const changed = () => {
    setRefreshKey((k) => k + 1);
    load();
  };
  // One address-bar change, so the tab and the account switch together.
  const openLedger = (id) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('tab', 'ledger');
        next.set('account', id);
        return next;
      },
      { replace: true }
    );

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!settings) return <p className="text-sm text-slate">Loading the books…</p>;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Books"
        subtitle={`Accounts from ${formatDate(settings.startDate)}. Sales invoices and customer payments post here by themselves.`}
        actions={
          can('accounts:create') ? (
            <button type="button" onClick={() => setEntryOpen(true)} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              New entry
            </button>
          ) : null
        }
      />
      <Tabs tabs={TABS} value={tab} onChange={setTab} />
      {tab === 'daybook' ? <DayBook startDate={settings.startDate} canCancel={can('accounts:update')} refreshKey={refreshKey} onChanged={changed} /> : null}
      {tab === 'ledger' ? <Ledger accounts={accounts} startDate={settings.startDate} refreshKey={refreshKey} /> : null}
      {tab === 'trial' ? <TrialBalance refreshKey={refreshKey} onOpenLedger={openLedger} /> : null}
      {tab === 'tds' ? <TdsSummary startDate={settings.startDate} refreshKey={refreshKey} onOpenLedger={openLedger} /> : null}
      {tab === 'accounts' ? <Accounts accounts={accounts} groups={settings.groups} canEdit={can('accounts:create')} canDelete={can('accounts:update')} onChanged={changed} onOpenLedger={openLedger} /> : null}
      {tab === 'setup' ? <Setup key={refreshKey} settings={settings} accounts={accounts} canEdit={can('accounts:update')} onChanged={changed} /> : null}
      <VoucherForm open={entryOpen} accounts={accounts} defaultBank={settings.defaultBank} onClose={() => setEntryOpen(false)} onSaved={changed} />
    </div>
  );
}
