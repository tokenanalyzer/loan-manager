import { AnimatePresence, motion } from 'framer-motion';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { slideInRightVariants } from '../../theme/motion';

import { Icon, type IconName } from './Icon';
import styles from './Toast.module.css';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** Milliseconds before auto-dismiss. Pass 0 to require manual dismissal. Default 5000. */
  duration?: number;
  action?: ToastAction;
}

interface ToastRecord extends ToastOptions {
  id: number;
  variant: ToastVariant;
  message: string;
}

interface ToastApi {
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const ICON_BY_VARIANT: Record<ToastVariant, IconName> = {
  info: 'infoCircle',
  success: 'checkCircle',
  warning: 'alertTriangle',
  error: 'alertTriangle',
};

const DEFAULT_DURATION_MS = 5000;
/** How many toasts show at once — the rest wait in `toasts` past this index and appear as slots free up. */
const MAX_VISIBLE = 4;

let nextId = 0;

/**
 * App-wide toast/notification system — custom-built on existing
 * primitives (`Alert`'s variant color language, this app's own
 * `theme/motion.ts` variants), zero new dependencies. Mount once near
 * the app root (see `main.tsx`); call `useToast()` from anywhere
 * beneath it: `const toast = useToast(); toast.success('Saved.')`.
 *
 * Easy to extend without touching existing consumers — e.g. a future
 * `toast.success(msg, { icon: 'custom' })` option is additive to
 * `ToastOptions`, not a breaking change to the `toast.success(msg)`
 * call sites that already exist.
 */
export function ToastProvider({ children }: { children: ReactNode }): JSX.Element {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const visible = toasts.slice(0, MAX_VISIBLE);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant: ToastVariant, message: string, options?: ToastOptions) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, variant, message, ...options }]);
  }, []);

  // Only the currently-visible toasts get an auto-dismiss timer — one
  // waiting in the queue behind MAX_VISIBLE others shouldn't expire
  // before it's ever shown. Re-runs whenever the visible *set* changes
  // (a dismiss, a new push, or a queued toast being promoted).
  const visibleKey = visible.map((t) => t.id).join(',');
  useEffect(() => {
    const timers = visible
      .filter((t) => (t.duration ?? DEFAULT_DURATION_MS) > 0)
      .map((t) => setTimeout(() => dismiss(t.id), t.duration ?? DEFAULT_DURATION_MS));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- visibleKey is the intentional dependency (id-based identity), not the visible array reference.
  }, [visibleKey, dismiss]);

  const api = useRef<ToastApi>({
    success: (message, options) => push('success', message, options),
    error: (message, options) => push('error', message, options),
    warning: (message, options) => push('warning', message, options),
    info: (message, options) => push('info', message, options),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastStack toasts={visible} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

/** `toast.success/error/warning/info(message, options?)` — call from anywhere under `ToastProvider`. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[];
  onDismiss: (id: number) => void;
}): JSX.Element {
  return (
    <div className={styles.stack} role="region" aria-label="Toast notifications">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastRecord; onDismiss: () => void }): JSX.Element {
  return (
    <motion.div
      className={`${styles.toast} ${styles[toast.variant]}`}
      role={toast.variant === 'error' || toast.variant === 'warning' ? 'alert' : 'status'}
      variants={slideInRightVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <Icon name={ICON_BY_VARIANT[toast.variant]} size={20} className={styles.icon} />
      <span className={styles.message}>{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => {
            toast.action?.onClick();
            onDismiss();
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button type="button" className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss notification">
        <Icon name="close" size={16} />
      </button>
    </motion.div>
  );
}
