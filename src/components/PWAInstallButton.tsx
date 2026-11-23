import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        title="Instalar aplicación en este dispositivo"
        className={
          compact
            ? 'inline-flex items-center gap-1.5 min-h-[38px] px-2.5 sm:px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors whitespace-nowrap shrink-0'
            : 'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors'
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Instalar App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuideModal(true)}
        title={isIOS ? 'Cómo instalar en iPhone / iPad' : 'Instalar como App en dispositivo'}
        className={
          compact
            ? 'inline-flex items-center gap-1.5 min-h-[38px] px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0'
            : 'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors'
        }
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
        <span className={compact ? 'hidden sm:inline' : ''}>
          {isIOS ? 'Instalar en iOS' : 'App Móvil'}
        </span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
                  Instalar Agrícola Queñi en tu Dispositivo
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Funciona como aplicación independiente y permite registrar datos sin señal en el campo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <li className="flex items-start gap-2.5">
                  <Share className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <span>
                    1. Abre esta página en <strong>Safari</strong> y toca el botón <strong>Compartir</strong> en la barra inferior o superior.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <PlusSquare className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>
                    2. Desliza hacia abajo y selecciona <strong>Agregar a inicio</strong> (<em>Add to Home Screen</em>).
                  </span>
                </li>
                <li className="text-slate-500 dark:text-slate-400 pl-6">
                  3. Toca <strong>Agregar</strong> y abre el ícono <strong>Queñi Campo</strong> desde tu pantalla.
                </li>
              </ol>
            ) : (
              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                <p>
                  <strong>Android (Chrome / Edge):</strong> Abre el menú de 3 puntos del navegador y selecciona <strong>Instalar aplicación</strong> o <strong>Agregar a la pantalla principal</strong>.
                </p>
                <p>
                  <strong>PC / Tablet (Chrome / Edge):</strong> Haz clic en el ícono de instalación en la barra de direcciones (esquina superior derecha) para fijar la app en el escritorio.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full min-h-[40px] rounded-lg bg-slate-900 dark:bg-emerald-700 text-white text-xs font-semibold hover:opacity-95"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
