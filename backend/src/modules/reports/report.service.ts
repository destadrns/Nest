import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

interface DateRange {
  from: Date;
  to: Date;
}

@Injectable()
export class ReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Spending by category for a date range.
   */
  async getSpendingByCategory(familyId: string, range: DateRange) {
    const results = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        familyId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        date: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Fetch category names
    const categoryIds = results.map((r) => r.categoryId).filter(Boolean) as string[];
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });
    const catMap = new Map(categories.map((c) => [c.id, c]));

    const totalSpending = results.reduce((sum, r) => sum + Number(r._sum.amount ?? 0n), 0);

    return results.map((r) => {
      const amount = Number(r._sum.amount ?? 0n);
      const category = r.categoryId ? catMap.get(r.categoryId) : null;
      return {
        categoryId: r.categoryId,
        categoryName: category?.name ?? 'Uncategorized',
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        amount,
        count: r._count,
        percentage: totalSpending > 0 ? Math.round((amount / totalSpending) * 100) : 0,
      };
    });
  }

  /**
   * Income vs Expense summary for a date range.
   */
  async getIncomeVsExpense(familyId: string, range: DateRange) {
    const results = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        familyId,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        deletedAt: null,
        date: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
      _count: true,
    });

    const income = results.find((r) => r.type === TransactionType.INCOME);
    const expense = results.find((r) => r.type === TransactionType.EXPENSE);

    const incomeAmount = Number(income?._sum.amount ?? 0n);
    const expenseAmount = Number(expense?._sum.amount ?? 0n);

    return {
      income: incomeAmount,
      incomeCount: income?._count ?? 0,
      expense: expenseAmount,
      expenseCount: expense?._count ?? 0,
      net: incomeAmount - expenseAmount,
      savingsRate:
        incomeAmount > 0 ? Math.round(((incomeAmount - expenseAmount) / incomeAmount) * 100) : 0,
    };
  }

  /**
   * Monthly spending trend over N months.
   */
  async getMonthlyTrend(familyId: string, months: number = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        familyId,
        type: { in: [TransactionType.INCOME, TransactionType.EXPENSE] },
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      select: { type: true, amount: true, date: true },
      orderBy: { date: 'asc' },
    });

    // Group by year-month
    const monthlyData = new Map<string, { income: number; expense: number }>();

    // Initialize all months
    for (let i = 0; i < months; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (months - 1 - i));
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, { income: 0, expense: 0 });
    }

    for (const tx of transactions) {
      const key = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const entry = monthlyData.get(key);
      if (!entry) continue;

      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) {
        entry.income += amount;
      } else {
        entry.expense += amount;
      }
    }

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }));
  }

  /**
   * Account balance summary (net worth breakdown).
   */
  async getAccountSummary(familyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { familyId, deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        balance: true,
        currency: true,
        institution: true,
      },
      orderBy: { type: 'asc' },
    });

    const serialized = accounts.map((a) => ({
      ...a,
      balance: Number(a.balance),
    }));

    const assets = serialized
      .filter((a) => !['CREDIT', 'LOAN'].includes(a.type))
      .reduce((sum, a) => sum + a.balance, 0);

    const liabilities = serialized
      .filter((a) => ['CREDIT', 'LOAN'].includes(a.type))
      .reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return {
      accounts: serialized,
      totalAssets: assets,
      totalLiabilities: liabilities,
      netWorth: assets - liabilities,
    };
  }

  /**
   * Top spending merchants/descriptions for a date range.
   */
  async getTopSpending(familyId: string, range: DateRange, limit: number = 10) {
    const results = await this.prisma.transaction.groupBy({
      by: ['description'],
      where: {
        familyId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        date: { gte: range.from, lte: range.to },
      },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: 'desc' } },
      take: limit,
    });

    return results.map((r) => ({
      description: r.description,
      amount: Number(r._sum.amount ?? 0n),
      count: r._count,
    }));
  }

  /**
   * Daily spending for a date range (for sparkline/heatmap).
   */
  async getDailySpending(familyId: string, range: DateRange) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        familyId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        date: { gte: range.from, lte: range.to },
      },
      select: { amount: true, date: true },
      orderBy: { date: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (const tx of transactions) {
      const key = tx.date.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(tx.amount));
    }

    return Array.from(dailyMap.entries()).map(([date, amount]) => ({ date, amount }));
  }
}
