import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './index.css';
import App from './App.jsx';

// Monochrome theme: black is the primary action colour, everything else is
// soft greys on white/frosted surfaces. Status colours (green/amber/red) are
// reserved for glucose values only.
const theme = createTheme({
  primaryColor: 'dark',
  primaryShade: { light: 9, dark: 9 },
  black: '#161616',
  fontFamily: 'Inter, Segoe UI, Helvetica Neue, Arial, sans-serif',
  headings: {
    fontFamily: 'Inter, Segoe UI, Helvetica Neue, Arial, sans-serif',
    fontWeight: '600',
  },
  defaultRadius: 'xl',
  radius: {
    xs: '6px',
    sm: '10px',
    md: '14px',
    lg: '20px',
    xl: '28px',
  },
  components: {
    Button: {
      defaultProps: { radius: 'xl', color: 'dark' },
    },
    TextInput: { defaultProps: { radius: 'xl', size: 'md' } },
    PasswordInput: { defaultProps: { radius: 'xl', size: 'md' } },
    NumberInput: { defaultProps: { radius: 'xl', size: 'md' } },
    Select: { defaultProps: { radius: 'xl', size: 'md' } },
    DatePickerInput: { defaultProps: { radius: 'xl', size: 'md' } },
    Pagination: { defaultProps: { radius: 'xl', color: 'dark' } },
    Alert: { defaultProps: { radius: 'lg' } },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="light" theme={theme}>
      <DatesProvider settings={{ consistentWeeks: true }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>
);
