import styles from './Skeleton.module.css';

/**
 * Loading placeholder block — a subtle shimmer sweep, no motion library
 * needed (pure CSS `@keyframes`, matching the codebase's existing
 * spinner-animation convention). For data-dense layouts (dashboard
 * stat cards, charts, table rows) where the spinner-based
 * `LoadingState` would look sparse; `LoadingState` stays the default
 * for lighter-weight screens.
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  className,
}: {
  variant?: 'text' | 'rect' | 'circle';
  width?: number | string;
  height?: number | string;
  className?: string;
}): JSX.Element {
  const classes = [styles.skeleton, styles[variant], className].filter(Boolean).join(' ');
  return (
    <span
      className={classes}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
