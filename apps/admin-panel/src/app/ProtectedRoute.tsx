import type { UserRole } from '@loan-manager/shared-types';
import React from 'react';
import { Navigate } from 'react-router-dom';

import { LoadingState } from '../components/states/LoadingState';
import { useAuth } from '../core/auth-context';
import { env } from '../core/env';

/**
 * Route guard: redirects to /login unless authenticated, and to /403
 * (Access Denied) if `roles` is given and the signed-in user's role
 * isn't in it — this is the role-based routing mechanism the whole
 * portal (Employee Portal / CRM / Super Admin) shares.
 *
 * When Firebase isn't configured (`env.firebase.enabled === false`,
 * the default), this is a no-op — every route is reachable directly,
 * matching the same "still runs without a real Firebase project"
 * behavior established for both Flutter apps. Role checks are skipped
 * in that mode too, since there's no real profile to check against.
 */
export function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}): JSX.Element {
  const { status, profile } = useAuth();

  if (!env.firebase.enabled) {
    return <>{children}</>;
  }

  if (status === 'unauthenticated' || status === 'error') {
    return <Navigate to="/login" replace />;
  }

  if (status === 'syncing') {
    return <LoadingState message="Signing in…" />;
  }

  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
