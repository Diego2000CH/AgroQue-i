import React, { useEffect, useMemo, useState } from 'react';
import {
  Snowflake,
  PackageCheck,
  Pencil,
  Trash2,
  Plus,
  FileText,
  FileSpreadsheet,
  Printer,
  ThermometerSnowflake,
  AlertTriangle,
  CheckCircle2,
  Search,
  QrCode,
} from 'lucide-react';
import {
  Cuartel,
  CultivoConfig,
  DestinoCosecha,
  EstadoPostcosecha,
  EventoHelada,
  LotePostcosecha,
  MetodoControlHelada,
  WeatherSnapshot,
} from '../types/fieldbook';
import {
  exportTableToWordLetter,
  formatDateCL,
  formatNumberCL,
  getTodayISO,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';
import { ModalShell, inputCls, labelCls } from './OperationsModals';
import { QrLabelData, QrLabelModal } from './QrLabelModal';

/* ============================================================================
 * 1. CONTROL DE HELADAS Y ALERTAS TÉRMICAS
 * ============================================================================ */
interface HeladasSectionProps {
  heladas: EventoHelada[];
  cuarteles: Cuartel[];
  canEdit: boolean;
  weather?: WeatherSnapshot | null;
  frostThresholdC: number;
  onChangeFrostThreshold: (next: number) => void;
  createTrigger?: number;
  onSaveHelada: (data: Omit<EventoHelada, 'id'>, id?: string) => void;
  onDeleteHelada: (id: string) => void;
}

export const HeladasSection: React.FC<HeladasSectionProps> = ({
  heladas,
  cuarteles,
  canEdit,
  weather,
  frostThresholdC,
  onChangeFrostThreshold,
  createTrigger,
  onSaveHelada,
  onDeleteHelada,
}) => {
  const [search, setSearch] = useState('');
  const [metodoFilter, setMetodoFilter] = useState<string>('Todos');
  const [modal, setModal] = useState<{ open: boolean; editing: EventoHelada | null }>({
    open: false,
    editing: null,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (createTrigger && createTrigger > 0 && canEdit) {
      setModal({ open: true, editing: null });
    }
  }, [createTrigger, canEdit]);

  const sorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...heladas]
      .filter((h) => {
        if (metodoFilter !== 'Todos' && h.metodoControl !== metodoFilter) return false;
        if (!q) return true;
        const ctNames = h.cuartelIds
          .map((id) => {
            const c = cuarteles.find((ct) => ct.id === id);
            return c ? `${c.codigo} ${c.nombre}` : '';
          })
          .join(' ')
          .toLowerCase();
        return (
          h.operador.toLowerCase().includes(q) ||
          h.estadoFenologico.toLowerCase().includes(q) ||
          h.observaciones.toLowerCase().includes(q) ||
          ctNames.includes(q)
        );
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [heladas, metodoFilter, search, cuarteles]);

  const minTempHist = useMemo(() => {
    if (heladas.length === 0) return null;
    return Math.min(...heladas.map((h) => h.tempMinimaC));
  }, [heladas]);

  const avgDamage = useMemo(() => {
    if (heladas.length === 0) return 0;
    return heladas.reduce((acc, h) => acc + h.danoEstimadoPct, 0) / heladas.length;
  }, [heladas]);

  const activacionesCount = useMemo(
    () => heladas.filter((h) => h.metodoControl !== 'Monitoreo Sin Activación').length,
    [heladas]
  );

  const formatCuarteles = (ids: string[]) =>
    ids
      .map((id) => {
        const c = cuarteles.find((ct) => ct.id === id);
        return c ? `${c.codigo} ${c.nombre}` : id;
      })
      .join(', ');

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      'control-heladas-agricola-queni.pdf',
      'Registro de Control de Heladas y Alertas Térmicas',
      `Agrícola Queñi · Panguipulli · ${sorted.length} eventos registrados`,
      [
        'Fecha',
        'Horario',
        'Cuarteles',
        'T° Mín',
        'Activación',
        'Método Control',
        'Fenología',
        'Daño %',
        'Operador',
      ],
      sorted.map((h) => [
        formatDateCL(h.fecha),
        `${h.horaInicio}–${h.horaTermino}`,
        formatCuarteles(h.cuartelIds),
        `${formatNumberCL(h.tempMinimaC, 1)} °C`,
        `${formatNumberCL(h.temperaturaActivacionC, 1)} °C`,
        h.metodoControl,
        h.estadoFenologico,
        `${formatNumberCL(h.danoEstimadoPct, 1)}%`,
        h.operador,
      ]),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      'control-heladas-agricola-queni.doc',
      'Control de Heladas y Alertas Térmicas — Agrícola Queñi',
      `Eventos registrados: ${sorted.length}`,
      [
        'Fecha',
        'Horario',
        'Cuarteles',
        'T° Mínima (°C)',
        'T° Activación (°C)',
        'Método Control',
        'Estado Fenológico',
        'Daño Est. (%)',
        'Operador',
        'Observaciones',
      ],
      sorted.map((h) => [
        formatDateCL(h.fecha),
        `${h.horaInicio}–${h.horaTermino}`,
        formatCuarteles(h.cuartelIds),
        h.tempMinimaC,
        h.temperaturaActivacionC,
        h.metodoControl,
        h.estadoFenologico,
        h.danoEstimadoPct,
        h.operador,
        h.observaciones,
      ])
    );
  };

  const minForecastDay = useMemo(() => {
    if (!weather?.forecast?.length) return null;
    return weather.forecast.reduce<{ date: string; tempMinC: number } | null>(
      (min, d) => (!min || d.tempMinC < min.tempMinC ? { date: d.date, tempMinC: d.tempMinC } : min),
      null
    );
  }, [weather]);

  const frostAlertActive = Boolean(
    weather &&
      (weather.tempC <= frostThresholdC ||
        (minForecastDay && minForecastDay.tempMinC <= frostThresholdC))
  );

  return (
    <div className="space-y-6">
      {/* Monitor Predictivo de Riesgo de Heladas */}
      <div
        className={`rounded-xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          frostAlertActive
            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start gap-3">
          <Snowflake
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              frostAlertActive ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500'
            }`}
          />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-slate-100">
                Monitor de Riesgo de Heladas (Panguipulli)
              </h3>
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                  frostAlertActive
                    ? 'bg-sky-600 text-white'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {frostAlertActive ? 'Riesgo Activo' : 'Sin riesgo bajo umbral'}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {weather ? (
                <>
                  Temperatura actual: <strong className="font-mono">{weather.tempC.toFixed(1)} °C</strong>
                  {minForecastDay && (
                    <>
                      {' · '}Mínima pronosticada (7 días):{' '}
                      <strong className="font-mono">{minForecastDay.tempMinC.toFixed(1)} °C</strong> (
                      {formatDateCL(minForecastDay.date)})
                    </>
                  )}
                </>
              ) : (
                'Conecta a internet para actualizar el pronóstico térmico satelital o consulta el último dato guardado.'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="frost-threshold-input"
            className="text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
          >
            Umbral alerta (°C):
          </label>
          <input
            id="frost-threshold-input"
            type="number"
            step="0.5"
            min="-5"
            max="8"
            value={frostThresholdC}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (!Number.isNaN(val)) onChangeFrostThreshold(val);
            }}
            className="w-20 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Eventos de Helada / Alerta
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {heladas.length} eventos · {activacionesCount} activaciones
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Mínima Registrada en Predio
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-sky-700 dark:text-sky-400 mt-1">
            {minTempHist !== null ? `${formatNumberCL(minTempHist, 1)} °C` : '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Daño Promedio Estimado en Yemas/Flores
          </p>
          <p
            className={`font-mono tabular-nums text-xl font-semibold mt-1 ${
              avgDamage > 3
                ? 'text-amber-700 dark:text-amber-400'
                : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {formatNumberCL(avgDamage, 1)}%
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[210px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cuartel, fenología, operador..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
          </div>

          <select
            value={metodoFilter}
            onChange={(e) => setMetodoFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="Todos">Todos los métodos de control</option>
            <option value="Microaspersión Antihelada">Microaspersión Antihelada</option>
            <option value="Ventiladores / Torres">Ventiladores / Torres</option>
            <option value="Riego Previo / Humectación">Riego Previo / Humectación</option>
            <option value="Monitoreo Sin Activación">Monitoreo Sin Activación</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF Carta</span>
          </button>
          <button
            type="button"
            onClick={handleExportWord}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Word Carta</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setModal({ open: true, editing: null })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Helada</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Snowflake className="w-4 h-4 text-sky-600" />
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Bitácora de Heladas Nocturnas, Activación Térmica y Evaluación de Daño
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Fecha / Horario</th>
                <th className="py-3 px-4">Cuarteles Protegidos</th>
                <th className="py-3 px-4 text-right">T° Mín / Activación</th>
                <th className="py-3 px-4">Método y Fenología</th>
                <th className="py-3 px-4 text-right">Daño Est.</th>
                <th className="py-3 px-4">Operador / Notas</th>
                {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sorted.map((h) => (
                <tr key={h.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap align-top">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatDateCL(h.fecha)}
                    </div>
                    <div className="text-slate-500">
                      {h.horaInicio} – {h.horaTermino}
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top text-xs font-medium text-slate-800 dark:text-slate-200">
                    {formatCuarteles(h.cuartelIds) || 'General Predio'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap align-top">
                    <div
                      className={`font-semibold ${
                        h.tempMinimaC <= 0
                          ? 'text-sky-700 dark:text-sky-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {formatNumberCL(h.tempMinimaC, 1)} °C
                    </div>
                    <div className="text-slate-400">
                      Act. {formatNumberCL(h.temperaturaActivacionC, 1)} °C
                    </div>
                  </td>
                  <td className="py-3 px-4 align-top text-xs">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {h.metodoControl}
                    </div>
                    <div className="text-slate-500 mt-0.5">{h.estadoFenologico}</div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-xs align-top whitespace-nowrap">
                    <span
                      className={
                        h.danoEstimadoPct > 5
                          ? 'font-semibold text-rose-700 dark:text-rose-400'
                          : 'text-emerald-700 dark:text-emerald-400 font-medium'
                      }
                    >
                      {formatNumberCL(h.danoEstimadoPct, 1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 align-top text-xs max-w-xs">
                    <div className="font-medium text-slate-800 dark:text-slate-200">{h.operador}</div>
                    {h.observaciones && (
                      <div className="text-slate-500 mt-0.5">{h.observaciones}</div>
                    )}
                  </td>
                  {canEdit && (
                    <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setModal({ open: true, editing: h })}
                          aria-label="Editar evento de helada"
                          className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === h.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteHelada(h.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white"
                          >
                            Confirmar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(h.id)}
                            aria-label="Eliminar evento de helada"
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-xs text-slate-500">
                    No hay eventos de helada que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <HeladaModal
          initial={modal.editing}
          cuarteles={cuarteles}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={(data, id) => {
            onSaveHelada(data, id);
            setModal({ open: false, editing: null });
          }}
        />
      )}
    </div>
  );
};

const HeladaModal: React.FC<{
  initial: EventoHelada | null;
  cuarteles: Cuartel[];
  onClose: () => void;
  onSave: (data: Omit<EventoHelada, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [horaInicio, setHoraInicio] = useState(initial?.horaInicio ?? '02:30');
  const [horaTermino, setHoraTermino] = useState(initial?.horaTermino ?? '07:45');
  const [cuartelIds, setCuartelIds] = useState<string[]>(
    initial?.cuartelIds ?? (cuarteles[0] ? [cuarteles[0].id] : [])
  );
  const [tempMinimaC, setTempMinimaC] = useState(String(initial?.tempMinimaC ?? -1.5));
  const [temperaturaActivacionC, setTemperaturaActivacionC] = useState(
    String(initial?.temperaturaActivacionC ?? 0.5)
  );
  const [metodoControl, setMetodoControl] = useState<MetodoControlHelada>(
    initial?.metodoControl ?? 'Microaspersión Antihelada'
  );
  const [danoEstimadoPct, setDanoEstimadoPct] = useState(String(initial?.danoEstimadoPct ?? 0));
  const [estadoFenologico, setEstadoFenologico] = useState(
    initial?.estadoFenologico ?? 'Yema hinchada / Botón floral'
  );
  const [operador, setOperador] = useState(initial?.operador ?? '');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

  const toggleCuartel = (id: string) => {
    setCuartelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cuartelIds.length === 0 || !operador.trim()) return;
    onSave(
      {
        fecha,
        horaInicio,
        horaTermino,
        cuartelIds,
        tempMinimaC: Number(tempMinimaC) || 0,
        temperaturaActivacionC: Number(temperaturaActivacionC) || 0,
        metodoControl,
        danoEstimadoPct: Math.max(0, Number(danoEstimadoPct) || 0),
        estadoFenologico: estadoFenologico.trim(),
        operador: operador.trim(),
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Evento de Helada' : 'Registrar Evento de Helada / Alerta Térmica'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Hora Inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Hora Término</label>
            <input
              type="time"
              value={horaTermino}
              onChange={(e) => setHoraTermino(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Cuarteles Monitoreados / Protegidos</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pt-1">
            {cuarteles.map((c) => {
              const checked = cuartelIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCuartel(c.id)}
                  className={`text-left px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                    checked
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-medium'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {c.codigo} · {c.nombre} ({c.cultivo})
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Temperatura Mínima (°C)</label>
            <input
              type="number"
              step="0.1"
              value={tempMinimaC}
              onChange={(e) => setTempMinimaC(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>T° Activación Control (°C)</label>
            <input
              type="number"
              step="0.1"
              value={temperaturaActivacionC}
              onChange={(e) => setTemperaturaActivacionC(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Daño Estimado (%)</label>
            <input
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={danoEstimadoPct}
              onChange={(e) => setDanoEstimadoPct(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Método de Control</label>
            <select
              value={metodoControl}
              onChange={(e) => setMetodoControl(e.target.value as MetodoControlHelada)}
              className={inputCls}
            >
              <option value="Microaspersión Antihelada">Microaspersión Antihelada</option>
              <option value="Ventiladores / Torres">Ventiladores / Torres</option>
              <option value="Riego Previo / Humectación">Riego Previo / Humectación</option>
              <option value="Monitoreo Sin Activación">Monitoreo Sin Activación</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado Fenológico</label>
            <input
              type="text"
              value={estadoFenologico}
              onChange={(e) => setEstadoFenologico(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Operador de Turno</label>
            <input
              type="text"
              required
              value={operador}
              onChange={(e) => setOperador(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones y Lectura de Sensores</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Guardar Evento
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* ============================================================================
 * 2. POSTCOSECHA, PACKING, FRÍO Y TRAZABILIDAD DE LOTES
 * ============================================================================ */
interface PostcosechaSectionProps {
  lotes: LotePostcosecha[];
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  canEdit: boolean;
  focusedLoteId?: string | null;
  createTrigger?: number;
  onSaveLote: (data: Omit<LotePostcosecha, 'id'>, id?: string) => void;
  onDeleteLote: (id: string) => void;
}

export const PostcosechaSection: React.FC<PostcosechaSectionProps> = ({
  lotes,
  cuarteles,
  cultivos,
  canEdit,
  focusedLoteId,
  createTrigger,
  onSaveLote,
  onDeleteLote,
}) => {
  const [cultivoFilter, setCultivoFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState<'Todos' | EstadoPostcosecha>('Todos');
  const [modal, setModal] = useState<{ open: boolean; editing: LotePostcosecha | null }>({
    open: false,
    editing: null,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<QrLabelData | null>(null);

  useEffect(() => {
    if (createTrigger && createTrigger > 0 && canEdit) {
      setModal({ open: true, editing: null });
    }
  }, [createTrigger, canEdit]);

  const filtered = useMemo(() => {
    return [...lotes]
      .filter((l) => {
        if (cultivoFilter !== 'Todos' && l.cultivo !== cultivoFilter) return false;
        if (estadoFilter !== 'Todos' && l.estado !== estadoFilter) return false;
        return true;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [lotes, cultivoFilter, estadoFilter]);

  const totalRecibidos = filtered.reduce((acc, l) => acc + l.kilosRecibidos, 0);
  const totalExportables = filtered.reduce((acc, l) => acc + l.kilosExportables, 0);
  const pctEmbalaje = totalRecibidos > 0 ? (totalExportables / totalRecibidos) * 100 : 0;

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      'postcosecha-frio-agricola-queni.pdf',
      'Trazabilidad de Postcosecha, Packing y Cámaras de Frío',
      `Agrícola Queñi · Filtro: ${cultivoFilter} · Rendimiento embalaje: ${formatNumberCL(pctEmbalaje, 1)}%`,
      [
        'Lote',
        'Fecha',
        'Cultivo / Cuartel',
        'Cámara / T°',
        'Recibido (kg)',
        'Exportable (kg)',
        'Destino / Cliente',
        'Estado',
      ],
      filtered.map((l) => {
        const c = cuarteles.find((ct) => ct.id === l.cuartelId);
        return [
          l.codigoLote,
          formatDateCL(l.fecha),
          `${l.cultivo} (${l.variedad}) · ${c ? c.codigo : ''}`,
          `${l.camaraFrio} (${l.tempCamaraC} °C)`,
          formatNumberCL(l.kilosRecibidos, 0),
          formatNumberCL(l.kilosExportables, 0),
          `${l.destinoProceso} · ${l.clienteOExportadora}`,
          l.estado,
        ];
      }),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      'postcosecha-frio-agricola-queni.doc',
      'Postcosecha, Frío y Trazabilidad de Lotes — Agrícola Queñi',
      `Total lotes: ${filtered.length} · Exportable: ${formatNumberCL(totalExportables, 0)} kg`,
      [
        'Código Lote',
        'Fecha',
        'Cultivo',
        'Variedad',
        'Cámara Frío',
        'T° Pulpa Ingreso',
        'T° Cámara',
        'Kg Recibidos',
        'Kg Exportables',
        'Kg Descarte',
        'Cliente / Exportadora',
        'Guía',
        'Estado',
      ],
      filtered.map((l) => [
        l.codigoLote,
        formatDateCL(l.fecha),
        l.cultivo,
        l.variedad,
        l.camaraFrio,
        `${l.tempPulpaIngresoC} °C`,
        `${l.tempCamaraC} °C`,
        l.kilosRecibidos,
        l.kilosExportables,
        l.kilosDescarte,
        l.clienteOExportadora,
        l.guiaDespachoRef,
        l.estado,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Fruta Recibida en Packing
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatNumberCL(totalRecibidos, 0)} kg
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Fruta Exportable / Proceso Neto
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatNumberCL(totalExportables, 0)} kg
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Aprovechamiento Packing
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatNumberCL(pctEmbalaje, 1)}% ({filtered.length} lotes)
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cultivoFilter}
            onChange={(e) => setCultivoFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="Todos">Todos los cultivos</option>
            {cultivos.map((c) => (
              <option key={c.id} value={c.nombre}>
                {c.nombre}
              </option>
            ))}
          </select>

          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value as 'Todos' | EstadoPostcosecha)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="Todos">Todos los estados</option>
            <option value="En Pre-Frío">En Pre-Frío</option>
            <option value="Embalado / En Cámara">Embalado / En Cámara</option>
            <option value="Despachado">Despachado</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF Carta</span>
          </button>
          <button
            type="button"
            onClick={handleExportWord}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Word Carta</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setModal({ open: true, editing: null })}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Lote Frío</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <PackageCheck className="w-4 h-4 text-emerald-700" />
          <h3 className="font-display text-sm font-semibold">
            Lotes de Packing, Cadena de Frío y Despachos Trazables
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Lote / Fecha</th>
                <th className="py-3 px-4">Especie / Cuartel</th>
                <th className="py-3 px-4">Cámara y T° Pulpa/Cámara</th>
                <th className="py-3 px-4 text-right">Recibido / Exportable</th>
                <th className="py-3 px-4">Destino / Exportadora</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones / QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.map((l) => {
                const cuartel = cuarteles.find((c) => c.id === l.cuartelId);
                return (
                  <tr
                    key={l.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                      focusedLoteId === l.id ? 'bg-emerald-50/80 dark:bg-emerald-950/40' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-xs align-top whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {l.codigoLote}
                      </div>
                      <div className="text-slate-500">{formatDateCL(l.fecha)}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {l.cultivo} · {l.variedad}
                      </div>
                      <div className="text-slate-500">
                        {cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : 'General'} · Calibre {l.calibrePromedio}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs">
                      <div className="font-medium flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                        <ThermometerSnowflake className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>{l.camaraFrio}</span>
                      </div>
                      <div className="font-mono tabular-nums text-slate-500 mt-0.5">
                        Pulpa: {formatNumberCL(l.tempPulpaIngresoC, 1)} °C · Cám:{' '}
                        {formatNumberCL(l.tempCamaraC, 1)} °C
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs align-top whitespace-nowrap">
                      <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatNumberCL(l.kilosExportables, 0)} kg exp.
                      </div>
                      <div className="text-slate-500">
                        de {formatNumberCL(l.kilosRecibidos, 0)} kg (Desc. {l.kilosDescarte} kg)
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs max-w-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {l.clienteOExportadora}
                      </div>
                      <div className="text-slate-500">
                        {l.destinoProceso} {l.guiaDespachoRef ? `· ${l.guiaDespachoRef}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          l.estado === 'Despachado'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : l.estado === 'Embalado / En Cámara'
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {l.estado === 'Despachado' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        <span>{l.estado}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setQrLabel({
                              entityType: 'lote',
                              entityId: l.id,
                              code: l.codigoLote,
                              title: `${l.cultivo} · ${l.variedad}`,
                              subtitle: `${l.camaraFrio} · ${cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : 'General'}`,
                              metadataRows: [
                                { label: 'Recibido', value: `${formatNumberCL(l.kilosRecibidos, 0)} kg` },
                                { label: 'Exportable', value: `${formatNumberCL(l.kilosExportables, 0)} kg` },
                                { label: 'Cliente', value: l.clienteOExportadora || '—' },
                                { label: 'Estado', value: l.estado },
                              ],
                            })
                          }
                          aria-label={`Generar QR lote ${l.codigoLote}`}
                          title="Etiqueta QR Trazabilidad"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>QR</span>
                        </button>
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => setModal({ open: true, editing: l })}
                              aria-label="Editar lote postcosecha"
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === l.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteLote(l.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(l.id)}
                                aria-label="Eliminar lote postcosecha"
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {qrLabel && <QrLabelModal label={qrLabel} onClose={() => setQrLabel(null)} />}

      {modal.open && (
        <PostcosechaModal
          initial={modal.editing}
          cuarteles={cuarteles}
          cultivos={cultivos}
          nextCode={`AQ-LOT-${String(lotes.length + 1).padStart(3, '0')}`}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={(data, id) => {
            onSaveLote(data, id);
            setModal({ open: false, editing: null });
          }}
        />
      )}
    </div>
  );
};

const PostcosechaModal: React.FC<{
  initial: LotePostcosecha | null;
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  nextCode: string;
  onClose: () => void;
  onSave: (data: Omit<LotePostcosecha, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, cultivos, nextCode, onClose, onSave }) => {
  const firstC = cuarteles[0];
  const [codigoLote, setCodigoLote] = useState(initial?.codigoLote ?? nextCode);
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? firstC?.id ?? '');
  const [cultivo, setCultivo] = useState(initial?.cultivo ?? firstC?.cultivo ?? cultivos[0]?.nombre ?? 'Arándanos');
  const [variedad, setVariedad] = useState(initial?.variedad ?? firstC?.variedad ?? '');
  const [camaraFrio, setCamaraFrio] = useState(initial?.camaraFrio ?? 'Cámara Frío 1');
  const [tempPulpaIngresoC, setTempPulpaIngresoC] = useState(String(initial?.tempPulpaIngresoC ?? 14.5));
  const [tempCamaraC, setTempCamaraC] = useState(String(initial?.tempCamaraC ?? 0.5));
  const [kilosRecibidos, setKilosRecibidos] = useState(String(initial?.kilosRecibidos ?? 1000));
  const [kilosExportables, setKilosExportables] = useState(String(initial?.kilosExportables ?? 920));
  const [kilosDescarte, setKilosDescarte] = useState(String(initial?.kilosDescarte ?? 80));
  const [calibrePromedio, setCalibrePromedio] = useState(initial?.calibrePromedio ?? '14–16 mm');
  const [destinoProceso, setDestinoProceso] = useState<DestinoCosecha>(
    initial?.destinoProceso ?? 'Fresco Exportación'
  );
  const [clienteOExportadora, setClienteOExportadora] = useState(initial?.clienteOExportadora ?? '');
  const [guiaDespachoRef, setGuiaDespachoRef] = useState(initial?.guiaDespachoRef ?? '');
  const [estado, setEstado] = useState<EstadoPostcosecha>(initial?.estado ?? 'En Pre-Frío');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

  const handleCuartelChange = (id: string) => {
    setCuartelId(id);
    const found = cuarteles.find((c) => c.id === id);
    if (found) {
      setCultivo(found.cultivo);
      setVariedad(found.variedad);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoLote.trim()) return;
    onSave(
      {
        codigoLote: codigoLote.trim(),
        fecha,
        cuartelId,
        cultivo,
        variedad: variedad.trim(),
        camaraFrio: camaraFrio.trim(),
        tempPulpaIngresoC: Number(tempPulpaIngresoC) || 0,
        tempCamaraC: Number(tempCamaraC) || 0,
        kilosRecibidos: Number(kilosRecibidos) || 0,
        kilosExportables: Number(kilosExportables) || 0,
        kilosDescarte: Number(kilosDescarte) || 0,
        calibrePromedio: calibrePromedio.trim(),
        destinoProceso,
        clienteOExportadora: clienteOExportadora.trim(),
        guiaDespachoRef: guiaDespachoRef.trim(),
        estado,
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Lote de Postcosecha' : 'Registrar Lote en Packing / Frío'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Código Lote Trazabilidad</label>
            <input
              type="text"
              required
              value={codigoLote}
              onChange={(e) => setCodigoLote(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Fecha Recepción</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estado del Lote</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoPostcosecha)}
              className={inputCls}
            >
              <option value="En Pre-Frío">En Pre-Frío</option>
              <option value="Embalado / En Cámara">Embalado / En Cámara</option>
              <option value="Despachado">Despachado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Cuartel Origen</label>
            <select
              value={cuartelId}
              onChange={(e) => handleCuartelChange(e.target.value)}
              className={inputCls}
            >
              {cuarteles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Especie</label>
            <select value={cultivo} onChange={(e) => setCultivo(e.target.value)} className={inputCls}>
              {cultivos.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Variedad</label>
            <input
              type="text"
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Cámara / Túnel</label>
            <input
              type="text"
              value={camaraFrio}
              onChange={(e) => setCamaraFrio(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>T° Pulpa Ingreso (°C)</label>
            <input
              type="number"
              step="0.1"
              value={tempPulpaIngresoC}
              onChange={(e) => setTempPulpaIngresoC(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>T° Cámara (°C)</label>
            <input
              type="number"
              step="0.1"
              value={tempCamaraC}
              onChange={(e) => setTempCamaraC(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Kilos Recibidos</label>
            <input
              type="number"
              min="0"
              value={kilosRecibidos}
              onChange={(e) => setKilosRecibidos(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Kg Exportables</label>
            <input
              type="number"
              min="0"
              value={kilosExportables}
              onChange={(e) => setKilosExportables(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Kg Descarte</label>
            <input
              type="number"
              min="0"
              value={kilosDescarte}
              onChange={(e) => setKilosDescarte(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Calibre Prom.</label>
            <input
              type="text"
              value={calibrePromedio}
              onChange={(e) => setCalibrePromedio(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Destino Proceso</label>
            <select
              value={destinoProceso}
              onChange={(e) => setDestinoProceso(e.target.value as DestinoCosecha)}
              className={inputCls}
            >
              <option value="Fresco Exportación">Fresco Exportación</option>
              <option value="IQF Congelado">IQF Congelado</option>
              <option value="Liofilizado / Polvo">Liofilizado / Polvo</option>
              <option value="Agroindustria / Jugos">Agroindustria / Jugos</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Cliente / Exportadora</label>
            <input
              type="text"
              value={clienteOExportadora}
              onChange={(e) => setClienteOExportadora(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Guía Despacho</label>
            <input
              type="text"
              value={guiaDespachoRef}
              onChange={(e) => setGuiaDespachoRef(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones de Calidad</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Guardar Lote
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
