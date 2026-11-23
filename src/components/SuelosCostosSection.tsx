import React, { useEffect, useMemo, useState } from 'react';
import {
  TestTube2,
  TrendingUp,
  Pencil,
  Trash2,
  Plus,
  FileText,
  FileSpreadsheet,
  Printer,
  Calculator,
  FlaskConical,
} from 'lucide-react';
import {
  AnalisisSueloAgua,
  CategoriaCostoExtra,
  Cuartel,
  CultivoConfig,
  LaborAgricola,
  MovimientoCostoExtra,
  ProgramaFertirriego,
  RegistroCuadrilla,
  RegistroMaquinaria,
  TipoAnalisisSueloAgua,
} from '../types/fieldbook';
import {
  exportTableToWordLetter,
  formatCurrencyCLP,
  formatDateCL,
  formatNumberCL,
  getTodayISO,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';
import { ModalShell, inputCls, labelCls } from './OperationsModals';

/* ============================================================================
 * 5. SUELOS, AGUA Y PROGRAMAS DE FERTIRRIEGO
 * ============================================================================ */
interface SuelosFertirriegoSectionProps {
  analisis: AnalisisSueloAgua[];
  programas: ProgramaFertirriego[];
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  canEdit: boolean;
  createTrigger?: number;
  onSaveAnalisis: (data: Omit<AnalisisSueloAgua, 'id'>, id?: string) => void;
  onDeleteAnalisis: (id: string) => void;
  onSavePrograma: (data: Omit<ProgramaFertirriego, 'id'>, id?: string) => void;
  onDeletePrograma: (id: string) => void;
}

export const SuelosFertirriegoSection: React.FC<SuelosFertirriegoSectionProps> = ({
  analisis,
  programas,
  cuarteles,
  cultivos,
  canEdit,
  createTrigger,
  onSaveAnalisis,
  onDeleteAnalisis,
  onSavePrograma,
  onDeletePrograma,
}) => {
  const [subTab, setSubTab] = useState<'analisis' | 'fertirriego'>('analisis');
  const [tipoFilter, setTipoFilter] = useState<'Todos' | TipoAnalisisSueloAgua>('Todos');
  const [analisisModal, setAnalisisModal] = useState<{
    open: boolean;
    editing: AnalisisSueloAgua | null;
  }>({ open: false, editing: null });
  const [progModal, setProgModal] = useState<{
    open: boolean;
    editing: ProgramaFertirriego | null;
  }>({ open: false, editing: null });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Interactive fertigation tank calculator
  const [calcProgId, setCalcProgId] = useState<string>(programas[0]?.id ?? '');
  const [calcTankLts, setCalcTankLts] = useState<string>(
    String(programas[0]?.volumenEstanqueLts ?? 1000)
  );
  const [calcHa, setCalcHa] = useState<string>('2.5');

  const activeProg = programas.find((p) => p.id === calcProgId) ?? programas[0] ?? null;
  const tankRatio =
    activeProg && activeProg.volumenEstanqueLts > 0
      ? (Number(calcTankLts) || 0) / activeProg.volumenEstanqueLts
      : 1;
  const haFactor = Number(calcHa) || 1;

  useEffect(() => {
    if (createTrigger && createTrigger > 0 && canEdit) {
      if (subTab === 'fertirriego') {
        setProgModal({ open: true, editing: null });
      } else {
        setAnalisisModal({ open: true, editing: null });
      }
    }
  }, [createTrigger, canEdit]);

  const sortedAnalisis = useMemo(() => {
    return [...analisis]
      .filter((a) => tipoFilter === 'Todos' || a.tipoMuestra === tipoFilter)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [analisis, tipoFilter]);

  const avgPh = useMemo(() => {
    const soil = analisis.filter((a) => a.tipoMuestra === 'Suelo');
    if (soil.length === 0) return null;
    return soil.reduce((acc, a) => acc + a.ph, 0) / soil.length;
  }, [analisis]);

  const handleExportPDF = () => {
    if (subTab === 'fertirriego') {
      exportTableToPdfLetter(
        'programas-fertirriego-agricola-queni.pdf',
        'Programas de Fertirriego por Especie y Etapa Fenológica',
        `Agrícola Queñi · ${programas.length} programas`,
        ['Programa', 'Cultivo', 'Etapa', 'Estanque', 'N / P / K (kg)', 'Ácido (L)', 'pH / CE Obj.', 'Frec.'],
        programas.map((p) => [
          p.nombre,
          p.cultivo,
          p.etapaFenologica,
          `${p.volumenEstanqueLts} L`,
          `${p.dosisNitrogenoKg} / ${p.dosisFosforoKg} / ${p.dosisPotasioKg}`,
          `${p.acidificanteLts} L`,
          `pH ${p.phObjetivo} · ${p.ceObjetivoDsM} dS/m`,
          `Cada ${p.frecuenciaDias}d`,
        ]),
        true
      );
      return;
    }

    exportTableToPdfLetter(
      'analisis-suelos-agua-agricola-queni.pdf',
      'Análisis de Laboratorio: Suelo, Agua de Riego y Foliar',
      `Agrícola Queñi · Filtro: ${tipoFilter}`,
      ['Fecha', 'Tipo', 'Cuartel', 'Laboratorio', 'pH', 'CE (dS/m)', 'N / P / K (ppm)', 'Recomendación'],
      sortedAnalisis.map((a) => {
        const c = cuarteles.find((ct) => ct.id === a.cuartelId);
        return [
          formatDateCL(a.fecha),
          a.tipoMuestra,
          c ? `${c.codigo} ${c.nombre}` : 'General',
          a.laboratorio,
          a.ph,
          a.ceDsM,
          `${a.nitrogenoPpm ?? '—'} / ${a.fosforoPpm ?? '—'} / ${a.potasioPpm ?? '—'}`,
          a.recomendacion,
        ];
      }),
      true
    );
  };

  const handleExportWord = () => {
    if (subTab === 'fertirriego') {
      exportTableToWordLetter(
        'programas-fertirriego-agricola-queni.doc',
        'Programas de Fertirriego — Agrícola Queñi',
        `Total programas: ${programas.length}`,
        ['Programa', 'Cultivo', 'Etapa', 'Estanque L', 'N kg', 'P kg', 'K kg', 'Acidificante L', 'pH Obj', 'CE Obj'],
        programas.map((p) => [
          p.nombre,
          p.cultivo,
          p.etapaFenologica,
          p.volumenEstanqueLts,
          p.dosisNitrogenoKg,
          p.dosisFosforoKg,
          p.dosisPotasioKg,
          p.acidificanteLts,
          p.phObjetivo,
          p.ceObjetivoDsM,
        ])
      );
      return;
    }

    exportTableToWordLetter(
      'analisis-suelos-agua-agricola-queni.doc',
      'Análisis de Suelo, Agua y Foliar — Agrícola Queñi',
      `Muestras: ${sortedAnalisis.length}`,
      ['Fecha', 'Tipo', 'Cuartel', 'Laboratorio', 'pH', 'CE dS/m', 'MO %', 'N ppm', 'P ppm', 'K ppm', 'Recomendación'],
      sortedAnalisis.map((a) => {
        const c = cuarteles.find((ct) => ct.id === a.cuartelId);
        return [
          formatDateCL(a.fecha),
          a.tipoMuestra,
          c ? `${c.codigo} ${c.nombre}` : 'General',
          a.laboratorio,
          a.ph,
          a.ceDsM,
          a.materiaOrganicaPct ?? '',
          a.nitrogenoPpm ?? '',
          a.fosforoPpm ?? '',
          a.potasioPpm ?? '',
          a.recomendacion,
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Análisis de Laboratorio
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {analisis.length} muestras
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            pH Promedio Suelos Medidos
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            {avgPh !== null ? formatNumberCL(avgPh, 2) : '—'}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Programas Fertirriego Activos
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {programas.filter((p) => p.activo).length} de {programas.length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'analisis'}
              onClick={() => setSubTab('analisis')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                subTab === 'analisis'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Análisis Suelo / Agua / Foliar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={subTab === 'fertirriego'}
              onClick={() => setSubTab('fertirriego')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                subTab === 'fertirriego'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Programas y Calculadora Fertirriego
            </button>
          </div>

          {subTab === 'analisis' && (
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value as 'Todos' | TipoAnalisisSueloAgua)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Todos">Todos los análisis</option>
              <option value="Suelo">Suelo</option>
              <option value="Agua de Riego">Agua de Riego</option>
              <option value="Foliar">Foliar</option>
            </select>
          )}
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
              onClick={() =>
                subTab === 'fertirriego'
                  ? setProgModal({ open: true, editing: null })
                  : setAnalisisModal({ open: true, editing: null })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{subTab === 'fertirriego' ? 'Nuevo Programa' : 'Nuevo Análisis'}</span>
            </button>
          )}
        </div>
      </div>

      {subTab === 'analisis' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <TestTube2 className="w-4 h-4 text-emerald-700" />
            <h3 className="font-display text-sm font-semibold">
              Resultados de Suelo, Agua de Riego y Análisis Foliares
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Fecha / Tipo</th>
                  <th className="py-3 px-4">Cuartel / Cultivo</th>
                  <th className="py-3 px-4">Laboratorio</th>
                  <th className="py-3 px-4 text-right">pH / CE (dS/m)</th>
                  <th className="py-3 px-4 text-right">MO / N-P-K (ppm)</th>
                  <th className="py-3 px-4">Recomendación Técnica</th>
                  {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedAnalisis.map((a) => {
                  const c = cuarteles.find((ct) => ct.id === a.cuartelId);
                  const crop = c ? cultivos.find((cul) => cul.nombre === c.cultivo) : undefined;
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 align-top text-xs whitespace-nowrap">
                        <div className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {formatDateCL(a.fecha)}
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {a.tipoMuestra}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {c ? `${c.codigo} ${c.nombre}` : 'Pozo / General'}
                        </div>
                        <div className="text-slate-500">
                          {c ? `${c.cultivo} · pH óp. ${crop?.phOptimo ?? '—'}` : 'Predio'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs text-slate-700 dark:text-slate-300">
                        {a.laboratorio}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs align-top whitespace-nowrap">
                        <div className="font-semibold">pH {formatNumberCL(a.ph, 1)}</div>
                        <div className="text-slate-500">CE {formatNumberCL(a.ceDsM, 2)}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs align-top whitespace-nowrap">
                        <div>
                          {a.materiaOrganicaPct !== undefined ? `MO ${a.materiaOrganicaPct}%` : '—'}
                        </div>
                        <div className="text-slate-500">
                          {a.nitrogenoPpm ?? '—'} / {a.fosforoPpm ?? '—'} / {a.potasioPpm ?? '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                        {a.recomendacion}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAnalisisModal({ open: true, editing: a })}
                              aria-label="Editar análisis"
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === a.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteAnalisis(a.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(a.id)}
                                aria-label="Eliminar análisis"
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600"
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
      ) : (
        <div className="space-y-6">
          {/* Interactive Tank Mix Calculator */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-emerald-700" />
              <h3 className="font-display text-sm font-semibold">
                Calculadora Rápida de Solución Madre y Ajuste de pH en Estanque
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Programa Base</label>
                <select
                  value={calcProgId}
                  onChange={(e) => {
                    setCalcProgId(e.target.value);
                    const found = programas.find((p) => p.id === e.target.value);
                    if (found) setCalcTankLts(String(found.volumenEstanqueLts));
                  }}
                  className={inputCls}
                >
                  {programas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cultivo} · {p.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Volumen Estanque Real (L)</label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={calcTankLts}
                  onChange={(e) => setCalcTankLts(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Superficie Sector (ha)</label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={calcHa}
                  onChange={(e) => setCalcHa(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {activeProg && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500">Nitrógeno (N)</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatNumberCL(activeProg.dosisNitrogenoKg * tankRatio * haFactor, 1)} kg
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Fósforo (P2O5)</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatNumberCL(activeProg.dosisFosforoKg * tankRatio * haFactor, 1)} kg
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Potasio (K2O)</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    {formatNumberCL(activeProg.dosisPotasioKg * tankRatio * haFactor, 1)} kg
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Acidificante</span>
                  <p className="font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                    {formatNumberCL(activeProg.acidificanteLts * tankRatio * haFactor, 1)} L
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Meta Gotero</span>
                  <p className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    pH {activeProg.phObjetivo} · {activeProg.ceObjetivoDsM} dS/m
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Programs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programas.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {p.cultivo} · {p.etapaFenologica}
                      </span>
                      <h4 className="font-display text-base font-semibold mt-0.5">{p.nombre}</h4>
                    </div>
                    <span
                      className={`text-xs font-semibold ${
                        p.activo ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {p.activo ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 space-y-1">
                    <div>
                      Estanque: {p.volumenEstanqueLts} L · Frecuencia: cada {p.frecuenciaDias} días
                    </div>
                    <div>
                      N: {p.dosisNitrogenoKg} kg · P: {p.dosisFosforoKg} kg · K: {p.dosisPotasioKg} kg ·
                      Ácido: {p.acidificanteLts} L
                    </div>
                    <div>
                      Objetivo: pH {p.phObjetivo} · CE {p.ceObjetivoDsM} dS/m
                    </div>
                  </div>
                  {p.notas && <p className="text-xs text-slate-500">{p.notas}</p>}
                </div>

                {canEdit && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setProgModal({ open: true, editing: p })}
                      className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                    {confirmDeleteId === p.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          onDeletePrograma(p.id);
                          setConfirmDeleteId(null);
                        }}
                        className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white"
                      >
                        Confirmar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(p.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {analisisModal.open && (
        <AnalisisModal
          initial={analisisModal.editing}
          cuarteles={cuarteles}
          onClose={() => setAnalisisModal({ open: false, editing: null })}
          onSave={(data, id) => {
            onSaveAnalisis(data, id);
            setAnalisisModal({ open: false, editing: null });
          }}
        />
      )}

      {progModal.open && (
        <ProgramaModal
          initial={progModal.editing}
          cultivos={cultivos}
          onClose={() => setProgModal({ open: false, editing: null })}
          onSave={(data, id) => {
            onSavePrograma(data, id);
            setProgModal({ open: false, editing: null });
          }}
        />
      )}
    </div>
  );
};

const AnalisisModal: React.FC<{
  initial: AnalisisSueloAgua | null;
  cuarteles: Cuartel[];
  onClose: () => void;
  onSave: (data: Omit<AnalisisSueloAgua, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [tipoMuestra, setTipoMuestra] = useState<TipoAnalisisSueloAgua>(
    initial?.tipoMuestra ?? 'Suelo'
  );
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? cuarteles[0]?.id ?? '');
  const [laboratorio, setLaboratorio] = useState(initial?.laboratorio ?? 'Agrolab');
  const [ph, setPh] = useState(String(initial?.ph ?? 5.4));
  const [ceDsM, setCeDsM] = useState(String(initial?.ceDsM ?? 0.8));
  const [materiaOrganicaPct, setMateriaOrganicaPct] = useState(
    initial?.materiaOrganicaPct !== undefined ? String(initial.materiaOrganicaPct) : '7.5'
  );
  const [nitrogenoPpm, setNitrogenoPpm] = useState(
    initial?.nitrogenoPpm !== undefined ? String(initial.nitrogenoPpm) : '32'
  );
  const [fosforoPpm, setFosforoPpm] = useState(
    initial?.fosforoPpm !== undefined ? String(initial.fosforoPpm) : '18'
  );
  const [potasioPpm, setPotasioPpm] = useState(
    initial?.potasioPpm !== undefined ? String(initial.potasioPpm) : '195'
  );
  const [recomendacion, setRecomendacion] = useState(initial?.recomendacion ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laboratorio.trim()) return;
    onSave(
      {
        fecha,
        tipoMuestra,
        cuartelId,
        laboratorio: laboratorio.trim(),
        ph: Number(ph) || 5.5,
        ceDsM: Number(ceDsM) || 0,
        materiaOrganicaPct: materiaOrganicaPct ? Number(materiaOrganicaPct) : undefined,
        nitrogenoPpm: nitrogenoPpm ? Number(nitrogenoPpm) : undefined,
        fosforoPpm: fosforoPpm ? Number(fosforoPpm) : undefined,
        potasioPpm: potasioPpm ? Number(potasioPpm) : undefined,
        recomendacion: recomendacion.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Análisis de Laboratorio' : 'Registrar Análisis de Suelo / Agua / Foliar'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Fecha Muestra</label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo de Análisis</label>
            <select
              value={tipoMuestra}
              onChange={(e) => setTipoMuestra(e.target.value as TipoAnalisisSueloAgua)}
              className={inputCls}
            >
              <option value="Suelo">Suelo</option>
              <option value="Agua de Riego">Agua de Riego</option>
              <option value="Foliar">Foliar</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Cuartel</label>
            <select value={cuartelId} onChange={(e) => setCuartelId(e.target.value)} className={inputCls}>
              {cuarteles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre} ({c.cultivo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Laboratorio</label>
            <input
              type="text"
              required
              value={laboratorio}
              onChange={(e) => setLaboratorio(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>pH Medido</label>
            <input
              type="number"
              step="0.1"
              value={ph}
              onChange={(e) => setPh(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>CE (dS/m)</label>
            <input
              type="number"
              step="0.01"
              value={ceDsM}
              onChange={(e) => setCeDsM(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Mat. Orgánica (%)</label>
            <input
              type="number"
              step="0.1"
              value={materiaOrganicaPct}
              onChange={(e) => setMateriaOrganicaPct(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>N (ppm)</label>
            <input
              type="number"
              step="0.1"
              value={nitrogenoPpm}
              onChange={(e) => setNitrogenoPpm(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>P (ppm)</label>
            <input
              type="number"
              step="0.1"
              value={fosforoPpm}
              onChange={(e) => setFosforoPpm(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>K (ppm)</label>
            <input
              type="number"
              step="0.1"
              value={potasioPpm}
              onChange={(e) => setPotasioPpm(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Recomendación Agronómica</label>
          <textarea
            rows={2}
            value={recomendacion}
            onChange={(e) => setRecomendacion(e.target.value)}
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
            Guardar Análisis
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

const ProgramaModal: React.FC<{
  initial: ProgramaFertirriego | null;
  cultivos: CultivoConfig[];
  onClose: () => void;
  onSave: (data: Omit<ProgramaFertirriego, 'id'>, id?: string) => void;
}> = ({ initial, cultivos, onClose, onSave }) => {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [cultivo, setCultivo] = useState(initial?.cultivo ?? cultivos[0]?.nombre ?? 'Arándanos');
  const [etapaFenologica, setEtapaFenologica] = useState(
    initial?.etapaFenologica ?? 'Llenado de Fruto'
  );
  const [volumenEstanqueLts, setVolumenEstanqueLts] = useState(
    String(initial?.volumenEstanqueLts ?? 1000)
  );
  const [dosisNitrogenoKg, setDosisNitrogenoKg] = useState(String(initial?.dosisNitrogenoKg ?? 10));
  const [dosisFosforoKg, setDosisFosforoKg] = useState(String(initial?.dosisFosforoKg ?? 5));
  const [dosisPotasioKg, setDosisPotasioKg] = useState(String(initial?.dosisPotasioKg ?? 14));
  const [acidificanteLts, setAcidificanteLts] = useState(String(initial?.acidificanteLts ?? 1.5));
  const [phObjetivo, setPhObjetivo] = useState(String(initial?.phObjetivo ?? 5.5));
  const [ceObjetivoDsM, setCeObjetivoDsM] = useState(String(initial?.ceObjetivoDsM ?? 1.2));
  const [frecuenciaDias, setFrecuenciaDias] = useState(String(initial?.frecuenciaDias ?? 4));
  const [activo, setActivo] = useState(initial?.activo ?? true);
  const [notas, setNotas] = useState(initial?.notas ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSave(
      {
        nombre: nombre.trim(),
        cultivo,
        etapaFenologica: etapaFenologica.trim(),
        volumenEstanqueLts: Number(volumenEstanqueLts) || 1000,
        dosisNitrogenoKg: Number(dosisNitrogenoKg) || 0,
        dosisFosforoKg: Number(dosisFosforoKg) || 0,
        dosisPotasioKg: Number(dosisPotasioKg) || 0,
        acidificanteLts: Number(acidificanteLts) || 0,
        phObjetivo: Number(phObjetivo) || 5.5,
        ceObjetivoDsM: Number(ceObjetivoDsM) || 1.2,
        frecuenciaDias: Number(frecuenciaDias) || 3,
        activo,
        notas: notas.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Programa de Fertirriego' : 'Nuevo Programa de Fertirriego'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Nombre del Programa</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Cultivo</label>
            <select value={cultivo} onChange={(e) => setCultivo(e.target.value)} className={inputCls}>
              {cultivos.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Etapa Fenológica</label>
            <input
              type="text"
              value={etapaFenologica}
              onChange={(e) => setEtapaFenologica(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Estanque Base (L)</label>
            <input
              type="number"
              min="100"
              value={volumenEstanqueLts}
              onChange={(e) => setVolumenEstanqueLts(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>N (kg/ha)</label>
            <input
              type="number"
              step="0.5"
              value={dosisNitrogenoKg}
              onChange={(e) => setDosisNitrogenoKg(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>P2O5 (kg/ha)</label>
            <input
              type="number"
              step="0.5"
              value={dosisFosforoKg}
              onChange={(e) => setDosisFosforoKg(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>K2O (kg/ha)</label>
            <input
              type="number"
              step="0.5"
              value={dosisPotasioKg}
              onChange={(e) => setDosisPotasioKg(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Acidificante (L/ha)</label>
            <input
              type="number"
              step="0.1"
              value={acidificanteLts}
              onChange={(e) => setAcidificanteLts(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>pH Objetivo</label>
            <input
              type="number"
              step="0.1"
              value={phObjetivo}
              onChange={(e) => setPhObjetivo(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>CE Objetivo (dS/m)</label>
            <input
              type="number"
              step="0.1"
              value={ceObjetivoDsM}
              onChange={(e) => setCeObjetivoDsM(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Frecuencia (días)</label>
            <input
              type="number"
              min="1"
              value={frecuenciaDias}
              onChange={(e) => setFrecuenciaDias(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
          />
          <span>Programa activo en calendario de fertirriego</span>
        </label>

        <div>
          <label className={labelCls}>Notas</label>
          <textarea
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
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
            Guardar Programa
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* ============================================================================
 * 6. COSTOS Y RENTABILIDAD POR CUARTEL Y ESPECIE
 * ============================================================================ */
interface CostosRentabilidadSectionProps {
  costosExtras: MovimientoCostoExtra[];
  labores: LaborAgricola[];
  maquinaria: RegistroMaquinaria[];
  cuadrillas: RegistroCuadrilla[];
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  canEdit: boolean;
  createTrigger?: number;
  onSaveCosto: (data: Omit<MovimientoCostoExtra, 'id'>, id?: string) => void;
  onDeleteCosto: (id: string) => void;
}

export const CostosRentabilidadSection: React.FC<CostosRentabilidadSectionProps> = ({
  costosExtras,
  labores,
  maquinaria,
  cuadrillas,
  cuarteles,
  cultivos,
  canEdit,
  createTrigger,
  onSaveCosto,
  onDeleteCosto,
}) => {
  const [cultivoFilter, setCultivoFilter] = useState('Todos');
  const [modal, setModal] = useState<{ open: boolean; editing: MovimientoCostoExtra | null }>({
    open: false,
    editing: null,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (createTrigger && createTrigger > 0 && canEdit) {
      setModal({ open: true, editing: null });
    }
  }, [createTrigger, canEdit]);

  // Rollup per species combining labores + cuadrillas + costosExtras (+ prorated maquinaria)
  const resumenPorEspecie = useMemo(() => {
    const totalMaqCLP = maquinaria.reduce((acc, m) => acc + m.costoCLP, 0);
    const totalHaAll = Math.max(
      1,
      cuarteles.reduce((acc, c) => acc + c.superficieHa, 0)
    );

    return cultivos.map((cul) => {
      const cts = cuarteles.filter((c) => c.cultivo === cul.nombre);
      const ctIds = new Set(cts.map((c) => c.id));
      const ha = cts.reduce((acc, c) => acc + c.superficieHa, 0);

      const costoLabores = labores
        .filter((l) => ctIds.has(l.cuartelId))
        .reduce((acc, l) => acc + l.costoCLP, 0);
      const costoCuadrillas = cuadrillas
        .filter((q) => q.cultivo === cul.nombre || ctIds.has(q.cuartelId))
        .reduce((acc, q) => acc + q.totalPagarCLP, 0);
      const costosDirectosExtras = costosExtras
        .filter((m) => m.tipo === 'Costo' && (m.cultivo === cul.nombre || ctIds.has(m.cuartelId)))
        .reduce((acc, m) => acc + m.montoCLP, 0);
      const ingresosDirectos = costosExtras
        .filter((m) => m.tipo === 'Ingreso' && (m.cultivo === cul.nombre || ctIds.has(m.cuartelId)))
        .reduce((acc, m) => acc + m.montoCLP, 0);
      const costoMaqProrrata = Math.round((totalMaqCLP * ha) / totalHaAll);

      const costoTotal = costoLabores + costoCuadrillas + costosDirectosExtras + costoMaqProrrata;
      const margen = ingresosDirectos - costoTotal;

      return {
        cultivo: cul.nombre,
        colorHex: cul.colorHex,
        ha,
        costoLabores,
        costoCuadrillas,
        costosDirectosExtras,
        costoMaqProrrata,
        costoTotal,
        ingresosDirectos,
        margen,
      };
    });
  }, [cultivos, cuarteles, labores, cuadrillas, costosExtras, maquinaria]);

  const totals = useMemo(() => {
    const totalCostos = resumenPorEspecie.reduce((a, r) => a + r.costoTotal, 0);
    const totalIngresos = resumenPorEspecie.reduce((a, r) => a + r.ingresosDirectos, 0);
    return {
      totalCostos,
      totalIngresos,
      margenNeto: totalIngresos - totalCostos,
    };
  }, [resumenPorEspecie]);

  const filteredMovs = useMemo(() => {
    return [...costosExtras]
      .filter((m) => cultivoFilter === 'Todos' || m.cultivo === cultivoFilter)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [costosExtras, cultivoFilter]);

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      'costos-rentabilidad-agricola-queni.pdf',
      'Estado de Costos Operacionales y Rentabilidad por Especie',
      `Agrícola Queñi · Ingresos: ${formatCurrencyCLP(totals.totalIngresos)} · Costos: ${formatCurrencyCLP(totals.totalCostos)}`,
      ['Especie', 'Sup. (ha)', 'Labores CLP', 'Cuadrillas CLP', 'Insumos/Otros', 'Maq. Est.', 'Costo Total', 'Ingresos', 'Margen'],
      resumenPorEspecie.map((r) => [
        r.cultivo,
        formatNumberCL(r.ha, 1),
        formatCurrencyCLP(r.costoLabores),
        formatCurrencyCLP(r.costoCuadrillas),
        formatCurrencyCLP(r.costosDirectosExtras),
        formatCurrencyCLP(r.costoMaqProrrata),
        formatCurrencyCLP(r.costoTotal),
        formatCurrencyCLP(r.ingresosDirectos),
        formatCurrencyCLP(r.margen),
      ]),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      'costos-rentabilidad-agricola-queni.doc',
      'Costos y Rentabilidad por Especie y Cuartel — Agrícola Queñi',
      `Margen Neto Consolidado: ${formatCurrencyCLP(totals.margenNeto)}`,
      ['Fecha', 'Tipo', 'Categoría', 'Cultivo', 'Cuartel', 'Descripción', 'Documento', 'Monto CLP'],
      filteredMovs.map((m) => {
        const c = cuarteles.find((ct) => ct.id === m.cuartelId);
        return [
          formatDateCL(m.fecha),
          m.tipo,
          m.categoria,
          m.cultivo,
          c ? `${c.codigo} ${c.nombre}` : 'General',
          m.descripcion,
          m.documentoRef,
          formatCurrencyCLP(m.montoCLP),
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Consolidated KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ingresos / Liquidaciones de Fruta
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatCurrencyCLP(totals.totalIngresos)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Costo Total Consolidado (Labores + Tratos + Extras)
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrencyCLP(totals.totalCostos)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Margen Operacional Neto
          </p>
          <p
            className={`font-mono tabular-nums text-xl font-semibold mt-1 ${
              totals.margenNeto >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatCurrencyCLP(totals.margenNeto)}
          </p>
        </div>
      </div>

      {/* P&L Rollup by Species */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-700" />
          <h3 className="font-display text-sm font-semibold">
            Rentabilidad Consolidada por Especie (Integración Labores, Cuadrillas, Maquinaria y Facturas)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500">
                <th className="py-2.5 px-4">Especie</th>
                <th className="py-2.5 px-4 text-right">Sup.</th>
                <th className="py-2.5 px-4 text-right">Labores</th>
                <th className="py-2.5 px-4 text-right">Cuadrillas</th>
                <th className="py-2.5 px-4 text-right">Insumos / Directos</th>
                <th className="py-2.5 px-4 text-right">Maquinaria</th>
                <th className="py-2.5 px-4 text-right">Costo Total</th>
                <th className="py-2.5 px-4 text-right">Ingresos</th>
                <th className="py-2.5 px-4 text-right">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {resumenPorEspecie.map((r) => (
                <tr key={r.cultivo} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                    <span className="inline-flex items-center gap-2">
                      <span
                        style={{ backgroundColor: r.colorHex }}
                        className="w-2.5 h-2.5 rounded-full inline-block"
                      />
                      <span>{r.cultivo}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatNumberCL(r.ha, 1)} ha
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrencyCLP(r.costoLabores)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrencyCLP(r.costoCuadrillas)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrencyCLP(r.costosDirectosExtras)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {formatCurrencyCLP(r.costoMaqProrrata)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatCurrencyCLP(r.costoTotal)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrencyCLP(r.ingresosDirectos)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${
                      r.margen >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {formatCurrencyCLP(r.margen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toolbar & Detailed Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
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
            <option value="General">General Predio</option>
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
              <span>Registrar Costo / Ingreso</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-emerald-700" />
          <h3 className="font-display text-sm font-semibold">
            Libro Auxiliar de Ingresos, Facturas e Insumos Directos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Tipo / Categoría</th>
                <th className="py-3 px-4">Cultivo / Cuartel</th>
                <th className="py-3 px-4">Descripción y Doc.</th>
                <th className="py-3 px-4 text-right">Monto CLP</th>
                {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredMovs.map((m) => {
                const c = cuarteles.find((ct) => ct.id === m.cuartelId);
                return (
                  <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono tabular-nums text-xs align-top whitespace-nowrap">
                      {formatDateCL(m.fecha)}
                    </td>
                    <td className="py-3 px-4 align-top text-xs">
                      <div
                        className={`font-semibold ${
                          m.tipo === 'Ingreso'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {m.tipo}
                      </div>
                      <div className="text-slate-500">{m.categoria}</div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs">
                      <div className="font-medium text-slate-900 dark:text-slate-100">{m.cultivo}</div>
                      <div className="text-slate-500">
                        {c ? `${c.codigo} ${c.nombre}` : 'General Predio'}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs max-w-md">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{m.descripcion}</div>
                      {m.documentoRef && (
                        <div className="font-mono text-slate-500 mt-0.5">{m.documentoRef}</div>
                      )}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold align-top whitespace-nowrap ${
                        m.tipo === 'Ingreso'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {m.tipo === 'Ingreso' ? '+' : '-'}
                      {formatCurrencyCLP(m.montoCLP)}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setModal({ open: true, editing: m })}
                            aria-label="Editar movimiento financiero"
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === m.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCosto(m.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(m.id)}
                              aria-label="Eliminar movimiento financiero"
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600"
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

      {modal.open && (
        <CostoExtraModal
          initial={modal.editing}
          cuarteles={cuarteles}
          cultivos={cultivos}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={(data, id) => {
            onSaveCosto(data, id);
            setModal({ open: false, editing: null });
          }}
        />
      )}
    </div>
  );
};

const CostoExtraModal: React.FC<{
  initial: MovimientoCostoExtra | null;
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  onClose: () => void;
  onSave: (data: Omit<MovimientoCostoExtra, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, cultivos, onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [tipo, setTipo] = useState<'Costo' | 'Ingreso'>(initial?.tipo ?? 'Costo');
  const [categoria, setCategoria] = useState<CategoriaCostoExtra>(
    initial?.categoria ?? 'Insumos y Fertilizantes'
  );
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? cuarteles[0]?.id ?? 'general');
  const [cultivo, setCultivo] = useState(
    initial?.cultivo ?? cuarteles[0]?.cultivo ?? cultivos[0]?.nombre ?? 'Arándanos'
  );
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '');
  const [montoCLP, setMontoCLP] = useState(String(initial?.montoCLP ?? 0));
  const [documentoRef, setDocumentoRef] = useState(initial?.documentoRef ?? '');

  const handleCuartelChange = (id: string) => {
    setCuartelId(id);
    const found = cuarteles.find((c) => c.id === id);
    if (found) setCultivo(found.cultivo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    onSave(
      {
        fecha,
        cuartelId,
        cultivo,
        categoria,
        tipo,
        descripcion: descripcion.trim(),
        montoCLP: Number(montoCLP) || 0,
        documentoRef: documentoRef.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Movimiento de Costo / Ingreso' : 'Registrar Costo o Ingreso de Fruta'}
      onClose={onClose}
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
            <label className={labelCls}>Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'Costo' | 'Ingreso')}
              className={inputCls}
            >
              <option value="Costo">Costo / Gasto</option>
              <option value="Ingreso">Ingreso / Venta Fruta</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaCostoExtra)}
              className={inputCls}
            >
              <option value="Insumos y Fertilizantes">Insumos y Fertilizantes</option>
              <option value="Mano de Obra / Tratos">Mano de Obra / Tratos</option>
              <option value="Maquinaria y Combustible">Maquinaria y Combustible</option>
              <option value="Riego y Energía">Riego y Energía</option>
              <option value="Venta / Liquidación Fruta">Venta / Liquidación Fruta</option>
              <option value="Servicios y Certificación">Servicios y Certificación</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Cuartel Asignado</label>
            <select value={cuartelId} onChange={(e) => handleCuartelChange(e.target.value)} className={inputCls}>
              <option value="general">General del Predio</option>
              {cuarteles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Cultivo / Especie</label>
            <select value={cultivo} onChange={(e) => setCultivo(e.target.value)} className={inputCls}>
              {cultivos.map((c) => (
                <option key={c.id} value={c.nombre}>
                  {c.nombre}
                </option>
              ))}
              <option value="General">General</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Descripción del Movimiento</label>
          <input
            type="text"
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Liquidación Fruta Exportación / Factura Energía Bombas"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Monto (CLP)</label>
            <input
              type="number"
              min="0"
              required
              value={montoCLP}
              onChange={(e) => setMontoCLP(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Documento / Factura / Guía</label>
            <input
              type="text"
              value={documentoRef}
              onChange={(e) => setDocumentoRef(e.target.value)}
              placeholder="Ej: Factura #4589 / GD-102"
              className={inputCls}
            />
          </div>
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
            Guardar Movimiento
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
