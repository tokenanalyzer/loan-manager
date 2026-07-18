import type { HTMLAttributes } from 'react';

import styles from './Card.module.css';

/** Themed surface — matches AppTheme's CardTheme (18px radius, subtle indigo-tinted shadow). */
export function Card({
  noPadding = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }): JSX.Element {
  const classes = [styles.card, noPadding ? styles.noPadding : '', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} {...rest} />;
}
