import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi } from '../api/tasks.api';
import { TaskDrawer } from '../components/tasks/TaskDrawer';
import { TaskForm } from '../components/tasks/TaskForm';
import { TaskBook } from '../components/tasks/TaskBook';
import { TaskTable } from '../components/tasks/TaskTable';
import { EmptyState } from '../components/ui/EmptyState';
import { ExportMenu } from '../components/ui/ExportMenu';
import { DateRangeFilter, FilterBar, FilterSelect } from '../components/ui/Filters';
import { Pagination } from '../components/ui/Pagination';
import { exportTable } from '../lib/exporters';
import { fetchAllPages } from '../lib/fetchAll';
import { SearchField } from '../components/ui/SearchField';
import { useFloorWorker, usePermission } from '../hooks/usePermission';
import { useTaskSummary } from '../hooks/useTaskSummary';
import { ORDER_TYPES, formatDate, orderTypeLabel, toDateInput } from '../lib/sales';
import { notifyTasksChanged, roleLabel, TASK_CATEGORY_LABELS, TASK_SCOPES, TASKS_CHANGED_EVENT } from '../lib/tasks';

const PAGE_SIZES = [10, 25, 50, 100];
const PRIORITY_OPTIONS = [
  { id: '', label: 'Any priority' },
  { id: 'normal', label: 'Normal' },
  { id: 'high', label: 'High' },
  { id: 'urgent', label: 'Urgent' },
];
const STATUS_LABEL = { open: 'Not started', in_progress: 'In progress', blocked: 'Blocked', done: 'Done', cancelled: 'Cancelled' };

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
  const assignee = searchParams.get('assignee') || '';
  const priority = searchParams.get('priority') || '';
  const dueFrom = searchParams.get('dueFrom') || '';
  const dueTo = searchParams.get('dueTo') || '';
  const pageSize = PAGE_SIZES.includes(Number(searchParams.get('rows'))) ? Number(searchParams.get('rows')) : 10;

  // Floor workers' task book shows every task for their station; the office
  // table asks the server for one page at a time.
  const [tasks, setTasks] = useState([]);
  const [paged, setPaged] = useState({ items: [], total: 0, pages: 1 });
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [people, setPeople] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [claimingId, setClaimingId] = useState('');

  function setParam(key, value, fallback) {
    setParams({ [key]: value === fallback ? '' : value });
  }

  // Changes several filters at once (in the address bar); any filter change goes back to page 1.
  function setParams(changes) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    if (!('page' in changes)) params.delete('page');
    setSearchParams(params, { replace: true });
  }

  useEffect(() => {
    if (floorWorker || !can('tasks:create')) return;
    tasksApi
      .assignees()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [floorWorker, can]);

  // Filters can change faster than the list loads: only the newest request
  // may write to the screen.
  const latestRequest = useRef(0);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const setPage = (next) => setParams({ page: next > 1 ? String(next) : '' });
  // The search box writes to the address bar once typing stops.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() !== (searchParams.get('q') || '')) setParams({ q: query.trim() });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);
  const searchText = searchParams.get('q') || '';
  const listParams = { scope, status, category, orderType, overdue: overdue ? '1' : '', q: searchText, assignee, priority, dueFrom, dueTo };

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setError('');
    try {
      const params = listParams;
      const data = floorWorker ? await tasksApi.list(params) : await tasksApi.list({ ...params, page, pageSize });
      if (request !== latestRequest.current) return;
      if (floorWorker) setTasks(data);
      else setPaged(data);
    } catch (err) {
      if (request === latestRequest.current) setError(err.message);
    } finally {
      if (request === latestRequest.current) setLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(listParams), page, pageSize, floorWorker]);

  useEffect(() => {
    load();
  }, [load]);

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

  const filtered = status !== 'active' || category !== 'all' || orderType !== 'all' || overdue || assignee || priority || dueFrom || dueTo;

  function clearFilters() {
    setQuery('');
    setParams({ status: '', category: '', type: '', overdue: '', assignee: '', priority: '', dueFrom: '', dueTo: '', q: '' });
  }

  // Download every task matching the filters (all pages).
  async function exportTasks(format) {
    const rows = floorWorker ? tasks : await fetchAllPages(tasksApi.list, listParams);
    const who = people.find((p) => p.id === assignee);
    const parts = [
      STATUS_FILTERS.find((f) => f.id === status)?.label,
      category !== 'all' ? TASK_CATEGORY_LABELS[category] : null,
      orderType !== 'all' ? orderTypeLabel(orderType) : null,
      overdue ? 'overdue' : null,
      assignee === 'unassigned' ? 'not assigned' : who ? `for ${who.fullName}` : null,
      priority ? `${priority} priority` : null,
      dueFrom || dueTo ? `due ${dueFrom ? formatDate(dueFrom) : '...'} to ${dueTo ? formatDate(dueTo) : '...'}` : null,
      searchText ? `search: ${searchText}` : null,
    ].filter(Boolean);
    await exportTable(format, {
      fileName: `tasks_${toDateInput(new Date())}`,
      title: 'Tasks',
      subtitle: [`${rows.length} task(s)`, ...parts].join(' · '),
      rows,
      columns: [
        { label: 'Task', type: 'text', get: (t) => t.number },
        { label: 'Title', type: 'text', get: (t) => t.title },
        { label: 'Kind', type: 'text', get: (t) => TASK_CATEGORY_LABELS[t.category] || t.category },
        { label: 'Order', type: 'text', get: (t) => t.orderNumber || '' },
        { label: 'Order type', type: 'text', get: (t) => (t.orderType ? orderTypeLabel(t.orderType) : '') },
        { label: 'Assigned to', type: 'text', get: (t) => t.assigneeName || (t.assigneeRole ? `${roleLabel(t.assigneeRole)} team` : '') },
        { label: 'Priority', type: 'text', get: (t) => t.priority },
        { label: 'Status', type: 'text', get: (t) => STATUS_LABEL[t.status] || t.status },
        { label: 'Due', type: 'date', get: (t) => t.dueDate },
        { label: 'Overdue', type: 'text', get: (t) => (t.overdue ? 'Yes' : '') },
        { label: 'Created', type: 'date', get: (t) => t.createdAt },
        { label: 'Done on', type: 'date', get: (t) => t.completedAt },
      ],
    });
  }

  const total = floorWorker ? tasks.length : paged.total;

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
            {/* summary.overdue counts "My tasks"; on other scopes the number would not match the list. */}
            {overdue ? `Overdue · ${total}` : scope === 'inbox' ? `Overdue · ${summary?.overdue ?? 0}` : 'Overdue'}
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

      {floorWorker ? null : (
        <FilterBar>
          {people.length ? (
            <FilterSelect
              label="Assigned to"
              value={assignee}
              onChange={(value) => setParams({ assignee: value })}
              options={[{ id: '', label: 'Anyone' }, { id: 'unassigned', label: 'Not assigned yet' }, ...people.map((p) => ({ id: p.id, label: `${p.fullName}${p.role ? ` · ${p.role.name}` : ''}` }))]}
            />
          ) : null}
          <FilterSelect label="Priority" value={priority} onChange={(value) => setParams({ priority: value })} options={PRIORITY_OPTIONS} />
          <DateRangeFilter label="Due" from={dueFrom} to={dueTo} onChange={(range) => setParams({ dueFrom: range.from, dueTo: range.to })} />
          <div className="ml-auto self-end">
            <ExportMenu onExport={exportTasks} disabled={!total} label={total ? `Download ${total.toLocaleString('en-IN')}` : 'Download'} />
          </div>
        </FilterBar>
      )}

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
        {floorWorker ? null : <TaskTable tasks={paged.items} onOpen={setSelected} onClaim={claim} busyId={claimingId} />}
        {!loaded ? (
          <p className="px-4 py-6 text-sm text-slate">Loading…</p>
        ) : total === 0 ? (
          <EmptyState
            title={filtered || query ? 'No tasks match these filters' : "You're all caught up"}
            hint={filtered || query ? 'Try clearing the filters or search.' : 'Tasks appear automatically as orders move forward, or create one with New task.'}
          />
        ) : (
          <Pagination
            page={page}
            totalPages={floorWorker ? 1 : paged.pages}
            total={total}
            pageSize={floorWorker ? Math.max(total, 1) : pageSize}
            onPage={setPage}
            onPageSize={floorWorker ? undefined : (size) => setParams({ rows: size === 10 ? '' : String(size) })}
            pageSizes={PAGE_SIZES}
          />
        )}
      </div>

      <TaskDrawer task={selected} onClose={() => setSelected(null)} onChanged={load} />
      <TaskForm open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </div>
  );
}
