import type {
  CreateDocumentTypePayload,
  DocumentCategory,
  DocumentTypeCatalogEntry,
} from '@loan-manager/shared-types';
import { useRef, useState } from 'react';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormActions, FormField, FormInput, FormRow } from '../../components/ui/FormLayout';
import { Modal } from '../../components/ui/Modal';
import { useDirtyClose } from '../../components/ui/useDirtyClose';
import { CATEGORY_LABEL } from '../documents/document-status-meta';

import { createDocumentType, updateDocumentType } from './document-types-api';

const CATEGORIES = Object.keys(CATEGORY_LABEL) as DocumentCategory[];
const CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

interface FieldErrors {
  code?: string;
  label?: string;
  maxUploads?: string;
}

function parseCommaList(value: string): string[] | undefined {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/**
 * Create/edit dialog for one document catalog row. `existing` present
 * means edit mode — `code` becomes read-only (immutable on the
 * backend) and the submit goes to `updateDocumentType` instead of
 * `createDocumentType`. Modeled on `CreateStaffModal`'s shape.
 */
export function DocumentTypeFormModal({
  existing,
  onClose,
  onSaved,
}: {
  existing?: DocumentTypeCatalogEntry;
  onClose: () => void;
  onSaved: (message: string) => void;
}): JSX.Element {
  const isEdit = existing != null;

  const [code, setCode] = useState(existing?.code ?? '');
  const [label, setLabel] = useState(existing?.label ?? '');
  const [category, setCategory] = useState<DocumentCategory>(existing?.category ?? 'other');
  const [isRequired, setIsRequired] = useState(existing?.isRequired ?? false);
  const [maxUploads, setMaxUploads] = useState(String(existing?.maxUploads ?? 1));
  const [sortOrder, setSortOrder] = useState(String(existing?.sortOrder ?? 0));
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [applicableLoanCategoryIds, setApplicableLoanCategoryIds] = useState(
    existing?.applicableLoanCategoryIds?.join(', ') ?? '',
  );
  const [requirementGroupCode, setRequirementGroupCode] = useState(existing?.requirementGroupCode ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Captured once — the baseline `isDirty` compares current field values
  // against, so editing a value then editing it back to match reads as
  // "not dirty" again.
  const initial = useRef({
    code,
    label,
    category,
    isRequired,
    maxUploads,
    sortOrder,
    isActive,
    applicableLoanCategoryIds,
    requirementGroupCode,
  }).current;

  const isDirty =
    (!isEdit && code !== initial.code) ||
    label !== initial.label ||
    category !== initial.category ||
    isRequired !== initial.isRequired ||
    maxUploads !== initial.maxUploads ||
    sortOrder !== initial.sortOrder ||
    isActive !== initial.isActive ||
    applicableLoanCategoryIds !== initial.applicableLoanCategoryIds ||
    requirementGroupCode !== initial.requirementGroupCode;

  const { confirming, requestClose, confirmDiscard, cancelDiscard } = useDirtyClose(isDirty, onClose);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (label.trim() === '') errors.label = 'Label is required.';
    if (!isEdit) {
      if (code.trim() === '') errors.code = 'Code is required.';
      else if (!CODE_PATTERN.test(code.trim())) errors.code = 'Lowercase snake_case only, e.g. form_16.';
    }
    const uploads = Number(maxUploads);
    if (!Number.isInteger(uploads) || uploads < 1 || uploads > 20) {
      errors.maxUploads = 'Enter a whole number between 1 and 20.';
    }
    return errors;
  }

  async function handleSubmit(): Promise<void> {
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const shared: Omit<CreateDocumentTypePayload, 'code'> = {
        label: label.trim(),
        category,
        isRequired,
        maxUploads: Number(maxUploads),
        sortOrder: Number(sortOrder),
        applicableLoanCategoryIds: parseCommaList(applicableLoanCategoryIds),
        requirementGroupCode: requirementGroupCode.trim() || undefined,
      };

      if (isEdit) {
        await updateDocumentType(existing.code, { ...shared, isActive });
        onSaved(`${label.trim()} was updated.`);
      } else {
        await createDocumentType({ code: code.trim(), ...shared });
        onSaved(`${label.trim()} was added to the document catalog.`);
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not save this document type. Please try again.';
      setError(Array.isArray(message) ? message.join(' ') : message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
    <Modal title={isEdit ? 'Edit document type' : 'Add document type'} onClose={requestClose}>
      <FormField label="Code" htmlFor="doc-type-code" error={fieldErrors.code}>
        <FormInput
          id="doc-type-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (fieldErrors.code) setFieldErrors((prev) => ({ ...prev, code: undefined }));
          }}
          placeholder="form_16"
          disabled={isEdit}
        />
      </FormField>

      <FormField label="Label" htmlFor="doc-type-label" error={fieldErrors.label}>
        <FormInput
          id="doc-type-label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            if (fieldErrors.label) setFieldErrors((prev) => ({ ...prev, label: undefined }));
          }}
          placeholder="Form 16"
        />
      </FormField>

      <FormRow>
        <FormField label="Category" htmlFor="doc-type-category">
          <select
            id="doc-type-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
          >
            {CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABEL[value]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Max uploads" htmlFor="doc-type-max-uploads" error={fieldErrors.maxUploads}>
          <FormInput
            id="doc-type-max-uploads"
            type="number"
            min={1}
            max={20}
            value={maxUploads}
            onChange={(e) => {
              setMaxUploads(e.target.value);
              if (fieldErrors.maxUploads) setFieldErrors((prev) => ({ ...prev, maxUploads: undefined }));
            }}
          />
        </FormField>
      </FormRow>

      <FormRow>
        <FormField label="Sort order" htmlFor="doc-type-sort-order">
          <FormInput
            id="doc-type-sort-order"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </FormField>

        <FormField label="Requirement group (optional)" htmlFor="doc-type-requirement-group">
          <FormInput
            id="doc-type-requirement-group"
            value={requirementGroupCode}
            onChange={(e) => setRequirementGroupCode(e.target.value)}
            placeholder="income_proof"
          />
        </FormField>
      </FormRow>

      <FormField label="Applicable loan categories (optional, comma-separated)" htmlFor="doc-type-loan-categories">
        <FormInput
          id="doc-type-loan-categories"
          value={applicableLoanCategoryIds}
          onChange={(e) => setApplicableLoanCategoryIds(e.target.value)}
          placeholder="home, vehicle — leave blank for general"
        />
      </FormField>

      <FormRow>
        <label>
          <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />
          {' Required'}
        </label>
        {isEdit && (
          <label>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {' Active'}
          </label>
        )}
      </FormRow>

      {error && <Alert variant="error" message={error} />}

      <FormActions>
        <Button variant="secondary" onClick={requestClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create document type'}
        </Button>
      </FormActions>
    </Modal>

    {confirming && (
      <ConfirmDialog
        title={isEdit ? 'Discard changes?' : 'Discard this document type?'}
        message="You have unsaved changes. Discard them?"
        confirmLabel="Discard"
        variant="danger"
        onConfirm={confirmDiscard}
        onCancel={cancelDiscard}
      />
    )}
    </>
  );
}
