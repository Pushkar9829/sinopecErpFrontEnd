import { useEffect, useState } from 'react';
import { auditApi } from '../api/audit.api';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { ExportMenu } from '../components/ui/ExportMenu';
import { useListParams } from '../hooks/useListParams';
import { exportTable } from '../lib/exporters';
import { fetchAllPages } from '../lib/fetchAll';

const PAGE_SIZE = 25;
const selectClass = 'rounded-lg border border-line bg-white px-3 py-1.5 text-sm outline-none focus:border-accent';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function showValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function LogDetail({ log, onClose }) {
  return (
    <Modal open={Boolean(log)} onClose={onClose} title="Change details" wide="entry">
      {log ? (
        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <p>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate">When</span>
              {formatWhen(log.at)}
            </p>
            <p>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate">Who</span>
              {log.actorName || 'Unknown'}
              {log.actorRole ? <span className="text-slate"> · {log.actorRole}</span> : null}
            </p>
            <p>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate">What</span>
              {log.summary}
            </p>
            <p>
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate">Result</span>
              {log.success ? 'Saved' : `Failed (${log.status})`}
              {log.error ? <span className="block text-red-700">{log.error}</span> : null}
            </p>
            <p className="sm:col-span-2 break-all text-xs text-slate">
              {log.method} {log.path} · IP {log.ip || '—'}
            </p>
          </div>

          {log.changes?.length ? (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-paper">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field</th>
                    <th className="px-3 py-2 font-semibold">Before</th>
                    <th className="px-3 py-2 font-semibold">After</th>
                  </tr>
                </thead>
                <tbody>
                  {log.changes.map((change) => (
                    <tr key={change.field} className="border-t border-line align-top">
                      <td className="px-3 py-2 font-semibold">{change.field}</td>
                      <td className="max-w-xs whitespace-pre-wrap break-words px-3 py-2 text-red-800">{showValue(change.before)}</td>
                      <td className="max-w-xs whitespace-pre-wrap break-words px-3 py-2 text-emerald-800">{showValue(change.after)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate">No field-by-field changes were recorded for this action.</p>
          )}

          {log.payload && Object.keys(log.payload).length ? (
            <details className="rounded-lg border border-line bg-paper px-3 py-2">
              <summary className="cursor-pointer font-semibold">Data sent</summary>
              <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(log.payload, null, 2)}</pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}

export function AuditLogs() {
  const list = useListParams({ q: '', module: '', actor: '', outcome: '', from: '', to: '' }, { pageSize: PAGE_SIZE });
  const { values: filters, page, pageSize } = list;
  const [query, setQuery] = useState(filters.q);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [meta, setMeta] = useState({ modules: [], actors: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    auditApi.meta().then(setMeta).catch(() => {});
  }, []);

  // Filter changes reset the page in the same update, so each change makes
  // one request (it used to fetch the old page first, then page 1).
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== filters.q) list.set('q', query);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    auditApi
      .list({ ...filters, page, limit: pageSize })
      .then((next) => alive && setData(next))
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, page, pageSize]);

  const setFilter = (key) => (event) => list.set(key, event.target.value);

  // Download every entry matching the filters (all pages).
  async function download(format) {
    const rows = await fetchAllPages((p) => auditApi.list({ ...filters, page: p.page, limit: p.pageSize }), {});
    const parts = [filters.module, filters.actor ? meta.actors?.find((a) => (a.id || a) === filters.actor)?.name || 'one user' : '', filters.outcome, filters.from || filters.to ? `${filters.from || '...'} to ${filters.to || '...'}` : '', filters.q ? `search: ${filters.q}` : ''].filter(Boolean);
    await exportTable(format, {
      fileName: `audit-log_${new Date().toISOString().slice(0, 10)}`,
      title: 'Audit log',
      subtitle: [`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`, ...parts].join(' · '),
      rows,
      columns: [
        { label: 'When', type: 'text', get: (log) => formatWhen(log.at) },
        { label: 'Who', type: 'text', get: (log) => log.actorName || 'Unknown' },
        { label: 'Role', type: 'text', get: (log) => log.actorRole },
        { label: 'Module', type: 'text', get: (log) => log.module },
        { label: 'What happened', type: 'text', get: (log) => log.summary },
        { label: 'Fields changed', type: 'number', get: (log) => log.changes?.length || 0 },
        { label: 'Result', type: 'text', get: (log) => (log.success ? 'Done' : 'Failed') },
      ],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Audit log</h1>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search who, what, record" />
          <select value={filters.module} onChange={setFilter('module')} className={selectClass} aria-label="Module">
            <option value="">All modules</option>
            {meta.modules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
          <select value={filters.actor} onChange={setFilter('actor')} className={selectClass} aria-label="User">
            <option value="">All users</option>
            {meta.actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
          <select value={filters.outcome} onChange={setFilter('outcome')} className={selectClass} aria-label="Result">
            <option value="">All results</option>
            <option value="success">Saved</option>
            <option value="failed">Failed</option>
          </select>
          <input type="date" value={filters.from} onChange={setFilter('from')} className={selectClass} aria-label="From date" />
          <input type="date" value={filters.to} onChange={setFilter('to')} className={selectClass} aria-label="To date" />
          {list.active ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                list.reset();
              }}
              className="px-1 text-sm font-semibold text-accent hover:underline"
            >
              Clear filters
            </button>
          ) : null}
          <ExportMenu onExport={download} disabled={!data.total} />
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="min-w-full whitespace-nowrap text-left text-sm lg:whitespace-normal">
          <thead className="bg-ink text-paper">
            <tr>
              <th className="px-4 py-3 font-semibold">When</th>
              <th className="px-4 py-3 font-semibold">Who</th>
              <th className="px-4 py-3 font-semibold">Module</th>
              <th className="px-4 py-3 font-semibold">What happened</th>
              <th className="px-4 py-3 font-semibold">Changes</th>
              <th className="px-4 py-3 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((log) => (
              <tr
                key={log.id}
                tabIndex={0}
                onClick={() => setSelected(log)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    setSelected(log);
                  }
                }}
                className="cursor-pointer border-t border-line align-top hover:bg-paper/70 focus:bg-paper/70 focus:outline-none"
              >
                <td className="px-4 py-3 text-slate">{formatWhen(log.at)}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{log.actorName || 'Unknown'}</span>
                  {log.actorRole ? <span className="block text-xs text-slate">{log.actorRole}</span> : null}
                </td>
                <td className="px-4 py-3">{log.module}</td>
                <td className="px-4 py-3">{log.summary}</td>
                <td className="px-4 py-3 text-slate">{log.changes?.length ? `${log.changes.length} field${log.changes.length > 1 ? 's' : ''}` : '—'}</td>
                <td className="px-4 py-3">
                  {log.success ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Saved</span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">Failed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && !data.items.length ? <p className="px-4 py-6 text-sm text-slate">Loading…</p> : null}
        {!loading && !data.items.length ? (
          <EmptyState title="No changes recorded" hint="Every create, edit, delete and login will appear here." />
        ) : data.items.length ? (
          <Pagination page={page} totalPages={data.pages} total={data.total} pageSize={pageSize} onPage={list.setPage} onPageSize={list.setPageSize} />
        ) : null}
      </div>

      <LogDetail log={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
