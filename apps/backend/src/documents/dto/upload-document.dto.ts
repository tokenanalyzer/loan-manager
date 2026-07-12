import { IsIn } from 'class-validator';

import { DocumentType } from '../../database/entities';
import { CUSTOMER_UPLOADABLE_DOCUMENT_TYPES } from '../documents.constants';

export class UploadDocumentDto {
  @IsIn(CUSTOMER_UPLOADABLE_DOCUMENT_TYPES)
  documentType!: DocumentType;
}
