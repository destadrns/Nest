import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateGoalDto, UpdateGoalDto } from './dto';
import { GoalStatus } from '@prisma/client';

@Injectable()
export class GoalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(familyId: string, dto: CreateGoalDto, userId: string) {
    const goal = await this.prisma.financialGoal.create({
      data: {
        familyId,
        name: dto.name.trim(),
        description: dto.description?.trim() ?? null,
        targetAmount: BigInt(dto.targetAmount),
        currentAmount: BigInt(dto.currentAmount ?? 0),
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        createdBy: userId,
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'GOAL_CREATED',
      resourceType: 'financial_goal',
      resourceId: goal.id,
    });

    return this.serialize(goal);
  }

  async findAllByFamily(familyId: string, status?: GoalStatus) {
    const goals = await this.prisma.financialGoal.findMany({
      where: {
        familyId,
        ...(status && { status }),
      },
      orderBy: { createdAt: 'desc' },
    });

    return goals.map((g) => this.serialize(g));
  }

  async findById(familyId: string, goalId: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, familyId },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    return this.serialize(goal);
  }

  async update(familyId: string, goalId: string, dto: UpdateGoalDto, userId: string) {
    const existing = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, familyId },
    });
    if (!existing) throw new NotFoundException('Goal not found');

    const newCurrentAmount = dto.currentAmount !== undefined
      ? BigInt(dto.currentAmount)
      : existing.currentAmount;
    const newTargetAmount = dto.targetAmount !== undefined
      ? BigInt(dto.targetAmount)
      : existing.targetAmount;

    // Auto-complete if current >= target
    let newStatus = dto.status ?? existing.status;
    if (newCurrentAmount >= newTargetAmount && newStatus === GoalStatus.ACTIVE) {
      newStatus = GoalStatus.COMPLETED;
    }

    const goal = await this.prisma.financialGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() ?? null }),
        ...(dto.targetAmount !== undefined && { targetAmount: newTargetAmount }),
        ...(dto.currentAmount !== undefined && { currentAmount: newCurrentAmount }),
        ...(dto.targetDate !== undefined && { targetDate: dto.targetDate ? new Date(dto.targetDate) : null }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
        ...(dto.color !== undefined && { color: dto.color }),
        status: newStatus,
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'GOAL_UPDATED',
      resourceType: 'financial_goal',
      resourceId: goalId,
    });

    return this.serialize(goal);
  }

  async delete(familyId: string, goalId: string, userId: string) {
    const existing = await this.prisma.financialGoal.findFirst({
      where: { id: goalId, familyId },
    });
    if (!existing) throw new NotFoundException('Goal not found');

    await this.prisma.financialGoal.delete({ where: { id: goalId } });

    await this.auditService.log({
      familyId,
      userId,
      action: 'GOAL_DELETED',
      resourceType: 'financial_goal',
      resourceId: goalId,
    });
  }

  private serialize(goal: any) {
    return {
      ...goal,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      percentComplete: Number(goal.targetAmount) > 0
        ? Math.min(100, Math.round((Number(goal.currentAmount) / Number(goal.targetAmount)) * 100))
        : 0,
    };
  }
}
