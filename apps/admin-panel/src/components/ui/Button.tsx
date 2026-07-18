import type { ButtonHTMLAttributes } from 'react';

import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** The one button primitive for the portal — matches AppTheme's button styling (radius 14, labelLarge text). */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: 'md' | 'sm';
}): JSX.Element {
  const classes = [styles.button, styles[variant], size === 'sm' ? styles.sm : '', className]
    .filter(Boolean)
    .join(' ');

  // eslint-disable-next-line react/button-has-type -- `type` is always supplied (defaulted above)
  return <button type={type} className={classes} {...rest} />;
}
