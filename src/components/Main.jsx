import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';

export function Main() {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-paper print:overflow-visible print:bg-white">
      <div className="w-full px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        {/* Screens load on first open; keep the sidebar up meanwhile. */}
        <Suspense fallback={<p className="text-sm text-slate">Loading…</p>}>
          <Outlet />
        </Suspense>
      </div>
    </main>
  );
}
