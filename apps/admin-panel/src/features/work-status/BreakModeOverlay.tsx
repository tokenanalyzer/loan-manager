import type { MyWorkStatus } from '@loan-manager/shared-types';
import { useEffect, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../core/auth-context';

import styles from './BreakModeOverlay.module.css';
import { formatElapsed, STATUS_COLORS, STATUS_LABELS } from './status-meta';

/**
 * Break Mode — while the employee is on any break, this replaces the
 * entire portal (no Sidebar/Topbar/pages reachable). The only two
 * actions available are End Break and Logout, per the Break
 * Management spec.
 */
export function BreakModeOverlay({
  status,
  onEndBreak,
}: {
  status: MyWorkStatus;
  onEndBreak: () => Promise<void>;
}): JSX.Element {
  const { signOut } = useAuth();
  const [elapsedSeconds, setElapsedSeconds] = useState(() => secondsSince(status.statusSince));
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    setElapsedSeconds(secondsSince(status.statusSince));
    const interval = setInterval(() => setElapsedSeconds(secondsSince(status.statusSince)), 1000);
    return () => clearInterval(interval);
  }, [status.statusSince]);

  async function handleEndBreak(): Promise<void> {
    setEnding(true);
    try {
      await onEndBreak();
    } finally {
      setEnding(false);
    }
  }

  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <span
          className={styles.dot}
          style={{ background: STATUS_COLORS[status.status] }}
          aria-hidden="true"
        />
        <span className={styles.status}>{STATUS_LABELS[status.status]}</span>
        <span className={styles.meta}>
          Started at {new Date(status.statusSince).toLocaleTimeString()}
        </span>
        <span className={styles.elapsed}>{formatElapsed(elapsedSeconds)}</span>
        <p className={styles.meta}>
          You&rsquo;re on break — the portal is unavailable until you end it.
        </p>
        <div className={styles.actions}>
          <Button onClick={() => void handleEndBreak()} disabled={ending}>
            {ending ? 'Ending…' : 'End Break'}
          </Button>
          <Button variant="secondary" onClick={() => void signOut()} disabled={ending}>
            Logout
          </Button>
        </div>
      </Card>
    </div>
  );
}

function secondsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}
