import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
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
  @JoinColumn({ name: 'loan_application_id', foreignKeyConstraintName: 'fk_documents_loan_application' })
  loanApplication?: LoanApplicationEntity | null;

  @Column({ type: 'uuid', nullable: true })
  loanId?: string | null;

  @ManyToOne('LoanEntity', { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'loan_id', foreignKeyConstraintName: 'fk_documents_loan' })
  loan?: LoanEntity | null;

  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.OTHER })
  documentType!: DocumentType;

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
}
