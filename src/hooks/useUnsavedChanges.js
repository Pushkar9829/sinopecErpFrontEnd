import { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { confirmAction } from '../components/ui/confirm';

// Warns before leaving a form with unsaved edits: in-app navigation (sidebar,
// Back) gets a confirm dialog, closing or reloading the tab gets the browser's.
// `value` is the form state; `ready` is true once it has been loaded. Call the
// returned markSaved() right before navigating away after a successful save.
export function useUnsavedChanges(value, ready) {
  const [baseline, setBaseline] = useState(null);
  const saved = useRef(false);
  const serialized = JSON.stringify(value);

  useEffect(() => {
    if (!ready || baseline !== null) return undefined;
    // Wait a tick so follow-up effects that normalise the loaded data (route
    // fitting, defaults) land before the baseline is taken.
    const timer = setTimeout(() => setBaseline(serialized), 0);
    return () => clearTimeout(timer);
  }, [ready, baseline, serialized]);

  const dirty = baseline !== null && serialized !== baseline;

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        dirty && !saved.current && currentLocation.pathname !== nextLocation.pathname,
      [dirty]
    )
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirmAction({
      title: 'Leave without saving?',
      message: 'Your changes on this form have not been saved.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      danger: true,
    }).then((leave) => (leave ? blocker.proceed() : blocker.reset()));
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return undefined;
    function warn(event) {
      if (saved.current) return;
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  return {
    dirty,
    markSaved() {
      saved.current = true;
    },
  };
}
