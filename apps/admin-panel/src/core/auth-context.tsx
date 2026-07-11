import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { apiClient, clearAuthTokenProvider, setAuthTokenProvider } from '../lib/api-client';
import { logger } from '../lib/logger';
import { firebaseAuth } from './firebase';

export type AuthStatus = 'unauthenticated' | 'syncing' | 'authenticated' | 'error';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  errorMessage: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider — reacts to Firebase's own auth-state stream (it does
 * not initiate sign-in itself; LoginPage does that directly via the
 * Firebase Auth SDK) and syncs the resulting ID token with the
 * backend's `POST /v1/auth/session`, mirroring the shared
 * `AuthController` used by both Flutter apps.
 *
 * When Firebase isn't configured (`env.firebase.enabled === false`,
 * the default), `firebaseAuth` is `null` and this provider stays in
 * `unauthenticated` forever without touching the Firebase SDK.
 */
export function AuthProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('unauthenticated');
  const [user, setUser] = useState<User | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseAuth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      if (!nextUser) {
        clearAuthTokenProvider();
        setUser(null);
        setErrorMessage(null);
        setStatus('unauthenticated');
        return;
      }

      setStatus('syncing');
      setAuthTokenProvider(() => nextUser.getIdToken());

      try {
        await apiClient.post('/v1/auth/session');
        setUser(nextUser);
        setStatus('authenticated');
      } catch (error) {
        logger.error('Session sync failed', { error: String(error) });
        setErrorMessage('Could not verify your session. Please try signing in again.');
        setStatus('error');
      }
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      errorMessage,
      signOut: async () => {
        if (firebaseAuth) {
          await firebaseSignOut(firebaseAuth);
        }
      },
    }),
    [status, user, errorMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
