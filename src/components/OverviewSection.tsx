import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sprout,
  Warehouse,
  ClipboardCheck,
  Bug,
  MapPin,
  Droplets,
  CloudSun,
  Tractor,
  Pencil,
  Snowflake,
  PackageCheck,
  Users,
  TestTube2,
  TrendingUp,
  BellRing,
} from 'lucide-react';
import {
  CuadernoState,
  NavSection,
  PersonalHabilitadoItem,
  WeatherSnapshot,
} from '../types/fieldbook';
import { AGRICOLA_INFO, ESTATE_IMAGES } from '../data/initialData';
import {
  formatCurrencyCLP,
  formatDateCL,
  formatNumberCL,
  getCarenciaStatus,
} from '../utils/formatters';
import { computeSmartAlerts } from '../utils/alertsEngine';
import { ResilientImage } from './ResilientImage';

interface OverviewSectionProps {
  state: CuadernoState;
  allowedSections: NavSection[];
  personalHabilitado: PersonalHabilitadoItem[];
  weather: WeatherSnapshot | null;
  frostThresholdC: number;
  canViewUsuarios: boolean;
  canEditLabores: boolean;
  canEditCosecha: boolean;
  canEditEmpresa: boolean;
  onEditEmpresa: () => void;
  onNavigate: (section: NavSection) => void;
  onOpenNewLabor: () => void;
  onOpenNewCosecha: () => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  state,
  allowedSections,
  personalHabilitado,
  weather,
  frostThresholdC,
  canViewUsuarios,
  canEditLabores,
  canEditCosecha,
  canEditEmpresa,
  onEditEmpresa,
  onNavigate,
  onOpenNewLabor,
  onOpenNewCosecha,
}) => {
  const empresa = state.empresaInfo || AGRICOLA_INFO;
  const totalHa = state.cuarteles.reduce((acc, c) => acc + c.superficieHa, 0);
  const laboresPendientes = state.labores.filter((l) => l.estado !== 'Completada');
  const costoLaboresMes = state.labores.reduce((acc, l) => acc + l.costoCLP, 0);

  const totalKilosNetos = state.cosechas.reduce(
    (acc, c) => acc + Math.max(0, c.kilosBrutos - c.kilosDescarte),
    0
  );

  const carenciasEval = state.aplicaciones
    .map((ap) => {
      const cuartel = state.cuarteles.find((c) => c.id === ap.cuartelId);
      const status = getCarenciaStatus(ap.fecha, ap.carenciaDias);
      return { ap, cuartel, ...status };
    })
    .sort((a, b) => b.diasRestantes - a.diasRestantes);

  const carenciasActivas = carenciasEval.filter((c) => c.enCarencia);
  const stockBajoItems = state.bodega.filter((i) => i.stockActual <= i.stockMinimo);
  const ordenesPendientes = state.ordenesAplicacion.filter(
    (o) => o.estado === 'Emitida' || o.estado === 'En Ejecución'
  );
  const plagasAlerta = state.plagas.filter(
    (p) => p.nivel === 'Umbral Alerta' || p.nivel === 'Crítico'
  );

  const ultimasLabores = [...state.labores]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 6);

  const resumenPorCultivo = state.cultivos.map((cultivoCfg) => {
    const cuartelesCul = state.cuarteles.filter((c) => c.cultivo === cultivoCfg.nombre);
    const haCul = cuartelesCul.reduce((acc, c) => acc + c.superficieHa, 0);
    const cosechasCul = state.cosechas.filter((c) => c.cultivo === cultivoCfg.nombre);
    const kgNetos = cosechasCul.reduce(
      (acc, c) => acc + Math.max(0, c.kilosBrutos - c.kilosDescarte),
      0
    );
    const avgBrix =
      cosechasCul.length > 0
        ? cosechasCul.reduce((acc, c) => acc + c.brix, 0) / cosechasCul.length
        : 0;
    return {
      cultivo: cultivoCfg.nombre,
      colorHex: cultivoCfg.colorHex,
      cuartelesCount: cuartelesCul.length,
      haCul,
      kgNetos,
      rendimientoHa: haCul > 0 ? kgNetos / haCul : 0,
      avgBrix,
    };
  });

  const canGo = (s: NavSection) => allowedSections.includes(s);
  const totalCostoCuadrillas = state.cuadrillas.reduce((acc, r) => acc + r.totalPagarCLP, 0);
  const costoTotalOp =
    costoLaboresMes +
    state.maquinaria.reduce((acc, m) => acc + m.costoCLP, 0) +
    totalCostoCuadrillas +
    state.costosExtras
      .filter((c) => c.tipo === 'Costo')
      .reduce((acc, c) => acc + c.montoCLP, 0);
  const ingresoTotalOp = state.costosExtras
    .filter((c) => c.tipo === 'Ingreso')
    .reduce((acc, c) => acc + c.montoCLP, 0);

  const smartAlerts = computeSmartAlerts(
    state,
    personalHabilitado,
    weather,
    frostThresholdC,
    canViewUsuarios
  );

  return (
    <div className="space-y-8">
      {/* Panorama Hero Banner */}
      <section className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900">
        <div className="h-56 sm:h-64 w-full relative">
          <ResilientImage
            src={ESTATE_IMAGES.panorama}
            alt={`Vista del predio ${empresa.nombreCorto} en ${empresa.comuna}`}
            className="w-full h-full object-cover"
            fallbackLabel={`${empresa.nombreCorto} — ${empresa.comuna}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/55 to-slate-950/20" />
          <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-medium text-emerald-300 tracking-wide mb-1.5 font-mono tabular-nums">
                RUT {empresa.rut} · Ref. {empresa.referencia} · {empresa.comuna}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
                {empresa.razonSocial}
              </h2>
              <p className="text-sm text-slate-200 mt-1.5 max-w-xl">
                Control productivo georreferenciado de {state.cultivos.map((c) => c.nombre).join(', ')} · {empresa.certificacion}.
              </p>
              {(empresa.representanteLegal || empresa.telefono || empresa.email) && (
                <p className="text-xs text-slate-300/90 mt-1">
                  {[
                    empresa.representanteLegal ? `Rep. Legal: ${empresa.representanteLegal}` : '',
                    empresa.telefono,
                    empresa.email,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {canEditEmpresa && (
                <button
                  type="button"
                  onClick={onEditEmpresa}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/25 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar Datos Agrícola</span>
                </button>
              )}
              {canGo('mapa') && (
                <button
                  type="button"
                  onClick={() => onNavigate('mapa')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/25 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                >
                  <MapPin className="w-4 h-4" />
                  <span>Mapa Satelital</span>
                </button>
              )}
              {canEditCosecha && (
                <button
                  type="button"
                  onClick={onOpenNewCosecha}
                  className="px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/25 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Registrar Cosecha
                </button>
              )}
              {canEditLabores && (
                <button
                  type="button"
                  onClick={onOpenNewLabor}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                >
                  Nueva Labor
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* KPI Strip */}
      <section aria-label="Indicadores productivos" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Superficie Plantada
          </p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-2">
            {formatNumberCL(totalHa, 1)} ha
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {state.cuarteles.length} cuarteles en {state.cultivos.length} cultivos
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Cosecha Neta Temporada
          </p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-2">
            {formatNumberCL(totalKilosNetos, 0)} kg
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {state.cosechas.length} despachos / entregas registradas
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Carencias Vigentes
          </p>
          <div className="flex items-baseline gap-2.5 mt-2">
            <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {carenciasActivas.length}
            </p>
            {carenciasActivas.length > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Bloqueo cosecha</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Cuarteles liberados</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {state.aplicaciones.length} aplicaciones en registro
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Labores Pendientes / Curso
          </p>
          <p className="font-mono tabular-nums text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-2">
            {laboresPendientes.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Costo labores: <span className="font-mono tabular-nums">{formatCurrencyCLP(costoLaboresMes)}</span>
          </p>
        </div>
      </section>

      {/* Centro de Alertas Inteligentes */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BellRing
              className={`w-4 h-4 shrink-0 ${
                smartAlerts.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
              }`}
            />
            <div>
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Centro de Alertas Inteligentes ({smartAlerts.length})
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Supervisión automática de carencias, stock y vencimientos de bodega, carnets SAG/Clase D y riesgo de heladas
              </p>
            </div>
          </div>
        </div>

        {smartAlerts.length === 0 ? (
          <div className="px-5 py-4 flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Sin alertas operativas críticas: stock, carnets, carencias y temperaturas en rango normal.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80 max-h-80 overflow-y-auto">
            {smartAlerts.map((alert) => {
              const targetAllowed = canGo(alert.targetSection);
              return (
                <div
                  key={alert.id}
                  className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                >
                  <div className="min-w-0 flex items-start gap-2.5">
                    <span
                      className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        alert.severity === 'critical'
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          : alert.severity === 'warning'
                          ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-900'
                      }`}
                    >
                      {alert.category}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {alert.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {alert.detail}
                      </p>
                    </div>
                  </div>
                  {targetAllowed && (
                    <button
                      type="button"
                      onClick={() => onNavigate(alert.targetSection)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 self-start sm:self-center whitespace-nowrap"
                    >
                      <span>Ir al módulo</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Operational Alerts & Quick Links to Individual Modules */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <button
          type="button"
          disabled={!canGo('bodega')}
          onClick={() => canGo('bodega') && onNavigate('bodega')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <Warehouse className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Bodega Fitosanitaria y Fertilizantes
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {stockBajoItems.length > 0
                  ? `${stockBajoItems.length} ítem(s) bajo stock mínimo`
                  : `${state.bodega.length} productos con stock óptimo`}
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-sm font-bold text-amber-700 dark:text-amber-400">
            {stockBajoItems.length}
          </span>
        </button>

        <button
          type="button"
          disabled={!canGo('ordenes')}
          onClick={() => canGo('ordenes') && onNavigate('ordenes')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Órdenes de Aplicación
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {ordenesPendientes.length} orden(es) emitidas o en ejecución
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-sm font-bold text-blue-700 dark:text-blue-400">
            {ordenesPendientes.length}
          </span>
        </button>

        <button
          type="button"
          disabled={!canGo('plagas')}
          onClick={() => canGo('plagas') && onNavigate('plagas')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <Bug className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Control de Plagas Georreferenciado
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {plagasAlerta.length} foco(s) en umbral alerta o crítico
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-sm font-bold text-rose-700 dark:text-rose-400">
            {plagasAlerta.length}
          </span>
        </button>

        <button
          type="button"
          disabled={!canGo('riego')}
          onClick={() => canGo('riego') && onNavigate('riego')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <Droplets className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Control de Riego
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {state.riegos.length} eventos · pH, CE y humedad de suelo
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-sm font-bold text-sky-700 dark:text-sky-400">
            {state.riegos.length}
          </span>
        </button>

        <button
          type="button"
          disabled={!canGo('clima')}
          onClick={() => canGo('clima') && onNavigate('clima')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <CloudSun className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Clima Predial (Panguipulli)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Pronóstico satelital y riesgo de heladas
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-sm font-bold text-amber-700 dark:text-amber-400">
            {state.climaRegistros.length}
          </span>
        </button>

        <button
          type="button"
          disabled={!canGo('maquinaria')}
          onClick={() => canGo('maquinaria') && onNavigate('maquinaria')}
          className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors disabled:opacity-60"
        >
          <div className="flex items-start gap-3">
            <Tractor className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Maquinaria y Equipos
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {state.maquinas.length} equipos · compatibilidad por cultivo
              </p>
            </div>
          </div>
          <span className="font-mono tabular-nums text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {state.maquinas.length}
          </span>
        </button>

        {canGo('heladas') && (
          <button
            type="button"
            onClick={() => onNavigate('heladas')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Snowflake className="w-5 h-5 text-cyan-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Control de Heladas y Alertas Térmicas
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {state.heladas.length} evento(s) registrados con control activo
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold text-cyan-700 dark:text-cyan-400">
              {state.heladas.length}
            </span>
          </button>
        )}

        {canGo('postcosecha') && (
          <button
            type="button"
            onClick={() => onNavigate('postcosecha')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <PackageCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Postcosecha, Packing y Frío
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {state.postcosecha.length} lotes trazables · pallets y cadena de frío
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold text-indigo-700 dark:text-indigo-400">
              {state.postcosecha.length}
            </span>
          </button>
        )}

        {canGo('cuadrillas') && (
          <button
            type="button"
            onClick={() => onNavigate('cuadrillas')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Cuadrillas, Cosecheros y Tratos
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {state.cuadrillas.length} planillas · {formatCurrencyCLP(totalCostoCuadrillas)}
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold text-teal-700 dark:text-teal-400">
              {state.cuadrillas.length}
            </span>
          </button>
        )}

        {canGo('suelos') && (
          <button
            type="button"
            onClick={() => onNavigate('suelos')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <TestTube2 className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Suelos, Agua y Fertirriego
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {state.suelosAnalisis.length} análisis · {state.programasFertirriego.length} programas nutrición
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-sm font-bold text-sky-700 dark:text-sky-400">
              {state.suelosAnalisis.length}
            </span>
          </button>
        )}

        {canGo('costos') && (
          <button
            type="button"
            onClick={() => onNavigate('costos')}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-600/50 rounded-xl p-4 flex items-center justify-between gap-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Costos y Rentabilidad
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Margen neto: {formatCurrencyCLP(ingresoTotalOp - costoTotalOp)}
                </p>
              </div>
            </div>
            <span className="font-mono tabular-nums text-xs font-bold text-emerald-700 dark:text-emerald-400">
              P&L
            </span>
          </button>
        )}
      </section>

      {/* Producción por Cultivo (dinámico) */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sprout className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              Desempeño Individual por Cultivo — Temporada Actual
            </h3>
          </div>
          {canGo('cosecha') && (
            <button
              type="button"
              onClick={() => onNavigate('cosecha')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap"
            >
              <span>Detalle de cosecha</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {resumenPorCultivo.map((item) => (
            <div key={item.cultivo} className="p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                  <span
                    style={{ backgroundColor: item.colorHex }}
                    className="w-2.5 h-2.5 rounded-full inline-block"
                  />
                  <span>{item.cultivo}</span>
                </span>
                <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
                  {item.cuartelesCount} cuarteles · {formatNumberCL(item.haCul, 1)} ha
                </span>
              </div>
              <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-3">
                {formatNumberCL(item.kgNetos, 0)} kg netos
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 font-mono tabular-nums">
                <span>{formatNumberCL(item.rendimientoHa, 0)} kg/ha</span>
                <span aria-hidden="true">·</span>
                <span>
                  {item.avgBrix > 0 ? `${formatNumberCL(item.avgBrix, 1)} °Brix prom.` : 'Sin cosecha aún'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Main 2-column Operational Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Últimas Labores Registradas
              </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Operaciones diarias en cuarteles de {empresa.nombreCorto}
                </p>
            </div>
            {canGo('labores') && (
              <button
                type="button"
                onClick={() => onNavigate('labores')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Ver cuaderno</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {ultimasLabores.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Sin labores registradas aún. Agrega una labor o crea tus cuarteles para comenzar.
              </div>
            ) : (
              ultimasLabores.map((labor) => {
              const cuartel = state.cuarteles.find((c) => c.id === labor.cuartelId);
              return (
                <div
                  key={labor.id}
                  className="px-5 py-3.5 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-mono tabular-nums">{formatDateCL(labor.fecha)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : 'General'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{labor.tipo}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {labor.descripcion}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {labor.responsable} · {labor.maquinaria || 'Manual'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${
                        labor.estado === 'Completada'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : labor.estado === 'En Curso'
                          ? 'text-amber-700 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {labor.estado === 'Completada' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3.5 h-3.5" />
                      )}
                      <span>{labor.estado}</span>
                    </span>
                    <p className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {formatNumberCL(labor.horasTrabajo, 1)} h
                    </p>
                  </div>
                </div>
              );
            })
            )}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
                Control de Carencias SAG
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ventana de resguardo previa a cosecha
              </p>
            </div>
            {canGo('aplicaciones') && (
              <button
                type="button"
                onClick={() => onNavigate('aplicaciones')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline whitespace-nowrap shrink-0"
              >
                <span>Ver todas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {carenciasEval.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                Sin aplicaciones fitosanitarias registradas.
              </div>
            ) : (
              carenciasEval.map(({ ap, cuartel, fechaLiberacion, diasRestantes, enCarencia }) => (
              <div key={ap.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {ap.productoComercial}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {cuartel ? `${cuartel.codigo} (${cuartel.cultivo})` : 'Cuartel'} · Libera{' '}
                    <span className="font-mono tabular-nums">{formatDateCL(fechaLiberacion)}</span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  {enCarencia ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="font-mono tabular-nums">{diasRestantes} d restantes</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Liberado</span>
                    </span>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                    Reingreso {ap.reingresoHoras} h
                  </p>
                </div>
              </div>
            ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
