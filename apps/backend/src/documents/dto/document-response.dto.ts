import { DocumentType } from '../../database/entities';

export class DocumentResponseDto {
  id!: string;
  documentType!: DocumentType;
  originalFileName!: string;
  mimeType!: string | null;
  fileSizeBytes!: string | null;
  uploadedAt!: Date;

  static fromEntity(entity: {
    id: string;
    documentType: DocumentType;
    originalFileName: string;
    mimeType?: string | null;
    fileSizeBytes?: string | null;
    uploadedAt: Date;
  }): DocumentResponseDto {
    const dto = new DocumentResponseDto();
    dto.id = entity.id;
    dto.documentType = entity.documentType;
    dto.originalFileName = entity.originalFileName;
    dto.mimeType = entity.mimeType ?? null;
    dto.fileSizeBytes = entity.fileSizeBytes ?? null;
    dto.uploadedAt = entity.uploadedAt;
    return dto;
  }
}
