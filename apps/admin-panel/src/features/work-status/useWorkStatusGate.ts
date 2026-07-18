import type { MyWorkStatus, WorkStatus } from '@loan-manager/shared-types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { endMyBreak, fetchMyWorkStatus, setMyStatus, startBreak } from './work-status-api';

const POLL_INTERVAL_MS = 10_000;

const FORCE_RESUME_MESSAGE =
  'Your break has been ended by the administrator. Please resume your work.';

/**
 * Drives the Employee Portal's Break Mode: fetches the employee's own
 * status, and — only while on break — polls so an Admin Override
 * (Force Resume) is picked up without the employee refreshing.
 *
 * The Force-Resume banner is detected purely from the state
 * transition: if a *poll* (not our own start/end/setStatus call)
 * flips `isOnBreak` from true to false, nobody but an admin could
 * have done that — this employee's own client always sets
 * `isOnBreak: false` locally the instant it ends its own break.
 */
export function useWorkStatusGate(enabled: boolean) {
  const [status, setStatus] = useState<MyWorkStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [forceResumeMessage, setForceResumeMessage] = useState<string | null>(null);
  const previousIsOnBreakRef = useRef<boolean | null>(null);

  const applyStatus = useCallback((next: MyWorkStatus, fromPoll: boolean) => {
    if (fromPoll && previousIsOnBreakRef.current === true && !next.isOnBreak) {
      setForceResumeMessage(FORCE_RESUME_MESSAGE);
    }
    previousIsOnBreakRef.current = next.isOnBreak;
    setStatus(next);
  }, []);

  const refresh = useCallback(
    async (fromPoll = false) => {
      try {
        applyStatus(await fetchMyWorkStatus(), fromPoll);
      } catch {
        // Transient network/presence hiccup — keep the last known state and try again next tick.
      }
    },
    [applyStatus],
  );

  useEffect(() => {
    if (!enabled) return;
    setLoading(true);
    void refresh(false).finally(() => setLoading(false));
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !status?.isOnBreak) return undefined;
    const interval = setInterval(() => void refresh(true), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled, status?.isOnBreak, refresh]);

  const start = useCallback(
    async (breakType: WorkStatus) => {
      applyStatus(await startBreak(breakType), false);
    },
    [applyStatus],
  );

  const end = useCallback(async () => {
    applyStatus(await endMyBreak(), false);
  }, [applyStatus]);

  const setManualStatus = useCallback(
    async (value: WorkStatus) => {
      applyStatus(await setMyStatus(value), false);
    },
    [applyStatus],
  );

  return {
    status,
    loading,
    forceResumeMessage,
    dismissForceResumeMessage: () => setForceResumeMessage(null),
    start,
    end,
    setManualStatus,
  };
}
