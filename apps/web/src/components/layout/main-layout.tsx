import { Outlet } from 'react-router-dom';
import { cn } from '@/lib/utils';
import Sidebar from './sidebar';
import Header from './header';
import { useSidebarStore } from '@/store/sidebar-store';

export default function MainLayout() {
  const isCollapsed = useSidebarStore((state) => state.isCollapsed);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      <Sidebar />
      <div
        className={cn(
          'transition-all duration-300',
          isCollapsed ? 'ml-[72px]' : 'ml-64'
        )}
      >
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
