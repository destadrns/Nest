import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FamilyRole } from '@prisma/client';
import { BudgetService } from './budget.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Budgets')
@Controller('families/:familyId/budgets')
@UseGuards(AuthGuard, RolesGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Create budget' })
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateBudgetDto,
    @CurrentUser('id') userId: string,
  ) {
    const budget = await this.budgetService.create(familyId, dto, userId);
    return { data: budget };
  }

  @Get()
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List budgets with spending progress' })
  async findAll(@Param('familyId') familyId: string) {
    const budgets = await this.budgetService.findAllByFamily(familyId);
    return { data: budgets };
  }

  @Get(':id')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Get budget with spending progress' })
  async findOne(@Param('familyId') familyId: string, @Param('id') id: string) {
    const budget = await this.budgetService.findById(familyId, id);
    return { data: budget };
  }

  @Patch(':id')
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Update budget' })
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @CurrentUser('id') userId: string,
  ) {
    const budget = await this.budgetService.update(familyId, id, dto, userId);
    return { data: budget };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Delete budget' })
  async delete(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.budgetService.delete(familyId, id, userId);
  }
}
