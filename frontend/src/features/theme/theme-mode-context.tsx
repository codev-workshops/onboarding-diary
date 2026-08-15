import { CssBaseline, ThemeProvider } from '@mui/material';
import type { PaletteMode } from '@mui/material/styles';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createAppTheme } from '../../app/theme';

const THEME_KEY = 'onboarding-diary.theme';

export type ThemePreference = PaletteMode | 'system';

interface ThemeModeContextValue {
  /** What the user picked; "system" follows the OS setting. */
  preference: ThemePreference;
  /** The mode actually rendered. */
  mode: PaletteMode;
  setPreference: (preference: ThemePreference) => void;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

function readStoredPreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function systemMode(): PaletteMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [systemPreference, setSystemPreference] = useState<PaletteMode>(systemMode);

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) {
      return;
    }
    const listener = (event: MediaQueryListEvent) => setSystemPreference(event.matches ? 'dark' : 'light');
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    localStorage.setItem(THEME_KEY, next);
    setPreferenceState(next);
  }, []);

  const mode: PaletteMode = preference === 'system' ? systemPreference : preference;

  const value = useMemo<ThemeModeContextValue>(
    () => ({
      preference,
      mode,
      setPreference,
      toggleMode: () => setPreference(mode === 'dark' ? 'light' : 'dark'),
    }),
    [preference, mode, setPreference],
  );

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used inside a ThemeModeProvider.');
  }
  return context;
}
