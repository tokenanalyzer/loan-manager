import { useEffect, useRef, useState } from 'react';

import { useAuth } from '../../core/auth-context';
import { ROLE_LABELS } from '../../core/constants';
import { Icon } from '../ui/Icon';

import styles from './UserMenu.module.css';

function initialsFor(name: string | null, email: string | null): string {
  const source = name?.trim() || email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Avatar + name/role, opens a small dropdown with a Sign out action. */
export function UserMenu(): JSX.Element {
  const { profile, user, signOut } = useAuth();
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

  const displayName = profile?.fullName ?? user?.email ?? 'Account';
  const email = profile?.email ?? user?.email ?? null;
  const roleLabel = profile ? ROLE_LABELS[profile.role] : null;

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className={styles.avatar}>{initialsFor(profile?.fullName ?? null, email)}</span>
        <span className={styles.identity}>
          <span className={styles.name}>{displayName}</span>
          {roleLabel && <span className={styles.role}>{roleLabel}</span>}
        </span>
        <Icon name="chevronDown" size={16} />
      </button>

      {open && (
        <div className={styles.menu} role="menu">
          <div className={styles.menuHeader}>
            <div className={styles.name}>{displayName}</div>
            {email && <div className={styles.role}>{email}</div>}
          </div>
          <button
            type="button"
            role="menuitem"
            className={styles.menuItem}
            onClick={() => void signOut()}
          >
            <Icon name="logout" size={16} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
