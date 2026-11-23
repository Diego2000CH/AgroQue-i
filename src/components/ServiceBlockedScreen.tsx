import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Database,
  LogOut,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { AgricolaInfo, AuthUserSession, ServiceStatusConfig } from '../types/fieldbook';
import { isAppAdmin } from '../utils/rbac';

interface ServiceBlockedScreenProps {
  serviceStatus: ServiceStatusConfig;
  empresaInfo: AgricolaInfo;
  isAuthenticatedNonAdmin?: boolean;
  userName?: string;
  defaultShowAdminLogin?: boolean;
  onLogout?: () => void;
  onAdminUnlockSuccess: (
    token: string,
    user: AuthUserSession,
    serviceStatus?: ServiceStatusConfig
  ) => void;
}

export const ServiceBlockedScreen: React.FC<ServiceBlockedScreenProps> = ({
  serviceStatus,
  empresaInfo,
  isAuthenticatedNonAdmin = false,
  userName,
  defaultShowAdminLogin = false,
  onLogout,
  onAdminUnlockSuccess,
}) => {
  const [showAdminAccess, setShowAdminAccess] = useState(defaultShowAdminLogin);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const formattedUpdatedAt = serviceStatus.updatedAt
    ? new Date(serviceStatus.updatedAt).toLocaleString('es-CL', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : '';

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          res.status === 423
            ? 'Esta cuenta no tiene permisos de Superadministrador para ingresar durante la suspensión.'
            : data.error || 'No fue posible validar las credenciales.'
        );
        return;
      }
      if (!data.user || !isAppAdmin(data.user.rol)) {
        setError('Acceso permitido únicamente para el rol de Superadministrador.');
        return;
      }
      onAdminUnlockSuccess(data.token, data.user, data.serviceStatus);
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-rose-950 text-white px-6 py-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6 text-rose-300" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-300">
              {empresaInfo.nombreCorto} · Estado del Servicio
            </div>
            <h1 className="font-display text-lg sm:text-xl font-bold mt-0.5">
              Acceso al Sistema Suspendido
            </h1>
            <p className="text-xs text-rose-200/80 mt-0.5 font-mono tabular-nums">
              RUT {empresaInfo.rut} · {empresaInfo.comuna}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {isAuthenticatedNonAdmin && userName && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Sesión iniciada como <strong className="text-slate-900 dark:text-slate-100">{userName}</strong>. El acceso operativo ha sido pausado temporalmente.
            </div>
          )}

          <div className="p-4 sm:p-5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/70">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-1.5">
              Aviso del Administrador del Sistema
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-900 dark:text-slate-100 whitespace-pre-line leading-relaxed">
              {serviceStatus.message}
            </p>
            {formattedUpdatedAt && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 font-mono tabular-nums">
                Actualizado el {formattedUpdatedAt}
              </p>
            )}
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            <Database className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Tus datos operativos (Cuarteles, Órdenes de Aplicación, Bodega, Labores, Riego, Cosechas e Informes) permanecen guardados e intactos en la base de datos.
            </span>
          </div>

          {isAuthenticatedNonAdmin && onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar sesión</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setShowAdminAccess((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 py-1.5"
            >
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                <span>Acceso exclusivo Superadministrador</span>
              </span>
              {showAdminAccess ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdminAccess && (
              <form
                onSubmit={handleAdminSubmit}
                className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Ingresa con tu cuenta de Superadministrador para acceder al panel y reactivar el servicio.
                  </span>
                </div>

                {error && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Correo electrónico o RUT de Superadministrador
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ej: el RUT o correo electrónico"
                    className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Clave de Superadministrador
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={4}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu clave"
                      className="w-full px-3 py-2.5 pr-11 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      aria-label={showPass ? 'Ocultar clave' : 'Ver clave'}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                >
                  {loading ? 'Verificando...' : 'Ingresar como Superadministrador'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
