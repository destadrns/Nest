import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { useBudgets, useCreateBudget, useDeleteBudget } from '@/hooks/use-budgets';
import { useCategories } from '@/hooks/use-transactions';
import { Budget, BudgetPeriod } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react';

export function BudgetsPage() {
  const navigate = useNavigate();
  const { currentFamily } = useAppStore();
  const { data: budgets, isLoading } = useBudgets(currentFamily?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<string>('ALL');

  if (!currentFamily) {
    return (
      <EmptyState
        icon={PieChart}
        title="No Household Active"
        description="Select or create a household workspace to configure budget limits."
      />
    );
  }

  const budgetList = budgets ?? [];
  const filteredBudgets =
    periodFilter === 'ALL' ? budgetList : budgetList.filter((b) => b.period === periodFilter);

  const totalCap = budgetList.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgetList.reduce((sum, b) => sum + (b.totalSpent || 0), 0);
  const overBudgetCount = budgetList.filter((b) => (b.percentUsed || 0) >= 100).length;

  return (
    <div className="space-y-4 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A] pb-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-xl truncate">
            Budgets & Spending Limits
          </h1>
          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Set deliberate household expenditure limits by period and category.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 shadow-xs font-bold text-xs h-8 bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Budget</span>
        </Button>
      </div>

      {/* Aggregate Budget Metrics */}
      <div className="grid gap-3 sm:grid-cols-3 min-w-0">
        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">
            Total Monthly Limit
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono truncate">
            {formatCurrency(totalCap, currentFamily.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            {budgetList.length} defined budget caps
          </span>
        </div>

        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">
            Total Spent
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#C53B4B] dark:text-[#F06B78] tabular-nums font-mono truncate">
            {formatCurrency(totalSpent, currentFamily.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            {totalCap > 0 ? Math.round((totalSpent / totalCap) * 100) : 0}% of budget spent
          </span>
        </div>

        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC]">
            Budget Health
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`text-xl font-bold tabular-nums font-mono ${
                overBudgetCount > 0
                  ? 'text-[#E05A67] dark:text-[#F06B78]'
                  : 'text-[#0E8A73] dark:text-[#2BC7A4]'
              }`}
            >
              {overBudgetCount > 0 ? `${overBudgetCount} Over Limit` : 'All On Track'}
            </span>
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            {overBudgetCount > 0 ? 'Adjust limits or reduce spending' : 'Healthy expenditure pace'}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-0.5 text-xs shadow-2xs">
          {['ALL', 'MONTHLY', 'WEEKLY', 'YEARLY'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                periodFilter === p
                  ? 'bg-[#101828] dark:bg-[#5B8CFF] text-white shadow-2xs'
                  : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
              }`}
            >
              {p === 'ALL' ? 'All Periods' : p.charAt(0) + p.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filteredBudgets.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No Budgets Defined"
          description="Establish monthly or weekly spending limits to guard against lifestyle creep."
          actionLabel="Create Budget"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredBudgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              familyId={currentFamily.id}
              currency={currentFamily.currency}
              onDrillDown={() => {
                navigate(
                  budget.categoryId
                    ? `/transactions?categoryId=${budget.categoryId}&type=EXPENSE`
                    : `/transactions?type=EXPENSE`,
                );
              }}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBudgetModal
          familyId={currentFamily.id}
          currency={currentFamily.currency}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function BudgetCard({
  budget,
  familyId,
  currency,
  onDrillDown,
}: {
  budget: Budget;
  familyId: string;
  currency: string;
  onDrillDown: () => void;
}) {
  const deleteBudget = useDeleteBudget(familyId);
  const percent = budget.percentUsed ?? 0;
  const isOver = percent >= 100;
  const isWarning = percent >= 80 && !isOver;

  return (
    <div className="group flex flex-col justify-between rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-4 shadow-2xs space-y-3 transition hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition">
            {budget.name}
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-[#98A2B3] dark:text-[#858F9D] mt-0.5">
            <span className="font-semibold text-[#475467] dark:text-[#B7C0CC]">
              {budget.period}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 font-mono">
              <Calendar className="h-3 w-3" />
              {new Date(budget.startDate).toLocaleDateString()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isOver && (
            <Badge variant="expense" size="sm">
              <AlertTriangle className="h-3 w-3" /> Over Budget
            </Badge>
          )}
          {isWarning && (
            <Badge variant="warning" size="sm">
              {percent}% Used
            </Badge>
          )}
          {!isOver && !isWarning && (
            <Badge variant="income" size="sm">
              <CheckCircle2 className="h-3 w-3" /> On Track
            </Badge>
          )}

          <button
            onClick={() => {
              if (confirm(`Delete budget "${budget.name}"?`)) {
                deleteBudget.mutate(budget.id);
              }
            }}
            disabled={deleteBudget.isPending}
            className="rounded p-1 text-[#98A2B3] hover:bg-[#F0F4F8] hover:text-[#E05A67] dark:hover:bg-[#181D24] dark:hover:text-[#F06B78] transition"
            title="Delete budget"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-[#475467] dark:text-[#B7C0CC] text-[11px]">
            Spent:{' '}
            <strong className="font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono">
              {formatCurrency(budget.totalSpent ?? 0, currency)}
            </strong>
          </span>
          <span className="text-[#475467] dark:text-[#B7C0CC] text-[11px]">
            Cap:{' '}
            <strong className="font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono">
              {formatCurrency(budget.amount, currency)}
            </strong>
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F4F8] dark:bg-[#181D24]">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOver
                ? 'bg-[#E05A67] dark:bg-[#F06B78]'
                : isWarning
                  ? 'bg-[#E7A83B] dark:bg-[#EAB04A]'
                  : 'bg-[#101828] dark:bg-[#5B8CFF]'
            }`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-[#475467] dark:text-[#B7C0CC] pt-0.5">
          <span>{percent}% allocated</span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums font-bold text-[#101828] dark:text-[#F3F4F6] font-mono">
              {formatCurrency(Math.max(0, budget.remaining ?? 0), currency)} available
            </span>
            <button
              onClick={onDrillDown}
              className="text-[#356AE6] dark:text-[#5B8CFF] hover:underline font-semibold flex items-center gap-0.5 ml-1"
            >
              <span>Transactions</span>
              <ExternalLink className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateBudgetModal({
  familyId,
  currency,
  onClose,
}: {
  familyId: string;
  currency: string;
  onClose: () => void;
}) {
  const createBudget = useCreateBudget(familyId);
  const { data: categories } = useCategories(familyId);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('MONTHLY');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      await createBudget.mutateAsync({
        name,
        period,
        amount: cents,
        startDate,
        categoryId: categoryId || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create budget');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A] pb-3">
          <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Create Budget</h3>
          <button
            onClick={onClose}
            className="btn-tactile rounded-md p-1 text-[#98A2B3] hover:bg-[#F0F4F8] hover:text-[#101828] dark:hover:bg-[#181D24] dark:hover:text-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-[#E05A67]/30 bg-[rgba(224,90,103,0.08)] p-2.5 text-xs text-[#C53B4B] dark:text-[#F06B78]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Budget Label
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Living Expenses, Groceries Limit"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                Period
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as BudgetPeriod)}
                className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
              >
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly</option>
                <option value="YEARLY">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                Limit Amount ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="2500.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Category (Optional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
            >
              <option value="">All Categories (Global Household Cap)</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Effective Start Date
            </label>
            <Input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createBudget.isPending}
              disabled={!name.trim() || !amount}
              className="bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white"
            >
              Save Budget
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
