import { IsString, MaxLength, MinLength } from 'class-validator';

/** Registers/refreshes the caller's FCM device token — `POST /v1/auth/me/device-token`. */
export class UpdateDeviceTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  token!: string;
}
