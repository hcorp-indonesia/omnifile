import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '@/store/theme-store';

export default function Header() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-surface-200 bg-white/80 px-6 backdrop-blur-xl dark:border-surface-800 dark:bg-surface-900/80">
      <div>
        <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Welcome back 👋
        </h2>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Manage your converters with ease
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          id="theme-toggle"
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-200 text-surface-600 transition-all hover:bg-surface-100 hover:text-surface-900 dark:border-surface-700 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-400 to-accent-500 shadow-lg shadow-primary-500/25" />
      </div>
    </header>
  );
}
