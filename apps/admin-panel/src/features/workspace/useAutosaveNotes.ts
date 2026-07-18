import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

import { updateLeadNotes } from './workspace-api';

const AUTOSAVE_DELAY_MS = 1500;

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'locked';

/**
 * Debounced autosave for a lead's Internal Notes. `locked` means the
 * PATCH came back 403 — the lead was reassigned away from this
 * employee mid-session (Lead Locking) — further edits stop saving.
 */
export function useAutosaveNotes(leadId: string, initialNotes: string | null) {
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [status, setStatus] = useState<AutosaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  async function save(value: string): Promise<void> {
    setStatus('saving');
    try {
      const updated = await updateLeadNotes(leadId, value);
      setStatus('saved');
      setLastSavedAt(updated.internalNotesUpdatedAt);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        setStatus('locked');
      } else {
        setStatus('error');
      }
    }
  }

  function handleChange(value: string): void {
    setNotes(value);
    if (status === 'locked') return;
    setStatus('idle');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => void save(value), AUTOSAVE_DELAY_MS);
  }

  return { notes, status, lastSavedAt, handleChange };
}
