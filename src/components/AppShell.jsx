import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Main } from './Main';
import { Sidebar } from './Sidebar';

export function AppShell() {
  const location = useLocation();
  // The menu is open "for" the page it was opened on, so navigating anywhere
  // closes it without an effect.
  const here = `${location.pathname}${location.search}`;
  const [openOn, setOpenOn] = useState(null);
  const menuOpen = openOn === here;
  const setMenuOpen = (open) => setOpenOn(open ? here : null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setOpenOn(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-paper text-ink lg:h-screen print:block print:h-auto print:overflow-visible print:bg-white">
      {menuOpen ? <div className="fixed inset-0 z-40 bg-ink/50 lg:hidden" onClick={() => setMenuOpen(false)} aria-hidden="true" /> : null}
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-ink px-3 text-paper lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 hover:bg-white/10"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" strokeLinecap="round" />
            </svg>
          </button>
          <p className="text-sm font-semibold">Sinopec</p>
        </header>
        <Main />
      </div>
    </div>
  );
}
