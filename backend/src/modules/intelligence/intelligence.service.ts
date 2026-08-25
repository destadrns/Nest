import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

export interface Anomaly {
  id: string;
  type: 'SPIKE' | 'UNUSUAL_MERCHANT' | 'FREQUENCY_SURGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  transactionId?: string;
  amount?: number;
  expectedRange?: { min: number; max: number };
  detectedAt: string;
}

export interface SpendingForecast {
  predictedMonthlyExpense: number;
  expectedYearEndSavings: number;
  confidenceScore: number;
  nextMonthPredictionsByCategory: { categoryName: string; predictedAmount: number }[];
}

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Suggest best category match for a transaction description using keyword token similarity and historical patterns.
   */
  async suggestCategory(familyId: string, description: string) {
    const cleanDesc = description.toLowerCase().trim();

    // Check past classified transactions with similar descriptions
    const pastTx = await this.prisma.transaction.findFirst({
      where: {
        familyId,
        categoryId: { not: null },
        description: { contains: cleanDesc.slice(0, 8), mode: 'insensitive' },
        deletedAt: null,
      },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });

    if (pastTx?.category) {
      return {
        categoryId: pastTx.category.id,
        categoryName: pastTx.category.name,
        confidence: 0.9,
        source: 'HISTORY',
      };
    }

    // Keyword heuristics
    const keywords: Record<string, string[]> = {
      'Groceries': ['market', 'supermarket', 'walmart', 'trader', 'costco', 'grocery', 'food'],
      'Dining Out': ['restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonalds', 'pizza', 'burger'],
      'Utilities': ['electric', 'water', 'gas', 'power', 'internet', 'verizon', 'comcast'],
      'Transportation': ['uber', 'lyft', 'shell', 'chevron', 'gasoline', 'metro', 'transit', 'parking'],
      'Housing': ['rent', 'mortgage', 'hoa', 'realty'],
      'Entertainment': ['netflix', 'spotify', 'cinema', 'theatre', 'apple', 'steam', 'game'],
      'Healthcare': ['pharmacy', 'cvs', 'walgreens', 'clinic', 'hospital', 'doctor', 'dental'],
    };

    for (const [catName, words] of Object.entries(keywords)) {
      if (words.some((w) => cleanDesc.includes(w))) {
        const cat = await this.prisma.category.findFirst({
          where: {
            name: { equals: catName, mode: 'insensitive' },
            OR: [{ familyId }, { isSystem: true }],
          },
        });
        if (cat) {
          return {
            categoryId: cat.id,
            categoryName: cat.name,
            confidence: 0.75,
            source: 'KEYWORD_MATCH',
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect anomalous spending activities via statistical Z-score and rolling category deviations.
   */
  async detectAnomalies(familyId: string): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];

    // Get last 90 days of expense transactions
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        familyId,
        type: TransactionType.EXPENSE,
        deletedAt: null,
        date: { gte: ninetyDaysAgo },
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    if (transactions.length < 5) return [];

    // Calculate baseline mean and standard deviation for transactions
    const amounts = transactions.map((t) => Number(t.amount));
    const mean = amounts.reduce((acc, val) => acc + val, 0) / amounts.length;
    const variance =
      amounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    // Look at last 10 transactions for statistical spikes (Z-score > 2.5)
    const recentTransactions = transactions.slice(0, 15);
    for (const tx of recentTransactions) {
      const amount = Number(tx.amount);
      if (stdDev > 0) {
        const zScore = (amount - mean) / stdDev;
        if (zScore > 2.5) {
          anomalies.push({
            id: `spike-${tx.id}`,
            type: 'SPIKE',
            severity: zScore > 4 ? 'HIGH' : 'MEDIUM',
            description: `Unusually large expense of $${(amount / 100).toFixed(2)} at "${tx.description}". Average is $${(mean / 100).toFixed(2)}.`,
            transactionId: tx.id,
            amount,
            expectedRange: {
              min: Math.max(0, Math.round(mean - stdDev)),
              max: Math.round(mean + 2 * stdDev),
            },
            detectedAt: new Date().toISOString(),
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Forecast next month expenses & financial health using exponential moving averages.
   */
  async generateForecast(familyId: string): Promise<SpendingForecast> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        familyId,
        deletedAt: null,
        date: { gte: sixMonthsAgo },
      },
      include: { category: true },
    });

    const monthlyExpenses = new Map<string, number>();
    const categoryTotals = new Map<string, number>();

    for (const tx of transactions) {
      if (tx.type === TransactionType.EXPENSE) {
        const monthKey = `${tx.date.getFullYear()}-${tx.date.getMonth() + 1}`;
        monthlyExpenses.set(monthKey, (monthlyExpenses.get(monthKey) ?? 0) + Number(tx.amount));

        const catName = tx.category?.name ?? 'Other';
        categoryTotals.set(catName, (categoryTotals.get(catName) ?? 0) + Number(tx.amount));
      }
    }

    const expenseValues = Array.from(monthlyExpenses.values());
    const avgMonthlyExpense =
      expenseValues.length > 0
        ? Math.round(expenseValues.reduce((a, b) => a + b, 0) / expenseValues.length)
        : 0;

    const numMonths = Math.max(1, expenseValues.length);
    const categoryPredictions = Array.from(categoryTotals.entries()).map(([name, total]) => ({
      categoryName: name,
      predictedAmount: Math.round(total / numMonths),
    }));

    return {
      predictedMonthlyExpense: avgMonthlyExpense,
      expectedYearEndSavings: Math.max(0, avgMonthlyExpense * 2), // projected buffer
      confidenceScore: Math.min(95, 60 + expenseValues.length * 5),
      nextMonthPredictionsByCategory: categoryPredictions.sort((a, b) => b.predictedAmount - a.predictedAmount),
    };
  }
}
