const DB_NAME = "devlink-ke-offline";
const DB_VERSION = 1;
const STORE_NAME = "registration-queue";

export interface QueuedRegistration {
  id: string;
  payload: Record<string, unknown>;
  queuedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueRegistration(payload: Record<string, unknown>): Promise<string> {
  const db = await openDb();
  const id = `reg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const entry: QueuedRegistration = { id, payload, queuedAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedRegistrations(): Promise<QueuedRegistration[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as QueuedRegistration[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueuedRegistration(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function flushRegistrationQueue(
  onSuccess: (entry: QueuedRegistration) => void,
  onError: (entry: QueuedRegistration, error: string) => void,
): Promise<void> {
  const entries = await getQueuedRegistrations();
  for (const entry of entries) {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(entry.payload),
      });
      if (res.ok) {
        await removeQueuedRegistration(entry.id);
        onSuccess(entry);
      } else {
        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          await removeQueuedRegistration(entry.id);
        }
        onError(entry, body.error ?? `HTTP ${res.status}`);
      }
    } catch {
      onError(entry, "Network error");
    }
  }
}
