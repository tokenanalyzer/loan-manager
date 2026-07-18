import type { ReactNode } from 'react';

import { Icon, type IconName } from '../ui/Icon';

import styles from './States.module.css';

/** Full-viewport state screen — the base for 404 / Access Denied / Session Expired pages. */
export function FullPageState({
  icon,
  title,
  message,
  action,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.fullPage}>
      <div className={styles.fullPageCard}>
        <div className={styles.fullPageIconWrap}>
          <Icon name={icon} size={28} />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {action}
      </div>
    </div>
  );
}
