import React, { useMemo, useState } from 'react';
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Trash2,
  ArrowUpDown,
  FileText,
  FileSpreadsheet,
  Plus,
  Printer,
} from 'lucide-react';
import {
  BodegaItem,
  CategoriaBodega,
  CultivoConfig,
  MovimientoBodega,
} from '../types/fieldbook';
import {
  formatCurrencyCLP,
  formatDateCL,
  formatNumberCL,
  exportTableToWordLetter,
} from '../utils/formatters';
import { exportTableToPdfLetter } from '../utils/pdfGenerator';

interface BodegaSectionProps {
  bodega: BodegaItem[];
  movimientos: MovimientoBodega[];
  cultivos: CultivoConfig[];
  canEdit: boolean;
  onNewItem: (cat: CategoriaBodega) => void;
  onEditItem: (item: BodegaItem) => void;
  onDeleteItem: (id: string) => void;
  onRegistrarMovimiento: (itemId: string, tipo: 'Ingreso' | 'Egreso', cantidad: number, referencia: string, observaciones: string) => void;
  onEditMovimiento?: (mov: MovimientoBodega) => void;
  onDeleteMovimiento?: (id: string) => void;
}

type BodegaTab = CategoriaBodega | 'Kardex';

export const BodegaSection: React.FC<BodegaSectionProps> = ({
  bodega,
  movimientos,
  cultivos,
  canEdit,
  onNewItem,
  onEditItem,
  onDeleteItem,
  onRegistrarMovimiento,
  onEditMovimiento,
  onDeleteMovimiento,
}) => {
  const [tab, setTab] = useState<BodegaTab>('Fitosanitario');
  const [search, setSearch] = useState('');
  const [cultivoFilter, setCultivoFilter] = useState('Todos');
  const [confirmDeleteMovId, setConfirmDeleteMovId] = useState<string | null>(null);
  const [movModal, setMovModal] = useState<{
    open: boolean;
    item: BodegaItem | null;
    tipo: 'Ingreso' | 'Egreso';
  }>({ open: false, item: null, tipo: 'Ingreso' });
  const [movCantidad, setMovCantidad] = useState('');
  const [movRef, setMovRef] = useState('');
  const [movObs, setMovObs] = useState('');

  const filteredItems = useMemo(() => {
    if (tab === 'Kardex') return [];
    const q = search.trim().toLowerCase();
    return bodega.filter((item) => {
      if (item.categoria !== tab) return false;
      if (
        cultivoFilter !== 'Todos' &&
        !item.cultivosCompatibles.includes('Todos') &&
        !item.cultivosCompatibles.includes(cultivoFilter)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.nombre.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q) ||
        item.ingredienteActivoOEspecificacion.toLowerCase().includes(q) ||
        item.registroSagOParte.toLowerCase().includes(q)
      );
    });
  }, [bodega, tab, search, cultivoFilter]);

  const sortedMovs = useMemo(
    () => [...movimientos].sort((a, b) => b.fecha.localeCompare(a.fecha)),
    [movimientos]
  );

  const stockBajoCount = bodega.filter((i) => i.stockActual <= i.stockMinimo).length;
  const valorTotalInventario = bodega.reduce(
    (acc, i) => acc + i.stockActual * i.costoUnitarioCLP,
    0
  );

  const handleExportPDF = () => {
    if (tab === 'Kardex') {
      exportTableToPdfLetter(
        'kardex-bodega-agricola-queni.pdf',
        'Kardex de Movimientos de Bodega',
        'Entradas y salidas de insumos fitosanitarios, fertilizantes y repuestos',
        ['Fecha', 'Tipo', 'Insumo / Producto', 'Cantidad', 'Referencia', 'Responsable'],
        sortedMovs.map((m) => {
          const item = bodega.find((b) => b.id === m.itemId);
          return [
            formatDateCL(m.fecha),
            m.tipo,
            item ? `${item.codigo} ${item.nombre}` : m.itemId,
            `${m.cantidad} ${item?.unidad ?? ''}`,
            m.referencia,
            m.responsable,
          ];
        })
      );
      return;
    }

    exportTableToPdfLetter(
      `bodega-${tab.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      `Inventario de Bodega — ${tab}`,
      `Filtro de cultivo: ${cultivoFilter} · Total ítems: ${filteredItems.length}`,
      ['Código', 'Producto / Insumo', 'Cultivos Aptos', 'Stock', 'Mín.', 'Vencimiento', 'Ubicación'],
      filteredItems.map((i) => [
        i.codigo,
        `${i.nombre}\n${i.ingredienteActivoOEspecificacion}`,
        i.cultivosCompatibles.join(', '),
        `${formatNumberCL(i.stockActual, 1)} ${i.unidad}`,
        `${formatNumberCL(i.stockMinimo, 1)} ${i.unidad}`,
        formatDateCL(i.fechaVencimiento),
        i.ubicacionBodega,
      ]),
      true
    );
  };

  const handleExportWord = () => {
    if (tab === 'Kardex') {
      exportTableToWordLetter(
        'kardex-bodega-agricola-queni.doc',
        'Kardex de Movimientos de Bodega — Agrícola Queñi',
        'Entradas y salidas de insumos fitosanitarios, fertilizantes y repuestos',
        ['Fecha', 'Tipo', 'Insumo / Producto', 'Cantidad', 'Referencia', 'Responsable', 'Observaciones'],
        sortedMovs.map((m) => {
          const item = bodega.find((b) => b.id === m.itemId);
          return [
            formatDateCL(m.fecha),
            m.tipo,
            item ? `${item.codigo} ${item.nombre}` : m.itemId,
            `${m.cantidad} ${item?.unidad ?? ''}`,
            m.referencia,
            m.responsable,
            m.observaciones,
          ];
        })
      );
      return;
    }

    exportTableToWordLetter(
      `bodega-${tab.toLowerCase().replace(/\s+/g, '-')}.doc`,
      `Control de Bodega — ${tab}`,
      `Agrícola Queñi · Inventario actualizado (${cultivoFilter})`,
      ['Código', 'Producto / Insumo', 'Registro / Parte', 'Cultivos Aptos', 'Stock Actual', 'Stock Mín.', 'Costo Unit.'],
      filteredItems.map((i) => [
        i.codigo,
        `${i.nombre} (${i.ingredienteActivoOEspecificacion})`,
        i.registroSagOParte,
        i.cultivosCompatibles.join(', '),
        `${i.stockActual} ${i.unidad}`,
        `${i.stockMinimo} ${i.unidad}`,
        formatCurrencyCLP(i.costoUnitarioCLP),
      ])
    );
  };

  const handleMovSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movModal.item) return;
    const cant = Number(movCantidad);
    if (!cant || cant <= 0) return;
    onRegistrarMovimiento(movModal.item.id, movModal.tipo, cant, movRef.trim(), movObs.trim());
    setMovModal({ open: false, item: null, tipo: 'Ingreso' });
    setMovCantidad('');
    setMovRef('');
    setMovObs('');
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Ítems en Bodega Central
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {bodega.length} productos
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Valorización Inventario
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrencyCLP(valorTotalInventario)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Alertas de Stock Mínimo
          </p>
          <p
            className={`font-mono tabular-nums text-xl font-semibold mt-1 ${
              stockBajoCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {stockBajoCount}
          </p>
        </div>
      </div>

      {/* Tabs + Actions */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            role="tablist"
            className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start"
          >
            {(
              ['Fitosanitario', 'Fertilización', 'Maquinaria y Repuestos', 'Kardex'] as const
            ).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  tab === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {t === 'Kardex' ? 'Kardex Movimientos' : `Bodega ${t}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportPDF}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              <span>PDF Carta</span>
            </button>
            <button
              type="button"
              onClick={handleExportWord}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
              <span>Word Carta</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>
            {canEdit && tab !== 'Kardex' && (
              <button
                type="button"
                onClick={() => onNewItem(tab)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar a {tab}</span>
              </button>
            )}
          </div>
        </div>

        {tab !== 'Kardex' && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto, código, ingrediente activo..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
              />
            </div>

            <select
              value={cultivoFilter}
              onChange={(e) => setCultivoFilter(e.target.value)}
              aria-label="Filtrar por cultivo compatible"
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="Todos">Todos los cultivos</option>
              {cultivos.map((c) => (
                <option key={c.id} value={c.nombre}>
                  Apto para: {c.nombre}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table Content */}
      {tab === 'Kardex' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Producto / Insumo</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                  <th className="py-3 px-4">Referencia</th>
                  <th className="py-3 px-4">Responsable</th>
                  {canEdit && (onEditMovimiento || onDeleteMovimiento) && (
                    <th className="py-3 px-4 text-right">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedMovs.map((m) => {
                  const item = bodega.find((b) => b.id === m.itemId);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs">
                        {formatDateCL(m.fecha)}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        <span
                          className={
                            m.tipo === 'Ingreso'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-amber-700 dark:text-amber-400'
                          }
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item?.nombre ?? m.itemId}
                        </div>
                        <div className="text-xs text-slate-500">{m.observaciones}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold">
                        {m.tipo === 'Ingreso' ? '+' : '-'}
                        {formatNumberCL(m.cantidad, 2)} {item?.unidad ?? ''}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                        {m.referencia}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-300">
                        {m.responsable}
                      </td>
                      {canEdit && (onEditMovimiento || onDeleteMovimiento) && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {onEditMovimiento && (
                              <button
                                type="button"
                                onClick={() => onEditMovimiento(m)}
                                aria-label="Editar movimiento Kardex"
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {onDeleteMovimiento && (
                              confirmDeleteMovId === m.id ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteMovimiento(m.id);
                                    setConfirmDeleteMovId(null);
                                  }}
                                  className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteMovId(m.id)}
                                  aria-label="Eliminar movimiento Kardex"
                                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Producto / Especificación</th>
                  <th className="py-3 px-4">Cultivos Compatibles</th>
                  <th className="py-3 px-4 text-right">Stock Actual</th>
                  <th className="py-3 px-4">Vencimiento / Lote</th>
                  <th className="py-3 px-4 text-right">Costo Unit.</th>
                  {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredItems.map((item) => {
                  const lowStock = item.stockActual <= item.stockMinimo;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 align-top whitespace-nowrap">
                        <div>{item.codigo}</div>
                        <div className="text-[11px] text-slate-400">{item.registroSagOParte}</div>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          {item.subcategoria}
                        </div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {item.nombre}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {item.ingredienteActivoOEspecificacion}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs text-slate-700 dark:text-slate-300">
                        {item.cultivosCompatibles.join(' · ')}
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.ubicacionBodega}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div
                          className={`inline-flex items-center gap-1 font-mono tabular-nums text-xs font-semibold ${
                            lowStock
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-emerald-700 dark:text-emerald-400'
                          }`}
                        >
                          {lowStock ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {formatNumberCL(item.stockActual, 1)} {item.unidad}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Mín: {formatNumberCL(item.stockMinimo, 1)} {item.unidad}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div>{formatDateCL(item.fechaVencimiento)}</div>
                        <div className="text-[11px] text-slate-400">{item.lote}</div>
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {formatCurrencyCLP(item.costoUnitarioCLP)}
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                setMovModal({ open: true, item, tipo: 'Ingreso' })
                              }
                              title="Registrar ingreso o egreso de stock"
                              className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditItem(item)}
                              aria-label={`Editar ${item.nombre}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteItem(item.id)}
                              aria-label={`Eliminar ${item.nombre}`}
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

      {/* Stock Movement Modal */}
      {movModal.open && movModal.item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-display text-base font-semibold">
              Movimiento de Stock — {movModal.item.nombre}
            </h3>
            <p className="text-xs text-slate-500">
              Stock actual: <strong className="font-mono">{movModal.item.stockActual} {movModal.item.unidad}</strong>
            </p>
            <form onSubmit={handleMovSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(['Ingreso', 'Egreso'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMovModal((m) => ({ ...m, tipo: t }))}
                    className={`py-2 text-xs font-medium rounded-lg border ${
                      movModal.tipo === t
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Cantidad ({movModal.item.unidad})
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={movCantidad}
                  onChange={(e) => setMovCantidad(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">
                  Referencia (Factura / Guía / Orden)
                </label>
                <input
                  type="text"
                  required
                  value={movRef}
                  onChange={(e) => setMovRef(e.target.value)}
                  placeholder="Ej: Factura #10240 o Ajuste"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Observaciones</label>
                <input
                  type="text"
                  value={movObs}
                  onChange={(e) => setMovObs(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMovModal({ open: false, item: null, tipo: 'Ingreso' })}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 text-white"
                >
                  Registrar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
