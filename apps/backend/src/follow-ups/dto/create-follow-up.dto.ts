import { IsDateString, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Logs a new follow-up against a lead — `POST /v1/follow-ups`. */
export class CreateFollowUpDto {
  @IsUUID()
  loanApplicationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  note!: string;

  @IsDateString()
  dueAt!: string;
}
