import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRecurringDto, UpdateRecurringDto } from './dto';
import { Frequency, TransactionType } from '@prisma/client';

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(familyId: string, dto: CreateRecurringDto, userId: string) {
    // Validate account belongs to family
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, familyId, deletedAt: null },
    });
    if (!account) throw new BadRequestException('Account not found in this family');

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ familyId }, { isSystem: true }],
        },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    if (dto.type === TransactionType.TRANSFER) {
      throw new BadRequestException('Recurring transfers not supported');
    }

    const recurring = await this.prisma.recurringTransaction.create({
      data: {
        familyId,
        accountId: dto.accountId,
        categoryId: dto.categoryId ?? null,
        type: dto.type,
        amount: BigInt(dto.amount),
        description: dto.description.trim(),
        frequency: dto.frequency,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        nextDueDate: new Date(dto.startDate),
        createdBy: userId,
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'RECURRING_CREATED',
      resourceType: 'recurring_transaction',
      resourceId: recurring.id,
    });

    return this.serialize(recurring);
  }

  async findAllByFamily(familyId: string) {
    const items = await this.prisma.recurringTransaction.findMany({
      where: { familyId },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    });
    return items.map((i) => this.serialize(i));
  }

  async findById(familyId: string, id: string) {
    const item = await this.prisma.recurringTransaction.findFirst({
      where: { id, familyId },
      include: {
        account: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, icon: true, color: true } },
      },
    });
    if (!item) throw new NotFoundException('Recurring transaction not found');
    return this.serialize(item);
  }

  async update(familyId: string, id: string, dto: UpdateRecurringDto, userId: string) {
    const existing = await this.prisma.recurringTransaction.findFirst({
      where: { id, familyId },
    });
    if (!existing) throw new NotFoundException('Recurring transaction not found');

    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ familyId }, { isSystem: true }],
        },
      });
      if (!category) throw new BadRequestException('Category not found');
    }

    const updated = await this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(dto.description !== undefined && { description: dto.description.trim() }),
        ...(dto.amount !== undefined && { amount: BigInt(dto.amount) }),
        ...(dto.frequency !== undefined && { frequency: dto.frequency }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'RECURRING_UPDATED',
      resourceType: 'recurring_transaction',
      resourceId: id,
    });

    return this.serialize(updated);
  }

  async delete(familyId: string, id: string, userId: string) {
    const existing = await this.prisma.recurringTransaction.findFirst({
      where: { id, familyId },
    });
    if (!existing) throw new NotFoundException('Recurring transaction not found');

    await this.prisma.recurringTransaction.delete({ where: { id } });

    await this.auditService.log({
      familyId,
      userId,
      action: 'RECURRING_DELETED',
      resourceType: 'recurring_transaction',
      resourceId: id,
    });
  }

  /**
   * Process due recurring transactions. Called by scheduler/cron.
   * Creates actual transactions for all active recurring items past their nextDueDate.
   */
  async processDueTransactions() {
    const now = new Date();
    const dueItems = await this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextDueDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
    });

    let processed = 0;
    for (const item of dueItems) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // Create actual transaction
          const balanceDelta = item.type === TransactionType.INCOME ? item.amount : -item.amount;

          await tx.transaction.create({
            data: {
              familyId: item.familyId,
              accountId: item.accountId,
              categoryId: item.categoryId,
              type: item.type,
              amount: item.amount,
              description: item.description,
              date: item.nextDueDate,
              createdBy: item.createdBy,
            },
          });

          // Update account balance
          await tx.account.update({
            where: { id: item.accountId },
            data: { balance: { increment: balanceDelta } },
          });

          // Advance nextDueDate
          const nextDate = this.calculateNextDate(item.nextDueDate, item.frequency);
          const shouldDeactivate = item.endDate && nextDate > item.endDate;

          await tx.recurringTransaction.update({
            where: { id: item.id },
            data: {
              nextDueDate: nextDate,
              lastProcessedDate: item.nextDueDate,
              ...(shouldDeactivate && { isActive: false }),
            },
          });
        });
        processed++;
      } catch (err) {
        this.logger.error(`Failed to process recurring ${item.id}: ${err}`);
      }
    }

    if (processed > 0) {
      this.logger.log(`Processed ${processed}/${dueItems.length} recurring transactions`);
    }
    return processed;
  }

  private calculateNextDate(current: Date, frequency: Frequency): Date {
    const next = new Date(current);
    switch (frequency) {
      case Frequency.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case Frequency.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case Frequency.BIWEEKLY:
        next.setDate(next.getDate() + 14);
        break;
      case Frequency.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case Frequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case Frequency.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  private serialize(item: any) {
    return {
      ...item,
      amount: Number(item.amount),
    };
  }
}
