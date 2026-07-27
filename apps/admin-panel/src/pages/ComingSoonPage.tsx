import { EmptyState } from '../components/states/EmptyState';
import { PageContainer } from '../components/ui/PageContainer';

/**
 * Placeholder for nav items that ship in the Phase 1 shell for visual
 * completeness (matching the reference design) but have no real screen
 * behind them yet — Applications, Documents, Tasks, Customers, Reports,
 * general Settings. Deliberately not fake data — just an honest "not
 * built yet." See `navigation.config.ts`'s `comingSoon` flag and
 * `apps/admin-panel/IMPLEMENTATION_PROGRESS.md` for what's actually
 * scoped for each.
 */
export function ComingSoonPage({ title }: { title: string }): JSX.Element {
  return (
    <PageContainer title={title}>
      <EmptyState
        icon="clock"
        title="Coming soon"
        message={`${title} is on the roadmap and isn't built yet.`}
      />
    </PageContainer>
  );
}
