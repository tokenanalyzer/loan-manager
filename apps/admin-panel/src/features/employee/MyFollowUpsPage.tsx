import type { FollowUp, FollowUpStatus } from '@loan-manager/shared-types';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageContainer } from '../../components/ui/PageContainer';
import { useToast } from '../../components/ui/Toast';

import { fetchMyFollowUps, updateFollowUpStatus } from './follow-ups-api';
import styles from './MyFollowUpsPage.module.css';

type FilterValue = 'pending' | 'done' | 'cancelled' | 'all';

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/**
 * Follow-up Management — Employee CRM. `dueAt` being in the past (and
 * still `pending`) makes a follow-up "Overdue"; `dueAt` today makes it
 * "Due Today"; anything later is "Upcoming" — these are query-time
 * groupings over the one `FollowUpEntity`/`GET /v1/follow-ups` list,
 * not separate data. "Reminders" are passive here (this list, and the
 * Dashboard's due-today/pending counts) — no proactive push exists yet
 * (see sub-phase 0's scope note), by design for this pass.
 */
export function MyFollowUpsPage(): JSX.Element {
  const navigate = useNavigate();
  const toast = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(): Promise<void> {
    try {
      setError(null);
      setFollowUps(await fetchMyFollowUps());
    } catch {
      setError('Could not load your follow-ups.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!followUps) return [];
    if (filter === 'all') return followUps;
    return followUps.filter((item) => item.status === filter);
  }, [followUps, filter]);

  const now = new Date();
  const overdue = filtered.filter(
    (item) => item.status === 'pending' && new Date(item.dueAt) < now && !isSameDay(new Date(item.dueAt), now),
  );
  const dueToday = filtered.filter((item) => item.status === 'pending' && isSameDay(new Date(item.dueAt), now));
  const upcoming = filtered.filter(
    (item) => item.status === 'pending' && new Date(item.dueAt) > now && !isSameDay(new Date(item.dueAt), now),
  );
  const other = filtered.filter((item) => item.status !== 'pending');

  async function handleMarkDone(item: FollowUp): Promise<void> {
    setBusyId(item.id);
    try {
      await updateFollowUpStatus(item.id, 'done');
      toast.success('Follow-up marked done.');
      await load();
    } catch {
      toast.error('Could not update the follow-up. Please try again.');
    } finally {
      setBusyId(null);
    }
  }

  function renderGroup(title: string, items: FollowUp[], statusOverride?: FollowUpStatus): JSX.Element | null {
    if (items.length === 0) return null;
    return (
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {title} ({items.length})
        </h2>
        <div className={styles.list}>
          {items.map((item) => (
            <Card key={item.id}>
              <div className={styles.row}>
                <div>
                  <button
                    type="button"
                    className={styles.caseLink}
                    onClick={() => navigate(`/employee/my-leads/${item.loanApplicationId}`)}
                  >
                    {item.caseNumber} — {item.applicantName ?? 'Unknown applicant'}
                  </button>
                  <div className={styles.meta}>Due {new Date(item.dueAt).toLocaleString()}</div>
                  <div className={styles.note}>{item.note}</div>
                </div>
                {(statusOverride ?? item.status) === 'pending' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busyId === item.id}
                    onClick={() => void handleMarkDone(item)}
                  >
                    {busyId === item.id ? 'Saving…' : 'Mark done'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageContainer
      title="Follow-ups"
      description="Scheduled follow-ups across your assigned leads."
      actions={
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={(event) => setFilter(event.target.value as FilterValue)}
        >
          <option value="pending">Pending</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      }
    >
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && followUps === null && <LoadingState message="Loading your follow-ups…" />}

      {!error && followUps && filtered.length === 0 && (
        <EmptyState message="No follow-ups here yet. Log one from a lead's detail page." />
      )}

      {!error && followUps && filtered.length > 0 && (
        <>
          {renderGroup('Overdue', overdue)}
          {renderGroup('Due today', dueToday)}
          {renderGroup('Upcoming', upcoming)}
          {renderGroup(filter === 'all' ? 'Done / cancelled' : filter === 'done' ? 'Done' : 'Cancelled', other)}
        </>
      )}
    </PageContainer>
  );
}
