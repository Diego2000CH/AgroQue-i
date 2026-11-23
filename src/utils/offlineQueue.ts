export interface OfflineQueueEntry {
  id: string;
  timestamp: string;
  modulo: string;
  detalle: string;
}

const QUEUE_KEY = 'agricola_queni_offline_queue_v1';
const LAST_SYNC_KEY = 'agricola_queni_last_sync_v1';

export function loadOfflineQueue(): OfflineQueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(entries: OfflineQueueEntry[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }
}

export function pushOfflineQueueEntry(modulo: string, detalle: string): OfflineQueueEntry[] {
  const current = loadOfflineQueue();
  const next: OfflineQueueEntry[] = [
    {
      id: `oq-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      modulo,
      detalle,
    },
    ...current,
  ];
  saveOfflineQueue(next);
  return next;
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // Ignore
  }
}

export function getLastSyncTimestamp(): string | null {
  try {
    return localStorage.getItem(LAST_SYNC_KEY);
  } catch {
    return null;
  }
}
