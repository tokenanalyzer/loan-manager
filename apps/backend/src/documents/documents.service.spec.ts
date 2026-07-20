import type { DataSource, Repository } from 'typeorm';

import type { AuditLogEntity, DocumentEntity, DocumentTypeEntity } from '../database/entities';
import type { LoanApplicationsService } from '../loan-applications/loan-applications.service';
import type { NotificationsService } from '../notifications/notifications.service';
import type { StorageService } from '../storage/storage.service';

import type { DocumentTypeRepository } from './document-type.repository';
import type { DocumentRepository } from './document.repository';
import { DocumentsService } from './documents.service';

type MockType = Pick<DocumentTypeEntity, 'code' | 'label' | 'isRequired' | 'applicableLoanCategoryIds'>;
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
      { code: 'gold_valuation', label: 'Gold Valuation Certificate', isRequired: true, applicableLoanCategoryIds: ['gold'] },
    ];

    const forGold = await buildService(types, []).getBlockingDocumentsForApproval('owner-1', 'gold');
    expect(forGold).toEqual([{ code: 'gold_valuation', label: 'Gold Valuation Certificate', reason: 'missing' }]);

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
});
