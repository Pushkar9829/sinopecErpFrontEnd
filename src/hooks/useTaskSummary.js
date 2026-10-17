import { useCallback, useSyncExternalStore } from 'react';
import { tasksApi } from '../api/tasks.api';
import { TASKS_CHANGED_EVENT } from '../lib/tasks';
import { usePermission } from './usePermission';

const REFRESH_MS = 60000;

// One shared poller for every component that shows task counts (sidebar,
// dashboard, tasks page). Each used to run its own timer and listener, so one
// task action fired three summary requests.
const store = {
  summary: null,
  listeners: new Set(),
  timer: null,
  inFlight: null,
};

function publish(next) {
  store.summary = next;
  for (const listener of store.listeners) listener(next);
}

function refresh() {
  if (store.inFlight) return store.inFlight;
  store.inFlight = tasksApi
    .summary()
    .then(publish)
    .catch(() => {})
    .finally(() => {
      store.inFlight = null;
    });
  return store.inFlight;
}

function subscribe(listener) {
  store.listeners.add(listener);
  if (store.listeners.size === 1) {
    refresh();
    store.timer = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener(TASKS_CHANGED_EVENT, refresh);
  }
  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) {
      window.clearInterval(store.timer);
      store.timer = null;
      window.removeEventListener(TASKS_CHANGED_EVENT, refresh);
      store.summary = null;
    }
  };
}

const noSubscription = () => () => {};
const getSummary = () => store.summary;
const getNothing = () => null;

export function useTaskSummary() {
  const { can, user } = usePermission();
  const enabled = Boolean(user) && can('tasks:read');
  const userId = user?.id;
  // A new subscription per signed-in user: switching users drops the old
  // user's numbers and fetches fresh ones.
  const subscribeForUser = useCallback(
    (listener) => (userId ? subscribe(listener) : () => {}),
    [userId]
  );
  return useSyncExternalStore(enabled ? subscribeForUser : noSubscription, enabled ? getSummary : getNothing);
}
