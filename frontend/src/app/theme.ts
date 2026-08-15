import { createTheme, type PaletteMode, type Theme } from '@mui/material/styles';

export function createAppTheme(mode: PaletteMode): Theme {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: { main: isDark ? '#7ea2ff' : '#1f5eff' },
      success: { main: isDark ? '#5ec27f' : '#2e7d32' },
      warning: { main: isDark ? '#e3b341' : '#ed6c02' },
      error: { main: isDark ? '#f28b82' : '#d32f2f' },
      info: { main: isDark ? '#7fd1e8' : '#0288d1' },
      background: isDark ? { default: '#101418', paper: '#171c22' } : { default: '#f5f7fb', paper: '#ffffff' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },
  });
}

export const theme = createAppTheme('light');
