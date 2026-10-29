import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { companyApi } from '../api/company.api';
import { tasksApi } from '../api/tasks.api';
import { BlankEntryTable, DocFootnotes, Facts, PrintShell, Sheet, SheetFooter, SheetHeader } from '../components/print/PrintKit';
import { blockText } from '../components/print/blockText';
import { useAuth } from '../context/auth';
import { useDocumentLayout } from '../lib/documentLayout';
import { formatDate, formatQtyUnit, orderTypeLabel, stageLabel } from '../lib/sales';
import { roleLabel, TASK_CATEGORY_LABELS } from '../lib/tasks';

const STATUS_LABEL = { open: 'Not started', in_progress: 'In progress', blocked: 'Blocked', done: 'Done', cancelled: 'Cancelled' };

// One task on paper, to hand to the person doing it.
export function TaskPrint() {
  const { id } = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState('');
  const [printedAt] = useState(() => new Date());
  const doc = useDocumentLayout('taskSheet');

  useEffect(() => {
    companyApi
      .get()
      .then(setCompany)
      .catch(() => setCompany({}));
    tasksApi
      .get(id)
      .then(setTask)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <p className="p-6 text-sm text-red-700">{error}</p>;
  if (!task || !doc.ready) return <p className="p-6 text-sm text-slate">Loading task…</p>;
  // Layout from Settings → Documents → Task sheet.
  const facts = doc
    .fields({
      assignedTo: task.assigneeName || (task.assigneeRole ? `${roleLabel(task.assigneeRole)} team` : 'Not assigned'),
      due: task.dueDate ? formatDate(task.dueDate) : 'No date',
      priority: task.priority ? task.priority.toUpperCase() : '',
      status: STATUS_LABEL[task.status] || task.status,
      order: task.orderNumber ? `${task.orderNumber}${task.orderType ? ` (${orderTypeLabel(task.orderType)})` : ''}` : '',
      stage: task.stage ? stageLabel(task.stage) : '',
      line: task.itemLabel,
      quantity: task.quantity != null ? formatQtyUnit(task.quantity, task.unit) : '',
    })
    .map((f) => ({ label: f.label, value: f.value, strong: f.key === 'assignedTo' || f.key === 'due' }));
  const workColumns = doc
    .columns([
      { key: 'date', label: 'Date' },
      { key: 'work', label: 'What was done' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'time', label: 'Time taken' },
      { key: 'sign', label: 'Sign' },
    ])
    .map((c) => c.label);
  const orderId = task.order?.id || task.order;

  return (
    <PrintShell
      backTo={`/tasks`}
      backLabel="Tasks"
      toolbar={
        orderId && task.stage ? (
          <Link to={`/job-sheets/${orderId}?stage=${task.stage}`} className="rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-semibold">
            {stageLabel(task.stage)} job sheet
          </Link>
        ) : null
      }
    >
      <Sheet>
        <SheetHeader company={company} title={doc.title('Task')} number={task.number}>
          <p className="text-xs">{TASK_CATEGORY_LABELS[task.category] || task.category}</p>
        </SheetHeader>
        <div className="mt-3 space-y-3">
          <h1 className="text-lg font-bold">{task.title}</h1>
          <Facts items={facts} />
          {doc.block('description') && task.description ? (
            <div className="rounded border border-ink p-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">{blockText(doc, 'description', 'What to do')}</p>
              <p className="whitespace-pre-wrap">{task.description}</p>
            </div>
          ) : null}
          {doc.block('blocked') && task.blockedReason ? (
            <p className="rounded border border-ink p-2">
              <span className="font-semibold">Blocked: </span>
              {task.blockedReason}
            </p>
          ) : null}
          {doc.block('notes') && task.comments?.length ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate">{blockText(doc, 'notes', 'Notes so far')}</p>
              <ul className="space-y-1">
                {task.comments.map((c, i) => (
                  <li key={i} className="border-b border-line/60 pb-1">
                    <span className="font-semibold">{c.byName}</span> · {formatDate(c.at)}: {c.text}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {doc.block('workTable') ? (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate">{blockText(doc, 'workTable', 'Work done (fill in)')}</p>
              <BlankEntryTable columns={workColumns} rows={5} />
            </div>
          ) : null}
          <div className={`grid grid-cols-3 gap-4 pt-6 text-xs ${doc.block('signatures') ? '' : 'hidden'}`}>
            {['Done by', 'Date finished', 'Checked by'].map((who) => (
              <p key={who} className="border-t border-ink pt-1 text-center">
                {who}
              </p>
            ))}
          </div>
        </div>
        <DocFootnotes note={doc.footerNote} />
        {doc.block('footer') ? <SheetFooter printedAt={printedAt} printedBy={user?.fullName || user?.username} note="Mark the task done in the app when it is finished." /> : null}
      </Sheet>
    </PrintShell>
  );
}
