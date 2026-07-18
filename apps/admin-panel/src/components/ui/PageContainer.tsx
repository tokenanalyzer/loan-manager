import type { ReactNode } from 'react';

import styles from './PageContainer.module.css';

/** Standard page shell: max-width content column + optional title/description/actions header. */
export function PageContainer({
  title,
  description,
  actions,
  children,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.container}>
      {(title || actions) && (
        <div className={styles.header}>
          <div className={styles.titleGroup}>
            {title && <h1 className={styles.title}>{title}</h1>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
