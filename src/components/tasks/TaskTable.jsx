import { Link } from 'react-router-dom';
import { Badge, PriorityBadge } from '../ui/Badge';
import { dueText, roleLabel, taskAction, taskCategoryLabel, taskItemText, taskProgressText, taskStatusLabel, taskStatusTone } from '../../lib/tasks';

export function TaskOwner({ task }) {
  if (task.assigneeName) {
    return (
      <>
        <p className="font-semibold text-ink">{task.assigneeName}</p>
        {task.assigneeRole ? <p className="text-xs text-slate">{roleLabel(task.assigneeRole)}</p> : null}
      </>
    );
  }
  if (task.assigneeRole) {
    return (
      <>
        <p className="font-semibold text-ink">{roleLabel(task.assigneeRole)} team</p>
        <p className="text-xs text-slate">{task.canClaim ? 'Not taken yet' : 'Any user in this role'}</p>
      </>
    );
  }
  return <span className="text-slate">Unassigned</span>;
}

export function TaskProgress({ task }) {
  const text = taskProgressText(task);
  if (!text) return null;
  const { output, target, done } = task.progress;
  const percent = done ? 100 : Math.min(100, Math.round((output / target) * 100));
  return (
    <div className="mt-1.5 max-w-64">
      <div className="h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${done ? 'bg-emerald-600' : 'bg-accent'}`} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-0.5 text-xs font-semibold text-ink">{text}</p>
    </div>
  );
}

const stop = (event) => event.stopPropagation();

export function TaskActions({ task, onClaim, busy }) {
  const open = !['done', 'cancelled'].includes(task.status);
  const action = open && task.canWork ? taskAction(task) : null;
  return (
    <div className="flex flex-wrap items-center gap-1.5" onClick={stop} onKeyDown={stop}>
      {open && task.canClaim && onClaim ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onClaim(task)}
          className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-semibold text-ink hover:bg-paper disabled:opacity-60"
        >
          Take
        </button>
      ) : null}
      {action ? (
        <Link to={action.to} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-white hover:bg-accent-dark">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

export function TaskTable({ tasks, onOpen, onClaim, busyId, showOrder = true }) {
  return (
    <table data-no-row-select className="min-w-full whitespace-nowrap text-left text-sm lg:whitespace-normal">
      <thead className="bg-ink text-paper">
        <tr>
          <th className="px-4 py-3 font-semibold">Task</th>
          {showOrder ? <th className="px-4 py-3 font-semibold">Order</th> : null}
          <th className="px-4 py-3 font-semibold">Owner</th>
          <th className="px-4 py-3 font-semibold">Priority</th>
          <th className="px-4 py-3 font-semibold">Due</th>
          <th className="px-4 py-3 font-semibold">Status</th>
          <th className="px-4 py-3 font-semibold">Actions</th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr
            key={task.id}
            tabIndex={0}
            onClick={() => onOpen(task)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onOpen(task);
              }
            }}
            className="cursor-pointer border-t border-line align-top hover:bg-paper/70"
          >
            <td className="px-4 py-3">
              <p className="font-semibold text-ink">{task.title}</p>
              <p className="text-sm font-normal text-slate">
                {task.number} · {taskCategoryLabel(task.category)}
                {task.comments?.length ? ` · ${task.comments.length} comment${task.comments.length > 1 ? 's' : ''}` : ''}
              </p>
              {!showOrder && taskItemText(task) ? <p className="text-xs font-semibold text-ink">{taskItemText(task)}</p> : null}
              <TaskProgress task={task} />
              {task.status === 'blocked' && task.blockedReason ? (
                <p className="mt-1 text-xs font-semibold text-red-700">Blocked: {task.blockedReason}</p>
              ) : null}
            </td>
            {showOrder ? (
              <td className="px-4 py-3">
                {task.order ? (
                  <>
                    <Link to={`/sales-orders/${task.order}`} onClick={stop} className="font-semibold text-ink underline">
                      {task.orderNumber}
                    </Link>
                    <p className="text-xs text-slate">{task.orderType === 'job_work' ? 'Job work' : 'Sales order'}</p>
                    {taskItemText(task) ? <p className="text-xs font-semibold text-ink">{taskItemText(task)}</p> : null}
                  </>
                ) : (
                  <span className="text-slate">—</span>
                )}
              </td>
            ) : null}
            <td className="px-4 py-3">
              <TaskOwner task={task} />
            </td>
            <td className="px-4 py-3">
              <PriorityBadge priority={task.priority} />
            </td>
            <td className={`px-4 py-3 ${task.overdue ? 'font-semibold text-red-700' : 'font-normal text-ink'}`}>{dueText(task)}</td>
            <td className="px-4 py-3">
              <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
            </td>
            <td className="px-4 py-3">
              <TaskActions task={task} onClaim={onClaim} busy={busyId === task.id} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
