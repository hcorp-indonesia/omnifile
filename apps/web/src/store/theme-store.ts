import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const applyThemeToDOM = (theme: Theme) => {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.classList.add('theme-transition');
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.style.colorScheme = theme;

    window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 180);
  }
};

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('mc-theme');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.state?.theme) {
          return parsed.state.theme;
        }
      }
    } catch {
      // fallback
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  return 'light';
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'light' ? 'dark' : 'light';
          applyThemeToDOM(next);
          return { theme: next };
        }),
      setTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },
    }),
    {
      name: 'mc-theme',
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeToDOM(state.theme);
        }
      },
    }
  )
);
