import { useState, type FormEvent } from 'react';

import { Button } from '../../components/ui/Button';
import { FormActions, FormField, FormInput, FormTextarea } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';

/** Logs a new follow-up against the current lead — reuses `DisburseModal`'s form-modal shape. */
export function LogFollowUpModal({
  busy,
  onSubmit,
  onClose,
}: {
  busy: boolean;
  onSubmit: (payload: { note: string; dueAt: string }) => void;
  onClose: () => void;
}): JSX.Element {
  const [note, setNote] = useState('');
  const [dueAt, setDueAt] = useState('');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    onSubmit({ note: note.trim(), dueAt: new Date(dueAt).toISOString() });
  }

  return (
    <Modal title="Log follow-up" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FormField label="Next follow-up date" htmlFor="dueAt">
          <FormInput
            id="dueAt"
            type="datetime-local"
            required
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
          />
        </FormField>

        <FormField label="Notes (what happened / what's next)" htmlFor="note">
          <FormTextarea
            id="note"
            rows={4}
            required
            maxLength={2000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="e.g. Called, customer asked to follow up next week about documents."
          />
        </FormField>

        <FormActions>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || note.trim().length === 0 || dueAt.length === 0}>
            {busy ? 'Saving…' : 'Log follow-up'}
          </Button>
        </FormActions>
      </form>
    </Modal>
  );
}
