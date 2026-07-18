import type { ReactNode } from 'react';

/**
 * Shared modal shell — a full-screen backdrop `<button>` (natively
 * interactive/keyboard-accessible, unlike a plain `<div onClick>`)
 * behind an opaque content panel painted on top of it.
 */
export function ModalOverlay({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          border: 'none',
          padding: 0,
          cursor: 'default',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: 8,
          padding: '1.5rem',
          minWidth: 480,
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}
