import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/stores/app-store';
import {
  useTransactions,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useCategories,
} from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import type { Transaction, TransactionType } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Trash2,
  Edit2,
  SlidersHorizontal,
  FolderCheck,
} from 'lucide-react';

const TX_TYPES: { value: TransactionType; label: string; variant: 'income' | 'expense' | 'info' | 'neutral' }[] = [
  { value: 'INCOME', label: 'Income', variant: 'income' },
  { value: 'EXPENSE', label: 'Expense', variant: 'expense' },
  { value: 'TRANSFER', label: 'Transfer', variant: 'info' },
  { value: 'ADJUSTMENT', label: 'Adjustment', variant: 'neutral' },
];

export function TransactionsPage() {
  const currentFamily = useAppStore((s) => s.currentFamily);
  const [searchParams, setSearchParams] = useSearchParams();

  // Synced URL Filter State
  const page = parseInt(searchParams.get('page') || '1', 10);
  const typeFilter = searchParams.get('type') || '';
  const accountFilter = searchParams.get('accountId') || '';
  const categoryFilter = searchParams.get('categoryId') || '';
  const searchQuery = searchParams.get('q') || '';

  const [showCreate, setShowCreate] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [batchCategoryModalOpen, setBatchCategoryModalOpen] = useState(false);
  const [batchCategoryId, setBatchCategoryId] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const { data: accountsRes } = useAccounts(currentFamily?.id);
  const { data: categories } = useCategories(currentFamily?.id);
  const accounts = accountsRes?.data ?? [];

  const { data: res, isLoading } = useTransactions(currentFamily?.id, {
    page,
    limit: 15,
    ...(typeFilter && { type: typeFilter }),
    ...(accountFilter && { accountId: accountFilter }),
    ...(categoryFilter && { categoryId: categoryFilter }),
  });

  const updateTx = useUpdateTransaction(currentFamily?.id || '');
  const deleteTx = useDeleteTransaction(currentFamily?.id || '');

  const transactions = res?.data ?? [];
  const meta = res?.meta;

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page'); // Reset to page 1 on filter
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const filteredTransactions = transactions.filter((tx) =>
    searchQuery
      ? tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.account?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const toggleSelectAll = () => {
    if (selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filteredTransactions.map((t) => t.id));
    }
  };

  const toggleSelectTx = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTxIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedTxIds.length} selected transaction(s)? This action cannot be undone.`
      )
    ) {
      return;
    }
    setIsBatchProcessing(true);
    try {
      for (const id of selectedTxIds) {
        await deleteTx.mutateAsync(id);
      }
      setSelectedTxIds([]);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const handleBulkCategorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchCategoryId) return;
    setIsBatchProcessing(true);
    try {
      for (const id of selectedTxIds) {
        await updateTx.mutateAsync({
          id,
          categoryId: batchCategoryId,
        });
      }
      setSelectedTxIds([]);
      setBatchCategoryModalOpen(false);
      setBatchCategoryId('');
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const hasActiveFilters = !!(typeFilter || accountFilter || categoryFilter || searchQuery);

  return (
    <div className="space-y-4 min-w-0">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#D9E1EC]/80 dark:border-[#2A313A]/80 pb-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight text-[#101828] dark:text-[#F3F4F6] sm:text-xl truncate">
            Transactions Ledger
          </h1>
          <p className="text-[11px] text-[#475467] dark:text-[#B7C0CC] mt-0.5">
            Real-time stream of household income, spending, and account transfers.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 shadow-xs font-bold text-xs h-8 bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0] shrink-0">
          <Plus className="h-3.5 w-3.5" />
          <span>New Transaction</span>
        </Button>
      </div>

      {/* Filter and Search Bar with Filter Drawer Trigger */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0">
        <div className="flex items-center gap-2 flex-1 max-w-md min-w-0">
          <div className="relative w-full min-w-0">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#98A2B3] dark:text-[#858F9D]" />
            <Input
              placeholder="Search description, category, or account..."
              value={searchQuery}
              onChange={(e) => setParam('q', e.target.value)}
              className="pl-8 text-xs h-8 rounded-lg w-full"
            />
          </div>
          <Button
            size="xs"
            variant="outline"
            onClick={() => setShowFilterDrawer(true)}
            className="flex items-center gap-1.5 h-8 shrink-0 relative"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-[#356AE6] dark:bg-[#5B8CFF]" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-3.5 w-3.5 text-[#98A2B3] dark:text-[#858F9D] shrink-0" />
          <div className="flex rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-0.5 text-xs shadow-2xs shrink-0">
            <button
              onClick={() => setParam('type', '')}
              className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                !typeFilter
                  ? 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] shadow-2xs'
                  : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
              }`}
            >
              All
            </button>
            {TX_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setParam('type', t.value)}
                className={`rounded-md px-2.5 py-0.5 text-[11px] font-bold transition ${
                  typeFilter === t.value
                    ? 'bg-[#101828] dark:bg-[#F3F4F6] text-white dark:text-[#0A0D12] shadow-2xs'
                    : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#858F9D]">Active filters:</span>
          {typeFilter && (
            <Badge variant="brand" size="sm" className="flex items-center gap-1">
              <span>Type: {typeFilter}</span>
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setParam('type', '')} />
            </Badge>
          )}
          {accountFilter && (
            <Badge variant="brand" size="sm" className="flex items-center gap-1">
              <span>Account: {accounts.find((a) => a.id === accountFilter)?.name || accountFilter}</span>
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setParam('accountId', '')} />
            </Badge>
          )}
          {categoryFilter && (
            <Badge variant="brand" size="sm" className="flex items-center gap-1">
              <span>Category: {categories?.find((c) => c.id === categoryFilter)?.name || categoryFilter}</span>
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setParam('categoryId', '')} />
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="brand" size="sm" className="flex items-center gap-1">
              <span>Query: "{searchQuery}"</span>
              <X className="h-2.5 w-2.5 cursor-pointer" onClick={() => setParam('q', '')} />
            </Badge>
          )}
          <button
            onClick={clearAllFilters}
            className="text-[11px] font-bold text-[#356AE6] dark:text-[#5B8CFF] hover:underline ml-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Floating Batch Action Toolbar */}
      {selectedTxIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#356AE6]/30 dark:border-[#5B8CFF]/30 bg-[#EEF4FE] dark:bg-[#181D24] px-3.5 py-2.5 shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#356AE6] dark:bg-[#5B8CFF] text-[10px] font-bold text-white">
              {selectedTxIds.length}
            </span>
            <span className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">
              {selectedTxIds.length} transaction{selectedTxIds.length > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() => setBatchCategoryModalOpen(true)}
              disabled={isBatchProcessing}
              className="flex items-center gap-1.5 h-7 border-[#356AE6]/30 dark:border-[#5B8CFF]/30 bg-white dark:bg-[#11151B] text-[#356AE6] dark:text-[#5B8CFF] hover:bg-[#F6F8FB] dark:hover:bg-[#181D24]"
            >
              <FolderCheck className="h-3 w-3" />
              <span>Categorize</span>
            </Button>
            <Button
              size="xs"
              variant="dangerOutline"
              onClick={handleBulkDelete}
              isLoading={isBatchProcessing}
              className="flex items-center gap-1.5 h-7"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete Selected</span>
            </Button>
            <Button
              size="xs"
              variant="ghost"
              onClick={() => setSelectedTxIds([])}
              className="h-7 text-xs text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
            >
              Deselect All
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Table */}
      {isLoading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={FileSpreadsheet}
          title="No Transactions Found"
          description={
            hasActiveFilters
              ? 'No transactions matched your active filters. Try resetting criteria.'
              : 'Record your first household transaction to populate this ledger.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Record Transaction'}
          onAction={hasActiveFilters ? clearAllFilters : () => setShowCreate(true)}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 bg-[#F6F8FB] dark:bg-[#181D24] text-[10px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#858F9D]">
                  <th className="w-8 px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredTransactions.length > 0 &&
                        selectedTxIds.length === filteredTransactions.length
                      }
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#5B8CFF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                      aria-label="Select all transactions"
                    />
                  </th>
                  <th className="px-3.5 py-2.5">Date</th>
                  <th className="px-3.5 py-2.5">Type</th>
                  <th className="px-3.5 py-2.5">Description</th>
                  <th className="px-3.5 py-2.5">Category</th>
                  <th className="px-3.5 py-2.5">Account</th>
                  <th className="px-3.5 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D9E1EC]/40 dark:divide-[#2A313A]/40">
                {filteredTransactions.map((tx) => {
                  const isSelected = selectedTxIds.includes(tx.id);
                  const typeDef = TX_TYPES.find((t) => t.value === tx.type) || {
                    variant: 'neutral' as const,
                    label: tx.type,
                  };
                  return (
                    <tr
                      key={tx.id}
                      onClick={() => {
                        setSelectedTx(tx);
                        setIsEditingTx(false);
                      }}
                      className={`hover:bg-[#F6F8FB] dark:hover:bg-[#181D24] transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#EEF4FE]/50 dark:bg-[#5B8CFF]/15' : ''
                      }`}
                    >
                      <td
                        className="w-8 px-3 py-2 text-center"
                        onClick={(e) => toggleSelectTx(tx.id, e)}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="h-3.5 w-3.5 rounded border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#5B8CFF] focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          aria-label={`Select transaction ${tx.description}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2 text-[#475467] dark:text-[#B7C0CC] font-mono text-[11px]">
                        {new Date(tx.date).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-3.5 py-2">
                        <Badge variant={typeDef.variant} size="sm">
                          {typeDef.label}
                        </Badge>
                      </td>
                      <td className="px-3.5 py-2 font-bold text-[#101828] dark:text-[#F3F4F6] hover:text-[#356AE6] dark:hover:text-[#5B8CFF] transition-colors">
                        {tx.description}
                      </td>
                      <td className="px-3.5 py-2 text-[#475467] dark:text-[#B7C0CC]">{tx.category?.name || '—'}</td>
                      <td className="px-3.5 py-2 text-[#475467] dark:text-[#B7C0CC] font-medium">{tx.account?.name || '—'}</td>
                      <td
                        className={`whitespace-nowrap px-3.5 py-2 text-right font-bold tabular-nums font-mono ${
                          tx.type === 'INCOME'
                            ? 'text-[#0E8A73] dark:text-[#2BC7A4]'
                            : tx.type === 'EXPENSE'
                              ? 'text-[#C53B4B] dark:text-[#F06B78]'
                              : 'text-[#101828] dark:text-[#F3F4F6]'
                        }`}
                      >
                        {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                        {formatCurrency(tx.amount, currentFamily?.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 px-3.5 py-2 text-xs text-[#475467] dark:text-[#B7C0CC]">
              <span className="text-[11px]">
                Page <strong className="font-bold text-[#101828] dark:text-[#F3F4F6]">{meta.page}</strong> of{' '}
                <strong className="font-bold text-[#101828] dark:text-[#F3F4F6]">{meta.totalPages}</strong> ({meta.total} entries)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  size="xs"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setParam('page', String(Math.max(1, page - 1)))}
                  className="flex items-center gap-1 h-7"
                >
                  <ChevronLeft className="h-3 w-3" />
                  <span>Previous</span>
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  disabled={page >= meta.totalPages}
                  onClick={() => setParam('page', String(page + 1))}
                  className="flex items-center gap-1 h-7"
                >
                  <span>Next</span>
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Drawer */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-[#101828]/40 dark:bg-[#0A0D12]/60 backdrop-blur-xs transition-opacity duration-200">
          <div className="animate-drawer-slide w-full max-w-sm bg-white dark:bg-[#11151B] border-l border-[#D9E1EC] dark:border-[#2A313A] h-full shadow-2xl flex flex-col justify-between p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF]" />
                  <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Ledger Filters</h3>
                </div>
                <button
                  onClick={() => setShowFilterDrawer(false)}
                  className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1.5">Account</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setParam('accountId', e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1.5">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setParam('categoryId', e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                >
                  <option value="">All Categories</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-4 flex justify-between">
              <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-xs">
                Reset All
              </Button>
              <Button
                size="sm"
                onClick={() => setShowFilterDrawer(false)}
                className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0] text-xs"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Detail & Edit Drawer */}
      {selectedTx && (
        <TransactionDetailDrawer
          tx={selectedTx}
          currency={currentFamily?.currency || 'USD'}
          categories={categories || []}
          onClose={() => setSelectedTx(null)}
          onDelete={async () => {
            if (confirm('Delete this transaction?')) {
              await deleteTx.mutateAsync(selectedTx.id);
              setSelectedTx(null);
            }
          }}
          onUpdate={async (data) => {
            await updateTx.mutateAsync({ id: selectedTx.id, ...data });
            setSelectedTx(null);
          }}
        />
      )}

      {/* New Transaction Modal */}
      {showCreate && currentFamily && (
        <CreateTransactionModal
          familyId={currentFamily.id}
          currency={currentFamily.currency}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Batch Categorize Modal */}
      {batchCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/40 dark:bg-[#0A0D12]/60 backdrop-blur-xs p-4">
          <div className="animate-scaleIn w-full max-w-sm rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
              <div className="flex items-center gap-2">
                <FolderCheck className="h-4 w-4 text-[#356AE6] dark:text-[#5B8CFF]" />
                <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Bulk Categorize</h3>
              </div>
              <button
                onClick={() => setBatchCategoryModalOpen(false)}
                className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleBulkCategorize} className="mt-4 space-y-4">
              <p className="text-xs text-[#475467] dark:text-[#B7C0CC]">
                Assign category for <strong>{selectedTxIds.length}</strong> selected transaction(s):
              </p>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1.5">
                  Target Category
                </label>
                <select
                  required
                  value={batchCategoryId}
                  onChange={(e) => setBatchCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-2 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                >
                  <option value="">Select Category...</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => setBatchCategoryModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="xs"
                  isLoading={isBatchProcessing}
                  disabled={!batchCategoryId}
                  className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0]"
                >
                  Update Category
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TransactionDetailDrawer({
  tx,
  currency,
  categories,
  onClose,
  onDelete,
  onUpdate,
}: {
  tx: Transaction;
  currency: string;
  categories: any[];
  onClose: () => void;
  onDelete: () => Promise<void>;
  onUpdate: (data: any) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(tx.description);
  const [amount, setAmount] = useState((tx.amount / 100).toString());
  const [categoryId, setCategoryId] = useState(tx.categoryId || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onUpdate({
      description,
      amount: Math.round(parseFloat(amount) * 100),
      categoryId: categoryId || undefined,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#101828]/40 dark:bg-[#0A0D12]/60 backdrop-blur-xs transition-opacity duration-200">
      <div className="animate-drawer-slide w-full max-w-md bg-white dark:bg-[#11151B] border-l border-[#D9E1EC] dark:border-[#2A313A] h-full shadow-2xl flex flex-col justify-between p-6">
        <div>
          <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
            <div className="flex items-center gap-2">
              <Badge variant={tx.type === 'INCOME' ? 'income' : tx.type === 'EXPENSE' ? 'expense' : 'info'}>
                {tx.type}
              </Badge>
              <span className="text-xs font-bold text-[#101828] dark:text-[#F3F4F6]">Transaction Details</span>
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
              <div>
                <span className="text-[10px] uppercase font-bold text-[#98A2B3] dark:text-[#858F9D]">Amount</span>
                <div
                  className={`text-2xl font-extrabold font-mono tabular-nums mt-0.5 ${
                    tx.type === 'INCOME'
                      ? 'text-[#0E8A73] dark:text-[#2BC7A4]'
                      : tx.type === 'EXPENSE'
                        ? 'text-[#C53B4B] dark:text-[#F06B78]'
                        : 'text-[#101828] dark:text-[#F3F4F6]'
                  }`}
                >
                  {tx.type === 'EXPENSE' ? '-' : tx.type === 'INCOME' ? '+' : ''}
                  {formatCurrency(tx.amount, currency)}
                </div>
              </div>

              <div className="rounded-xl border border-[#D9E1EC] dark:border-[#2A313A] bg-[#F6F8FB] dark:bg-[#181D24] p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#475467] dark:text-[#B7C0CC]">Description</span>
                  <strong className="text-[#101828] dark:text-[#F3F4F6]">{tx.description}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475467] dark:text-[#B7C0CC]">Category</span>
                  <strong className="text-[#101828] dark:text-[#F3F4F6]">{tx.category?.name || 'Uncategorized'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475467] dark:text-[#B7C0CC]">Account</span>
                  <strong className="text-[#101828] dark:text-[#F3F4F6]">{tx.account?.name || '—'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#475467] dark:text-[#B7C0CC]">Date</span>
                  <strong className="font-mono text-[#101828] dark:text-[#F3F4F6]">
                    {new Date(tx.date).toLocaleDateString()}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="mt-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Description</label>
                <Input
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                  Amount ({currency})
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] focus:outline-none"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="xs" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="xs" isLoading={saving} className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0]">
                  Save Changes
                </Button>
              </div>
            </form>
          )}
        </div>

        <div className="border-t border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-xs flex items-center gap-1"
              >
                <Edit2 className="h-3 w-3" />
                <span>Edit</span>
              </Button>
            )}
            <Button
              variant="dangerOutline"
              size="sm"
              onClick={onDelete}
              className="text-xs flex items-center gap-1"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function CreateTransactionModal({
  familyId,
  currency,
  onClose,
}: {
  familyId: string;
  currency: string;
  onClose: () => void;
}) {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]!);
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  const { data: accountsRes } = useAccounts(familyId);
  const { data: categories } = useCategories(familyId);
  const createTx = useCreateTransaction(familyId);
  const accounts = accountsRes?.data ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    try {
      await createTx.mutateAsync({
        type,
        amount: Math.round(parseFloat(amount) * 100),
        description,
        date: new Date(date).toISOString(),
        accountId,
        categoryId: categoryId || undefined,
        ...(type === 'TRANSFER' && toAccountId ? { toAccountId } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to record transaction');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101828]/50 dark:bg-[#0A0D12]/70 backdrop-blur-xs p-4">
      <div className="animate-modal-pop w-full max-w-md rounded-2xl border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#11151B] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#D9E1EC]/60 dark:border-[#2A313A]/60 pb-3">
          <h3 className="text-sm font-bold text-[#101828] dark:text-[#F3F4F6]">Record New Transaction</h3>
          <button
            onClick={onClose}
            className="btn-tactile rounded-md p-1 text-[#98A2B3] dark:text-[#858F9D] hover:bg-[#F0F4F8] dark:hover:bg-[#181D24] hover:text-[#101828] dark:hover:text-[#F3F4F6]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-[#E05A67]/30 dark:border-[#F06B78]/30 bg-[rgba(224,90,103,0.08)] dark:bg-[rgba(240,107,120,0.12)] p-2.5 text-xs text-[#C53B4B] dark:text-[#F06B78]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F0F4F8] dark:bg-[#181D24] p-1 text-xs">
            {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md py-1 font-semibold transition ${
                  type === t
                    ? 'bg-white dark:bg-[#11151B] text-[#101828] dark:text-[#F3F4F6] shadow-2xs font-bold'
                    : 'text-[#475467] dark:text-[#B7C0CC] hover:text-[#101828] dark:hover:text-[#F3F4F6]'
                }`}
              >
                {t === 'EXPENSE' ? 'Expense' : t === 'INCOME' ? 'Income' : 'Transfer'}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
              Amount ({currency})
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
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Description</label>
            <Input
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Utility Bills, Supermarket..."
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">
                {type === 'TRANSFER' ? 'From Account' : 'Account'}
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                required
              >
                <option value="">Select Account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.balance, a.currency)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'TRANSFER' ? (
              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">To Account</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                  required
                >
                  <option value="">Destination Account</option>
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-[#D9E1EC] dark:border-[#2A313A] bg-white dark:bg-[#181D24] px-3 py-1.5 text-xs text-[#101828] dark:text-[#F3F4F6] shadow-2xs focus:border-[#101828] dark:focus:border-[#5B8CFF] focus:outline-none"
                >
                  <option value="">Optional Category</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#101828] dark:text-[#F3F4F6] mb-1">Date</label>
            <Input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
              isLoading={createTx.isPending}
              disabled={!accountId || !amount || !description}
              className="bg-[#101828] dark:bg-[#F3F4F6] dark:text-[#0A0D12] hover:bg-[#1E293B] dark:hover:bg-[#E2E8F0]"
            >
              Save Transaction
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
