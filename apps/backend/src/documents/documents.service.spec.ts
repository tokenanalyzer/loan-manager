import type { DataSource, Repository } from 'typeorm';

import { AuditLogEntity, DocumentEntity, type DocumentTypeEntity, DocumentVersionEntity } from '../database/entities';
import type { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { StorageService } from '../storage/storage.service';

import type { DocumentTypeRepository } from './document-type.repository';
import type { DocumentVersionRepository } from './document-version.repository';
import type { DocumentRepository } from './document.repository';
import { DocumentsService } from './documents.service';

type MockType = Pick<
  DocumentTypeEntity,
  'code' | 'label' | 'isRequired' | 'applicableLoanCategoryIds' | 'requirementGroupCode'
>;
type MockDocument = Pick<DocumentEntity, 'documentTypeCode' | 'verificationStatus'>;

/**
 * Approval validation gate — mandatory backend rule (Sprint 1, Item 4):
 * an application cannot be approved unless every required document (for
 * its category) is `verified`. These tests exercise
 * `getBlockingDocumentsForApproval` directly, the same "which types are
 * required for this category" filter `buildOverview` uses (see
 * `getRelevantTypes`), so a passing suite here also protects that shared
 * logic from silently drifting.
 */
describe('DocumentsService.getBlockingDocumentsForApproval', () => {
  function buildService(types: MockType[], documents: MockDocument[]): DocumentsService {
    const documentTypeRepository = {
      findAllActive: jest.fn().mockResolvedValue(types),
    } as unknown as DocumentTypeRepository;
    const documentRepository = {
      findAllByOwner: jest.fn().mockResolvedValue(documents),
    } as unknown as DocumentRepository;

    return new DocumentsService(
      documentRepository,
      documentTypeRepository,
      {} as DocumentVersionRepository,
      {} as StorageService,
      {} as LoanApplicationsService,
      {} as NotificationsService,
      {} as Repository<AuditLogEntity>,
      {} as DataSource,
    );
  }

  it('flags a required type as missing when nothing has been uploaded for it', async () => {
    const service = buildService(
      [{ code: 'pan_card', label: 'PAN Card', isRequired: true, applicableLoanCategoryIds: null }],
      [],
    );

    const blocking = await service.getBlockingDocumentsForApproval('owner-1');

    expect(blocking).toEqual([{ code: 'pan_card', label: 'PAN Card', reason: 'missing' }]);
  });

  it.each(['pending', 'rejected', 'reupload_requested'] as const)(
    'flags a required type with reason "%s" when its uploaded document is not verified',
    async (status) => {
      const service = buildService(
        [{ code: 'aadhaar_card', label: 'Aadhaar Card', isRequired: true, applicableLoanCategoryIds: null }],
        [{ documentTypeCode: 'aadhaar_card', verificationStatus: status }],
      );

      const blocking = await service.getBlockingDocumentsForApproval('owner-1');

      expect(blocking).toEqual([{ code: 'aadhaar_card', label: 'Aadhaar Card', reason: status }]);
    },
  );

  it('does not block on a required type once it is verified', async () => {
    const service = buildService(
      [{ code: 'aadhaar_card', label: 'Aadhaar Card', isRequired: true, applicableLoanCategoryIds: null }],
      [{ documentTypeCode: 'aadhaar_card', verificationStatus: 'verified' }],
    );

    const blocking = await service.getBlockingDocumentsForApproval('owner-1');

    expect(blocking).toEqual([]);
  });

  it('ignores optional (non-required) types regardless of their status', async () => {
    const service = buildService(
      [{ code: 'id_proof', label: 'Other ID Proof', isRequired: false, applicableLoanCategoryIds: null }],
      [],
    );

    const blocking = await service.getBlockingDocumentsForApproval('owner-1');

    expect(blocking).toEqual([]);
  });

  it('only considers a category-specific required type when the matching categoryId is passed', async () => {
    const types: MockType[] = [
      { code: 'property_documents', label: 'Property Documents', isRequired: true, applicableLoanCategoryIds: ['lap'] },
    ];

    const forLap = await buildService(types, []).getBlockingDocumentsForApproval('owner-1', 'lap');
    expect(forLap).toEqual([{ code: 'property_documents', label: 'Property Documents', reason: 'missing' }]);

    const forPersonal = await buildService(types, []).getBlockingDocumentsForApproval('owner-1', 'personal');
    expect(forPersonal).toEqual([]);
  });

  it('reports every blocking type at once, not just the first', async () => {
    const service = buildService(
      [
        { code: 'pan_card', label: 'PAN Card', isRequired: true, applicableLoanCategoryIds: null },
        { code: 'aadhaar_card', label: 'Aadhaar Card', isRequired: true, applicableLoanCategoryIds: null },
        { code: 'passport_photo', label: 'Passport Photo', isRequired: true, applicableLoanCategoryIds: null },
      ],
      [{ documentTypeCode: 'aadhaar_card', verificationStatus: 'pending' }],
    );

    const blocking = await service.getBlockingDocumentsForApproval('owner-1');

    expect(blocking).toEqual([
      { code: 'pan_card', label: 'PAN Card', reason: 'missing' },
      { code: 'aadhaar_card', label: 'Aadhaar Card', reason: 'pending' },
      { code: 'passport_photo', label: 'Passport Photo', reason: 'missing' },
    ]);
  });

  describe('OR-group requirements (requirementGroupCode)', () => {
    it('does not block a group once any one member has a verified upload', async () => {
      const types: MockType[] = [
        {
          code: 'salary_slip',
          label: 'Salary Slip',
          isRequired: true,
          applicableLoanCategoryIds: ['home'],
          requirementGroupCode: 'income_proof',
        },
        {
          code: 'itr',
          label: 'ITR (Income Tax Return)',
          isRequired: true,
          applicableLoanCategoryIds: ['home'],
          requirementGroupCode: 'income_proof',
        },
      ];
      const documents: MockDocument[] = [{ documentTypeCode: 'itr', verificationStatus: 'verified' }];

      const blocking = await buildService(types, documents).getBlockingDocumentsForApproval(
        'owner-1',
        'home',
      );

      expect(blocking).toEqual([]);
    });

    it('reports one blocking entry for a group with nothing uploaded, joining member labels', async () => {
      const types: MockType[] = [
        {
          code: 'salary_slip',
          label: 'Salary Slip',
          isRequired: true,
          applicableLoanCategoryIds: ['home'],
          requirementGroupCode: 'income_proof',
        },
        {
          code: 'itr',
          label: 'ITR (Income Tax Return)',
          isRequired: true,
          applicableLoanCategoryIds: ['home'],
          requirementGroupCode: 'income_proof',
        },
      ];

      const blocking = await buildService(types, []).getBlockingDocumentsForApproval('owner-1', 'home');

      expect(blocking).toEqual([
        { code: 'income_proof', label: 'Salary Slip or ITR (Income Tax Return)', reason: 'missing' },
      ]);
    });

    it('reports the non-verified status when a group member is uploaded but not yet verified', async () => {
      const types: MockType[] = [
        {
          code: 'salary_slip',
          label: 'Salary Slip',
          isRequired: true,
          applicableLoanCategoryIds: ['home'],
          requirementGroupCode: 'income_proof',
        },
        {
          code: 'itr',
          label: 'ITR (Income Tax Return)',
          isRequired: true,
          applicableLoanCategoryIds: ['home'],
          requirementGroupCode: 'income_proof',
        },
      ];
      const documents: MockDocument[] = [{ documentTypeCode: 'salary_slip', verificationStatus: 'rejected' }];

      const blocking = await buildService(types, documents).getBlockingDocumentsForApproval(
        'owner-1',
        'home',
      );

      expect(blocking).toEqual([
        { code: 'income_proof', label: 'Salary Slip or ITR (Income Tax Return)', reason: 'rejected' },
      ]);
    });

    it('treats a group with only one relevant member as a plain hard requirement', async () => {
      const types: MockType[] = [
        {
          code: 'itr',
          label: 'ITR (Income Tax Return)',
          isRequired: true,
          applicableLoanCategoryIds: ['business'],
          requirementGroupCode: 'income_proof',
        },
      ];

      const blockingMissing = await buildService(types, []).getBlockingDocumentsForApproval(
        'owner-1',
        'business',
      );
      expect(blockingMissing).toEqual([{ code: 'income_proof', label: 'ITR (Income Tax Return)', reason: 'missing' }]);

      const blockingVerified = await buildService(types, [
        { documentTypeCode: 'itr', verificationStatus: 'verified' },
      ]).getBlockingDocumentsForApproval('owner-1', 'business');
      expect(blockingVerified).toEqual([]);
    });
  });
});

/**
 * Document Versioning — every uploaded document becomes an immutable
 * version row; `DocumentEntity` mirrors whichever version is current.
 * `dataSource.transaction`'s callback is actually invoked against an
 * in-memory mock `EntityManager` here (unlike the loan-applications
 * gate-test convention of treating the transactional body as
 * out-of-scope) because the versioning logic itself — what gets
 * created/updated inside the transaction — is exactly what's under
 * test.
 */
describe('DocumentsService — Document Versioning', () => {
  /** Minimal in-memory stand-in for a TypeORM transactional EntityManager, routing by entity class reference. */
  function createMockManager() {
    const documents = new Map<string, Record<string, unknown>>();
    const versions = new Map<string, Record<string, unknown>>();
    const auditLogs: Record<string, unknown>[] = [];
    let counter = 0;
    const nextId = (prefix: string) => `${prefix}-${++counter}`;

    const storeFor = (EntityClass: unknown) => {
      if (EntityClass === DocumentEntity) return documents;
      if (EntityClass === DocumentVersionEntity) return versions;
      return null;
    };

    const manager = {
      query: jest.fn(async (_sql: string, params: unknown[]) => {
        const documentId = params[0];
        const count = Array.from(versions.values()).filter((v) => v.documentId === documentId).length;
        return [{ next: count + 1 }];
      }),
      create: jest.fn((_EntityClass: unknown, data: Record<string, unknown>) => ({ ...data })),
      save: jest.fn(async (entity: Record<string, unknown>) => {
        if ('action' in entity) {
          auditLogs.push(entity);
          return entity;
        }
        if ('versionNumber' in entity) {
          const id = (entity.id as string | undefined) ?? nextId('version');
          const saved = { ...entity, id };
          versions.set(id, saved);
          return saved;
        }
        const id = (entity.id as string | undefined) ?? nextId('doc');
        const saved = { ...entity, id };
        documents.set(id, saved);
        return saved;
      }),
      update: jest.fn(async (EntityClass: unknown, id: string, patch: Record<string, unknown>) => {
        const store = storeFor(EntityClass);
        if (!store) return;
        store.set(id, { ...(store.get(id) ?? {}), id, ...patch });
      }),
      findOne: jest.fn(async (EntityClass: unknown, options: { where: { id: string } }) => {
        const store = storeFor(EntityClass);
        return store?.get(options.where.id) ?? null;
      }),
      find: jest.fn(async (EntityClass: unknown, options: { where: Record<string, unknown> }) => {
        const store = storeFor(EntityClass);
        if (!store) return [];
        const [[key, value]] = Object.entries(options.where);
        return Array.from(store.values()).filter((row) => row[key] === value);
      }),
    };

    return { manager, documents, versions, auditLogs };
  }

  function buildService(overrides: {
    existingAtSlot?: Record<string, unknown> | null;
    findAllByDocument?: jest.Mock;
  }) {
    const { manager, documents, versions, auditLogs } = createMockManager();

    const type = { code: 'pan_card', label: 'PAN Card', isActive: true, maxUploads: 1 };
    const documentTypeRepository = {
      findByCode: jest.fn().mockResolvedValue(type),
    } as unknown as DocumentTypeRepository;

    const findByOwnerTypeAndSlot = jest.fn().mockResolvedValue(overrides.existingAtSlot ?? null);
    const findOneWithVerifier = jest.fn().mockImplementation(async (id: string) => documents.get(id) ?? null);
    const findOneById = jest.fn().mockImplementation(async (id: string) => documents.get(id) ?? null);
    const deleteById = jest.fn().mockResolvedValue(undefined);
    const documentRepository = {
      findByOwnerTypeAndSlot,
      findAllByOwner: jest.fn().mockResolvedValue([]),
      findOneWithVerifier,
      findOneById,
      deleteById,
    } as unknown as DocumentRepository;

    const findAllByDocument = overrides.findAllByDocument ?? jest.fn().mockResolvedValue([]);
    const documentVersionRepository = { findAllByDocument } as unknown as DocumentVersionRepository;

    const save = jest.fn().mockResolvedValue({ storagePath: 'documents/owner-1/new-file.pdf' });
    const storageDelete = jest.fn().mockResolvedValue(undefined);
    const storageService = { save, delete: storageDelete } as unknown as StorageService;

    const resolveQueriesForCustomer = jest.fn().mockResolvedValue(undefined);
    const notifyAssignedEmployeesOfDocumentResubmission = jest.fn().mockResolvedValue(undefined);
    const setWaitingForCustomer = jest.fn().mockResolvedValue(undefined);
    const loanApplicationsService = {
      resolveQueriesForCustomer,
      notifyAssignedEmployeesOfDocumentResubmission,
      setWaitingForCustomer,
    } as unknown as LoanApplicationsService;

    const createForUser = jest.fn().mockResolvedValue(undefined);
    const notificationsService = { createForUser } as unknown as NotificationsService;

    const transaction = jest.fn().mockImplementation((cb: (m: typeof manager) => unknown) => cb(manager));
    const dataSource = { transaction } as unknown as DataSource;

    const service = new DocumentsService(
      documentRepository,
      documentTypeRepository,
      documentVersionRepository,
      storageService,
      loanApplicationsService,
      notificationsService,
      {} as Repository<AuditLogEntity>,
      dataSource,
    );

    return {
      service,
      documents,
      versions,
      auditLogs,
      storageDelete,
      storageSave: save,
      deleteById,
      findAllByDocument,
    };
  }

  const owner = { id: 'owner-1' } as never;
  const file = { buffer: Buffer.from('x'), originalname: 'new.pdf', mimetype: 'application/pdf', size: 123 };

  describe('upload — replacing an occupied slot', () => {
    function buildExisting(overrides: Record<string, unknown> = {}) {
      return {
        id: 'doc-1',
        ownerId: 'owner-1',
        documentTypeCode: 'pan_card',
        slotIndex: 1,
        storagePath: 'documents/owner-1/old-file.pdf',
        verificationStatus: 'pending',
        verificationNote: null,
        verifiedById: null,
        verifiedAt: null,
        currentVersionId: 'version-old',
        ...overrides,
      };
    }

    function seedExistingVersion(versions: Map<string, Record<string, unknown>>): void {
      versions.set('version-old', { id: 'version-old', documentId: 'doc-1', versionNumber: 1 });
    }

    it('never deletes the old storage file', async () => {
      const harness = buildService({ existingAtSlot: buildExisting() });
      seedExistingVersion(harness.versions);

      await harness.service.upload(owner, { documentTypeCode: 'pan_card', slotIndex: 1 } as never, file);

      expect(harness.storageDelete).not.toHaveBeenCalled();
    });

    it('creates a new immutable version and marks the previous one superseded', async () => {
      const harness = buildService({ existingAtSlot: buildExisting() });
      seedExistingVersion(harness.versions);

      await harness.service.upload(owner, { documentTypeCode: 'pan_card', slotIndex: 1 } as never, file);

      const newVersion = Array.from(harness.versions.values()).find((v) => v.id !== 'version-old');
      expect(newVersion).toMatchObject({ documentId: 'doc-1', versionNumber: 2, verificationStatus: 'pending' });
      expect(harness.versions.get('version-old')).toMatchObject({ supersededAt: expect.any(Date) });
    });

    it('repoints currentVersionId at the new version', async () => {
      const harness = buildService({ existingAtSlot: buildExisting() });
      seedExistingVersion(harness.versions);

      await harness.service.upload(owner, { documentTypeCode: 'pan_card', slotIndex: 1 } as never, file);

      const document = harness.documents.get('doc-1');
      const newVersion = Array.from(harness.versions.values()).find((v) => v.id !== 'version-old');
      expect(document?.currentVersionId).toBe(newVersion?.id);
    });
  });

  describe('upload — a brand-new slot', () => {
    it('creates exactly one version and points currentVersionId at it', async () => {
      const { service, documents, versions } = buildService({ existingAtSlot: null });

      await service.upload(owner, { documentTypeCode: 'pan_card', slotIndex: 1 } as never, file);

      expect(versions.size).toBe(1);
      const [version] = Array.from(versions.values());
      expect(version).toMatchObject({ versionNumber: 1, verificationStatus: 'pending' });
      const [document] = Array.from(documents.values());
      expect(document.currentVersionId).toBe(version.id);
    });
  });

  describe('updateVerification', () => {
    it('updates both the document row and its current version', async () => {
      const { service, documents, versions } = buildService({});
      documents.set('doc-1', {
        id: 'doc-1',
        ownerId: 'owner-1',
        documentTypeCode: 'pan_card',
        currentVersionId: 'version-1',
        label: null,
      });
      versions.set('version-1', { id: 'version-1', documentId: 'doc-1', versionNumber: 1 });

      await service.updateVerification('doc-1', { id: 'staff-1' } as never, {
        status: 'verified',
        note: 'Looks good',
      } as never);

      expect(documents.get('doc-1')).toMatchObject({ verificationStatus: 'verified', verifiedById: 'staff-1' });
      expect(versions.get('version-1')).toMatchObject({ verificationStatus: 'verified', verifiedById: 'staff-1' });
    });
  });

  describe('getVersionsForOwner', () => {
    it("returns the owner's own version history, omitting staff identity fields", async () => {
      const findAllByDocument = jest.fn().mockResolvedValue([
        {
          id: 'version-1',
          versionNumber: 1,
          originalFileName: 'pan.pdf',
          uploadedAt: new Date('2026-01-01'),
          uploadedById: 'staff-1',
          uploadedBy: { fullName: 'Staff Member' },
          verificationStatus: 'verified',
          verifiedById: 'staff-1',
          verifiedBy: { fullName: 'Staff Member' },
          verifiedAt: new Date('2026-01-02'),
          supersededAt: null,
        },
      ]);
      const { service, documents } = buildService({ findAllByDocument });
      documents.set('doc-1', { id: 'doc-1', ownerId: 'owner-1' });

      const result = await service.getVersionsForOwner('doc-1', { id: 'owner-1' } as never);

      expect(findAllByDocument).toHaveBeenCalledWith('doc-1');
      expect(result).toEqual([
        {
          id: 'version-1',
          versionNumber: 1,
          originalFileName: 'pan.pdf',
          mimeType: null,
          fileSizeBytes: null,
          uploadedAt: new Date('2026-01-01'),
          verificationStatus: 'verified',
          verificationNote: null,
          verifiedAt: new Date('2026-01-02'),
          supersededAt: null,
        },
      ]);
      expect(result[0]).not.toHaveProperty('uploadedByName');
      expect(result[0]).not.toHaveProperty('verifiedByName');
    });

    it("rejects a document that doesn't belong to the caller", async () => {
      const { service, documents } = buildService({});
      documents.set('doc-1', { id: 'doc-1', ownerId: 'someone-else' });

      await expect(
        service.getVersionsForOwner('doc-1', { id: 'owner-1' } as never),
      ).rejects.toThrow('You do not have access to this document.');
    });
  });

  describe('delete', () => {
    it('deletes every version storage file, not just the current one', async () => {
      const findAllByDocument = jest.fn().mockResolvedValue([
        { storagePath: 'documents/owner-1/v1.pdf' },
        { storagePath: 'documents/owner-1/v2.pdf' },
      ]);
      const { service, documents, storageDelete, deleteById } = buildService({ findAllByDocument });
      documents.set('doc-1', {
        id: 'doc-1',
        ownerId: 'owner-1',
        storagePath: 'documents/owner-1/current.pdf',
      });

      await service.delete(owner, 'doc-1');

      expect(storageDelete).toHaveBeenCalledWith('documents/owner-1/v1.pdf');
      expect(storageDelete).toHaveBeenCalledWith('documents/owner-1/v2.pdf');
      expect(storageDelete).toHaveBeenCalledTimes(2);
      expect(deleteById).toHaveBeenCalledWith('doc-1');
    });
  });
});
