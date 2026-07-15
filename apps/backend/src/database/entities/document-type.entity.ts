import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

import { DocumentCategory } from './enums';

/**
 * DocumentTypeEntity — the document catalog. Not `AbstractEntity`
 * (no UUID id, no soft-delete): this is reference/configuration data
 * keyed by a human-readable `code`, not a transactional record.
 *
 * This table *is* the extensibility mechanism the sprint required:
 * adding a new document type (or changing which loan category needs
 * it, whether it's required, or how many slots it allows) is a row
 * insert/update here — never a migration, never a Flutter release.
 * A future Admin Panel manages this table directly through
 * `DocumentTypesController` (see `documents/document-types.controller.ts`);
 * `DocumentsService` (the customer-facing upload/list/delete flow)
 * only ever reads it.
 */
@Entity('document_types')
export class DocumentTypeEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 128 })
  label!: string;

  @Column({ type: 'enum', enum: DocumentCategory })
  category!: DocumentCategory;

  @Column({ type: 'boolean', default: false })
  isRequired!: boolean;

  /** How many documents of this type one customer may have on file at once. */
  @Column({ type: 'int', default: 1 })
  maxUploads!: number;

  /**
   * Which loan category ids (matching the Customer App's
   * `kLoanCategories`/the backend's `LOAN_CATEGORY_BOUNDS` keys, e.g.
   * `home`, `vehicle`) this type is relevant to. `null` means
   * "general" — always shown, not tied to a specific loan product.
   */
  @Column({ type: 'text', array: true, nullable: true })
  applicableLoanCategoryIds?: string[] | null;

  /** Display ordering within its category. */
  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  /** Soft-disable a type (hide from customers) without deleting history. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
