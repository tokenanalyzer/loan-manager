import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { AccountStatus, UserRole } from '../../database/entities';
import { STAFF_SORT_FIELDS, StaffSortField } from '../user.repository';

/**
 * Query params arrive as strings over HTTP — `@Type(() => Number)` is
 * required here or class-validator rejects them (the same class of
 * bug fixed for the Customer App's document upload `slotIndex`; see
 * `UploadDocumentDto`).
 *
 * Phase 4 additive: `search`/`role`/`status`/`sortBy`/`sortDir` are all
 * optional, defaulting to the exact behavior `GET /v1/users` already
 * had (no filter, newest-first) — an existing caller that omits them
 * sees identical results.
 */
export class ListStaffQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  /** Case-insensitive partial match against name, email, and employee code. */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  /** Restricted to the two roles this listing has ever scoped to (EMPLOYEE/ADMIN) — narrows within that set, never expands it. */
  @IsOptional()
  @IsIn([UserRole.EMPLOYEE, UserRole.ADMIN])
  role?: UserRole.EMPLOYEE | UserRole.ADMIN;

  @IsOptional()
  @IsIn(Object.values(AccountStatus))
  status?: AccountStatus;

  @IsOptional()
  @IsIn(STAFF_SORT_FIELDS)
  sortBy: StaffSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir: 'asc' | 'desc' = 'desc';
}
