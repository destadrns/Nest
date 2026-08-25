import { useEffect, useState, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { getQueuedTransactions, removeQueuedTransaction } from '@/lib/offline-queue';
import { api } from '@/lib/api';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus();
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const checkQueue = useCallback(async () => {
    const queue = await getQueuedTransactions();
    setQueueCount(queue.length);
  }, []);

  const syncPendingTransactions = useCallback(async () => {
    setIsSyncing(true);
    try {
      const items = await getQueuedTransactions();
      for (const item of items) {
        await api.post(`/families/${item.familyId}/transactions`, item.payload);
        await removeQueuedTransaction(item.id);
      }
      setQueueCount(0);
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 4000);
    } catch {
      // Will retry automatically on next sync tick
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    checkQueue();
    const interval = setInterval(checkQueue, 5000);
    return () => clearInterval(interval);
  }, [checkQueue]);

  useEffect(() => {
    if (isOnline && queueCount > 0 && !isSyncing) {
      syncPendingTransactions();
    }
  }, [isOnline, queueCount, isSyncing, syncPendingTransactions]);

  if (isOnline && queueCount === 0 && !syncSuccess) {
    return null;
  }

  return (
    <div
      className={`px-4 py-2 text-xs font-medium flex items-center justify-between transition-colors ${
        !isOnline
          ? 'bg-amber-500 text-white'
          : syncSuccess
            ? 'bg-emerald-600 text-white'
            : 'bg-indigo-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You are offline. Transactions will be saved locally and synced once reconnected.</span>
          </>
        ) : syncSuccess ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>All offline transactions have been synchronized successfully!</span>
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Syncing {queueCount} offline transaction(s)...</span>
          </>
        )}
      </div>
      {queueCount > 0 && !syncSuccess && (
        <span className="bg-black/20 px-2 py-0.5 rounded text-[10px]">
          {queueCount} queued
        </span>
      )}
    </div>
  );
}
