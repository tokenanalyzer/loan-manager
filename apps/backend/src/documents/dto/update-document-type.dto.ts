import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { DocumentCategory } from '../../database/entities';

/**
 * Admin-only: partial update of an existing catalog row — e.g. flip
 * `isActive` off to retire a type, or adjust `maxUploads`/
 * `applicableLoanCategoryIds`. `code` itself is immutable (it's the
 * primary key and appears on historical `documents` rows).
 */
export class UpdateDocumentTypeDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  label?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxUploads?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @Type(() => String)
  applicableLoanCategoryIds?: string[];

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
