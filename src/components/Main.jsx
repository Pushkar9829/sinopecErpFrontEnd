import { Outlet } from 'react-router-dom';

export function Main() {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-paper">
      <div className="w-full px-5 py-4 md:px-6">
        <Outlet />
      </div>
    </main>
  );
}
