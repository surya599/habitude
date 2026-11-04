import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemePreference } from '../types';
import { apiRequest, getAuthToken } from '../lib/api';

interface ChartThemeTokens {
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  primary: string;
  success: string;
  warning: string;
  muted: string;
  ringTrack: string;
}

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference, persistToBackend?: boolean) => void;
  chartTheme: ChartThemeTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'habitude-theme';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
    return 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: 'light' | 'dark' = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: ThemePreference, persistToBackend = true) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    if (persistToBackend && getAuthToken()) {
      apiRequest('/auth/me/', {
        method: 'PATCH',
        body: JSON.stringify({ theme_preference: newTheme }),
      }).catch(() => {});
    }
  };

  const chartTheme = useMemo<ChartThemeTokens>(() => {
    if (resolvedTheme === 'dark') {
      return {
        grid: '#232631',
        axis: '#8E8E98',
        tooltipBg: '#1D2029',
        tooltipBorder: '#323645',
        tooltipText: '#F5F5F7',
        primary: '#2997FF',
        success: '#30D158',
        warning: '#FF9F0A',
        muted: '#6C6D77',
        ringTrack: '#242733',
      };
    }
    return {
      grid: '#ECECF0',
      axis: '#6E6E73',
      tooltipBg: '#FFFFFF',
      tooltipBorder: '#E5E5EA',
      tooltipText: '#1D1D1F',
      primary: '#0066CC',
      success: '#248A3D',
      warning: '#C96A00',
      muted: '#86868B',
      ringTrack: '#EFEFF4',
    };
  }, [resolvedTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, chartTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
