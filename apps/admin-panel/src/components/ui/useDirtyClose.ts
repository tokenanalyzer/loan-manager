import { useState } from 'react';

/**
 * Wraps a dirty-form modal's close path so an accidental
 * backdrop/Cancel/X click doesn't silently discard edits. Consumers
 * pass `requestClose` to `Modal`'s `onClose` and to their own Cancel
 * button instead of calling `onClose` directly; `confirming` gates
 * whether to render a `ConfirmDialog` on top asking to discard.
 */
export function useDirtyClose(isDirty: boolean, onClose: () => void) {
  const [confirming, setConfirming] = useState(false);

  function requestClose(): void {
    if (isDirty) {
      setConfirming(true);
    } else {
      onClose();
    }
  }

  function confirmDiscard(): void {
    setConfirming(false);
    onClose();
  }

  function cancelDiscard(): void {
    setConfirming(false);
  }

  return { confirming, requestClose, confirmDiscard, cancelDiscard };
}
