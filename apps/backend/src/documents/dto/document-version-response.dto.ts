/** One entry in a document's immutable upload history. See `DocumentVersionEntity`. */
export class DocumentVersionResponseDto {
  id!: string;
  versionNumber!: number;
  originalFileName!: string;
  mimeType!: string | null;
  fileSizeBytes!: string | null;
  uploadedAt!: Date;
  uploadedById!: string | null;
  uploadedByName!: string | null;
  verificationStatus!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
  verificationNote!: string | null;
  verifiedById!: string | null;
  verifiedByName!: string | null;
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
    uploadedById?: string | null;
    uploadedBy?: { fullName?: string | null } | null;
    verificationStatus?: 'pending' | 'verified' | 'rejected' | 'reupload_requested';
    verificationNote?: string | null;
    verifiedById?: string | null;
    verifiedBy?: { fullName?: string | null } | null;
    verifiedAt?: Date | null;
    supersededAt?: Date | null;
  }): DocumentVersionResponseDto {
    const dto = new DocumentVersionResponseDto();
    dto.id = entity.id;
    dto.versionNumber = entity.versionNumber;
    dto.originalFileName = entity.originalFileName;
    dto.mimeType = entity.mimeType ?? null;
    dto.fileSizeBytes = entity.fileSizeBytes ?? null;
    dto.uploadedAt = entity.uploadedAt;
    dto.uploadedById = entity.uploadedById ?? null;
    dto.uploadedByName = entity.uploadedBy?.fullName ?? null;
    dto.verificationStatus = entity.verificationStatus ?? 'pending';
    dto.verificationNote = entity.verificationNote ?? null;
    dto.verifiedById = entity.verifiedById ?? null;
    dto.verifiedByName = entity.verifiedBy?.fullName ?? null;
    dto.verifiedAt = entity.verifiedAt ?? null;
    dto.supersededAt = entity.supersededAt ?? null;
    return dto;
  }
}
