import { useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks.api';
import { TASKS_CHANGED_EVENT } from '../lib/tasks';
import { usePermission } from './usePermission';

const REFRESH_MS = 60000;

export function useTaskSummary() {
  const { can, user } = usePermission();
  const enabled = Boolean(user) && can('tasks:read');
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setSummary(null);
      return undefined;
    }
    let alive = true;
    const load = () =>
      tasksApi
        .summary()
        .then((data) => alive && setSummary(data))
        .catch(() => {});
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener(TASKS_CHANGED_EVENT, load);
    };
  }, [enabled]);

  return summary;
}
