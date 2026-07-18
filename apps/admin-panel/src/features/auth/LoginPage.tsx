import { signInWithEmailAndPassword } from 'firebase/auth';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput } from '../../components/ui/FormLayout';
import { env } from '../../core/env';
import { firebaseAuth } from '../../core/firebase';
import { AuthLayout } from '../../layouts/AuthLayout';

/**
 * Admin Panel / Employee Portal sign-in screen: email + password.
 *
 * There is deliberately no self-service sign-up here — admin/employee
 * accounts are expected to be pre-provisioned (see the backend's
 * AuthService for why sign-up can't self-elevate a role).
 */
export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!env.firebase.enabled || !firebaseAuth) {
    return (
      <AuthLayout subtitle="Sign in">
        <p>Authentication is not configured for this environment. (VITE_FIREBASE_ENABLED=false)</p>
      </AuthLayout>
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
    <AuthLayout subtitle="Sign in with your work email and password">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Work email" htmlFor="email">
          <FormInput
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </FormField>

        <FormField label="Password" htmlFor="password" error={error ?? undefined}>
          <FormInput
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </FormField>

        <FormActions>
          <Button type="submit" disabled={isSubmitting} style={{ width: '100%' }}>
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </FormActions>
      </form>
    </AuthLayout>
  );
}
