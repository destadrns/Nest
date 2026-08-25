import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateBudgetDto, UpdateBudgetDto } from './dto';
import { TransactionType, Prisma } from '@prisma/client';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(familyId: string, dto: CreateBudgetDto, userId: string) {
    const budget = await this.prisma.$transaction(async (tx) => {
      const budget = await tx.budget.create({
        data: {
          familyId,
          name: dto.name.trim(),
          period: dto.period,
          amount: BigInt(dto.amount),
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          createdBy: userId,
        },
      });

      if (dto.items?.length) {
        await tx.budgetItem.createMany({
          data: dto.items.map((item) => ({
            budgetId: budget.id,
            categoryId: item.categoryId,
            amount: BigInt(item.amount),
          })),
        });
      }

      return budget;
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'BUDGET_CREATED',
      resourceType: 'budget',
      resourceId: budget.id,
    });

    return this.findById(familyId, budget.id);
  }

  async findAllByFamily(familyId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { familyId },
      include: {
        items: {
          include: {
            category: { select: { id: true, name: true, icon: true, color: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(budgets.map((b) => this.enrichBudgetWithSpending(b)));
  }

  async findById(familyId: string, budgetId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id: budgetId, familyId },
      include: {
        items: {
          include: {
            category: { select: { id: true, name: true, icon: true, color: true } },
          },
        },
      },
    });
    if (!budget) throw new NotFoundException('Budget not found');

    return this.enrichBudgetWithSpending(budget);
  }

  async update(familyId: string, budgetId: string, dto: UpdateBudgetDto, userId: string) {
    const existing = await this.prisma.budget.findFirst({
      where: { id: budgetId, familyId },
    });
    if (!existing) throw new NotFoundException('Budget not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.budget.update({
        where: { id: budgetId },
        data: {
          ...(dto.name !== undefined && { name: dto.name.trim() }),
          ...(dto.amount !== undefined && { amount: BigInt(dto.amount) }),
          ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });

      if (dto.items) {
        // Replace all items
        await tx.budgetItem.deleteMany({ where: { budgetId } });
        if (dto.items.length > 0) {
          await tx.budgetItem.createMany({
            data: dto.items.map((item) => ({
              budgetId,
              categoryId: item.categoryId,
              amount: BigInt(item.amount),
            })),
          });
        }
      }
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'BUDGET_UPDATED',
      resourceType: 'budget',
      resourceId: budgetId,
    });

    return this.findById(familyId, budgetId);
  }

  async delete(familyId: string, budgetId: string, userId: string) {
    const existing = await this.prisma.budget.findFirst({
      where: { id: budgetId, familyId },
    });
    if (!existing) throw new NotFoundException('Budget not found');

    await this.prisma.budget.delete({ where: { id: budgetId } });

    await this.auditService.log({
      familyId,
      userId,
      action: 'BUDGET_DELETED',
      resourceType: 'budget',
      resourceId: budgetId,
    });
  }

  /**
   * Calculate actual spending per category for a budget's time period.
   * Returns budget with spending data attached.
   */
  private async enrichBudgetWithSpending(budget: any) {
    const { startDate, period } = budget;
    const endDate = budget.endDate ?? this.calculatePeriodEnd(startDate, period);

    // Get actual spending grouped by category for budget period
    const spending = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        familyId: budget.familyId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        date: {
          gte: startDate,
          lte: endDate,
        },
        categoryId: { not: null },
      },
      _sum: { amount: true },
    });

    const spendingMap = new Map(spending.map((s) => [s.categoryId, Number(s._sum.amount ?? 0n)]));

    const totalSpent = spending.reduce((sum, s) => sum + Number(s._sum.amount ?? 0n), 0);
    const budgetAmount = Number(budget.amount);
    const remaining = budgetAmount - totalSpent;
    const percentUsed = budgetAmount > 0 ? Math.round((totalSpent / budgetAmount) * 100) : 0;

    // Determine warning level
    let status: 'on_track' | 'warning' | 'over_budget' = 'on_track';
    if (percentUsed >= 100) status = 'over_budget';
    else if (percentUsed >= 80) status = 'warning';

    const items = budget.items.map((item: any) => ({
      ...item,
      amount: Number(item.amount),
      spent: spendingMap.get(item.categoryId) ?? 0,
      remaining: Number(item.amount) - (spendingMap.get(item.categoryId) ?? 0),
    }));

    return {
      ...budget,
      amount: budgetAmount,
      startDate,
      endDate,
      totalSpent,
      remaining,
      percentUsed,
      status,
      items,
    };
  }

  private calculatePeriodEnd(startDate: Date, period: string): Date {
    const end = new Date(startDate);
    switch (period) {
      case 'WEEKLY':
        end.setDate(end.getDate() + 7);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }
}
