import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { DocumentCategory } from '../../database/entities';

/**
 * Admin-only: adds a new row to the document catalog. This — not a
 * Flutter release or a migration — is how a new document type reaches
 * customers going forward.
 */
export class CreateDocumentTypeDto {
  /** Stable identifier, e.g. `form_16`. Lowercase snake_case by convention. */
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'code must be lowercase snake_case (e.g. form_16).',
  })
  code!: string;

  @IsString()
  @MaxLength(128)
  label!: string;

  @IsEnum(DocumentCategory)
  category!: DocumentCategory;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxUploads?: number;

  /** Loan category ids this type applies to; omit/null for "general". */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Type(() => String)
  applicableLoanCategoryIds?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
