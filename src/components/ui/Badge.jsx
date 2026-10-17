import { badgeTones, orderStatusTone, priorityTone, categoryTone } from './badgeTones';


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
