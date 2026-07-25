import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query params arrive as strings over HTTP — `@Type(() => Number)` is
 * required here or class-validator rejects them (the same class of
 * bug fixed for the Customer App's document upload `slotIndex`; see
 * `UploadDocumentDto`).
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
}
