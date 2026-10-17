import { useCallback, useSyncExternalStore } from 'react';
import { INTAKE_CHANGED_EVENT, intakeApi } from '../api/intake.api';
import { usePermission } from './usePermission';

const REFRESH_MS = 60000;

// One shared poller for the draft-order counts (sidebar badge, dashboard card).
const store = { summary: null, listeners: new Set(), timer: null, inFlight: null };

function refresh() {
  if (store.inFlight) return store.inFlight;
  store.inFlight = intakeApi
    .summary()
    .then((next) => {
      store.summary = next;
      for (const listener of store.listeners) listener(next);
    })
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
    window.addEventListener(INTAKE_CHANGED_EVENT, refresh);
  }
  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size === 0) {
      window.clearInterval(store.timer);
      store.timer = null;
      window.removeEventListener(INTAKE_CHANGED_EVENT, refresh);
      store.summary = null;
    }
  };
}

const noSubscription = () => () => {};
const getSummary = () => store.summary;
const getNothing = () => null;

export function useIntakeSummary() {
  const { can, user } = usePermission();
  const enabled = Boolean(user) && can('intake:read');
  const userId = user?.id;
  const subscribeForUser = useCallback((listener) => (userId ? subscribe(listener) : () => {}), [userId]);
  return useSyncExternalStore(enabled ? subscribeForUser : noSubscription, enabled ? getSummary : getNothing);
}
