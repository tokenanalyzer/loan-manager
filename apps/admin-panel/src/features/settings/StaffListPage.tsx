import type { StaffUser } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';
import { ROLE_LABELS } from '../../core/constants';

import { CreateStaffModal } from './CreateStaffModal';
import { fetchStaff } from './staff-api';
import styles from './StaffListPage.module.css';

/**
 * Settings → Team. The only way an employee/admin account comes into
 * existence today — replaces the previous "insert a row directly
 * against the database" process (see `AuthService`'s doc comment and
 * `UsersService.createStaffUser`).
 */
export function StaffListPage(): JSX.Element {
  const [staff, setStaff] = useState<StaffUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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
            </tr>
          </thead>
          <tbody>
            {staff.map((user) => (
              <tr key={user.id}>
                <td>{user.fullName ?? '—'}</td>
                <td>{user.email ?? '—'}</td>
                <td>{ROLE_LABELS[user.role]}</td>
                <td>{user.employeeCode ?? '—'}</td>
                <td>
                  <span
                    className={
                      user.activatedAt ? styles.statusActive : styles.statusPending
                    }
                  >
                    {user.activatedAt ? 'Active' : 'Invited — not signed in yet'}
                  </span>
                </td>
              </tr>
            ))}
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
    </PageContainer>
  );
}
