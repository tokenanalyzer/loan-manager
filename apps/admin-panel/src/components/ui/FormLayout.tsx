import type { InputHTMLAttributes, ReactNode } from 'react';

import styles from './FormLayout.module.css';

/** Groups related fields with an optional section title. */
export function FormSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.section}>
      {title && <h3 className={styles.sectionTitle}>{title}</h3>}
      {children}
    </div>
  );
}

/** A responsive row of fields — wraps to one column on narrow screens. */
export function FormRow({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.row}>{children}</div>;
}

/** A single labeled field, with an optional inline error message. */
export function FormField({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error && (
        <span className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** Themed text input matching the portal's control styling. */
export function FormInput(props: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input className={styles.input} {...props} />;
}

/** Right-aligned action row for form submit/cancel buttons. */
export function FormActions({ children }: { children: ReactNode }): JSX.Element {
  return <div className={styles.actions}>{children}</div>;
}
