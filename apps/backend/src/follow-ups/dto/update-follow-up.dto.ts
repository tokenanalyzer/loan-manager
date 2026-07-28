import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Edits an existing follow-up's note/due date — `PATCH /v1/follow-ups/:id`. Only fields present are touched. */
export class UpdateFollowUpDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;
}
