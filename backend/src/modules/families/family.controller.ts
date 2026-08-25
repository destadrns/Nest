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
import { FamilyService } from './family.service';
import { CreateFamilyDto, UpdateFamilyDto, InviteMemberDto, UpdateMemberRoleDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FamilyParam } from '../../common/decorators/family-param.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Families')
@Controller('families')
@UseGuards(AuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new family' })
  async create(
    @Body() dto: CreateFamilyDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const family = await this.familyService.create(
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: family };
  }

  @Get()
  @ApiOperation({ summary: 'List families the current user belongs to' })
  async listMyFamilies(@CurrentUser('id') userId: string) {
    const families = await this.familyService.getUserFamilies(userId);
    return { data: families };
  }

  @Get(':familyId')
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'Get family details' })
  async findOne(@Param('familyId') familyId: string) {
    const family = await this.familyService.findById(familyId);
    return { data: family };
  }

  @Patch(':familyId')
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Update family' })
  async update(
    @Param('familyId') familyId: string,
    @Body() dto: UpdateFamilyDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const family = await this.familyService.update(
      familyId,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: family };
  }

  @Delete(':familyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.OWNER)
  @FamilyParam('familyId')
  @ApiOperation({ summary: 'Delete family (owner only)' })
  async delete(
    @Param('familyId') familyId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    await this.familyService.delete(familyId, userId, req.ip, req.headers['user-agent']);
  }

  @Get(':familyId/members')
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.VIEWER)
  @ApiOperation({ summary: 'List family members' })
  async getMembers(@Param('familyId') familyId: string) {
    const members = await this.familyService.getMembers(familyId);
    return { data: members };
  }

  @Post(':familyId/members/invite')
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Invite a member' })
  async inviteMember(
    @Param('familyId') familyId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const member = await this.familyService.inviteMember(
      familyId,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: member };
  }

  @Patch(':familyId/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Update member role' })
  async updateMemberRole(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    const member = await this.familyService.updateMemberRole(
      familyId,
      memberId,
      dto,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
    return { data: member };
  }

  @Delete(':familyId/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(FamilyRole.ADMIN)
  @ApiOperation({ summary: 'Remove a member' })
  async removeMember(
    @Param('familyId') familyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('id') userId: string,
    @Req() req: Request,
  ) {
    await this.familyService.removeMember(
      familyId,
      memberId,
      userId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
