import type { EmployeeWorkload, LeadSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { PageContainer } from '../../components/ui/PageContainer';
import { EmployeeWorkloadTable } from '../leads/EmployeeWorkloadTable';
import { fetchAllLeads, fetchEmployeesWithWorkload } from '../leads/leads-api';
import { REVIEWABLE_STATUSES, formatDateTime } from '../workspace/lead-status-meta';

import { deriveRecentActivity } from './activity';
import styles from './AdminDashboardPage.module.css';

function isToday(iso: string): boolean {
  const date = new Date(iso);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/**
 * Admin Dashboard — the Super Admin/CRM landing page. Every widget is
 * derived client-side from two calls the Lead Assignment module
 * already makes (`GET /v1/loan-applications` — admins see every lead
 * — and `GET /v1/lead-assignment/employees`), rather than adding new
 * backend aggregate endpoints. See `activity.ts` for why Recent
 * Activity is derived the same way.
 */
export function AdminDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeWorkload[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [leadsResult, employeesResult] = await Promise.all([
        fetchAllLeads(),
        fetchEmployeesWithWorkload(),
      ]);
      setLeads(leadsResult);
      setEmployees(employeesResult);
    } catch {
      setError('Could not load dashboard data.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    if (!leads) return null;
    return {
      total: leads.length,
      unassigned: leads.filter((lead) => lead.assignedToId === null).length,
      assigned: leads.filter((lead) => lead.assignedToId !== null).length,
      pendingReview: leads.filter((lead) =>
        REVIEWABLE_STATUSES.includes(lead.status),
      ).length,
      queryRaised: leads.filter((lead) => lead.status === 'query_raised').length,
      approvedToday: leads.filter(
        (lead) => lead.status === 'approved' && lead.reviewedAt && isToday(lead.reviewedAt),
      ).length,
      rejectedToday: leads.filter(
        (lead) => lead.status === 'rejected' && lead.reviewedAt && isToday(lead.reviewedAt),
      ).length,
    };
  }, [leads]);

  const recentActivity = useMemo(() => (leads ? deriveRecentActivity(leads) : []), [leads]);

  const loading = leads === null || employees === null;

  return (
    <PageContainer
      title="Dashboard"
      description="Live lead and workload overview across the platform."
      actions={
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      }
    >
      {error && <ErrorState message={error} onRetry={() => void load()} />}

      {!error && loading && <LoadingState message="Loading dashboard…" />}

      {!error && !loading && stats && (
        <>
          <div className={styles.statGrid}>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Total Leads</span>
              <span className={styles.statValue}>{stats.total}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Unassigned Leads</span>
              <span className={styles.statValue}>{stats.unassigned}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Assigned Leads</span>
              <span className={styles.statValue}>{stats.assigned}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Pending Reviews</span>
              <span className={styles.statValue}>{stats.pendingReview}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Query Raised</span>
              <span className={styles.statValue}>{stats.queryRaised}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Approved Today</span>
              <span className={styles.statValue}>{stats.approvedToday}</span>
            </Card>
            <Card className={styles.statCard}>
              <span className={styles.statLabel}>Rejected Today</span>
              <span className={styles.statValue}>{stats.rejectedToday}</span>
            </Card>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <div className={styles.quickActions}>
              <Button onClick={() => navigate('/leads')}>Assign Leads</Button>
              <Button variant="secondary" onClick={() => navigate('/notifications')}>
                Notifications
              </Button>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Employee Workload Summary</h2>
            <Card noPadding>
              <EmployeeWorkloadTable employees={employees ?? []} />
            </Card>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            {recentActivity.length === 0 ? (
              <EmptyState message="No recent activity yet." />
            ) : (
              <Card noPadding>
                <div className={styles.activityList}>
                  {recentActivity.map((event) => (
                    <div key={event.id} className={styles.activityRow}>
                      <span className={styles.activityDescription}>{event.description}</span>
                      <span className={styles.activityTimestamp}>
                        {formatDateTime(event.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
