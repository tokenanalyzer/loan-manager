import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { Card } from '../components/ui/Card';
import { APP_NAME } from '../core/constants';
import { slideUpVariants } from '../theme/motion';

import styles from './AuthLayout.module.css';

/** Centered branded card — used by the login screen and other pre-session pages. */
export function AuthLayout({
  subtitle,
  children,
}: {
  subtitle?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.page}>
      <motion.div className={styles.card} variants={slideUpVariants} initial="initial" animate="animate">
        <div className={styles.brand}>
          <span className={styles.brandMark}>{APP_NAME.charAt(0)}</span>
          <h1 className={styles.title}>{APP_NAME}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        <Card>{children}</Card>
      </motion.div>
    </div>
  );
}
