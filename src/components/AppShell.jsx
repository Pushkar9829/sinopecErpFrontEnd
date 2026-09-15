import { Main } from './Main';
import { Sidebar } from './Sidebar';

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden bg-paper text-ink">
      <Sidebar />
      <Main />
    </div>
  );
}
