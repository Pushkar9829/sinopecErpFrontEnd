import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi } from '../api/tasks.api';
import { TaskDrawer } from '../components/tasks/TaskDrawer';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskBook } from '../components/tasks/TaskBook';
import { TaskTable } from '../components/tasks/TaskTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { usePagedList } from '../hooks/usePagedList';
import { useFloorWorker, usePermission } from '../hooks/usePermission';
import { useTaskSummary } from '../hooks/useTaskSummary';
import { ORDER_TYPES } from '../lib/sales';
import { notifyTasksChanged, TASK_CATEGORY_LABELS, TASK_SCOPES, TASKS_CHANGED_EVENT } from '../lib/tasks';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { id: 'active', label: 'Open' },
  { id: 'open', label: 'Not started' },
  { id: 'in_progress', label: 'In progress' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'any', label: 'Any status' },
];

const selectClass =
  'rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink outline-none hover:bg-paper focus:border-accent';

export function Tasks() {
  const { can } = usePermission();
  const summary = useTaskSummary();
  const [searchParams, setSearchParams] = useSearchParams();
  const floorWorker = useFloorWorker();
  const defaultScope = 'all';
  const scopes = [{ id: 'all', label: floorWorker ? 'My station' : 'All tasks' }, ...TASK_SCOPES];
  const requestedScope = searchParams.get('scope') || defaultScope;
  const scope = scopes.some((item) => item.id === requestedScope) ? requestedScope : defaultScope;
  const status = searchParams.get('status') || 'active';
  const category = searchParams.get('category') || 'all';
  const orderType = searchParams.get('type') || 'all';
  const overdue = searchParams.get('overdue') === '1';

  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [claimingId, setClaimingId] = useState('');

  function setParam(key, value, fallback) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === fallback) params.delete(key);
    else params.set(key, value);
    setSearchParams(params, { replace: true });
  }

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await tasksApi.list({
        scope,
        status,
        category,
        orderType,
        overdue: overdue ? '1' : '',
        q: query.trim(),
      });
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoaded(true);
    }
  }, [scope, status, category, orderType, overdue, query]);

  useEffect(() => {
    const timer = window.setTimeout(load, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  useEffect(() => {
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, load);
  }, [load]);

  async function claim(task) {
    setClaimingId(task.id);
    setError('');
    try {
      await tasksApi.claim(task.id);
      notifyTasksChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaimingId('');
    }
  }

  const filtered = status !== 'active' || category !== 'all' || orderType !== 'all' || overdue;

  function clearFilters() {
    const params = new URLSearchParams(searchParams);
    ['status', 'category', 'type', 'overdue'].forEach((key) => params.delete(key));
    setSearchParams(params, { replace: true });
  }

  const list = usePagedList(tasks, { pageSize: PAGE_SIZE, resetKey: `${scope}|${status}|${category}|${orderType}|${overdue}|${query}` });

  const tabs = scopes.map((item) => ({
    ...item,
    count:
      item.id === 'inbox' ? summary?.total : item.id === 'mine' ? summary?.assigned : undefined,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-card px-3 py-2">
        <h1 className="px-1 text-lg font-semibold">Tasks</h1>
        <select aria-label="Show" value={scope} onChange={(event) => setParam('scope', event.target.value, defaultScope)} className={selectClass}>
          {tabs.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
              {item.count ? ` · ${item.count}` : ''}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(event) => setParam('status', event.target.value, 'active')} className={selectClass}>
          {STATUS_FILTERS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        {floorWorker ? null : (
          <>
            <select aria-label="Kind" value={category} onChange={(event) => setParam('category', event.target.value, 'all')} className={selectClass}>
              <option value="all">All kinds</option>
              {Object.entries(TASK_CATEGORY_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <select aria-label="Order type" value={orderType} onChange={(event) => setParam('type', event.target.value, 'all')} className={selectClass}>
              <option value="all">All orders</option>
              {ORDER_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </>
        )}
        {summary?.overdue || overdue ? (
          <button
            type="button"
            aria-pressed={overdue}
            onClick={() => setParam('overdue', overdue ? '' : '1')}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold ${
              overdue ? 'border-rose-700 bg-rose-700 text-white' : 'border-rose-300 bg-rose-100 text-rose-800 hover:bg-rose-200'
            }`}
          >
            Overdue · {overdue ? list.total : (summary?.overdue ?? 0)}
          </button>
        ) : null}
        {filtered ? (
          <button type="button" onClick={clearFilters} className="px-1 text-sm font-semibold text-slate underline hover:text-ink">
            Clear
          </button>
        ) : null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search task or order" />
          {can('tasks:create') ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M10 4v12M4 10h12" strokeLinecap="round" />
              </svg>
              New task
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {searchParams.get('saved') ? (
        <p className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span>
            Entry saved for {searchParams.get('saved')}. Progress is updated below; the task closes by itself when the stage is finished.
          </span>
          <button type="button" onClick={() => setParam('saved', '')} className="ml-auto font-semibold underline">
            Dismiss
          </button>
        </p>
      ) : null}

      {floorWorker && loaded && tasks.length ? (
        <TaskBook tasks={tasks} onOpen={setSelected} onClaim={claim} busyId={claimingId} />
      ) : null}

      <div className={floorWorker && loaded && tasks.length ? 'hidden' : 'overflow-x-auto rounded-xl border border-line bg-card'}>
        {floorWorker ? null : <TaskTable tasks={list.paged} onOpen={setSelected} onClaim={claim} busyId={claimingId} />}
        {!loaded ? (
          <p className="px-4 py-6 text-sm text-slate">Loading…</p>
        ) : list.total === 0 ? (
          <EmptyState
            title={filtered || query ? 'No tasks match these filters' : "You're all caught up"}
            hint={filtered || query ? 'Try clearing the filters or search.' : 'Tasks appear automatically as orders move forward, or create one with New task.'}
          />
        ) : (
          <Pagination page={list.page} totalPages={list.totalPages} total={list.total} pageSize={list.pageSize} onPage={list.setPage} />
        )}
      </div>

      <TaskDrawer task={selected} onClose={() => setSelected(null)} onChanged={load} />
      <TaskForm open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </div>
  );
}
