import { useCallback, useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { confirmAction } from '../components/ui/confirm';

// Asks before leaving the page while `dirty` is true (in-app links and the
// browser's own reload / close).
export function useLeaveGuard(dirty) {
  const blocker = useBlocker(
    useCallback(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname, [dirty])
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    confirmAction({
      title: 'Leave without saving?',
      message: 'Your changes to this draft have not been saved.',
      confirmLabel: 'Leave',
      cancelLabel: 'Stay',
      danger: true,
    }).then((leave) => (leave ? blocker.proceed() : blocker.reset()));
  }, [blocker]);

  useEffect(() => {
    if (!dirty) return undefined;
    function warn(event) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
}
