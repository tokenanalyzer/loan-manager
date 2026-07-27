import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { DocumentEntity } from './document.entity';
import type { UserEntity } from './user.entity';

/**
 * DocumentVersionEntity — one immutable row per uploaded file
 * (Document Versioning). Never deleted or overwritten on a re-upload
 * — replacing a document creates a *new* version row and points
 * `DocumentEntity.currentVersionId` at it; the old row (and its
 * storage file) stays exactly as it was. Only exception:
 * `DocumentsService.delete()` (a customer explicitly removing a
 * document type from their application, a different intent from
 * "replace with a newer file") deletes every version's storage file
 * and cascades the row deletion via the FK below.
 *
 * `verificationStatus`/etc. are this specific version's own review
 * outcome — frozen once `supersededAt` is set, since a superseded
 * version is never re-reviewed. `DocumentEntity` mirrors whichever
 * version is current for read-path backward compatibility (every
 * existing consumer — the approval gate, the overview screen, the
 * Document Management Center — keeps reading `DocumentEntity`'s own
 * columns unchanged); this table is the actual source of truth and
 * what future Version History/Rollback/Comparison/OCR-reprocessing
 * features query.
 */
@Entity('document_versions')
@Unique('uq_document_versions_document_version', ['documentId', 'versionNumber'])
export class DocumentVersionEntity extends AbstractEntity {
  @Index('idx_document_versions_document')
  @Column({ type: 'uuid' })
  documentId!: string;

  @ManyToOne('DocumentEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id', foreignKeyConstraintName: 'fk_document_versions_document' })
  document!: DocumentEntity;

  /** 1-based, per `documentId`. Computed as `COALESCE(MAX(version_number), 0) + 1` inside the same transaction as the insert — not a business-critical unique-forever identifier like Case Number, so the unique constraint above is the collision backstop rather than an atomic counter. */
  @Column({ type: 'int' })
  versionNumber!: number;

  @Column({ type: 'varchar', length: 512 })
  storagePath!: string;

  @Column({ type: 'varchar', length: 255 })
  originalFileName!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  mimeType?: string | null;

  @Column({ type: 'bigint', nullable: true })
  fileSizeBytes?: string | null;

  @Column({ type: 'timestamptz', default: () => 'now()' })
  uploadedAt!: Date;

  /** Not tracked on `DocumentEntity` today (uploader always equals owner for the customer flow) — captured here now so a future staff-assisted-upload or file-level Audit Trail feature doesn't need another migration. */
  @Column({ type: 'uuid', nullable: true })
  uploadedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by_id', foreignKeyConstraintName: 'fk_document_versions_uploaded_by' })
  uploadedBy?: UserEntity | null;

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  verificationStatus!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';

  @Column({ type: 'text', nullable: true })
  verificationNote?: string | null;

  @Column({ type: 'uuid', nullable: true })
  verifiedById?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'verified_by_id', foreignKeyConstraintName: 'fk_document_versions_verified_by' })
  verifiedBy?: UserEntity | null;

  @Column({ type: 'timestamptz', nullable: true })
  verifiedAt?: Date | null;

  /** Set the moment a newer version becomes current. Null = this version is (or, for a backfilled row, was) never superseded. */
  @Column({ type: 'timestamptz', nullable: true })
  supersededAt?: Date | null;
}
