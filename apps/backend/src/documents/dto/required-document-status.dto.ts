import { DocumentType } from '../../database/entities';

import { DocumentResponseDto } from './document-response.dto';

/** One row per required document type, cross-referenced against what's uploaded. */
export class RequiredDocumentStatusDto {
  documentType!: DocumentType;
  label!: string;
  isUploaded!: boolean;
  document?: DocumentResponseDto;
}
