import { useCallback, useEffect, useState } from 'react';
import { tasksApi } from '../api/tasks.api';
import { TASKS_CHANGED_EVENT, isTaskOpen } from '../lib/tasks';

export function useOrderTasks(orderId) {
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    if (!orderId) return Promise.resolve();
    return tasksApi
      .forOrder(orderId)
      .then((data) => {
        setTasks(data);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoaded(true));
  }, [orderId]);

  useEffect(() => {
    load();
    window.addEventListener(TASKS_CHANGED_EVENT, load);
    return () => window.removeEventListener(TASKS_CHANGED_EVENT, load);
  }, [load]);

  return { tasks, error, loaded, load, openCount: tasks.filter(isTaskOpen).length };
}
