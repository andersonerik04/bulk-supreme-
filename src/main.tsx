import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ToastProvider } from './components/Toast';
import './index.css';

registerSW({ immediate: true });

// Dev convenience: seed/clear sample data from the browser console.
if (import.meta.env.DEV) {
  void Promise.all([import('./utils/seed'), import('./db/repo')]).then(([seed, repo]) => {
    Object.assign(window, { ledger: { seed: seed.seedSampleData, clearSample: repo.clearSampleData, reset: repo.resetAll } });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <App />
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
