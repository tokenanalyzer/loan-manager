export class DocumentResponseDto {
  id!: string;
  documentTypeCode!: string;
  slotIndex!: number;
  label!: string | null;
  originalFileName!: string;
  mimeType!: string | null;
  fileSizeBytes!: string | null;
  uploadedAt!: Date;

  static fromEntity(entity: {
    id: string;
    documentTypeCode: string;
    slotIndex: number;
    label?: string | null;
    originalFileName: string;
    mimeType?: string | null;
    fileSizeBytes?: string | null;
    uploadedAt: Date;
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
    return dto;
  }
}
