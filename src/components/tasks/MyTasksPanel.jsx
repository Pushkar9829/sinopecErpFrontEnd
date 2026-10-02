import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTaskSummary } from '../../hooks/useTaskSummary';
import { dueText, taskCategoryLabel, taskOwner } from '../../lib/tasks';
import { PriorityBadge, panelTones, valueTones } from '../ui/Badge';
import { TaskDrawer } from './TaskDrawer';
import { TaskActions } from './TaskTable';

export function MyTasksPanel() {
  const summary = useTaskSummary();
  const [selected, setSelected] = useState(null);
  if (!summary) return null;

  const cards = [
    { label: 'Assigned to me', value: summary.assigned, tone: 'info', to: '/tasks?scope=mine' },
    { label: 'Waiting for my role', value: summary.roleQueue, tone: 'accent', to: '/tasks?scope=inbox' },
    { label: 'Overdue', value: summary.overdue, tone: summary.overdue ? 'danger' : 'muted', to: '/tasks?scope=inbox&overdue=1' },
  ];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">My open tasks</h2>
        <Link to="/tasks" className="text-sm font-semibold text-ink underline">
          View all tasks
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className={`rounded-xl border px-4 py-3 transition hover:brightness-95 ${panelTones[card.tone]}`}>
            <p className="text-sm font-semibold text-ink">{card.label}</p>
            <p className={`mt-1 text-xl font-semibold ${valueTones[card.tone]}`}>{card.value ?? 0}</p>
          </Link>
        ))}
      </div>
      {summary.top?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          {summary.top.map((task) => (
            <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-paper/70">
              <button type="button" onClick={() => setSelected(task)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-ink">{task.title}</span>
                <span className="block truncate text-xs text-slate">
                  {taskCategoryLabel(task.category)} · {taskOwner(task)}
                </span>
              </button>
              <PriorityBadge priority={task.priority} />
              <span className={`w-24 text-right text-sm ${task.overdue ? 'font-semibold text-red-700' : 'text-ink'}`}>{dueText(task)}</span>
              <TaskActions task={task} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate">Nothing waiting for you.</p>
      )}
      <TaskDrawer task={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
