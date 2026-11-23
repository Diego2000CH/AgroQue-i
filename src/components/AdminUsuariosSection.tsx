import React, { useEffect, useMemo, useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Pencil,
  KeyRound,
  X,
  IdCard,
  AlertTriangle,
  CheckCircle2,
  Power,
  ShieldAlert,
  Save,
  Link2,
} from 'lucide-react';
import {
  AdminUserRecord,
  NavSection,
  NivelAccesoModulo,
  NivelGlobalAcceso,
  PermisosUsuario,
  ServiceModeStatus,
  ServiceStatusConfig,
  UserRole,
} from '../types/fieldbook';
import {
  ALL_MODULE_META,
  ROLE_DESCRIPTIONS,
  SELECTABLE_ROLES,
  evaluateCarnetStatus,
  formatRutDisplay,
  getDefaultPermissionsForRole,
  getPresetGlobalPermissions,
  getSuggestedLicenseFlags,
  getUserInitials,
  isAppAdmin,
  normalizeRole,
} from '../utils/rbac';

interface AdminUsuariosSectionProps {
  authToken: string;
  currentUserId: string;
  serviceStatus: ServiceStatusConfig;
  onServiceStatusUpdated: (next: ServiceStatusConfig) => void;
  onUsersChanged?: () => void;
}

type UserFilterTab = 'todos' | 'aplicadores' | 'tractoristas' | 'alertas';

const STANDARD_SUSPEND_MESSAGE =
  'Acceso temporalmente suspendido. Contacte al administrador del sistema.';

export const AdminUsuariosSection: React.FC<AdminUsuariosSectionProps> = ({
  authToken,
  currentUserId,
  serviceStatus,
  onServiceStatusUpdated,
  onUsersChanged,
}) => {
  const [svcStatusDraft, setSvcStatusDraft] = useState<ServiceModeStatus>(serviceStatus.status);
  const [svcMessageDraft, setSvcMessageDraft] = useState<string>(
    serviceStatus.message || STANDARD_SUSPEND_MESSAGE
  );
  const [svcSaving, setSvcSaving] = useState(false);
  const [svcFeedback, setSvcFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedRoute, setCopiedRoute] = useState(false);

  useEffect(() => {
    setSvcStatusDraft(serviceStatus.status);
    setSvcMessageDraft(serviceStatus.message || STANDARD_SUSPEND_MESSAGE);
  }, [serviceStatus.status, serviceStatus.message]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterTab, setFilterTab] = useState<UserFilterTab>('todos');
  const [revealedIds, setRevealedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [rut, setRut] = useState('');
  const [rol, setRol] = useState<UserRole>('Agrónomo');
  const [cargo, setCargo] = useState('');
  const [password, setPassword] = useState('');
  const [nivelAcceso, setNivelAcceso] = useState<NivelGlobalAcceso>('Personalizado');
  const [permisos, setPermisos] = useState<Record<NavSection, NivelAccesoModulo>>(
    getDefaultPermissionsForRole('Agrónomo')
  );

  // Licenses
  const [reqAplicador, setReqAplicador] = useState(false);
  const [numAplicador, setNumAplicador] = useState('');
  const [vencAplicador, setVencAplicador] = useState('');
  const [reqTractorista, setReqTractorista] = useState(false);
  const [numTractorista, setNumTractorista] = useState('');
  const [vencTractorista, setVencTractorista] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudieron cargar los usuarios.');
        return;
      }
      setUsers(data.users || []);
    } catch {
      setError('Error de conexión al cargar usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [authToken]);

  const openCreateModal = () => {
    const defaultRol: UserRole = 'Supervisor de Campo';
    setEditingUser(null);
    setNombre('');
    setEmail('');
    setRut('');
    setRol(defaultRol);
    setCargo('Supervisor de Campo');
    setPassword('');
    setNivelAcceso('Personalizado');
    setPermisos(getDefaultPermissionsForRole(defaultRol));
    setReqAplicador(false);
    setNumAplicador('');
    setVencAplicador('');
    setReqTractorista(false);
    setNumTractorista('');
    setVencTractorista('');
    setModalOpen(true);
  };

  const openEditModal = (u: AdminUserRecord) => {
    const normRol = normalizeRole(u.rol);
    const mergedPerms: Record<NavSection, NivelAccesoModulo> = {
      ...getDefaultPermissionsForRole(normRol),
      ...(u.permisos || {}),
    };
    setEditingUser(u);
    setNombre(u.nombre);
    setEmail(u.email || '');
    setRut(u.rut || '');
    setRol(normRol);
    setCargo(u.cargo || '');
    setPassword('');
    setNivelAcceso(u.nivelAcceso || 'Personalizado');
    setPermisos(mergedPerms);
    setReqAplicador(Boolean(u.requiereCarnetAplicador));
    setNumAplicador(u.carnetAplicadorNumero || '');
    setVencAplicador(u.carnetAplicadorVencimiento || '');
    setReqTractorista(Boolean(u.requiereCarnetTractorista));
    setNumTractorista(u.carnetTractoristaNumero || '');
    setVencTractorista(u.carnetTractoristaVencimiento || '');
    setModalOpen(true);
  };

  const handleRoleChange = (nextRol: UserRole) => {
    setRol(nextRol);
    if (!editingUser) {
      setCargo(nextRol);
    }
    const defaults = getDefaultPermissionsForRole(nextRol);
    setPermisos(defaults);
    setNivelAcceso(isAppAdmin(nextRol) ? 'Total' : 'Personalizado');

    const suggested = getSuggestedLicenseFlags(nextRol);
    if (suggested.requiereCarnetAplicador) setReqAplicador(true);
    if (suggested.requiereCarnetTractorista) setReqTractorista(true);
  };

  const handleGlobalLevelChange = (nextLevel: NivelGlobalAcceso) => {
    setNivelAcceso(nextLevel);
    if (nextLevel !== 'Personalizado') {
      setPermisos(getPresetGlobalPermissions(nextLevel, rol));
    }
  };

  const handleModulePermChange = (sec: NavSection, level: NivelAccesoModulo) => {
    setNivelAcceso('Personalizado');
    setPermisos((prev) => ({
      ...prev,
      [sec]: level,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() && !rut.trim()) {
      setError('Debes ingresar al menos Correo Electrónico o RUT para el ingreso del usuario.');
      return;
    }

    const cleanPermisos: PermisosUsuario = { ...permisos };
    if (!isAppAdmin(rol)) {
      cleanPermisos.usuarios = 'ninguno';
    } else {
      cleanPermisos.usuarios = 'edicion';
    }

    const payload = {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      rut: rut.trim() ? formatRutDisplay(rut) : '',
      rol,
      cargo: cargo.trim() || rol,
      password: password || undefined,
      nivelAcceso,
      permisos: cleanPermisos,
      requiereCarnetAplicador: reqAplicador,
      carnetAplicadorNumero: reqAplicador ? numAplicador.trim() : '',
      carnetAplicadorVencimiento: reqAplicador ? vencAplicador : '',
      requiereCarnetTractorista: reqTractorista,
      carnetTractoristaNumero: reqTractorista ? numTractorista.trim() : '',
      carnetTractoristaVencimiento: reqTractorista ? vencTractorista : '',
    };

    try {
      const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
      const method = editingUser ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al guardar usuario.');
        return;
      }
      setModalOpen(false);
      await loadUsers();
      onUsersChanged?.();
    } catch {
      setError('Error de conexión al guardar usuario.');
    }
  };

  const handleToggleActive = async (u: AdminUserRecord) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ activo: !u.activo }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo cambiar el estado.');
      return;
    }
    await loadUsers();
    onUsersChanged?.();
  };

  const handleDelete = async (u: AdminUserRecord) => {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo eliminar el usuario.');
      return;
    }
    await loadUsers();
    onUsersChanged?.();
  };

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const handleSaveServiceStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setSvcSaving(true);
    setSvcFeedback(null);
    try {
      const res = await fetch('/api/service-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: svcStatusDraft,
          message: svcMessageDraft.trim() || STANDARD_SUSPEND_MESSAGE,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSvcFeedback({
          type: 'err',
          text: data.error || 'No se pudo actualizar el estado del servicio.',
        });
        return;
      }
      if (data.serviceStatus) {
        onServiceStatusUpdated(data.serviceStatus);
      }
      setSvcFeedback({
        type: 'ok',
        text:
          svcStatusDraft === 'Suspendido'
            ? 'Servicio suspendido. Todos los usuarios normales verán la pantalla de bloqueo.'
            : 'Servicio reactivado a Activo. Todos los usuarios autorizados pueden ingresar.',
      });
    } catch {
      setSvcFeedback({
        type: 'err',
        text: 'Error de conexión al guardar el estado del servicio.',
      });
    } finally {
      setSvcSaving(false);
    }
  };

  const protectedAdminUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/admin-servicio` : '/admin-servicio';

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (filterTab === 'aplicadores') return Boolean(u.requiereCarnetAplicador);
      if (filterTab === 'tractoristas') return Boolean(u.requiereCarnetTractorista);
      if (filterTab === 'alertas') {
        const sag = evaluateCarnetStatus(
          u.requiereCarnetAplicador,
          u.carnetAplicadorNumero,
          u.carnetAplicadorVencimiento
        );
        const trac = evaluateCarnetStatus(
          u.requiereCarnetTractorista,
          u.carnetTractoristaNumero,
          u.carnetTractoristaVencimiento
        );
        return (
          sag.estado === 'vencido' ||
          sag.estado === 'por_vencer' ||
          sag.estado === 'faltante' ||
          trac.estado === 'vencido' ||
          trac.estado === 'por_vencer' ||
          trac.estado === 'faltante'
        );
      }
      return true;
    });
  }, [users, filterTab]);

  return (
    <div className="space-y-6">
      {/* Superadmin-only Service Status / Maintenance Control */}
      <form
        onSubmit={handleSaveServiceStatus}
        className={`rounded-xl border p-5 space-y-4 ${
          serviceStatus.status === 'Suspendido'
            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Power className="w-4 h-4" />
              <span>Control Exclusivo Superadministrador</span>
            </div>
            <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
              Estado del Servicio / Mantenimiento
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Controla el acceso global de los usuarios de la agrícola. Cuando está suspendido, los datos permanecen intactos y solo el Superadministrador puede ingresar y reactivarlo.
            </p>
          </div>

          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border shrink-0 self-start sm:self-center ${
              serviceStatus.status === 'Suspendido'
                ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                : 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            {serviceStatus.status === 'Suspendido' ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>Estado actual: {serviceStatus.status}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          <div className="lg:col-span-4 space-y-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Modo de Operación
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSvcStatusDraft('Activo')}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                  svcStatusDraft === 'Activo'
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Activo
              </button>
              <button
                type="button"
                onClick={() => setSvcStatusDraft('Suspendido')}
                className={`min-h-[42px] px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                  svcStatusDraft === 'Suspendido'
                    ? 'bg-rose-700 border-rose-700 text-white'
                    : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                Suspendido
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Ruta protegida Superadmin:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(protectedAdminUrl);
                    setCopiedRoute(true);
                    setTimeout(() => setCopiedRoute(false), 1800);
                  }}
                  className="text-emerald-700 dark:text-emerald-400 font-semibold hover:underline"
                >
                  {copiedRoute ? 'Copiada' : 'Copiar URL'}
                </button>
              </div>
              <div className="font-mono text-[11px] truncate text-slate-500">
                /admin-servicio
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Mensaje personalizado para pantalla de bloqueo
              </label>
              <button
                type="button"
                onClick={() => setSvcMessageDraft(STANDARD_SUSPEND_MESSAGE)}
                className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
              >
                Usar mensaje estándar
              </button>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              value={svcMessageDraft}
              onChange={(e) => setSvcMessageDraft(e.target.value)}
              placeholder={STANDARD_SUSPEND_MESSAGE}
              className="w-full px-3 py-2 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700"
            />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {svcMessageDraft.length}/500 caracteres
                {serviceStatus.updatedAt
                  ? ` · Último cambio: ${new Date(serviceStatus.updatedAt).toLocaleString('es-CL', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}`
                  : ''}
              </span>
              <button
                type="submit"
                disabled={svcSaving}
                className="min-h-[42px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-emerald-700 dark:hover:bg-emerald-800 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{svcSaving ? 'Guardando...' : 'Aplicar Estado del Servicio'}</span>
              </button>
            </div>
          </div>
        </div>

        {svcFeedback && (
          <div
            className={`p-3 rounded-lg text-xs border ${
              svcFeedback.type === 'ok'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
            }`}
          >
            {svcFeedback.text}
          </div>
        )}
      </form>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Módulo Exclusivo Administrador de la App</span>
          </div>
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            Personal, Roles Agrícolas, Carnets SAG/Clase D y Niveles de Acceso
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gestiona cuentas con acceso por Correo o RUT, permisos granulares por pestaña, carnet de aplicador fitosanitario y carnet de tractorista.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium whitespace-nowrap shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg"
        >
          {(
            [
              { id: 'todos', label: `Todo el Personal (${users.length})` },
              {
                id: 'aplicadores',
                label: `Con Carnet Aplicador (${users.filter((u) => u.requiereCarnetAplicador).length})`,
              },
              {
                id: 'tractoristas',
                label: `Con Carnet Tractorista (${users.filter((u) => u.requiereCarnetTractorista).length})`,
              },
              { id: 'alertas', label: 'Alertas de Carnet' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={filterTab === t.id}
              onClick={() => setFilterTab(t.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterTab === t.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Persona y Cargo</th>
                <th className="py-3 px-4">Ingreso (Correo / RUT)</th>
                <th className="py-3 px-4">Rol y Nivel de Acceso</th>
                <th className="py-3 px-4">Carnets Habilitantes</th>
                <th className="py-3 px-4">Clave Asignada (Solo Admin)</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const revealed = Boolean(revealedIds[u.id]);
                  const hasVisiblePass = Boolean(u.claveVisible);
                  const sag = evaluateCarnetStatus(
                    u.requiereCarnetAplicador,
                    u.carnetAplicadorNumero,
                    u.carnetAplicadorVencimiento
                  );
                  const trac = evaluateCarnetStatus(
                    u.requiereCarnetTractorista,
                    u.carnetTractoristaNumero,
                    u.carnetTractoristaVencimiento
                  );

                  const activeModCount = Object.values(
                    u.permisos || getDefaultPermissionsForRole(u.rol)
                  ).filter((v) => v !== 'ninguno').length;

                  const editModCount = Object.values(
                    u.permisos || getDefaultPermissionsForRole(u.rol)
                  ).filter((v) => v === 'edicion').length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
                            {getUserInitials(u.nombre)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {u.nombre}
                            </div>
                            <div className="text-xs text-slate-500 truncate">{u.cargo}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {u.email && (
                          <div className="text-slate-800 dark:text-slate-200">{u.email}</div>
                        )}
                        {u.rut && <div className="text-slate-500">RUT {u.rut}</div>}
                        {!u.email && !u.rut && <div className="text-slate-500">{u.username}</div>}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {normalizeRole(u.rol)}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 font-mono tabular-nums">
                          {u.nivelAcceso || 'Según Rol'} · {activeModCount} pestañas ({editModCount} edición)
                        </div>
                      </td>

                      <td className="py-3 px-4 text-xs space-y-1">
                        {!u.requiereCarnetAplicador && !u.requiereCarnetTractorista && (
                          <span className="text-slate-400">No requiere carnets</span>
                        )}
                        {u.requiereCarnetAplicador && (
                          <div className="flex items-center gap-1.5">
                            {sag.estado === 'vigente' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span>
                              <strong>Aplicador SAG:</strong> {u.carnetAplicadorNumero || '—'}{' '}
                              <span
                                className={
                                  sag.estado === 'vigente'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400 font-semibold'
                                }
                              >
                                ({sag.label})
                              </span>
                            </span>
                          </div>
                        )}
                        {u.requiereCarnetTractorista && (
                          <div className="flex items-center gap-1.5">
                            {trac.estado === 'vigente' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            )}
                            <span>
                              <strong>Tractorista D:</strong> {u.carnetTractoristaNumero || '—'}{' '}
                              <span
                                className={
                                  trac.estado === 'vigente'
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-rose-700 dark:text-rose-400 font-semibold'
                                }
                              >
                                ({trac.label})
                              </span>
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs">
                        {hasVisiblePass ? (
                          <div className="inline-flex items-center gap-2">
                            <span className="text-slate-800 dark:text-slate-200">
                              {revealed ? u.claveVisible : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setRevealedIds((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                              }
                              className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              aria-label={revealed ? 'Ocultar clave' : 'Ver clave'}
                            >
                              {revealed ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(u.id, u.claveVisible || '')}
                              className="p-1 text-slate-500 hover:text-emerald-700"
                              aria-label="Copiar clave"
                            >
                              {copiedId === u.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 inline-flex items-center gap-1">
                            <KeyRound className="w-3 h-3" />
                            <span>Protegida (hash)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-xs">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          disabled={u.id === currentUserId}
                          className={`font-medium ${
                            u.activo
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Suspendido'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            aria-label={`Editar ${u.nombre}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {u.id !== currentUserId && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u)}
                              aria-label={`Eliminar ${u.nombre}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Reference Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SELECTABLE_ROLES.map((r) => (
          <div
            key={r}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5"
          >
            <div className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
              {r}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              {ROLE_DESCRIPTIONS[r]}
            </p>
          </div>
        ))}
      </div>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-display text-base font-semibold">
                {editingUser ? `Editar Ficha de ${editingUser.nombre}` : 'Registrar Nuevo Integrante'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              {/* Identity & Login Identifiers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nombre completo</label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Nombre y apellido"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Cargo específico</label>
                  <input
                    type="text"
                    value={cargo}
                    onChange={(e) => setCargo(e.target.value)}
                    placeholder="Ej: Aplicador Fitosanitario / Secretaria"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Correo electrónico (Ingreso)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nombre@gmail.com (opcional si usa RUT)"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">RUT chileno (Ingreso)</label>
                  <input
                    type="text"
                    value={rut}
                    onChange={(e) => setRut(e.target.value)}
                    placeholder="16.432.890-2"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">
                    {editingUser ? 'Nueva Clave (opcional)' : 'Clave de Acceso'}
                  </label>
                  <input
                    type="text"
                    required={!editingUser}
                    minLength={editingUser ? undefined : 4}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mín. 4 caracteres"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              {/* Role & Global Access Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Tipo de Usuario (Rol en Agrícola)</label>
                  <select
                    value={rol}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {SELECTABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Nivel Global de Acceso a la App</label>
                  <select
                    value={nivelAcceso}
                    onChange={(e) => handleGlobalLevelChange(e.target.value as NivelGlobalAcceso)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="Personalizado">Personalizado / Según Rol</option>
                    <option value="Total">Total (Edición en toda la app)</option>
                    <option value="Alto">Alto (Edición operativa, sin gestión de usuarios)</option>
                    <option value="Medio">Medio (Edición en área + lectura resto)</option>
                    <option value="Básico">Básico (Solo terreno: labores, riego, plagas, cosecha)</option>
                    <option value="Solo Lectura">Solo Lectura (Consulta y descargas)</option>
                  </select>
                </div>
              </div>

              {/* Granular Module Permissions Matrix */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-slate-50/70 dark:bg-slate-950/50 space-y-2.5">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Permisos Individuales por Pestaña (Dar más o menos acceso)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {ALL_MODULE_META.filter((m) => m.id !== 'usuarios').map((mod) => {
                    const currentVal = permisos[mod.id] || 'ninguno';
                    return (
                      <div
                        key={mod.id}
                        className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                          {mod.label}
                        </span>
                        <select
                          value={currentVal}
                          onChange={(e) =>
                            handleModulePermChange(mod.id, e.target.value as NivelAccesoModulo)
                          }
                          className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                        >
                          <option value="ninguno">Sin acceso</option>
                          <option value="lectura">Lectura</option>
                          <option value="edicion">Edición</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SAG & Tractorista Licenses */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <IdCard className="w-4 h-4 text-emerald-700" />
                  <span>Acreditación de Carnets y Licencias (Según corresponda)</span>
                </div>

                {/* Carnet Aplicador SAG */}
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqAplicador}
                      onChange={(e) => setReqAplicador(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-700"
                    />
                    <span>
                      Realiza aplicaciones fitosanitarias · Requiere Carnet de Aplicador SAG
                    </span>
                  </label>
                  {reqAplicador && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          N° Carnet Aplicador SAG
                        </label>
                        <input
                          type="text"
                          value={numAplicador}
                          onChange={(e) => setNumAplicador(e.target.value)}
                          placeholder="Ej: SAG-AP-14-0892"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Fecha Vencimiento Carnet SAG
                        </label>
                        <input
                          type="date"
                          value={vencAplicador}
                          onChange={(e) => setVencAplicador(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Carnet Tractorista Clase D */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reqTractorista}
                      onChange={(e) => setReqTractorista(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-700"
                    />
                    <span>
                      Conduce tractor / nebulizador · Requiere Carnet de Tractorista (Licencia Clase D)
                    </span>
                  </label>
                  {reqTractorista && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-6">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          N° Licencia Clase D / Carnet Tractorista
                        </label>
                        <input
                          type="text"
                          value={numTractorista}
                          onChange={(e) => setNumTractorista(e.target.value)}
                          placeholder="Ej: Clase D · Mun. Panguipulli #4412"
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">
                          Fecha Vencimiento Licencia Clase D
                        </label>
                        <input
                          type="date"
                          value={vencTractorista}
                          onChange={(e) => setVencTractorista(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
                >
                  Guardar Integrante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
