import { Badge, PriorityBadge } from '../ui/Badge';
import { dueText, taskItemText, taskOwner, taskStatusLabel, taskStatusTone } from '../../lib/tasks';
import { TaskActions, TaskProgress } from './TaskTable';

const cell = 'border border-stone-300 px-2 py-1.5 align-top text-sm';
const head = 'whitespace-nowrap border border-stone-400 bg-stone-100 px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-600';

const BOOKS = [
  { id: 'rolling', title: 'Rolling', keys: ['size', 'thickness', 'colour', 'material', 'requiredWeight'] },
  { id: 'printing', title: 'Printing', keys: ['jobSize', 'colours', 'impression', 'artwork', 'available'] },
  { id: 'cutting', title: 'Cutting', keys: ['bagSize', 'gusset', 'hole', 'tape', 'available'] },
  { id: 'dispatch', title: 'Dispatch', keys: ['deliveryLocation', 'deliveryInstructions'] },
];

const LABELS = {
  size: 'Size',
  thickness: 'Thickness',
  colour: 'Colour',
  material: 'Material',
  requiredWeight: 'Req. weight',
  jobSize: 'Job size',
  colours: 'Print colours',
  impression: 'Impression',
  artwork: 'Artwork',
  available: 'Ready to pick',
  bagSize: 'Bag size',
  gusset: 'Gusset',
  hole: 'Hole',
  tape: 'Tape',
  deliveryLocation: 'Deliver to',
  deliveryInstructions: 'Instructions',
};

function bookOf(task) {
  if (task.category === 'stage_work' && task.job) return task.stage;
  if (['dispatch', 'delivery_confirm'].includes(task.category) && task.job) return 'dispatch';
  return 'other';
}

function fieldValue(task, key) {
  return task.job?.fields?.find((field) => field.key === key)?.value || '';
}

function Row({ index, task, onOpen, children }) {
  return (
    <tr
      tabIndex={0}
      onClick={() => onOpen(task)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(task);
        }
      }}
      className={`cursor-pointer ${index % 2 ? 'bg-[#fbf7ee]' : 'bg-white'} hover:bg-amber-50 focus:bg-amber-50 focus:outline-none`}
    >
      <td className={`${cell} w-10 text-stone-500`}>{index + 1}</td>
      {children}
    </tr>
  );
}

function StatusCell({ task }) {
  return (
    <td className={cell}>
      <Badge tone={taskStatusTone(task.status)}>{taskStatusLabel(task.status)}</Badge>
      <p className="mt-1 text-xs text-stone-600">{task.assigneeName || (task.canClaim ? 'Not taken yet' : taskOwner(task))}</p>
      {task.status === 'blocked' && task.blockedReason ? <p className="mt-1 text-xs font-semibold text-red-700">{task.blockedReason}</p> : null}
    </td>
  );
}

function DueCell({ task }) {
  return (
    <td className={`${cell} whitespace-nowrap`}>
      <p className={task.overdue ? 'font-semibold text-red-700' : 'text-stone-900'}>{dueText(task)}</p>
      <div className="mt-1">
        <PriorityBadge priority={task.priority} />
      </div>
    </td>
  );
}

function StageBook({ book, tasks, onOpen, onClaim, busyId }) {
  return (
    <section className="overflow-hidden rounded-sm border-2 border-stone-800 bg-[#fffdf6]">
      <h2 className="border-b-2 border-stone-800 bg-[#f6f1e4] px-3 py-2 text-base font-semibold text-stone-900">
        {book.title} jobs <span className="font-normal text-stone-600">· {tasks.length}</span>
      </h2>
      <div className="overflow-x-auto">
        <table data-no-row-select className="w-full border-collapse">
          <thead>
            <tr>
              <th className={head}>No</th>
              <th className={head}>Order</th>
              <th className={head}>Product</th>
              <th className={head}>Customer code</th>
              {book.keys.map((key) => (
                <th key={key} className={head}>
                  {LABELS[key]}
                </th>
              ))}
              <th className={head}>{book.id === 'dispatch' ? 'Quantity' : 'Progress'}</th>
              <th className={head}>Due</th>
              <th className={head}>Status</th>
              <th className={head}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <Row key={task.id} index={index} task={task} onOpen={onOpen}>
                <td className={`${cell} whitespace-nowrap font-semibold`}>
                  {task.orderNumber}
                  <p className="text-xs font-normal text-stone-600">{task.orderType === 'job_work' ? 'Job work' : 'Sales order'}</p>
                </td>
                <td className={cell}>
                  <p className="font-semibold text-stone-900">{task.job.product || task.itemLabel || '—'}</p>
                  {task.job.productCode ? <p className="text-xs text-stone-600">{task.job.productCode}</p> : null}
                  {task.job.workingNow ? <p className="mt-1 text-xs font-semibold text-amber-800">{task.job.workingNow}</p> : null}
                </td>
                <td className={`${cell} whitespace-nowrap`}>{task.job.customerCode || '—'}</td>
                {book.keys.map((key) => (
                  <td key={key} className={`${cell} ${key.startsWith('delivery') ? 'min-w-48' : 'whitespace-nowrap'}`}>
                    {fieldValue(task, key) || <span className="text-stone-400">—</span>}
                  </td>
                ))}
                <td className={`${cell} min-w-44`}>
                  {task.progress ? <TaskProgress task={task} /> : <span className="whitespace-pre-line">{task.job.orderQuantity || '—'}</span>}
                </td>
                <DueCell task={task} />
                <StatusCell task={task} />
                <td className={cell}>
                  <TaskActions task={task} onClaim={onClaim} busy={busyId === task.id} />
                </td>
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function OtherBook({ tasks, onOpen, onClaim, busyId }) {
  return (
    <section className="overflow-hidden rounded-sm border-2 border-stone-800 bg-[#fffdf6]">
      <h2 className="border-b-2 border-stone-800 bg-[#f6f1e4] px-3 py-2 text-base font-semibold text-stone-900">
        Other tasks <span className="font-normal text-stone-600">· {tasks.length}</span>
      </h2>
      <div className="overflow-x-auto">
        <table data-no-row-select className="w-full border-collapse">
          <thead>
            <tr>
              <th className={head}>No</th>
              <th className={head}>Task</th>
              <th className={head}>Order</th>
              <th className={head}>Item</th>
              <th className={head}>Due</th>
              <th className={head}>Status</th>
              <th className={head}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, index) => (
              <Row key={task.id} index={index} task={task} onOpen={onOpen}>
                <td className={`${cell} min-w-56`}>
                  <p className="font-semibold text-stone-900">{task.title}</p>
                  {task.description ? <p className="mt-0.5 line-clamp-2 text-xs text-stone-600">{task.description}</p> : null}
                  {task.comments?.length ? (
                    <p className="mt-0.5 text-xs text-stone-500">
                      {task.comments.length} comment{task.comments.length > 1 ? 's' : ''}
                    </p>
                  ) : null}
                </td>
                <td className={`${cell} whitespace-nowrap font-semibold`}>{task.orderNumber || <span className="font-normal text-stone-400">—</span>}</td>
                <td className={cell}>{taskItemText(task) || <span className="text-stone-400">—</span>}</td>
                <DueCell task={task} />
                <StatusCell task={task} />
                <td className={cell}>
                  <TaskActions task={task} onClaim={onClaim} busy={busyId === task.id} />
                </td>
              </Row>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function TaskBook({ tasks, onOpen, onClaim, busyId }) {
  const groups = new Map();
  for (const task of tasks) {
    const id = bookOf(task);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(task);
  }
  return (
    <div className="space-y-4">
      {BOOKS.filter((book) => groups.has(book.id)).map((book) => (
        <StageBook key={book.id} book={book} tasks={groups.get(book.id)} onOpen={onOpen} onClaim={onClaim} busyId={busyId} />
      ))}
      {groups.has('other') ? <OtherBook tasks={groups.get('other')} onOpen={onOpen} onClaim={onClaim} busyId={busyId} /> : null}
    </div>
  );
}

export function JobCard({ task }) {
  const job = task?.job;
  if (!job) return null;
  const short = job.fields.filter((field) => !field.long);
  const long = job.fields.filter((field) => field.long);
  return (
    <section className="overflow-hidden rounded-sm border-2 border-stone-800 bg-[#fffdf6]">
      <h3 className="border-b-2 border-stone-800 bg-[#f6f1e4] px-3 py-1.5 text-sm font-semibold uppercase tracking-wide text-stone-700">
        Job card{task.stage ? ` · ${task.stage}` : ''}
      </h3>
      <dl className="grid grid-cols-2 border-stone-300 text-sm">
        {[
          { key: 'product', label: 'Product', value: [job.product, job.productCode].filter(Boolean).join(' · ') },
          { key: 'customerCode', label: 'Customer code', value: job.customerCode },
          { key: 'orderQuantity', label: 'Order quantity', value: job.orderQuantity },
          ...short,
        ]
          .filter((field) => field.value)
          .map((field) => (
            <div key={field.key} className="border-b border-r border-stone-300 px-3 py-1.5">
              <dt className="text-xs uppercase tracking-wide text-stone-500">{field.label}</dt>
              <dd className="font-semibold text-stone-900">{field.value}</dd>
            </div>
          ))}
      </dl>
      {[...long, job.instructions ? { key: 'instructions', label: 'Production instructions', value: job.instructions } : null]
        .filter(Boolean)
        .map((field) => (
          <div key={field.key} className="border-b border-stone-300 px-3 py-1.5 text-sm">
            <p className="text-xs uppercase tracking-wide text-stone-500">{field.label}</p>
            <p className="whitespace-pre-line font-semibold text-stone-900">{field.value}</p>
          </div>
        ))}
      {job.workingNow ? <p className="px-3 py-1.5 text-sm font-semibold text-amber-800">{job.workingNow}</p> : null}
    </section>
  );
}
