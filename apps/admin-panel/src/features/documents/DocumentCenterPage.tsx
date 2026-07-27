import type { DocumentCenterEntry, DocumentVerificationStatus } from '@loan-manager/shared-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { DropdownMenu } from '../../components/ui/DropdownMenu';
import { Icon, type IconName } from '../../components/ui/Icon';
import { PageContainer } from '../../components/ui/PageContainer';
import { useAuth } from '../../core/auth-context';
import { formatDateTime } from '../workspace/lead-status-meta';

import { CATEGORY_LABEL, STATUS_COLOR, STATUS_LABEL } from './document-status-meta';
import { DocumentAuditModal } from './DocumentAuditModal';
import styles from './DocumentCenterPage.module.css';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import {
  deleteDocumentForStaff,
  fetchAllDocuments,
  fetchDocumentBlob,
  formatFileSize,
  triggerDownload,
  updateDocumentVerification,
} from './documents-api';
import { VerificationModal } from './VerificationModal';
import { VersionHistoryModal } from './VersionHistoryModal';

type ViewMode = 'list' | 'grid' | 'folder';
type PendingDelete = { kind: 'single'; doc: DocumentCenterEntry } | { kind: 'bulk' };
type PendingVerify = { doc: DocumentCenterEntry; mode: 'verify' | 'requestReupload' };

const VIEW_MODES: { mode: ViewMode; icon: IconName; label: string }[] = [
  { mode: 'list', icon: 'list', label: 'List' },
  { mode: 'grid', icon: 'grid', label: 'Grid' },
  { mode: 'folder', icon: 'folder', label: 'Folder' },
];

/**
 * The Enterprise Document Center — every document across every
 * customer, in one place (`/documents`, previously a placeholder).
 * Reuses Customer 360's embedded `DocumentManagementCenter` action
 * primitives as-is (the same API functions and the same
 * Preview/Verification/Audit/Version-History modals) rather than
 * reimplementing any of that business logic — this page only adds a
 * new platform-wide *listing* (List/Grid/Folder, filters, bulk
 * actions) on top of what already existed.
 */
export function DocumentCenterPage(): JSX.Element {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canVerify = profile?.role === 'employee' || profile?.role === 'admin';
  const canDelete = profile?.role === 'admin';

  const [documents, setDocuments] = useState<DocumentCenterEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [previewing, setPreviewing] = useState<DocumentCenterEntry | null>(null);
  const [verifying, setVerifying] = useState<PendingVerify | null>(null);
  const [viewingAudit, setViewingAudit] = useState<DocumentCenterEntry | null>(null);
  const [viewingVersions, setViewingVersions] = useState<DocumentCenterEntry | null>(null);
  const [deleting, setDeleting] = useState<PendingDelete | null>(null);
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setDocuments(await fetchAllDocuments({}));
    } catch {
      setError('Could not load documents.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(
    () => Array.from(new Set((documents ?? []).map((d) => d.category).filter((c): c is string => Boolean(c)))).sort(),
    [documents],
  );

  const filtered = useMemo(() => {
    if (!documents) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && doc.verificationStatus !== statusFilter) return false;
      if (!normalizedQuery) return true;
      const haystack = [doc.originalFileName, doc.typeLabel, doc.ownerName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [documents, query, categoryFilter, statusFilter]);

  function toggleSelected(id: string): void {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDownload(doc: DocumentCenterEntry): Promise<void> {
    setDownloadingId(doc.id);
    setActionError(null);
    try {
      const blob = await fetchDocumentBlob(doc.id);
      triggerDownload(blob, doc.originalFileName);
    } catch {
      setActionError('Could not download this document.');
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleVerifySubmit(status: DocumentVerificationStatus, note: string): Promise<void> {
    if (!verifying) return;
    setVerifyBusy(true);
    setActionError(null);
    try {
      await updateDocumentVerification(verifying.doc.id, status, note || undefined);
      setVerifying(null);
      await load();
    } catch {
      setActionError('Could not update verification status.');
    } finally {
      setVerifyBusy(false);
    }
  }

  async function handleBulkVerifyConfirm(): Promise<void> {
    setVerifyBusy(true);
    setActionError(null);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => updateDocumentVerification(id, 'verified')));
      setBulkVerifying(false);
      setSelectedIds(new Set());
      await load();
    } catch {
      setActionError('Could not verify all selected documents.');
    } finally {
      setVerifyBusy(false);
    }
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (!deleting) return;
    setDeleteBusy(true);
    setActionError(null);
    try {
      if (deleting.kind === 'single') {
        await deleteDocumentForStaff(deleting.doc.id);
      } else {
        await Promise.all(Array.from(selectedIds).map((id) => deleteDocumentForStaff(id)));
        setSelectedIds(new Set());
      }
      setDeleting(null);
      await load();
    } catch {
      setActionError('Could not delete the selected document(s).');
    } finally {
      setDeleteBusy(false);
    }
  }

  const columns: DataTableColumn<DocumentCenterEntry>[] = [
    {
      key: 'select',
      header: '',
      render: (doc) => (
        <input
          type="checkbox"
          checked={selectedIds.has(doc.id)}
          onChange={() => toggleSelected(doc.id)}
          onClick={(event) => event.stopPropagation()}
          aria-label={`Select ${doc.originalFileName}`}
        />
      ),
    },
    {
      key: 'name',
      header: 'Document Name',
      sortValue: (doc) => doc.originalFileName,
      render: (doc) => (
        <div className={styles.nameCell}>
          <span className={styles.fileName}>{doc.originalFileName}</span>
          {doc.currentVersionNumber && doc.currentVersionNumber > 1 && (
            <span className={styles.versionBadge}>v{doc.currentVersionNumber}</span>
          )}
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: (doc) => doc.ownerName ?? '',
      render: (doc) => (
        <button
          type="button"
          className={styles.linkButton}
          onClick={(event) => {
            event.stopPropagation();
            navigate(`/customers/${doc.ownerId}`);
          }}
        >
          {doc.ownerName ?? doc.ownerId.slice(0, 8)}
        </button>
      ),
    },
    { key: 'category', header: 'Category', render: (doc) => (doc.category ? CATEGORY_LABEL[doc.category] : '—') },
    { key: 'type', header: 'Document Type', render: (doc) => doc.typeLabel ?? '—' },
    { key: 'uploadedBy', header: 'Uploaded By', render: (doc) => doc.uploadedByName ?? 'Customer' },
    {
      key: 'uploadedAt',
      header: 'Upload Date',
      sortValue: (doc) => new Date(doc.uploadedAt).getTime(),
      render: (doc) => formatDateTime(doc.uploadedAt),
    },
    { key: 'size', header: 'File Size', align: 'right', render: (doc) => formatFileSize(doc.fileSizeBytes) },
    {
      key: 'status',
      header: 'Verification Status',
      render: (doc) => (
        <span className={styles.statusBadge} style={{ color: STATUS_COLOR[doc.verificationStatus] }}>
          {STATUS_LABEL[doc.verificationStatus]}
          {doc.verifiedByName ? ` · ${doc.verifiedByName}` : ''}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (doc) => <DocumentRowActions doc={doc} />,
    },
  ];

  // Plain inline buttons, not a dropdown — DataTable's own horizontal
  // scroll wrapper (`overflow-x: auto`, which forces `overflow-y` away
  // from `visible` per the CSS spec) clips any absolutely-positioned
  // popover that opens inside one of its cells, confirmed live. Matches
  // `DocumentManagementCenter`'s own already-proven all-inline-buttons
  // row actions exactly, rather than introducing a second pattern.
  function DocumentRowActions({ doc }: { doc: DocumentCenterEntry }): JSX.Element {
    return (
      <div className={styles.rowActions}>
        <Button size="sm" variant="secondary" onClick={() => setPreviewing(doc)}>
          Preview
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={downloadingId === doc.id}
          onClick={() => void handleDownload(doc)}
        >
          {downloadingId === doc.id ? 'Downloading…' : 'Download'}
        </Button>
        {canVerify && (
          <Button size="sm" variant="secondary" onClick={() => setVerifying({ doc, mode: 'verify' })}>
            Verify
          </Button>
        )}
        {canVerify && (
          <Button size="sm" variant="secondary" onClick={() => setVerifying({ doc, mode: 'requestReupload' })}>
            Request Re-upload
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setViewingVersions(doc)}>
          Versions
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setViewingAudit(doc)}>
          Audit
        </Button>
        {canDelete && (
          <Button size="sm" variant="danger" onClick={() => setDeleting({ kind: 'single', doc })}>
            Delete
          </Button>
        )}
      </div>
    );
  }

  const groupedByCategory = useMemo(() => {
    const groups = new Map<string, DocumentCenterEntry[]>();
    for (const doc of filtered) {
      const key = doc.category ?? 'other';
      groups.set(key, [...(groups.get(key) ?? []), doc]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <PageContainer
      title="Document Center"
      description="Every document across every customer — search, filter, verify, and manage from one place."
      actions={
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          <Icon name="refresh" size={16} />
          Refresh
        </Button>
      }
    >
      {error && <ErrorState message={error} onRetry={() => void load()} />}
      {actionError && <ErrorState message={actionError} onRetry={() => setActionError(null)} />}

      {!error && (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.search}
              type="search"
              placeholder="Search by document name, type, or customer…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className={styles.select} value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_LABEL[category] ?? category}
                </option>
              ))}
            </select>
            <select className={styles.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <div className={styles.viewToggle}>
              {VIEW_MODES.map(({ mode, icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  className={viewMode === mode ? styles.viewButtonActive : styles.viewButton}
                  onClick={() => setViewMode(mode)}
                  aria-label={`${label} view`}
                  aria-pressed={viewMode === mode}
                >
                  <Icon name={icon} size={16} />
                </button>
              ))}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className={styles.bulkBar}>
              <span className={styles.bulkCount}>{selectedIds.size} selected</span>
              {canVerify && (
                <Button size="sm" onClick={() => setBulkVerifying(true)}>
                  Mark Verified
                </Button>
              )}
              {canDelete && (
                <Button size="sm" variant="danger" onClick={() => setDeleting({ kind: 'bulk' })}>
                  Delete Selected
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
            </div>
          )}

          {documents === null && !error ? (
            <LoadingState message="Loading documents…" />
          ) : filtered.length === 0 ? (
            <EmptyState icon="upload" message="No documents match your filters." />
          ) : viewMode === 'list' ? (
            <DataTable columns={columns} data={filtered} keyExtractor={(doc) => doc.id} pageSize={20} />
          ) : viewMode === 'grid' ? (
            <div className={styles.grid}>
              {filtered.map((doc) => (
                <DocumentGridCard
                  key={doc.id}
                  doc={doc}
                  selected={selectedIds.has(doc.id)}
                  onToggleSelect={() => toggleSelected(doc.id)}
                  onPreview={() => setPreviewing(doc)}
                  onDownload={() => void handleDownload(doc)}
                  downloading={downloadingId === doc.id}
                  onVerify={canVerify ? () => setVerifying({ doc, mode: 'verify' }) : undefined}
                  onRequestReupload={canVerify ? () => setVerifying({ doc, mode: 'requestReupload' }) : undefined}
                  onViewVersions={() => setViewingVersions(doc)}
                  onViewAudit={() => setViewingAudit(doc)}
                  onDelete={canDelete ? () => setDeleting({ kind: 'single', doc }) : undefined}
                  onOpenCustomer={() => navigate(`/customers/${doc.ownerId}`)}
                />
              ))}
            </div>
          ) : (
            <div className={styles.folders}>
              {groupedByCategory.map(([category, docs]) => (
                <Card key={category} noPadding>
                  <details open>
                    <summary className={styles.folderSummary}>
                      <Icon name="folder" size={18} />
                      <span className={styles.folderLabel}>{CATEGORY_LABEL[category] ?? category}</span>
                      <span className={styles.folderCount}>{docs.length}</span>
                    </summary>
                    <DataTable columns={columns} data={docs} keyExtractor={(doc) => doc.id} />
                  </details>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {bulkVerifying && (
        <ConfirmDialog
          title="Mark selected documents as verified?"
          message={`${selectedIds.size} document(s) will be marked Verified, without an individual note. Use the per-document Verify action if you need to add one.`}
          confirmLabel="Mark Verified"
          busy={verifyBusy}
          onConfirm={() => void handleBulkVerifyConfirm()}
          onCancel={() => setBulkVerifying(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={deleting.kind === 'bulk' ? 'Delete selected documents?' : 'Delete this document?'}
          message={
            deleting.kind === 'bulk'
              ? `${selectedIds.size} document(s) — and every prior version of each — will be permanently deleted. This cannot be undone.`
              : `"${deleting.doc.originalFileName}" and every prior version will be permanently deleted. This cannot be undone.`
          }
          confirmLabel="Delete"
          variant="danger"
          busy={deleteBusy}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleting(null)}
        />
      )}

      {previewing && (
        <DocumentPreviewModal
          documentId={previewing.id}
          fileName={previewing.originalFileName}
          mimeType={previewing.mimeType}
          onClose={() => setPreviewing(null)}
        />
      )}

      {verifying && (
        <VerificationModal
          fileName={verifying.doc.originalFileName}
          currentStatus={verifying.doc.verificationStatus}
          mode={verifying.mode}
          busy={verifyBusy}
          onSubmit={(status, note) => void handleVerifySubmit(status, note)}
          onClose={() => setVerifying(null)}
        />
      )}

      {viewingVersions && (
        <VersionHistoryModal
          documentId={viewingVersions.id}
          fileName={viewingVersions.originalFileName}
          onClose={() => setViewingVersions(null)}
        />
      )}

      {viewingAudit && (
        <DocumentAuditModal
          documentId={viewingAudit.id}
          fileName={viewingAudit.originalFileName}
          onClose={() => setViewingAudit(null)}
        />
      )}
    </PageContainer>
  );
}

function DocumentGridCard({
  doc,
  selected,
  onToggleSelect,
  onPreview,
  onDownload,
  downloading,
  onVerify,
  onRequestReupload,
  onViewVersions,
  onViewAudit,
  onDelete,
  onOpenCustomer,
}: {
  doc: DocumentCenterEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onDownload: () => void;
  downloading: boolean;
  onVerify?: () => void;
  onRequestReupload?: () => void;
  onViewVersions: () => void;
  onViewAudit: () => void;
  onDelete?: () => void;
  onOpenCustomer: () => void;
}): JSX.Element {
  return (
    <Card className={styles.gridCard}>
      <div className={styles.gridCardHeader}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} aria-label={`Select ${doc.originalFileName}`} />
        <Icon name="document" size={28} className={styles.gridCardIcon} />
        <DropdownMenu
          trigger={({ toggle }) => (
            <Button size="sm" variant="ghost" onClick={toggle} aria-label="More actions">
              <Icon name="moreVertical" size={16} />
            </Button>
          )}
        >
          {onVerify && (
            <button type="button" role="menuitem" className={styles.menuItem} onClick={onVerify}>
              Verify
            </button>
          )}
          {onRequestReupload && (
            <button type="button" role="menuitem" className={styles.menuItem} onClick={onRequestReupload}>
              Request Re-upload
            </button>
          )}
          <button type="button" role="menuitem" className={styles.menuItem} onClick={onViewVersions}>
            Version History
          </button>
          <button type="button" role="menuitem" className={styles.menuItem} onClick={onViewAudit}>
            Audit Timeline
          </button>
          {onDelete && (
            <button type="button" role="menuitem" className={styles.menuItemDanger} onClick={onDelete}>
              Delete
            </button>
          )}
        </DropdownMenu>
      </div>
      <span className={styles.gridFileName} title={doc.originalFileName}>
        {doc.originalFileName}
      </span>
      <span className={styles.gridMeta}>{doc.typeLabel ?? 'Document'}</span>
      <button type="button" className={styles.linkButton} onClick={onOpenCustomer}>
        {doc.ownerName ?? doc.ownerId.slice(0, 8)}
      </button>
      <span className={styles.gridMeta}>
        {formatFileSize(doc.fileSizeBytes)} · {formatDateTime(doc.uploadedAt)}
      </span>
      <span className={styles.statusBadge} style={{ color: STATUS_COLOR[doc.verificationStatus] }}>
        {STATUS_LABEL[doc.verificationStatus]}
      </span>
      <div className={styles.gridCardActions}>
        <Button size="sm" variant="secondary" onClick={onPreview}>
          Preview
        </Button>
        <Button size="sm" variant="secondary" disabled={downloading} onClick={onDownload}>
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
      </div>
    </Card>
  );
}
