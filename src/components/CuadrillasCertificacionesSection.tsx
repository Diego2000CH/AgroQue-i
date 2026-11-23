import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Pencil,
  Trash2,
  Plus,
  FileText,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  Cuartel,
  CultivoConfig,
  EstadoPagoCuadrilla,
  ModalidadPagoCuadrilla,
  RegistroCuadrilla,
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
 * CUADRILLAS, COSECHEROS Y LIQUIDACIÓN DE TRATOS
 * ============================================================================ */
interface CuadrillasSectionProps {
  cuadrillas: RegistroCuadrilla[];
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  canEdit: boolean;
  createTrigger?: number;
  onSaveCuadrilla: (data: Omit<RegistroCuadrilla, 'id'>, id?: string) => void;
  onDeleteCuadrilla: (id: string) => void;
}

export const CuadrillasSection: React.FC<CuadrillasSectionProps> = ({
  cuadrillas,
  cuarteles,
  cultivos,
  canEdit,
  createTrigger,
  onSaveCuadrilla,
  onDeleteCuadrilla,
}) => {
  const [cultivoFilter, setCultivoFilter] = useState('Todos');
  const [estadoFilter, setEstadoFilter] = useState<'Todos' | EstadoPagoCuadrilla>('Todos');
  const [modal, setModal] = useState<{ open: boolean; editing: RegistroCuadrilla | null }>({
    open: false,
    editing: null,
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (createTrigger && createTrigger > 0 && canEdit) {
      setModal({ open: true, editing: null });
    }
  }, [createTrigger, canEdit]);

  const filtered = useMemo(() => {
    return [...cuadrillas]
      .filter((r) => {
        if (cultivoFilter !== 'Todos' && r.cultivo !== cultivoFilter) return false;
        if (estadoFilter !== 'Todos' && r.estadoPago !== estadoFilter) return false;
        return true;
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cuadrillas, cultivoFilter, estadoFilter]);

  const totalPagar = filtered.reduce((acc, r) => acc + r.totalPagarCLP, 0);
  const totalKilos = filtered.reduce((acc, r) => acc + r.kilosTotales, 0);
  const totalTrabajadores = filtered.reduce((acc, r) => acc + r.trabajadoresCount, 0);

  const cycleEstado = (r: RegistroCuadrilla) => {
    const next: Record<EstadoPagoCuadrilla, EstadoPagoCuadrilla> = {
      Pendiente: 'Aprobado',
      Aprobado: 'Pagado',
      Pagado: 'Pendiente',
    };
    onSaveCuadrilla({ ...r, estadoPago: next[r.estadoPago] }, r.id);
  };

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      'cuadrillas-tratos-agricola-queni.pdf',
      'Control de Cuadrillas, Rendimiento y Tratos',
      `Agrícola Queñi · Total liquidado: ${formatCurrencyCLP(totalPagar)}`,
      [
        'Fecha',
        'Cuadrilla / Jefe',
        'Cultivo / Cuartel',
        'Pers.',
        'Modalidad',
        'Kilos',
        'Total CLP',
        'Estado Pago',
      ],
      filtered.map((r) => {
        const c = cuarteles.find((ct) => ct.id === r.cuartelId);
        return [
          formatDateCL(r.fecha),
          `${r.cuadrillaNombre} (${r.jefeCuadrilla})`,
          `${r.cultivo} · ${c ? c.codigo : ''}`,
          r.trabajadoresCount,
          r.modalidadPago,
          formatNumberCL(r.kilosTotales, 0),
          formatCurrencyCLP(r.totalPagarCLP),
          r.estadoPago,
        ];
      }),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      'cuadrillas-tratos-agricola-queni.doc',
      'Control de Cuadrillas y Tratos — Agrícola Queñi',
      `Registros: ${filtered.length} · Total a pagar: ${formatCurrencyCLP(totalPagar)}`,
      [
        'Fecha',
        'Cuadrilla',
        'Jefe Cuadrilla',
        'Cuartel',
        'Cultivo',
        'Trabajadores',
        'Modalidad',
        'Kilos Totales',
        'Tarifa CLP',
        'Bonos CLP',
        'Total Pagar CLP',
        'Estado',
      ],
      filtered.map((r) => {
        const c = cuarteles.find((ct) => ct.id === r.cuartelId);
        return [
          formatDateCL(r.fecha),
          r.cuadrillaNombre,
          r.jefeCuadrilla,
          c ? `${c.codigo} ${c.nombre}` : '',
          r.cultivo,
          r.trabajadoresCount,
          r.modalidadPago,
          r.kilosTotales,
          r.tarifaUnitariaCLP,
          r.bonosCLP,
          r.totalPagarCLP,
          r.estadoPago,
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Jornadas / Cosecheros Movilizados
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {totalTrabajadores} personas ({filtered.length} cuadrillas)
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Kilos Cosechados por Cuadrillas
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1">
            {formatNumberCL(totalKilos, 0)} kg
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Tratos y Jornales
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1">
            {formatCurrencyCLP(totalPagar)}
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
            onChange={(e) => setEstadoFilter(e.target.value as 'Todos' | EstadoPagoCuadrilla)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
          >
            <option value="Todos">Todos los estados de pago</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Aprobado">Aprobado</option>
            <option value="Pagado">Pagado</option>
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
              <span>Registrar Cuadrilla</span>
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-700" />
          <h3 className="font-display text-sm font-semibold">
            Planilla de Cuadrillas, Rendimiento por Cosechero y Liquidación de Tratos
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Cuadrilla y Jefe</th>
                <th className="py-3 px-4">Cuartel / Cultivo</th>
                <th className="py-3 px-4 text-right">Cosecheros / Kilos</th>
                <th className="py-3 px-4 text-right">Tarifa / Bonos</th>
                <th className="py-3 px-4 text-right">Total a Pagar</th>
                <th className="py-3 px-4">Estado</th>
                {canEdit && <th className="py-3 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-xs text-slate-500">
                    Sin planillas de cuadrillas registradas aún.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const c = cuarteles.find((ct) => ct.id === r.cuartelId);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs align-top whitespace-nowrap">
                        {formatDateCL(r.fecha)}
                      </td>
                      <td className="py-3 px-4 align-top text-xs">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {r.cuadrillaNombre}
                        </div>
                        <div className="text-slate-500">Jefe: {r.jefeCuadrilla}</div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs">
                        <div className="font-medium text-emerald-700 dark:text-emerald-400">
                          {r.cultivo}
                        </div>
                        <div className="text-slate-500">
                          {c ? `${c.codigo} ${c.nombre}` : 'General'} · {r.modalidadPago}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs align-top whitespace-nowrap">
                        <div>{r.trabajadoresCount} pers.</div>
                        <div className="text-slate-500">
                          {r.kilosTotales > 0 ? `${formatNumberCL(r.kilosTotales, 0)} kg` : 'Jornal'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs align-top whitespace-nowrap">
                        <div>{formatCurrencyCLP(r.tarifaUnitariaCLP)}</div>
                        {r.bonosCLP > 0 && (
                          <div className="text-slate-500">+{formatCurrencyCLP(r.bonosCLP)}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold text-slate-900 dark:text-slate-100 align-top whitespace-nowrap">
                        {formatCurrencyCLP(r.totalPagarCLP)}
                      </td>
                      <td className="py-3 px-4 align-top text-xs whitespace-nowrap">
                        <button
                          type="button"
                          disabled={!canEdit}
                          onClick={() => canEdit && cycleEstado(r)}
                          title={canEdit ? 'Clic para cambiar estado de pago' : undefined}
                          className={`inline-flex items-center gap-1 font-semibold ${
                            r.estadoPago === 'Pagado'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : r.estadoPago === 'Aprobado'
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-amber-700 dark:text-amber-400'
                          } disabled:cursor-default`}
                        >
                          {r.estadoPago === 'Pagado' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <Clock className="w-3.5 h-3.5" />
                          )}
                          <span>{r.estadoPago}</span>
                        </button>
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setModal({ open: true, editing: r })}
                              aria-label="Editar cuadrilla"
                              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {confirmDeleteId === r.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteCuadrilla(r.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded text-[11px] font-semibold bg-rose-600 text-white"
                              >
                                Confirmar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(r.id)}
                                aria-label="Eliminar registro cuadrilla"
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal.open && (
        <CuadrillaModal
          initial={modal.editing}
          cuarteles={cuarteles}
          cultivos={cultivos}
          onClose={() => setModal({ open: false, editing: null })}
          onSave={(data, id) => {
            onSaveCuadrilla(data, id);
            setModal({ open: false, editing: null });
          }}
        />
      )}
    </div>
  );
};

const CuadrillaModal: React.FC<{
  initial: RegistroCuadrilla | null;
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  onClose: () => void;
  onSave: (data: Omit<RegistroCuadrilla, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, cultivos, onClose, onSave }) => {
  const firstC = cuarteles[0];
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuadrillaNombre, setCuadrillaNombre] = useState(initial?.cuadrillaNombre ?? '');
  const [jefeCuadrilla, setJefeCuadrilla] = useState(initial?.jefeCuadrilla ?? '');
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? firstC?.id ?? '');
  const [cultivo, setCultivo] = useState(initial?.cultivo ?? firstC?.cultivo ?? cultivos[0]?.nombre ?? 'Arándanos');
  const [trabajadoresCount, setTrabajadoresCount] = useState(String(initial?.trabajadoresCount ?? 10));
  const [modalidadPago, setModalidadPago] = useState<ModalidadPagoCuadrilla>(
    initial?.modalidadPago ?? 'Trato por Kilo'
  );
  const [kilosTotales, setKilosTotales] = useState(String(initial?.kilosTotales ?? 500));
  const [tarifaUnitariaCLP, setTarifaUnitariaCLP] = useState(String(initial?.tarifaUnitariaCLP ?? 450));
  const [bonosCLP, setBonosCLP] = useState(String(initial?.bonosCLP ?? 0));
  const [estadoPago, setEstadoPago] = useState<EstadoPagoCuadrilla>(initial?.estadoPago ?? 'Pendiente');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

  const handleCuartelChange = (id: string) => {
    setCuartelId(id);
    const found = cuarteles.find((c) => c.id === id);
    if (found) setCultivo(found.cultivo);
  };

  const totalCalculado = useMemo(() => {
    const pers = Number(trabajadoresCount) || 0;
    const kg = Number(kilosTotales) || 0;
    const tarifa = Number(tarifaUnitariaCLP) || 0;
    const bonos = Number(bonosCLP) || 0;
    if (modalidadPago === 'Jornal Diario') {
      return pers * tarifa + bonos;
    }
    return kg * tarifa + bonos;
  }, [modalidadPago, trabajadoresCount, kilosTotales, tarifaUnitariaCLP, bonosCLP]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cuadrillaNombre.trim() || !jefeCuadrilla.trim()) return;
    onSave(
      {
        fecha,
        cuadrillaNombre: cuadrillaNombre.trim(),
        jefeCuadrilla: jefeCuadrilla.trim(),
        cuartelId,
        cultivo,
        trabajadoresCount: Number(trabajadoresCount) || 0,
        modalidadPago,
        kilosTotales: Number(kilosTotales) || 0,
        tarifaUnitariaCLP: Number(tarifaUnitariaCLP) || 0,
        bonosCLP: Number(bonosCLP) || 0,
        totalPagarCLP: Math.round(totalCalculado),
        estadoPago,
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Planilla de Cuadrilla' : 'Registrar Cuadrilla y Trato'}
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
            <label className={labelCls}>Nombre Cuadrilla</label>
            <input
              type="text"
              required
              value={cuadrillaNombre}
              onChange={(e) => setCuadrillaNombre(e.target.value)}
              placeholder="Ej: Cuadrilla Panguipulli Norte"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Jefe / Contratista</label>
            <input
              type="text"
              required
              value={jefeCuadrilla}
              onChange={(e) => setJefeCuadrilla(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Cuartel</label>
            <select value={cuartelId} onChange={(e) => handleCuartelChange(e.target.value)} className={inputCls}>
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
            <label className={labelCls}>Modalidad de Pago</label>
            <select
              value={modalidadPago}
              onChange={(e) => setModalidadPago(e.target.value as ModalidadPagoCuadrilla)}
              className={inputCls}
            >
              <option value="Trato por Kilo">Trato por Kilo</option>
              <option value="Jornal Diario">Jornal Diario</option>
              <option value="Mixto">Mixto</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>N° Trabajadores</label>
            <input
              type="number"
              min="1"
              value={trabajadoresCount}
              onChange={(e) => setTrabajadoresCount(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Kilos Totales</label>
            <input
              type="number"
              min="0"
              value={kilosTotales}
              onChange={(e) => setKilosTotales(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              {modalidadPago === 'Jornal Diario' ? 'Jornal x Pers. (CLP)' : 'Tarifa x Kilo (CLP)'}
            </label>
            <input
              type="number"
              min="0"
              value={tarifaUnitariaCLP}
              onChange={(e) => setTarifaUnitariaCLP(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Bonos / Colación (CLP)</label>
            <input
              type="number"
              min="0"
              value={bonosCLP}
              onChange={(e) => setBonosCLP(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center p-3 rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
          <div>
            <span className="text-xs text-slate-500">Total Liquidación Calculado:</span>
            <p className="font-mono tabular-nums text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrencyCLP(totalCalculado)}
            </p>
          </div>
          <div>
            <label className={labelCls}>Estado de Pago</label>
            <select
              value={estadoPago}
              onChange={(e) => setEstadoPago(e.target.value as EstadoPagoCuadrilla)}
              className={inputCls}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Aprobado">Aprobado</option>
              <option value="Pagado">Pagado</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones</label>
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
            Guardar Planilla
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
