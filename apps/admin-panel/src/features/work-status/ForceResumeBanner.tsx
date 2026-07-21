import { Icon } from '../../components/ui/Icon';

import styles from './ForceResumeBanner.module.css';

/** Shown once, right after an Admin's Force Resume brings the employee back to the dashboard. */
export function ForceResumeBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}): JSX.Element {
  return (
    <div className={styles.banner} role="status">
      <span>{message}</span>
      <button type="button" className={styles.closeButton} onClick={onDismiss} aria-label="Dismiss">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}
