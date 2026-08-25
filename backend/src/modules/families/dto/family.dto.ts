import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { FamilyRole } from '@prisma/client';

export class CreateFamilyDto {
  @ApiProperty({ example: 'The Smiths' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'America/New_York' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

export class UpdateFamilyDto {
  @ApiPropertyOptional({ example: 'The Smith Family' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiPropertyOptional({ example: 'Europe/London' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'member@example.com' })
  @IsString()
  email!: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'MEMBER', 'VIEWER'], default: 'MEMBER' })
  @IsOptional()
  @IsEnum(FamilyRole)
  role?: FamilyRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: ['ADMIN', 'MEMBER', 'VIEWER'] })
  @IsEnum(FamilyRole)
  role!: FamilyRole;
}
