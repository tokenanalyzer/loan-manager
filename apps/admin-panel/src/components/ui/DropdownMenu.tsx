import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { scaleInVariants } from '../../theme/motion';

import styles from './DropdownMenu.module.css';

/**
 * Generic dropdown primitive — owns open/close state, click-outside
 * dismissal, and Escape-to-close, so any trigger+menu pairing (user
 * menu, future row-action menus, filter menus) gets consistent
 * behavior and animation without reimplementing it. `trigger` is a
 * render prop so the caller fully controls what's clickable (an
 * avatar, a button, an icon) while this component owns the mechanics.
 */
export function DropdownMenu({
  trigger,
  children,
  align = 'right',
}: {
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {trigger({ open, toggle: () => setOpen((value) => !value) })}
      <AnimatePresence>
        {open && (
          <motion.div
            className={`${styles.panel} ${align === 'left' ? styles.alignLeft : styles.alignRight}`}
            role="menu"
            variants={scaleInVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={() => setOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
