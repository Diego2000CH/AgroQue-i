import React, { useEffect, useMemo, useState } from 'react';
import {
  Droplets,
  CloudSun,
  Bug,
  Wind,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  MapPin,
  Pencil,
  Gauge,
} from 'lucide-react';
import {
  AgricolaInfo,
  Cuartel,
  MonitoreoPlaga,
  RegistroClimaManual,
  RegistroRiego,
  SectorRiego,
  WeatherSnapshot,
} from '../types/fieldbook';
import {
  exportTableToWordLetter,
  formatDateCL,
  formatNumberCL,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';

interface RiegoClimaPlagasSectionProps {
  mode: 'riego' | 'clima' | 'plagas';
  authToken: string;
  empresaInfo: AgricolaInfo;
  cuarteles: Cuartel[];
  sectoresRiego: SectorRiego[];
  riegos: RegistroRiego[];
  plagas: MonitoreoPlaga[];
  climaRegistros: RegistroClimaManual[];
  canEdit: boolean;
  onNewSectorRiego: () => void;
  onEditSectorRiego: (s: SectorRiego) => void;
  onDeleteSectorRiego: (id: string) => void;
  onNewRiego: () => void;
  onEditRiego: (r: RegistroRiego) => void;
  onDeleteRiego: (id: string) => void;
  onNewPlaga: () => void;
  onEditPlaga: (p: MonitoreoPlaga) => void;
  onDeletePlaga: (id: string) => void;
  onNewClimaManual: (coords: { lat: number; lng: number; name: string }) => void;
  onEditClimaManual: (c: RegistroClimaManual) => void;
  onDeleteClimaManual: (id: string) => void;
  onEmitOrdenFromPlaga: (plaga: MonitoreoPlaga) => void;
}

export const RiegoClimaPlagasSection: React.FC<RiegoClimaPlagasSectionProps> = ({
  mode,
  authToken,
  empresaInfo,
  cuarteles,
  sectoresRiego,
  riegos,
  plagas,
  climaRegistros,
  canEdit,
  onNewSectorRiego,
  onEditSectorRiego,
  onDeleteSectorRiego,
  onNewRiego,
  onEditRiego,
  onDeleteRiego,
  onNewPlaga,
  onEditPlaga,
  onDeletePlaga,
  onNewClimaManual,
  onEditClimaManual,
  onDeleteClimaManual,
  onEmitOrdenFromPlaga,
}) => {
  const tab = mode;
  const [selectedLocId, setSelectedLocId] = useState<string>('predio');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState('');

  const targetCoords = useMemo(() => {
    const predioLabel = `${empresaInfo.nombreCorto} · ${empresaInfo.comuna}`;
    if (selectedLocId === 'predio') {
      return {
        lat: empresaInfo.defaultCenter.lat,
        lng: empresaInfo.defaultCenter.lng,
        name: predioLabel,
      };
    }
    const c = cuarteles.find((ct) => ct.id === selectedLocId);
    if (!c) {
      return {
        lat: empresaInfo.defaultCenter.lat,
        lng: empresaInfo.defaultCenter.lng,
        name: predioLabel,
      };
    }
    return {
      lat: c.center.lat,
      lng: c.center.lng,
      name: `${c.codigo} ${c.nombre} (${c.cultivo})`,
    };
  }, [selectedLocId, cuarteles, empresaInfo]);

  const loadWeather = async () => {
    setWeatherLoading(true);
    setWeatherError('');
    try {
      const params = new URLSearchParams({
        lat: String(targetCoords.lat),
        lng: String(targetCoords.lng),
        name: targetCoords.name,
      });
      const res = await fetch(`/api/weather?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.status === 429 || data?.quotaExceeded) {
        window.dispatchEvent(new Event('gmp-quota-exceeded'));
      }
      if (!res.ok) {
        setWeatherError(data.error || 'Error al consultar clima.');
        return;
      }
      setWeather(data);
    } catch {
      setWeatherError('No se pudo conectar al servicio meteorológico.');
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'clima') {
      loadWeather();
    }
  }, [tab, selectedLocId]);

  const sortedRiegos = useMemo(
    () => [...riegos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [riegos]
  );
  const sortedPlagas = useMemo(
    () => [...plagas].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [plagas]
  );
  const sortedClima = useMemo(
    () => [...climaRegistros].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [climaRegistros]
  );

  const totalM3 = sortedRiegos.reduce((acc, r) => acc + r.horasRiego * r.caudalM3Hora, 0);

  const sprayWindowOk =
    weather &&
    weather.windKmH <= 10 &&
    weather.humidityPct >= 40 &&
    weather.humidityPct <= 85 &&
    weather.precipMm24h < 0.5;

  const frostRisk =
    weather &&
    (weather.tempC <= 3 || weather.forecast.some((d) => d.tempMinC <= 2));

  const handleExportPDF = () => {
    if (tab === 'riego') {
      exportTableToPdfLetter(
        'control-riego-agricola-queni.pdf',
        'Registro de Control de Riego y Fertirriego',
        `Agrícola Queñi · Total acumulado: ${formatNumberCL(totalM3, 1)} m³`,
        ['Fecha', 'Cuartel', 'Sector', 'Horas', 'Caudal', 'Lámina', 'pH', 'CE (dS/m)', 'Suelo (cbar)'],
        sortedRiegos.map((r) => {
          const c = cuarteles.find((ct) => ct.id === r.cuartelId);
          return [
            formatDateCL(r.fecha),
            c ? `${c.codigo} ${c.nombre}` : '—',
            r.sectorValvula,
            `${r.horasRiego} h`,
            `${r.caudalM3Hora} m³/h`,
            `${r.laminaMm} mm`,
            r.phAgua,
            r.conductividadDsM,
            r.humedadSueloCbar,
          ];
        }),
        true
      );
    } else if (tab === 'plagas') {
      exportTableToPdfLetter(
        'control-plagas-agricola-queni.pdf',
        'Registro Georreferenciado de Plagas y Enfermedades',
        'Monitoreo sanitario de Maqui, Arándanos y Zarzaparrilla',
        ['Fecha', 'Cuartel', 'Cultivo', 'Plaga / Enfermedad', 'Nivel', 'Incidencia', 'GPS (Lat/Lng)', 'Recomendación'],
        sortedPlagas.map((p) => {
          const c = cuarteles.find((ct) => ct.id === p.cuartelId);
          return [
            formatDateCL(p.fecha),
            c ? `${c.codigo} ${c.nombre}` : '—',
            p.cultivo,
            p.plagaOEnfermedad,
            p.nivel,
            `${p.porcentajeIncidencia}%`,
            `${p.position.lat.toFixed(5)}, ${p.position.lng.toFixed(5)}`,
            p.recomendacion,
          ];
        }),
        true
      );
    } else {
      exportTableToPdfLetter(
        'reporte-climatico-agricola-queni.pdf',
        'Control Meteorológico Predial — Panguipulli',
        `${targetCoords.name} (${targetCoords.lat.toFixed(5)}, ${targetCoords.lng.toFixed(5)})`,
        ['Fecha', 'Hora', 'Estación / Sector', 'T° Actual', 'Mín / Máx', 'HR %', 'Viento', 'Lluvia (mm)'],
        sortedClima.map((cl) => [
          formatDateCL(cl.fecha),
          cl.hora,
          cl.ubicacionNombre,
          `${cl.tempC} °C`,
          `${cl.tempMinC} / ${cl.tempMaxC} °C`,
          `${cl.humedadPct}%`,
          `${cl.vientoKmH} km/h`,
          `${cl.lluviaMm} mm`,
        ]),
        true
      );
    }
  };

  const handleExportWord = () => {
    if (tab === 'riego') {
      exportTableToWordLetter(
        'control-riego-agricola-queni.doc',
        'Control de Riego — Agrícola Queñi',
        'Panguipulli · Registro técnico de riego por cuartel',
        ['Fecha', 'Cuartel', 'Horas', 'Caudal m³/h', 'Lámina mm', 'pH', 'CE dS/m', 'Operador'],
        sortedRiegos.map((r) => {
          const c = cuarteles.find((ct) => ct.id === r.cuartelId);
          return [
            formatDateCL(r.fecha),
            c ? `${c.codigo} ${c.nombre}` : '',
            r.horasRiego,
            r.caudalM3Hora,
            r.laminaMm,
            r.phAgua,
            r.conductividadDsM,
            r.operador,
          ];
        })
      );
    } else if (tab === 'plagas') {
      exportTableToWordLetter(
        'control-plagas-agricola-queni.doc',
        'Monitoreo de Plagas — Agrícola Queñi',
        'Panguipulli · Vigilancia sanitaria georreferenciada',
        ['Fecha', 'Cuartel', 'Cultivo', 'Plaga / Enfermedad', 'Nivel', 'Incidencia %', 'GPS', 'Recomendación'],
        sortedPlagas.map((p) => {
          const c = cuarteles.find((ct) => ct.id === p.cuartelId);
          return [
            formatDateCL(p.fecha),
            c ? `${c.codigo} ${c.nombre}` : '',
            p.cultivo,
            p.plagaOEnfermedad,
            p.nivel,
            p.porcentajeIncidencia,
            `${p.position.lat.toFixed(5)}, ${p.position.lng.toFixed(5)}`,
            p.recomendacion,
          ];
        })
      );
    } else {
      exportTableToWordLetter(
        'clima-panguipulli-agricola-queni.doc',
        'Registro Climático Predial — Agrícola Queñi',
        `${targetCoords.name}`,
        ['Fecha', 'Hora', 'T° Actual', 'T° Mín', 'T° Máx', 'HR %', 'Viento km/h', 'Lluvia mm'],
        sortedClima.map((cl) => [
          formatDateCL(cl.fecha),
          cl.hora,
          cl.tempC,
          cl.tempMinC,
          cl.tempMaxC,
          cl.humedadPct,
          cl.vientoKmH,
          cl.lluviaMm,
        ])
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Individual Module Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {tab === 'riego' && <Droplets className="w-5 h-5 text-sky-600 shrink-0" />}
          {tab === 'clima' && <CloudSun className="w-5 h-5 text-amber-600 shrink-0" />}
          {tab === 'plagas' && <Bug className="w-5 h-5 text-rose-600 shrink-0" />}
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {tab === 'riego'
                ? 'Control Individual de Riego y Fertirriego'
                : tab === 'clima'
                ? 'Estación y Clima Georreferenciado — Panguipulli'
                : 'Monitoreo y Control Fitosanitario de Plagas'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tab === 'riego'
                ? 'Caudales, láminas de riego, pH, conductividad y lectura de tensiómetros por cuartel.'
                : tab === 'clima'
                ? 'Pronóstico por GPS del predio/cuartel, ventana de pulverización, alertas de helada y bitácora.'
                : 'Incidencia por especie, trampas georreferenciadas y emisión directa de órdenes de aplicación.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>

          {canEdit && tab === 'riego' && (
            <button
              type="button"
              onClick={onNewRiego}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Riego</span>
            </button>
          )}
          {canEdit && tab === 'plagas' && (
            <button
              type="button"
              onClick={onNewPlaga}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Monitoreo</span>
            </button>
          )}
          {canEdit && tab === 'clima' && (
            <button
              type="button"
              onClick={() => onNewClimaManual(targetCoords)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registro Estación Predial</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: CONTROL DE RIEGO */}
      {tab === 'riego' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500">Eventos de Riego</p>
              <p className="font-mono tabular-nums text-xl font-semibold mt-1">{sortedRiegos.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500">Volumen Total Aplicado</p>
              <p className="font-mono tabular-nums text-xl font-semibold mt-1">{formatNumberCL(totalM3, 1)} m³</p>
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <p className="text-xs text-slate-500">pH Promedio Solución</p>
              <p className="font-mono tabular-nums text-xl font-semibold mt-1">
                {sortedRiegos.length > 0
                  ? formatNumberCL(
                      sortedRiegos.reduce((a, r) => a + r.phAgua, 0) / sortedRiegos.length,
                      1
                    )
                  : '—'}
              </p>
            </div>
          </div>

          {/* Sectores Hidráulicos y Válvulas de Riego (Editables) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-sky-600" />
                <div>
                  <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Sectores y Válvulas de Riego ({sectoresRiego.length})
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Configuración hidráulica, fuente DGA, emisores e inyección de fertirriego por sector.
                  </p>
                </div>
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={onNewSectorRiego}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Sector</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500">
                    <th className="py-2.5 px-4">Código / Sector</th>
                    <th className="py-2.5 px-4">Cuarteles Abastecidos</th>
                    <th className="py-2.5 px-4">Fuente / Emisores</th>
                    <th className="py-2.5 px-4 text-right">Caudal / Presión</th>
                    <th className="py-2.5 px-4">Fertirriego</th>
                    <th className="py-2.5 px-4">Estado</th>
                    {canEdit && <th className="py-2.5 px-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sectoresRiego.map((sec) => {
                    const secCuarteles = cuarteles
                      .filter((c) => sec.cuartelIds.includes(c.id))
                      .map((c) => `${c.codigo} (${c.cultivo})`)
                      .join(', ');
                    return (
                      <tr key={sec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 px-4 align-top">
                          <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {sec.codigo}
                          </div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {sec.nombre}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 align-top text-slate-600 dark:text-slate-300">
                          {secCuarteles || 'Sin asignar'}
                        </td>
                        <td className="py-2.5 px-4 align-top">
                          <div className="text-slate-800 dark:text-slate-200">{sec.fuenteAgua}</div>
                          <div className="text-slate-500">{sec.tipoEmisores}</div>
                        </td>
                        <td className="py-2.5 px-4 align-top text-right font-mono tabular-nums whitespace-nowrap">
                          <div>{formatNumberCL(sec.caudalNominalM3h, 1)} m³/h</div>
                          <div className="text-slate-400">{formatNumberCL(sec.presionBar, 1)} bar</div>
                        </td>
                        <td className="py-2.5 px-4 align-top text-slate-600 dark:text-slate-300">
                          {sec.injectorFertirriego}
                        </td>
                        <td className="py-2.5 px-4 align-top font-semibold">
                          <span
                            className={
                              sec.estado === 'Operativo'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : sec.estado === 'Mantención'
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-slate-500'
                            }
                          >
                            {sec.estado}
                          </span>
                        </td>
                        {canEdit && (
                          <td className="py-2.5 px-4 align-top text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditSectorRiego(sec)}
                                aria-label={`Editar sector ${sec.nombre}`}
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === sec.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteSectorRiego(sec.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(sec.id)}
                                  aria-label={`Eliminar sector ${sec.nombre}`}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
                Bitácora de Eventos de Riego ({sortedRiegos.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Fecha / Hora</th>
                    <th className="py-3 px-4">Cuartel / Válvula</th>
                    <th className="py-3 px-4 text-right">Horas / Caudal</th>
                    <th className="py-3 px-4 text-right">Lámina / Presión</th>
                    <th className="py-3 px-4 text-right">pH / CE</th>
                    <th className="py-3 px-4 text-right">Tensiómetro</th>
                    <th className="py-3 px-4">Operador</th>
                    {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sortedRiegos.map((r) => {
                    const c = cuarteles.find((ct) => ct.id === r.cuartelId);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap">
                          <div>{formatDateCL(r.fecha)}</div>
                          <div className="text-slate-400">{r.horaInicio} hrs</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {c ? `${c.codigo} · ${c.nombre}` : 'Cuartel'}
                          </div>
                          <div className="text-xs text-slate-500">{r.sectorValvula}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                          <div>{formatNumberCL(r.horasRiego, 1)} h</div>
                          <div className="text-slate-400">{formatNumberCL(r.caudalM3Hora, 1)} m³/h</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                          <div>{formatNumberCL(r.laminaMm, 1)} mm</div>
                          <div className="text-slate-400">{formatNumberCL(r.presionBar, 1)} bar</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                          <div>pH {formatNumberCL(r.phAgua, 1)}</div>
                          <div className="text-slate-400">{formatNumberCL(r.conductividadDsM, 2)} dS/m</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                          {r.humedadSueloCbar} cbar
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                          {r.operador}
                        </td>
                        {canEdit && (
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onEditRiego(r)}
                                aria-label="Editar riego"
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === r.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteRiego(r.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(r.id)}
                                  aria-label="Eliminar riego"
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CLIMA GEORREFERENCIADO */}
      {tab === 'clima' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-700" />
                <div>
                  <h3 className="font-display text-sm font-semibold">
                    Condiciones Meteorológicas por Ubicación GPS
                  </h3>
                  <p className="font-mono text-xs text-slate-500">
                    {targetCoords.name} · {targetCoords.lat.toFixed(5)}, {targetCoords.lng.toFixed(5)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedLocId}
                  onChange={(e) => setSelectedLocId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="predio">Agrícola Queñi (General Panguipulli)</option>
                  {cuarteles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.codigo} · {c.nombre} ({c.cultivo})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadWeather}
                  disabled={weatherLoading}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  aria-label="Actualizar clima"
                >
                  <RefreshCw className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {weatherError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-700 dark:text-rose-300">
                {weatherError}
              </div>
            )}

            {weather && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Thermometer className="w-3.5 h-3.5" />
                      <span>Temperatura</span>
                    </div>
                    <p className="font-mono tabular-nums text-xl font-bold mt-1">
                      {formatNumberCL(weather.tempC, 1)} °C
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{weather.conditionText}</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Humedad Relativa</div>
                    <p className="font-mono tabular-nums text-xl font-bold mt-1">
                      {weather.humidityPct}%
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Rocío {formatNumberCL(weather.dewPointC, 1)} °C
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Wind className="w-3.5 h-3.5" />
                      <span>Viento</span>
                    </div>
                    <p className="font-mono tabular-nums text-xl font-bold mt-1">
                      {formatNumberCL(weather.windKmH, 1)} km/h
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Dir. {weather.windDirection}</p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
                    <div className="text-xs text-slate-500">Precipitación</div>
                    <p className="font-mono tabular-nums text-xl font-bold mt-1">
                      {formatNumberCL(weather.precipMm24h, 1)} mm
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">UV {weather.uvIndex}</p>
                  </div>

                  <div className="col-span-2 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                    <div className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      Evaluación Agronómica en Tiempo Real
                    </div>
                    <div className="space-y-1.5 mt-2 text-xs">
                      <div
                        className={`inline-flex items-center gap-1.5 font-semibold ${
                          sprayWindowOk
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {sprayWindowOk ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                        <span>
                          {sprayWindowOk
                            ? 'Ventana de Pulverización APTA'
                            : 'Precaución Pulverización (viento/HR/lluvia)'}
                        </span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 font-medium ${
                          frostRisk
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>
                          {frostRisk
                            ? 'ALERTA HELADA: Activar control térmico / microaspersión'
                            : 'Sin riesgo crítico de heladas en próximos días'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7-day forecast */}
                <div>
                  <h4 className="font-display text-xs font-semibold text-slate-500 mb-2">
                    Pronóstico 7 Días — Agrícola Queñi, Panguipulli
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {weather.forecast.map((d) => (
                      <div
                        key={d.date}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-xs"
                      >
                        <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatDateCL(d.date)}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {d.conditionText}
                        </div>
                        <div className="font-mono tabular-nums font-semibold mt-2">
                          <span className="text-rose-600 dark:text-rose-400">{Math.round(d.tempMaxC)}°</span>
                          {' / '}
                          <span className="text-sky-600 dark:text-sky-400">{Math.round(d.tempMinC)}°</span>
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-slate-500 mt-1">
                          💧 {d.precipMm.toFixed(1)}mm ({d.precipProbPct}%)
                        </div>
                        <div className="font-mono tabular-nums text-[11px] text-slate-500">
                          💨 {Math.round(d.windMaxKmH)} km/h
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Manual Station Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-display text-sm font-semibold">Bitácora Estación Predial y Pluviómetro</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500">
                    <th className="py-2.5 px-4">Fecha / Hora</th>
                    <th className="py-2.5 px-4">Ubicación GPS</th>
                    <th className="py-2.5 px-4 text-right">T° Actual</th>
                    <th className="py-2.5 px-4 text-right">Mín / Máx</th>
                    <th className="py-2.5 px-4 text-right">HR</th>
                    <th className="py-2.5 px-4 text-right">Viento</th>
                    <th className="py-2.5 px-4 text-right">Lluvia</th>
                    <th className="py-2.5 px-4">Observaciones</th>
                    {canEdit && <th className="py-2.5 px-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sortedClima.map((cl) => (
                    <tr key={cl.id}>
                      <td className="py-2.5 px-4 font-mono tabular-nums whitespace-nowrap">
                        {formatDateCL(cl.fecha)} · {cl.hora}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{cl.ubicacionNombre}</div>
                        <div className="font-mono text-[11px] text-slate-400">
                          {cl.lat.toFixed(4)}, {cl.lng.toFixed(4)}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{cl.tempC} °C</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                        {cl.tempMinC}° / {cl.tempMaxC}°
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{cl.humedadPct}%</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{cl.vientoKmH} km/h</td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{cl.lluviaMm} mm</td>
                      <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{cl.observaciones}</td>
                      {canEdit && (
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditClimaManual(cl)}
                              aria-label="Editar registro climático"
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === cl.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteClimaManual(cl.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(cl.id)}
                                aria-label="Eliminar registro climático"
                                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONTROL DE PLAGAS */}
      {tab === 'plagas' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Cuartel / Cultivo</th>
                  <th className="py-3 px-4">Plaga o Enfermedad</th>
                  <th className="py-3 px-4">Nivel / Incidencia</th>
                  <th className="py-3 px-4">Punto GPS</th>
                  <th className="py-3 px-4">Recomendación</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedPlagas.map((p) => {
                  const c = cuarteles.find((ct) => ct.id === p.cuartelId);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap align-top">
                        {formatDateCL(p.fecha)}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {c ? `${c.codigo} ${c.nombre}` : '—'}
                        </div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-400">
                          {p.cultivo} · {p.estadoFenologico}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {p.plagaOEnfermedad}
                        </div>
                        <div className="text-xs text-slate-500">Inspector: {p.inspector}</div>
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div
                          className={`text-xs font-semibold ${
                            p.nivel === 'Crítico'
                              ? 'text-rose-700 dark:text-rose-400'
                              : p.nivel === 'Umbral Alerta'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {p.nivel}
                        </div>
                        <div className="font-mono tabular-nums text-xs text-slate-500 mt-0.5">
                          Incid. {p.porcentajeIncidencia}%{' '}
                          {p.conteoTrampa !== undefined ? `· Trampa: ${p.conteoTrampa}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top font-mono tabular-nums text-xs text-slate-500 whitespace-nowrap">
                        {p.position.lat.toFixed(5)}, {p.position.lng.toFixed(5)}
                      </td>
                      <td className="py-3 px-4 align-top text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                        {p.recomendacion}
                      </td>
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEmitOrdenFromPlaga(p)}
                                className="px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-medium"
                              >
                                Emitir Orden
                              </button>
                              <button
                                type="button"
                                onClick={() => onEditPlaga(p)}
                                aria-label="Editar monitoreo"
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              {confirmDeleteId === p.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeletePlaga(p.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(p.id)}
                                  aria-label="Eliminar monitoreo"
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600"
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
      )}
    </div>
  );
};
