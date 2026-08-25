import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ImportTransactionsDto } from './dto/data-portability.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class DataPortabilityService {
  private readonly logger = new Logger(DataPortabilityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Preview transactions from import payload and flag potential duplicates.
   */
  async previewImport(familyId: string, dto: ImportTransactionsDto) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, familyId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Target account not found');

    const previewResults = [];

    for (const row of dto.transactions) {
      const rowDate = new Date(row.date);
      // Check for duplicate: same account, date, amount, description
      const duplicate = await this.prisma.transaction.findFirst({
        where: {
          accountId: dto.accountId,
          familyId,
          amount: BigInt(row.amount),
          date: rowDate,
          description: row.description.trim(),
          deletedAt: null,
        },
      });

      // Find matching category if name provided
      let categoryId: string | null = null;
      if (row.categoryName) {
        const cat = await this.prisma.category.findFirst({
          where: {
            name: { equals: row.categoryName.trim(), mode: 'insensitive' },
            OR: [{ familyId }, { isSystem: true }],
          },
        });
        if (cat) categoryId = cat.id;
      }

      previewResults.push({
        ...row,
        resolvedCategoryId: categoryId,
        isDuplicate: !!duplicate,
        duplicateId: duplicate?.id ?? null,
      });
    }

    return {
      totalRows: previewResults.length,
      duplicateCount: previewResults.filter((r) => r.isDuplicate).length,
      validCount: previewResults.filter((r) => !r.isDuplicate).length,
      items: previewResults,
    };
  }

  /**
   * Execute atomic batch import with automatic duplicate skipping and balance adjustments.
   */
  async executeImport(
    familyId: string,
    dto: ImportTransactionsDto,
    userId: string,
    skipDuplicates = true,
  ) {
    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, familyId, deletedAt: null },
    });
    if (!account) throw new NotFoundException('Target account not found');

    const preview = await this.previewImport(familyId, dto);
    const toImport = skipDuplicates
      ? preview.items.filter((item) => !item.isDuplicate)
      : preview.items;

    if (toImport.length === 0) {
      return { imported: 0, skipped: preview.duplicateCount, total: preview.totalRows };
    }

    let netBalanceDelta = 0n;

    await this.prisma.$transaction(async (tx) => {
      for (const item of toImport) {
        const amountBigInt = BigInt(item.amount);
        const balanceDelta = item.type === TransactionType.INCOME
          ? amountBigInt
          : -amountBigInt;

        netBalanceDelta += balanceDelta;

        await tx.transaction.create({
          data: {
            familyId,
            accountId: dto.accountId,
            categoryId: item.resolvedCategoryId,
            type: item.type,
            amount: amountBigInt,
            description: item.description.trim(),
            notes: item.notes?.trim() ?? 'Imported via Data Portability',
            date: new Date(item.date),
            createdBy: userId,
          },
        });
      }

      // Update account balance in one atomic step
      await tx.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: netBalanceDelta } },
      });
    });

    await this.auditService.log({
      familyId,
      userId,
      action: 'TRANSACTIONS_IMPORTED',
      resourceType: 'account',
      resourceId: dto.accountId,
      metadata: {
        importedCount: toImport.length,
        skippedDuplicates: preview.duplicateCount,
      },
    });

    return {
      imported: toImport.length,
      skipped: preview.duplicateCount,
      total: preview.totalRows,
    };
  }

  /**
   * Export all family financial data in JSON or structured CSV formats (GDPR / Portability compliant).
   */
  async exportFamilyData(familyId: string) {
    const [family, accounts, categories, transactions, budgets, goals, recurring] =
      await Promise.all([
        this.prisma.family.findUnique({ where: { id: familyId } }),
        this.prisma.account.findMany({ where: { familyId, deletedAt: null } }),
        this.prisma.category.findMany({ where: { familyId } }),
        this.prisma.transaction.findMany({
          where: { familyId, deletedAt: null },
          orderBy: { date: 'desc' },
        }),
        this.prisma.budget.findMany({
          where: { familyId },
          include: { items: true },
        }),
        this.prisma.financialGoal.findMany({ where: { familyId } }),
        this.prisma.recurringTransaction.findMany({ where: { familyId } }),
      ]);

    if (!family) throw new NotFoundException('Family not found');

    return {
      exportedAt: new Date().toISOString(),
      family,
      accounts: accounts.map((a) => ({ ...a, balance: Number(a.balance) })),
      categories,
      transactions: transactions.map((t) => ({ ...t, amount: Number(t.amount) })),
      budgets: budgets.map((b) => ({
        ...b,
        amount: Number(b.amount),
        items: b.items.map((i) => ({ ...i, amount: Number(i.amount) })),
      })),
      goals: goals.map((g) => ({
        ...g,
        targetAmount: Number(g.targetAmount),
        currentAmount: Number(g.currentAmount),
      })),
      recurring: recurring.map((r) => ({ ...r, amount: Number(r.amount) })),
    };
  }
}
