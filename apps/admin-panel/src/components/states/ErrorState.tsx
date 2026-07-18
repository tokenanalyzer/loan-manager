import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

import styles from './States.module.css';

/** Inline error indicator with an optional retry action. */
export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className={styles.inline} role="alert">
      <Icon name="alertTriangle" size={28} className={styles.icon} />
      <span className={styles.message}>{message}</span>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <Icon name="refresh" size={16} />
          Retry
        </Button>
      )}
    </div>
  );
}
