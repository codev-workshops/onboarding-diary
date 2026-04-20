import { createTheme } from '@mui/material/styles';

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7986CB',
      light: '#9FA8DA',
      dark: '#3F51B5',
    },
    secondary: {
      main: '#4DB6AC',
      light: '#80CBC4',
      dark: '#009688',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    error: {
      main: '#EF5350',
    },
    warning: {
      main: '#FFA726',
    },
    success: {
      main: '#66BB6A',
    },
    info: {
      main: '#42A5F5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});
