import { useState, type FormEvent } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/use-goals';
import type { FinancialGoal } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, Plus, Trash2, CheckCircle2, Calendar, DollarSign, X, Edit2 } from 'lucide-react';

export function GoalsPage() {
  const { currentFamily } = useAppStore();
  const { data: goals, isLoading } = useGoals(currentFamily?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  if (!currentFamily) {
    return (
      <EmptyState
        icon={Target}
        title="No Household Active"
        description="Select or create a household workspace to establish long-term savings goals."
      />
    );
  }

  const goalList = goals ?? [];
  const filteredGoals =
    filterTab === 'ALL'
      ? goalList
      : filterTab === 'COMPLETED'
        ? goalList.filter((g) => g.status === 'COMPLETED' || (g.percentComplete ?? 0) >= 100)
        : goalList.filter((g) => g.status !== 'COMPLETED' && (g.percentComplete ?? 0) < 100);

  const totalTarget = goalList.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goalList.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  const completedCount = goalList.filter((g) => (g.percentComplete ?? 0) >= 100).length;

  return (
    <div className="space-y-4 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A] pb-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-xl truncate">
            Financial Goals & Milestones
          </h1>
          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Track family emergency funds, debt settlements, and wealth milestones.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 shadow-xs font-bold text-xs h-8 bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Goal</span>
        </Button>
      </div>

      {/* Aggregate Goal Snapshot Ribbon */}
      <div className="grid gap-3 sm:grid-cols-3 min-w-0">
        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">
            Total Saved
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#0E8A73] dark:text-[#2BC7A4] tabular-nums font-mono truncate">
            {formatCurrency(totalSaved, currentFamily.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}% of all milestone
            targets
          </span>
        </div>

        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">
            Aggregate Target Goal
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono truncate">
            {formatCurrency(totalTarget, currentFamily.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            {goalList.length} defined family milestones
          </span>
        </div>

        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">
            Completed Milestones
          </span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#356AE6] dark:text-[#5B8CFF] tabular-nums font-mono truncate">
            {completedCount} of {goalList.length}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">
            {goalList.length - completedCount} milestones in active funding
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
        <div className="flex rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-0.5 text-xs shadow-2xs shrink-0">
          <button
            onClick={() => setFilterTab('ALL')}
            className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
              filterTab === 'ALL'
                ? 'bg-[#101828] dark:bg-[#5B8CFF] text-white shadow-2xs'
                : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
            }`}
          >
            All Goals ({goalList.length})
          </button>
          <button
            onClick={() => setFilterTab('ACTIVE')}
            className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
              filterTab === 'ACTIVE'
                ? 'bg-[#101828] dark:bg-[#5B8CFF] text-white shadow-2xs'
                : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
            }`}
          >
            In Progress ({goalList.length - completedCount})
          </button>
          <button
            onClick={() => setFilterTab('COMPLETED')}
            className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
              filterTab === 'COMPLETED'
                ? 'bg-[#101828] dark:bg-[#5B8CFF] text-white shadow-2xs'
                : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No Financial Goals Found"
          description={
            filterTab !== 'ALL'
              ? 'No goals matched this status tab.'
              : 'Create savings targets like Emergency Fund (6-months expenses) or Asset Milestones.'
          }
          actionLabel="Create Goal"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              familyId={currentFamily.id}
              currency={currentFamily.currency}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateGoalModal
          familyId={currentFamily.id}
          currency={currentFamily.currency}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}

function GoalCard({
  goal,
  familyId,
  currency,
}: {
  goal: FinancialGoal;
  familyId: string;
  currency: string;
}) {
  const updateGoal = useUpdateGoal(familyId);
  const deleteGoal = useDeleteGoal(familyId);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState((goal.targetAmount / 100).toString());

  const percent = goal.percentComplete ?? 0;
  const isCompleted = goal.status === 'COMPLETED' || percent >= 100;

  const handleAddFunds = async (e: FormEvent) => {
    e.preventDefault();
    const cents = Math.round(parseFloat(addAmount) * 100);
    if (isNaN(cents) || cents <= 0) return;

    await updateGoal.mutateAsync({
      id: goal.id,
      currentAmount: (goal.currentAmount || 0) + cents,
    });
    setAddAmount('');
    setShowAddMoney(false);
  };

  const handleSaveEdit = async (e: FormEvent) => {
    e.preventDefault();
    const targetCents = Math.round(parseFloat(targetAmount) * 100);
    if (isNaN(targetCents) || targetCents <= 0) return;

    await updateGoal.mutateAsync({
      id: goal.id,
      name,
      targetAmount: targetCents,
    });
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col justify-between rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-4 shadow-2xs space-y-3 transition hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-2">
            {!isEditing ? (
              <>
                <h3 className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] truncate">
                  {goal.name}
                </h3>
                {goal.description && (
                  <p className="mt-0.5 text-[11px] text-[#475467] dark:text-[#B7C0CC] line-clamp-2">
                    {goal.description}
                  </p>
                )}
              </>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-7 text-xs"
                  required
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="h-7 font-mono text-xs"
                  required
                />
                <div className="flex gap-1">
                  <Button
                    type="submit"
                    size="xs"
                    className="h-6 bg-[#101828] dark:bg-[#5B8CFF] dark:text-white"
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setIsEditing(false)}
                    className="h-6"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isCompleted ? (
              <Badge variant="income" size="sm">
                <CheckCircle2 className="h-3 w-3" /> Funded
              </Badge>
            ) : (
              <Badge variant="brand" size="sm">
                {percent}%
              </Badge>
            )}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="rounded p-1 text-[#98A2B3] hover:bg-[#F0F4F8] hover:text-[#101828] dark:hover:bg-[#181D24] dark:hover:text-[#F3F4F6] transition"
              title="Edit goal"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Delete goal "${goal.name}"?`)) {
                  deleteGoal.mutate(goal.id);
                }
              }}
              disabled={deleteGoal.isPending}
              className="rounded p-1 text-[#98A2B3] hover:bg-[#F0F4F8] hover:text-[#E05A67] dark:hover:bg-[#181D24] dark:hover:text-[#F06B78] transition"
              title="Delete goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono">
              {formatCurrency(goal.currentAmount || 0, currency)}
            </span>
            <span className="text-[#98A2B3] dark:text-[#858F9D] tabular-nums font-mono text-[11px]">
              of {formatCurrency(goal.targetAmount, currency)}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F0F4F8] dark:bg-[#181D24]">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isCompleted ? 'bg-[#18B89A] dark:bg-[#2BC7A4]' : 'bg-[#101828] dark:bg-[#5B8CFF]'
              }`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#98A2B3] dark:text-[#858F9D] pt-0.5 font-mono">
            {goal.targetDate ? (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Target: {new Date(goal.targetDate).toLocaleDateString()}</span>
              </span>
            ) : (
              <span>Ongoing Target</span>
            )}
            <span className="text-[#475467] dark:text-[#B7C0CC] font-semibold">
              {formatCurrency(Math.max(0, goal.targetAmount - (goal.currentAmount || 0)), currency)}{' '}
              left
            </span>
          </div>
        </div>
      </div>

      {!isCompleted && (
        <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A] pt-2.5">
          {showAddMoney ? (
            <form onSubmit={handleAddFunds} className="flex gap-1.5">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                autoFocus
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Amount"
                className="h-7 text-xs font-mono"
              />
              <Button
                type="submit"
                size="xs"
                isLoading={updateGoal.isPending}
                className="h-7 bg-[#101828] dark:bg-[#5B8CFF] dark:text-white"
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setShowAddMoney(false)}
                className="h-7"
              >
                Cancel
              </Button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddMoney(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline transition"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Contribute Funds</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CreateGoalModal({
  familyId,
  currency,
  onClose,
}: {
  familyId: string;
  currency: string;
  onClose: () => void;
}) {
  const createGoal = useCreateGoal(familyId);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const targetCents = Math.round(parseFloat(targetAmount) * 100);
    const initialCents = currentAmount ? Math.round(parseFloat(currentAmount) * 100) : 0;

    if (isNaN(targetCents) || targetCents <= 0) {
      setError('Please enter a valid target amount');
      return;
    }

    try {
      await createGoal.mutateAsync({
        name,
        description: description || undefined,
        targetAmount: targetCents,
        currentAmount: initialCents,
        targetDate: targetDate || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create goal');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A] pb-3">
          <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Create Goal</h3>
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
              Goal Name
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Fund, Home Renovation"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                Target ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="10000.00"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                Current Saved ({currency})
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Target Deadline (Optional)
            </label>
            <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Description / Notes (Optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 6 months of fixed household overhead"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createGoal.isPending}
              disabled={!name.trim() || !targetAmount}
              className="bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white"
            >
              Save Goal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
