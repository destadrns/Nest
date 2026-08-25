import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FamilyRole, GoalStatus } from '@prisma/client';
import { GoalService } from './goal.service';
import { CreateGoalDto, UpdateGoalDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Financial Goals')
@Controller('families/:familyId/goals')
@UseGuards(AuthGuard, RolesGuard)
export class GoalController {
  constructor(private readonly goalService: GoalService) {}

  @Post()
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Create financial goal' })
  async create(
    @Param('familyId') familyId: string,
    @Body() dto: CreateGoalDto,
    @CurrentUser('id') userId: string,
  ) {
    const goal = await this.goalService.create(familyId, dto, userId);
    return { data: goal };
  }

  @Get()
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List financial goals' })
  @ApiQuery({ name: 'status', required: false, enum: GoalStatus })
  async findAll(
    @Param('familyId') familyId: string,
    @Query('status') status?: GoalStatus,
  ) {
    const goals = await this.goalService.findAllByFamily(familyId, status);
    return { data: goals };
  }

  @Get(':id')
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Get financial goal' })
  async findOne(@Param('familyId') familyId: string, @Param('id') id: string) {
    const goal = await this.goalService.findById(familyId, id);
    return { data: goal };
  }

  @Patch(':id')
  @Roles(FamilyRole.MEMBER)
  @ApiOperation({ summary: 'Update financial goal' })
  async update(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @CurrentUser('id') userId: string,
  ) {
    const goal = await this.goalService.update(familyId, id, dto, userId);
    return { data: goal };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Delete financial goal' })
  async delete(
    @Param('familyId') familyId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    await this.goalService.delete(familyId, id, userId);
  }
}
