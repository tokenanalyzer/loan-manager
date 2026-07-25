import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';

import { UserRole } from '../../database/entities';

/**
 * CreateStaffUserDto — the only way an employee/admin account comes
 * into existence today (see `AuthService`'s doc comment: a Firebase
 * sign-in alone can only ever create a CUSTOMER). `role` is
 * deliberately restricted to EMPLOYEE/ADMIN here — CUSTOMER accounts
 * are never created through this endpoint.
 */
export class CreateStaffUserDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MaxLength(255)
  fullName!: string;

  @IsEnum([UserRole.EMPLOYEE, UserRole.ADMIN], {
    message: 'role must be either employee or admin',
  })
  role!: UserRole.EMPLOYEE | UserRole.ADMIN;

  /** Required for EMPLOYEE (matches EmployeeProfileEntity's own NOT NULL); irrelevant for ADMIN, which has no EmployeeProfileEntity row. */
  @ValidateIf((dto: CreateStaffUserDto) => dto.role === UserRole.EMPLOYEE)
  @IsString()
  @MaxLength(64)
  employeeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  branch?: string;
}
