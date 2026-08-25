// Offline Transaction Queue using IndexedDB for durable local persistence

export interface QueuedTransaction {
  id: string; // client-generated idempotency key (CUID/UUID)
  familyId: string;
  payload: {
    accountId: string;
    categoryId?: string;
    type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT';
    amount: number;
    description: string;
    notes?: string;
    date: string;
    toAccountId?: string;
  };
  createdAt: number;
  retryCount: number;
}

const DB_NAME = 'sff_offline_db';
const STORE_NAME = 'offline_tx_queue';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueOfflineTransaction(
  familyId: string,
  payload: QueuedTransaction['payload'],
): Promise<string> {
  const db = await openDb();
  const id = `client-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const item: QueuedTransaction = {
    id,
    familyId,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(item);
    req.onsuccess = () => resolve(id);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedTransactions(): Promise<QueuedTransaction[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Database access failed or unavailable in non-browser context
    return [];
  }
}

export async function removeQueuedTransaction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
