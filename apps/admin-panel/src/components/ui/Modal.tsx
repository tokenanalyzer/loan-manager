import type { ReactNode } from 'react';

import { Icon } from './Icon';
import styles from './Modal.module.css';

/**
 * Shared modal shell — a full-screen backdrop `<button>` (natively
 * interactive/keyboard-accessible, unlike a plain `<div onClick>`)
 * behind an opaque panel painted on top of it. `size="fullscreen"`
 * (used by Full Screen document preview) grows the panel to fill most
 * of the viewport instead of the default compact width.
 */
export function Modal({
  title,
  onClose,
  children,
  size = 'default',
}: {
  title?: string;
  onClose: () => void;
  children: ReactNode;
  size?: 'default' | 'fullscreen';
}): JSX.Element {
  return (
    <div className={styles.overlay}>
      <button type="button" aria-label="Close" onClick={onClose} className={styles.backdrop} />
      <div className={`${styles.panel} ${size === 'fullscreen' ? styles.panelFullscreen : ''}`}>
        {title && (
          <div className={styles.header}>
            <h2 className={styles.title}>{title}</h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className={styles.closeButton}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
