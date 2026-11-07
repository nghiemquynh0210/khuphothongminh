import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimateUIProvider } from '@animate-ui/react/provider';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AnimateUIProvider tempo={1}>
      <App />
    </AnimateUIProvider>
  </StrictMode>,
);
