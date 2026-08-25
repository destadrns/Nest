import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { FamilyRole } from '@prisma/client';
import { AccountService } from './account.service';
import { CreateAccountDto, UpdateAccountDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Accounts')
@Controller('families/:familyId/accounts')
@UseGuards(AuthGuard, RolesGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Create account' })
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateAccountDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const account = await this.accountService.create(
      familyId,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: account };
  }

  @Get()
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List accounts' })
  async findAll(@Param('familyId') familyId: string) {
    const accounts = await this.accountService.findAllByFamily(familyId);
    return { data: accounts };
  }

  @Get(':id')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Get account' })
  async findOne(@Param('familyId') familyId: string, @Param('id') id: string) {
    const account = await this.accountService.findById(familyId, id);
    return { data: account };
  }

  @Patch(':id')
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Update account' })
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const account = await this.accountService.update(
      familyId,
      id,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: account };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete account' })
  async delete(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    await this.accountService.softDelete(familyId, id, userId, req.ip, req.headers['user-agent']);
  }
}
