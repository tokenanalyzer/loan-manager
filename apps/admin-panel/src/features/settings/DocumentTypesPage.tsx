import type { DocumentTypeCatalogEntry } from '@loan-manager/shared-types';
import { useCallback, useEffect, useState } from 'react';

import { Button } from '../../components/ui/Button';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { PageContainer } from '../../components/ui/PageContainer';
import { useToast } from '../../components/ui/Toast';
import { CATEGORY_LABEL } from '../documents/document-status-meta';

import { fetchDocumentTypes, updateDocumentType } from './document-types-api';
import { DocumentTypeFormModal } from './DocumentTypeFormModal';
import styles from './DocumentTypesPage.module.css';

/**
 * Settings → Document Types. `DocumentTypesController` (admin-only
 * catalog CRUD) already existed fully built on the backend — this is
 * the first screen wired to it. Adding/retiring a document type here
 * is how the catalog changes going forward, no migration or Flutter
 * release required (see `DocumentTypeEntity`'s doc comment).
 */
export function DocumentTypesPage(): JSX.Element {
  const toast = useToast();
  const [types, setTypes] = useState<DocumentTypeCatalogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formTarget, setFormTarget] = useState<'create' | DocumentTypeCatalogEntry | null>(null);
  const [togglingCode, setTogglingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const items = await fetchDocumentTypes();
      setTypes(items);
    } catch {
      setError('Could not load the document type catalog.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleToggleActive(entry: DocumentTypeCatalogEntry): Promise<void> {
    setTogglingCode(entry.code);
    try {
      await updateDocumentType(entry.code, { isActive: !entry.isActive });
      toast.success(`${entry.label} was ${entry.isActive ? 'deactivated' : 'activated'}.`);
      await load();
    } catch {
      setError(`Could not ${entry.isActive ? 'deactivate' : 'activate'} ${entry.label}.`);
    } finally {
      setTogglingCode(null);
    }
  }

  const columns: DataTableColumn<DocumentTypeCatalogEntry>[] = [
    { key: 'label', header: 'Label', render: (row) => row.label, sortValue: (row) => row.label.toLowerCase() },
    { key: 'code', header: 'Code', render: (row) => <code>{row.code}</code> },
    {
      key: 'category',
      header: 'Category',
      render: (row) => CATEGORY_LABEL[row.category] ?? row.category,
      sortValue: (row) => row.category,
    },
    {
      key: 'isRequired',
      header: 'Required',
      render: (row) => (row.isRequired ? 'Yes' : 'No'),
      align: 'center',
    },
    { key: 'maxUploads', header: 'Max uploads', render: (row) => row.maxUploads, align: 'center' },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <span className={row.isActive ? styles.statusActive : styles.statusInactive}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={() => setFormTarget(row)}>
            Edit
          </Button>
          <Button
            variant={row.isActive ? 'danger' : 'secondary'}
            size="sm"
            disabled={togglingCode === row.code}
            onClick={() => void handleToggleActive(row)}
          >
            {row.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <PageContainer
      title="Document Types"
      description="The document catalog customers upload against. Add, edit, or retire a type here — no app release required."
      actions={<Button onClick={() => setFormTarget('create')}>Add document type</Button>}
    >
      <DataTable
        columns={columns}
        data={types}
        keyExtractor={(row) => row.code}
        error={error}
        onRetry={() => void load()}
        emptyMessage="No document types in the catalog yet."
        pageSize={20}
      />

      {formTarget && (
        <DocumentTypeFormModal
          existing={formTarget === 'create' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={(message) => {
            setFormTarget(null);
            toast.success(message);
            void load();
          }}
        />
      )}
    </PageContainer>
  );
}
