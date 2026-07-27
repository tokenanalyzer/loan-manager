import type { DocumentCategory } from '../../database/entities';

/**
 * One row of the Enterprise Document Center's platform-wide listing —
 * every field the List/Grid/Folder views and the row actions need,
 * including which customer the document belongs to (the one field
 * Customer 360's per-customer document view never needed, since the
 * customer was already implied by the page you were on).
 */
export class DocumentCenterEntryDto {
  id!: string;
  originalFileName!: string;
  mimeType!: string | null;
  category!: DocumentCategory | null;
  typeLabel!: string | null;
  uploadedAt!: Date;
  fileSizeBytes!: string | null;
  verificationStatus!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
  verifiedByName!: string | null;
  verifiedAt!: Date | null;
  currentVersionNumber!: number | null;
  uploadedByName!: string | null;
  ownerId!: string;
  ownerName!: string | null;

  static fromEntity(entity: {
    id: string;
    originalFileName: string;
    mimeType?: string | null;
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
    ownerId: string;
    owner?: { fullName?: string | null } | null;
  }): DocumentCenterEntryDto {
    const dto = new DocumentCenterEntryDto();
    dto.id = entity.id;
    dto.originalFileName = entity.originalFileName;
    dto.mimeType = entity.mimeType ?? null;
    dto.category = entity.documentTypeRef?.category ?? null;
    dto.typeLabel = entity.documentTypeRef?.label ?? null;
    dto.uploadedAt = entity.uploadedAt;
    dto.fileSizeBytes = entity.fileSizeBytes ?? null;
    dto.verificationStatus = entity.verificationStatus ?? 'pending';
    dto.verifiedByName = entity.verifiedBy?.fullName ?? null;
    dto.verifiedAt = entity.verifiedAt ?? null;
    dto.currentVersionNumber = entity.currentVersion?.versionNumber ?? null;
    dto.uploadedByName = entity.currentVersion?.uploadedBy?.fullName ?? null;
    dto.ownerId = entity.ownerId;
    dto.ownerName = entity.owner?.fullName ?? null;
    return dto;
  }
}
