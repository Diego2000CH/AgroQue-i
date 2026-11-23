import {
  AplicacionFitosanitaria,
  BodegaItem,
  CuadernoState,
  Cuartel,
  NavSection,
  PersonalHabilitadoItem,
  WeatherSnapshot,
} from '../types/fieldbook';
import { getCarenciaStatus, getTodayISO } from './formatters';
import { evaluateCarnetStatus } from './rbac';

export type SmartAlertSeverity = 'critical' | 'warning' | 'info';

export interface SmartAlertItem {
  id: string;
  severity: SmartAlertSeverity;
  category: 'Carencia' | 'Bodega' | 'Vencimiento' | 'Carnets' | 'Helada' | 'Plagas';
  title: string;
  detail: string;
  targetSection: NavSection;
}

const FROST_THRESHOLD_KEY = 'agricola_queni_frost_threshold_c_v1';
const CACHED_WEATHER_KEY = 'agricola_queni_weather_cache_v1';

export function getSavedFrostThreshold(): number {
  try {
    const raw = localStorage.getItem(FROST_THRESHOLD_KEY);
    if (raw !== null) {
      const n = Number(raw);
      if (!Number.isNaN(n) && n >= -10 && n <= 10) return n;
    }
  } catch {
    // Ignore
  }
  return 2.0;
}

export function saveFrostThreshold(val: number): void {
  try {
    localStorage.setItem(FROST_THRESHOLD_KEY, String(val));
  } catch {
    // Ignore
  }
}

export function loadCachedWeather(): WeatherSnapshot | null {
  try {
    const raw = localStorage.getItem(CACHED_WEATHER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WeatherSnapshot;
  } catch {
    return null;
  }
}

export function saveCachedWeather(snapshot: WeatherSnapshot): void {
  try {
    localStorage.setItem(CACHED_WEATHER_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore
  }
}

export function daysUntilDate(dateISO?: string): number | null {
  if (!dateISO) return null;
  const target = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date(`${getTodayISO()}T00:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export interface CarenciaOnDateResult {
  aplicacion: AplicacionFitosanitaria;
  fechaLiberacion: string;
  diasRestantes: number;
  enCarencia: boolean;
}

export function getCuartelCarenciasForDate(
  cuartelId: string,
  fechaEvaluacionISO: string,
  aplicaciones: AplicacionFitosanitaria[]
): CarenciaOnDateResult[] {
  const evalDate = new Date(`${fechaEvaluacionISO || getTodayISO()}T00:00:00`);
  return aplicaciones
    .filter((ap) => ap.cuartelId === cuartelId && ap.carenciaDias > 0)
    .map((ap) => {
      const apDate = new Date(`${ap.fecha}T00:00:00`);
      const libDate = new Date(apDate.getTime() + ap.carenciaDias * 86400000);
      const diffMs = libDate.getTime() - evalDate.getTime();
      const diasRestantes = Math.ceil(diffMs / 86400000);
      const enCarencia = evalDate.getTime() >= apDate.getTime() && diasRestantes > 0;
      return {
        aplicacion: ap,
        fechaLiberacion: libDate.toISOString().slice(0, 10),
        diasRestantes: Math.max(0, diasRestantes),
        enCarencia,
      };
    })
    .filter((item) => item.enCarencia)
    .sort((a, b) => b.diasRestantes - a.diasRestantes);
}

export function computeSmartAlerts(
  state: CuadernoState,
  personalHabilitado: PersonalHabilitadoItem[],
  weather: WeatherSnapshot | null,
  frostThresholdC: number,
  canViewUsuarios: boolean
): SmartAlertItem[] {
  const alerts: SmartAlertItem[] = [];

  // 1. Frost risk alert from WeatherSnapshot
  if (weather) {
    const minForecastDay = weather.forecast.reduce<{ date: string; tempMinC: number } | null>(
      (min, d) => (!min || d.tempMinC < min.tempMinC ? { date: d.date, tempMinC: d.tempMinC } : min),
      null
    );
    const currentAlert = weather.tempC <= frostThresholdC;
    const forecastAlert = minForecastDay && minForecastDay.tempMinC <= frostThresholdC;

    if (currentAlert || forecastAlert) {
      const minVal =
        currentAlert && (!minForecastDay || weather.tempC <= minForecastDay.tempMinC)
          ? weather.tempC
          : minForecastDay!.tempMinC;
      alerts.push({
        id: 'alert-frost-risk',
        severity: minVal <= 0 ? 'critical' : 'warning',
        category: 'Helada',
        title: `Riesgo de Helada en ${weather.locationName} (${minVal.toFixed(1)} °C)`,
        detail: currentAlert
          ? `Temperatura actual ${weather.tempC.toFixed(1)} °C bajo umbral configurado (${frostThresholdC.toFixed(1)} °C). Verifica microaspersión o torres.`
          : `Mínima pronosticada de ${minForecastDay!.tempMinC.toFixed(1)} °C para ${minForecastDay!.date} (umbral ≤ ${frostThresholdC.toFixed(1)} °C).`,
        targetSection: 'heladas',
      });
    }
  }

  // 2. Active Carencias blocking harvest
  state.aplicaciones.forEach((ap) => {
    const status = getCarenciaStatus(ap.fecha, ap.carenciaDias);
    if (status.enCarencia) {
      const ct: Cuartel | undefined = state.cuarteles.find((c) => c.id === ap.cuartelId);
      alerts.push({
        id: `alert-carencia-${ap.id}`,
        severity: status.diasRestantes <= 2 ? 'info' : 'warning',
        category: 'Carencia',
        title: `Bloqueo de cosecha: ${ct ? `${ct.codigo} ${ct.nombre}` : 'Cuartel'}`,
        detail: `${ap.productoComercial} (${ap.ingredienteActivo}) · Faltan ${status.diasRestantes} día(s), libera el ${status.fechaLiberacion}.`,
        targetSection: 'aplicaciones',
      });
    }
  });

  // 3. Bodega stock critical & product expiration (<= 30 days)
  state.bodega.forEach((item: BodegaItem) => {
    if (item.stockActual <= item.stockMinimo) {
      alerts.push({
        id: `alert-stock-${item.id}`,
        severity: item.stockActual <= 0 ? 'critical' : 'warning',
        category: 'Bodega',
        title: `Stock crítico: ${item.nombre}`,
        detail: `Disponible: ${item.stockActual} ${item.unidad} (mínimo ${item.stockMinimo} ${item.unidad}).`,
        targetSection: 'bodega',
      });
    }
    const expDays = daysUntilDate(item.fechaVencimiento);
    if (expDays !== null && expDays <= 30) {
      alerts.push({
        id: `alert-exp-${item.id}`,
        severity: expDays < 0 ? 'critical' : 'warning',
        category: 'Vencimiento',
        title:
          expDays < 0
            ? `Insumo vencido en bodega: ${item.nombre}`
            : `Insumo próximo a vencer (${expDays} d): ${item.nombre}`,
        detail: `Lote ${item.lote || 'S/N'} · Vence ${item.fechaVencimiento}.`,
        targetSection: 'bodega',
      });
    }
  });

  // 4. Carnet Aplicador SAG & Tractorista Clase D expiration
  personalHabilitado
    .filter((p) => p.activo)
    .forEach((p) => {
      const sag = evaluateCarnetStatus(
        p.requiereCarnetAplicador,
        p.carnetAplicadorNumero,
        p.carnetAplicadorVencimiento
      );
      if (sag.estado === 'vencido' || sag.estado === 'por_vencer' || sag.estado === 'faltante') {
        alerts.push({
          id: `alert-sag-${p.id}`,
          severity: sag.estado === 'vencido' || sag.estado === 'faltante' ? 'critical' : 'warning',
          category: 'Carnets',
          title: `Carnet Aplicador SAG (${sag.label}): ${p.nombre}`,
          detail: p.carnetAplicadorNumero
            ? `N° ${p.carnetAplicadorNumero} · Vence ${p.carnetAplicadorVencimiento || 'sin fecha'}.`
            : 'Personal habilitado para aplicaciones sin número/vigencia de carnet registrado.',
          targetSection: canViewUsuarios ? 'usuarios' : 'ordenes',
        });
      }

      const trac = evaluateCarnetStatus(
        p.requiereCarnetTractorista,
        p.carnetTractoristaNumero,
        p.carnetTractoristaVencimiento
      );
      if (trac.estado === 'vencido' || trac.estado === 'por_vencer' || trac.estado === 'faltante') {
        alerts.push({
          id: `alert-trac-${p.id}`,
          severity: trac.estado === 'vencido' || trac.estado === 'faltante' ? 'critical' : 'warning',
          category: 'Carnets',
          title: `Licencia Tractorista Clase D (${trac.label}): ${p.nombre}`,
          detail: p.carnetTractoristaNumero
            ? `N° ${p.carnetTractoristaNumero} · Vence ${p.carnetTractoristaVencimiento || 'sin fecha'}.`
            : 'Conductor asignado sin registro vigente de Licencia Clase D.',
          targetSection: canViewUsuarios ? 'usuarios' : 'maquinaria',
        });
      }
    });

  // 5. Critical Pests
  state.plagas
    .filter((pl) => pl.nivel === 'Crítico' || pl.nivel === 'Umbral Alerta')
    .forEach((pl) => {
      const ct = state.cuarteles.find((c) => c.id === pl.cuartelId);
      alerts.push({
        id: `alert-plaga-${pl.id}`,
        severity: pl.nivel === 'Crítico' ? 'critical' : 'warning',
        category: 'Plagas',
        title: `Foco ${pl.nivel}: ${pl.plagaOEnfermedad}`,
        detail: `${ct ? `${ct.codigo} ${ct.nombre}` : pl.cultivo} · Incidencia ${pl.porcentajeIncidencia}% (${pl.recomendacion || 'Evaluar orden'})`,
        targetSection: 'plagas',
      });
    });

  const order: Record<SmartAlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
