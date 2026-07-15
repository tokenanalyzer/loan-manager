import { DocumentCategory } from '../../database/entities';

import { DocumentResponseDto } from './document-response.dto';

/** One upload slot for a document type (slot 1 of N for multi-upload types). */
export class DocumentSlotDto {
  slotIndex!: number;
  isUploaded!: boolean;
  document?: DocumentResponseDto;
}

/** One document type within a category, with its upload slots. */
export class DocumentTypeOverviewDto {
  code!: string;
  label!: string;
  isRequired!: boolean;
  maxUploads!: number;
  slots!: DocumentSlotDto[];
}

export class DocumentCategoryGroupDto {
  category!: DocumentCategory;
  types!: DocumentTypeOverviewDto[];
}

/**
 * `GET /v1/documents` response shape (Phase 2) — categories, each
 * with its document types, each with its upload slots. Replaces the
 * old flat `{required, documents}` shape; built entirely from the
 * `document_types` catalog cross-referenced with the customer's own
 * uploads, so a new catalog row (a future Admin Panel addition) shows
 * up here automatically with no API contract change.
 */
export class DocumentsOverviewResponseDto {
  categories!: DocumentCategoryGroupDto[];
}
