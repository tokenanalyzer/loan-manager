import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** Shared by Disable and Archive — both require a non-empty, human-readable reason (approved design: mandatory reason for both). Restore does not use this DTO — see UsersController. */
export class StaffLifecycleReasonDto {
  @IsString()
  @IsNotEmpty({ message: 'A reason is required.' })
  @MaxLength(500)
  reason!: string;
}
