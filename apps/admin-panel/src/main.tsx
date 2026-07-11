/**
 * Application entry point.
 *
 * Phase 4 wraps the router in AuthProvider, so ProtectedRoute and
 * LoginPage can read auth state via useAuth(). No admin UI/screens
 * beyond the minimal StatusPage placeholder are implemented yet.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';

import { AppRouter } from './app/router';
import { AuthProvider } from './core/auth-context';

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
