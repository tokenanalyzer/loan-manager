import styles from './StatusBadge.module.css';

/**
 * Shared "colored dot + label" status indicator — extracted from three
 * independent hand-rolled copies (`MyLeadsPage`, `CustomerDetailPage`,
 * `EmployeeStatusPage`) found during the Employee CRM audit. Purely
 * presentational: callers keep computing their own `{ label, color }`
 * (e.g. `getDisplayStatus`, `STATUS_LABELS`/`STATUS_COLORS`) — this
 * only renders it consistently.
 */
export function StatusBadge({ label, color }: { label: string; color: string }): JSX.Element {
  return (
    <span className={styles.badge}>
      <span className={styles.dot} style={{ background: color }} />
      {label}
    </span>
  );
}
