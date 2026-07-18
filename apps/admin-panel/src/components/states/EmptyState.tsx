import type { ReactNode } from 'react';

import { Icon, type IconName } from '../ui/Icon';

import styles from './States.module.css';

/** Inline "nothing here" indicator for empty lists/tables. */
export function EmptyState({
  icon = 'inbox',
  title,
  message,
  action,
}: {
  icon?: IconName;
  title?: string;
  message: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.inline}>
      <Icon name={icon} size={28} className={styles.icon} />
      {title && <span className={styles.title}>{title}</span>}
      <span className={styles.message}>{message}</span>
      {action}
    </div>
  );
}
