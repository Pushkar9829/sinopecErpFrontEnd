import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { salesOrdersApi } from '../../api/salesOrders.api';
import { tasksApi } from '../../api/tasks.api';
import { usePermission } from '../../hooks/usePermission';
import {
  dueText,
  formatDateTime,
  isTaskOpen,
  notifyTasksChanged,
  taskAction,
  taskCategoryLabel,
  taskGuide,
  taskOwner,
  taskQuantity,
  taskStatusLabel,
  taskStatusTone,
} from '../../lib/tasks';
import { Badge, PriorityBadge } from '../ui/Badge';
import { confirmAction } from '../ui/ConfirmHost';
import { inputClass } from '../ui/FormField';
import { Modal } from '../ui/Modal';
import { AssigneeSelect, assigneePayload, assigneeValue } from './AssigneeSelect';
import { ItemQuantityFields, itemQuantityError } from './TaskForm';
import { JobCard } from './TaskBook';
import { TaskProgress } from './TaskTable';

const outline =
  'inline-flex items-center rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold text-ink hover:bg-paper disabled:opacity-60';
const primary = 'rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accent-dark disabled:opacity-60';

function Row({ label, children }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate">{label}</p>
      <div className="mt-0.5 text-sm text-ink">{children}</div>
    </div>
  );
}

export function TaskDrawer({ task: initial, onClose, onChanged }) {
  const { can } = usePermission();
  const [task, setTask] = useState(initial);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [people, setPeople] = useState([]);
  const [assignee, setAssignee] = useState('');
  const [itemDraft, setItemDraft] = useState({ itemId: '', quantity: '' });
  const [orderItems, setOrderItems] = useState(null);

  useEffect(() => {
    setTask(initial);
    setError('');
    setComment('');
    if (!initial) return;
    setAssignee(assigneeValue(initial));
    tasksApi
      .get(initial.id)
      .then((fresh) => {
        setTask(fresh);
        setAssignee(assigneeValue(fresh));
      })
      .catch((err) => setError(err.message));
  }, [initial]);

  useEffect(() => {
    setItemDraft({ itemId: task?.itemId || '', quantity: task?.quantity ?? '' });
  }, [task?.itemId, task?.quantity]);

  const orderToLoad = task && isTaskOpen(task) && task.canManage && task.source === 'manual' ? task.order : '';
  useEffect(() => {
    setOrderItems(null);
    if (!orderToLoad) return;
    salesOrdersApi
      .get(orderToLoad)
      .then((order) => setOrderItems(order.items || []))
      .catch(() => setOrderItems(null));
  }, [orderToLoad]);

  useEffect(() => {
    if (!task?.canManage || !(can('tasks:create') || can('tasks:*'))) return;
    tasksApi
      .assignees()
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [task?.canManage, can]);

  if (!task) return null;

  const editItem = isTaskOpen(task) && task.canManage && task.source === 'manual' && Boolean(task.order);
  const itemChanged =
    itemDraft.itemId !== (task.itemId || '') || String(itemDraft.quantity) !== String(task.quantity ?? '');

  async function act(action) {
    setBusy(true);
    setError('');
    try {
      const updated = await action();
      setTask(updated);
      setAssignee(assigneeValue(updated));
      notifyTasksChanged();
      onChanged?.(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const setStatus = (status, note) => act(() => tasksApi.update(task.id, { status, note }));

  async function block() {
    const reason = await confirmAction({
      title: 'Block task',
      message: 'What is stopping this task?',
      withReason: true,
      reasonLabel: 'Reason',
      confirmLabel: 'Block',
    });
    if (!reason) return;
    await setStatus('blocked', reason);
  }

  async function cancel() {
    const reason = await confirmAction({ title: 'Cancel task', withReason: true, confirmLabel: 'Cancel task', danger: true });
    if (reason === null) return;
    await setStatus('cancelled', reason);
  }

  const open = isTaskOpen(task);
  const canFinish = open && task.canWork && !task.closesItself && task.category !== 'payment_collect';
  const action = open && task.canWork ? taskAction(task) : null;
  const orderLink = task.order ? `/sales-orders/${task.order}` : '';
  const guide = taskGuide(task);

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={
        <div>
          <p className="text-sm font-normal text-slate">
            {task.number} · {taskCategoryLabel(task.category)} · {task.source === 'auto' ? 'Automatic' : 'Manual'}
          </p>
          <h2 className="text-lg font-semibold text-ink">{task.title}</h2>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
          <PriorityBadge priority={task.priority} />
          {task.overdue ? <Badge tone="danger">Overdue</Badge> : null}
          <div className="ml-auto flex flex-wrap gap-2">
            {orderLink && action?.to !== orderLink ? (
              <Link to={orderLink} className={outline} onClick={onClose}>
                View order
              </Link>
            ) : null}
            {open &&
            task.canWork &&
            (task.status === 'blocked' || (task.status !== 'in_progress' && !task.canClaim && !task.closesItself)) ? (
              <button type="button" disabled={busy} onClick={() => setStatus('in_progress')} className={outline}>
                {task.status === 'blocked' ? 'Unblock' : 'Start'}
              </button>
            ) : null}
            {open && task.canWork && task.status !== 'blocked' ? (
              <button type="button" disabled={busy} onClick={block} className={outline}>
                Block
              </button>
            ) : null}
            {canFinish ? (
              <button type="button" disabled={busy} onClick={() => setStatus('done')} className={primary}>
                Mark done
              </button>
            ) : null}
            {open && task.canManage && !task.closesItself ? (
              <button type="button" disabled={busy} onClick={cancel} className="inline-flex items-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                Cancel
              </button>
            ) : null}
            {!open && task.source === 'manual' && task.canWork ? (
              <button type="button" disabled={busy} onClick={() => setStatus('open')} className={outline}>
                Reopen
              </button>
            ) : null}
          </div>
        </div>

        {open ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3">
            <div className="min-w-56 flex-1">
              <p className="text-sm font-semibold text-sky-950">{task.canWork ? 'What to do' : `Waiting on ${taskOwner(task)}`}</p>
              {guide ? <p className="text-sm text-sky-900">{guide}</p> : null}
              {task.closesItself ? (
                <p className="mt-1 text-xs text-sky-800">This task closes by itself once the step is done.</p>
              ) : null}
            </div>
            {task.canClaim ? (
              <button type="button" disabled={busy} onClick={() => act(() => tasksApi.claim(task.id))} className={outline}>
                Take this task
              </button>
            ) : null}
            {action ? (
              <Link to={action.to} onClick={onClose} className={primary}>
                {action.label}
              </Link>
            ) : null}
          </div>
        ) : null}
        {task.status === 'blocked' && task.blockedReason ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">Blocked: {task.blockedReason}</p>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <JobCard task={task} />

        <div className="grid gap-3 sm:grid-cols-3">
          <Row label="Owner">{taskOwner(task)}</Row>
          <Row label="Due">{task.dueDate ? `${dueText(task)} (${new Date(task.dueDate).toLocaleDateString('en-IN')})` : '—'}</Row>
          <Row label="Order">{task.orderNumber || '—'}</Row>
          {task.stage ? <Row label="Stage"><span className="capitalize">{task.stage}</span></Row> : null}
          {task.itemLabel || task.itemIndex != null ? <Row label="Item">{`#${(task.itemIndex ?? 0) + 1} ${task.itemLabel}`}</Row> : null}
          {taskQuantity(task) ? <Row label="Quantity">{taskQuantity(task)}</Row> : null}
          {task.progress ? (
            <Row label="Progress">
              <TaskProgress task={task} />
            </Row>
          ) : null}
          <Row label="Created">{formatDateTime(task.createdAt)}{task.createdByName ? ` by ${task.createdByName}` : ''}</Row>
          {task.completedAt ? (
            <Row label="Closed">{formatDateTime(task.completedAt)}{task.completedByName ? ` by ${task.completedByName}` : ''}</Row>
          ) : null}
        </div>
        {task.description ? <p className="whitespace-pre-wrap rounded-lg bg-paper px-3 py-2 text-sm text-ink">{task.description}</p> : null}

        {editItem && orderItems ? (
          <div className="space-y-2 rounded-lg border border-line px-3 py-3">
            <ItemQuantityFields
              items={orderItems}
              itemId={itemDraft.itemId}
              quantity={itemDraft.quantity}
              onChange={(next) => setItemDraft((current) => ({ ...current, ...next }))}
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={busy || !itemChanged}
                onClick={() => {
                  const message = itemQuantityError(orderItems, itemDraft.itemId, itemDraft.quantity);
                  if (message) {
                    setError(message);
                    return;
                  }
                  act(() =>
                    tasksApi.update(task.id, {
                      itemId: itemDraft.itemId,
                      quantity: itemDraft.itemId && itemDraft.quantity !== '' ? Number(itemDraft.quantity) : null,
                    })
                  );
                }}
                className={outline}
              >
                Save item and quantity
              </button>
            </div>
          </div>
        ) : null}

        {task.canManage && open && people.length ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="block min-w-64 flex-1 text-sm font-semibold text-ink">
              Reassign
              <AssigneeSelect value={assignee} onChange={setAssignee} people={people} />
            </label>
            <button
              type="button"
              disabled={busy || !assignee || assignee === assigneeValue(task)}
              onClick={() => act(() => tasksApi.update(task.id, assigneePayload(assignee)))}
              className={outline}
            >
              Save
            </button>
          </div>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-ink">Comments</h3>
          {(task.comments || []).length ? (
            <ul className="space-y-2">
              {task.comments.map((item) => (
                <li key={item._id || item.at} className="rounded-lg border border-line bg-paper/70 px-3 py-2">
                  <p className="text-xs text-slate">
                    {item.byName || 'Someone'} · {formatDateTime(item.at)}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-ink">{item.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate">No comments yet.</p>
          )}
          <form
            className="flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!comment.trim()) return;
              await act(() => tasksApi.comment(task.id, comment));
              setComment('');
            }}
          >
            <input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" className={`${inputClass} mt-0`} />
            <button type="submit" disabled={busy || !comment.trim()} className={outline}>
              Add
            </button>
          </form>
        </section>

        <section className="space-y-2">
          <h3 className="text-base font-semibold text-ink">History</h3>
          <ul className="space-y-1 text-sm">
            {(task.history || [])
              .slice()
              .reverse()
              .map((entry, index) => (
                <li key={index} className="flex flex-wrap gap-x-2 text-ink">
                  <span className="text-slate">{formatDateTime(entry.at)}</span>
                  <span className="font-semibold">{entry.byName || 'System'}</span>
                  {entry.from !== entry.to ? <span>{entry.from ? `${taskStatusLabel(entry.from)} → ` : ''}{taskStatusLabel(entry.to)}</span> : null}
                  {entry.note ? <span className="text-slate">{entry.note}</span> : null}
                </li>
              ))}
          </ul>
        </section>
      </div>
    </Modal>
  );
}
