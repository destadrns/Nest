import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { FamilyRole } from '@prisma/client';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionQueryDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentFamilyMember } from '../../common/decorators/family-member.decorator';

@ApiTags('Transactions')
@Controller('families/:familyId/transactions')
@UseGuards(AuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Create transaction' })
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateTransactionDto,
    @CurrentUser('id') userId: string,
    @CurrentFamilyMember('role') role: FamilyRole,
    @Req() req: Request,
  ) {
    const transaction = await this.transactionService.create(
      familyId,
      dto,
      userId,
      role,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: transaction };
  }

  @Get()
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List transactions (paginated)' })
  async findAll(@Param('familyId') familyId: string, @Query() query: TransactionQueryDto) {
    return this.transactionService.findAll(familyId, query);
  }

  @Get(':id')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Get transaction' })
  async findOne(@Param('familyId') familyId: string, @Param('id') id: string) {
    const transaction = await this.transactionService.findById(familyId, id);
    return { data: transaction };
  }

  @Patch(':id')
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Update transaction' })
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
    @CurrentUser('id') userId: string,
    @CurrentFamilyMember('role') role: FamilyRole,
    @Req() req: Request,
  ) {
    const transaction = await this.transactionService.update(
      familyId,
      id,
      dto,
      userId,
      role,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: transaction };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete transaction' })
  async delete(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentFamilyMember('role') role: FamilyRole,
    @Req() req: Request,
  ) {
    await this.transactionService.softDelete(
      familyId,
      id,
      userId,
      role,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
