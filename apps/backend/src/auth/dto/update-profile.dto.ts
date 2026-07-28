import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Self-service profile edit — `PATCH /v1/auth/me`. Deliberately just
 * `fullName`/`phone`: `email` is tied to the Firebase identity itself
 * (changing it here wouldn't change what the user signs in with) and
 * `role`/`isActive` are admin-controlled elsewhere (`UsersService`'s
 * lifecycle actions), not self-editable.
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
