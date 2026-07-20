import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { DocumentTypeEntity } from './document-type.entity';
import { DocumentType } from './enums';
import type { LoanApplicationEntity } from './loan-application.entity';
import type { LoanEntity } from './loan.entity';
import type { UserEntity } from './user.entity';

/**
 * DocumentEntity — metadata for a file stored in Firebase Storage
 * (identity documents, income proof, signed loan agreements, etc.).
 *
 * Phase 3 scope: schema only — this stores a `storagePath` reference;
 * it does not implement upload/download logic or Firebase Storage
 * SDK usage (that belongs to a later phase alongside real features).
 *
 * Customer App Phase 2: `documentTypeCode`/`slotIndex` (+ the
 * `documentType` FK relation) are the real, catalog-driven type
 * system now — see `DocumentTypeEntity`. The legacy `documentType`
 * enum column below is kept populated for backward compatibility
 * only; nothing reads it going forward.
 */
@Entity('documents')
export class DocumentEntity extends AbstractEntity {
  @Index('idx_documents_owner')
  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id', foreignKeyConstraintName: 'fk_documents_owner' })
  owner!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  loanApplicationId?: string | null;

  @ManyToOne('LoanApplicationEntity', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({
    name: 'loan_application_id',
    foreignKeyConstraintName: 'fk_documents_loan_application',
  })
  loanApplication?: LoanApplicationEntity | null;

  @Column({ type: 'uuid', nullable: true })
  loanId?: string | null;

  @ManyToOne('LoanEntity', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'loan_id', foreignKeyConstraintName: 'fk_documents_loan' })
  loan?: LoanEntity | null;

  /** @deprecated legacy column, kept for backward compatibility only — see class doc comment. */
  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.OTHER })
  documentType!: DocumentType;

  @Column({ type: 'varchar', length: 64 })
  documentTypeCode!: string;

  @ManyToOne('DocumentTypeEntity')
  @JoinColumn({ name: 'document_type_code', foreignKeyConstraintName: 'fk_documents_type' })
  documentTypeRef?: DocumentTypeEntity;

  /** Which upload slot this is for multi-upload types (e.g. Salary Slip 1/2/3). */
  @Column({ type: 'int', default: 1 })
  slotIndex!: number;

  /** Optional customer/service-assigned display label override for this slot. */
  @Column({ type: 'varchar', length: 128, nullable: true })
  label?: string | null;

  @Column({ type: 'varchar', length: 512 })
  storagePath!: string;

  @Column({ type: 'varchar', length: 255 })
  originalFileName!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  mimeType?: string | null;

  /** BIGINT is returned as `string` by node-postgres/TypeORM. */
  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes?: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  uploadedAt!: Date;

  /**
   * Document Management Center — staff verification, independent of
   * the customer-level KYC status. `reupload_requested` is a distinct
   * state from `rejected`: it's the "Request Re-upload" action, always
   * customer-notified, tracked separately so a plain internal `rejected`
   * verdict doesn't silently page the customer too. Replacing a
   * document in this slot resets it back to `pending` — a fresh
   * verification cycle — with the prior verification preserved in
   * audit history, never overwritten (see DocumentsService.upload).
   */
  @Column({ type: 'varchar', length: 32, default: 'pending' })
  verificationStatus!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';

  @Column({ type: 'text', nullable: true })
  verificationNote?: string | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by_id', foreignKeyConstraintName: 'fk_documents_verified_by' })
  verifiedBy?: UserEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;
}
