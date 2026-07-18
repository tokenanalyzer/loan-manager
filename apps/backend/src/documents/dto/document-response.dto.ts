export class DocumentResponseDto {
  id!: string;
  documentTypeCode!: string;
  slotIndex!: number;
  label!: string | null;
  originalFileName!: string;
  mimeType!: string | null;
  fileSizeBytes!: string | null;
  uploadedAt!: Date;
  verificationStatus!: 'pending' | 'verified' | 'rejected';
  verificationNote!: string | null;
  verifiedById!: string | null;
  verifiedByName!: string | null;
  verifiedAt!: Date | null;

  static fromEntity(entity: {
    id: string;
    documentTypeCode: string;
    slotIndex: number;
    label?: string | null;
    originalFileName: string;
    mimeType?: string | null;
    fileSizeBytes?: string | null;
    uploadedAt: Date;
    verificationStatus?: 'pending' | 'verified' | 'rejected';
    verificationNote?: string | null;
    verifiedById?: string | null;
    verifiedBy?: { fullName?: string | null } | null;
    verifiedAt?: Date | null;
  }): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = entity.id;
    dto.documentTypeCode = entity.documentTypeCode;
    dto.slotIndex = entity.slotIndex;
    dto.label = entity.label ?? null;
    dto.originalFileName = entity.originalFileName;
    dto.mimeType = entity.mimeType ?? null;
    dto.fileSizeBytes = entity.fileSizeBytes ?? null;
    dto.uploadedAt = entity.uploadedAt;
    dto.verificationStatus = entity.verificationStatus ?? 'pending';
    dto.verificationNote = entity.verificationNote ?? null;
    dto.verifiedById = entity.verifiedById ?? null;
    dto.verifiedByName = entity.verifiedBy?.fullName ?? null;
    dto.verifiedAt = entity.verifiedAt ?? null;
    return dto;
  }
}
