import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateDocumentVerificationDto {
  @IsIn(['pending', 'verified', 'rejected', 'reupload_requested'])
  status!: 'pending' | 'verified' | 'rejected' | 'reupload_requested';

  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  note?: string;
}
