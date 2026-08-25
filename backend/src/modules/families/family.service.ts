import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateFamilyDto, UpdateFamilyDto, InviteMemberDto, UpdateMemberRoleDto } from './dto';
import { FamilyRole } from '@prisma/client';

@Injectable()
export class FamilyService {
  private readonly logger = new Logger(FamilyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateFamilyDto, userId: string, ipAddress?: string, userAgent?: string) {
    const family = await this.prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: dto.name.trim(),
          currency: dto.currency ?? 'USD',
          timezone: dto.timezone ?? 'UTC',
        },
      });

      // Creator becomes OWNER
      await tx.familyMember.create({
        data: {
          userId,
          familyId: family.id,
          role: FamilyRole.OWNER,
          status: 'ACTIVE',
        },
      });

      return family;
    });

    await this.auditService.log({
      familyId: family.id,
      userId,
      action: 'FAMILY_CREATED',
      resourceType: 'family',
      resourceId: family.id,
      ipAddress,
      userAgent,
    });

    return family;
  }

  async findById(familyId: string) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
    });
    if (!family) throw new NotFoundException('Family not found');
    return family;
  }

  async update(
    familyId: string,
    dto: UpdateFamilyDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const family = await this.prisma.family.update({
      where: { id: familyId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'FAMILY_UPDATED',
      resourceType: 'family',
      resourceId: familyId,
      metadata: dto as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    return family;
  }

  async delete(familyId: string, userId: string, ipAddress?: string, userAgent?: string) {
    // Verify user is OWNER
    const membership = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId, familyId } },
    });

    if (!membership || membership.role !== FamilyRole.OWNER) {
      throw new ForbiddenException('Only the owner can delete a family');
    }

    await this.prisma.family.delete({ where: { id: familyId } });

    await this.auditService.log({
      familyId,
      userId,
      action: 'FAMILY_DELETED',
      resourceType: 'family',
      resourceId: familyId,
      ipAddress,
      userAgent,
    });
  }

  async getMembers(familyId: string) {
    return this.prisma.familyMember.findMany({
      where: { familyId, status: 'ACTIVE' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async inviteMember(
    familyId: string,
    dto: InviteMemberDto,
    invitedByUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const role = dto.role ?? FamilyRole.MEMBER;

    // Cannot invite as OWNER
    if (role === FamilyRole.OWNER) {
      throw new BadRequestException('Cannot invite as owner. Use ownership transfer.');
    }

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new NotFoundException('No user found with this email');
    }

    // Check if already a member
    const existing = await this.prisma.familyMember.findUnique({
      where: { userId_familyId: { userId: user.id, familyId } },
    });

    if (existing && existing.status === 'ACTIVE') {
      throw new ConflictException('User is already a member of this family');
    }

    // Upsert membership
    const member = await this.prisma.familyMember.upsert({
      where: { userId_familyId: { userId: user.id, familyId } },
      update: { role, status: 'ACTIVE', invitedBy: invitedByUserId },
      create: {
        userId: user.id,
        familyId,
        role,
        status: 'ACTIVE',
        invitedBy: invitedByUserId,
      },
    });

    await this.auditService.log({
      familyId,
      userId: invitedByUserId,
      action: 'MEMBER_INVITED',
      resourceType: 'family_member',
      resourceId: member.id,
      metadata: { invitedEmail: dto.email, role },
      ipAddress,
      userAgent,
    });

    return member;
  }

  async updateMemberRole(
    familyId: string,
    memberId: string,
    dto: UpdateMemberRoleDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.role === FamilyRole.OWNER) {
      throw new BadRequestException('Cannot set role to OWNER. Use ownership transfer.');
    }

    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === FamilyRole.OWNER) {
      throw new ForbiddenException("Cannot change the owner's role");
    }

    const updated = await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { role: dto.role },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'MEMBER_ROLE_CHANGED',
      resourceType: 'family_member',
      resourceId: memberId,
      metadata: { oldRole: member.role, newRole: dto.role },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  async removeMember(
    familyId: string,
    memberId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const member = await this.prisma.familyMember.findFirst({
      where: { id: memberId, familyId },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.role === FamilyRole.OWNER) {
      throw new ForbiddenException('Cannot remove the family owner');
    }

    await this.prisma.familyMember.update({
      where: { id: memberId },
      data: { status: 'REMOVED' },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'MEMBER_REMOVED',
      resourceType: 'family_member',
      resourceId: memberId,
      ipAddress,
      userAgent,
    });
  }

  /** Get all families the user belongs to */
  async getUserFamilies(userId: string) {
    const memberships = await this.prisma.familyMember.findMany({
      where: { userId, status: 'ACTIVE' },
      include: { family: true },
    });
    return memberships.map((m) => ({
      ...m.family,
      role: m.role,
    }));
  }
}
