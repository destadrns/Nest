import { describe, it, expect } from 'vitest';
import { enqueueOfflineTransaction, getQueuedTransactions, removeQueuedTransaction } from './offline-queue';

describe('Offline Transaction Queue', () => {
  it('should be defined with queue operations', () => {
    expect(enqueueOfflineTransaction).toBeDefined();
    expect(getQueuedTransactions).toBeDefined();
    expect(removeQueuedTransaction).toBeDefined();
  });
});
