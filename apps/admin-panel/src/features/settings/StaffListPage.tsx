import type { StaffUser } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';
import { useAuth } from '../../core/auth-context';
import { ROLE_LABELS } from '../../core/constants';

import { CreateStaffModal } from './CreateStaffModal';
import { fetchStaff } from './staff-api';
import { StaffLifecycleModal } from './StaffLifecycleModal';
import styles from './StaffListPage.module.css';

/** Active / Invited / Disabled / Archived — the four states the Team screen distinguishes (approved Phase 3 design). "Invited" is derived (status is ACTIVE but activatedAt is still null — never signed in yet), not its own backend status. */
type DisplayStatus = 'active' | 'invited' | 'disabled' | 'archived';

function displayStatus(user: StaffUser): DisplayStatus {
  if (user.status === 'disabled') return 'disabled';
  if (user.status === 'archived') return 'archived';
  return user.activatedAt ? 'active' : 'invited';
}

const STATUS_BADGE_CLASS: Record<DisplayStatus, string> = {
  active: styles.statusActive,
  invited: styles.statusPending,
  disabled: styles.statusDisabled,
  archived: styles.statusArchived,
};

const STATUS_LABEL: Record<DisplayStatus, string> = {
  active: 'Active',
  invited: 'Invited — not signed in yet',
  disabled: 'Disabled',
  archived: 'Archived',
};

function formatLastLogin(value: string | null): string {
  if (!value) return 'Never';
  return new Date(value).toLocaleString();
}

/**
 * Settings → Team. The only way an employee/admin account comes into
 * existence today — replaces the previous "insert a row directly
 * against the database" process (see `AuthService`'s doc comment and
 * `UsersService.createStaffUser`).
 *
 * Phase 3 adds the Disable/Archive/Restore lifecycle: status badges
 * for all four states, and per-row actions gated by current status.
 * Self-disable/self-archive are hidden here as a UX nudge — the
 * backend (`UsersService`) is the actual enforcement.
 */
export function StaffListPage(): JSX.Element {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [lifecycleTarget, setLifecycleTarget] = useState<{
    action: 'disable' | 'archive' | 'restore';
    user: StaffUser;
  } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await fetchStaff();
      setStaff(result.items);
    } catch {
      setError('Could not load the staff directory.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="Team"
      description="Employee and admin accounts. Firebase sign-in alone can never create one of these — every account here was explicitly provisioned."
      actions={<Button onClick={() => setCreateOpen(true)}>Add staff account</Button>}
    >
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && staff === null && <LoadingState message="Loading staff directory…" />}

      {!error && staff !== null && staff.length === 0 && (
        <EmptyState message="No staff accounts yet. Add the first one to get started." />
      )}

      {!error && staff !== null && staff.length > 0 && (
        <TableContainer>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Employee code</th>
              <th>Status</th>
              <th>Last sign-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => {
              const status = displayStatus(user);
              const isSelf = user.id === profile?.id;
              return (
                <tr key={user.id}>
                  <td>{user.fullName ?? '—'}</td>
                  <td>{user.email ?? '—'}</td>
                  <td>{ROLE_LABELS[user.role]}</td>
                  <td>{user.employeeCode ?? '—'}</td>
                  <td>
                    <span className={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</span>
                    {user.statusReason && (status === 'disabled' || status === 'archived') && (
                      <div className={styles.statusReason}>{user.statusReason}</div>
                    )}
                  </td>
                  <td>{formatLastLogin(user.lastLoginAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      {status !== 'archived' && !isSelf && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setLifecycleTarget({
                              action: status === 'disabled' ? 'restore' : 'disable',
                              user,
                            })
                          }
                        >
                          {status === 'disabled' ? 'Restore' : 'Disable'}
                        </Button>
                      )}
                      {status !== 'archived' && !isSelf && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setLifecycleTarget({ action: 'archive', user })}
                        >
                          Archive
                        </Button>
                      )}
                      {status === 'archived' && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setLifecycleTarget({ action: 'restore', user })}
                        >
                          Restore
                        </Button>
                      )}
                      {isSelf && <span className={styles.selfNote}>This is you</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableContainer>
      )}

      {createOpen && (
        <CreateStaffModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void load();
          }}
        />
      )}

      {lifecycleTarget && (
        <StaffLifecycleModal
          action={lifecycleTarget.action}
          user={lifecycleTarget.user}
          onClose={() => setLifecycleTarget(null)}
          onDone={() => {
            setLifecycleTarget(null);
            void load();
          }}
        />
      )}
    </PageContainer>
  );
}
