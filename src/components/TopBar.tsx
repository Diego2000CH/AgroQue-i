import React from 'react';
import { Menu, Plus, Download, Printer, WifiOff } from 'lucide-react';
import { NavSection } from '../types/fieldbook';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onExportCSV?: () => void;
  isOnline?: boolean;
  pendingSyncCount?: number;
}

const SECTION_TITLES: Record<NavSection, string> = {
  resumen: 'Resumen Productivo',
  mapa: 'Mapa Satelital del Huerto',
  cultivos: 'Cultivos y Variedades',
  cuarteles: 'Catastro de Cuarteles Prediales',
  maquinaria: 'Maquinaria, Equipos y Combustible',
  riego: 'Control de Riego, Sectores y Fertirriego',
  clima: 'Clima Georreferenciado',
  heladas: 'Control de Heladas y Alertas Térmicas',
  plagas: 'Control y Monitoreo de Plagas',
  ordenes: 'Órdenes de Aplicación',
  aplicaciones: 'Aplicaciones y Carencias',
  bodega: 'Bodega Fitosanitaria, Fertilizantes y Repuestos',
  labores: 'Cuaderno de Labores',
  cosecha: 'Control de Cosecha por Cultivo',
  postcosecha: 'Postcosecha, Frío y Trazabilidad',
  cuadrillas: 'Cuadrillas, Cosecheros y Tratos',
  suelos: 'Suelos, Agua y Fertirriego',
  costos: 'Costos y Rentabilidad por Cuartel',
  usuarios: 'Usuarios, Carnets y Niveles de Acceso',
};

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onOpenMobileMenu,
  onPrimaryAction,
  primaryActionLabel,
  onExportCSV,
  isOnline = true,
  pendingSyncCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top)] min-h-16 flex items-center justify-between gap-2 sm:gap-4 print:hidden">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden min-w-[40px] min-h-[40px] flex items-center justify-center -ml-1 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Abrir navegación"
        >
          <Menu className="w-5 h-5" />
        </button>

        <nav aria-label="Ubicación actual" className="flex items-center gap-2 text-sm min-w-0">
          <span className="font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
            Agrícola Queñi
          </span>
          <span className="text-slate-300 dark:text-slate-700 hidden sm:inline" aria-hidden="true">
            /
          </span>
          <h1 className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {SECTION_TITLES[activeSection]}
          </h1>
        </nav>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {!isOnline && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-800 text-[11px] font-semibold text-amber-800 dark:text-amber-300 whitespace-nowrap">
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Sin señal</span>
            {pendingSyncCount > 0 && <span className="font-mono">({pendingSyncCount})</span>}
          </span>
        )}

        <PWAInstallButton compact />

        <button
          type="button"
          onClick={() => window.print()}
          title="Imprimir Carta"
          aria-label="Imprimir Carta"
          className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden md:inline">Imprimir Carta</span>
        </button>

        {onExportCSV && (
          <button
            type="button"
            onClick={onExportCSV}
            title="Exportar CSV"
            aria-label="Exportar CSV"
            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-2.5 sm:px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>
        )}

        {onPrimaryAction && primaryActionLabel && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center gap-1.5 min-h-[38px] px-3 sm:px-3.5 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="max-w-[110px] sm:max-w-none truncate">{primaryActionLabel}</span>
          </button>
        )}
      </div>
    </header>
  );
};
