import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import { backdropVariants, scaleInVariants } from '../../theme/motion';

import { Icon } from './Icon';
import styles from './Modal.module.css';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 *
 * Accessibility: traps Tab/Shift+Tab focus within the panel, closes
 * on Escape, and returns focus to whatever triggered the modal on
 * close/unmount. The setup effect intentionally runs once (mount/
 * unmount only, not on every `onClose` identity change) — most call
 * sites pass an inline `onClose={() => setX(null)}`, a new function
 * every render, and re-running this effect on every render would
 * re-capture "the element with focus right now" as the
 * return-focus target, yanking focus away from whatever the user is
 * actively typing into. The latest `onClose` is read via a ref
 * instead, updated every render without re-triggering the effect.
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
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;

    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately mount/unmount-only, see doc comment above.
  }, []);

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
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
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
