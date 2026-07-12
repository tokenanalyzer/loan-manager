import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { env } from '../../core/env';
import { firebaseAuth } from '../../core/firebase';

/**
 * Admin Panel sign-in screen: email + password.
 *
 * Phase 4 scope: sign-in only. There is deliberately no self-service
 * sign-up here — admin/employee accounts are expected to be
 * pre-provisioned (see the backend's AuthService for why sign-up
 * can't self-elevate a role).
 */
export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!env.firebase.enabled || !firebaseAuth) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 420 }}>
        <h1>Sign in</h1>
        <p>Authentication is not configured for this environment. (VITE_FIREBASE_ENABLED=false)</p>
      </main>
    );
  }

  // Captured as a const so its non-null narrowing (from the guard above)
  // survives into the handleSubmit closure below.
  const auth = firebaseAuth;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 420 }}>
      <h1>Loan Manager — Admin Panel</h1>
      <p>Sign in with your work email and password.</p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Work email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <p role="alert" style={{ color: '#b91c1c', margin: 0 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
