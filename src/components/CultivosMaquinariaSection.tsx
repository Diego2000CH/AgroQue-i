import React, { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  Tractor,
  Plus,
  Sprout,
  FileText,
  FileSpreadsheet,
  Printer,
  QrCode,
} from 'lucide-react';
import {
  AplicacionFitosanitaria,
  Cuartel,
  CultivoConfig,
  LaborAgricola,
  MaquinaEquipo,
  RegistroCosecha,
  RegistroMaquinaria,
} from '../types/fieldbook';
import { ESTATE_IMAGES } from '../data/initialData';
import {
  exportTableToWordLetter,
  formatCurrencyCLP,
  formatDateCL,
  formatNumberCL,
  getCarenciaStatus,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';
import { ResilientImage } from './ResilientImage';
import { QrLabelData, QrLabelModal } from './QrLabelModal';

interface CultivosMaquinariaSectionProps {
  mode: 'cuarteles' | 'maquinaria' | 'cultivos';
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  labores: LaborAgricola[];
  aplicaciones: AplicacionFitosanitaria[];
  cosechas: RegistroCosecha[];
  maquinas: MaquinaEquipo[];
  maquinaria: RegistroMaquinaria[];
  canEdit: boolean;
  focusedCuartelId?: string | null;
  onNewCuartel: () => void;
  onEditCuartel: (c: Cuartel) => void;
  onDeleteCuartel: (id: string) => void;
  onNewMaquina: () => void;
  onEditMaquina: (m: MaquinaEquipo) => void;
  onDeleteMaquina: (id: string) => void;
  onNewMaquinariaLog: () => void;
  onEditMaquinariaLog: (m: RegistroMaquinaria) => void;
  onDeleteMaquinariaLog: (id: string) => void;
  onNewCultivo: () => void;
  onEditCultivo: (c: CultivoConfig) => void;
  onDeleteCultivo: (id: string) => void;
}

export const CultivosMaquinariaSection: React.FC<CultivosMaquinariaSectionProps> = ({
  mode,
  cuarteles,
  cultivos,
  labores,
  aplicaciones,
  cosechas,
  maquinas,
  maquinaria,
  canEdit,
  focusedCuartelId,
  onNewCuartel,
  onEditCuartel,
  onDeleteCuartel,
  onNewMaquina,
  onEditMaquina,
  onDeleteMaquina,
  onNewMaquinariaLog,
  onEditMaquinariaLog,
  onDeleteMaquinariaLog,
  onNewCultivo,
  onEditCultivo,
  onDeleteCultivo,
}) => {
  const subTab = mode;
  const [cultivoFilter, setCultivoFilter] = useState<string>('Todos');
  const [selectedId, setSelectedId] = useState<string>(focusedCuartelId || cuarteles[0]?.id || '');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<QrLabelData | null>(null);

  useEffect(() => {
    if (focusedCuartelId && cuarteles.some((c) => c.id === focusedCuartelId)) {
      setCultivoFilter('Todos');
      setSelectedId(focusedCuartelId);
    }
  }, [focusedCuartelId, cuarteles]);

  const filteredCuarteles = useMemo(() => {
    return cuarteles.filter((c) => cultivoFilter === 'Todos' || c.cultivo === cultivoFilter);
  }, [cuarteles, cultivoFilter]);

  const activeCuartel =
    filteredCuarteles.find((c) => c.id === selectedId) ?? filteredCuarteles[0] ?? null;

  const activeCarencias = useMemo(() => {
    if (!activeCuartel) return [];
    return aplicaciones
      .filter((ap) => ap.cuartelId === activeCuartel.id)
      .map((ap) => ({ ap, ...getCarenciaStatus(ap.fecha, ap.carenciaDias) }))
      .filter((item) => item.enCarencia);
  }, [aplicaciones, activeCuartel]);

  const activeLabores = useMemo(() => {
    if (!activeCuartel) return [];
    return [...labores]
      .filter((l) => l.cuartelId === activeCuartel.id)
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 5);
  }, [labores, activeCuartel]);

  const activeCosechaKg = useMemo(() => {
    if (!activeCuartel) return 0;
    return cosechas
      .filter((c) => c.cuartelId === activeCuartel.id)
      .reduce((acc, c) => acc + Math.max(0, c.kilosBrutos - c.kilosDescarte), 0);
  }, [cosechas, activeCuartel]);

  const filteredMaquinas = useMemo(() => {
    return maquinas.filter(
      (m) =>
        cultivoFilter === 'Todos' ||
        m.cultivosCompatibles.includes('Todos') ||
        m.cultivosCompatibles.includes(cultivoFilter)
    );
  }, [maquinas, cultivoFilter]);

  const sortedMaquinaria = useMemo(
    () =>
      [...maquinaria]
        .filter(
          (m) =>
            cultivoFilter === 'Todos' ||
            m.cultivosAplicados.includes('Todos') ||
            m.cultivosAplicados.includes(cultivoFilter)
        )
        .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [maquinaria, cultivoFilter]
  );

  const handleExportPDF = () => {
    if (subTab === 'cuarteles') {
      exportTableToPdfLetter(
        'catastro-cuarteles-agricola-queni.pdf',
        'Catastro de Cuarteles Georreferenciados',
        `Agrícola Queñi · Total: ${filteredCuarteles.length} cuarteles`,
        ['Código', 'Nombre', 'Cultivo / Variedad', 'Ha', 'Plantas/ha', 'Riego', 'GPS Centro'],
        filteredCuarteles.map((c) => [
          c.codigo,
          c.nombre,
          `${c.cultivo} (${c.variedad})`,
          formatNumberCL(c.superficieHa, 1),
          formatNumberCL(c.plantasPorHa, 0),
          c.sistemaRiego,
          `${c.center.lat.toFixed(5)}, ${c.center.lng.toFixed(5)}`,
        ]),
        true
      );
    } else if (subTab === 'maquinaria') {
      exportTableToPdfLetter(
        'bitacora-maquinaria-agricola-queni.pdf',
        'Control de Maquinaria, Combustible y Mantenciones',
        `Filtro cultivo: ${cultivoFilter}`,
        ['Fecha', 'Equipo', 'Cultivos', 'Tipo', 'Horómetro', 'Diésel (L)', 'Costo CLP', 'Operador'],
        sortedMaquinaria.map((m) => [
          formatDateCL(m.fecha),
          m.equipo,
          m.cultivosAplicados.join(', '),
          m.tipo,
          `${formatNumberCL(m.horometro, 1)} h`,
          m.litrosDiesel ? `${m.litrosDiesel} L` : '—',
          formatCurrencyCLP(m.costoCLP),
          m.operador,
        ]),
        true
      );
    } else {
      exportTableToPdfLetter(
        'catalogo-cultivos-agricola-queni.pdf',
        'Catálogo de Especies, Variedades y Cuarteles — Agrícola Queñi',
        `Especies activas: ${cultivos.length}`,
        ['Especie', 'Nombre Científico', 'Variedades Presentes', 'Cuarteles', 'Sup. (ha)', 'pH Óptimo'],
        cultivos.map((cul) => {
          const cts = cuarteles.filter((c) => c.cultivo === cul.nombre);
          const vars = Array.from(new Set(cts.map((c) => c.variedad))).join(', ') || '—';
          const ha = cts.reduce((a, c) => a + c.superficieHa, 0);
          return [
            cul.nombre,
            cul.nombreCientifico,
            vars,
            cts.length,
            formatNumberCL(ha, 1),
            cul.phOptimo,
          ];
        }),
        true
      );
    }
  };

  const handleExportWord = () => {
    if (subTab === 'maquinaria') {
      exportTableToWordLetter(
        'bitacora-maquinaria-agricola-queni.doc',
        'Control de Maquinaria y Equipos — Agrícola Queñi',
        `Filtro cultivo: ${cultivoFilter}`,
        ['Fecha', 'Equipo', 'Cultivos', 'Tipo', 'Horómetro', 'Diésel L', 'Costo CLP', 'Operador', 'Detalle'],
        sortedMaquinaria.map((m) => [
          formatDateCL(m.fecha),
          m.equipo,
          m.cultivosAplicados.join(', '),
          m.tipo,
          m.horometro,
          m.litrosDiesel ?? '',
          formatCurrencyCLP(m.costoCLP),
          m.operador,
          m.detalle,
        ])
      );
    } else if (subTab === 'cultivos') {
      exportTableToWordLetter(
        'catalogo-cultivos-agricola-queni.doc',
        'Catálogo de Especies y Variedades — Agrícola Queñi',
        `Especies registradas: ${cultivos.length}`,
        ['Especie', 'Nombre Científico', 'Variedades', 'Cuarteles', 'Superficie (ha)', 'pH Óptimo'],
        cultivos.map((cul) => {
          const cts = cuarteles.filter((c) => c.cultivo === cul.nombre);
          const vars = Array.from(new Set(cts.map((c) => c.variedad))).join(', ') || '—';
          const ha = cts.reduce((a, c) => a + c.superficieHa, 0);
          return [cul.nombre, cul.nombreCientifico, vars, cts.length, ha, cul.phOptimo];
        })
      );
    } else {
      exportTableToWordLetter(
        'cuarteles-agricola-queni.doc',
        'Catastro de Cuarteles — Agrícola Queñi',
        `Filtro cultivo: ${cultivoFilter}`,
        ['Código', 'Nombre', 'Cultivo', 'Variedad', 'Superficie ha', 'Riego', 'Suelo/pH', 'GPS'],
        filteredCuarteles.map((c) => [
          c.codigo,
          c.nombre,
          c.cultivo,
          c.variedad,
          c.superficieHa,
          c.sistemaRiego,
          c.sueloPh,
          `${c.center.lat.toFixed(5)}, ${c.center.lng.toFixed(5)}`,
        ])
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Individual Module Header Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {subTab === 'cultivos' && <Sprout className="w-5 h-5 text-emerald-700 shrink-0" />}
          {subTab === 'cuarteles' && <MapPin className="w-5 h-5 text-emerald-700 shrink-0" />}
          {subTab === 'maquinaria' && <Tractor className="w-5 h-5 text-emerald-700 shrink-0" />}
          <div>
            <h2 className="font-display text-base font-bold text-slate-900 dark:text-slate-100">
              {subTab === 'cultivos'
                ? `Especies de Cultivo y Variedades (${cultivos.length})`
                : subTab === 'cuarteles'
                ? `Catastro de Cuarteles Prediales (${cuarteles.length})`
                : `Flota de Maquinaria y Equipos (${maquinas.length})`}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subTab === 'cultivos'
                ? 'Maqui, Arándanos, Zarzaparrilla y especies futuras con variedades asociadas en cuarteles.'
                : subTab === 'cuarteles'
                ? 'Ficha técnica, densidad, sistema de riego, carencias activas y GPS por cuartel.'
                : 'Compatibilidad por cultivo, horómetro, mantenciones y consumo de combustible.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subTab !== 'cultivos' && (
            <select
              value={cultivoFilter}
              onChange={(e) => setCultivoFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Todos">Todos los cultivos</option>
              {cultivos.map((cul) => (
                <option key={cul.id} value={cul.nombre}>
                  {cul.nombre}
                </option>
              ))}
            </select>
          )}
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

          {canEdit && subTab === 'cuarteles' && (
            <button
              type="button"
              onClick={onNewCuartel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Cuartel</span>
            </button>
          )}

          {canEdit && subTab === 'maquinaria' && (
            <>
              <button
                type="button"
                onClick={onNewMaquina}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Alta Equipo</span>
              </button>
              <button
                type="button"
                onClick={onNewMaquinariaLog}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bitácora / Carga</span>
              </button>
            </>
          )}

          {canEdit && subTab === 'cultivos' && (
            <button
              type="button"
              onClick={onNewCultivo}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Nuevo Cultivo</span>
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: CUARTELES */}
      {subTab === 'cuarteles' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
            {filteredCuarteles.map((c) => {
              const isSelected = activeCuartel?.id === c.id;
              const enCarencia = aplicaciones.some(
                (ap) =>
                  ap.cuartelId === c.id &&
                  getCarenciaStatus(ap.fecha, ap.carenciaDias).enCarencia
              );
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-5 py-4 transition-colors flex items-start justify-between gap-4 ${
                    isSelected
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {c.codigo}
                      </span>
                      <span>·</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">
                        {c.cultivo}
                      </span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{formatNumberCL(c.superficieHa, 1)} ha</span>
                    </div>
                    <p className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {c.nombre}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{c.variedad}</p>
                  </div>

                  <div className="shrink-0 text-right">
                    {enCarencia ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>En Carencia</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{c.estado}</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {activeCuartel && (
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="h-44 sm:h-52 relative">
                <ResilientImage
                  src={
                    activeCuartel.cultivo === 'Maqui'
                      ? ESTATE_IMAGES.pradera
                      : ESTATE_IMAGES.cuartel
                  }
                  alt={activeCuartel.nombre}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono text-emerald-300">
                      {activeCuartel.codigo} · {activeCuartel.cultivo} · GPS {activeCuartel.center.lat.toFixed(5)},{' '}
                      {activeCuartel.center.lng.toFixed(5)}
                    </p>
                    <h3 className="font-display text-xl font-bold text-white mt-0.5">
                      {activeCuartel.nombre}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQrLabel({
                          entityType: 'cuartel',
                          entityId: activeCuartel.id,
                          code: activeCuartel.codigo,
                          title: activeCuartel.nombre,
                          subtitle: `${activeCuartel.cultivo} · ${activeCuartel.variedad}`,
                          metadataRows: [
                            { label: 'Superficie', value: `${formatNumberCL(activeCuartel.superficieHa, 1)} ha` },
                            { label: 'Densidad', value: `${formatNumberCL(activeCuartel.plantasPorHa, 0)} pl/ha` },
                            { label: 'Riego', value: activeCuartel.sistemaRiego },
                            {
                              label: 'GPS',
                              value: `${activeCuartel.center.lat.toFixed(4)}, ${activeCuartel.center.lng.toFixed(4)}`,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-medium border border-white/25"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>QR Cuartel</span>
                    </button>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditCuartel(activeCuartel)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white text-xs font-medium border border-white/25"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        {confirmDeleteId === activeCuartel.id ? (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteCuartel(activeCuartel.id);
                              setConfirmDeleteId(null);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                          >
                            <span>Confirmar</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(activeCuartel.id)}
                            aria-label={`Eliminar cuartel ${activeCuartel.nombre}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-medium"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-xs text-slate-500">Superficie</p>
                    <p className="font-mono tabular-nums text-sm font-semibold mt-1">
                      {formatNumberCL(activeCuartel.superficieHa, 1)} ha
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Densidad</p>
                    <p className="font-mono tabular-nums text-sm font-semibold mt-1">
                      {formatNumberCL(activeCuartel.plantasPorHa, 0)} pl/ha
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Cosecha Neta</p>
                    <p className="font-mono tabular-nums text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
                      {formatNumberCL(activeCosechaKg, 0)} kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Rendimiento</p>
                    <p className="font-mono tabular-nums text-sm font-semibold mt-1">
                      {activeCuartel.superficieHa > 0
                        ? `${formatNumberCL(activeCosechaKg / activeCuartel.superficieHa, 0)} kg/ha`
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Droplets className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Sistema de Riego</p>
                      <p className="text-slate-500 mt-0.5">{activeCuartel.sistemaRiego}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Suelo y pH</p>
                      <p className="text-slate-500 mt-0.5">{activeCuartel.sueloPh}</p>
                    </div>
                  </div>
                </div>

                {activeCuartel.notas && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg p-3.5">
                    {activeCuartel.notas}
                  </p>
                )}

                {activeCarencias.length > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Carencia fitosanitaria activa</span>
                    </div>
                    <ul className="mt-1.5 space-y-1 font-mono tabular-nums">
                      {activeCarencias.map(({ ap, fechaLiberacion, diasRestantes }) => (
                        <li key={ap.id}>
                          {ap.productoComercial} — Faltan {diasRestantes} días (libera {formatDateCL(fechaLiberacion)})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h4 className="font-display text-xs font-semibold text-slate-500 mb-2">
                    Últimas labores en {activeCuartel.codigo}
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeLabores.map((l) => (
                      <div key={l.id} className="py-2 flex items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="font-mono text-slate-500 mr-2">{formatDateCL(l.fecha)}</span>
                          <span className="font-medium">{l.tipo}: {l.descripcion}</span>
                        </div>
                        <span className="text-slate-500">{l.estado}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 2: MAQUINARIA Y EQUIPOS */}
      {subTab === 'maquinaria' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {filteredMaquinas.map((eq) => (
              <div
                key={eq.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono text-slate-500">{eq.codigo} · {eq.patenteOSerie}</span>
                    <span
                      className={`font-semibold ${
                        eq.estado === 'Operativa'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-amber-700 dark:text-amber-400'
                      }`}
                    >
                      {eq.estado}
                    </span>
                  </div>
                  <h4 className="font-display text-sm font-semibold mt-1">{eq.nombre}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{eq.marcaModelo} · {eq.tipo}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                    Cultivos: {eq.cultivosCompatibles.join(' · ')}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span>{formatNumberCL(eq.horometroActual, 1)} / {eq.proximaMantencionHrs} h</span>
                  {canEdit && (
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onEditMaquina(eq)}
                        className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        aria-label={`Editar ${eq.nombre}`}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteMaquina(eq.id)}
                        className="text-slate-500 hover:text-rose-600"
                        aria-label={`Eliminar ${eq.nombre}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <Tractor className="w-4 h-4 text-emerald-700" />
              <h3 className="font-display text-sm font-semibold">Bitácora de Operación, Combustible y Mantenciones</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4">Equipo / Cultivos</th>
                    <th className="py-3 px-4">Tipo / Detalle</th>
                    <th className="py-3 px-4 text-right">Horómetro</th>
                    <th className="py-3 px-4 text-right">Diésel</th>
                    <th className="py-3 px-4 text-right">Costo</th>
                    <th className="py-3 px-4">Operador</th>
                    {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {sortedMaquinaria.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap align-top">
                        {formatDateCL(m.fecha)}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium">{m.equipo}</div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-400">
                          {m.cultivosAplicados.join(' · ')}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-md">
                        <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{m.tipo}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{m.detalle}</div>
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {formatNumberCL(m.horometro, 1)} h
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {m.litrosDiesel ? `${formatNumberCL(m.litrosDiesel, 0)} L` : '—'}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs whitespace-nowrap">
                        {formatCurrencyCLP(m.costoCLP)}
                      </td>
                      <td className="py-3 px-4 align-top text-xs whitespace-nowrap">{m.operador}</td>
                      {canEdit && (
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditMaquinariaLog(m)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteMaquinariaLog(m.id)}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

      {/* SUBTAB 3: CATALOGO DE CULTIVOS */}
      {subTab === 'cultivos' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cultivos.map((cul) => {
            const countCuarteles = cuarteles.filter((c) => c.cultivo === cul.nombre).length;
            const ha = cuarteles
              .filter((c) => c.cultivo === cul.nombre)
              .reduce((a, c) => a + c.superficieHa, 0);
            return (
              <div
                key={cul.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      style={{ backgroundColor: cul.colorHex }}
                      className="w-3 h-3 rounded-full inline-block shrink-0"
                    />
                    <h3 className="font-display text-base font-bold truncate">{cul.nombre}</h3>
                    {!cul.activo && (
                      <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        · Inactivo
                      </span>
                    )}
                  </div>
                  {canEdit ? (
                    <div className="inline-flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEditCultivo(cul)}
                        aria-label={`Editar cultivo ${cul.nombre}`}
                        className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {confirmDeleteId === cul.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteCultivo(cul.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(cul.id)}
                          aria-label={`Eliminar cultivo ${cul.nombre}`}
                          className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <Sprout className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                </div>
                <p className="text-xs italic text-slate-500">{cul.nombreCientifico}</p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1 font-mono tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Cuarteles activos:</span>
                    <strong>{countCuarteles} ({formatNumberCL(ha, 1)} ha)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">pH suelo óptimo:</span>
                    <strong>{cul.phOptimo}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Unidad cosecha:</span>
                    <strong>{cul.unidadCosecha}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {qrLabel && <QrLabelModal label={qrLabel} onClose={() => setQrLabel(null)} />}
    </div>
  );
};
