import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import {
  useCategorySpending,
  useIncomeVsExpense,
  useMonthlyTrend,
  useAccountSummary,
} from '@/hooks/use-reports';
import { formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

type PeriodPreset = 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';

export function ReportsPage() {
  const navigate = useNavigate();
  const { currentFamily } = useAppStore();

  const now = new Date();
  const currentYearStart = `${now.getFullYear()}-01-01`;
  const currentYearEnd = `${now.getFullYear()}-12-31`;

  const [preset, setPreset] = useState<PeriodPreset>('THIS_YEAR');
  const [from, setFrom] = useState(currentYearStart);
  const [to, setTo] = useState(currentYearEnd);

  const setPeriodPreset = (p: PeriodPreset) => {
    setPreset(p);
    const d = new Date();
    if (p === 'THIS_MONTH') {
      const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]!;
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]!;
      setFrom(start);
      setTo(end);
    } else if (p === 'LAST_MONTH') {
      const start = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0]!;
      const end = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0]!;
      setFrom(start);
      setTo(end);
    } else if (p === 'THIS_QUARTER') {
      const q = Math.floor(d.getMonth() / 3);
      const start = new Date(d.getFullYear(), q * 3, 1).toISOString().split('T')[0]!;
      const end = new Date(d.getFullYear(), (q + 1) * 3, 0).toISOString().split('T')[0]!;
      setFrom(start);
      setTo(end);
    } else if (p === 'THIS_YEAR') {
      setFrom(`${d.getFullYear()}-01-01`);
      setTo(`${d.getFullYear()}-12-31`);
    }
  };

  const { data: categorySpending, isLoading: loadingCat } = useCategorySpending(
    currentFamily?.id,
    from,
    to,
  );
  const { data: incomeVsExpense, isLoading: loadingIvE } = useIncomeVsExpense(
    currentFamily?.id,
    from,
    to,
  );
  const { data: monthlyTrend, isLoading: loadingTrend } = useMonthlyTrend(currentFamily?.id, 12);
  const { data: accountSummary, isLoading: loadingSummary } = useAccountSummary(currentFamily?.id);

  if (!currentFamily) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Household Active"
        description="Select or create a household workspace to review financial reports and analytics."
      />
    );
  }

  return (
    <div className="space-y-4 min-w-0">
      {/* Header & Date Range Toolbar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A] pb-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-xl truncate">
            Financial Intelligence & Reports
          </h1>
          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Household cash flow distributions, savings rate, and historical ledger cadence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="flex rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-0.5 text-xs shadow-2xs shrink-0">
            {(
              [
                { id: 'THIS_MONTH', label: 'Month' },
                { id: 'LAST_MONTH', label: 'Last Mo' },
                { id: 'THIS_QUARTER', label: 'Quarter' },
                { id: 'THIS_YEAR', label: 'Year' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setPeriodPreset(item.id)}
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                  preset === item.id
                    ? 'bg-[#101828] dark:bg-[#5B8CFF] text-white shadow-2xs'
                    : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1 rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-1 shadow-2xs shrink-0">
            <Calendar className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#858F9D] ml-1 shrink-0" />
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset('CUSTOM');
              }}
              className="border-none bg-transparent px-1 py-0.5 text-xs text-[#101828] dark:text-[#F3F4F6] focus:outline-none font-mono"
            />
            <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">to</span>
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset('CUSTOM');
              }}
              className="border-none bg-transparent px-1 py-0.5 text-xs text-[#101828] dark:text-[#F3F4F6] focus:outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Ribbon with Clickable Drill-Downs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
        {/* Inflows */}
        <div
          onClick={() => navigate('/transactions?type=INCOME')}
          className="group rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs transition hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50 cursor-pointer min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition truncate">
              Period Inflows
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(24,184,154,0.12)] text-[#0E8A73] dark:text-[#28C7A7] shrink-0">
              <ArrowDownLeft className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#0E8A73] dark:text-[#28C7A7] tabular-nums font-mono truncate">
            {loadingIvE
              ? '...'
              : formatCurrency(incomeVsExpense?.income ?? 0, currentFamily.currency)}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            <span className="truncate">
              {incomeVsExpense?.incomeCount ?? 0} transaction inflows
            </span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </div>
        </div>

        {/* Outflows */}
        <div
          onClick={() => navigate('/transactions?type=EXPENSE')}
          className="group rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs transition hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50 cursor-pointer min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition truncate">
              Period Outflows
            </span>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(224,90,103,0.12)] text-[#C53B4B] dark:text-[#F06B78] shrink-0">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </div>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#C53B4B] dark:text-[#F06B78] tabular-nums font-mono truncate">
            {loadingIvE
              ? '...'
              : formatCurrency(incomeVsExpense?.expense ?? 0, currentFamily.currency)}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            <span className="truncate">
              {incomeVsExpense?.expenseCount ?? 0} transaction outflows
            </span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </div>
        </div>

        {/* Net Savings & Savings Rate */}
        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate">
              Net Retained Savings
            </span>
            <TrendingUp className="h-3.5 w-3.5 text-[#356AE6] dark:text-[#5B8CFF] shrink-0" />
          </div>
          <div
            className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums font-mono truncate ${
              (incomeVsExpense?.net ?? 0) >= 0
                ? 'text-[#101828] dark:text-[#F3F4F6]'
                : 'text-[#C53B4B] dark:text-[#F06B78]'
            }`}
          >
            {loadingIvE ? '...' : formatCurrency(incomeVsExpense?.net ?? 0, currentFamily.currency)}
          </div>
          <div className="mt-0.5 text-[10px] text-[#475467] dark:text-[#B7C0CC] truncate">
            Savings Rate:{' '}
            <strong className="font-bold text-[#101828] dark:text-[#F3F4F6] font-mono">
              {incomeVsExpense?.savingsRate ?? 0}%
            </strong>
          </div>
        </div>

        {/* Consolidated Net Worth */}
        <div
          onClick={() => navigate('/accounts')}
          className="group rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs transition hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50 cursor-pointer min-w-0"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition truncate">
              Total Net Worth
            </span>
            <Wallet className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#858F9D] shrink-0" />
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono truncate">
            {loadingSummary
              ? '...'
              : formatCurrency(accountSummary?.netWorth ?? 0, currentFamily.currency)}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            <span className="truncate">
              Assets: {formatCurrency(accountSummary?.totalAssets ?? 0, currentFamily.currency)}
            </span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition shrink-0" />
          </div>
        </div>
      </div>

      {/* Analytics Breakdown Grid */}
      <div className="grid gap-4 lg:grid-cols-2 min-w-0">
        {/* Categorical Spending Breakdown */}
        <Card className="border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xs min-w-0">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <PieChart className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF] shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
                Spending by Category
              </CardTitle>
              <p className="text-[10px] text-[#475467] dark:text-[#B7C0CC] truncate">
                Proportional expenditure allocation (Click to view transactions)
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-2 min-w-0">
            {loadingCat ? (
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : !categorySpending || categorySpending.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                No expense transactions recorded in this selected period.
              </div>
            ) : (
              <div className="space-y-3">
                {categorySpending.map((cat) => (
                  <div
                    key={cat.categoryId ?? 'uncategorized'}
                    onClick={() => {
                      if (cat.categoryId) {
                        navigate(`/transactions?categoryId=${cat.categoryId}&type=EXPENSE`);
                      } else {
                        navigate(`/transactions?type=EXPENSE`);
                      }
                    }}
                    className="group space-y-1 cursor-pointer rounded-lg p-1 transition hover:bg-[#F6F8FB] dark:hover:bg-[#181D24]"
                  >
                    <div className="flex justify-between text-xs gap-2">
                      <span className="font-semibold text-[#101828] dark:text-[#F3F4F6] text-[11px] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition flex items-center gap-1 min-w-0 truncate">
                        <span className="truncate">{cat.categoryName}</span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition shrink-0" />
                      </span>
                      <span className="text-[#475467] dark:text-[#B7C0CC] tabular-nums font-bold font-mono text-[11px] shrink-0">
                        {formatCurrency(cat.amount, currentFamily.currency)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F4F8] dark:bg-[#181D24]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color || '#356AE6',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 12-Month Historical Trend */}
        <Card className="border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xs min-w-0">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <BarChart3 className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF] shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
                12-Month Financial Trend
              </CardTitle>
              <p className="text-[10px] text-[#475467] dark:text-[#B7C0CC] truncate">
                Month-over-month cash flow cadence
              </p>
            </div>
          </CardHeader>
          <CardContent className="pt-2 min-w-0">
            {loadingTrend ? (
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : !monthlyTrend || monthlyTrend.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                Monthly trends appear automatically as you record transactions over time.
              </div>
            ) : (
              <div className="overflow-x-auto min-w-70">
                <table className="w-full text-left text-xs min-w-90">
                  <thead>
                    <tr className="border-b border-[#D9E1EC]/60 dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                      <th className="px-3 py-1.5">Month</th>
                      <th className="px-3 py-1.5 text-right">Inflow</th>
                      <th className="px-3 py-1.5 text-right">Outflow</th>
                      <th className="px-3 py-1.5 text-right">Net Flow</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D9E1EC]/40 dark:divide-[#2A313A] font-mono text-[11px]">
                    {monthlyTrend.map((row) => (
                      <tr
                        key={row.month}
                        className="hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] transition-colors"
                      >
                        <td className="px-3 py-2 font-sans font-semibold text-[#101828] dark:text-[#F3F4F6] text-xs whitespace-nowrap">
                          {row.month}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[#0E8A73] dark:text-[#28C7A7] tabular-nums whitespace-nowrap">
                          +{formatCurrency(row.income, currentFamily.currency)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-[#C53B4B] dark:text-[#F06B78] tabular-nums whitespace-nowrap">
                          -{formatCurrency(row.expense, currentFamily.currency)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-bold tabular-nums whitespace-nowrap ${
                            row.net >= 0
                              ? 'text-[#101828] dark:text-[#F3F4F6]'
                              : 'text-[#C53B4B] dark:text-[#F06B78]'
                          }`}
                        >
                          {row.net >= 0 ? '+' : ''}
                          {formatCurrency(row.net, currentFamily.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
