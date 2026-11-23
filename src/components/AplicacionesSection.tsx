import React, { useMemo, useState } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Pencil,
  Trash2,
  FileText,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import {
  AplicacionFitosanitaria,
  CategoriaAplicacion,
  Cuartel,
} from '../types/fieldbook';
import {
  exportTableToWordLetter,
  formatDateCL,
  formatNumberCL,
  getCarenciaStatus,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';

interface AplicacionesSectionProps {
  aplicaciones: AplicacionFitosanitaria[];
  cuarteles: Cuartel[];
  canEdit: boolean;
  onNewAplicacion: () => void;
  onEditAplicacion: (ap: AplicacionFitosanitaria) => void;
  onDeleteAplicacion: (id: string) => void;
}

const CATEGORIAS: CategoriaAplicacion[] = [
  'Fungicida',
  'Insecticida',
  'Herbicida',
  'Fertilizante Foliar',
  'Bioestimulante',
];

export const AplicacionesSection: React.FC<AplicacionesSectionProps> = ({
  aplicaciones,
  cuarteles,
  canEdit,
  onNewAplicacion,
  onEditAplicacion,
  onDeleteAplicacion,
}) => {
  const [search, setSearch] = useState('');
  const [cuartelFilter, setCuartelFilter] = useState('Todos');
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [carenciaFilter, setCarenciaFilter] = useState<'Todas' | 'En Carencia' | 'Liberado'>('Todas');

  const evaluated = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...aplicaciones]
      .map((ap) => {
        const cuartel = cuarteles.find((c) => c.id === ap.cuartelId);
        const status = getCarenciaStatus(ap.fecha, ap.carenciaDias);
        return { ap, cuartel, ...status };
      })
      .filter(({ ap, cuartel, enCarencia }) => {
        if (cuartelFilter !== 'Todos' && ap.cuartelId !== cuartelFilter) return false;
        if (categoriaFilter !== 'Todas' && ap.categoria !== categoriaFilter) return false;
        if (carenciaFilter === 'En Carencia' && !enCarencia) return false;
        if (carenciaFilter === 'Liberado' && enCarencia) return false;
        if (!q) return true;
        return (
          ap.productoComercial.toLowerCase().includes(q) ||
          ap.ingredienteActivo.toLowerCase().includes(q) ||
          ap.objetivo.toLowerCase().includes(q) ||
          ap.aplicador.toLowerCase().includes(q) ||
          (cuartel?.nombre.toLowerCase().includes(q) ?? false) ||
          (cuartel?.cultivo.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.ap.fecha.localeCompare(a.ap.fecha));
  }, [aplicaciones, cuarteles, search, cuartelFilter, categoriaFilter, carenciaFilter]);

  const activasCount = evaluated.filter((e) => e.enCarencia).length;

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      'aplicaciones-fitosanitarias-agricola-queni.pdf',
      'Registro Oficial de Aplicaciones Fitosanitarias y Carencias',
      `Agrícola Queñi · Aplicaciones: ${evaluated.length} · Con carencia vigente: ${activasCount}`,
      ['Fecha', 'Cuartel', 'Cultivo', 'Producto / Ing. Activo', 'Dosis', 'Carencia', 'Liberación', 'Aplicador / Carnets'],
      evaluated.map(({ ap, cuartel, fechaLiberacion, enCarencia, diasRestantes }) => [
        formatDateCL(ap.fecha),
        cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : '—',
        cuartel?.cultivo ?? '',
        `${ap.productoComercial} (${ap.ingredienteActivo})`,
        `${ap.dosisPorHa} · ${ap.mojamientoLtsHa} L/ha`,
        `${ap.carenciaDias}d (${enCarencia ? `${diasRestantes}d rest.` : 'Liberado'})`,
        formatDateCL(fechaLiberacion),
        [
          `${ap.aplicador}${ap.carnetAplicadorRef ? ` [SAG: ${ap.carnetAplicadorRef}]` : ''}`,
          ap.carnetTractoristaRef ? `Trac: ${ap.carnetTractoristaRef}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      ]),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      'aplicaciones-fitosanitarias-agricola-queni.doc',
      'Registro Fitosanitario y Control de Carencias — Agrícola Queñi',
      `Trazabilidad SAG · Registros: ${evaluated.length}`,
      ['Fecha', 'Cuartel', 'Cultivo', 'Categoría', 'Producto', 'Ingrediente Activo', 'Dosis', 'Carencia', 'Liberación', 'Aplicador / Carnets'],
      evaluated.map(({ ap, cuartel, fechaLiberacion }) => [
        formatDateCL(ap.fecha),
        cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : '',
        cuartel?.cultivo ?? '',
        ap.categoria,
        ap.productoComercial,
        ap.ingredienteActivo,
        ap.dosisPorHa,
        `${ap.carenciaDias} días`,
        formatDateCL(fechaLiberacion),
        [
          `${ap.aplicador}${ap.carnetAplicadorRef ? ` [SAG: ${ap.carnetAplicadorRef}]` : ''}`,
          ap.carnetTractoristaRef ? `Trac: ${ap.carnetTractoristaRef}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, ingrediente activo, plaga..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700"
              />
            </div>

            <select
              value={cuartelFilter}
              onChange={(e) => setCuartelFilter(e.target.value)}
              aria-label="Filtrar por cuartel"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-700"
            >
              <option value="Todos">Todos los cuarteles</option>
              {cuarteles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre} ({c.cultivo})
                </option>
              ))}
            </select>

            <select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              aria-label="Filtrar por categoría"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-700"
            >
              <option value="Todas">Todas las categorías</option>
              {CATEGORIAS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Filtrar por estado de carencia"
          className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start"
        >
          {(['Todas', 'En Carencia', 'Liberado'] as const).map((est) => {
            const active = carenciaFilter === est;
            return (
              <button
                key={est}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCarenciaFilter(est)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {est}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Registro SAG / Trazabilidad: <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{evaluated.length}</strong> aplicaciones
        </span>
        <span className="font-mono tabular-nums">
          Con carencia vigente:{' '}
          <strong className={activasCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}>
            {activasCount}
          </strong>
        </span>
      </div>

      {evaluated.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <FlaskConical className="w-8 h-8 text-slate-400 mx-auto mb-3" strokeWidth={1.6} />
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No hay aplicaciones registradas con estos filtros
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Registra productos comerciales, ingredientes activos, dosis y días de carencia para mantener la trazabilidad de cada cultivo.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={onNewAplicacion}
              className="mt-5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors"
            >
              Registrar aplicación
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 whitespace-nowrap">Fecha</th>
                  <th className="py-3 px-4 whitespace-nowrap">Cuartel / Cultivo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Producto e Ingrediente Activo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Objetivo y Dosis</th>
                  <th className="py-3 px-4 whitespace-nowrap">Condiciones / Aplicador</th>
                  <th className="py-3 px-4 whitespace-nowrap">Carencia / Liberación</th>
                  {canEdit && <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {evaluated.map(({ ap, cuartel, fechaLiberacion, diasRestantes, enCarencia }) => (
                  <tr
                    key={ap.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                      {formatDateCL(ap.fecha)}
                      {ap.ordenAplicacionRef && (
                        <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">
                          {ap.ordenAplicacionRef}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-1.5">
                          {cuartel?.codigo ?? '—'}
                        </span>
                        {cuartel?.nombre ?? 'Sin asignar'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {cuartel?.cultivo ?? ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs">
                      <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        {ap.categoria}
                      </div>
                      <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                        {ap.productoComercial}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {ap.ingredienteActivo}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top max-w-xs">
                      <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                        {ap.objetivo}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                        {ap.dosisPorHa} · {formatNumberCL(ap.mojamientoLtsHa, 0)} L/ha
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top text-xs">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {ap.aplicador}
                      </div>
                      {ap.carnetAplicadorRef && (
                        <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                          SAG: {ap.carnetAplicadorRef}
                        </div>
                      )}
                      {ap.carnetTractoristaRef && (
                        <div className="text-[11px] font-mono text-sky-700 dark:text-sky-400">
                          Tractorista: {ap.carnetTractoristaRef}
                        </div>
                      )}
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        {ap.condicionesClima || 'Sin registro clima'}
                      </div>
                    </td>
                    <td className="py-3 px-4 align-top whitespace-nowrap">
                      {enCarencia ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono tabular-nums">
                            En carencia ({diasRestantes} d)
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Liberado</span>
                        </div>
                      )}
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                        {ap.carenciaDias}d · Lib. {formatDateCL(fechaLiberacion)} · Reing. {ap.reingresoHoras}h
                      </div>
                    </td>
                    {canEdit && (
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditAplicacion(ap)}
                            aria-label={`Editar aplicación ${ap.productoComercial}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteAplicacion(ap.id)}
                            aria-label={`Eliminar aplicación ${ap.productoComercial}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
      )}
    </div>
  );
};
