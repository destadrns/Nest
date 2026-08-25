import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    familyId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }) {
    try {
      return await this.prisma.notification.create({
        data: {
          userId: data.userId,
          familyId: data.familyId,
          type: data.type,
          title: data.title,
          message: data.message,
          metadata: (data.metadata as Prisma.InputJsonValue) ?? undefined,
        },
      });
    } catch {
      // Fire-and-forget: never crash caller
      return null;
    }
  }

  async findAllForUser(userId: string, familyId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        userId,
        familyId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getUnreadCount(userId: string, familyId: string) {
    return this.prisma.notification.count({
      where: { userId, familyId, isRead: false },
    });
  }

  async markAsRead(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: string, familyId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, familyId, isRead: false },
      data: { isRead: true },
    });
  }

  async delete(userId: string, notificationId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notif) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({ where: { id: notificationId } });
  }

  /**
   * Generate budget warning notifications for users approaching/exceeding budget.
   * Called by scheduler alongside recurring transaction processing.
   */
  async generateBudgetAlerts(familyId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { familyId, isActive: true },
    });

    const members = await this.prisma.familyMember.findMany({
      where: { familyId, status: 'ACTIVE' },
      select: { userId: true },
    });

    let alertCount = 0;
    for (const budget of budgets) {
      const spending = await this.prisma.transaction.aggregate({
        where: {
          familyId,
          type: 'EXPENSE',
          deletedAt: null,
          date: {
            gte: budget.startDate,
            lte: budget.endDate ?? new Date(),
          },
        },
        _sum: { amount: true },
      });

      const spent = Number(spending._sum.amount ?? 0n);
      const budgetAmount = Number(budget.amount);
      const percent = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;

      if (percent >= 80) {
        const type = percent >= 100 ? 'BUDGET_EXCEEDED' : 'BUDGET_WARNING';
        const title = percent >= 100
          ? `Budget "${budget.name}" exceeded`
          : `Budget "${budget.name}" at ${percent}%`;
        const message = percent >= 100
          ? `You've spent $${(spent / 100).toFixed(2)} of your $${(budgetAmount / 100).toFixed(2)} budget.`
          : `You've used ${percent}% of your "${budget.name}" budget.`;

        for (const member of members) {
          await this.create({
            userId: member.userId,
            familyId,
            type,
            title,
            message,
            metadata: { budgetId: budget.id, percentUsed: percent },
          });
          alertCount++;
        }
      }
    }
    return alertCount;
  }
}
