import React, { useMemo, useState } from 'react';
import {
  Search,
  CheckCircle2,
  Clock,
  Pencil,
  Trash2,
  BookOpen,
  FileText,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { Cuartel, EstadoLabor, LaborAgricola, TipoLabor } from '../types/fieldbook';
import {
  exportTableToWordLetter,
  formatCurrencyCLP,
  formatDateCL,
  formatNumberCL,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';

interface LaboresSectionProps {
  labores: LaborAgricola[];
  cuarteles: Cuartel[];
  canEdit: boolean;
  onNewLabor: () => void;
  onEditLabor: (labor: LaborAgricola) => void;
  onDeleteLabor: (id: string) => void;
  onToggleEstado: (id: string) => void;
}

const TIPOS_LABOR: TipoLabor[] = [
  'Riego y Fertirriego',
  'Poda',
  'Fertilización Base',
  'Fitosanitario',
  'Control Malezas',
  'Polinización',
  'Control Heladas',
  'Cosecha',
  'Mantención Camellones',
];

export const LaboresSection: React.FC<LaboresSectionProps> = ({
  labores,
  cuarteles,
  canEdit,
  onNewLabor,
  onEditLabor,
  onDeleteLabor,
  onToggleEstado,
}) => {
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'Todas' | EstadoLabor>('Todas');
  const [cuartelFilter, setCuartelFilter] = useState<string>('Todos');
  const [tipoFilter, setTipoFilter] = useState<string>('Todos');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...labores]
      .filter((l) => {
        if (estadoFilter !== 'Todas' && l.estado !== estadoFilter) return false;
        if (cuartelFilter !== 'Todos' && l.cuartelId !== cuartelFilter) return false;
        if (tipoFilter !== 'Todos' && l.tipo !== tipoFilter) return false;
        if (!q) return true;
        const cuartel = cuarteles.find((c) => c.id === l.cuartelId);
        return (
          l.descripcion.toLowerCase().includes(q) ||
          l.responsable.toLowerCase().includes(q) ||
          l.maquinaria.toLowerCase().includes(q) ||
          l.tipo.toLowerCase().includes(q) ||
          (cuartel?.nombre.toLowerCase().includes(q) ?? false) ||
          (cuartel?.cultivo.toLowerCase().includes(q) ?? false) ||
          (cuartel?.codigo.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [labores, cuarteles, search, estadoFilter, cuartelFilter, tipoFilter]);

  const totalHoras = filtered.reduce((acc, l) => acc + l.horasTrabajo, 0);
  const totalCosto = filtered.reduce((acc, l) => acc + l.costoCLP, 0);

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      'cuaderno-labores-agricola-queni.pdf',
      'Cuaderno de Labores Agrícolas',
      `Agrícola Queñi · Registros: ${filtered.length} · Total horas: ${formatNumberCL(totalHoras, 1)} h`,
      ['Fecha', 'Cuartel / Cultivo', 'Tipo', 'Descripción', 'Responsable', 'Horas', 'Costo', 'Estado'],
      filtered.map((l) => {
        const c = cuarteles.find((ct) => ct.id === l.cuartelId);
        return [
          formatDateCL(l.fecha),
          c ? `${c.codigo} ${c.nombre} (${c.cultivo})` : 'General',
          l.tipo,
          l.descripcion,
          l.responsable,
          formatNumberCL(l.horasTrabajo, 1),
          formatCurrencyCLP(l.costoCLP),
          l.estado,
        ];
      }),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      'cuaderno-labores-agricola-queni.doc',
      'Cuaderno de Labores Agrícolas — Agrícola Queñi',
      `Registros: ${filtered.length} · Costo Total: ${formatCurrencyCLP(totalCosto)}`,
      ['Fecha', 'Cuartel', 'Cultivo', 'Tipo', 'Descripción', 'Responsable', 'Equipo', 'Horas', 'Costo', 'Estado'],
      filtered.map((l) => {
        const c = cuarteles.find((ct) => ct.id === l.cuartelId);
        return [
          formatDateCL(l.fecha),
          c ? `${c.codigo} ${c.nombre}` : 'General',
          c?.cultivo ?? '',
          l.tipo,
          l.descripcion,
          l.responsable,
          l.maquinaria || 'Manual',
          l.horasTrabajo,
          formatCurrencyCLP(l.costoCLP),
          l.estado,
        ];
      })
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
                placeholder="Buscar labor, cultivo, responsable..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500"
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
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              aria-label="Filtrar por tipo de labor"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-emerald-700"
            >
              <option value="Todos">Todas las labores</option>
              {TIPOS_LABOR.map((t) => (
                <option key={t} value={t}>
                  {t}
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
          aria-label="Filtrar por estado"
          className="inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start"
        >
          {(['Todas', 'Completada', 'En Curso', 'Programada'] as const).map((est) => {
            const active = estadoFilter === est;
            return (
              <button
                key={est}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setEstadoFilter(est)}
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

      {/* Summary Line */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Mostrando <strong className="font-mono tabular-nums text-slate-800 dark:text-slate-200">{filtered.length}</strong> labores en cuaderno
        </span>
        <div className="flex items-center gap-4 font-mono tabular-nums">
          <span>Horas: <strong className="text-slate-800 dark:text-slate-200">{formatNumberCL(totalHoras, 1)} h</strong></span>
          <span aria-hidden="true">·</span>
          <span>Costo total: <strong className="text-slate-800 dark:text-slate-200">{formatCurrencyCLP(totalCosto)}</strong></span>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-3" strokeWidth={1.6} />
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
            No hay labores registradas con estos filtros
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Ajusta los filtros o registra una nueva labor diaria para los cuarteles de Agrícola Queñi.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={onNewLabor}
              className="mt-5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium transition-colors"
            >
              Registrar primera labor
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
                  <th className="py-3 px-4 whitespace-nowrap">Labor y Detalle</th>
                  <th className="py-3 px-4 whitespace-nowrap">Responsable / Equipo</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Horas</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Costo</th>
                  <th className="py-3 px-4 whitespace-nowrap">Estado</th>
                  {canEdit && <th className="py-3 px-4 text-right whitespace-nowrap">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filtered.map((labor) => {
                  const cuartel = cuarteles.find((c) => c.id === labor.cuartelId);
                  return (
                    <tr
                      key={labor.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap align-top">
                        {formatDateCL(labor.fecha)}
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          <span className="font-mono text-xs text-slate-500 dark:text-slate-400 mr-1.5">
                            {cuartel?.codigo ?? '—'}
                          </span>
                          {cuartel?.nombre ?? 'Sin asignar'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {cuartel ? `${cuartel.cultivo} · ${cuartel.variedad}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-md">
                        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          {labor.tipo}
                        </div>
                        <div className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">
                          {labor.descripcion}
                        </div>
                        {labor.observaciones && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {labor.observaciones}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-xs text-slate-600 dark:text-slate-300">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {labor.responsable}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {labor.maquinaria || 'Manual'}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatNumberCL(labor.horasTrabajo, 1)} h
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrencyCLP(labor.costoCLP)}
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => canEdit && onToggleEstado(labor.id)}
                          title="Cambiar estado de la labor"
                          className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                            canEdit ? 'hover:underline' : 'cursor-default'
                          } ${
                            labor.estado === 'Completada'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : labor.estado === 'En Curso'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {labor.estado === 'Completada' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>{labor.estado}</span>
                        </button>
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => onEditLabor(labor)}
                              aria-label={`Editar labor ${labor.descripcion}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteLabor(labor.id)}
                              aria-label={`Eliminar labor ${labor.descripcion}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
      )}
    </div>
  );
};
