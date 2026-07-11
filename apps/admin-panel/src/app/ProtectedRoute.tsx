import React from 'react';
import { Navigate } from 'react-router-dom';

import { env } from '../core/env';
import { useAuth } from '../core/auth-context';

/**
 * Route guard: redirects to /login unless the user is authenticated.
 *
 * When Firebase isn't configured (`env.firebase.enabled === false`,
 * the default), this is a no-op — every route is reachable directly,
 * matching the same "still runs without a real Firebase project"
 * behavior established for both Flutter apps.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }): JSX.Element {
  const { status } = useAuth();

  if (!env.firebase.enabled) {
    return <>{children}</>;
  }

  if (status === 'unauthenticated' || status === 'error') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'syncing') {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
        <p>Signing in…</p>
      </main>
    );
  }

  return <>{children}</>;
}
