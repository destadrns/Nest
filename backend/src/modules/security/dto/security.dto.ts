import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length, IsOptional } from 'class-validator';

export class EnableMfaDto {
  @ApiProperty({ description: '6-digit TOTP token to verify setup' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token!: string;

  @ApiProperty({ description: 'Secret key generated from start-mfa' })
  @IsString()
  @IsNotEmpty()
  secret!: string;
}

export class DisableMfaDto {
  @ApiProperty({ description: 'Current password or valid TOTP token for confirmation' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiPropertyOptional({ description: '6-digit TOTP token if available' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  token?: string;
}

export class VerifyRecoveryCodeDto {
  @ApiProperty({ description: 'Backup recovery code' })
  @IsString()
  @IsNotEmpty()
  code!: string;
}

export class PasskeyRegisterDto {
  @ApiProperty({ description: 'Credential ID from WebAuthn' })
  @IsString()
  @IsNotEmpty()
  credentialId!: string;

  @ApiProperty({ description: 'Public Key base64 string' })
  @IsString()
  @IsNotEmpty()
  publicKey!: string;

  @ApiPropertyOptional({ description: 'Friendly device name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Device type (e.g. platform, cross-platform)' })
  @IsOptional()
  @IsString()
  deviceType?: string;
}
