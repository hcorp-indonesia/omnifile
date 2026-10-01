import { NavLink } from 'react-router-dom';
import { Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { navigation } from '@/config/navigation';
import { useSidebarStore } from '@/store/sidebar-store';

export default function Sidebar() {
  const { isCollapsed, toggle } = useSidebarStore();

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-surface-200 bg-white transition-all duration-300 dark:border-surface-800 dark:bg-surface-900',
        isCollapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-surface-200 px-4 dark:border-surface-800">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 shadow-lg shadow-primary-500/25">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-lg font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
            Magic Converter
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-500/10 dark:text-primary-400'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-900 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200'
              )
            }
          >
            <item.icon
              className={cn(
                'h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110'
              )}
            />
            {!isCollapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-surface-200 p-3 dark:border-surface-800">
        <button
          id="sidebar-toggle"
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-xl p-2.5 text-surface-500 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
        >
          <ChevronLeft
            className={cn(
              'h-5 w-5 transition-transform duration-300',
              isCollapsed && 'rotate-180'
            )}
          />
        </button>
      </div>
    </aside>
  );
}
