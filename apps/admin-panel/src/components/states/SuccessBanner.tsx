import { Icon } from '../ui/Icon';

import styles from './States.module.css';

/** Dismissible, self-contained confirmation banner for an action that just completed (e.g. "Employee disabled."). Peer to ErrorState/EmptyState/LoadingState. */
export function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <div className={styles.success} role="status">
      <Icon name="checkCircle" size={20} />
      <span className={styles.successMessage}>{message}</span>
      <button type="button" className={styles.successDismiss} onClick={onDismiss} aria-label="Dismiss">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
