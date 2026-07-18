import { Card } from '../components/ui/Card';
import { PageContainer } from '../components/ui/PageContainer';
import { useAuth } from '../core/auth-context';
import { ROLE_LABELS } from '../core/constants';

/**
 * Default landing route (`/`) — a placeholder only. Portal-foundation
 * scope deliberately stops here: no widgets, metrics, or business
 * content belong on this page yet.
 */
export function DashboardPlaceholderPage(): JSX.Element {
  const { profile, user } = useAuth();
  const name = profile?.fullName ?? user?.email ?? 'there';
  const roleLabel = profile ? ROLE_LABELS[profile.role] : null;

  return (
    <PageContainer title="Dashboard">
      <Card>
        <p>
          Welcome, {name}
          {roleLabel ? ` (${roleLabel})` : ''}. This is the portal shell — dashboard content lands
          in a later phase.
        </p>
      </Card>
    </PageContainer>
  );
}
