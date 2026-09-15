export const badgeTones = {
  success: 'border-emerald-200 bg-emerald-100 text-emerald-800',
  danger: 'border-rose-200 bg-rose-100 text-rose-800',
  warning: 'border-amber-200 bg-amber-100 text-amber-900',
  info: 'border-sky-200 bg-sky-100 text-sky-800',
  accent: 'border-orange-200 bg-orange-100 text-orange-900',
  purple: 'border-violet-200 bg-violet-100 text-violet-800',
  teal: 'border-teal-200 bg-teal-100 text-teal-800',
  muted: 'border-slate-200 bg-slate-100 text-slate-700',
};

export const panelTones = {
  success: 'border-emerald-200 bg-emerald-50',
  danger: 'border-rose-200 bg-rose-50',
  warning: 'border-amber-200 bg-amber-50',
  info: 'border-sky-200 bg-sky-50',
  accent: 'border-orange-200 bg-orange-50',
  purple: 'border-violet-200 bg-violet-50',
  teal: 'border-teal-200 bg-teal-50',
  muted: 'border-slate-200 bg-slate-50',
};

export const dotTones = {
  success: 'bg-emerald-600',
  danger: 'bg-rose-600',
  warning: 'bg-amber-500',
  info: 'bg-sky-600',
  accent: 'bg-orange-600',
  purple: 'bg-violet-600',
  teal: 'bg-teal-600',
  muted: 'bg-slate-500',
};

export const tabActiveTones = {
  success: 'bg-emerald-700 text-white',
  danger: 'bg-rose-700 text-white',
  warning: 'bg-amber-600 text-white',
  info: 'bg-sky-700 text-white',
  accent: 'bg-orange-700 text-white',
  purple: 'bg-violet-700 text-white',
  teal: 'bg-teal-700 text-white',
  muted: 'bg-slate-600 text-white',
};

export const valueTones = {
  success: 'text-emerald-800',
  danger: 'text-rose-800',
  warning: 'text-amber-900',
  info: 'text-sky-800',
  accent: 'text-orange-900',
  purple: 'text-violet-800',
  teal: 'text-teal-800',
  muted: 'text-slate-700',
};

export function orderStatusTone(status) {
  const map = {
    draft: 'muted',
    submitted: 'warning',
    approved: 'info',
    production_planned: 'accent',
    in_production: 'accent',
    ready_for_packing: 'purple',
    packed: 'purple',
    ready_for_dispatch: 'teal',
    dispatched: 'teal',
    delivered: 'success',
    completed: 'success',
    cancelled: 'danger',
  };
  return map[status] || 'muted';
}

export function priorityTone(priority) {
  if (priority === 'urgent') return 'danger';
  if (priority === 'high') return 'accent';
  return 'muted';
}

export function categoryTone(category) {
  if (category === 'raw') return 'info';
  if (category === 'output') return 'success';
  if (category === 'waste') return 'warning';
  return 'muted';
}

export function roleGroupTone(group) {
  if (group === 'admin') return 'accent';
  if (group === 'managers') return 'info';
  if (group === 'operators') return 'teal';
  return 'muted';
}

export function stepTone(step) {
  const map = {
    approved: 'info',
    planned: 'accent',
    rolling: 'accent',
    printing: 'info',
    cutting: 'purple',
    packing: 'purple',
    dispatch: 'teal',
    delivery: 'success',
  };
  return map[step] || 'muted';
}

export function attachmentTone(kind) {
  const map = {
    po: 'info',
    artwork: 'purple',
    spec: 'accent',
    image: 'teal',
    pdf: 'warning',
    other: 'muted',
  };
  return map[kind] || 'muted';
}

export function Badge({ tone = 'muted', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${badgeTones[tone] || badgeTones.muted} ${className}`}
    >
      {children}
    </span>
  );
}

export function ActiveBadge({ active }) {
  return <Badge tone={active ? 'success' : 'danger'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

export function StatusBadge({ status, label }) {
  return <Badge tone={orderStatusTone(status)}>{label || status}</Badge>;
}

export function PriorityBadge({ priority }) {
  return <Badge tone={priorityTone(priority)}>{priority || 'normal'}</Badge>;
}

export function CategoryBadge({ category, label }) {
  return <Badge tone={categoryTone(category)}>{label || category}</Badge>;
}
