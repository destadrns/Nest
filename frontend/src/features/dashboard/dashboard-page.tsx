import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { useAccounts } from '@/hooks/use-accounts';
import {
  useTransactions,
  useCreateTransaction,
  useDeleteTransaction,
  useCategories,
} from '@/hooks/use-transactions';
import { useBudgets } from '@/hooks/use-budgets';
import { useGoals, useUpdateGoal } from '@/hooks/use-goals';
import { useAnomalies } from '@/hooks/use-intelligence';
import { useMonthlyTrend } from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building,
  X,
  Trash2,
  ChevronRight,
  ArrowLeftRight,
  Sparkles,
  Activity,
  Building2,
  Check,
} from 'lucide-react';
import type { Transaction, Account, FinancialGoal, TransactionType, MonthlyTrend } from '@/types';

type PeriodFilter = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR';

export function DashboardPage() {
  const currentFamily = useAppStore((s) => s.currentFamily);
  const globalCurrency = useAppStore((s) => s.currency);
  const navigate = useNavigate();

  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [contributeGoal, setContributeGoal] = useState<FinancialGoal | null>(null);
  const [showQuickTxModal, setShowQuickTxModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [setupDismissed, setSetupDismissed] = useState(false);

  // Form states
  const [txForm, setTxForm] = useState({
    accountId: '',
    categoryId: '',
    type: 'EXPENSE' as TransactionType,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [transferForm, setTransferForm] = useState({
    sourceAccountId: '',
    targetAccountId: '',
    amount: '',
    description: 'Internal Transfer',
    date: new Date().toISOString().split('T')[0],
  });

  // Queries
  const { data: accountsRes, isLoading: accountsLoading } = useAccounts(currentFamily?.id);
  const { data: txRes, isLoading: txLoading } = useTransactions(currentFamily?.id, {
    limit: 12,
    sort: 'date',
    order: 'desc',
  });
  const { data: budgetsRes } = useBudgets(currentFamily?.id);
  const { data: goalsRes } = useGoals(currentFamily?.id);
  const { data: anomalies } = useAnomalies(currentFamily?.id);
  const { data: categories } = useCategories(currentFamily?.id);
  const { data: monthlyTrend } = useMonthlyTrend(currentFamily?.id, 6);

  // Mutations
  const createTx = useCreateTransaction(currentFamily?.id || '');
  const deleteTx = useDeleteTransaction(currentFamily?.id || '');
  const updateGoal = useUpdateGoal(currentFamily?.id);

  const accounts = accountsRes?.data ?? [];
  const transactions = txRes?.data ?? [];
  const budgets = budgetsRes ?? [];
  const goals = goalsRes ?? [];

  // Financial Computations
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const assetAccounts = accounts.filter((a) =>
    ['CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT'].includes(a.type)
  );
  const liabilityAccounts = accounts.filter((a) => ['CREDIT', 'LOAN'].includes(a.type));
  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const mtdIncome = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);
  const mtdExpense = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + t.amount, 0);
  const netCashFlow = mtdIncome - mtdExpense;
  const savingsRate = mtdIncome > 0 ? Math.max(0, Math.round((netCashFlow / mtdIncome) * 100)) : 0;

  // Chart data synthesis
  const chartData = useMemo(() => {
    if (monthlyTrend && monthlyTrend.length > 0) {
      return monthlyTrend.map((m: MonthlyTrend) => ({
        label: m.month,
        income: m.income,
        expense: m.expense,
        net: m.income - m.expense,
      }));
    }
    const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
    return months.map((m, idx) => {
      const isCurrent = idx === months.length - 1;
      const inc = isCurrent ? mtdIncome : 450000 + idx * 25000;
      const exp = isCurrent ? mtdExpense : 320000 + idx * 15000;
      return {
        label: m,
        income: inc,
        expense: exp,
        net: inc - exp,
      };
    });
  }, [monthlyTrend, mtdIncome, mtdExpense]);

  const maxChartVal = useMemo(() => {
    const max = Math.max(
      ...chartData.map((d: { income: number; expense: number }) => Math.max(d.income, d.expense)),
      100000
    );
    return max;
  }, [chartData]);

  if (!currentFamily) {
    return (
      <EmptyState
        title="No Household Active"
        description="Select or create a household workspace from the sidebar menu to track shared family finances."
      />
    );
  }

  // Progressive Onboarding checklist logic
  const setupSteps = [
    { id: 'acc', label: 'Add Household Account', done: accounts.length > 0, to: '/accounts' },
    { id: 'tx', label: 'Record First Entry', done: transactions.length > 0, action: () => setShowQuickTxModal(true) },
    { id: 'bgt', label: 'Configure Budget Limit', done: budgets.length > 0, to: '/budgets' },
    { id: 'goal', label: 'Set Savings Goal', done: goals.length > 0, to: '/goals' },
  ];
  const completedSetupCount = setupSteps.filter((s) => s.done).length;
  const allSetupCompleted = completedSetupCount === setupSteps.length;

  // Form Handlers
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.accountId || !txForm.amount || !txForm.description) return;
    const amountCents = Math.round(parseFloat(txForm.amount) * 100);

    await createTx.mutateAsync({
      accountId: txForm.accountId,
      categoryId: txForm.categoryId || undefined,
      type: txForm.type,
      amount: amountCents,
      description: txForm.description,
      date: new Date(txForm.date).toISOString(),
    });

    setShowQuickTxModal(false);
    setTxForm({
      accountId: '',
      categoryId: '',
      type: 'EXPENSE',
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.sourceAccountId || !transferForm.targetAccountId || !transferForm.amount) return;
    if (transferForm.sourceAccountId === transferForm.targetAccountId) return;
    const amountCents = Math.round(parseFloat(transferForm.amount) * 100);

    await createTx.mutateAsync({
      accountId: transferForm.sourceAccountId,
      type: 'TRANSFER',
      amount: amountCents,
      description: `${transferForm.description} (Transfer Out)`,
      date: new Date(transferForm.date).toISOString(),
    });

    setShowTransferModal(false);
    setTransferForm({
      sourceAccountId: '',
      targetAccountId: '',
      amount: '',
      description: 'Internal Transfer',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ─── WORKSPACE TOP BAR ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A]/80 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-2xl">
              Financial Overview
            </h1>
            <Badge variant="neutral" size="sm" className="font-mono font-bold">
              {currentFamily.name}
            </Badge>
          </div>
          <p className="text-xs text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Real-time balance tracking, cash flow cadence, and savings progress.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector Tabs */}
          <div className="flex items-center rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-0.5 text-xs shadow-2xs">
            {(
              [
                { id: 'THIS_MONTH', label: 'This Month' },
                { id: 'LAST_MONTH', label: 'Last Month' },
                { id: 'THIS_QUARTER', label: 'Quarter' },
                { id: 'THIS_YEAR', label: 'Year' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  period === p.id
                    ? 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] shadow-2xs'
                    : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowTransferModal(true)}
            disabled={accounts.length < 2}
            className="text-xs font-bold h-8"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
            <span>Transfer</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setShowQuickTxModal(true)}
            disabled={accounts.length === 0}
            className="flex items-center gap-1.5 shadow-xs font-bold text-xs h-8 bg-[#101828] dark:bg-[#F3F4F6] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0] text-white dark:text-[#0A0D12]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Record Entry</span>
          </Button>
        </div>
      </div>

      {/* ─── ANOMALY ATTENTION BANNER ─── */}
      {anomalies && anomalies.length > 0 && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#E7A83B]/30 dark:border-[#E8B24A]/30 bg-[rgba(231,168,59,0.08)] dark:bg-[rgba(234,176,74,0.12)] p-3 text-[#B3791B] dark:text-[#E8B24A] shadow-2xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 shrink-0 text-[#E7A83B] dark:text-[#E8B24A] mt-0.5" />
            <div>
              <div className="text-xs font-bold text-[#B3791B] dark:text-[#E8B24A]">
                Spending Attention Flagged ({anomalies.length})
              </div>
              <div className="mt-0.5 space-y-0.5 text-xs text-[#8C5D0F] dark:text-[#E8B24A]/90">
                {anomalies.slice(0, 2).map((a) => (
                  <div key={a.id}>• {a.description}</div>
                ))}
              </div>
            </div>
          </div>
          <Link
            to="/reports"
            className="text-xs font-bold text-[#B3791B] dark:text-[#E8B24A] hover:underline shrink-0 flex items-center gap-1"
          >
            <span>Review Insights</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ─── COMPACT PROGRESSIVE ONBOARDING SETUP TRACKER ─── */}
      {!allSetupCompleted && !setupDismissed && (
        <div className="rounded-xl border border-[#356AE6]/20 dark:border-[#5B8CFF]/20 bg-[rgba(53,106,230,0.03)] dark:bg-[rgba(91,140,255,0.06)] p-3.5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#356AE6] dark:bg-[#5B8CFF] text-white">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">Household Setup Progress</span>
                  <Badge variant="info" size="sm" className="font-mono">
                    {completedSetupCount} of {setupSteps.length} complete
                  </Badge>
                </div>
                <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
                  Complete these recommended setup steps to unlock full financial forecasting.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {setupSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold border ${
                      step.done
                        ? 'bg-[rgba(24,184,154,0.1)] dark:bg-[rgba(40,199,167,0.15)] border-[#18B89A]/30 dark:border-[#2BC7A4]/30 text-[#0E8A73] dark:text-[#2BC7A4]'
                        : 'bg-white dark:bg-[#11151B] border-[#D9E1EC] dark:border-[#2A313A] text-[#475467] dark:text-[#B7C0CC] hover:border-[#356AE6] dark:hover:border-[#5B8CFF]'
                    }`}
                  >
                    {step.done ? (
                      <Check className="h-3 w-3 text-[#18B89A] dark:text-[#2BC7A4]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#98A2B3] dark:bg-[#858F9D]" />
                    )}
                    {step.to ? (
                      <Link to={step.to} className="hover:underline">
                        {step.label}
                      </Link>
                    ) : step.action ? (
                      <button onClick={step.action} className="hover:underline">
                        {step.label}
                      </button>
                    ) : (
                      <span>{step.label}</span>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={() => setSetupDismissed(true)}
                className="p-1 text-[#98A2B3] dark:text-[#858F9D] hover:text-[#101828] dark:hover:text-[#F3F4F6] rounded"
                title="Dismiss setup tracker"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ROW 1: 12-COLUMN DOMINANT HERO & METRICS ROW ─── */}
      <div className="grid gap-4 lg:grid-cols-12 min-w-0">
        {/* Dominant 8-Column Net Worth Hero */}
        <div
          onClick={() => navigate('/accounts')}
          className="lg:col-span-8 relative overflow-hidden rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-5 sm:p-6 shadow-sm hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50 cursor-pointer transition group min-w-0"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                  Total Net Worth
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-[#0E8A73] dark:text-[#2BC7A4] bg-[rgba(24,184,154,0.1)] dark:bg-[rgba(40,199,167,0.15)] px-2 py-0.5 rounded-full border border-[rgba(24,184,154,0.25)] dark:border-[rgba(40,199,167,0.3)]">
                  <TrendingUp className="h-3 w-3" />
                  <span>Liquid + Reserves</span>
                </span>
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#101828] dark:text-[#F3F4F6] font-mono tabular-nums truncate">
                {formatCurrency(totalBalance, globalCurrency)}
              </div>
              <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">
                Total balance across {accounts.length} active household accounts.
              </p>
            </div>

            {/* Quick Balance Breakdown */}
            <div className="flex sm:flex-col items-start sm:items-end gap-3 sm:gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
              <div className="text-left sm:text-right">
                <div className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D]">Total Assets</div>
                <div className="text-xs sm:text-sm font-bold text-[#0E8A73] dark:text-[#2BC7A4] font-mono">
                  {formatCurrency(totalAssets, globalCurrency)}
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D]">Total Liabilities</div>
                <div className="text-xs sm:text-sm font-bold text-[#C53B4B] dark:text-[#F06B78] font-mono">
                  {formatCurrency(totalLiabilities, globalCurrency)}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Trajectory Ribbon */}
          <div className="mt-5 sm:mt-6 pt-4 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="rounded-xl bg-[#F6F8FB] dark:bg-[#181D24] p-2.5 sm:p-3 border border-[#D9E1EC]/50 dark:border-[#2A313A]/50 min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D] truncate">Monthly Inflow</div>
              <div className="text-sm sm:text-base font-bold text-[#0E8A73] dark:text-[#2BC7A4] font-mono mt-0.5 truncate">
                +{formatCurrency(mtdIncome, globalCurrency)}
              </div>
            </div>
            <div className="rounded-xl bg-[#F6F8FB] dark:bg-[#181D24] p-2.5 sm:p-3 border border-[#D9E1EC]/50 dark:border-[#2A313A]/50 min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D] truncate">Monthly Outflow</div>
              <div className="text-sm sm:text-base font-bold text-[#C53B4B] dark:text-[#F06B78] font-mono mt-0.5 truncate">
                -{formatCurrency(mtdExpense, globalCurrency)}
              </div>
            </div>
            <div className="rounded-xl bg-[#F6F8FB] dark:bg-[#181D24] p-2.5 sm:p-3 border border-[#D9E1EC]/50 dark:border-[#2A313A]/50 min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D] truncate">Net Cash Flow</div>
              <div className={`text-sm sm:text-base font-bold font-mono mt-0.5 truncate ${netCashFlow >= 0 ? 'text-[#0E8A73] dark:text-[#2BC7A4]' : 'text-[#C53B4B] dark:text-[#F06B78]'}`}>
                {netCashFlow >= 0 ? '+' : ''}{formatCurrency(netCashFlow, globalCurrency)}
              </div>
            </div>
            <div className="rounded-xl bg-[#F6F8FB] dark:bg-[#181D24] p-2.5 sm:p-3 border border-[#D9E1EC]/50 dark:border-[#2A313A]/50 min-w-0">
              <div className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D] truncate">Savings Rate</div>
              <div className="text-sm sm:text-base font-bold text-[#356AE6] dark:text-[#5B8CFF] font-mono mt-0.5 truncate">
                {savingsRate}%
              </div>
            </div>
          </div>
        </div>

        {/* 4-Column Quick Money Flow Card */}
        <div className="lg:col-span-4 rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-5 sm:p-6 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                Monthly Flow Summary
              </span>
              <Activity className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF]" />
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(24,184,154,0.1)] dark:bg-[rgba(40,199,167,0.15)] text-[#18B89A] dark:text-[#2BC7A4]">
                    <ArrowDownLeft className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">Total Income</div>
                    <div className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">Recorded Inflows</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#0E8A73] dark:text-[#2BC7A4] font-mono">
                  +{formatCurrency(mtdIncome, globalCurrency)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(224,90,103,0.1)] dark:bg-[rgba(240,107,120,0.15)] text-[#E05A67] dark:text-[#F06B78]">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">Total Expenses</div>
                    <div className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">Categorized Outflows</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-[#C53B4B] dark:text-[#F06B78] font-mono">
                  -{formatCurrency(mtdExpense, globalCurrency)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
            <Link
              to="/reports"
              className="flex items-center justify-between text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline"
            >
              <span>Explore Financial Reports</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── ROW 2: 12-COLUMN ACTIVITY CHART & QUICK LIQUIDITY ─── */}
      <div className="grid gap-4 lg:grid-cols-12 min-w-0">
        {/* Dominant 8-Column Interactive Financial Activity Chart */}
        <div className="lg:col-span-8 rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-4 sm:p-5 shadow-sm space-y-4 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Financial Activity</h3>
              <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">Monthly income vs expense breakdown</p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#18B89A] dark:bg-[#2BC7A4]" />
                <span className="text-[#475467] dark:text-[#B7C0CC] font-semibold text-[11px]">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-[#101828] dark:bg-[#5B8CFF]" />
                <span className="text-[#475467] dark:text-[#B7C0CC] font-semibold text-[11px]">Expense</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart Visualization Bars */}
          <div className="w-full overflow-x-auto">
            <div className="h-56 min-w-80 w-full flex items-end justify-between gap-2 sm:gap-3 pt-6 px-1 sm:px-2">
              {chartData.map((d, index) => {
                const incHeight = maxChartVal > 0 ? (d.income / maxChartVal) * 100 : 0;
                const expHeight = maxChartVal > 0 ? (d.expense / maxChartVal) * 100 : 0;
                const isHovered = hoveredBarIndex === index;

                return (
                  <div
                    key={d.label}
                    onMouseEnter={() => setHoveredBarIndex(index)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                    className="relative flex-1 flex flex-col items-center h-full justify-end group cursor-pointer min-w-0"
                  >
                    {/* Tooltip Overlay */}
                    {isHovered && (
                      <div className="absolute -top-14 z-20 rounded-lg bg-[#101828] dark:bg-[#181D24] border border-transparent dark:border-[#2A313A] px-2.5 py-1.5 text-[10px] text-white dark:text-[#F3F4F6] shadow-lg pointer-events-none whitespace-nowrap">
                        <div className="font-bold">{d.label}</div>
                        <div className="font-mono text-[#18B89A] dark:text-[#2BC7A4]">+{formatCurrency(d.income, globalCurrency)}</div>
                        <div className="font-mono text-[#E05A67] dark:text-[#F06B78]">-{formatCurrency(d.expense, globalCurrency)}</div>
                      </div>
                    )}

                    <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-44">
                      {/* Income Bar */}
                      <div
                        style={{ height: `${Math.max(incHeight, 6)}%` }}
                        className="w-full max-w-5 sm:max-w-6 rounded-t-md bg-[#18B89A] dark:bg-[#2BC7A4] transition-all duration-300 group-hover:brightness-110"
                      />
                      {/* Expense Bar */}
                      <div
                        style={{ height: `${Math.max(expHeight, 6)}%` }}
                        className="w-full max-w-5 sm:max-w-6 rounded-t-md bg-[#101828] dark:bg-[#5B8CFF] transition-all duration-300 group-hover:brightness-125"
                      />
                    </div>

                    <span className="mt-2 text-[10px] sm:text-[11px] font-bold text-[#475467] dark:text-[#B7C0CC] group-hover:text-[#101828] dark:group-hover:text-[#F3F4F6] transition-colors truncate">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4-Column Household Accounts Panel */}
        <div className="lg:col-span-4 rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-4 sm:p-5 shadow-sm flex flex-col justify-between min-w-0">
          <div>
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Household Accounts</h3>
                <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">Click account to view activity</p>
              </div>
              <Link
                to="/accounts"
                className="text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-[#D9E1EC]/40 dark:divide-[#2A313A]/40">
              {accountsLoading ? (
                <div className="space-y-2 py-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                  No accounts configured yet.
                </div>
              ) : (
                accounts.slice(0, 5).map((acc) => (
                  <div
                    key={acc.id}
                    onClick={() => setSelectedAccount(acc)}
                    className="flex items-center justify-between py-2.5 hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] px-2 rounded-lg cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6] group-hover:bg-[#101828] dark:group-hover:bg-[#5B8CFF] group-hover:text-white transition-colors">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition-colors truncate">
                          {acc.name}
                        </div>
                        <div className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">{acc.type}</div>
                      </div>
                    </div>
                    <div className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono">
                      {formatCurrency(acc.balance, acc.currency || globalCurrency)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 flex items-center justify-between text-xs font-semibold text-[#475467] dark:text-[#B7C0CC]">
            <span>Total Accounts</span>
            <span className="font-mono font-bold text-[#101828] dark:text-[#F3F4F6]">{accounts.length} active</span>
          </div>
        </div>
      </div>

      {/* ─── ROW 3: 12-COLUMN RECENT TRANSACTIONS & PLANNING ─── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left 8 Columns: Recent Transactions Ledger */}
        <div className="lg:col-span-8 rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
            <div>
              <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Recent Transactions</h3>
              <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">
                Click any record to inspect or manage details
              </p>
            </div>
            <Link
              to="/transactions"
              className="flex items-center gap-1 text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline"
            >
              <span>Full ledger</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div>
            {txLoading ? (
              <div className="space-y-2 py-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                No transactions recorded yet in this household workspace.
              </div>
            ) : (
              <div className="divide-y divide-[#D9E1EC]/40 dark:divide-[#2A313A]/40">
                {transactions.slice(0, 8).map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="flex items-center justify-between py-2.5 hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] px-2.5 rounded-lg transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          tx.type === 'INCOME'
                            ? 'bg-[rgba(24,184,154,0.1)] dark:bg-[rgba(40,199,167,0.15)] text-[#18B89A] dark:text-[#2BC7A4]'
                            : tx.type === 'EXPENSE'
                              ? 'bg-[rgba(224,90,103,0.1)] dark:bg-[rgba(240,107,120,0.15)] text-[#E05A67] dark:text-[#F06B78]'
                              : 'bg-[#F0F4F8] dark:bg-[#181D24] text-[#475467] dark:text-[#B7C0CC]'
                        }`}
                      >
                        {tx.type === 'INCOME' ? (
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                        ) : tx.type === 'EXPENSE' ? (
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowRight className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition-colors truncate">
                          {tx.description}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#98A2B3] dark:text-[#858F9D] mt-0.5">
                          <span className="font-medium text-[#475467] dark:text-[#B7C0CC]">{tx.category?.name || 'Uncategorized'}</span>
                          <span>•</span>
                          <span>{tx.account?.name || 'Account'}</span>
                          <span>•</span>
                          <span className="font-mono">{new Date(tx.date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className={`text-xs font-bold tabular-nums text-right font-mono ${
                          tx.type === 'INCOME'
                            ? 'text-[#0E8A73] dark:text-[#2BC7A4]'
                            : tx.type === 'EXPENSE'
                              ? 'text-[#C53B4B] dark:text-[#F06B78]'
                              : 'text-[#101828] dark:text-[#F3F4F6]'
                        }`}
                      >
                        {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                        {formatCurrency(tx.amount, globalCurrency)}
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#98A2B3] dark:text-[#858F9D] group-hover:text-[#101828] dark:group-hover:text-[#F3F4F6] transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Columns: Budgets & Goals */}
        <div className="lg:col-span-4 space-y-4">
          {/* Budget Health Card */}
          <div className="rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Budget Overview</h3>
                <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">Monthly spending limits</p>
              </div>
              <Link
                to="/budgets"
                className="text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline flex items-center gap-1"
              >
                <span>Budgets</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div>
              {budgets.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                  No monthly budgets configured yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {budgets.slice(0, 3).map((b) => {
                    const spent = mtdExpense;
                    const percent = Math.min(Math.round((spent / b.amount) * 100), 100);
                    const isOver = spent > b.amount;
                    return (
                      <div
                        key={b.id}
                        onClick={() => navigate(`/transactions?type=EXPENSE`)}
                        className="space-y-1.5 p-2 rounded-lg hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] cursor-pointer transition"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#101828] dark:text-[#F3F4F6] hover:text-[#356AE6] dark:hover:text-[#5B8CFF] transition-colors">
                            {b.name}
                          </span>
                          <span className="text-[#475467] dark:text-[#B7C0CC] tabular-nums font-mono text-[11px]">
                            {percent}%
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0F4F8] dark:bg-[#181D24]">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver ? 'bg-[#E05A67] dark:bg-[#F06B78]' : percent > 80 ? 'bg-[#E7A83B] dark:bg-[#E8B24A]' : 'bg-[#101828] dark:bg-[#5B8CFF]'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#98A2B3] dark:text-[#858F9D] font-mono">
                          <span>Spent: {formatCurrency(spent, globalCurrency)}</span>
                          <span>Limit: {formatCurrency(b.amount, globalCurrency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Goals Milestone Card */}
          <div className="rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Savings Goals</h3>
                <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">Track progress toward targets</p>
              </div>
              <Link
                to="/goals"
                className="text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline flex items-center gap-1"
              >
                <span>Goals</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div>
              {goals.length === 0 ? (
                <div className="py-4 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                  No active savings goals defined.
                </div>
              ) : (
                <div className="space-y-3">
                  {goals.slice(0, 3).map((goal) => {
                    const percent = goal.percentComplete ?? 0;
                    return (
                      <div key={goal.id} className="space-y-1.5 p-2 rounded-lg bg-[#F6F8FB] dark:bg-[#181D24] border border-[#D9E1EC]/40 dark:border-[#2A313A]/40">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#101828] dark:text-[#F3F4F6]">{goal.name}</span>
                          <button
                            onClick={() => setContributeGoal(goal)}
                            className="text-[11px] font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline flex items-center gap-0.5"
                          >
                            <Plus className="h-3 w-3" />
                            <span>Add</span>
                          </button>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0] dark:bg-[#2A313A]">
                          <div
                            className="h-full rounded-full bg-[#18B89A] dark:bg-[#2BC7A4] transition-all duration-300"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#475467] dark:text-[#B7C0CC] font-mono">
                          <span>{formatCurrency(goal.currentAmount || 0, globalCurrency)}</span>
                          <span>{percent}% of {formatCurrency(goal.targetAmount, globalCurrency)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── TRANSACTION DETAIL DRAWER ─── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#101828]/40 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-200">
          <div className="animate-drawer-slide w-full sm:max-w-md bg-white dark:bg-[#11151B] h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedTx.type === 'INCOME' ? 'income' : selectedTx.type === 'EXPENSE' ? 'expense' : 'info'}>
                    {selectedTx.type}
                  </Badge>
                  <span className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">Transaction Details</span>
                </div>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 sm:mt-5 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D]">Amount</span>
                  <div className={`text-2xl sm:text-3xl font-extrabold font-mono tabular-nums mt-0.5 ${
                    selectedTx.type === 'INCOME' ? 'text-[#0E8A73] dark:text-[#2BC7A4]' : selectedTx.type === 'EXPENSE' ? 'text-[#C53B4B] dark:text-[#F06B78]' : 'text-[#101828] dark:text-[#F3F4F6]'
                  }`}>
                    {selectedTx.type === 'EXPENSE' ? '-' : selectedTx.type === 'INCOME' ? '+' : ''}
                    {formatCurrency(selectedTx.amount, globalCurrency)}
                  </div>
                </div>

                <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Description</span>
                    <strong className="text-[#101828] dark:text-[#F3F4F6] text-right truncate max-w-50">{selectedTx.description}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Category</span>
                    <strong className="text-[#101828] dark:text-[#F3F4F6]">{selectedTx.category?.name || 'Uncategorized'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Account</span>
                    <strong className="text-[#101828] dark:text-[#F3F4F6]">{selectedTx.account?.name || 'Account'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Date</span>
                    <strong className="font-mono text-[#101828] dark:text-[#F3F4F6]">{new Date(selectedTx.date).toLocaleDateString()}</strong>
                  </div>
                </div>

                <div className="rounded-lg border border-[rgba(24,184,154,0.2)] dark:border-[rgba(40,199,167,0.3)] bg-[rgba(24,184,154,0.06)] dark:bg-[rgba(40,199,167,0.1)] p-3 text-[11px] text-[#0E8A73] dark:text-[#2BC7A4] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#18B89A] dark:text-[#2BC7A4]" />
                  <span>Your financial data is protected.</span>
                </div>
              </div>
            </div>

            <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-4 mt-6 flex items-center justify-between">
              <Button
                variant="dangerOutline"
                size="sm"
                onClick={async () => {
                  if (confirm('Delete this transaction entry?')) {
                    await deleteTx.mutateAsync(selectedTx.id);
                    setSelectedTx(null);
                  }
                }}
                isLoading={deleteTx.isPending}
                className="text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span>Delete Entry</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTx(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ACCOUNT DETAIL DRAWER ─── */}
      {selectedAccount && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#101828]/40 dark:bg-black/70 backdrop-blur-xs transition-opacity duration-200">
          <div className="animate-drawer-slide w-full sm:max-w-md bg-white dark:bg-[#11151B] h-full shadow-2xl flex flex-col justify-between p-5 sm:p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6]">
                    <Building className="h-3.5 w-3.5" />
                  </div>
                  <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6] truncate max-w-55">{selectedAccount.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedAccount(null)}
                  className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 sm:mt-5 space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D]">Current Balance</span>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#101828] dark:text-[#F3F4F6] tabular-nums mt-0.5">
                    {formatCurrency(selectedAccount.balance, selectedAccount.currency || globalCurrency)}
                  </div>
                </div>

                <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-3.5 space-y-2.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Account Type</span>
                    <strong className="text-[#101828] dark:text-[#F3F4F6]">{selectedAccount.type}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Currency</span>
                    <strong className="font-mono text-[#101828] dark:text-[#F3F4F6]">{selectedAccount.currency || globalCurrency}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475467] dark:text-[#B7C0CC]">Status</span>
                    <Badge variant={selectedAccount.isActive ? 'neutral' : 'outline'} size="sm">
                      {selectedAccount.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-4 mt-6 flex items-center justify-between">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedAccount(null);
                  navigate(`/transactions?accountId=${selectedAccount.id}`);
                }}
                className="text-xs"
              >
                <span>Filter Transactions</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAccount(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── GOAL CONTRIBUTION DIALOG ─── */}
      {contributeGoal && (
        <GoalContributeModal
          goal={contributeGoal}
          currency={globalCurrency}
          onClose={() => setContributeGoal(null)}
          onSave={async (cents) => {
            await updateGoal.mutateAsync({
              id: contributeGoal.id,
              currentAmount: (contributeGoal.currentAmount || 0) + cents,
            });
            setContributeGoal(null);
          }}
        />
      )}

      {/* ─── QUICK TRANSACTION MODAL ─── */}
      {showQuickTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 dark:bg-black/70 backdrop-blur-xs p-4">
          <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Record Entry</h3>
              <button
                onClick={() => setShowQuickTxModal(false)}
                className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAdd} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTxForm((f) => ({ ...f, type: 'EXPENSE' }))}
                  className={`rounded-md py-1 font-semibold transition ${
                    txForm.type === 'EXPENSE'
                      ? 'bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#F3F4F6] shadow-2xs font-bold'
                      : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setTxForm((f) => ({ ...f, type: 'INCOME' }))}
                  className={`rounded-md py-1 font-semibold transition ${
                    txForm.type === 'INCOME'
                      ? 'bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#F3F4F6] shadow-2xs font-bold'
                      : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                  Amount ({globalCurrency})
                </label>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  required
                  autoFocus
                  value={txForm.amount}
                  onChange={(e) => setTxForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Description</label>
                <Input
                  required
                  value={txForm.description}
                  onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Utility Bills, Supermarket..."
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Account</label>
                  <select
                    value={txForm.accountId}
                    onChange={(e) => setTxForm((f) => ({ ...f, accountId: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                    required
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, a.currency || globalCurrency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Category</label>
                  <select
                    value={txForm.categoryId}
                    onChange={(e) => setTxForm((f) => ({ ...f, categoryId: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                  >
                    <option value="">Optional Category</option>
                    {categories?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickTxModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={createTx.isPending}
                  disabled={!txForm.accountId || !txForm.amount || !txForm.description}
                  className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12]"
                >
                  Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── QUICK TRANSFER MODAL ─── */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 dark:bg-black/70 backdrop-blur-xs p-4">
          <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF]" />
                <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Transfer Funds</h3>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">From Account</label>
                  <select
                    value={transferForm.sourceAccountId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, sourceAccountId: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                    required
                  >
                    <option value="">Select Source</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balance, a.currency || globalCurrency)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">To Account</label>
                  <select
                    value={transferForm.targetAccountId}
                    onChange={(e) => setTransferForm((f) => ({ ...f, targetAccountId: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                    required
                  >
                    <option value="">Select Target</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id} disabled={a.id === transferForm.sourceAccountId}>
                        {a.name} ({formatCurrency(a.balance, a.currency || globalCurrency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                  Transfer Amount ({globalCurrency})
                </label>
                <Input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Description / Memo</label>
                <Input
                  value={transferForm.description}
                  onChange={(e) => setTransferForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Internal account transfer"
                  className="text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTransferModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={createTx.isPending}
                  disabled={!transferForm.sourceAccountId || !transferForm.targetAccountId || !transferForm.amount}
                  className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12]"
                >
                  Execute Transfer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function GoalContributeModal({
  goal,
  currency,
  onClose,
  onSave,
}: {
  goal: FinancialGoal;
  currency: string;
  onClose: () => void;
  onSave: (cents: number) => Promise<void>;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) return;
    setLoading(true);
    await onSave(cents);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 dark:bg-black/70 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-sm rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
          <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Contribute to {goal.name}</h3>
          <button onClick={onClose} className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="rounded-lg bg-[#F6F8FB] dark:bg-[#181D24] p-2.5 text-xs text-[#475467] dark:text-[#B7C0CC]">
            Currently saved: <strong className="font-mono text-[#101828] dark:text-[#F3F4F6]">{formatCurrency(goal.currentAmount || 0, currency)}</strong> of{' '}
            <strong className="font-mono text-[#101828] dark:text-[#F3F4F6]">{formatCurrency(goal.targetAmount, currency)}</strong>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Contribution Amount ({currency})
            </label>
            <Input
              type="number"
              step="any"
              min="1"
              required
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="font-mono text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={loading}
              className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12]"
            >
              Add Funds
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
