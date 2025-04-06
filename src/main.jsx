import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import theme from './theme';
import { ThemeProvider } from '@mui/material/styles'; // Keep only this one
import CssBaseline from '@mui/material/CssBaseline';
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>,
)



