/** Why a required document type is blocking loan approval. */
export type BlockingDocumentReason = 'missing' | 'pending' | 'rejected' | 'reupload_requested';

/** One required document type standing in the way of approval — surfaced to staff so they know exactly what to fix. */
export class BlockingRequiredDocumentDto {
  code!: string;
  label!: string;
  reason!: BlockingDocumentReason;
}
