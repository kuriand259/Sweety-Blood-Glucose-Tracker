import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: 'teal',
        fontFamily: 'Segoe UI, Helvetica Neue, Arial, sans-serif',
      }}
    >
      <DatesProvider settings={{ consistentWeeks: true }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>
);
