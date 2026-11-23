import React, { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import {
  BodegaItem,
  CategoriaBodega,
  Cuartel,
  CultivoConfig,
  EstadoMaquinaria,
  EstadoOrdenAplicacion,
  EstadoSectorRiego,
  MaquinaEquipo,
  MonitoreoPlaga,
  MovimientoBodega,
  NivelIncidenciaPlaga,
  OrdenAplicacion,
  OrdenAplicacionProducto,
  PersonalHabilitadoItem,
  RegistroClimaManual,
  RegistroRiego,
  SectorRiego,
} from '../types/fieldbook';
import { getActiveAgricolaInfo } from '../data/initialData';
import { addDaysISO, formatNumberCL, getTodayISO } from '../utils/formatters';
import { evaluateCarnetStatus } from '../utils/rbac';

export const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-700 dark:focus:border-emerald-500';
export const labelCls = 'block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1';

export const ModalShell: React.FC<{
  title: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ title, onClose, wide, children }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-slate-950/60 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative w-full ${
          wide ? 'max-w-2xl' : 'max-w-xl'
        } bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-[90dvh] flex flex-col`}
      >
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100 truncate">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -mr-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
};

export const CropMultiSelect: React.FC<{
  cultivos: CultivoConfig[];
  selected: string[];
  onChange: (next: string[]) => void;
  label?: string;
}> = ({ cultivos, selected, onChange, label = 'Compatibilidad con Cultivos' }) => {
  const isAll = selected.includes('Todos');

  const toggle = (name: string) => {
    if (name === 'Todos') {
      onChange(isAll ? [cultivos[0]?.nombre || 'Maqui'] : ['Todos']);
      return;
    }
    const base = selected.filter((s) => s !== 'Todos');
    const exists = base.includes(name);
    const next = exists ? base.filter((s) => s !== name) : [...base, name];
    onChange(next.length > 0 ? next : ['Todos']);
  };

  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex flex-wrap gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => toggle('Todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            isAll
              ? 'bg-emerald-700 text-white border-emerald-700'
              : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          Todos los cultivos
        </button>
        {cultivos.map((cul) => {
          const active = !isAll && selected.includes(cul.nombre);
          return (
            <button
              key={cul.id}
              type="button"
              onClick={() => toggle(cul.nombre)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                active
                  ? 'bg-emerald-700 text-white border-emerald-700'
                  : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {cul.nombre}
            </button>
          );
        })}
      </div>
    </div>
  );
};

/* 1. BODEGA ITEM MODAL */
export const BodegaItemModal: React.FC<{
  initial?: BodegaItem | null;
  defaultCategoria?: CategoriaBodega;
  cultivos: CultivoConfig[];
  onClose: () => void;
  onSave: (data: Omit<BodegaItem, 'id'>, id?: string) => void;
}> = ({ initial, defaultCategoria = 'Fitosanitario', cultivos, onClose, onSave }) => {
  const [codigo, setCodigo] = useState(initial?.codigo ?? '');
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [categoria, setCategoria] = useState<CategoriaBodega>(
    initial?.categoria ?? defaultCategoria
  );
  const [subcategoria, setSubcategoria] = useState(
    initial?.subcategoria ?? (defaultCategoria === 'Fitosanitario' ? 'Fungicida' : defaultCategoria === 'Fertilización' ? 'Fertilizante Soluble' : 'Repuesto Pulverización')
  );
  const [ingrediente, setIngrediente] = useState(
    initial?.ingredienteActivoOEspecificacion ?? ''
  );
  const [registroSag, setRegistroSag] = useState(initial?.registroSagOParte ?? '');
  const [cultivosCompatibles, setCultivosCompatibles] = useState<string[]>(
    initial?.cultivosCompatibles ?? ['Todos']
  );
  const [stockActual, setStockActual] = useState(String(initial?.stockActual ?? 10));
  const [stockMinimo, setStockMinimo] = useState(String(initial?.stockMinimo ?? 5));
  const [unidad, setUnidad] = useState(initial?.unidad ?? 'L');
  const [costoUnitario, setCostoUnitario] = useState(String(initial?.costoUnitarioCLP ?? 15000));
  const [lote, setLote] = useState(initial?.lote ?? '');
  const [fechaVencimiento, setFechaVencimiento] = useState(
    initial?.fechaVencimiento ?? addDaysISO(getTodayISO(), 365)
  );
  const [carenciaBaseDias, setCarenciaBaseDias] = useState(
    String(initial?.carenciaBaseDias ?? 7)
  );
  const [reingresoBaseHoras, setReingresoBaseHoras] = useState(
    String(initial?.reingresoBaseHoras ?? 12)
  );
  const [ubicacionBodega, setUbicacionBodega] = useState(
    initial?.ubicacionBodega ?? 'Bodega Central · Estante A'
  );
  const [notas, setNotas] = useState(initial?.notas ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) return;
    onSave(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        categoria,
        subcategoria: subcategoria.trim(),
        ingredienteActivoOEspecificacion: ingrediente.trim(),
        registroSagOParte: registroSag.trim(),
        cultivosCompatibles,
        stockActual: Number(stockActual) || 0,
        stockMinimo: Number(stockMinimo) || 0,
        unidad: unidad.trim() || 'unid',
        costoUnitarioCLP: Number(costoUnitario) || 0,
        lote: lote.trim(),
        fechaVencimiento,
        carenciaBaseDias:
          categoria === 'Fitosanitario' ? Number(carenciaBaseDias) || 0 : undefined,
        reingresoBaseHoras:
          categoria === 'Fitosanitario' ? Number(reingresoBaseHoras) || 0 : undefined,
        ubicacionBodega: ubicacionBodega.trim(),
        notas: notas.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Ítem de Bodega' : 'Agregar Producto / Repuesto a Bodega'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Categoría Bodega</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaBodega)}
              className={inputCls}
            >
              <option value="Fitosanitario">Fitosanitario</option>
              <option value="Fertilización">Fertilización</option>
              <option value="Maquinaria y Repuestos">Maquinaria y Repuestos</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Código Interno</label>
            <input
              type="text"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="FIT-010"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Subcategoría</label>
            <input
              type="text"
              required
              value={subcategoria}
              onChange={(e) => setSubcategoria(e.target.value)}
              placeholder="Fungicida / Soluble / Filtro"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre Comercial / Repuesto</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Switch 62.5 WG / Sulfato de Amonio"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ingrediente Activo / Especificación</label>
            <input
              type="text"
              required
              value={ingrediente}
              onChange={(e) => setIngrediente(e.target.value)}
              placeholder="Ej: Cyprodinil + Fludioxonil / 21-0-0-24S"
              className={inputCls}
            />
          </div>
        </div>

        <CropMultiSelect
          cultivos={cultivos}
          selected={cultivosCompatibles}
          onChange={setCultivosCompatibles}
          label="Cultivos Compatibles (Especificar si sirve para Maqui, Arándanos, Zarzaparrilla u otros)"
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Stock Actual</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={stockActual}
              onChange={(e) => setStockActual(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Stock Mínimo</label>
            <input
              type="number"
              step="0.1"
              min="0"
              value={stockMinimo}
              onChange={(e) => setStockMinimo(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Unidad</label>
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)} className={inputCls}>
              <option value="L">L (Litros)</option>
              <option value="kg">kg (Kilos)</option>
              <option value="unid">unid (Unidades)</option>
              <option value="m">m (Metros)</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Costo Unit. (CLP)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={costoUnitario}
              onChange={(e) => setCostoUnitario(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Registro SAG / N° Parte</label>
            <input
              type="text"
              value={registroSag}
              onChange={(e) => setRegistroSag(e.target.value)}
              placeholder="SAG 2658"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Lote</label>
            <input
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Vencimiento</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        {categoria === 'Fitosanitario' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Carencia Base SAG (días)</label>
              <input
                type="number"
                min="0"
                value={carenciaBaseDias}
                onChange={(e) => setCarenciaBaseDias(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Reingreso Base (horas)</label>
              <input
                type="number"
                min="0"
                value={reingresoBaseHoras}
                onChange={(e) => setReingresoBaseHoras(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Ubicación en Bodega</label>
            <input
              type="text"
              value={ubicacionBodega}
              onChange={(e) => setUbicacionBodega(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Notas</label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Guardar en Bodega
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 2. ORDEN DE APLICACIÓN MODAL */
export const OrdenAplicacionModal: React.FC<{
  initial?: OrdenAplicacion | null;
  cuarteles: Cuartel[];
  bodega: BodegaItem[];
  maquinas: MaquinaEquipo[];
  personalHabilitado?: PersonalHabilitadoItem[];
  nextNumero: string;
  presetFromPlaga?: MonitoreoPlaga | null;
  onClose: () => void;
  onSave: (data: Omit<OrdenAplicacion, 'id'>, id?: string) => void;
}> = ({
  initial,
  cuarteles,
  bodega,
  maquinas,
  personalHabilitado = [],
  nextNumero,
  presetFromPlaga,
  onClose,
  onSave,
}) => {
  const insumosAplicables = useMemo(
    () =>
      bodega.filter(
        (b) => b.categoria === 'Fitosanitario' || b.categoria === 'Fertilización'
      ),
    [bodega]
  );

  const aplicadoresList = useMemo(
    () =>
      personalHabilitado.filter(
        (p) =>
          p.activo &&
          (p.requiereCarnetAplicador ||
            p.rol === 'Aplicador Fitosanitario' ||
            p.rol === 'Agrónomo')
      ),
    [personalHabilitado]
  );

  const tractoristasList = useMemo(
    () =>
      personalHabilitado.filter(
        (p) =>
          p.activo &&
          (p.requiereCarnetTractorista || p.rol === 'Tractorista')
      ),
    [personalHabilitado]
  );

  const initialCuartelIds = initial?.cuartelIds
    ? initial.cuartelIds
    : presetFromPlaga
    ? [presetFromPlaga.cuartelId]
    : cuarteles[0]
    ? [cuarteles[0].id]
    : [];

  const [numeroOrden, setNumeroOrden] = useState(initial?.numeroOrden ?? nextNumero);
  const [fechaProgramada, setFechaProgramada] = useState(initial?.fechaProgramada ?? getTodayISO());
  const [cuartelIds, setCuartelIds] = useState<string[]>(initialCuartelIds);
  const [tipoOrden, setTipoOrden] = useState<'Fitosanitaria' | 'Fertirrigación / Foliar'>(
    initial?.tipoOrden ?? 'Fitosanitaria'
  );
  const [estado, setEstado] = useState<EstadoOrdenAplicacion>(initial?.estado ?? 'Emitida');
  const [objetivo, setObjetivo] = useState(
    initial?.objetivo ??
      (presetFromPlaga
        ? `Control de ${presetFromPlaga.plagaOEnfermedad} (${presetFromPlaga.nivel})`
        : '')
  );
  const [mojamientoLtsHa, setMojamientoLtsHa] = useState(
    String(initial?.mojamientoLtsHa ?? 1000)
  );
  const [capacidadEstanqueLts, setCapacidadEstanqueLts] = useState(
    String(initial?.capacidadEstanqueLts ?? 1000)
  );
  const [maquinaria, setMaquinaria] = useState(
    initial?.maquinaria ?? maquinas[0]?.nombre ?? ''
  );
  const [aplicador, setAplicador] = useState(
    initial?.aplicador ?? aplicadoresList[0]?.nombre ?? ''
  );
  const [tractorista, setTractorista] = useState(
    initial?.tractorista ?? (tractoristasList[0]?.nombre || '')
  );
  const [responsableTecnico, setResponsableTecnico] = useState(
    initial?.responsableTecnico ?? ''
  );
  const [eppRequerido, setEppRequerido] = useState(
    initial?.eppRequerido ??
      'Traje impermeable, antiparras selladas, máscara doble filtro, guantes nitrilo y botas'
  );
  const [condicionesClimaRequeridas, setCondicionesClimaRequeridas] = useState(
    initial?.condicionesClimaRequeridas ??
      'Viento < 8 km/h · T° 8–22 °C · HR 45–80% · Sin lluvia pronosticada en 24h'
  );
  const [carenciaDias, setCarenciaDias] = useState(String(initial?.carenciaDias ?? 7));
  const [reingresoHoras, setReingresoHoras] = useState(String(initial?.reingresoHoras ?? 12));
  const [observaciones, setObservaciones] = useState(
    initial?.observaciones ??
      (presetFromPlaga ? `Emitida desde monitoreo GPS: ${presetFromPlaga.recomendacion}` : '')
  );

  const [lines, setLines] = useState<
    { bodegaItemId: string; dosisPorHa: string; unidadDosis: string }[]
  >(
    initial?.productos && initial.productos.length > 0
      ? initial.productos.map((p) => ({
          bodegaItemId: p.bodegaItemId,
          dosisPorHa: String(p.dosisPorHa),
          unidadDosis: p.unidadDosis,
        }))
      : [
          {
            bodegaItemId: insumosAplicables[0]?.id ?? '',
            dosisPorHa: '1.0',
            unidadDosis: insumosAplicables[0]?.unidad === 'L' ? 'L/ha' : 'kg/ha',
          },
        ]
  );

  const selectedCuarteles = useMemo(
    () => cuarteles.filter((c) => cuartelIds.includes(c.id)),
    [cuarteles, cuartelIds]
  );

  const superficieTotalHa = useMemo(
    () =>
      Number(selectedCuarteles.reduce((acc, c) => acc + c.superficieHa, 0).toFixed(2)),
    [selectedCuarteles]
  );

  const cultivoPrincipal = useMemo(() => {
    const names = Array.from(new Set(selectedCuarteles.map((c) => c.cultivo)));
    return names.length > 0 ? names.join(' / ') : 'General';
  }, [selectedCuarteles]);

  const toggleCuartel = (id: string) => {
    setCuartelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleProductChange = (idx: number, bodegaItemId: string) => {
    const item = insumosAplicables.find((i) => i.id === bodegaItemId);
    setLines((prev) =>
      prev.map((l, i) =>
        i === idx
          ? {
              ...l,
              bodegaItemId,
              unidadDosis: item?.unidad === 'L' ? 'L/ha' : 'kg/ha',
            }
          : l
      )
    );
    if (item?.carenciaBaseDias !== undefined) {
      setCarenciaDias(String(item.carenciaBaseDias));
    }
    if (item?.reingresoBaseHoras !== undefined) {
      setReingresoHoras(String(item.reingresoBaseHoras));
    }
  };

  const matchedAplicador = useMemo(
    () => personalHabilitado.find((p) => p.nombre.toLowerCase() === aplicador.trim().toLowerCase()),
    [personalHabilitado, aplicador]
  );
  const matchedTractorista = useMemo(
    () => personalHabilitado.find((p) => p.nombre.toLowerCase() === tractorista.trim().toLowerCase()),
    [personalHabilitado, tractorista]
  );
  const requiresTractor = useMemo(() => {
    const m = maquinaria.toLowerCase();
    return Boolean(maquinaria.trim()) && m !== 'manual' && !m.includes('espalda');
  }, [maquinaria]);

  const aplicadorCarnetEval = useMemo(() => {
    if (!matchedAplicador) return null;
    return evaluateCarnetStatus(
      matchedAplicador.requiereCarnetAplicador,
      matchedAplicador.carnetAplicadorNumero,
      matchedAplicador.carnetAplicadorVencimiento
    );
  }, [matchedAplicador]);

  const tractoristaCarnetEval = useMemo(() => {
    if (!matchedTractorista) return null;
    return evaluateCarnetStatus(
      matchedTractorista.requiereCarnetTractorista,
      matchedTractorista.carnetTractoristaNumero,
      matchedTractorista.carnetTractoristaVencimiento
    );
  }, [matchedTractorista]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cuartelIds.length === 0 || !objetivo.trim() || lines.length === 0) return;

    const productos: OrdenAplicacionProducto[] = lines
      .map((l) => {
        const item = insumosAplicables.find((i) => i.id === l.bodegaItemId);
        if (!item) return null;
        const dosis = Number(l.dosisPorHa) || 0;
        const cantidadTotal = Number((dosis * superficieTotalHa).toFixed(2));
        return {
          bodegaItemId: item.id,
          nombreProducto: item.nombre,
          ingredienteActivo: item.ingredienteActivoOEspecificacion,
          dosisPorHa: dosis,
          unidadDosis: l.unidadDosis,
          cantidadTotal,
          unidadTotal: item.unidad,
        };
      })
      .filter((x): x is OrdenAplicacionProducto => x !== null);

    if (productos.length === 0) return;

    const carnetApRef = matchedAplicador?.carnetAplicadorNumero
      ? `${matchedAplicador.carnetAplicadorNumero}${
          matchedAplicador.carnetAplicadorVencimiento
            ? ` (Vence ${matchedAplicador.carnetAplicadorVencimiento})`
            : ''
        }`
      : undefined;

    const carnetTracRef = matchedTractorista?.carnetTractoristaNumero
      ? `${matchedTractorista.carnetTractoristaNumero}${
          matchedTractorista.carnetTractoristaVencimiento
            ? ` (Vence ${matchedTractorista.carnetTractoristaVencimiento})`
            : ''
        }`
      : undefined;

    onSave(
      {
        numeroOrden: numeroOrden.trim(),
        fechaEmision: initial?.fechaEmision ?? getTodayISO(),
        fechaProgramada,
        cuartelIds,
        cultivo: cultivoPrincipal,
        superficieTotalHa,
        tipoOrden,
        objetivo: objetivo.trim(),
        productos,
        mojamientoLtsHa: Number(mojamientoLtsHa) || 0,
        capacidadEstanqueLts: Number(capacidadEstanqueLts) || 1000,
        maquinaria: maquinaria.trim(),
        aplicador: aplicador.trim(),
        tractorista: tractorista.trim() || undefined,
        carnetAplicadorRef: carnetApRef ?? initial?.carnetAplicadorRef,
        carnetTractoristaRef: carnetTracRef ?? initial?.carnetTractoristaRef,
        responsableTecnico: responsableTecnico.trim(),
        eppRequerido: eppRequerido.trim(),
        condicionesClimaRequeridas: condicionesClimaRequeridas.trim(),
        carenciaDias: Number(carenciaDias) || 0,
        reingresoHoras: Number(reingresoHoras) || 0,
        estado: initial ? estado : 'Emitida',
        descontadoBodega: initial?.descontadoBodega ?? false,
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell title={initial ? `Editar Orden ${initial.numeroOrden}` : 'Emitir Orden de Aplicación'} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className={`grid grid-cols-1 ${initial ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
          <div>
            <label className={labelCls}>N° Orden</label>
            <input
              type="text"
              required
              value={numeroOrden}
              onChange={(e) => setNumeroOrden(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Fecha Programada</label>
            <input
              type="date"
              required
              value={fechaProgramada}
              onChange={(e) => setFechaProgramada(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo de Orden</label>
            <select
              value={tipoOrden}
              onChange={(e) =>
                setTipoOrden(e.target.value as 'Fitosanitaria' | 'Fertirrigación / Foliar')
              }
              className={inputCls}
            >
              <option value="Fitosanitaria">Fitosanitaria</option>
              <option value="Fertirrigación / Foliar">Fertirrigación / Foliar</option>
            </select>
          </div>
          {initial && (
            <div>
              <label className={labelCls}>Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as EstadoOrdenAplicacion)}
                className={inputCls}
              >
                <option value="Emitida">Emitida</option>
                <option value="En Ejecución">En Ejecución</option>
                <option value="Ejecutada">Ejecutada</option>
                <option value="Anulada">Anulada</option>
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelCls}>
            Cuarteles Objetivo (Superficie seleccionada:{' '}
            <strong className="font-mono text-emerald-700 dark:text-emerald-400">
              {formatNumberCL(superficieTotalHa, 2)} ha · {cultivoPrincipal}
            </strong>
            )
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 max-h-36 overflow-y-auto">
            {cuarteles.map((c) => {
              const checked = cuartelIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleCuartel(c.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    checked
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-600 text-emerald-900 dark:text-emerald-200 font-medium'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {c.codigo} · {c.nombre} ({c.cultivo} · {formatNumberCL(c.superficieHa, 1)} ha)
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className={labelCls}>Objetivo / Plaga / Programa Nutricional</label>
          <input
            type="text"
            required
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="Ej: Control Botrytis cinerea en pre-cosecha"
            className={inputCls}
          />
        </div>

        {/* Product lines */}
        <div className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50/70 dark:bg-slate-950/50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Productos desde Bodega (Cálculo automático por hectárea)
            </span>
            <button
              type="button"
              onClick={() =>
                setLines((prev) => [
                  ...prev,
                  {
                    bodegaItemId: insumosAplicables[0]?.id ?? '',
                    dosisPorHa: '1.0',
                    unidadDosis: insumosAplicables[0]?.unidad === 'L' ? 'L/ha' : 'kg/ha',
                  },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar producto</span>
            </button>
          </div>

          {lines.map((line, idx) => {
            const item = insumosAplicables.find((i) => i.id === line.bodegaItemId);
            const total = (Number(line.dosisPorHa) || 0) * superficieTotalHa;
            return (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                <div className="sm:col-span-6">
                  <select
                    value={line.bodegaItemId}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    className={inputCls}
                  >
                    {insumosAplicables.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nombre} (Stock: {b.stockActual} {b.unidad} · {b.cultivosCompatibles.join(', ')})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={line.dosisPorHa}
                    onChange={(e) =>
                      setLines((prev) =>
                        prev.map((l, i) => (i === idx ? { ...l, dosisPorHa: e.target.value } : l))
                      )
                    }
                    className={inputCls}
                  />
                </div>
                <div className="sm:col-span-3 text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {line.unidadDosis} →{' '}
                  <strong className="text-emerald-700 dark:text-emerald-400">
                    {formatNumberCL(total, 2)} {item?.unidad ?? ''}
                  </strong>
                </div>
                <div className="sm:col-span-1 text-right">
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Mojamiento (L/ha)</label>
            <input
              type="number"
              min="0"
              value={mojamientoLtsHa}
              onChange={(e) => setMojamientoLtsHa(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estanque (L)</label>
            <input
              type="number"
              min="50"
              value={capacidadEstanqueLts}
              onChange={(e) => setCapacidadEstanqueLts(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Carencia (días)</label>
            <input
              type="number"
              min="0"
              value={carenciaDias}
              onChange={(e) => setCarenciaDias(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Reingreso (hrs)</label>
            <input
              type="number"
              min="0"
              value={reingresoHoras}
              onChange={(e) => setReingresoHoras(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Maquinaria / Equipo</label>
            <input
              type="text"
              list="orden-maquinas-list"
              value={maquinaria}
              onChange={(e) => setMaquinaria(e.target.value)}
              className={inputCls}
            />
            <datalist id="orden-maquinas-list">
              <option value="Manual / Bomba de Espalda" />
              {maquinas.map((m) => (
                <option key={m.id} value={m.nombre} />
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Responsable Técnico</label>
            <input
              type="text"
              required
              value={responsableTecnico}
              onChange={(e) => setResponsableTecnico(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
          <div>
            <label className={labelCls}>Aplicador Fitosanitario (Carnet SAG)</label>
            <input
              type="text"
              required
              list="orden-aplicadores-list"
              value={aplicador}
              onChange={(e) => setAplicador(e.target.value)}
              placeholder="Selecciona o escribe nombre del aplicador"
              className={inputCls}
            />
            <datalist id="orden-aplicadores-list">
              {aplicadoresList.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.carnetAplicadorNumero ? `SAG ${p.carnetAplicadorNumero}` : p.cargo}
                </option>
              ))}
              {personalHabilitado
                .filter((p) => !aplicadoresList.some((a) => a.id === p.id))
                .map((p) => (
                  <option key={p.id} value={p.nombre} />
                ))}
            </datalist>
            {matchedAplicador && aplicadorCarnetEval && (
              <p
                className={`mt-1 text-[11px] flex items-center gap-1 ${
                  aplicadorCarnetEval.estado === 'vigente'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : aplicadorCarnetEval.estado === 'por_vencer'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {aplicadorCarnetEval.estado === 'vigente' ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {matchedAplicador.carnetAplicadorNumero
                    ? `Carnet SAG ${matchedAplicador.carnetAplicadorNumero} · ${aplicadorCarnetEval.label}`
                    : tipoOrden === 'Fitosanitaria'
                    ? 'Sin Carnet de Aplicador SAG registrado'
                    : 'Sin carnet SAG registrado'}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className={labelCls}>
              Tractorista {requiresTractor ? '(Licencia Clase D)' : '(Opcional si es manual)'}
            </label>
            <input
              type="text"
              list="orden-tractoristas-list"
              value={tractorista}
              onChange={(e) => setTractorista(e.target.value)}
              placeholder={requiresTractor ? 'Nombre del tractorista' : 'No aplica si es manual'}
              className={inputCls}
            />
            <datalist id="orden-tractoristas-list">
              {tractoristasList.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.carnetTractoristaNumero ? `Clase D ${p.carnetTractoristaNumero}` : p.cargo}
                </option>
              ))}
              {personalHabilitado
                .filter((p) => !tractoristasList.some((t) => t.id === p.id))
                .map((p) => (
                  <option key={p.id} value={p.nombre} />
                ))}
            </datalist>
            {matchedTractorista && tractoristaCarnetEval && (
              <p
                className={`mt-1 text-[11px] flex items-center gap-1 ${
                  tractoristaCarnetEval.estado === 'vigente'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : tractoristaCarnetEval.estado === 'por_vencer'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {tractoristaCarnetEval.estado === 'vigente' ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {matchedTractorista.carnetTractoristaNumero
                    ? `Lic. Clase D ${matchedTractorista.carnetTractoristaNumero} · ${tractoristaCarnetEval.label}`
                    : 'Sin Carnet de Tractorista Clase D registrado'}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>EPP Requerido</label>
            <input
              type="text"
              value={eppRequerido}
              onChange={(e) => setEppRequerido(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Condiciones Climáticas Requeridas</label>
            <input
              type="text"
              value={condicionesClimaRequeridas}
              onChange={(e) => setCondicionesClimaRequeridas(e.target.value)}
              className={inputCls}
            />
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

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {initial ? 'Guardar Cambios' : 'Emitir Orden'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 3. RIEGO MODAL */
export const RiegoModal: React.FC<{
  initial?: RegistroRiego | null;
  cuarteles: Cuartel[];
  sectoresRiego?: SectorRiego[];
  onClose: () => void;
  onSave: (data: Omit<RegistroRiego, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, sectoresRiego = [], onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? cuarteles[0]?.id ?? '');
  const [horaInicio, setHoraInicio] = useState(initial?.horaInicio ?? '06:30');
  const [horasRiego, setHorasRiego] = useState(String(initial?.horasRiego ?? 3.5));
  const [caudalM3Hora, setCaudalM3Hora] = useState(String(initial?.caudalM3Hora ?? 16));
  const [laminaMm, setLaminaMm] = useState(String(initial?.laminaMm ?? 6.8));
  const [presionBar, setPresionBar] = useState(String(initial?.presionBar ?? 2.2));
  const [phAgua, setPhAgua] = useState(String(initial?.phAgua ?? 5.6));
  const [conductividadDsM, setConductividadDsM] = useState(String(initial?.conductividadDsM ?? 1.1));
  const [humedadSueloCbar, setHumedadSueloCbar] = useState(String(initial?.humedadSueloCbar ?? 18));
  const [sectorValvula, setSectorValvula] = useState(
    initial?.sectorValvula ??
      (sectoresRiego[0] ? `${sectoresRiego[0].codigo} · ${sectoresRiego[0].nombre}` : '')
  );
  const [operador, setOperador] = useState(initial?.operador ?? '');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

  const handleSelectSectorPreset = (sectorId: string) => {
    const sec = sectoresRiego.find((s) => s.id === sectorId);
    if (!sec) return;
    setSectorValvula(`${sec.codigo} · ${sec.nombre}`);
    setCaudalM3Hora(String(sec.caudalNominalM3h));
    setPresionBar(String(sec.presionBar));
    if (sec.cuartelIds.length > 0) {
      setCuartelId(sec.cuartelIds[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        fecha,
        cuartelId,
        horaInicio,
        horasRiego: Number(horasRiego) || 0,
        caudalM3Hora: Number(caudalM3Hora) || 0,
        laminaMm: Number(laminaMm) || 0,
        presionBar: Number(presionBar) || 0,
        phAgua: Number(phAgua) || 0,
        conductividadDsM: Number(conductividadDsM) || 0,
        humedadSueloCbar: Number(humedadSueloCbar) || 0,
        sectorValvula: sectorValvula.trim(),
        operador: operador.trim(),
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell title={initial ? 'Editar Evento de Riego' : 'Registrar Evento de Riego'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {sectoresRiego.length > 0 && (
          <div>
            <label className={labelCls}>Cargar Parámetros desde Sector de Riego (opcional)</label>
            <select
              defaultValue=""
              onChange={(e) => e.target.value && handleSelectSectorPreset(e.target.value)}
              className={inputCls}
            >
              <option value="">Seleccionar sector hidráulico...</option>
              {sectoresRiego.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} · {s.nombre} ({s.caudalNominalM3h} m³/h · {s.presionBar} bar)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hora Inicio</label>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={inputCls} />
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className={labelCls}>Horas Riego</label>
            <input type="number" step="0.5" value={horasRiego} onChange={(e) => setHorasRiego(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Caudal (m³/h)</label>
            <input type="number" step="0.5" value={caudalM3Hora} onChange={(e) => setCaudalM3Hora(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Lámina (mm)</label>
            <input type="number" step="0.1" value={laminaMm} onChange={(e) => setLaminaMm(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Presión (bar)</label>
            <input type="number" step="0.1" value={presionBar} onChange={(e) => setPresionBar(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>pH Solución</label>
            <input type="number" step="0.1" value={phAgua} onChange={(e) => setPhAgua(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>CE (dS/m)</label>
            <input type="number" step="0.05" value={conductividadDsM} onChange={(e) => setConductividadDsM(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tensiómetro (cbar)</label>
            <input type="number" value={humedadSueloCbar} onChange={(e) => setHumedadSueloCbar(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Sector / Válvula</label>
            <input type="text" value={sectorValvula} onChange={(e) => setSectorValvula(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Operador</label>
            <input type="text" required value={operador} onChange={(e) => setOperador(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones</label>
          <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            Guardar Riego
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 4. PLAGA MODAL */
export const PlagaModal: React.FC<{
  initial?: MonitoreoPlaga | null;
  cuarteles: Cuartel[];
  onClose: () => void;
  onSave: (data: Omit<MonitoreoPlaga, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, onClose, onSave }) => {
  const activeCenter = getActiveAgricolaInfo().defaultCenter;
  const firstC = cuarteles[0];
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? firstC?.id ?? '');
  const [cultivo, setCultivo] = useState(initial?.cultivo ?? firstC?.cultivo ?? 'Arándanos');
  const [plagaOEnfermedad, setPlagaOEnfermedad] = useState(initial?.plagaOEnfermedad ?? '');
  const [estadoFenologico, setEstadoFenologico] = useState(
    initial?.estadoFenologico ?? 'Fruto en desarrollo / Pinta'
  );
  const [nivel, setNivel] = useState<NivelIncidenciaPlaga>(initial?.nivel ?? 'Bajo / Monitoreo');
  const [conteoTrampa, setConteoTrampa] = useState(
    initial?.conteoTrampa !== undefined ? String(initial.conteoTrampa) : ''
  );
  const [porcentajeIncidencia, setPorcentajeIncidencia] = useState(
    String(initial?.porcentajeIncidencia ?? 2.5)
  );
  const [lat, setLat] = useState(
    String(initial?.position.lat ?? firstC?.center.lat ?? activeCenter.lat)
  );
  const [lng, setLng] = useState(
    String(initial?.position.lng ?? firstC?.center.lng ?? activeCenter.lng)
  );
  const [inspector, setInspector] = useState(initial?.inspector ?? '');
  const [recomendacion, setRecomendacion] = useState(initial?.recomendacion ?? '');

  const handleCuartelChange = (id: string) => {
    setCuartelId(id);
    const found = cuarteles.find((c) => c.id === id);
    if (found) {
      setCultivo(found.cultivo);
      if (!initial) {
        setLat(String(found.center.lat));
        setLng(String(found.center.lng));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!plagaOEnfermedad.trim()) return;
    onSave(
      {
        fecha,
        cuartelId,
        cultivo,
        plagaOEnfermedad: plagaOEnfermedad.trim(),
        estadoFenologico: estadoFenologico.trim(),
        nivel,
        conteoTrampa: conteoTrampa ? Number(conteoTrampa) : undefined,
        porcentajeIncidencia: Number(porcentajeIncidencia) || 0,
        position: {
          lat: Number(lat) || activeCenter.lat,
          lng: Number(lng) || activeCenter.lng,
        },
        inspector: inspector.trim(),
        recomendacion: recomendacion.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Monitoreo de Plagas' : 'Registrar Monitoreo Georreferenciado de Plagas'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha Inspección</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Cuartel</label>
            <select value={cuartelId} onChange={(e) => handleCuartelChange(e.target.value)} className={inputCls}>
              {cuarteles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codigo} · {c.nombre} ({c.cultivo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Plaga o Enfermedad Detectada</label>
            <input
              type="text"
              required
              value={plagaOEnfermedad}
              onChange={(e) => setPlagaOEnfermedad(e.target.value)}
              placeholder="Ej: Drosophila suzukii / Botrytis cinerea"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estado Fenológico</label>
            <input type="text" value={estadoFenologico} onChange={(e) => setEstadoFenologico(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Nivel de Incidencia</label>
            <select value={nivel} onChange={(e) => setNivel(e.target.value as NivelIncidenciaPlaga)} className={inputCls}>
              <option value="Bajo / Monitoreo">Bajo / Monitoreo</option>
              <option value="Umbral Alerta">Umbral Alerta</option>
              <option value="Crítico">Crítico</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Incidencia (%)</label>
            <input type="number" step="0.1" min="0" value={porcentajeIncidencia} onChange={(e) => setPorcentajeIncidencia(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Conteo Trampa (opc.)</label>
            <input type="number" min="0" value={conteoTrampa} onChange={(e) => setConteoTrampa(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Latitud GPS</label>
            <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Longitud GPS</label>
            <input type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Inspector</label>
            <input type="text" required value={inspector} onChange={(e) => setInspector(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Recomendación Agronómica</label>
          <textarea rows={2} value={recomendacion} onChange={(e) => setRecomendacion(e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            Guardar Monitoreo
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 5. CLIMA MANUAL MODAL */
export const ClimaManualModal: React.FC<{
  initial?: RegistroClimaManual | null;
  coords: { lat: number; lng: number; name: string };
  onClose: () => void;
  onSave: (data: Omit<RegistroClimaManual, 'id'>, id?: string) => void;
}> = ({ initial, coords, onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [hora, setHora] = useState(initial?.hora ?? '07:30');
  const [ubicacionNombre, setUbicacionNombre] = useState(initial?.ubicacionNombre ?? coords.name);
  const [lat, setLat] = useState(String(initial?.lat ?? coords.lat));
  const [lng, setLng] = useState(String(initial?.lng ?? coords.lng));
  const [tempC, setTempC] = useState(String(initial?.tempC ?? 12.5));
  const [tempMinC, setTempMinC] = useState(String(initial?.tempMinC ?? 4.2));
  const [tempMaxC, setTempMaxC] = useState(String(initial?.tempMaxC ?? 19.8));
  const [humedadPct, setHumedadPct] = useState(String(initial?.humedadPct ?? 72));
  const [vientoKmH, setVientoKmH] = useState(String(initial?.vientoKmH ?? 5.0));
  const [lluviaMm, setLluviaMm] = useState(String(initial?.lluviaMm ?? 0));
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      {
        fecha,
        hora,
        ubicacionNombre: ubicacionNombre.trim() || coords.name,
        lat: Number(lat) || coords.lat,
        lng: Number(lng) || coords.lng,
        tempC: Number(tempC) || 0,
        tempMinC: Number(tempMinC) || 0,
        tempMaxC: Number(tempMaxC) || 0,
        humedadPct: Number(humedadPct) || 0,
        vientoKmH: Number(vientoKmH) || 0,
        lluviaMm: Number(lluviaMm) || 0,
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Registro Climático' : 'Registro Estación Climática Predial'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <label className={labelCls}>Estación / Sector</label>
            <input
              type="text"
              value={ubicacionNombre}
              onChange={(e) => setUbicacionNombre(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Latitud GPS</label>
            <input
              type="number"
              step="0.000001"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Longitud GPS</label>
            <input
              type="number"
              step="0.000001"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hora</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>T° Actual (°C)</label>
            <input type="number" step="0.1" value={tempC} onChange={(e) => setTempC(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>T° Mínima (°C)</label>
            <input type="number" step="0.1" value={tempMinC} onChange={(e) => setTempMinC(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>T° Máxima (°C)</label>
            <input type="number" step="0.1" value={tempMaxC} onChange={(e) => setTempMaxC(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Humedad (%)</label>
            <input type="number" value={humedadPct} onChange={(e) => setHumedadPct(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Viento (km/h)</label>
            <input type="number" step="0.5" value={vientoKmH} onChange={(e) => setVientoKmH(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Lluvia (mm)</label>
            <input type="number" step="0.1" value={lluviaMm} onChange={(e) => setLluviaMm(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones</label>
          <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            Guardar Registro Climático
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 6. CULTIVO MODAL (Crear o Editar cultivo con propagación de nombre) */
export const CultivoModal: React.FC<{
  initial?: CultivoConfig | null;
  onClose: () => void;
  onSave: (data: Omit<CultivoConfig, 'id'>, id?: string) => void;
}> = ({ initial, onClose, onSave }) => {
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [nombreCientifico, setNombreCientifico] = useState(initial?.nombreCientifico ?? '');
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? '#16A34A');
  const [phOptimo, setPhOptimo] = useState(initial?.phOptimo ?? '5.5 – 6.2');
  const [unidadCosecha, setUnidadCosecha] = useState(initial?.unidadCosecha ?? 'kg');
  const [activo, setActivo] = useState(initial?.activo ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    onSave(
      {
        nombre: nombre.trim(),
        nombreCientifico: nombreCientifico.trim() || 'Especie cultivada',
        colorHex,
        phOptimo: phOptimo.trim(),
        unidadCosecha: unidadCosecha.trim() || 'kg',
        activo,
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? `Editar Cultivo: ${initial.nombre}` : 'Agregar Nuevo Cultivo al Predio'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {initial
            ? 'Al modificar el nombre o color de este cultivo, se actualizarán automáticamente todos los cuarteles, bodega, órdenes, cosechas y mapas vinculados.'
            : 'Al agregar un nuevo cultivo (ej: Frambuesa, Murta, Avellano Europeo, Cerezo), quedará disponible automáticamente en Cuarteles, Bodega, Maquinaria, Mapa Satelital y Control Individual de Cosecha.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Nombre del Cultivo</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Murta / Frambuesa"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nombre Científico</label>
            <input
              type="text"
              value={nombreCientifico}
              onChange={(e) => setNombreCientifico(e.target.value)}
              placeholder="Ej: Ugni molinae"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Color en Mapa</label>
            <input
              type="color"
              value={colorHex}
              onChange={(e) => setColorHex(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 cursor-pointer"
            />
          </div>
          <div>
            <label className={labelCls}>pH Suelo Óptimo</label>
            <input type="text" value={phOptimo} onChange={(e) => setPhOptimo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Unidad Cosecha</label>
            <input type="text" value={unidadCosecha} onChange={(e) => setUnidadCosecha(e.target.value)} className={inputCls} />
          </div>
        </div>

        {initial && (
          <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
            />
            <span>Cultivo activo en el catálogo productivo</span>
          </label>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            {initial ? 'Guardar Cambios' : 'Crear Cultivo'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 7. MAQUINA EQUIPO MODAL */
export const MaquinaModal: React.FC<{
  initial?: MaquinaEquipo | null;
  cultivos: CultivoConfig[];
  onClose: () => void;
  onSave: (data: Omit<MaquinaEquipo, 'id'>, id?: string) => void;
}> = ({ initial, cultivos, onClose, onSave }) => {
  const [codigo, setCodigo] = useState(initial?.codigo ?? '');
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [tipo, setTipo] = useState(initial?.tipo ?? 'Tractor Frutero');
  const [marcaModelo, setMarcaModelo] = useState(initial?.marcaModelo ?? '');
  const [patenteOSerie, setPatenteOSerie] = useState(initial?.patenteOSerie ?? '');
  const [cultivosCompatibles, setCultivosCompatibles] = useState<string[]>(
    initial?.cultivosCompatibles ?? ['Todos']
  );
  const [horometroActual, setHorometroActual] = useState(String(initial?.horometroActual ?? 0));
  const [proximaMantencionHrs, setProximaMantencionHrs] = useState(
    String(initial?.proximaMantencionHrs ?? 250)
  );
  const [estado, setEstado] = useState<EstadoMaquinaria>(initial?.estado ?? 'Operativa');
  const [notas, setNotas] = useState(initial?.notas ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) return;
    onSave(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        tipo: tipo.trim(),
        marcaModelo: marcaModelo.trim(),
        patenteOSerie: patenteOSerie.trim(),
        cultivosCompatibles,
        horometroActual: Number(horometroActual) || 0,
        proximaMantencionHrs: Number(proximaMantencionHrs) || 0,
        estado,
        notas: notas.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell title={initial ? 'Editar Maquinaria / Equipo' : 'Alta de Maquinaria o Implemento'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Código</label>
            <input type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="MAQ-05" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre del Equipo</label>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Nebulizador Jacto Arbus 1000" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Tipo</label>
            <input type="text" value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Marca / Modelo</label>
            <input type="text" value={marcaModelo} onChange={(e) => setMarcaModelo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Patente / Serie</label>
            <input type="text" value={patenteOSerie} onChange={(e) => setPatenteOSerie(e.target.value)} className={inputCls} />
          </div>
        </div>

        <CropMultiSelect
          cultivos={cultivos}
          selected={cultivosCompatibles}
          onChange={setCultivosCompatibles}
          label="Cultivos para los que aplica esta máquina"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Horómetro Actual (h)</label>
            <input type="number" step="0.5" value={horometroActual} onChange={(e) => setHorometroActual(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Próx. Mantención (h)</label>
            <input type="number" step="10" value={proximaMantencionHrs} onChange={(e) => setProximaMantencionHrs(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoMaquinaria)} className={inputCls}>
              <option value="Operativa">Operativa</option>
              <option value="En Mantención">En Mantención</option>
              <option value="Fuera de Servicio">Fuera de Servicio</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas Técnicas</label>
          <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            Guardar Equipo
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 8. SECTOR DE RIEGO MODAL */
export const SectorRiegoModal: React.FC<{
  initial?: SectorRiego | null;
  cuarteles: Cuartel[];
  onClose: () => void;
  onSave: (data: Omit<SectorRiego, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, onClose, onSave }) => {
  const [codigo, setCodigo] = useState(initial?.codigo ?? 'SR-01');
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [cuartelIds, setCuartelIds] = useState<string[]>(
    initial?.cuartelIds ?? (cuarteles[0] ? [cuarteles[0].id] : [])
  );
  const [fuenteAgua, setFuenteAgua] = useState(
    initial?.fuenteAgua ?? 'Pozo Profundo DGA N°1'
  );
  const [tipoEmisores, setTipoEmisores] = useState(
    initial?.tipoEmisores ?? 'Doble línea goteo 1.6 L/h a 0.5 m'
  );
  const [caudalNominalM3h, setCaudalNominalM3h] = useState(
    String(initial?.caudalNominalM3h ?? 16)
  );
  const [presionBar, setPresionBar] = useState(String(initial?.presionBar ?? 2.2));
  const [injectorFertirriego, setInjectorFertirriego] = useState(
    initial?.injectorFertirriego ?? 'Venturi 2" + Estanque 1.000 L'
  );
  const [estado, setEstado] = useState<EstadoSectorRiego>(initial?.estado ?? 'Operativo');
  const [notas, setNotas] = useState(initial?.notas ?? '');

  const toggleCuartel = (id: string) => {
    setCuartelIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) return;
    onSave(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        cuartelIds,
        fuenteAgua: fuenteAgua.trim(),
        tipoEmisores: tipoEmisores.trim(),
        caudalNominalM3h: Number(caudalNominalM3h) || 0,
        presionBar: Number(presionBar) || 0,
        injectorFertirriego: injectorFertirriego.trim(),
        estado,
        notas: notas.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? `Editar Sector de Riego: ${initial.codigo}` : 'Nuevo Sector / Válvula de Riego'}
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Código Sector</label>
            <input
              type="text"
              required
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="SR-05"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nombre Sector / Válvula</label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Válvula Arándanos Poniente"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as EstadoSectorRiego)}
              className={inputCls}
            >
              <option value="Operativo">Operativo</option>
              <option value="Mantención">Mantención</option>
              <option value="Inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Cuarteles Abastecidos</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fuente de Agua (Pozo / Estero)</label>
            <input
              type="text"
              value={fuenteAgua}
              onChange={(e) => setFuenteAgua(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Tipo de Emisores / Diseño</label>
            <input
              type="text"
              value={tipoEmisores}
              onChange={(e) => setTipoEmisores(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Caudal Nominal (m³/h)</label>
            <input
              type="number"
              step="0.5"
              value={caudalNominalM3h}
              onChange={(e) => setCaudalNominalM3h(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Presión Trabajo (bar)</label>
            <input
              type="number"
              step="0.1"
              value={presionBar}
              onChange={(e) => setPresionBar(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Inyector / Fertirriego</label>
            <input
              type="text"
              value={injectorFertirriego}
              onChange={(e) => setInjectorFertirriego(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Notas Hidráulicas</label>
          <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            {initial ? 'Guardar Cambios' : 'Crear Sector de Riego'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 9. MOVIMIENTO KARDEX MODAL (Editar movimiento existente recalculando stock) */
export const MovimientoKardexModal: React.FC<{
  initial: MovimientoBodega;
  bodega: BodegaItem[];
  onClose: () => void;
  onSave: (data: Omit<MovimientoBodega, 'id'>, id: string) => void;
}> = ({ initial, bodega, onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial.fecha);
  const [itemId, setItemId] = useState(initial.itemId);
  const [tipo, setTipo] = useState<'Ingreso' | 'Egreso'>(initial.tipo);
  const [cantidad, setCantidad] = useState(String(initial.cantidad));
  const [referencia, setReferencia] = useState(initial.referencia);
  const [responsable, setResponsable] = useState(initial.responsable);
  const [observaciones, setObservaciones] = useState(initial.observaciones);

  const selectedItem = bodega.find((b) => b.id === itemId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cant = Number(cantidad);
    if (!cant || cant <= 0) return;
    onSave(
      {
        fecha,
        itemId,
        tipo,
        cantidad: cant,
        referencia: referencia.trim(),
        responsable: responsable.trim(),
        observaciones: observaciones.trim(),
      },
      initial.id
    );
  };

  return (
    <ModalShell title="Editar Movimiento de Kardex (Sincroniza Stock)" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo de Movimiento</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'Ingreso' | 'Egreso')}
              className={inputCls}
            >
              <option value="Ingreso">Ingreso (+)</option>
              <option value="Egreso">Egreso (-)</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Producto / Insumo en Bodega</label>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={inputCls}>
            {bodega.map((b) => (
              <option key={b.id} value={b.id}>
                {b.codigo} · {b.nombre} (Stock: {b.stockActual} {b.unidad})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Cantidad ({selectedItem?.unidad ?? 'unid'})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Referencia</label>
            <input
              type="text"
              required
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Responsable</label>
          <input
            type="text"
            required
            value={responsable}
            onChange={(e) => setResponsable(e.target.value)}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Observaciones</label>
          <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputCls} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white">
            Guardar Movimiento
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
