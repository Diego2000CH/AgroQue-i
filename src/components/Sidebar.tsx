import React from 'react';
import {
  LayoutDashboard,
  MapPin,
  Sprout,
  Grid2x2,
  Tractor,
  Droplets,
  CloudSun,
  Bug,
  ClipboardCheck,
  FlaskConical,
  Warehouse,
  BookOpen,
  Scale,
  ShieldCheck,
  Sun,
  Moon,
  DatabaseBackup,
  LogOut,
  X,
  Snowflake,
  PackageCheck,
  Users,
  TestTube2,
  TrendingUp,
} from 'lucide-react';
import { AgricolaInfo, AuthUserSession, NavSection } from '../types/fieldbook';
import { getAllowedSectionsForUser, getUserInitials, isAppAdmin } from '../utils/rbac';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  user: AuthUserSession;
  empresaInfo: AgricolaInfo;
  totalHa: number;
  carenciasActivas: number;
  stockBajoCount: number;
  ordenesPendientesCount: number;
  plagasAlertaCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenBackupModal: () => void;
  onOpenProfileModal: () => void;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function getAllowedSectionsForRole(user: AuthUserSession): NavSection[] {
  return getAllowedSectionsForUser(user);
}

const NAV_ITEMS: {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'resumen', label: 'Resumen Productivo', icon: LayoutDashboard },
  { id: 'mapa', label: 'Mapa Satelital Huerto', icon: MapPin },
  { id: 'cultivos', label: 'Cultivos y Variedades', icon: Sprout },
  { id: 'cuarteles', label: 'Cuarteles Prediales', icon: Grid2x2 },
  { id: 'maquinaria', label: 'Maquinaria y Equipos', icon: Tractor },
  { id: 'riego', label: 'Riego y Sectores', icon: Droplets },
  { id: 'clima', label: 'Clima Georreferenciado', icon: CloudSun },
  { id: 'heladas', label: 'Control de Heladas', icon: Snowflake },
  { id: 'plagas', label: 'Control de Plagas', icon: Bug },
  { id: 'ordenes', label: 'Órdenes de Aplicación', icon: ClipboardCheck },
  { id: 'aplicaciones', label: 'Aplicaciones y Carencias', icon: FlaskConical },
  { id: 'bodega', label: 'Bodega e Inventario', icon: Warehouse },
  { id: 'labores', label: 'Cuaderno de Labores', icon: BookOpen },
  { id: 'cosecha', label: 'Control de Cosecha', icon: Scale },
  { id: 'postcosecha', label: 'Postcosecha y Frío', icon: PackageCheck },
  { id: 'cuadrillas', label: 'Cuadrillas y Tratos', icon: Users },
  { id: 'suelos', label: 'Suelos, Agua y Fertirriego', icon: TestTube2 },
  { id: 'costos', label: 'Costos y Rentabilidad', icon: TrendingUp },
  { id: 'usuarios', label: 'Usuarios, Carnets y Accesos', icon: ShieldCheck },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  user,
  empresaInfo,
  totalHa,
  carenciasActivas,
  stockBajoCount,
  ordenesPendientesCount,
  plagasAlertaCount,
  darkMode,
  onToggleDarkMode,
  onOpenBackupModal,
  onOpenProfileModal,
  onLogout,
  mobileOpen,
  onCloseMobile,
}) => {
  const allowed = getAllowedSectionsForUser(user);
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.id === 'usuarios' && !isAppAdmin(user.rol)) return false;
    return allowed.includes(item.id);
  });

  const canBackup = isAppAdmin(user.rol) || user.rol === 'Administrador del Campo' || user.rol === 'Agrónomo';

  const sidebarBody = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] print:hidden">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="font-display text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 block truncate">
            {empresaInfo.nombreCorto}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 font-mono tabular-nums">
            RUT {empresaInfo.rut} · Ref. {empresaInfo.referencia}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate">
            {empresaInfo.comuna}
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto" aria-label="Navegación principal">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          let countBadge = 0;
          let countTone = 'text-amber-700 dark:text-amber-400';

          if (item.id === 'aplicaciones') countBadge = carenciasActivas;
          if (item.id === 'bodega') countBadge = stockBajoCount;
          if (item.id === 'plagas') {
            countBadge = plagasAlertaCount;
            countTone = 'text-rose-700 dark:text-rose-400';
          }
          if (item.id === 'ordenes') {
            countBadge = ordenesPendientesCount;
            countTone = 'text-blue-700 dark:text-blue-400';
          }

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 lg:py-1.5 rounded-lg text-sm lg:text-xs font-medium transition-colors duration-150 whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </span>
              {countBadge > 0 && (
                <span className={`font-mono tabular-nums text-[11px] font-semibold shrink-0 ${countTone}`}>
                  {countBadge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
        <span>Superficie productiva</span>
        <span className="font-mono tabular-nums font-medium text-slate-800 dark:text-slate-200">
          {totalHa.toFixed(1)} ha
        </span>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <button
          type="button"
          onClick={onOpenProfileModal}
          className="w-full flex items-center gap-3 text-left group rounded-lg p-1 -m-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
          title="Ver mi cuenta y carnets habilitantes"
        >
          <div className="w-9 h-9 rounded-full bg-emerald-700 text-white font-display font-bold text-xs flex items-center justify-center shrink-0">
            {getUserInitials(user.nombre)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user.nombre}
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
              {user.rol}
            </p>
            {(user.rut || user.email) && (
              <p className="text-[10px] font-mono text-slate-400 truncate">
                {user.rut || user.email}
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onToggleDarkMode}
            className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? 'Claro' : 'Oscuro'}</span>
          </button>

          {canBackup && (
            <button
              type="button"
              onClick={onOpenBackupModal}
              title="Respaldo y datos"
              aria-label="Respaldo y datos"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <DatabaseBackup className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <PWAInstallButton />
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-[268px] shrink-0 h-dvh sticky top-0 print:hidden">
        {sidebarBody}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex print:hidden">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-[288px] max-w-[85vw] h-dvh z-10">{sidebarBody}</div>
        </div>
      )}
    </>
  );
};
