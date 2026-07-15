import { DocumentCategory } from '../../database/entities';

/** Admin management view of one catalog row — includes `isActive`, unlike the customer-facing overview. */
export class DocumentTypeResponseDto {
  code!: string;
  label!: string;
  category!: DocumentCategory;
  isRequired!: boolean;
  maxUploads!: number;
  applicableLoanCategoryIds!: string[] | null;
  sortOrder!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: {
    code: string;
    label: string;
    category: DocumentCategory;
    isRequired: boolean;
    maxUploads: number;
    applicableLoanCategoryIds?: string[] | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): DocumentTypeResponseDto {
    const dto = new DocumentTypeResponseDto();
    dto.code = entity.code;
    dto.label = entity.label;
    dto.category = entity.category;
    dto.isRequired = entity.isRequired;
    dto.maxUploads = entity.maxUploads;
    dto.applicableLoanCategoryIds = entity.applicableLoanCategoryIds ?? null;
    dto.sortOrder = entity.sortOrder;
    dto.isActive = entity.isActive;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
