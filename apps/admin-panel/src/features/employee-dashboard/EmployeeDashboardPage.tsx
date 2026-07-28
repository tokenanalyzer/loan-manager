import type { EmployeeDashboardSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Card } from '../../components/ui/Card';
import { Icon, type IconName } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { STATUS_COLORS, STATUS_LABELS } from '../work-status/status-meta';

import { fetchMyDashboardSummary } from './employee-dashboard-api';
import styles from './EmployeeDashboardPage.module.css';

const QUICK_LINKS: { label: string; description: string; path: string; icon: IconName }[] = [
  { label: 'My Leads', description: 'Every lead assigned to you.', path: '/employee/my-leads', icon: 'inbox' },
  {
    label: 'My Customers',
    description: 'Customers you have an active application with.',
    path: '/employee/my-customers',
    icon: 'people',
  },
  {
    label: 'Follow-ups',
    description: 'Log and track scheduled follow-ups.',
    path: '/employee/follow-ups',
    icon: 'calendar',
  },
  { label: 'Documents', description: 'Documents for your assigned customers.', path: '/employee/documents', icon: 'upload' },
];

/**
 * Employee CRM — the self-service landing page an employee sees at
 * `/employee/dashboard`. Composed entirely from
 * `GET /v1/employee-dashboard/summary`, one new small aggregate
 * endpoint built on top of already-existing repository queries (the
 * same workload counts the Admin Portal's Employee Workload table
 * already used) plus the new Follow-up counts.
 */
export function EmployeeDashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<EmployeeDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setSummary(await fetchMyDashboardSummary());
    } catch {
      setError('Could not load your dashboard. Please try again.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <PageContainer title="Dashboard">
        <ErrorState message={error} onRetry={() => void load()} />
      </PageContainer>
    );
  }

  if (!summary) {
    return (
      <PageContainer title="Dashboard">
        <LoadingState message="Loading your dashboard…" />
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Dashboard" description="Your leads, follow-ups, and workload at a glance.">
      <div className={styles.statusRow}>
        <span>Your status:</span>
        <StatusBadge label={STATUS_LABELS[summary.status]} color={STATUS_COLORS[summary.status]} />
      </div>

      <div className={styles.statGrid}>
        <StatCard
          label="Active Leads"
          value={String(summary.activeLeadsCount)}
          icon="inbox"
          tint="indigo"
          onClick={() => navigate('/employee/my-leads')}
        />
        <StatCard
          label="Pending Leads"
          value={String(summary.pendingLeadsCount)}
          icon="hourglass"
          tint="amber"
          onClick={() => navigate('/employee/my-leads')}
        />
        <StatCard
          label="Assigned Today"
          value={String(summary.leadsAssignedTodayCount)}
          icon="document"
          tint="electric"
          onClick={() => navigate('/employee/my-leads')}
        />
        <StatCard
          label="Pending Follow-ups"
          value={String(summary.pendingFollowUpsCount)}
          icon="calendar"
          tint="green"
          onClick={() => navigate('/employee/follow-ups')}
        />
        <StatCard
          label="Due Today"
          value={String(summary.followUpsDueTodayCount)}
          icon="clock"
          tint="amber"
          onClick={() => navigate('/employee/follow-ups')}
        />
      </div>

      <h2 className={styles.sectionTitle}>Quick links</h2>
      <div className={styles.quickLinks}>
        {QUICK_LINKS.map((link) => (
          <Link key={link.path} to={link.path} className={styles.cardLink}>
            <Card interactive className={styles.card}>
              <Icon name={link.icon} size={24} className={styles.icon} />
              <div>
                <div className={styles.label}>{link.label}</div>
                <div className={styles.description}>{link.description}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
