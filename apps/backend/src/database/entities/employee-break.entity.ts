import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { WorkStatus } from './enums';
import type { UserEntity } from './user.entity';

/** Who/what ended a break — the audit trail's "Break Ended By" + Force Resume distinction. */
export enum BreakEndReason {
  EMPLOYEE_ENDED = 'employee_ended',
  ADMIN_ENDED = 'admin_ended',
  ADMIN_FORCE_RESUMED = 'admin_force_resumed',
}

/**
 * EmployeeBreakEntity — one row per break session; doubles as both
 * the "is this employee currently on break" pointer (`endedAt IS
 * NULL`) and the complete audit history the Break Management spec
 * asks for (break type, start/end time, duration, who ended it).
 * Append-mostly (only `endedAt`/`endReason`/`endedByAdminId`/
 * `durationSeconds` are ever updated, exactly once, to close a row)
 * — mirrors AuditLogEntity/LeadAssignmentEntity's shape (no
 * AbstractEntity, no soft-delete).
 */
@Entity('employee_breaks')
@Index('idx_employee_breaks_employee', ['employeeId'])
export class EmployeeBreakEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  employeeId!: string;

  @ManyToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employee_id', foreignKeyConstraintName: 'fk_employee_breaks_employee' })
  employee!: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  breakType!: WorkStatus;

  @Column({ type: 'timestamptz' })
  startedAt!: Date;

  /** Null while the break is active/open. */
  @Column({ type: 'timestamptz', nullable: true })
  endedAt?: Date | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  endReason?: BreakEndReason | null;

  /** The admin who ended/force-resumed this break — null if the employee ended it themselves. */
  @Column({ type: 'uuid', nullable: true })
  endedByAdminId?: string | null;

  @ManyToOne('UserEntity', { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'ended_by_admin_id',
    foreignKeyConstraintName: 'fk_employee_breaks_ended_by_admin',
  })
  endedByAdmin?: UserEntity | null;

  @Column({ type: 'int', nullable: true })
  durationSeconds?: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
