import type { HTMLAttributes } from 'react';

import styles from './Card.module.css';

/**
 * Themed surface — matches AppTheme's CardTheme (18px radius, subtle
 * indigo-tinted shadow). Pass `interactive` for a Card wrapped by a
 * `<Link>`/`<button>` (e.g. `SettingsHubPage`'s link-cards) to get the
 * shared hover-lift treatment — see `Card.module.css`'s `.interactive`
 * doc comment for why focus styling belongs on the wrapper, not here.
 */
export function Card({
  noPadding = false,
  interactive = false,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { noPadding?: boolean; interactive?: boolean }): JSX.Element {
  const classes = [styles.card, noPadding ? styles.noPadding : '', interactive ? styles.interactive : '', className]
    .filter(Boolean)
    .join(' ');

  return <div className={classes} {...rest} />;
}
