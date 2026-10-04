export const TASK_STATUS_LABELS = {
  open: 'Open',
  in_progress: 'In progress',
  blocked: 'Blocked',
  done: 'Done',
  cancelled: 'Cancelled',
};

export const TASK_OPEN_STATUSES = ['open', 'in_progress', 'blocked'];

export const TASK_CATEGORY_LABELS = {
  order_submit: 'Submit order',
  order_approve: 'Approve order',
  order_revise: 'Revise order',
  material_receive: 'Receive material',
  production_plan: 'Plan production',
  stage_work: 'Stage work',
  dispatch: 'Dispatch',
  delivery_confirm: 'Confirm delivery',
  order_complete: 'Complete order',
  payment_collect: 'Collect payment',
  custom: 'Manual',
};

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  sales_manager: 'Sales',
  production_manager: 'Production Manager',
  inventory_manager: 'Inventory',
  rolling_operator: 'Rolling operators',
  printing_operator: 'Printing operators',
  cutting_operator: 'Cutting operators',
  packing_operator: 'Packing operators',
  dispatch_manager: 'Dispatch',
  accounts: 'Accounts',
};

export const TASK_SCOPES = [
  { id: 'inbox', label: 'My tasks' },
  { id: 'mine', label: 'Assigned to me' },
  { id: 'role', label: 'Whole team' },
  { id: 'created', label: 'Created by me' },
];

export function taskStatusTone(status) {
  const map = {
    open: 'info',
    in_progress: 'accent',
    blocked: 'danger',
    done: 'success',
    cancelled: 'muted',
  };
  return map[status] || 'muted';
}

export function taskStatusLabel(status) {
  return TASK_STATUS_LABELS[status] || status;
}

export function taskCategoryLabel(category) {
  return TASK_CATEGORY_LABELS[category] || category;
}

export function roleLabel(slug) {
  return ROLE_LABELS[slug] || String(slug || '').replace(/_/g, ' ');
}

export function isTaskOpen(task) {
  return TASK_OPEN_STATUSES.includes(task?.status);
}

export function taskOwner(task) {
  if (task.assigneeName) return task.assigneeName;
  if (task.assigneeRole) return roleLabel(task.assigneeRole);
  return '—';
}

export function taskQuantity(task) {
  if (task.quantity === null || task.quantity === undefined) return '';
  return `${Number(task.quantity).toLocaleString('en-IN', { maximumFractionDigits: 3 })} ${task.unit || ''}`.trim();
}

export function taskItemText(task) {
  if (!task.itemLabel && task.itemIndex == null) return '';
  const name = `#${(task.itemIndex ?? 0) + 1}${task.itemLabel ? ` ${task.itemLabel}` : ''}`;
  const qty = taskQuantity(task);
  return qty ? `${name} · ${qty}` : name;
}

const DONE_WORDS = { rolling: 'Rolled', printing: 'Printed', cutting: 'Cut' };

export function taskProgressText(task) {
  const progress = task.progress;
  if (!progress || !(progress.target > 0)) return '';
  const fmt = (value) => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 3 });
  const done = `${DONE_WORDS[task.stage] || 'Done'} ${fmt(progress.output)} / ${fmt(progress.target)} ${progress.unit || ''}`.trim();
  return progress.done ? `${done} · finished` : `${done} · ${fmt(progress.remaining)} left`;
}

export function stageJobKey(task) {
  return task.order && task.itemId && task.stage ? `${task.order}:${task.itemId}:${task.stage}` : '';
}

export function taskAction(task) {
  const order = task.order ? `/sales-orders/${task.order}` : '';
  switch (task.category) {
    case 'order_submit':
      return order && { label: 'Open and submit', to: order };
    case 'order_revise':
      return order && { label: 'Edit order', to: `${order}/edit` };
    case 'order_approve':
      return order && { label: 'Review and approve', to: order };
    case 'production_plan':
      return order && { label: 'Move to production', to: order };
    case 'material_receive':
      return { label: 'Record material', to: task.order ? `/inventory/new?order=${task.order}` : '/inventory/new' };
    case 'stage_work':
      return {
        label: 'Enter output',
        to: `/registers?stage=${task.stage}${
          stageJobKey(task) ? `&job=${encodeURIComponent(stageJobKey(task))}&task=${encodeURIComponent(task.number)}&back=%2Ftasks` : ''
        }`,
      };
    case 'dispatch':
    case 'delivery_confirm':
      return { label: 'Open dispatch register', to: '/registers?stage=dispatch' };
    case 'order_complete':
      return order && { label: 'Mark completed', to: order };
    case 'payment_collect':
      return order && { label: 'Record payment', to: `${order}?tab=amounts` };
    default:
      return order && { label: 'Open order', to: order };
  }
}

const STAGE_NAMES = { rolling: 'Rolling', printing: 'Printing', cutting: 'Cutting', dispatch: 'Dispatch' };

export function taskGuide(task) {
  switch (task.category) {
    case 'order_submit':
      return 'Check the order details and press Submit for approval.';
    case 'order_revise':
      return 'The order was sent back to draft. Fix it, save, then submit it again.';
    case 'order_approve':
      return 'Review the order, then approve it or return it to draft with a reason.';
    case 'production_plan':
      return 'Plan the items and press Move to production on the order.';
    case 'material_receive':
      return "Record the customer's material in inventory, linked to this job work. The task then closes by itself.";
    case 'stage_work':
      return `Work on this item at ${STAGE_NAMES[task.stage] || task.stage} and record each entry on the register. The task closes by itself when the stage is finished.`;
    case 'dispatch':
      return 'Send the ready items out and record each dispatch on the dispatch register.';
    case 'delivery_confirm':
      return 'Send the remaining items and record them on the dispatch register.';
    case 'order_complete':
      return 'Everything is delivered. Check the order and mark it completed.';
    case 'payment_collect':
      return 'Record each payment on the order. The task closes by itself when the balance is fully paid.';
    default:
      return '';
  }
}

export function dueText(task) {
  if (!task.dueDate) return '—';
  const due = new Date(task.dueDate);
  if (!isTaskOpen(task)) return due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  const days = Math.round((new Date(due).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return `Overdue ${-days}d`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const TASKS_CHANGED_EVENT = 'tasks:changed';

export function notifyTasksChanged() {
  window.dispatchEvent(new Event(TASKS_CHANGED_EVENT));
}
