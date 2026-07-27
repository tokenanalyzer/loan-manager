import type {
  ApprovalRequest,
  CustomerSummary,
  EmployeeWorkload,
  LeadSummary,
  PaginatedResult,
} from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { DonutChart } from '../../components/charts/DonutChart';
import { LineChart } from '../../components/charts/LineChart';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { StatCard } from '../../components/ui/StatCard';
import { fetchPendingApprovals } from '../approvals/approvals-api';
import { describeAction } from '../approvals/approvals-meta';
import { fetchCustomers } from '../customers/customers-api';
import { EmployeeWorkloadTable } from '../leads/EmployeeWorkloadTable';
import { fetchAllLeads, fetchEmployeesWithWorkload } from '../leads/leads-api';
import { formatDateTime, getDisplayStatus } from '../workspace/lead-status-meta';

import { deriveRecentActivity } from './activity';
import styles from './AdminDashboardPage.module.css';
import {
  computeDisbursedAmount,
  computeDisbursedThisVsLastMonth,
  computeMonthOverMonthDelta,
  computeMonthlyTrends,
  computeStatusDistribution,
  computeThisVsLastMonth,
} from './dashboard-data';

const CURRENCY_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const RECENT_APPLICATIONS_LIMIT = 8;
const RECENT_APPROVALS_LIMIT = 5;

/**
 * Admin Dashboard — the Super Admin/CRM landing page. Each of the four
 * source lists (applications, employees, customers, pending approvals)
 * is loaded and error-handled independently, so one endpoint failing
 * doesn't blank the whole page — every widget below owns its own
 * loading/empty/error presentation. See `dashboard-data.ts` for the
 * aggregation math and why Pending Approvals/Active Customers never
 * show a trend percentage.
 */
export function AdminDashboardPage(): JSX.Element {
  const navigate = useNavigate();

  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeWorkload[] | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [customers, setCustomers] = useState<CustomerSummary[] | null>(null);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [approvals, setApprovals] = useState<PaginatedResult<ApprovalRequest> | null>(null);
  const [approvalsError, setApprovalsError] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLeadsError(null);
    try {
      setLeads(await fetchAllLeads());
    } catch {
      setLeadsError('Could not load applications.');
    }
  }, []);

  const loadEmployees = useCallback(async () => {
    setEmployeesError(null);
    try {
      setEmployees(await fetchEmployeesWithWorkload());
    } catch {
      setEmployeesError('Could not load employee workload.');
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    setCustomersError(null);
    try {
      setCustomers(await fetchCustomers());
    } catch {
      setCustomersError('Could not load customers.');
    }
  }, []);

  const loadApprovals = useCallback(async () => {
    setApprovalsError(null);
    try {
      setApprovals(await fetchPendingApprovals({ pageSize: RECENT_APPROVALS_LIMIT }));
    } catch {
      setApprovalsError('Could not load pending approvals.');
    }
  }, []);

  const loadAll = useCallback(() => {
    void loadLeads();
    void loadEmployees();
    void loadCustomers();
    void loadApprovals();
  }, [loadLeads, loadEmployees, loadCustomers, loadApprovals]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const monthlyTrends = useMemo(() => (leads ? computeMonthlyTrends(leads) : null), [leads]);
  const statusDistribution = useMemo(() => (leads ? computeStatusDistribution(leads) : null), [leads]);
  const disbursedAmount = useMemo(() => (leads ? computeDisbursedAmount(leads) : 0), [leads]);

  const applicationsTrend = useMemo(() => {
    if (!leads) return null;
    const { current, previous } = computeThisVsLastMonth(leads);
    return computeMonthOverMonthDelta(current, previous);
  }, [leads]);

  const disbursedTrend = useMemo(() => {
    if (!leads) return null;
    const { current, previous } = computeDisbursedThisVsLastMonth(leads);
    return computeMonthOverMonthDelta(current, previous);
  }, [leads]);

  const recentApplications = useMemo(() => {
    if (!leads) return null;
    return [...leads]
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, RECENT_APPLICATIONS_LIMIT);
  }, [leads]);

  const recentApprovals = useMemo(() => {
    if (!approvals) return null;
    return [...approvals.items].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [approvals]);

  const recentActivity = useMemo(() => (leads ? deriveRecentActivity(leads) : []), [leads]);
  const activeCustomerCount = useMemo(
    () => (customers ? customers.filter((c) => c.isActive).length : 0),
    [customers],
  );

  const applicationColumns: DataTableColumn<LeadSummary>[] = [
    { key: 'caseNumber', header: 'Case Number', render: (row) => row.caseNumber },
    { key: 'applicant', header: 'Customer', render: (row) => row.applicantName ?? 'Unknown' },
    { key: 'amount', header: 'Amount', align: 'right', render: (row) => CURRENCY_FORMATTER.format(Number(row.requestedAmount)) },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const { label, color } = getDisplayStatus(row);
        return (
          <span className={styles.statusBadge}>
            <span className={styles.statusDot} style={{ background: color }} />
            {label}
          </span>
        );
      },
    },
    { key: 'submittedAt', header: 'Submitted', render: (row) => formatDateTime(row.submittedAt) },
  ];

  return (
    <PageContainer
      title="Dashboard"
      description="Live overview of applications, approvals, and workload across the platform."
      actions={
        <Button variant="secondary" size="sm" onClick={loadAll}>
          <Icon name="refresh" size={16} />
          Refresh
        </Button>
      }
    >
      <div className={styles.statGrid}>
        <StatCard
          label="Total Applications"
          value={leads ? String(leads.length) : '0'}
          icon="document"
          tint="indigo"
          loading={leads === null && !leadsError}
          trend={applicationsTrend ?? undefined}
        />
        <StatCard
          label="Pending Approvals"
          value={approvals ? String(approvals.meta.totalItems) : '0'}
          icon="hourglass"
          tint="amber"
          loading={approvals === null && !approvalsError}
          footerNote="Awaiting decision"
        />
        <StatCard
          label="Disbursed Amount"
          value={CURRENCY_FORMATTER.format(disbursedAmount)}
          icon="money"
          tint="green"
          loading={leads === null && !leadsError}
          trend={disbursedTrend ?? undefined}
        />
        <StatCard
          label="Active Customers"
          value={customers ? String(activeCustomerCount) : '0'}
          icon="people"
          tint="electric"
          loading={customers === null && !customersError}
          footerNote="Registered accounts"
        />
      </div>

      <div className={styles.twoColumnRow}>
        <Card className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Applications &amp; Disbursed — Last 6 Months</h2>
          {leadsError ? (
            <ErrorState message={leadsError} onRetry={() => void loadLeads()} />
          ) : !monthlyTrends ? (
            <LoadingState message="Loading trend…" />
          ) : (
            <LineChart
              series={[
                { label: 'Applications', color: 'var(--color-primary)', points: monthlyTrends.applications },
                { label: 'Disbursed', color: 'var(--color-accent-electric)', points: monthlyTrends.disbursed },
              ]}
            />
          )}
        </Card>

        <Card className={styles.sideCard}>
          <div className={styles.sideCardHeader}>
            <h2 className={styles.sectionTitle}>Recent Approvals</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/settings/approvals')}>
              View all
            </Button>
          </div>
          {approvalsError ? (
            <ErrorState message={approvalsError} onRetry={() => void loadApprovals()} />
          ) : !recentApprovals ? (
            <LoadingState message="Loading approvals…" />
          ) : recentApprovals.length === 0 ? (
            <EmptyState icon="shieldCheck" message="No pending approvals." />
          ) : (
            <div className={styles.approvalList}>
              {recentApprovals.map((request) => (
                <div key={request.id} className={styles.approvalRow}>
                  <span className={styles.approvalDescription}>
                    {describeAction(request.action)}
                    {request.targetUserName ? ` — ${request.targetUserName}` : ''}
                  </span>
                  <span className={styles.approvalMeta}>
                    {request.makerName ?? 'Unknown'} · {formatDateTime(request.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className={styles.twoColumnRow}>
        <Card noPadding className={styles.tableCard}>
          <h2 className={`${styles.sectionTitle} ${styles.sectionTitlePadded}`}>Recent Applications</h2>
          <DataTable
            columns={applicationColumns}
            data={recentApplications}
            keyExtractor={(row) => row.id}
            error={leadsError}
            onRetry={() => void loadLeads()}
            emptyMessage="No applications yet."
            onRowClick={(row) => navigate(`/leads/${row.id}`)}
          />
        </Card>

        <Card className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>Application Status</h2>
          {leadsError ? (
            <ErrorState message={leadsError} onRetry={() => void loadLeads()} />
          ) : !statusDistribution ? (
            <LoadingState message="Loading status breakdown…" />
          ) : (
            <DonutChart segments={statusDistribution} />
          )}
        </Card>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.quickActions}>
          <button type="button" className={styles.quickAction} onClick={() => navigate('/leads')}>
            <Icon name="inbox" size={22} />
            Assign Leads
          </button>
          <button type="button" className={styles.quickAction} onClick={() => navigate('/settings/approvals')}>
            <Icon name="shieldCheck" size={22} />
            Review Approvals
          </button>
          <button type="button" className={styles.quickAction} onClick={() => navigate('/settings/team')}>
            <Icon name="user" size={22} />
            Manage Employees
          </button>
          <button type="button" className={styles.quickAction} onClick={() => navigate('/notifications')}>
            <Icon name="bell" size={22} />
            Notifications
          </button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Employee Workload Summary</h2>
        {employeesError ? (
          <ErrorState message={employeesError} onRetry={() => void loadEmployees()} />
        ) : employees === null ? (
          <LoadingState message="Loading employee workload…" />
        ) : (
          <Card noPadding>
            <EmployeeWorkloadTable employees={employees} />
          </Card>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Activity</h2>
        {leadsError ? (
          <ErrorState message={leadsError} onRetry={() => void loadLeads()} />
        ) : leads === null ? (
          <LoadingState message="Loading recent activity…" />
        ) : recentActivity.length === 0 ? (
          <EmptyState message="No recent activity yet." />
        ) : (
          <Card noPadding>
            <div className={styles.activityList}>
              {recentActivity.map((event) => (
                <div key={event.id} className={styles.activityRow}>
                  <span className={styles.activityDescription}>{event.description}</span>
                  <span className={styles.activityTimestamp}>{formatDateTime(event.timestamp)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
