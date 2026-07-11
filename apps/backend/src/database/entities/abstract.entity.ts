import { CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * AbstractEntity — shared columns for every table in the schema.
 *
 * UUID primary key, timestamps, and soft-delete support. Named
 * `AbstractEntity` (not `BaseEntity`) to avoid confusion with
 * TypeORM's own deprecated Active Record `BaseEntity` class — this
 * project uses the Data Mapper pattern via `BaseRepository` (see
 * `src/common/repository/base.repository.ts`) instead.
 */
export abstract class AbstractEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;
}
