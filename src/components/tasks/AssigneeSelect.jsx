import { inputClass } from '../ui/FormField';
import { ROLE_LABELS } from '../../lib/tasks';

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

export function AssigneeSelect({ value, onChange, people, disabled = false }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className={inputClass}>
      <optgroup label="Role (anyone in the role can take it)">
        {Object.entries(ROLE_LABELS).map(([slug, label]) => (
          <option key={slug} value={`role:${slug}`}>
            {label}
          </option>
        ))}
      </optgroup>
      <optgroup label="Person">
        {people.map((person) => (
          <option key={person.id} value={`user:${person.id}`}>
            {person.fullName}
            {person.role?.name ? ` (${person.role.name})` : ''}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
