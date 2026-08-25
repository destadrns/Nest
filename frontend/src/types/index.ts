// Shared types matching backend API responses

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export interface Family {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  role: FamilyRole;
  createdAt: string;
  updatedAt: string;
}

export type FamilyRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface FamilyMember {
  id: string;
  userId: string;
  familyId: string;
  role: FamilyRole;
  status: string;
  joinedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export type AccountType = 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'CASH' | 'INVESTMENT' | 'LOAN' | 'OTHER';

export interface Account {
  id: string;
  familyId: string;
  name: string;
  type: AccountType;
  balance: number; // cents
  currency: string;
  institution?: string;
  isActive: boolean;
  createdAt: string;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT';
export type CategoryType = 'INCOME' | 'EXPENSE';

export interface Category {
  id: string;
  familyId?: string;
  parentId?: string;
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
  isSystem: boolean;
  children?: Category[];
}

export interface Transaction {
  id: string;
  familyId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number; // cents
  description: string;
  notes?: string;
  date: string;
  linkedTransactionId?: string;
  createdBy: string;
  createdAt: string;
  account?: { id: string; name: string; type: AccountType };
  category?: { id: string; name: string; type: CategoryType; icon?: string; color?: string };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: unknown[];
  correlationId?: string;
}

export interface SessionInfo {
  id: string;
  ipAddress: string;
  userAgent?: string;
  createdAt: number;
  lastActiveAt: number;
  isCurrent: boolean;
}

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface BudgetItem {
  id: string;
  budgetId: string;
  categoryId: string;
  amount: number;
  spent?: number;
  remaining?: number;
  category?: { id: string; name: string; icon?: string; color?: string };
}

export interface Budget {
  id: string;
  familyId: string;
  name: string;
  period: BudgetPeriod;
  amount: number; // cents
  startDate: string;
  endDate?: string;
  categoryId?: string;
  isActive: boolean;
  totalSpent?: number;
  remaining?: number;
  percentUsed?: number;
  status?: 'on_track' | 'warning' | 'over_budget';
  items?: BudgetItem[];
  createdAt: string;
}

export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface FinancialGoal {
  id: string;
  familyId: string;
  name: string;
  description?: string;
  targetAmount: number; // cents
  currentAmount: number; // cents
  targetDate?: string;
  status: GoalStatus;
  icon?: string;
  color?: string;
  percentComplete?: number;
  createdAt: string;
}

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface RecurringTransaction {
  id: string;
  familyId: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: Frequency;
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  isActive: boolean;
  account?: { id: string; name: string };
  category?: { id: string; name: string; icon?: string; color?: string };
}

export interface AppNotification {
  id: string;
  userId: string;
  familyId: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CategorySpending {
  categoryId: string | null;
  categoryName: string;
  icon: string | null;
  color: string | null;
  amount: number;
  count: number;
  percentage: number;
}

export interface IncomeVsExpense {
  income: number;
  incomeCount: number;
  expense: number;
  expenseCount: number;
  net: number;
  savingsRate: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expense: number;
  net: number;
}

export interface AccountSummary {
  accounts: Account[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

export interface SecuritySummary {
  user: {
    id: string;
    email: string;
    mfaEnabled: boolean;
    emailVerified: boolean;
    lastLoginAt: string | null;
    sessionCount: number;
    passkeyCount: number;
  };
  securityScore: number;
  recentEvents: Array<{
    id: string;
    eventType: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ipAddress?: string;
    createdAt: string;
  }>;
  recentAuditLogs: Array<{
    id: string;
    action: string;
    resourceType: string;
    createdAt: string;
  }>;
}

export interface Passkey {
  id: string;
  credentialId: string;
  name?: string;
  deviceType?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface Anomaly {
  id: string;
  type: 'SPIKE' | 'UNUSUAL_MERCHANT' | 'FREQUENCY_SURGE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  amount?: number;
  detectedAt: string;
}

export interface SpendingForecast {
  predictedMonthlyExpense: number;
  expectedYearEndSavings: number;
  confidenceScore: number;
  nextMonthPredictionsByCategory: Array<{ categoryName: string; predictedAmount: number }>;
}
