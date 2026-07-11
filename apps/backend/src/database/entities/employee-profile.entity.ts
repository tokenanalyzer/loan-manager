import { Column, Entity, JoinColumn, OneToOne, Unique } from 'typeorm';

import { AbstractEntity } from './abstract.entity';
import type { UserEntity } from './user.entity';

/**
 * EmployeeProfileEntity — employee-specific fields, kept separate from
 * UserEntity for the same reason as CustomerProfileEntity.
 *
 * Phase 3 scope: structural fields only — no role/permission
 * enforcement logic (see UserEntity.role for the coarse-grained field).
 */
@Entity('employee_profiles')
@Unique('uq_employee_profiles_user_id', ['userId'])
@Unique('uq_employee_profiles_employee_code', ['employeeCode'])
export class EmployeeProfileEntity extends AbstractEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @OneToOne('UserEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'fk_employee_profiles_user' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 64 })
  employeeCode!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  department?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  branch?: string | null;

  @Column({ type: 'date', nullable: true })
  hireDate?: string | null;
}
