import { env } from '../core/env';
import { useAuth } from '../core/auth-context';

/**
 * Minimal placeholder page.
 *
 * Phase 2 scope: exists only to verify the build/routing/env wiring
 * works end-to-end. Phase 4 adds a sign-out action now that
 * authentication exists. No other admin features, forms, or business
 * UI belong here — that's out of scope until later phases.
 */
export function StatusPage(): JSX.Element {
  const { status, user, signOut } = useAuth();

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem' }}>
      <h1>Loan Manager — Admin Panel</h1>
      <p>Phase 2 development environment is running.</p>
      <dl>
        <dt>API base URL</dt>
        <dd>{env.apiBaseUrl}</dd>
      </dl>
      {env.firebase.enabled && status === 'authenticated' && (
        <>
          <p>Signed in{user?.email ? ` as ${user.email}` : ''}.</p>
          <button type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </>
      )}
    </main>
  );
}
