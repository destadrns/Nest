import { create } from 'zustand';
import type { User, Family } from '@/types';

export type ThemePreference = 'light' | 'dark';
export type CurrencyPreference = 'IDR' | 'USD';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;

  // Family context
  currentFamily: Family | null;
  families: Family[];
  setCurrentFamily: (family: Family | null) => void;
  setFamilies: (families: Family[]) => void;

  // UI & Preferences
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  currency: CurrencyPreference;
  setCurrency: (currency: CurrencyPreference) => void;
}

function getInitialTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem('nest_theme') as ThemePreference;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {}
  return 'light';
}

function getInitialCurrency(): CurrencyPreference {
  try {
    const saved = localStorage.getItem('nest_currency') as CurrencyPreference;
    if (saved === 'IDR' || saved === 'USD') return saved;
  } catch {}
  return 'IDR';
}

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const isDark = theme === 'dark';

  if (isDark) {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
  }
}

if (typeof window !== 'undefined') {
  applyTheme(getInitialTheme());
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false, currentFamily: null, families: [] }),

  // Family
  currentFamily: null,
  families: [],
  setCurrentFamily: (family) => set({ currentFamily: family }),
  setFamilies: (families) => set({ families }),

  // UI
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // Theme & Currency Preferences
  theme: getInitialTheme(),
  setTheme: (theme) => {
    try {
      localStorage.setItem('nest_theme', theme);
    } catch {}
    applyTheme(theme);
    set({ theme });
  },

  currency: getInitialCurrency(),
  setCurrency: (currency) => {
    try {
      localStorage.setItem('nest_currency', currency);
    } catch {}
    set({ currency });
  },
}));
