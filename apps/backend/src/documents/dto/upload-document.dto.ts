import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UploadDocumentDto {
  /**
   * Validated against the live `document_types` catalog (active codes
   * only) in `DocumentsService.upload`, not a compile-time enum/`@IsIn`
   * — that's what lets a new catalog row become uploadable immediately,
   * with no backend redeploy.
   */
  @IsString()
  @MaxLength(64)
  documentTypeCode!: string;

  /**
   * Which upload slot (1-based) this file fills, for multi-upload
   * types (e.g. Salary Slip 1/2/3). Omit to auto-assign the next free
   * slot up to the type's `maxUploads`; a slot that's already
   * occupied gets replaced (same semantics as the original single-slot
   * "re-upload replaces" behavior).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  slotIndex?: number;
}
