import type { DocumentCenterEntry, EmployeeWorkload, LeadSummary } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { DonutChart } from '../../components/charts/DonutChart';
import { LineChart } from '../../components/charts/LineChart';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Icon } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { StatCard } from '../../components/ui/StatCard';
import { computeMonthlyTrends, computeStatusDistribution } from '../dashboard/dashboard-data';
import { fetchAllDocuments } from '../documents/documents-api';
import { fetchAllLeads, fetchEmployeesWithWorkload } from '../leads/leads-api';

import { exportReportCsv } from './reports-csv';
import {
  computeApprovalRejectionRates,
  computeDocumentCategoryBreakdown,
  computeDocumentStatusDistribution,
  computeEmployeePerformance,
  type EmployeePerformanceRow,
} from './reports-data';
import styles from './ReportsPage.module.css';

const MONTHLY_TREND_MONTHS = 12;

/**
 * Reports & Analytics — the five real-data widgets confirmed with the
 * user (Monthly Applications, Approval/Rejection Rate, Application
 * Status, Employee Performance, Document Verification Statistics), each
 * loaded from an already-existing endpoint and aggregated client-side
 * (see `reports-data.ts`). No fabricated metrics, no invented backend
 * endpoints — Branch Performance/Revenue/Customer Growth are
 * deliberately absent, not stubbed (see `IMPLEMENTATION_PROGRESS.md`).
 */
export function ReportsPage(): JSX.Element {
  const [leads, setLeads] = useState<LeadSummary[] | null>(null);
  const [leadsError, setLeadsError] = useState<string | null>(null);

  const [employees, setEmployees] = useState<EmployeeWorkload[] | null>(null);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentCenterEntry[] | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);

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
      setEmployeesError('Could not load employees.');
    }
  }, []);

  const loadDocuments = useCallback(async () => {
    setDocumentsError(null);
    try {
      setDocuments(await fetchAllDocuments({}));
    } catch {
      setDocumentsError('Could not load documents.');
    }
  }, []);

  const loadAll = useCallback(() => {
    void loadLeads();
    void loadEmployees();
    void loadDocuments();
  }, [loadLeads, loadEmployees, loadDocuments]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const monthlyTrends = useMemo(
    () => (leads ? computeMonthlyTrends(leads, MONTHLY_TREND_MONTHS) : null),
    [leads],
  );
  const statusDistribution = useMemo(() => (leads ? computeStatusDistribution(leads) : null), [leads]);
  const rates = useMemo(() => (leads ? computeApprovalRejectionRates(leads) : null), [leads]);

  const employeePerformance = useMemo<EmployeePerformanceRow[] | null>(
    () => (leads && employees ? computeEmployeePerformance(leads, employees) : null),
    [leads, employees],
  );

  const documentStatusDistribution = useMemo(
    () => (documents ? computeDocumentStatusDistribution(documents) : null),
    [documents],
  );
  const documentCategoryBreakdown = useMemo(
    () => (documents ? computeDocumentCategoryBreakdown(documents) : null),
    [documents],
  );

  const employeeColumns: DataTableColumn<EmployeePerformanceRow>[] = [
    { key: 'employeeName', header: 'Employee', render: (row) => row.employeeName, sortValue: (row) => row.employeeName },
    { key: 'assigned', header: 'Assigned', align: 'right', render: (row) => row.assigned, sortValue: (row) => row.assigned },
    { key: 'approved', header: 'Approved', align: 'right', render: (row) => row.approved, sortValue: (row) => row.approved },
    { key: 'rejected', header: 'Rejected', align: 'right', render: (row) => row.rejected, sortValue: (row) => row.rejected },
    { key: 'disbursed', header: 'Disbursed', align: 'right', render: (row) => row.disbursed, sortValue: (row) => row.disbursed },
    {
      key: 'approvalRate',
      header: 'Approval Rate',
      align: 'right',
      render: (row) => (row.approvalRate === null ? '—' : `${row.approvalRate.toFixed(1)}%`),
      sortValue: (row) => row.approvalRate ?? -1,
    },
  ];

  const exportEmployeePerformance = (): void => {
    if (!employeePerformance) return;
    exportReportCsv(
      'employee-performance',
      ['Employee', 'Assigned', 'Approved', 'Rejected', 'Disbursed', 'Approval Rate'],
      employeePerformance.map((row) => [
        row.employeeName,
        String(row.assigned),
        String(row.approved),
        String(row.rejected),
        String(row.disbursed),
        row.approvalRate === null ? '' : row.approvalRate.toFixed(1),
      ]),
    );
  };

  const exportStatusDistribution = (): void => {
    if (!statusDistribution) return;
    exportReportCsv(
      'application-status',
      ['Status', 'Count'],
      statusDistribution.map((segment) => [segment.label, String(segment.value)]),
    );
  };

  const exportDocumentStats = (): void => {
    if (!documentStatusDistribution || !documentCategoryBreakdown) return;
    exportReportCsv(
      'document-verification-stats',
      ['Breakdown', 'Label', 'Count'],
      [
        ...documentStatusDistribution.map((segment) => ['Status', segment.label, String(segment.value)]),
        ...documentCategoryBreakdown.map((entry) => ['Category', entry.label, String(entry.value)]),
      ],
    );
  };

  return (
    <PageContainer
      title="Reports & Analytics"
      description="Real-time metrics derived from live application, employee, and document data."
      actions={
        <Button variant="secondary" size="sm" onClick={loadAll}>
          <Icon name="refresh" size={16} />
          Refresh
        </Button>
      }
    >
      <div className={styles.statGrid}>
        <StatCard
          label="Approval Rate"
          value={rates ? `${rates.approvalRate.toFixed(1)}%` : '0%'}
          icon="shieldCheck"
          tint="green"
          loading={leads === null && !leadsError}
          footerNote={rates ? `${rates.approved} of ${rates.total} applications` : undefined}
        />
        <StatCard
          label="Rejection Rate"
          value={rates ? `${rates.rejectionRate.toFixed(1)}%` : '0%'}
          icon="alertTriangle"
          tint="amber"
          loading={leads === null && !leadsError}
          footerNote={rates ? `${rates.rejected} of ${rates.total} applications` : undefined}
        />
        <StatCard
          label="Documents Verified"
          value={documents ? String(documents.filter((doc) => doc.verificationStatus === 'verified').length) : '0'}
          icon="document"
          tint="indigo"
          loading={documents === null && !documentsError}
          footerNote={documents ? `of ${documents.length} documents` : undefined}
        />
        <StatCard
          label="Active Employees"
          value={employees ? String(employees.length) : '0'}
          icon="people"
          tint="electric"
          loading={employees === null && !employeesError}
          footerNote="On the workload roster"
        />
      </div>

      <div className={styles.twoColumnRow}>
        <Card className={styles.chartCard}>
          <h2 className={styles.sectionTitle}>Monthly Applications — Last 12 Months</h2>
          {leadsError ? (
            <ErrorState message={leadsError} onRetry={() => void loadLeads()} />
          ) : !monthlyTrends ? (
            <LoadingState message="Loading trend…" />
          ) : (
            <LineChart series={[{ label: 'Applications', color: 'var(--color-primary)', points: monthlyTrends.applications }]} />
          )}
        </Card>

        <Card className={styles.sideCard}>
          <div className={styles.sideCardHeader}>
            <h2 className={styles.sectionTitle}>Application Status</h2>
            <Button variant="ghost" size="sm" onClick={exportStatusDistribution} disabled={!statusDistribution}>
              <Icon name="download" size={14} />
              CSV
            </Button>
          </div>
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
        <div className={styles.sideCardHeader}>
          <h2 className={styles.sectionTitle}>Employee Performance</h2>
          <Button variant="ghost" size="sm" onClick={exportEmployeePerformance} disabled={!employeePerformance}>
            <Icon name="download" size={14} />
            CSV
          </Button>
        </div>
        {leadsError || employeesError ? (
          <ErrorState
            message={leadsError ?? employeesError ?? undefined}
            onRetry={() => {
              void loadLeads();
              void loadEmployees();
            }}
          />
        ) : (
          <Card noPadding>
            <DataTable
              columns={employeeColumns}
              data={employeePerformance}
              keyExtractor={(row) => row.employeeId}
              emptyMessage="No employees on the roster yet."
              pageSize={10}
            />
          </Card>
        )}
      </div>

      <div className={styles.twoColumnRow}>
        <Card className={styles.sideCard}>
          <h2 className={styles.sectionTitle}>Document Verification Status</h2>
          {documentsError ? (
            <ErrorState message={documentsError} onRetry={() => void loadDocuments()} />
          ) : !documentStatusDistribution ? (
            <LoadingState message="Loading document status…" />
          ) : (
            <DonutChart segments={documentStatusDistribution} />
          )}
        </Card>

        <Card className={styles.sideCard}>
          <div className={styles.sideCardHeader}>
            <h2 className={styles.sectionTitle}>Documents by Category</h2>
            <Button variant="ghost" size="sm" onClick={exportDocumentStats} disabled={!documentStatusDistribution}>
              <Icon name="download" size={14} />
              CSV
            </Button>
          </div>
          {documentsError ? (
            <ErrorState message={documentsError} onRetry={() => void loadDocuments()} />
          ) : !documentCategoryBreakdown ? (
            <LoadingState message="Loading category breakdown…" />
          ) : documentCategoryBreakdown.length === 0 ? (
            <span className={styles.emptyNote}>No documents yet.</span>
          ) : (
            <div className={styles.categoryList}>
              {documentCategoryBreakdown.map((entry) => (
                <div key={entry.label} className={styles.categoryRow}>
                  <span className={styles.categoryLabel}>{entry.label}</span>
                  <span className={styles.categoryValue}>{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
