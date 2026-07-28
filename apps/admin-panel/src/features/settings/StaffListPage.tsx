import type { AccountStatus, StaffSortField, StaffUser } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { TableContainer } from '../../components/ui/TableContainer';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../core/auth-context';
import { ROLE_LABELS } from '../../core/constants';

import { CreateStaffModal } from './CreateStaffModal';
import { fetchStaff } from './staff-api';
import { StaffLifecycleModal, type LifecycleAction } from './StaffLifecycleModal';
import styles from './StaffListPage.module.css';

/** Human-readable label for a pending action, for the Team screen's "pending" badge — same set as `apps/admin-panel/src/features/approvals/approvals-meta.ts`, kept separate since Team's badge phrasing ("Pending X approval") differs from the Approvals queue's. */
const PENDING_ACTION_LABEL: Record<string, string> = {
  staff_disable: 'Pending disable approval',
  staff_archive: 'Pending archive approval',
  staff_restore: 'Pending restore approval',
};

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

const SUCCESS_MESSAGE: Record<LifecycleAction, (name: string) => string> = {
  disable: (name) => `${name} was disabled.`,
  archive: (name) => `${name} was archived.`,
  restore: (name) => `${name} was restored to Active.`,
  'reset-password': (name) => `A new password-setup link was generated for ${name}.`,
};

/** Phase 5: an ORG_ADMIN's Disable/Archive/Restore submits for approval instead of applying — the banner needs to say so, not claim the account already changed. */
const PENDING_APPROVAL_MESSAGE: Partial<Record<LifecycleAction, (name: string) => string>> = {
  disable: (name) => `The request to disable ${name} was submitted for Super Admin approval.`,
  archive: (name) => `The request to archive ${name} was submitted for Super Admin approval.`,
  restore: (name) => `The request to restore ${name} was submitted for Super Admin approval.`,
};

const SORT_COLUMNS: { field: StaffSortField; label: string }[] = [
  { field: 'fullName', label: 'Name' },
  { field: 'email', label: 'Email' },
  { field: 'role', label: 'Role' },
  { field: 'status', label: 'Status' },
  { field: 'createdAt', label: 'Added' },
  { field: 'lastLoginAt', label: 'Last sign-in' },
];

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
 * Phase 3 added the Disable/Archive/Restore lifecycle (status badges,
 * per-row actions). Phase 4 adds search/filter/sort, pagination,
 * Reset Password/Resend Invite, and a success banner after any action
 * — all additive on top of the same `GET /v1/users` contract.
 */
export function StaffListPage(): JSX.Element {
  const { profile } = useAuth();
  const toast = useToast();
  const [staff, setStaff] = useState<StaffUser[] | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [lifecycleTarget, setLifecycleTarget] = useState<{ action: LifecycleAction; user: StaffUser } | null>(
    null,
  );

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'' | 'employee' | 'admin'>('');
  const [statusFilter, setStatusFilter] = useState<'' | AccountStatus>('');
  const [sortBy, setSortBy] = useState<StaffSortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const hasFilters = search !== '' || roleFilter !== '' || statusFilter !== '';

  // Debounce the free-text search so every keystroke doesn't refetch.
  useEffect(() => {
    const handle = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Any filter/sort change starts back at page 1 — staying on, say,
  // page 3 of a now much-smaller filtered result would just show
  // "no results" instead of the actual matches.
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, sortBy, sortDir]);

  const load = useCallback(
    async (isRefresh: boolean) => {
      setError(null);
      if (isRefresh) {
        setRefreshing(true);
      }
      try {
        const result = await fetchStaff({
          page,
          pageSize: 20,
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          sortBy,
          sortDir,
        });
        setStaff(result.items);
        setTotalItems(result.meta.totalItems);
        setTotalPages(result.meta.totalPages);
      } catch {
        setError('Could not load the staff directory.');
      } finally {
        setRefreshing(false);
      }
    },
    [page, search, roleFilter, statusFilter, sortBy, sortDir],
  );

  useEffect(() => {
    void load(staff !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` already encodes every dependency that should trigger a refetch.
  }, [page, search, roleFilter, statusFilter, sortBy, sortDir]);

  function toggleSort(field: StaffSortField): void {
    if (field === sortBy) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  }

  function handleActionDone(
    action: LifecycleAction,
    user: StaffUser,
    outcome: 'executed' | 'pending_approval',
  ): void {
    setLifecycleTarget(null);
    const name = user.fullName ?? user.email ?? 'This account';
    const message =
      outcome === 'pending_approval' ? PENDING_APPROVAL_MESSAGE[action]?.(name) : SUCCESS_MESSAGE[action](name);
    toast.success(message ?? SUCCESS_MESSAGE[action](name));
    void load(true);
  }

  return (
    <PageContainer
      title="Team"
      description="Employee and admin accounts. Firebase sign-in alone can never create one of these — every account here was explicitly provisioned."
      actions={<Button onClick={() => setCreateOpen(true)}>Add staff account</Button>}
    >
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Icon name="search" size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            type="search"
            placeholder="Search by name, email, or employee code…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Search staff"
          />
        </div>

        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as '' | 'employee' | 'admin')}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="employee">Employee</option>
          <option value="admin">Super Admin</option>
        </select>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as '' | AccountStatus)}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="archived">Archived</option>
        </select>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              setRoleFilter('');
              setStatusFilter('');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={() => void load(true)} />}

      {!error && staff === null && <LoadingState message="Loading staff directory…" />}

      {!error && staff !== null && staff.length === 0 && !hasFilters && (
        <EmptyState message="No staff accounts yet. Add the first one to get started." />
      )}

      {!error && staff !== null && staff.length === 0 && hasFilters && (
        <EmptyState
          icon="search"
          message="No staff accounts match these filters."
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setRoleFilter('');
                setStatusFilter('');
              }}
            >
              Clear filters
            </Button>
          }
        />
      )}

      {!error && staff !== null && staff.length > 0 && (
        <>
          <TableContainer>
            <thead>
              <tr>
                {SORT_COLUMNS.map((col) => (
                  <th key={col.field}>
                    <button
                      type="button"
                      className={styles.sortButton}
                      onClick={() => toggleSort(col.field)}
                      aria-label={`Sort by ${col.label}`}
                    >
                      {col.label}
                      <Icon
                        name={sortBy === col.field && sortDir === 'asc' ? 'chevronUp' : 'chevronDown'}
                        size={14}
                        className={sortBy === col.field ? styles.sortIconActive : styles.sortIcon}
                      />
                    </button>
                  </th>
                ))}
                <th>Employee code</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className={refreshing ? styles.tableRefreshing : undefined}>
              {staff.map((user) => {
                const status = displayStatus(user);
                const isSelf = user.id === profile?.id;
                // Phase 5: a pending maker-checker request against this account — the
                // backend already blocks a duplicate submit, this just preempts a
                // guaranteed-to-fail click instead of showing an error after the fact.
                const lifecycleLocked = user.pendingApproval != null;
                return (
                  <tr key={user.id}>
                    <td>{user.fullName ?? '—'}</td>
                    <td>{user.email ?? '—'}</td>
                    <td>{ROLE_LABELS[user.role]}</td>
                    <td>
                      <span className={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</span>
                      {user.statusReason && (status === 'disabled' || status === 'archived') && (
                        <div className={styles.statusReason}>{user.statusReason}</div>
                      )}
                      {user.pendingApproval && (
                        <div className={styles.statusReason}>
                          {PENDING_ACTION_LABEL[user.pendingApproval.action] ?? 'Pending approval'}
                        </div>
                      )}
                    </td>
                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    <td>{formatLastLogin(user.lastLoginAt)}</td>
                    <td>{user.employeeCode ?? '—'}</td>
                    <td>
                      <div className={styles.actions}>
                        {status !== 'archived' && !isSelf && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={lifecycleLocked}
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
                        {(status === 'active' || status === 'invited') && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setLifecycleTarget({ action: 'reset-password', user })}
                          >
                            {status === 'invited' ? 'Resend invite' : 'Reset password'}
                          </Button>
                        )}
                        {status !== 'archived' && !isSelf && (
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={lifecycleLocked}
                            onClick={() => setLifecycleTarget({ action: 'archive', user })}
                          >
                            Archive
                          </Button>
                        )}
                        {status === 'archived' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={lifecycleLocked}
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

          <div className={styles.pagination}>
            <span className={styles.paginationSummary}>
              {totalItems} account{totalItems === 1 ? '' : 's'} — page {page} of {totalPages}
            </span>
            <div className={styles.paginationControls}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {createOpen && (
        <CreateStaffModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            toast.success('Staff account created.');
            void load(true);
          }}
        />
      )}

      {lifecycleTarget && (
        <StaffLifecycleModal
          action={lifecycleTarget.action}
          user={lifecycleTarget.user}
          actorRole={profile?.role}
          onClose={() => setLifecycleTarget(null)}
          onDone={(outcome) => handleActionDone(lifecycleTarget.action, lifecycleTarget.user, outcome)}
        />
      )}
    </PageContainer>
  );
}
