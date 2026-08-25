import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsInt,
  Min,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionType } from '@prisma/client';

export class CsvTransactionRowDto {
  @ApiProperty({ example: '2026-08-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 'Grocery Store' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: 'Amount in cents (positive integer)' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: TransactionType })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ImportTransactionsDto {
  @ApiProperty({ description: 'Target account ID' })
  @IsString()
  @IsNotEmpty()
  accountId!: string;

  @ApiProperty({ type: [CsvTransactionRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvTransactionRowDto)
  transactions!: CsvTransactionRowDto[];
}
