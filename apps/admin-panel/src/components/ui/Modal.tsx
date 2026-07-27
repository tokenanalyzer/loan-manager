import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

import { backdropVariants, scaleInVariants } from '../../theme/motion';

import { Icon } from './Icon';
import styles from './Modal.module.css';

/**
 * Shared modal shell — a full-screen backdrop `<button>` (natively
 * interactive/keyboard-accessible, unlike a plain `<div onClick>`)
 * behind an opaque panel painted on top of it. `size="fullscreen"`
 * (used by Full Screen document preview) grows the panel to fill most
 * of the viewport instead of the default compact width.
 *
 * Animates in on mount (`initial`→`animate`, no `exit`) — most call
 * sites conditionally render this without an `AnimatePresence`
 * wrapper, so an exit animation wouldn't play anyway; entrance alone
 * still delivers the "premium dialog" feel without requiring every
 * consumer to change.
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
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={styles.backdrop}
        variants={backdropVariants}
        initial="initial"
        animate="animate"
      />
      <motion.div
        className={`${styles.panel} ${size === 'fullscreen' ? styles.panelFullscreen : ''}`}
        variants={scaleInVariants}
        initial="initial"
        animate="animate"
      >
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
      </motion.div>
    </div>
  );
}
