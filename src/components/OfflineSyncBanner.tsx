import React, { useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload, ChevronDown, ChevronUp } from 'lucide-react';
import { OfflineQueueEntry } from '../utils/offlineQueue';

interface OfflineSyncBannerProps {
  isOnline: boolean;
  pendingEntries: OfflineQueueEntry[];
  syncing: boolean;
  justSyncedMessage: string | null;
  onSyncNow: () => void;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  isOnline,
  pendingEntries,
  syncing,
  justSyncedMessage,
  onSyncNow,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (isOnline && pendingEntries.length === 0 && !justSyncedMessage) {
    return null;
  }

  return (
    <div className="mx-3 sm:mx-8 mt-3 space-y-2 print:hidden">
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-950 dark:text-amber-100">
          <div className="flex items-start gap-2.5">
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                Modo Terreno Sin Señal (Offline)
              </div>
              <div className="text-amber-800 dark:text-amber-200/90 mt-0.5">
                Puedes seguir registrando cosechas, riegos, plagas, labores y aplicaciones. Todo se guarda en el dispositivo y se sincronizará automáticamente al recuperar conexión.
              </div>
            </div>
          </div>

          {pendingEntries.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-200/70 dark:bg-amber-900/60 font-mono text-xs font-semibold shrink-0 self-start sm:self-center"
            >
              <span>{pendingEntries.length} pendiente(s)</span>
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      )}

      {isOnline && pendingEntries.length > 0 && (
        <div className="p-3.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-sky-950 dark:text-sky-100">
          <div className="flex items-start gap-2.5">
            <CloudUpload className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">
                Conexión restablecida · {pendingEntries.length} cambio(s) locales por sincronizar
              </div>
              <div className="text-sky-800 dark:text-sky-200/90 mt-0.5">
                Los registros guardados sin señal están listos para subirse al servidor de Agrícola Queñi.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="px-2.5 py-1.5 rounded-lg border border-sky-300 dark:border-sky-700 text-xs font-medium"
            >
              Ver cola
            </button>
            <button
              type="button"
              disabled={syncing}
              onClick={onSyncNow}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-800 disabled:opacity-60 text-white text-xs font-semibold"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
            </button>
          </div>
        </div>
      )}

      {isOnline && pendingEntries.length === 0 && justSyncedMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{justSyncedMessage}</span>
        </div>
      )}

      {expanded && pendingEntries.length > 0 && (
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 max-h-48 overflow-y-auto">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cola de registros pendientes offline
          </div>
          {pendingEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 text-xs py-1 border-b last:border-b-0 border-slate-100 dark:border-slate-800"
            >
              <div className="min-w-0 truncate">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  [{entry.modulo}]
                </span>{' '}
                <span className="text-slate-600 dark:text-slate-400">{entry.detalle}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-400 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString('es-CL', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
