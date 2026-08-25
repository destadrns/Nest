import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import { useAccounts, useCreateAccount, useUpdateAccount } from '@/hooks/use-accounts';
import { useTransactions, useCreateTransaction } from '@/hooks/use-transactions';
import type { Account, AccountType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  CreditCard,
  Wallet,
  PiggyBank,
  TrendingUp,
  Plus,
  X,
  Landmark,
  Shield,
  Layers,
  ArrowRightLeft,
  Edit2,
  ExternalLink,
  History,
} from 'lucide-react';

const ACCOUNT_TYPES: { value: AccountType; label: string; icon: any }[] = [
  { value: 'CHECKING', label: 'Checking Account', icon: Building2 },
  { value: 'SAVINGS', label: 'High-Yield Savings', icon: PiggyBank },
  { value: 'CREDIT', label: 'Credit Card', icon: CreditCard },
  { value: 'CASH', label: 'Physical Cash', icon: Wallet },
  { value: 'INVESTMENT', label: 'Investment Portfolio', icon: TrendingUp },
  { value: 'LOAN', label: 'Loan / Mortgage', icon: Landmark },
  { value: 'OTHER', label: 'Other Asset / Liability', icon: Shield },
];

export function AccountsPage() {
  const navigate = useNavigate();
  const currentFamily = useAppStore((s) => s.currentFamily);
  const { data: res, isLoading } = useAccounts(currentFamily?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  const accounts = res?.data ?? [];

  const assetAccounts = accounts.filter((a) =>
    ['CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT', 'OTHER'].includes(a.type)
  );
  const liabilityAccounts = accounts.filter((a) => ['CREDIT', 'LOAN'].includes(a.type));

  const totalAssets = assetAccounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-4 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A]/80 pb-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-xl truncate">
            Accounts & Balances
          </h1>
          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Consolidated overview of banking accounts, credit facilities, and cash assets.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {accounts.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTransfer(true)}
              className="flex items-center gap-1.5 font-bold text-xs h-8"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Transfer</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 shadow-xs font-bold text-xs h-8 bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Account</span>
          </Button>
        </div>
      </div>

      {/* Financial Snapshot Balance Ribbon */}
      <div className="grid gap-3 sm:grid-cols-3 min-w-0">
        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">Total Liquid & Invested Assets</span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#101828] dark:text-[#F3F4F6] tabular-nums font-mono truncate">
            {formatCurrency(totalAssets, currentFamily?.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">{assetAccounts.length} asset accounts</span>
        </div>

        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">Total Liabilities & Credit Lines</span>
          <div className="mt-1 text-xl sm:text-2xl font-bold text-[#C53B4B] dark:text-[#F06B78] tabular-nums font-mono truncate">
            {formatCurrency(totalLiabilities, currentFamily?.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">{liabilityAccounts.length} credit/loan lines</span>
        </div>

        <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs min-w-0">
          <span className="text-[11px] font-semibold text-[#475467] dark:text-[#B7C0CC] truncate block">Consolidated Net Worth</span>
          <div
            className={`mt-1 text-xl sm:text-2xl font-bold tabular-nums font-mono truncate ${
              netWorth >= 0 ? 'text-[#0E8A73] dark:text-[#28C7A7]' : 'text-[#C53B4B] dark:text-[#F06B78]'
            }`}
          >
            {formatCurrency(netWorth, currentFamily?.currency)}
          </div>
          <span className="text-[10px] text-[#98A2B3] dark:text-[#858F9D]">Total assets minus liabilities</span>
        </div>
      </div>

      {/* Account Groups */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Accounts Configured"
          description="Add your checking accounts, credit cards, or cash wallets to begin recording ledger entries."
          actionLabel="Add Account"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-5">
          {/* Asset Section */}
          {assetAccounts.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                <span>Assets & Cash Reserves ({assetAccounts.length})</span>
                <span className="text-[#101828] dark:text-[#F3F4F6] font-bold font-mono">
                  {formatCurrency(totalAssets, currentFamily?.currency)}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {assetAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onClick={() => setSelectedAccount(account)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Liabilities Section */}
          {liabilityAccounts.length > 0 && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                <span>Credit Cards & Liabilities ({liabilityAccounts.length})</span>
                <span className="text-[#C53B4B] dark:text-[#F06B78] font-bold font-mono">
                  {formatCurrency(totalLiabilities, currentFamily?.currency)}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {liabilityAccounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    isLiability
                    onClick={() => setSelectedAccount(account)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Account Detail Drawer */}
      {selectedAccount && currentFamily && (
        <AccountDetailDrawer
          account={selectedAccount}
          familyId={currentFamily.id}
          onClose={() => setSelectedAccount(null)}
          onViewTransactions={() => {
            navigate(`/transactions?accountId=${selectedAccount.id}`);
            setSelectedAccount(null);
          }}
        />
      )}

      {/* Create Account Modal */}
      {showCreate && currentFamily && (
        <CreateAccountModal
          familyId={currentFamily.id}
          currency={currentFamily.currency}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Quick Transfer Modal */}
      {showTransfer && currentFamily && (
        <QuickTransferModal
          familyId={currentFamily.id}
          accounts={accounts}
          currency={currentFamily.currency}
          onClose={() => setShowTransfer(false)}
        />
      )}
    </div>
  );
}

function AccountCard({
  account,
  isLiability,
  onClick,
}: {
  account: Account;
  isLiability?: boolean;
  onClick: () => void;
}) {
  const typeDef = ACCOUNT_TYPES.find((t) => t.value === account.type) || {
    label: account.type,
    icon: Building2,
  };
  const Icon = typeDef.icon;

  return (
    <div
      onClick={onClick}
      className="group flex flex-col justify-between rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-3.5 shadow-2xs transition hover:border-[#356AE6]/50 dark:hover:border-[#5B8CFF]/50 hover:shadow-xs cursor-pointer"
    >
      <div>
        <div className="flex items-center justify-between">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6] group-hover:bg-[#E8F0FE] dark:group-hover:bg-[#5B8CFF]/20 group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition">
            <Icon className="h-3.5 w-3.5" />
          </div>
          <Badge variant={account.isActive ? 'neutral' : 'outline'} size="sm">
            {account.isActive ? 'Active' : 'Archived'}
          </Badge>
        </div>
        <div className="mt-2.5">
          <h3 className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6] group-hover:text-[#356AE6] dark:group-hover:text-[#5B8CFF] transition truncate">
            {account.name}
          </h3>
          <div className="text-[10px] text-[#475467] dark:text-[#B7C0CC]">
            {account.institution ? `${account.institution} · ` : ''}
            {typeDef.label}
          </div>
        </div>
      </div>
      <div className="mt-3 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-2 flex items-baseline justify-between">
        <span className="text-[9px] uppercase font-bold tracking-wider text-[#98A2B3] dark:text-[#858F9D]">Balance</span>
        <div
          className={`text-sm font-bold tabular-nums font-mono ${
            isLiability
              ? 'text-[#C53B4B] dark:text-[#F06B78]'
              : account.balance >= 0
                ? 'text-[#101828] dark:text-[#F3F4F6]'
                : 'text-[#C53B4B] dark:text-[#F06B78]'
          }`}
        >
          {formatCurrency(account.balance, account.currency)}
        </div>
      </div>
    </div>
  );
}

function AccountDetailDrawer({
  account,
  familyId,
  onClose,
  onViewTransactions,
}: {
  account: Account;
  familyId: string;
  onClose: () => void;
  onViewTransactions: () => void;
}) {
  const updateAccount = useUpdateAccount(familyId);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [institution, setInstitution] = useState(account.institution || '');
  const [isActive, setIsActive] = useState(account.isActive);

  // Fetch recent ledger activity for this account
  const { data: txRes, isLoading: loadingTx } = useTransactions(familyId, {
    accountId: account.id,
    limit: 5,
  });
  const recentTransactions = txRes?.data ?? [];

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await updateAccount.mutateAsync({
      id: account.id,
      name,
      institution: institution || undefined,
      isActive,
    });
    setIsEditing(false);
  };

  const typeDef = ACCOUNT_TYPES.find((t) => t.value === account.type) || {
    label: account.type,
    icon: Building2,
  };
  const Icon = typeDef.icon;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#101828]/40 dark:bg-[#0A0D12]/60 backdrop-blur-xs transition-opacity duration-200">
      <div className="animate-drawer-slide w-full max-w-md bg-white dark:bg-[#11151B] border-l border-[#D9E1EC] dark:border-[#2A313A] h-full shadow-2xl flex flex-col justify-between p-6">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] text-[#101828] dark:text-[#F3F4F6]">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">{account.name}</span>
                <span className="block text-[10px] text-[#98A2B3] dark:text-[#858F9D]">{typeDef.label}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!isEditing ? (
            <div className="mt-5 space-y-4">
              {/* Account Balance Card */}
              <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-4">
                <span className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D]">Current Balance</span>
                <div
                  className={`text-2xl font-extrabold font-mono tabular-nums mt-0.5 ${
                    ['CREDIT', 'LOAN'].includes(account.type)
                      ? 'text-[#C53B4B] dark:text-[#F06B78]'
                      : account.balance >= 0
                        ? 'text-[#101828] dark:text-[#F3F4F6]'
                        : 'text-[#C53B4B] dark:text-[#F06B78]'
                  }`}
                >
                  {formatCurrency(account.balance, account.currency)}
                </div>
                <div className="mt-2 text-xs text-[#475467] dark:text-[#B7C0CC] flex items-center justify-between">
                  <span>Institution: <strong className="text-[#101828] dark:text-[#F3F4F6] font-semibold">{account.institution || 'Direct / Cash'}</strong></span>
                  <Badge variant={account.isActive ? 'income' : 'outline'} size="sm">
                    {account.isActive ? 'Active Ledger' : 'Archived'}
                  </Badge>
                </div>
              </div>

              {/* Recent Account Activity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D] flex items-center gap-1.5">
                    <History className="h-3 w-3" />
                    <span>Recent Activity</span>
                  </span>
                  <button
                    onClick={onViewTransactions}
                    className="text-[11px] font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </button>
                </div>

                {loadingTx ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#D9E1EC] dark:border-[#2A313A] p-4 text-center text-xs text-[#98A2B3] dark:text-[#858F9D]">
                    No transactions recorded on this account.
                  </div>
                ) : (
                  <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] divide-y divide-[#D9E1EC]/60 dark:divide-[#2A313A]/60 overflow-hidden">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 text-xs hover:bg-[#F6F8FB] dark:hover:bg-[#181D24]">
                        <div>
                          <div className="font-semibold text-[#101828] dark:text-[#F3F4F6] text-xs">{tx.description}</div>
                          <div className="text-[10px] text-[#98A2B3] dark:text-[#858F9D] font-mono">
                            {new Date(tx.date).toLocaleDateString()} · {tx.category?.name || tx.type}
                          </div>
                        </div>
                        <div
                          className={`font-mono font-bold tabular-nums text-xs ${
                            tx.type === 'INCOME'
                              ? 'text-[#0E8A73] dark:text-[#28C7A7]'
                              : tx.type === 'EXPENSE'
                                ? 'text-[#C53B4B] dark:text-[#F06B78]'
                                : 'text-[#101828] dark:text-[#F3F4F6]'
                          }`}
                        >
                          {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                          {formatCurrency(tx.amount, account.currency)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Account Name</label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                  Financial Institution
                </label>
                <Input
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Bank Central Asia, Chase"
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] text-[#101828] dark:text-[#5B8CFF] focus:ring-[#101828] dark:focus:ring-[#5B8CFF]"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-medium text-[#101828] dark:text-[#F3F4F6]">
                  Active account (uncheck to archive)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="xs" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="xs" isLoading={updateAccount.isPending} className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0]">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-4 flex items-center justify-between">
          {!isEditing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs flex items-center gap-1"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit Account</span>
            </Button>
          ) : (
            <div />
          )}
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateAccountModal({
  familyId,
  currency,
  onClose,
}: {
  familyId: string;
  currency: string;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('0');
  const [error, setError] = useState('');
  const createAccount = useCreateAccount(familyId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createAccount.mutateAsync({
        name,
        type,
        currency,
        institution: institution || undefined,
        initialBalance: Math.round(parseFloat(initialBalance) * 100),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create account');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A] pb-3">
          <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Add Account</h3>
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
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Account Name</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BCA Daily Checking, Mandiri Savings"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Account Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Financial Institution (Optional)
            </label>
            <Input
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              placeholder="e.g. Bank Central Asia, Chase, GoPay"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Starting Balance ({currency})
            </label>
            <Input
              type="number"
              step="0.01"
              required
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createAccount.isPending}
              disabled={!name.trim()}
              className="bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white"
            >
              Save Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickTransferModal({
  familyId,
  accounts,
  currency,
  onClose,
}: {
  familyId: string;
  accounts: Account[];
  currency: string;
  onClose: () => void;
}) {
  const createTx = useCreateTransaction(familyId);
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Account Transfer');
  const [error, setError] = useState('');

  const handleTransfer = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (fromAccountId === toAccountId) {
      setError('Origin and destination accounts must be different');
      return;
    }
    const cents = Math.round(parseFloat(amount) * 100);
    if (isNaN(cents) || cents <= 0) {
      setError('Please enter a valid transfer amount');
      return;
    }

    try {
      await createTx.mutateAsync({
        type: 'TRANSFER',
        amount: cents,
        description: description || 'Account Transfer',
        date: new Date().toISOString(),
        accountId: fromAccountId,
        toAccountId,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Transfer failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A] pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF]" />
            <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Quick Account Transfer</h3>
          </div>
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

        <form onSubmit={handleTransfer} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">From Account</label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                required
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance, a.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">To Account</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                required
              >
                {accounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Transfer Amount ({currency})
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Notes / Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Funding Savings, Credit card payment"
              className="text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={createTx.isPending}
              disabled={!fromAccountId || !toAccountId || !amount}
              className="bg-[#101828] hover:bg-[#1E293B] dark:bg-[#5B8CFF] dark:hover:bg-[#4678F0] dark:text-white"
            >
              Execute Transfer
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
