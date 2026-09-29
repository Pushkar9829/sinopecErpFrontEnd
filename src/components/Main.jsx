import { Outlet } from 'react-router-dom';

export function Main() {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-paper">
      <div className="w-full px-3 py-3 sm:px-5 sm:py-4 lg:px-6">
        <Outlet />
      </div>
    </main>
  );
}
