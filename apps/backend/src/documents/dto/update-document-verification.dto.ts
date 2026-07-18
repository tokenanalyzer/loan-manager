import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentVerificationDto {
  @IsIn(['pending', 'verified', 'rejected'])
  status!: 'pending' | 'verified' | 'rejected';

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  note?: string;
}
