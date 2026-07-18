import styles from './States.module.css';

/** Inline loading indicator for use inside PageContainer/TableContainer content areas. */
export function LoadingState({ message = 'Loading…' }: { message?: string }): JSX.Element {
  return (
    <div className={styles.inline} role="status">
      <div className={styles.spinner} />
      <span className={styles.message}>{message}</span>
    </div>
  );
}
