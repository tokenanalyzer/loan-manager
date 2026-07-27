import { motion } from 'framer-motion';

import { slideUpVariants } from '../../theme/motion';

import styles from './Alert.module.css';
import { Icon, type IconName } from './Icon';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const ICON_BY_VARIANT: Record<AlertVariant, IconName> = {
  info: 'infoCircle',
  success: 'checkCircle',
  warning: 'alertTriangle',
  error: 'alertTriangle',
};

/**
 * Generic inline banner — supersedes the two overlapping patterns this
 * codebase had before Phase 1: `SuccessBanner` (now a thin wrapper
 * around this) and the inline `<p role="alert">` error text hand-rolled
 * in most modals. New call sites should use this directly; existing
 * ones migrate as they're touched (Phase 3/4), not all at once.
 */
export function Alert({
  variant,
  message,
  onDismiss,
}: {
  variant: AlertVariant;
  message: string;
  onDismiss?: () => void;
}): JSX.Element {
  return (
    <motion.div
      className={`${styles.alert} ${styles[variant]}`}
      role={variant === 'error' || variant === 'warning' ? 'alert' : 'status'}
      variants={slideUpVariants}
      initial="initial"
      animate="animate"
    >
      <Icon name={ICON_BY_VARIANT[variant]} size={20} className={styles.icon} />
      <span className={styles.message}>{message}</span>
      {onDismiss && (
        <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
          <Icon name="close" size={16} />
        </button>
      )}
    </motion.div>
  );
}
