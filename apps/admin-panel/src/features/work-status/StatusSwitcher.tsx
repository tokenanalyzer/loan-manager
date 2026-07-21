import {
  BREAK_WORK_STATUSES,
  type MyWorkStatus,
  type WorkStatus,
} from '@loan-manager/shared-types';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '../../components/ui/Icon';

import { STATUS_COLORS, STATUS_LABELS } from './status-meta';
import styles from './StatusSwitcher.module.css';

const SELECTABLE_STATUSES: WorkStatus[] = ['online', 'busy', ...BREAK_WORK_STATUSES];

/** Employee-only status control in the Topbar — set Online/Busy, or start a break. */
export function StatusSwitcher({
  status,
  onSetStatus,
  onStartBreak,
}: {
  status: MyWorkStatus;
  onSetStatus: (status: WorkStatus) => Promise<void>;
  onStartBreak: (status: WorkStatus) => Promise<void>;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSelect(value: WorkStatus): Promise<void> {
    setOpen(false);
    if (value === 'online' || value === 'busy') {
      await onSetStatus(value);
    } else {
      await onStartBreak(value);
    }
  }

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.dot} style={{ background: STATUS_COLORS[status.status] }} />
        {STATUS_LABELS[status.status]}
        <Icon name="chevronDown" size={14} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          {SELECTABLE_STATUSES.map((value) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className={styles.menuItem}
              onClick={() => void handleSelect(value)}
            >
              <span className={styles.dot} style={{ background: STATUS_COLORS[value] }} />
              {STATUS_LABELS[value]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
