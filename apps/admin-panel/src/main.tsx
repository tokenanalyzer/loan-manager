/**
 * Application entry point.
 *
 * Wraps the router in AuthProvider, so ProtectedRoute and LoginPage
 * can read auth state via useAuth(). `theme/global.css` (which
 * imports `tokens.css`) is the one global stylesheet for the whole
 * portal shell.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

import { AppRouter } from './app/router';
import { AuthProvider } from './core/auth-context';
import './theme/global.css';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </React.StrictMode>,
  );
}
