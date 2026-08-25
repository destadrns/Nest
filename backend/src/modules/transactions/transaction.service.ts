import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateTransactionDto, UpdateTransactionDto, TransactionQueryDto } from './dto';
import { TransactionType, FamilyRole, Prisma } from '@prisma/client';

@Injectable()
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    familyId: string,
    dto: CreateTransactionDto,
    userId: string,
    userRole: FamilyRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Verify account belongs to family
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, familyId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Account not found in this family');

    // Validate category if provided
    if (dto.categoryId) {
      const category = await this.prisma.category.findFirst({
        where: {
          id: dto.categoryId,
          OR: [{ familyId }, { familyId: null, isSystem: true }],
        },
      });
      if (!category) throw new NotFoundException('Category not found');
    }

    // Handle transfers specially
    if (dto.type === TransactionType.TRANSFER) {
      return this.createTransfer(familyId, dto, userId, ipAddress, userAgent);
    }

    // Single transaction with atomic balance update
    const result = await this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          familyId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: BigInt(dto.amount),
          description: dto.description.trim(),
          notes: dto.notes?.trim(),
          date: new Date(dto.date),
          createdBy: userId,
        },
      });

      // Update account balance
      const balanceDelta = this.getBalanceDelta(dto.type, dto.amount);
      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: balanceDelta } },
      });

      return transaction;
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'TRANSACTION_CREATED',
      resourceType: 'transaction',
      resourceId: result.id,
      metadata: { type: dto.type, amount: dto.amount, accountId: dto.accountId },
      ipAddress,
      userAgent,
    });

    return this.serializeTransaction(result);
  }

  private async createTransfer(
    familyId: string,
    dto: CreateTransactionDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (!dto.toAccountId) {
      throw new BadRequestException('toAccountId is required for transfers');
    }
    if (dto.accountId === dto.toAccountId) {
      throw new BadRequestException('Cannot transfer to the same account');
    }

    // Verify target account
    const toAccount = await this.prisma.account.findFirst({
      where: { id: dto.toAccountId, familyId, deletedAt: null },
    });
    if (!toAccount) throw new NotFoundException('Target account not found in this family');

    const result = await this.prisma.$transaction(async (tx) => {
      // Create outgoing transaction (from source account)
      const outgoing = await tx.transaction.create({
        data: {
          familyId,
          accountId: dto.accountId,
          type: TransactionType.TRANSFER,
          amount: BigInt(dto.amount),
          description: dto.description.trim(),
          notes: dto.notes?.trim(),
          date: new Date(dto.date),
          createdBy: userId,
        },
      });

      // Create incoming transaction (to target account)
      const incoming = await tx.transaction.create({
        data: {
          familyId,
          accountId: dto.toAccountId!,
          type: TransactionType.TRANSFER,
          amount: BigInt(dto.amount),
          description: dto.description.trim(),
          notes: dto.notes?.trim(),
          date: new Date(dto.date),
          linkedTransactionId: outgoing.id,
          createdBy: userId,
        },
      });

      // Link outgoing to incoming
      await tx.transaction.update({
        where: { id: outgoing.id },
        data: { linkedTransactionId: incoming.id },
      });

      // Update balances atomically
      // Source account: decrease
      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { decrement: BigInt(dto.amount) } },
      });
      // Target account: increase
      await tx.account.update({
        where: { id: dto.toAccountId! },
        data: { balance: { increment: BigInt(dto.amount) } },
      });

      return { outgoing, incoming };
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'TRANSFER_CREATED',
      resourceType: 'transaction',
      resourceId: result.outgoing.id,
      metadata: {
        amount: dto.amount,
        fromAccountId: dto.accountId,
        toAccountId: dto.toAccountId,
      },
      ipAddress,
      userAgent,
    });

    return this.serializeTransaction(result.outgoing);
  }

  async findAll(familyId: string, query: TransactionQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      familyId,
      deletedAt: null,
      ...(query.type && { type: query.type }),
      ...(query.accountId && { accountId: query.accountId }),
      ...(query.categoryId && { categoryId: query.categoryId }),
      ...(query.dateFrom || query.dateTo
        ? {
            date: {
              ...(query.dateFrom && { gte: new Date(query.dateFrom) }),
              ...(query.dateTo && { lte: new Date(query.dateTo) }),
            },
          }
        : {}),
    };

    const sortField = query.sort === 'amount' ? 'amount' : 'date';
    const sortOrder = query.order ?? 'desc';

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { [sortField]: sortOrder },
        skip,
        take: limit,
        include: {
          account: { select: { id: true, name: true, type: true } },
          category: { select: { id: true, name: true, type: true, icon: true, color: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions.map(this.serializeTransaction),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(familyId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, familyId, deletedAt: null },
      include: {
        account: { select: { id: true, name: true, type: true } },
        category: { select: { id: true, name: true, type: true, icon: true, color: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return this.serializeTransaction(transaction);
  }

  async update(
    familyId: string,
    transactionId: string,
    dto: UpdateTransactionDto,
    userId: string,
    userRole: FamilyRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, familyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Transaction not found');

    // Members can only edit their own transactions
    if (userRole === FamilyRole.MEMBER && existing.createdBy !== userId) {
      throw new ForbiddenException('You can only edit your own transactions');
    }
    if (userRole === FamilyRole.VIEWER) {
      throw new ForbiddenException('Viewers cannot edit transactions');
    }

    // If amount changes, adjust account balance
    const result = await this.prisma.$transaction(async (tx) => {
      if (dto.amount !== undefined && BigInt(dto.amount) !== existing.amount) {
        const oldDelta = this.getBalanceDelta(existing.type, Number(existing.amount));
        const newDelta = this.getBalanceDelta(existing.type, dto.amount);
        const adjustment = newDelta - oldDelta;

        await tx.account.update({
          where: { id: existing.accountId },
          data: { balance: { increment: adjustment } },
        });
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data: {
          ...(dto.amount !== undefined && { amount: BigInt(dto.amount) }),
          ...(dto.description !== undefined && { description: dto.description.trim() }),
          ...(dto.date !== undefined && { date: new Date(dto.date) }),
          ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
          ...(dto.notes !== undefined && { notes: dto.notes?.trim() }),
        },
      });
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'TRANSACTION_UPDATED',
      resourceType: 'transaction',
      resourceId: transactionId,
      metadata: dto as Record<string, unknown>,
      ipAddress,
      userAgent,
    });

    return this.serializeTransaction(result);
  }

  async softDelete(
    familyId: string,
    transactionId: string,
    userId: string,
    userRole: FamilyRole,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (userRole !== FamilyRole.OWNER && userRole !== FamilyRole.ADMIN) {
      throw new ForbiddenException('Only owners and admins can delete transactions');
    }

    const existing = await this.prisma.transaction.findFirst({
      where: { id: transactionId, familyId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException('Transaction not found');

    await this.prisma.$transaction(async (tx) => {
      // Reverse balance effect
      const reverseDelta = -this.getBalanceDelta(existing.type, Number(existing.amount));
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: reverseDelta } },
      });

      // Soft delete
      await tx.transaction.update({
        where: { id: transactionId },
        data: { deletedAt: new Date() },
      });

      // If transfer, also soft delete linked transaction and reverse its balance
      if (existing.linkedTransactionId) {
        const linked = await tx.transaction.findUnique({
          where: { id: existing.linkedTransactionId },
        });
        if (linked && !linked.deletedAt) {
          const linkedReverseDelta = -this.getBalanceDelta(linked.type, Number(linked.amount));
          await tx.account.update({
            where: { id: linked.accountId },
            data: { balance: { increment: linkedReverseDelta } },
          });
          await tx.transaction.update({
            where: { id: linked.id },
            data: { deletedAt: new Date() },
          });
        }
      }
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'TRANSACTION_DELETED',
      resourceType: 'transaction',
      resourceId: transactionId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Calculate balance delta for a transaction type.
   * INCOME/ADJUSTMENT: positive (money in)
   * EXPENSE: negative (money out)
   * TRANSFER: handled separately (outgoing = negative, incoming = positive)
   */
  private getBalanceDelta(type: TransactionType, amount: number): bigint {
    switch (type) {
      case TransactionType.INCOME:
      case TransactionType.ADJUSTMENT:
        return BigInt(amount);
      case TransactionType.EXPENSE:
        return BigInt(-amount);
      case TransactionType.TRANSFER:
        // For the source account in a transfer, delta is negative.
        // But transfers are handled via createTransfer with explicit inc/dec.
        // This method is called for single-leg context: treat as expense (outgoing).
        return BigInt(-amount);
    }
  }

  private serializeTransaction(txn: any) {
    return {
      ...txn,
      amount: Number(txn.amount),
    };
  }
}
