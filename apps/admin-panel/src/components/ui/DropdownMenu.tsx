import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { scaleInVariants } from '../../theme/motion';

import styles from './DropdownMenu.module.css';

const ARROW_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

/**
 * Generic dropdown primitive — owns open/close state, click-outside
 * dismissal, Escape-to-close, arrow-key navigation between `[role="menuitem"]`
 * children, and focus management (moves focus into the panel on open,
 * returns it to whatever triggered the menu on close), so any
 * trigger+menu pairing (user menu, row-action menus, filter menus)
 * gets consistent behavior without reimplementing it. `trigger` is a
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
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  function toggle(): void {
    if (!open) previouslyFocused.current = document.activeElement as HTMLElement | null;
    setOpen((value) => !value);
  }

  useEffect(() => {
    if (!open) return;

    const firstItem = panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    firstItem?.focus();

    function handleClickOutside(event: MouseEvent): void {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (!ARROW_KEYS.has(event.key)) return;

      const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
      if (items.length === 0) return;
      event.preventDefault();

      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number;
      if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = items.length - 1;
      else if (event.key === 'ArrowDown') nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
      else nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;

      items[nextIndex]?.focus();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      {trigger({ open, toggle })}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
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
