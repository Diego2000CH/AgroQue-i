import React, { useMemo, useState } from 'react';
import {
  Search,
  Scale,
  Pencil,
  Trash2,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Printer,
  PenTool,
  MessageCircle,
  Check,
} from 'lucide-react';
import {
  AplicacionFitosanitaria,
  Cuartel,
  CultivoConfig,
  RegistroCosecha,
} from '../types/fieldbook';
import {
  exportTableToWordLetter,
  formatDateCL,
  formatNumberCL,
  getCarenciaStatus,
} from '../utils/formatters';
import { exportGuiaDespachoPdfLetter, exportTableToPdfLetter } from '../utils/pdfGenerator';
import { SignaturePadModal } from './SignaturePadModal';

interface CosechaSectionProps {
  cosechas: RegistroCosecha[];
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  aplicaciones: AplicacionFitosanitaria[];
  canEdit: boolean;
  onNewCosecha: (defaultCultivo?: string) => void;
  onEditCosecha: (cosecha: RegistroCosecha) => void;
  onDeleteCosecha: (id: string) => void;
}

export const CosechaSection: React.FC<CosechaSectionProps> = ({
  cosechas,
  cuarteles,
  cultivos,
  aplicaciones,
  canEdit,
  onNewCosecha,
  onEditCosecha,
  onDeleteCosecha,
}) => {
  const [search, setSearch] = useState('');
  const [cultivoTab, setCultivoTab] = useState<string>('Todos');
  const [destinoFilter, setDestinoFilter] = useState<string>('Todos');
  const [signingCosecha, setSigningCosecha] = useState<{
    reg: RegistroCosecha;
    cuartel?: Cuartel;
    enCarencia: boolean;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...cosechas]
      .filter((c) => {
        if (cultivoTab !== 'Todos' && c.cultivo !== cultivoTab) return false;
        if (destinoFilter !== 'Todos' && c.destino !== destinoFilter) return false;
        if (!q) return true;
        const cuartel = cuarteles.find((ct) => ct.id === c.cuartelId);
        return (
          c.guiaDespacho.toLowerCase().includes(q) ||
          c.cultivo.toLowerCase().includes(q) ||
          c.destino.toLowerCase().includes(q) ||
          c.observaciones.toLowerCase().includes(q) ||
          (cuartel?.nombre.toLowerCase().includes(q) ?? false) ||
          (cuartel?.codigo.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [cosechas, cuarteles, search, cultivoTab, destinoFilter]);

  const totalBrutos = filtered.reduce((acc, c) => acc + c.kilosBrutos, 0);
  const totalDescarte = filtered.reduce((acc, c) => acc + c.kilosDescarte, 0);
  const totalNetos = Math.max(0, totalBrutos - totalDescarte);
  const pctDescarte = totalBrutos > 0 ? (totalDescarte / totalBrutos) * 100 : 0;
  const avgBrix =
    filtered.length > 0 ? filtered.reduce((acc, c) => acc + c.brix, 0) / filtered.length : 0;

  const haCultivo = useMemo(() => {
    return cuarteles
      .filter((c) => cultivoTab === 'Todos' || c.cultivo === cultivoTab)
      .reduce((acc, c) => acc + c.superficieHa, 0);
  }, [cuarteles, cultivoTab]);

  const rendimientoKgHa = haCultivo > 0 ? totalNetos / haCultivo : 0;

  const carenciasVigentesList = useMemo(
    () =>
      aplicaciones
        .map((ap) => ({
          ap,
          cuartel: cuarteles.find((c) => c.id === ap.cuartelId),
          status: getCarenciaStatus(ap.fecha, ap.carenciaDias),
        }))
        .filter((item) => item.status.enCarencia),
    [aplicaciones, cuarteles]
  );

  const cuartelesConCarencia = new Set(carenciasVigentesList.map((item) => item.ap.cuartelId));

  const buildGuiaWhatsAppText = (reg: RegistroCosecha, cuartel?: Cuartel) => {
    const netos = Math.max(0, reg.kilosBrutos - reg.kilosDescarte);
    return [
      `*AGRÍCOLA QUEÑI · GUÍA ${reg.guiaDespacho || 'COSECHA'}*`,
      `Fecha: ${formatDateCL(reg.fecha)}`,
      `Cuartel: ${cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : 'General'} (${reg.cultivo})`,
      `Destino: ${reg.destino}`,
      `Kilos Brutos: ${formatNumberCL(reg.kilosBrutos, 0)} kg | Descarte: ${formatNumberCL(reg.kilosDescarte, 0)} kg | *Netos: ${formatNumberCL(netos, 0)} kg*`,
      `°Brix: ${formatNumberCL(reg.brix, 1)} | Cosecheros: ${reg.cosecheros}`,
      reg.observaciones ? `Obs: ${reg.observaciones}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleExportPDF = () => {
    exportTableToPdfLetter(
      `cosecha-${cultivoTab.toLowerCase()}-agricola-queni.pdf`,
      `Control Productivo de Cosecha — ${cultivoTab === 'Todos' ? 'Todos los Cultivos' : cultivoTab}`,
      `Kilos netos: ${formatNumberCL(totalNetos, 0)} kg · Rendimiento: ${formatNumberCL(rendimientoKgHa, 0)} kg/ha · °Brix prom: ${formatNumberCL(avgBrix, 1)}`,
      ['Fecha', 'Guía', 'Cuartel', 'Cultivo', 'Destino', 'Bruto (kg)', 'Descarte', 'Neto (kg)', '°Brix'],
      filtered.map((reg) => {
        const cuartel = cuarteles.find((c) => c.id === reg.cuartelId);
        return [
          formatDateCL(reg.fecha),
          reg.guiaDespacho,
          cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : '—',
          reg.cultivo,
          reg.destino,
          formatNumberCL(reg.kilosBrutos, 0),
          formatNumberCL(reg.kilosDescarte, 0),
          formatNumberCL(Math.max(0, reg.kilosBrutos - reg.kilosDescarte), 0),
          formatNumberCL(reg.brix, 1),
        ];
      }),
      true
    );
  };

  const handleExportWord = () => {
    exportTableToWordLetter(
      `cosecha-${cultivoTab.toLowerCase()}-agricola-queni.doc`,
      `Control de Cosecha — ${cultivoTab}`,
      `Agrícola Queñi · Kilos Netos: ${formatNumberCL(totalNetos, 0)} kg (${formatNumberCL(rendimientoKgHa, 0)} kg/ha)`,
      ['Fecha', 'Guía', 'Cuartel', 'Cultivo', 'Destino', 'Bruto kg', 'Descarte kg', 'Neto kg', '°Brix', 'Cosecheros'],
      filtered.map((reg) => {
        const cuartel = cuarteles.find((c) => c.id === reg.cuartelId);
        return [
          formatDateCL(reg.fecha),
          reg.guiaDespacho,
          cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : '',
          reg.cultivo,
          reg.destino,
          reg.kilosBrutos,
          reg.kilosDescarte,
          Math.max(0, reg.kilosBrutos - reg.kilosDescarte),
          reg.brix,
          reg.cosecheros,
        ];
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Individual Crop Selector Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div role="tablist" aria-label="Control individual por cultivo" className="inline-flex flex-wrap items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start">
          <button
            type="button"
            role="tab"
            aria-selected={cultivoTab === 'Todos'}
            onClick={() => setCultivoTab('Todos')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              cultivoTab === 'Todos'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Todos los Cultivos
          </button>
          {cultivos.map((cul) => (
            <button
              key={cul.id}
              type="button"
              role="tab"
              aria-selected={cultivoTab === cul.nombre}
              onClick={() => setCultivoTab(cul.nombre)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                cultivoTab === cul.nombre
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span
                style={{ backgroundColor: cul.colorHex }}
                className="w-2 h-2 rounded-full inline-block"
              />
              <span>{cul.nombre}</span>
            </button>
          ))}
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

      {/* KPI Strip for Selected Crop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Superficie ({cultivoTab})
          </p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1.5">
            {formatNumberCL(haCultivo, 1)} ha
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Kilos Netos</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-emerald-700 dark:text-emerald-400 mt-1.5">
            {formatNumberCL(totalNetos, 0)} kg
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rendimiento</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1.5">
            {formatNumberCL(rendimientoKgHa, 0)} kg/ha
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Descarte / Merma</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1.5">
            {formatNumberCL(pctDescarte, 1)}%
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Madurez Promedio</p>
          <p className="font-mono tabular-nums text-xl font-semibold text-slate-900 dark:text-slate-100 mt-1.5">
            {filtered.length > 0 ? `${formatNumberCL(avgBrix, 1)} °Brix` : '—'}
          </p>
        </div>
      </div>

      {/* Search & Destino Filter */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar guía, cuartel, destino..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
        </div>

        <select
          value={destinoFilter}
          onChange={(e) => setDestinoFilter(e.target.value)}
          aria-label="Filtrar por destino comercial"
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="Todos">Todos los destinos</option>
          <option value="Fresco Exportación">Fresco Exportación</option>
          <option value="IQF Congelado">IQF Congelado</option>
          <option value="Liofilizado / Polvo">Liofilizado / Polvo</option>
          <option value="Agroindustria / Jugos">Agroindustria / Jugos</option>
        </select>
      </div>

      {/* Active Carencia Harvest Warning Banner */}
      {cuartelesConCarencia.size > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950 dark:text-amber-100">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              Alerta de Bloqueo Preventivo de Cosecha ({cuartelesConCarencia.size} cuartel(es) en carencia activa)
            </p>
            <p className="text-amber-800 dark:text-amber-200/90 mt-0.5">
              {carenciasVigentesList
                .map(
                  ({ ap, cuartel, status }) =>
                    `${cuartel ? `${cuartel.codigo} ${cuartel.nombre}` : 'Cuartel'} (${ap.productoComercial}, libera ${formatDateCL(status.fechaLiberacion)})`
                )
                .join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <Scale className="w-8 h-8 text-slate-400 mx-auto mb-3" strokeWidth={1.6} />
          <h3 className="font-display text-base font-semibold">
            No hay registros de cosecha para {cultivoTab}
          </h3>
          {canEdit && (
            <button
              type="button"
              onClick={() => onNewCosecha(cultivoTab === 'Todos' ? undefined : cultivoTab)}
              className="mt-4 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium"
            >
              Registrar cosecha de {cultivoTab === 'Todos' ? 'fruta' : cultivoTab}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 text-xs font-medium text-slate-500">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Guía</th>
                  <th className="py-3 px-4">Cuartel / Cultivo</th>
                  <th className="py-3 px-4">Destino</th>
                  <th className="py-3 px-4 text-right">Bruto (kg)</th>
                  <th className="py-3 px-4 text-right">Descarte</th>
                  <th className="py-3 px-4 text-right">Neto (kg)</th>
                  <th className="py-3 px-4 text-right">°Brix</th>
                  <th className="py-3 px-4 text-right">Cosech.</th>
                  <th className="py-3 px-4 text-right">Guía / Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-sm">
                {filtered.map((reg) => {
                  const cuartel = cuarteles.find((c) => c.id === reg.cuartelId);
                  const netos = Math.max(0, reg.kilosBrutos - reg.kilosDescarte);
                  const tieneCarencia = cuartelesConCarencia.has(reg.cuartelId);
                  return (
                    <tr key={reg.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap align-top">
                        {formatDateCL(reg.fecha)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-xs whitespace-nowrap align-top">
                        {reg.guiaDespacho || '—'}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <div className="font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <span className="font-mono text-xs text-slate-500 mr-1.5">
                            {cuartel?.codigo ?? '—'}
                          </span>
                          {cuartel?.nombre ?? 'Sin cuartel'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            {reg.cultivo}
                          </span>
                          {tieneCarencia && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Carencia actual</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 align-top text-xs">
                        <div className="font-medium">{reg.destino}</div>
                        {reg.observaciones && (
                          <div className="text-slate-500 mt-0.5 max-w-xs truncate">
                            {reg.observaciones}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs">
                        {formatNumberCL(reg.kilosBrutos, 0)}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs text-slate-500">
                        {formatNumberCL(reg.kilosDescarte, 0)}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs font-semibold">
                        {formatNumberCL(netos, 0)}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs">
                        {formatNumberCL(reg.brix, 1)}
                      </td>
                      <td className="py-3 px-4 align-top text-right font-mono tabular-nums text-xs">
                        {reg.cosecheros}
                      </td>
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setSigningCosecha({
                                reg,
                                cuartel,
                                enCarencia: tieneCarencia,
                              })
                            }
                            title="Firmar y descargar Guía de Despacho PDF"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 text-xs font-medium text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                          >
                            <PenTool className="w-3 h-3" />
                            <span>Guía PDF</span>
                          </button>
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(
                              buildGuiaWhatsAppText(reg, cuartel)
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              navigator.clipboard?.writeText(
                                buildGuiaWhatsAppText(reg, cuartel)
                              );
                              setCopiedId(reg.id);
                              setTimeout(() => setCopiedId(null), 1800);
                            }}
                            title="Compartir guía por WhatsApp"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          >
                            {copiedId === reg.id ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <MessageCircle className="w-3 h-3" />
                            )}
                            <span>{copiedId === reg.id ? 'Copiado' : 'WA'}</span>
                          </a>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => onEditCosecha(reg)}
                                aria-label="Editar cosecha"
                                className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteCosecha(reg.id)}
                                aria-label="Eliminar cosecha"
                                className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

      {signingCosecha && (
        <SignaturePadModal
          title={`Firmar Guía ${signingCosecha.reg.guiaDespacho || 'de Despacho'}`}
          subtitle={`${signingCosecha.reg.cultivo} · ${formatNumberCL(
            Math.max(
              0,
              signingCosecha.reg.kilosBrutos - signingCosecha.reg.kilosDescarte
            ),
            0
          )} kg netos · ${signingCosecha.reg.destino}`}
          signerLabel="Nombre del conductor / recepción / packing que firma"
          onClose={() => setSigningCosecha(null)}
          onConfirm={(signerName, signatureDataUrl) => {
            const target = signingCosecha;
            setSigningCosecha(null);
            void exportGuiaDespachoPdfLetter(
              target.reg,
              target.cuartel,
              target.enCarencia,
              { signerName, signatureDataUrl }
            );
          }}
        />
      )}
    </div>
  );
};
