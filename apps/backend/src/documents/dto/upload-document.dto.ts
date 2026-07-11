import { IsIn } from 'class-validator';

import { CUSTOMER_UPLOADABLE_DOCUMENT_TYPES } from '../documents.constants';
import { DocumentType } from '../../database/entities';

export class UploadDocumentDto {
  @IsIn(CUSTOMER_UPLOADABLE_DOCUMENT_TYPES)
  documentType!: DocumentType;
}
