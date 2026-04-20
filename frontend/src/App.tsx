import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { lightTheme } from './theme/lightTheme';

function App() {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <BrowserRouter>
        <div>Onboarding Diary - App Shell</div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
