import type { DocumentCategory } from '../../database/entities';
import type { LoanApplicationResponseDto } from '../../loan-applications/dto/loan-application-response.dto';

import { CustomerProfileResponseDto } from './customer-profile-response.dto';

/** One row of Customer 360's Documents section — flattened across every application this customer has, not scoped to one. */
export class CustomerOverviewDocumentDto {
  id!: string;
  originalFileName!: string;
  category!: DocumentCategory | null;
  typeLabel!: string | null;
  uploadedAt!: Date;
  fileSizeBytes!: string | null;
  verificationStatus!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
  verifiedByName!: string | null;
  verifiedAt!: Date | null;
  currentVersionNumber!: number | null;
  uploadedByName!: string | null;

  static fromEntity(entity: {
    id: string;
    originalFileName: string;
    documentTypeRef?: { category?: DocumentCategory; label?: string } | null;
    uploadedAt: Date;
    fileSizeBytes?: string | null;
    verificationStatus?: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
    verifiedBy?: { fullName?: string | null } | null;
    verifiedAt?: Date | null;
    currentVersion?: {
      versionNumber?: number;
      uploadedBy?: { fullName?: string | null } | null;
    } | null;
  }): CustomerOverviewDocumentDto {
    const dto = new CustomerOverviewDocumentDto();
    dto.id = entity.id;
    dto.originalFileName = entity.originalFileName;
    dto.category = entity.documentTypeRef?.category ?? null;
    dto.typeLabel = entity.documentTypeRef?.label ?? null;
    dto.uploadedAt = entity.uploadedAt;
    dto.fileSizeBytes = entity.fileSizeBytes ?? null;
    dto.verificationStatus = entity.verificationStatus ?? 'pending';
    dto.verifiedByName = entity.verifiedBy?.fullName ?? null;
    dto.verifiedAt = entity.verifiedAt ?? null;
    dto.currentVersionNumber = entity.currentVersion?.versionNumber ?? null;
    dto.uploadedByName = entity.currentVersion?.uploadedBy?.fullName ?? null;
    return dto;
  }
}

/**
 * Customer 360 — everything about one customer assembled from
 * already-real data/queries in one round trip: identity (`UserEntity`),
 * full profile (reuses the existing `CustomerProfileResponseDto` as-is),
 * every application (reuses the existing `LoanApplicationResponseDto`
 * as-is — see `LoanApplicationRepository.findAllByApplicantWithRelations`),
 * and a flat document list across all of them. No new response shapes
 * were invented for applications/profile; this DTO only adds the
 * customer identity envelope and the document list.
 */
export class CustomerOverviewResponseDto {
  id!: string;
  fullName!: string | null;
  email!: string | null;
  phone!: string | null;
  photoUrl!: string | null;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
  profile!: CustomerProfileResponseDto | null;
  applications!: LoanApplicationResponseDto[];
  documents!: CustomerOverviewDocumentDto[];
}
