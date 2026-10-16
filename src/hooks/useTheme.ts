import { useEffect } from 'react';
import type { Theme } from '@/db/types';

/** Mirror the theme setting onto <html> and localStorage (read pre-paint in index.html). */
export function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0a0f' : '#f2f2f7');
    try {
      localStorage.setItem('ledger-theme', theme);
    } catch {
      /* storage unavailable (private mode) — theme still applies for this session */
    }
  }, [theme]);
}
