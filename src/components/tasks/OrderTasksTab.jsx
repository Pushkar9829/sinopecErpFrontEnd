import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { tasksApi } from '../../api/tasks.api';
import { usePermission } from '../../hooks/usePermission';
import { TASKS_CHANGED_EVENT, dueText, isTaskOpen, notifyTasksChanged, taskAction, taskGuide, taskOwner } from '../../lib/tasks';
import { EmptyState } from '../ui/EmptyState';
import { TaskDrawer } from './TaskDrawer';
import { TaskForm } from './TaskForm';
import { TaskTable } from './TaskTable';

export function useOrderTasks(orderId) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!orderId) return Promise.resolve();
    return tasksApi
      .forOrder(orderId)
      .then((data) => {
        setTasks(data);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [orderId]);

  useEffect(() => {
    load();
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, load);
  }, [load]);

  return { tasks, error, loaded, load, openCount: tasks.filter(isTaskOpen).length };
}

function useClaim(onDone) {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const claim = async (task) => {
    setBusyId(task.id);
    setError('');
    try {
      await tasksApi.claim(task.id);
      notifyTasksChanged();
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId('');
    }
  };
  return { claim, busyId, error };
}

export function OrderNextStep({ state, onShowAll }) {
  const [selected, setSelected] = useState(null);
  const { pathname: here } = useLocation();
  const open = state.tasks.filter(isTaskOpen);
  if (!state.loaded || !open.length) return null;

  const mine = open.filter((task) => task.canWork);
  const shown = (mine.length ? mine : open).slice(0, 3);

  return (
    <section className={`rounded-xl border px-4 py-3 ${mine.length ? 'border-amber-300 bg-amber-50' : 'border-line bg-card'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-ink">
          {mine.length ? `Next step for you${mine.length > 1 ? ` (${mine.length})` : ''}` : 'Waiting on'}
        </p>
        {onShowAll ? (
          <button type="button" onClick={onShowAll} className="text-xs font-semibold text-slate underline hover:text-ink">
            All tasks on this order ({open.length} open)
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-2">
        {shown.map((task) => {
          const action = task.canWork ? taskAction(task) : null;
          const external = action && action.to !== here;
          return (
            <li key={task.id} className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => setSelected(task)} className="min-w-0 flex-1 text-left">
                <span className="block text-sm font-semibold text-ink underline decoration-line underline-offset-2">{task.title}</span>
                <span className={`block text-xs ${task.overdue ? 'font-semibold text-red-700' : 'text-slate'}`}>
                  {taskOwner(task)} · {dueText(task)}
                  {task.canWork && !external && taskGuide(task) ? ` · ${taskGuide(task)}` : ''}
                </span>
              </button>
              {external ? (
                <Link to={action.to} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-dark">
                  {action.label}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
      <TaskDrawer task={selected} onClose={() => setSelected(null)} onChanged={state.load} />
    </section>
  );
}

export function OrderTasksTab({ order, state }) {
  const { can } = usePermission();
  const { tasks, error, loaded, load } = state;
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const { claim, busyId, error: claimError } = useClaim(load);
  const open = tasks.filter(isTaskOpen);
  const closed = tasks.filter((task) => !isTaskOpen(task));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate">
          {open.length ? `${open.length} open, ${closed.length} closed` : 'No open tasks on this order.'}
        </p>
        {can('tasks:create') && order.status !== 'cancelled' ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark"
          >
            Add task
          </button>
        ) : null}
      </div>
      {error || claimError ? <p className="text-sm text-red-700">{error || claimError}</p> : null}
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        {tasks.length ? (
          <TaskTable tasks={[...open, ...closed]} onOpen={setSelected} onClaim={claim} busyId={busyId} showOrder={false} />
        ) : null}
        {loaded && !tasks.length ? <EmptyState title="No tasks yet" hint="Tasks are created as this order moves through its steps." /> : null}
        {!loaded ? <p className="px-4 py-6 text-sm text-slate">Loading…</p> : null}
      </div>
      <TaskDrawer task={selected} onClose={() => setSelected(null)} onChanged={load} />
      <TaskForm open={creating} onClose={() => setCreating(false)} onCreated={load} orderId={order.id} orderNumber={order.number} orderItems={order.items || []} />
    </div>
  );
}
