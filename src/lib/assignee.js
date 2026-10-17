export function assigneeValue(task) {
  if (task?.assignee) return `user:${task.assignee}`;
  if (task?.assigneeRole) return `role:${task.assigneeRole}`;
  return '';
}

export function assigneePayload(value) {
  const [kind, id] = String(value || '').split(':');
  if (kind === 'user') return { assigneeId: id };
  if (kind === 'role') return { assigneeRole: id };
  return {};
}
