import React, { useMemo, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Clock,
  PlayCircle,
  Plus,
  Trash2,
  Pencil,
  QrCode,
  PenTool,
  MessageCircle,
  Check,
} from 'lucide-react';
import {
  Cuartel,
  EstadoOrdenAplicacion,
  OrdenAplicacion,
} from '../types/fieldbook';
import {
  exportOrdenAplicacionWordLetter,
  exportTableToWordLetter,
  formatDateCL,
  formatNumberCL,
} from '../utils/formatters';
import { exportOrdenAplicacionPdfLetter, exportTableToPdfLetter } from '../utils/pdfGenerator';
import { QrLabelData, QrLabelModal } from './QrLabelModal';
import { SignaturePadModal } from './SignaturePadModal';

interface OrdenesAplicacionSectionProps {
  ordenes: OrdenAplicacion[];
  cuarteles: Cuartel[];
  canEdit: boolean;
  focusedOrdenId?: string | null;
  onNewOrden: () => void;
  onEditOrden: (orden: OrdenAplicacion) => void;
  onExecuteOrden: (ordenId: string) => void;
  onUpdateOrdenEstado: (ordenId: string, estado: EstadoOrdenAplicacion) => void;
  onDeleteOrden: (ordenId: string) => void;
}

export const OrdenesAplicacionSection: React.FC<OrdenesAplicacionSectionProps> = ({
  ordenes,
  cuarteles,
  canEdit,
  focusedOrdenId,
  onNewOrden,
  onEditOrden,
  onExecuteOrden,
  onUpdateOrdenEstado,
  onDeleteOrden,
}) => {
  const [estadoFilter, setEstadoFilter] = useState<'Todas' | EstadoOrdenAplicacion>('Todas');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [qrLabel, setQrLabel] = useState<QrLabelData | null>(null);
  const [signingOrden, setSigningOrden] = useState<OrdenAplicacion | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return [...ordenes]
      .filter((o) => estadoFilter === 'Todas' || o.estado === estadoFilter)
      .sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
  }, [ordenes, estadoFilter]);

  const buildOrdenWhatsAppText = (orden: OrdenAplicacion, cuartelesTxt: string) => {
    const prods = orden.productos
      .map((p) => `- ${p.nombreProducto}: ${formatNumberCL(p.cantidadTotal, 2)} ${p.unidadTotal} (${p.dosisPorHa} ${p.unidadDosis})`)
      .join('\n');
    return [
      `*AGRÍCOLA QUEÑI · ORDEN ${orden.numeroOrden}*`,
      `Fecha prog.: ${formatDateCL(orden.fechaProgramada)} | Estado: ${orden.estado}`,
      `Cultivo: ${orden.cultivo} | Cuarteles: ${cuartelesTxt || 'Por definir'} (${formatNumberCL(orden.superficieTotalHa, 1)} ha)`,
      `Objetivo: ${orden.objetivo}`,
      `Mojamiento: ${orden.mojamientoLtsHa} L/ha | Equipo: ${orden.maquinaria}`,
      `Aplicador: ${orden.aplicador}${orden.carnetAplicadorRef ? ` (SAG ${orden.carnetAplicadorRef})` : ''}`,
      `Productos:\n${prods}`,
      `Carencia: ${orden.carenciaDias} días | Reingreso: ${orden.reingresoHoras} h`,
    ].join('\n');
  };

  const handleExportListPDF = () => {
    exportTableToPdfLetter(
      'ordenes-aplicacion-agricola-queni.pdf',
      'Listado de Órdenes de Aplicación',
      `Agrícola Queñi · Filtro: ${estadoFilter} · Total: ${filtered.length} órdenes`,
      ['N° Orden', 'Emisión', 'Programada', 'Cultivo', 'Sup. (ha)', 'Productos', 'Aplicador / Carnets', 'Estado'],
      filtered.map((o) => [
        o.numeroOrden,
        formatDateCL(o.fechaEmision),
        formatDateCL(o.fechaProgramada),
        o.cultivo,
        formatNumberCL(o.superficieTotalHa, 1),
        o.productos.map((p) => `${p.nombreProducto} (${formatNumberCL(p.cantidadTotal, 1)} ${p.unidadTotal})`).join(', '),
        [
          `${o.aplicador}${o.carnetAplicadorRef ? ` [SAG: ${o.carnetAplicadorRef}]` : ''}`,
          o.tractorista ? `Trac: ${o.tractorista}${o.carnetTractoristaRef ? ` [${o.carnetTractoristaRef}]` : ''}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        o.estado,
      ]),
      true
    );
  };

  const handleExportListWord = () => {
    exportTableToWordLetter(
      'ordenes-aplicacion-agricola-queni.doc',
      'Listado de Órdenes de Aplicación — Agrícola Queñi',
      `Filtro: ${estadoFilter} · Total: ${filtered.length} órdenes`,
      ['N° Orden', 'Emisión', 'Programada', 'Tipo', 'Cultivo', 'Sup. (ha)', 'Productos', 'Aplicador / Carnets', 'Estado'],
      filtered.map((o) => [
        o.numeroOrden,
        formatDateCL(o.fechaEmision),
        formatDateCL(o.fechaProgramada),
        o.tipoOrden,
        o.cultivo,
        formatNumberCL(o.superficieTotalHa, 1),
        o.productos.map((p) => `${p.nombreProducto} (${formatNumberCL(p.cantidadTotal, 1)} ${p.unidadTotal})`).join(', '),
        [
          `${o.aplicador}${o.carnetAplicadorRef ? ` [SAG: ${o.carnetAplicadorRef}]` : ''}`,
          o.tractorista ? `Trac: ${o.tractorista}${o.carnetTractoristaRef ? ` [${o.carnetTractoristaRef}]` : ''}` : '',
        ]
          .filter(Boolean)
          .join(' · '),
        o.estado,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div role="tablist" className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          {(['Todas', 'Emitida', 'En Ejecución', 'Ejecutada', 'Anulada'] as const).map((est) => (
            <button
              key={est}
              type="button"
              role="tab"
              aria-selected={estadoFilter === est}
              onClick={() => setEstadoFilter(est)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                estadoFilter === est
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {est}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportListPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600" />
            <span>PDF Resumen Carta</span>
          </button>
          <button
            type="button"
            onClick={handleExportListWord}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            <span>Word Carta</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir Carta</span>
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={onNewOrden}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Emitir Orden de Aplicación</span>
            </button>
          )}
        </div>
      </div>

      {/* Cards Grid for Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filtered.map((orden) => {
          const ordenCuarteles = cuarteles.filter((c) => orden.cuartelIds.includes(c.id));
          const cuartelesLabel = ordenCuarteles
            .map((c) => `${c.codigo} ${c.nombre} (${formatNumberCL(c.superficieHa, 1)} ha)`)
            .join(', ');
          const aguaTotal = orden.superficieTotalHa * orden.mojamientoLtsHa;
          const maquinadas =
            orden.capacidadEstanqueLts > 0 ? aguaTotal / orden.capacidadEstanqueLts : 0;

          return (
            <article
              key={orden.id}
              className={`bg-white dark:bg-slate-900 rounded-xl p-5 flex flex-col justify-between gap-4 break-inside-avoid ${
                focusedOrdenId === orden.id
                  ? 'border-2 border-emerald-600 ring-2 ring-emerald-500/20'
                  : 'border border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {orden.numeroOrden} · {orden.tipoOrden} · Prog. {formatDateCL(orden.fechaProgramada)}
                    </div>
                    <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 mt-1">
                      {orden.objetivo}
                    </h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 ${
                      orden.estado === 'Ejecutada'
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : orden.estado === 'Emitida'
                        ? 'text-blue-700 dark:text-blue-400'
                        : orden.estado === 'Anulada'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {orden.estado === 'Ejecutada' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                    <span>{orden.estado}</span>
                  </span>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                  <div>
                    <strong>Cultivo:</strong> {orden.cultivo} ·{' '}
                    <strong>Cuarteles:</strong>{' '}
                    {ordenCuarteles.map((c) => `${c.codigo} ${c.nombre}`).join(', ')} (
                    <span className="font-mono tabular-nums">
                      {formatNumberCL(orden.superficieTotalHa, 1)} ha
                    </span>
                    )
                  </div>
                  <div className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    Mojamiento: {formatNumberCL(orden.mojamientoLtsHa, 0)} L/ha ({formatNumberCL(aguaTotal, 0)} L total ·{' '}
                    {formatNumberCL(maquinadas, 1)} estanques de {orden.capacidadEstanqueLts} L)
                  </div>
                </div>

                <div className="border-t border-b border-slate-100 dark:border-slate-800 py-2.5 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Dosificación y Retiro desde Bodega
                  </div>
                  {orden.productos.map((prod, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {prod.nombreProducto}{' '}
                        <span className="text-slate-500 font-normal">
                          ({prod.dosisPorHa} {prod.unidadDosis})
                        </span>
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                        {formatNumberCL(prod.cantidadTotal, 2)} {prod.unidadTotal}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div>
                    <strong>Aplicador:</strong> {orden.aplicador}
                    {orden.carnetAplicadorRef && (
                      <span className="font-mono text-[11px] text-emerald-700 dark:text-emerald-400 ml-1">
                        (SAG {orden.carnetAplicadorRef})
                      </span>
                    )}
                    {' · '}
                    <strong>Equipo:</strong> {orden.maquinaria}
                  </div>
                  {(orden.tractorista || orden.carnetTractoristaRef) && (
                    <div>
                      <strong>Tractorista:</strong> {orden.tractorista || 'Asignado'}
                      {orden.carnetTractoristaRef && (
                        <span className="font-mono text-[11px] text-sky-700 dark:text-sky-400 ml-1">
                          (Clase D {orden.carnetTractoristaRef})
                        </span>
                      )}
                    </div>
                  )}
                  <div className="font-mono tabular-nums">
                    Carencia: {orden.carenciaDias} días · Reingreso: {orden.reingresoHoras} hrs · Bodega:{' '}
                    {orden.descontadoBodega ? 'Descontada' : 'Pendiente descuento'}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 print:hidden">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSigningOrden(orden)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                  >
                    <PenTool className="w-3.5 h-3.5" />
                    <span>Firmar y PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void exportOrdenAplicacionPdfLetter(orden, cuarteles);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportOrdenAplicacionWordLetter(orden, cuartelesLabel || 'Sin asignar')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                    <span>Word</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setQrLabel({
                        entityType: 'orden',
                        entityId: orden.id,
                        code: orden.numeroOrden,
                        title: orden.objetivo,
                        subtitle: `${orden.cultivo} · ${formatNumberCL(orden.superficieTotalHa, 1)} ha`,
                        metadataRows: [
                          { label: 'Programada', value: formatDateCL(orden.fechaProgramada) },
                          { label: 'Aplicador', value: orden.aplicador || '—' },
                          { label: 'Mojamiento', value: `${orden.mojamientoLtsHa} L/ha` },
                          { label: 'Carencia', value: `${orden.carenciaDias} días` },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <QrCode className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    <span>QR</span>
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(
                      buildOrdenWhatsAppText(
                        orden,
                        ordenCuarteles.map((c) => `${c.codigo} ${c.nombre}`).join(', ')
                      )
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      const txt = buildOrdenWhatsAppText(
                        orden,
                        ordenCuarteles.map((c) => `${c.codigo} ${c.nombre}`).join(', ')
                      );
                      navigator.clipboard?.writeText(txt);
                      setCopiedId(orden.id);
                      setTimeout(() => setCopiedId(null), 1800);
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    {copiedId === orden.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <MessageCircle className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedId === orden.id ? 'Copiado' : 'WhatsApp'}</span>
                  </a>
                  {canEdit && orden.estado === 'Emitida' && (
                    <button
                      type="button"
                      onClick={() => onUpdateOrdenEstado(orden.id, 'En Ejecución')}
                      className="px-2.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-xs font-medium text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                    >
                      En Curso
                    </button>
                  )}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => onEditOrden(orden)}
                        aria-label={`Editar orden ${orden.numeroOrden}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                      {confirmDeleteId === orden.id ? (
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteOrden(orden.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(orden.id)}
                          aria-label={`Eliminar orden ${orden.numeroOrden}`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {canEdit && orden.estado !== 'Ejecutada' && orden.estado !== 'Anulada' && (
                  <button
                    type="button"
                    onClick={() => onExecuteOrden(orden.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span>Ejecutar y Descontar Bodega</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {qrLabel && <QrLabelModal label={qrLabel} onClose={() => setQrLabel(null)} />}

      {signingOrden && (
        <SignaturePadModal
          title={`Firmar Orden ${signingOrden.numeroOrden}`}
          subtitle={`${signingOrden.cultivo} · ${signingOrden.objetivo}`}
          defaultSignerName={signingOrden.aplicador}
          signerLabel="Nombre del aplicador o responsable que firma"
          onClose={() => setSigningOrden(null)}
          onConfirm={(signerName, signatureDataUrl) => {
            const target = signingOrden;
            setSigningOrden(null);
            void exportOrdenAplicacionPdfLetter(target, cuarteles, {
              signerName,
              signatureDataUrl,
            });
          }}
        />
      )}
    </div>
  );
};
