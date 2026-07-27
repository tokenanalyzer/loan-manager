import { Alert } from '../ui/Alert';

/** Dismissible, self-contained confirmation banner for an action that just completed (e.g. "Employee disabled."). Thin wrapper around the shared `Alert` primitive — kept as its own named export since every call site already imports it this way. */
export function SuccessBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}): JSX.Element {
  return <Alert variant="success" message={message} onDismiss={onDismiss} />;
}
