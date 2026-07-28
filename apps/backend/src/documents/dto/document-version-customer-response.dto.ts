/**
 * Customer-facing mirror of `DocumentVersionResponseDto` — same
 * immutable-upload-history data, minus internal staff identity
 * (`uploadedByName`/`verifiedByName`). Customers see what happened to
 * their document and when, never which staff member acted, matching
 * every other customer-facing surface in this app.
 */
export class DocumentVersionCustomerResponseDto {
  id!: string;
  versionNumber!: number;
  originalFileName!: string;
  mimeType!: string | null;
  fileSizeBytes!: string | null;
  uploadedAt!: Date;
  verificationStatus!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
  verificationNote!: string | null;
  verifiedAt!: Date | null;
  /** Null = this is the current version (or was never superseded, e.g. a backfilled row). */
  supersededAt!: Date | null;

  static fromEntity(entity: {
    id: string;
    versionNumber: number;
    originalFileName: string;
    mimeType?: string | null;
    fileSizeBytes?: string | null;
    uploadedAt: Date;
    verificationStatus?: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
    verificationNote?: string | null;
    verifiedAt?: Date | null;
    supersededAt?: Date | null;
  }): DocumentVersionCustomerResponseDto {
    const dto = new DocumentVersionCustomerResponseDto();
    dto.id = entity.id;
    dto.versionNumber = entity.versionNumber;
    dto.originalFileName = entity.originalFileName;
    dto.mimeType = entity.mimeType ?? null;
    dto.fileSizeBytes = entity.fileSizeBytes ?? null;
    dto.uploadedAt = entity.uploadedAt;
    dto.verificationStatus = entity.verificationStatus ?? 'pending';
    dto.verificationNote = entity.verificationNote ?? null;
    dto.verifiedAt = entity.verifiedAt ?? null;
    dto.supersededAt = entity.supersededAt ?? null;
    return dto;
  }
}
