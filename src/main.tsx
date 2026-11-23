import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

registerSW({ immediate: true });

// Google Maps Platform two-tier global error/quota detection before React renders
declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

window.gm_authFailure = () => {
  window.dispatchEvent(
    new CustomEvent('gmp-quota-exceeded', {
      detail: { reason: 'gm_authFailure' },
    })
  );
};

const originalConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const joined = args
    .map((a) => (typeof a === 'string' ? a : a instanceof Error ? a.message : ''))
    .join(' ');
  if (
    joined.includes('Google Maps JavaScript API') ||
    /OverQuotaMapError|OVER_QUERY_LIMIT|QuotaExceeded|ApiProjectMapError/i.test(joined)
  ) {
    window.dispatchEvent(
      new CustomEvent('gmp-quota-exceeded', {
        detail: { reason: joined },
      })
    );
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(<App />);
