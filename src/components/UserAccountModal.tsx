import React from 'react';
import { X, ShieldCheck, IdCard, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AuthUserSession } from '../types/fieldbook';
import { evaluateCarnetStatus, getUserInitials } from '../utils/rbac';
import { formatDateCL } from '../utils/formatters';

interface UserAccountModalProps {
  user: AuthUserSession;
  onClose: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({ user, onClose }) => {
  const sagStatus = evaluateCarnetStatus(
    user.requiereCarnetAplicador,
    user.carnetAplicadorNumero,
    user.carnetAplicadorVencimiento
  );
  const tractorStatus = evaluateCarnetStatus(
    user.requiereCarnetTractorista,
    user.carnetTractoristaNumero,
    user.carnetTractoristaVencimiento
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label="Mi Cuenta y Carnets"
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            Mi Cuenta y Acreditaciones
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-700 text-white font-display font-bold text-lg flex items-center justify-center shrink-0">
              {getUserInitials(user.nombre)}
            </div>

            <div className="min-w-0">
              <div className="font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
                {user.nombre}
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                {user.rol} · {user.cargo}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Correo electrónico:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {user.email || 'No registrado'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">RUT:</span>
              <span className="font-mono text-slate-800 dark:text-slate-200">
                {user.rut || 'No registrado'}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Nivel de acceso:</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{user.nivelAcceso || 'Según Rol'}</span>
              </span>
            </div>
          </div>

          {(user.requiereCarnetAplicador || user.requiereCarnetTractorista) && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <IdCard className="w-4 h-4 text-emerald-700" />
                <span>Mis Carnets y Licencias Habilitantes</span>
              </div>

              {user.requiereCarnetAplicador && (
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">Carnet Aplicador Fitosanitario SAG</div>
                    <div className="font-mono text-slate-500">
                      N° {user.carnetAplicadorNumero || 'Sin registrar'}
                      {user.carnetAplicadorVencimiento
                        ? ` · Vence ${formatDateCL(user.carnetAplicadorVencimiento)}`
                        : ''}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      sagStatus.estado === 'vigente'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {sagStatus.estado === 'vigente' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{sagStatus.label}</span>
                  </span>
                </div>
              )}

              {user.requiereCarnetTractorista && (
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">Carnet de Tractorista (Clase D)</div>
                    <div className="font-mono text-slate-500">
                      N° {user.carnetTractoristaNumero || 'Sin registrar'}
                      {user.carnetTractoristaVencimiento
                        ? ` · Vence ${formatDateCL(user.carnetTractoristaVencimiento)}`
                        : ''}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      tractorStatus.estado === 'vigente'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {tractorStatus.estado === 'vigente' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" />
                    )}
                    <span>{tractorStatus.label}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
