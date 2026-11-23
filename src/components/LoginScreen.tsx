import React, { useState } from 'react';
import { Lock, Sprout, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { AGRICOLA_INFO, ESTATE_IMAGES } from '../data/initialData';
import {
  AgricolaInfo,
  AuthUserSession,
  ServiceStatusConfig,
} from '../types/fieldbook';
import { formatRutDisplay } from '../utils/rbac';
import { ResilientImage } from './ResilientImage';

interface LoginScreenProps {
  needsSetup: boolean;
  empresaInfo?: AgricolaInfo | null;
  onSuccess: (
    token: string,
    user: AuthUserSession,
    serviceStatus?: ServiceStatusConfig
  ) => void;
  onServiceSuspended?: (serviceStatus: ServiceStatusConfig) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  needsSetup,
  empresaInfo,
  onSuccess,
  onServiceSuspended,
}) => {
  const info = empresaInfo || AGRICOLA_INFO;
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [rut, setRut] = useState('');
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('Administrador de la App');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (needsSetup) {
      if (!email.trim() && !rut.trim()) {
        setError('Ingresa al menos un correo electrónico o RUT para iniciar sesión.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Las claves ingresadas no coinciden.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = needsSetup ? '/api/auth/setup' : '/api/auth/login';
      const body = needsSetup
        ? {
            email: email.trim(),
            rut: rut.trim() ? formatRutDisplay(rut) : '',
            nombre: nombre.trim(),
            cargo: cargo.trim(),
            password,
          }
        : {
            identifier: identifier.trim(),
            password,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 423 && data.serviceStatus && onServiceSuspended) {
          onServiceSuspended(data.serviceStatus);
          return;
        }
        setError(data.error || 'No fue posible iniciar sesión.');
        return;
      }

      onSuccess(data.token, data.user, data.serviceStatus);
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-3 sm:p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 shadow-sm">
        <div className="md:col-span-5 relative min-h-[190px] sm:min-h-[240px] bg-slate-900">
          <ResilientImage
            src={ESTATE_IMAGES.panorama}
            alt="Predio Agrícola Queñi en Panguipulli"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/50 to-slate-950/20" />
          <div className="absolute inset-0 p-5 sm:p-6 flex flex-col justify-between text-white">
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium">
              <Sprout className="w-4 h-4 shrink-0" />
              <span>Cuaderno de Campo Digital</span>
            </div>
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold tracking-tight">
                {info.razonSocial}
              </h1>
              <p className="font-mono tabular-nums text-xs text-slate-300 mt-1.5">
                RUT {info.rut} · Ref. {info.referencia}
              </p>
              <p className="text-xs text-slate-300 mt-1">
                {info.domicilio ? `${info.domicilio} · ${info.comuna}` : info.comuna}
              </p>
              <p className="text-xs text-emerald-300 mt-2">
                Maqui · Arándanos · Zarzaparrilla
              </p>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 p-5 sm:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2">
            {needsSetup ? <ShieldCheck className="w-4 h-4 shrink-0" /> : <Lock className="w-4 h-4 shrink-0" />}
            <span>
              {needsSetup
                ? 'Configuración Inicial · Administrador de la App'
                : 'Acceso con RUT o Correo Electrónico'}
            </span>
          </div>

          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
            {needsSetup ? 'Crear Cuenta Principal de Administrador' : `Iniciar Sesión en ${info.nombreCorto}`}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {needsSetup
              ? 'Registra tu RUT o correo electrónico personal y clave maestra. Luego podrás crear cuentas para Administrador del Campo, Agrónomos, Supervisores, Secretaria, Bodegueros, Aplicadores y Tractoristas.'
              : 'Ingresa con tu RUT o correo electrónico personal y la clave asignada según tu nivel de acceso.'}
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {needsSetup ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      required
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej: Diego Pereira"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Cargo en la empresa
                    </label>
                    <input
                      type="text"
                      value={cargo}
                      onChange={(e) => setCargo(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Correo electrónico (opcional si usas RUT)
                    </label>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ej: nombre@gmail.com"
                      className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      RUT chileno
                    </label>
                    <input
                      type="text"
                      value={rut}
                      onChange={(e) => setRut(e.target.value)}
                      placeholder="Ej: 15.892.410-K"
                      className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700 font-mono"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  RUT o correo electrónico
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
                  className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Clave de acceso
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={4}
                  autoComplete={needsSetup ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full px-3 py-2.5 pr-11 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
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

            {needsSetup && (
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirmar clave
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  minLength={4}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la clave"
                  className="w-full px-3 py-2.5 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white text-sm font-medium transition-colors"
            >
              {loading
                ? 'Validando...'
                : needsSetup
                ? 'Crear Administrador e Ingresar'
                : 'Ingresar al Cuaderno'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
