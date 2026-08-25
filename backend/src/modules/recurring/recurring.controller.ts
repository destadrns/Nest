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
import { RecurringService } from './recurring.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Recurring Transactions')
@Controller('families/:familyId/recurring')
@UseGuards(AuthGuard, RolesGuard)
export class RecurringController {
  constructor(private readonly recurringService: RecurringService) {}

  @Post()
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Create recurring transaction' })
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateRecurringDto,
    @CurrentUser('id') userId: string,
  ) {
    const item = await this.recurringService.create(familyId, dto, userId);
    return { data: item };
  }

  @Get()
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List recurring transactions' })
  async findAll(@Param('familyId') familyId: string) {
    const items = await this.recurringService.findAllByFamily(familyId);
    return { data: items };
  }

  @Get(':id')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Get recurring transaction' })
  async findOne(@Param('familyId') familyId: string, @Param('id') id: string) {
    const item = await this.recurringService.findById(familyId, id);
    return { data: item };
  }

  @Patch(':id')
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Update recurring transaction' })
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
    @CurrentUser('id') userId: string,
  ) {
    const item = await this.recurringService.update(familyId, id, dto, userId);
    return { data: item };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Delete recurring transaction' })
  async delete(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.recurringService.delete(familyId, id, userId);
  }
}
