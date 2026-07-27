import { IsIn, IsNotEmpty, IsString, MaxLength, ValidateIf } from 'class-validator';

/** A checker's decision on a pending approval request. `decisionNote` is required on reject (the maker deserves a reason their request was denied) and optional on approve. */
export class ApprovalDecisionDto {
  @IsIn(['approve', 'reject'])
  decision!: 'approve' | 'reject';

  @ValidateIf((dto: ApprovalDecisionDto) => dto.decision === 'reject')
  @IsString()
  @IsNotEmpty({ message: 'A reason is required to reject a request.' })
  @MaxLength(500)
  decisionNote?: string;
}
