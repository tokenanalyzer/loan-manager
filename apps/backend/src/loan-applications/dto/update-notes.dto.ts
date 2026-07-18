import { IsString, MaxLength } from 'class-validator';

/** Employee Workspace — replaces the lead's single evolving internal note. Empty string clears it. */
export class UpdateNotesDto {
  @IsString()
  @MaxLength(10_000)
  notes!: string;
}
