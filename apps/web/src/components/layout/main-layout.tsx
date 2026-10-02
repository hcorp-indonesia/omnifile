import { Outlet } from 'react-router-dom';
import Header from './header';
import { cn } from '@/lib/utils';

export default function MainLayout() {
  return (
    <div className={cn("min-h-screen", "bg-[#fdfbf7]", "dark:bg-[#0e1015]", "text-gray-900", "dark:text-white", "selection:bg-yellow-200", "transition-colors", "duration-200", "overflow-x-hidden", "relative")}>
      <Header />
      <main className={cn("p-6")}>
        <Outlet />
      </main>
    </div>
  );
}
