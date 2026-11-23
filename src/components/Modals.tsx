import React, { useMemo, useState } from 'react';
import { Upload, Download, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import {
  AplicacionFitosanitaria,
  CategoriaAplicacion,
  CuadernoState,
  Cuartel,
  CultivoConfig,
  DestinoCosecha,
  EstadoCuartel,
  EstadoLabor,
  LaborAgricola,
  LatLngPoint,
  MaquinaEquipo,
  PersonalHabilitadoItem,
  RegistroCosecha,
  RegistroMaquinaria,
  TipoLabor,
  TipoRegistroMaquinaria,
} from '../types/fieldbook';
import { getActiveAgricolaInfo } from '../data/initialData';
import { formatDateCL, getTodayISO } from '../utils/formatters';
import { evaluateCarnetStatus } from '../utils/rbac';
import { getCuartelCarenciasForDate } from '../utils/alertsEngine';
import {
  CropMultiSelect,
  ModalShell,
  inputCls,
  labelCls,
} from './OperationsModals';

export {
  BodegaItemModal,
  OrdenAplicacionModal,
  RiegoModal,
  SectorRiegoModal,
  MovimientoKardexModal,
  PlagaModal,
  ClimaManualModal,
  CultivoModal,
  MaquinaModal,
} from './OperationsModals';

/* 1. LABOR MODAL */
export const LaborModal: React.FC<{
  initial?: LaborAgricola | null;
  cuarteles: Cuartel[];
  maquinas: MaquinaEquipo[];
  personalHabilitado?: PersonalHabilitadoItem[];
  onClose: () => void;
  onSave: (data: Omit<LaborAgricola, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, maquinas, personalHabilitado = [], onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? cuarteles[0]?.id ?? '');
  const [tipo, setTipo] = useState<TipoLabor>(initial?.tipo ?? 'Riego y Fertirriego');
  const [descripcion, setDescripcion] = useState(initial?.descripcion ?? '');
  const [responsable, setResponsable] = useState(initial?.responsable ?? '');
  const [maquinaria, setMaquinaria] = useState(initial?.maquinaria ?? '');
  const [horasTrabajo, setHorasTrabajo] = useState(String(initial?.horasTrabajo ?? 4));
  const [costoCLP, setCostoCLP] = useState(String(initial?.costoCLP ?? 0));
  const [estado, setEstado] = useState<EstadoLabor>(initial?.estado ?? 'Completada');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descripcion.trim() || !responsable.trim()) return;
    onSave(
      {
        fecha,
        cuartelId,
        tipo,
        descripcion: descripcion.trim(),
        responsable: responsable.trim(),
        maquinaria: maquinaria.trim(),
        horasTrabajo: Number(horasTrabajo) || 0,
        costoCLP: Number(costoCLP) || 0,
        estado,
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell title={initial ? 'Editar Labor de Campo' : 'Registrar Labor de Campo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Tipo de Labor</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoLabor)} className={inputCls}>
              {[
                'Riego y Fertirriego',
                'Poda',
                'Fertilización Base',
                'Fitosanitario',
                'Control Malezas',
                'Polinización',
                'Control Heladas',
                'Cosecha',
                'Mantención Camellones',
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoLabor)} className={inputCls}>
              <option value="Completada">Completada</option>
              <option value="En Curso">En Curso</option>
              <option value="Programada">Programada</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Descripción de la Labor</label>
          <input
            type="text"
            required
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Pulso de fertirriego con sulfato de amonio"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Responsable / Cuadrilla</label>
            <input
              type="text"
              required
              list="labor-personal-list"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              placeholder="Ej: Nombre del responsable o cuadrilla"
              className={inputCls}
            />
            <datalist id="labor-personal-list">
              {personalHabilitado.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.cargo}
                </option>
              ))}
            </datalist>
          </div>
          <div>
            <label className={labelCls}>Maquinaria / Equipo</label>
            <input
              type="text"
              list="maquinas-list"
              value={maquinaria}
              onChange={(e) => setMaquinaria(e.target.value)}
              placeholder="Ej: Kubota M7040 o Manual"
              className={inputCls}
            />
            <datalist id="maquinas-list">
              <option value="Manual" />
              {maquinas.map((m) => (
                <option key={m.id} value={m.nombre} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Horas Trabajadas</label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={horasTrabajo}
              onChange={(e) => setHorasTrabajo(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Costo Estimado (CLP)</label>
            <input
              type="number"
              step="1000"
              min="0"
              value={costoCLP}
              onChange={(e) => setCostoCLP(e.target.value)}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones de Campo</label>
          <textarea
            rows={2}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Lectura de pH, CE, avance por hilera o notas técnicas..."
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            Guardar
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 2. APLICACION MODAL */
export const AplicacionModal: React.FC<{
  initial?: AplicacionFitosanitaria | null;
  cuarteles: Cuartel[];
  personalHabilitado?: PersonalHabilitadoItem[];
  onClose: () => void;
  onSave: (data: Omit<AplicacionFitosanitaria, 'id'>, id?: string) => void;
}> = ({ initial, cuarteles, personalHabilitado = [], onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuartelId, setCuartelId] = useState(initial?.cuartelId ?? cuarteles[0]?.id ?? '');
  const [categoria, setCategoria] = useState<CategoriaAplicacion>(initial?.categoria ?? 'Fungicida');
  const [productoComercial, setProductoComercial] = useState(initial?.productoComercial ?? '');
  const [ingredienteActivo, setIngredienteActivo] = useState(initial?.ingredienteActivo ?? '');
  const [objetivo, setObjetivo] = useState(initial?.objetivo ?? '');
  const [dosisPorHa, setDosisPorHa] = useState(initial?.dosisPorHa ?? '');
  const [mojamientoLtsHa, setMojamientoLtsHa] = useState(String(initial?.mojamientoLtsHa ?? 1000));
  const [carenciaDias, setCarenciaDias] = useState(String(initial?.carenciaDias ?? 7));
  const [reingresoHoras, setReingresoHoras] = useState(String(initial?.reingresoHoras ?? 12));
  const [aplicador, setAplicador] = useState(initial?.aplicador ?? '');
  const [tractorista, setTractorista] = useState('');
  const [condicionesClima, setCondicionesClima] = useState(initial?.condicionesClima ?? '');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');

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
        (p) => p.activo && (p.requiereCarnetTractorista || p.rol === 'Tractorista')
      ),
    [personalHabilitado]
  );

  const matchedAplicador = useMemo(
    () => personalHabilitado.find((p) => p.nombre.toLowerCase() === aplicador.trim().toLowerCase()),
    [personalHabilitado, aplicador]
  );
  const matchedTractorista = useMemo(
    () => personalHabilitado.find((p) => p.nombre.toLowerCase() === tractorista.trim().toLowerCase()),
    [personalHabilitado, tractorista]
  );

  const aplicadorEval = useMemo(
    () =>
      matchedAplicador
        ? evaluateCarnetStatus(
            matchedAplicador.requiereCarnetAplicador,
            matchedAplicador.carnetAplicadorNumero,
            matchedAplicador.carnetAplicadorVencimiento
          )
        : null,
    [matchedAplicador]
  );

  const tractoristaEval = useMemo(
    () =>
      matchedTractorista
        ? evaluateCarnetStatus(
            matchedTractorista.requiereCarnetTractorista,
            matchedTractorista.carnetTractoristaNumero,
            matchedTractorista.carnetTractoristaVencimiento
          )
        : null,
    [matchedTractorista]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoComercial.trim() || !ingredienteActivo.trim()) return;
    const carnetApRef = matchedAplicador?.carnetAplicadorNumero
      ? `${matchedAplicador.carnetAplicadorNumero}${
          matchedAplicador.carnetAplicadorVencimiento
            ? ` (Vence ${matchedAplicador.carnetAplicadorVencimiento})`
            : ''
        }`
      : initial?.carnetAplicadorRef;
    const carnetTracRef = matchedTractorista?.carnetTractoristaNumero
      ? `${matchedTractorista.nombre} · Lic. ${matchedTractorista.carnetTractoristaNumero}${
          matchedTractorista.carnetTractoristaVencimiento
            ? ` (Vence ${matchedTractorista.carnetTractoristaVencimiento})`
            : ''
        }`
      : tractorista.trim()
      ? tractorista.trim()
      : initial?.carnetTractoristaRef;

    onSave(
      {
        fecha,
        cuartelId,
        categoria,
        productoComercial: productoComercial.trim(),
        ingredienteActivo: ingredienteActivo.trim(),
        objetivo: objetivo.trim(),
        dosisPorHa: dosisPorHa.trim(),
        mojamientoLtsHa: Number(mojamientoLtsHa) || 0,
        carenciaDias: Number(carenciaDias) || 0,
        reingresoHoras: Number(reingresoHoras) || 0,
        aplicador: aplicador.trim(),
        carnetAplicadorRef: carnetApRef,
        carnetTractoristaRef: carnetTracRef,
        condicionesClima: condicionesClima.trim(),
        ordenAplicacionRef: initial?.ordenAplicacionRef,
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Aplicación Fitosanitaria' : 'Registrar Aplicación Fitosanitaria'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Fecha Aplicación</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
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
          <div>
            <label className={labelCls}>Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaAplicacion)}
              className={inputCls}
            >
              {['Fungicida', 'Insecticida', 'Herbicida', 'Fertilizante Foliar', 'Bioestimulante'].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Producto Comercial</label>
            <input
              type="text"
              required
              value={productoComercial}
              onChange={(e) => setProductoComercial(e.target.value)}
              placeholder="Ej: Switch 62.5 WG"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Ingrediente Activo</label>
            <input
              type="text"
              required
              value={ingredienteActivo}
              onChange={(e) => setIngredienteActivo(e.target.value)}
              placeholder="Ej: Cyprodinil + Fludioxonil"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Plaga / Enfermedad Objetivo</label>
            <input
              type="text"
              required
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              placeholder="Ej: Botrytis cinerea"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Dosis por Hectárea</label>
            <input
              type="text"
              required
              value={dosisPorHa}
              onChange={(e) => setDosisPorHa(e.target.value)}
              placeholder="Ej: 0.8 kg/ha"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Mojamiento (L/ha)</label>
            <input type="number" min="0" value={mojamientoLtsHa} onChange={(e) => setMojamientoLtsHa(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Carencia (Días)</label>
            <input type="number" min="0" value={carenciaDias} onChange={(e) => setCarenciaDias(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Reingreso (Horas)</label>
            <input type="number" min="0" value={reingresoHoras} onChange={(e) => setReingresoHoras(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Aplicador (Carnet SAG)</label>
            <input
              type="text"
              required
              list="ap-aplicadores-list"
              value={aplicador}
              onChange={(e) => setAplicador(e.target.value)}
              placeholder="Ej: Nombre del aplicador"
              className={inputCls}
            />
            <datalist id="ap-aplicadores-list">
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
            {matchedAplicador && aplicadorEval && (
              <p
                className={`mt-1 text-[11px] flex items-center gap-1 ${
                  aplicadorEval.estado === 'vigente'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {aplicadorEval.estado === 'vigente' ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {matchedAplicador.carnetAplicadorNumero
                    ? `Carnet SAG ${matchedAplicador.carnetAplicadorNumero} · ${aplicadorEval.label}`
                    : 'Sin Carnet de Aplicador SAG'}
                </span>
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>Tractorista (Clase D, opc.)</label>
            <input
              type="text"
              list="ap-tractoristas-list"
              value={tractorista}
              onChange={(e) => setTractorista(e.target.value)}
              placeholder="Solo si opera tractor/nebulizador"
              className={inputCls}
            />
            <datalist id="ap-tractoristas-list">
              {tractoristasList.map((p) => (
                <option key={p.id} value={p.nombre}>
                  {p.carnetTractoristaNumero ? `Clase D ${p.carnetTractoristaNumero}` : p.cargo}
                </option>
              ))}
            </datalist>
            {matchedTractorista && tractoristaEval && (
              <p
                className={`mt-1 text-[11px] flex items-center gap-1 ${
                  tractoristaEval.estado === 'vigente'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {tractoristaEval.estado === 'vigente' ? (
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {matchedTractorista.carnetTractoristaNumero
                    ? `Clase D ${matchedTractorista.carnetTractoristaNumero} · ${tractoristaEval.label}`
                    : 'Sin Carnet de Tractorista Clase D'}
                </span>
              </p>
            )}
          </div>
        </div>

        <div>
          <label className={labelCls}>Condiciones Climáticas</label>
          <input
            type="text"
            value={condicionesClima}
            onChange={(e) => setCondicionesClima(e.target.value)}
            placeholder="Ej: 15°C · HR 70% · Viento 3 km/h"
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Observaciones</label>
          <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputCls} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white">
            Guardar
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 3. COSECHA MODAL */
export const CosechaModal: React.FC<{
  initial?: RegistroCosecha | null;
  defaultCultivo?: string;
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  aplicaciones?: AplicacionFitosanitaria[];
  onClose: () => void;
  onSave: (data: Omit<RegistroCosecha, 'id'>, id?: string) => void;
}> = ({ initial, defaultCultivo, cuarteles, cultivos, aplicaciones = [], onClose, onSave }) => {
  const matchingCuartel = defaultCultivo
    ? cuarteles.find((c) => c.cultivo === defaultCultivo)
    : undefined;
  const defaultCuartel =
    cuarteles.find((c) => c.id === initial?.cuartelId) ?? matchingCuartel ?? cuarteles[0];

  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [cuartelId, setCuartelId] = useState(defaultCuartel?.id ?? '');
  const [cultivo, setCultivo] = useState<string>(
    initial?.cultivo ?? defaultCultivo ?? defaultCuartel?.cultivo ?? cultivos[0]?.nombre ?? 'Arándanos'
  );
  const [kilosBrutos, setKilosBrutos] = useState(String(initial?.kilosBrutos ?? 1000));
  const [kilosDescarte, setKilosDescarte] = useState(String(initial?.kilosDescarte ?? 40));
  const [brix, setBrix] = useState(String(initial?.brix ?? 12.5));
  const [destino, setDestino] = useState<DestinoCosecha>(initial?.destino ?? 'Fresco Exportación');
  const [cosecheros, setCosecheros] = useState(String(initial?.cosecheros ?? 12));
  const [guiaDespacho, setGuiaDespacho] = useState(initial?.guiaDespacho ?? '');
  const [observaciones, setObservaciones] = useState(initial?.observaciones ?? '');
  const [carenciaConfirmada, setCarenciaConfirmada] = useState(false);

  const carenciasActivasCuartel = useMemo(
    () => getCuartelCarenciasForDate(cuartelId, fecha, aplicaciones),
    [cuartelId, fecha, aplicaciones]
  );

  const handleCuartelChange = (newId: string) => {
    setCuartelId(newId);
    setCarenciaConfirmada(false);
    const found = cuarteles.find((c) => c.id === newId);
    if (found) setCultivo(found.cultivo);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (carenciasActivasCuartel.length > 0 && !carenciaConfirmada) {
      return;
    }
    onSave(
      {
        fecha,
        cuartelId,
        cultivo,
        kilosBrutos: Number(kilosBrutos) || 0,
        kilosDescarte: Number(kilosDescarte) || 0,
        brix: Number(brix) || 0,
        destino,
        cosecheros: Number(cosecheros) || 0,
        guiaDespacho: guiaDespacho.trim(),
        observaciones: observaciones.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell title={initial ? 'Editar Registro de Cosecha' : 'Registrar Cosecha por Cultivo'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {carenciasActivasCuartel.length > 0 && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 space-y-2 text-xs text-rose-900 dark:text-rose-200">
            <div className="flex items-start gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>
                Bloqueo Preventivo: Cuartel con Carencia Fitosanitaria Activa para el {formatDateCL(fecha)}
              </span>
            </div>
            <ul className="pl-6 list-disc space-y-0.5 text-[11px] text-rose-800 dark:text-rose-300">
              {carenciasActivasCuartel.map((c) => (
                <li key={c.aplicacion.id}>
                  <strong>{c.aplicacion.productoComercial}</strong> ({c.aplicacion.ingredienteActivo}) · Faltan{' '}
                  <span className="font-mono font-bold">{c.diasRestantes} día(s)</span> — Libera el{' '}
                  <span className="font-mono font-semibold">{formatDateCL(c.fechaLiberacion)}</span>
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 pt-1 cursor-pointer text-[11px] font-medium">
              <input
                type="checkbox"
                checked={carenciaConfirmada}
                onChange={(e) => setCarenciaConfirmada(e.target.checked)}
                className="mt-0.5 rounded border-rose-400 text-rose-700"
              />
              <span>
                Confirmo registrar esta cosecha excepcionalmente bajo autorización técnica pese a carencia vigente.
              </span>
            </label>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fecha</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cultivo</label>
            <select value={cultivo} onChange={(e) => setCultivo(e.target.value)} className={inputCls}>
              {cultivos.map((cul) => (
                <option key={cul.id} value={cul.nombre}>
                  {cul.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Destino Comercial</label>
            <select value={destino} onChange={(e) => setDestino(e.target.value as DestinoCosecha)} className={inputCls}>
              <option value="Fresco Exportación">Fresco Exportación</option>
              <option value="IQF Congelado">IQF Congelado</option>
              <option value="Liofilizado / Polvo">Liofilizado / Polvo</option>
              <option value="Agroindustria / Jugos">Agroindustria / Jugos</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Kilos Brutos</label>
            <input type="number" min="0" required value={kilosBrutos} onChange={(e) => setKilosBrutos(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Kilos Descarte</label>
            <input type="number" min="0" value={kilosDescarte} onChange={(e) => setKilosDescarte(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>°Brix</label>
            <input type="number" step="0.1" min="0" value={brix} onChange={(e) => setBrix(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>N° Cosecheros</label>
            <input type="number" min="1" value={cosecheros} onChange={(e) => setCosecheros(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Guía de Despacho</label>
            <input type="text" value={guiaDespacho} onChange={(e) => setGuiaDespacho(e.target.value)} placeholder="Ej: GD-2026-0415" className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Observaciones de Calidad / Packing</label>
          <textarea rows={2} value={observaciones} onChange={(e) => setObservaciones(e.target.value)} className={inputCls} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={carenciasActivasCuartel.length > 0 && !carenciaConfirmada}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white"
          >
            Guardar
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 4. CUARTEL MODAL (con soporte Polígono y GPS desde Mapa) */
export const CuartelModal: React.FC<{
  initial?: Cuartel | null;
  cultivos: CultivoConfig[];
  presetPolygon?: { polygon: LatLngPoint[]; areaHa: number; center: LatLngPoint } | null;
  presetCenter?: LatLngPoint | null;
  onClose: () => void;
  onSave: (data: Omit<Cuartel, 'id'>, id?: string) => void;
}> = ({ initial, cultivos, presetPolygon, presetCenter, onClose, onSave }) => {
  const activeCenter = getActiveAgricolaInfo().defaultCenter;
  const defaultCenter =
    initial?.center ?? presetPolygon?.center ?? presetCenter ?? activeCenter;

  const [codigo, setCodigo] = useState(initial?.codigo ?? '');
  const [nombre, setNombre] = useState(initial?.nombre ?? '');
  const [cultivo, setCultivo] = useState<string>(
    initial?.cultivo ?? cultivos[0]?.nombre ?? 'Arándanos'
  );
  const [variedad, setVariedad] = useState(initial?.variedad ?? '');
  const [superficieHa, setSuperficieHa] = useState(
    String(initial?.superficieHa ?? (presetPolygon?.areaHa || 4.0))
  );
  const [plantasPorHa, setPlantasPorHa] = useState(String(initial?.plantasPorHa ?? 2500));
  const [anioPlantacion, setAnioPlantacion] = useState(String(initial?.anioPlantacion ?? 2021));
  const [sistemaRiego, setSistemaRiego] = useState(initial?.sistemaRiego ?? 'Goteo tecnificado');
  const [sueloPh, setSueloPh] = useState(initial?.sueloPh ?? 'Trumao · pH 5.3');
  const [estado, setEstado] = useState<EstadoCuartel>(initial?.estado ?? 'Producción');
  const [lat, setLat] = useState(String(defaultCenter.lat));
  const [lng, setLng] = useState(String(defaultCenter.lng));
  const [notas, setNotas] = useState(initial?.notas ?? '');

  const activePolygon: LatLngPoint[] =
    initial?.polygon && initial.polygon.length >= 3
      ? initial.polygon
      : presetPolygon?.polygon ?? [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo.trim() || !nombre.trim()) return;
    const centerPoint = {
      lat: Number(lat) || activeCenter.lat,
      lng: Number(lng) || activeCenter.lng,
    };

    // If no polygon was traced, build a clean approximate parcel rectangle matching ha
    let finalPolygon = activePolygon;
    if (finalPolygon.length < 3) {
      const sideM = Math.sqrt((Number(superficieHa) || 2) * 10000);
      const dLat = (sideM / 2) / 111320;
      const dLng = (sideM / 2) / (111320 * Math.cos((centerPoint.lat * Math.PI) / 180));
      finalPolygon = [
        { lat: Number((centerPoint.lat + dLat).toFixed(6)), lng: Number((centerPoint.lng - dLng).toFixed(6)) },
        { lat: Number((centerPoint.lat + dLat).toFixed(6)), lng: Number((centerPoint.lng + dLng).toFixed(6)) },
        { lat: Number((centerPoint.lat - dLat).toFixed(6)), lng: Number((centerPoint.lng + dLng).toFixed(6)) },
        { lat: Number((centerPoint.lat - dLat).toFixed(6)), lng: Number((centerPoint.lng - dLng).toFixed(6)) },
      ];
    }

    onSave(
      {
        codigo: codigo.trim(),
        nombre: nombre.trim(),
        cultivo,
        variedad: variedad.trim(),
        superficieHa: Number(superficieHa) || 0,
        plantasPorHa: Number(plantasPorHa) || 0,
        anioPlantacion: Number(anioPlantacion) || 2021,
        sistemaRiego: sistemaRiego.trim(),
        sueloPh: sueloPh.trim(),
        estado,
        notas: notas.trim(),
        center: centerPoint,
        polygon: finalPolygon,
      },
      initial?.id
    );
  };

  return (
    <ModalShell title={initial ? 'Editar Cuartel' : 'Nuevo Cuartel Georreferenciado'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {presetPolygon && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200">
            Polígono trazado en mapa satelital ({presetPolygon.polygon.length} vértices · Superficie calculada:{' '}
            <strong className="font-mono">{presetPolygon.areaHa} ha</strong>).
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Código</label>
            <input type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="AR-03" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Nombre del Cuartel</label>
            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Cuartel Norte" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Cultivo</label>
            <select value={cultivo} onChange={(e) => setCultivo(e.target.value)} className={inputCls}>
              {cultivos.map((cul) => (
                <option key={cul.id} value={cul.nombre}>
                  {cul.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Variedad / Clon</label>
            <input type="text" required value={variedad} onChange={(e) => setVariedad(e.target.value)} placeholder="Ej: Legacy / Rovada / Luna Negra" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Superficie (ha)</label>
            <input type="number" step="0.01" min="0.1" value={superficieHa} onChange={(e) => setSuperficieHa(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Plantas / ha</label>
            <input type="number" min="100" value={plantasPorHa} onChange={(e) => setPlantasPorHa(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Año Plantación</label>
            <input type="number" min="1990" max="2035" value={anioPlantacion} onChange={(e) => setAnioPlantacion(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Latitud Centro (WGS84)</label>
            <input type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Longitud Centro (WGS84)</label>
            <input type="number" step="0.000001" value={lng} onChange={(e) => setLng(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Sistema de Riego</label>
            <input type="text" value={sistemaRiego} onChange={(e) => setSistemaRiego(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Suelo y pH</label>
            <input type="text" value={sueloPh} onChange={(e) => setSueloPh(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Estado</label>
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoCuartel)} className={inputCls}>
            <option value="Producción">Producción</option>
            <option value="En Cosecha">En Cosecha</option>
            <option value="En Carencia">En Carencia</option>
            <option value="Formación / Receso">Formación / Receso</option>
            <option value="Barbecho">Barbecho</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>Notas Agronómicas</label>
          <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} className={inputCls} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white">
            Guardar Cuartel
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 5. MAQUINARIA LOG MODAL */
export const MaquinariaModal: React.FC<{
  initial?: RegistroMaquinaria | null;
  cultivos: CultivoConfig[];
  maquinas: MaquinaEquipo[];
  personalHabilitado?: PersonalHabilitadoItem[];
  onClose: () => void;
  onSave: (data: Omit<RegistroMaquinaria, 'id'>, id?: string) => void;
}> = ({ initial, cultivos, maquinas, personalHabilitado = [], onClose, onSave }) => {
  const [fecha, setFecha] = useState(initial?.fecha ?? getTodayISO());
  const [equipo, setEquipo] = useState(initial?.equipo ?? maquinas[0]?.nombre ?? '');
  const [cultivosAplicados, setCultivosAplicados] = useState<string[]>(
    initial?.cultivosAplicados ?? ['Todos']
  );
  const [tipo, setTipo] = useState<TipoRegistroMaquinaria>(
    initial?.tipo ?? 'Mantención Preventiva'
  );
  const [horometro, setHorometro] = useState(String(initial?.horometro ?? 0));
  const [litrosDiesel, setLitrosDiesel] = useState(String(initial?.litrosDiesel ?? ''));
  const [costoCLP, setCostoCLP] = useState(String(initial?.costoCLP ?? 0));
  const [operador, setOperador] = useState(initial?.operador ?? '');
  const [detalle, setDetalle] = useState(initial?.detalle ?? '');

  const tractoristasList = useMemo(
    () =>
      personalHabilitado.filter(
        (p) => p.activo && (p.requiereCarnetTractorista || p.rol === 'Tractorista')
      ),
    [personalHabilitado]
  );

  const matchedOperador = useMemo(
    () => personalHabilitado.find((p) => p.nombre.toLowerCase() === operador.trim().toLowerCase()),
    [personalHabilitado, operador]
  );
  const operadorCarnetEval = useMemo(
    () =>
      matchedOperador
        ? evaluateCarnetStatus(
            matchedOperador.requiereCarnetTractorista,
            matchedOperador.carnetTractoristaNumero,
            matchedOperador.carnetTractoristaVencimiento
          )
        : null,
    [matchedOperador]
  );

  const handleSelectEquipo = (nombreEq: string) => {
    setEquipo(nombreEq);
    const found = maquinas.find((m) => m.nombre === nombreEq);
    if (found) {
      setCultivosAplicados(found.cultivosCompatibles);
      setHorometro(String(found.horometroActual));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipo.trim() || !operador.trim()) return;
    onSave(
      {
        fecha,
        equipo: equipo.trim(),
        cultivosAplicados,
        tipo,
        horometro: Number(horometro) || 0,
        litrosDiesel: litrosDiesel ? Number(litrosDiesel) : undefined,
        costoCLP: Number(costoCLP) || 0,
        operador: operador.trim(),
        detalle: detalle.trim(),
      },
      initial?.id
    );
  };

  return (
    <ModalShell
      title={initial ? 'Editar Bitácora de Maquinaria' : 'Registrar Maquinaria / Combustible'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Fecha</label>
            <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Tipo de Registro</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoRegistroMaquinaria)} className={inputCls}>
              <option value="Mantención Preventiva">Mantención Preventiva</option>
              <option value="Carga Combustible">Carga Combustible</option>
              <option value="Reparación">Reparación</option>
              <option value="Trabajo en Campo">Trabajo en Campo</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Equipo / Maquinaria</label>
          <input
            type="text"
            required
            list="equipos-flota-list"
            value={equipo}
            onChange={(e) => handleSelectEquipo(e.target.value)}
            placeholder="Ej: Tractor Kubota M7040 o Nebulizador Jacto"
            className={inputCls}
          />
          <datalist id="equipos-flota-list">
            {maquinas.map((m) => (
              <option key={m.id} value={m.nombre} />
            ))}
          </datalist>
        </div>

        <CropMultiSelect
          cultivos={cultivos}
          selected={cultivosAplicados}
          onChange={setCultivosAplicados}
          label="Cultivos donde se utiliza o aplica este registro"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Horómetro (hrs)</label>
            <input type="number" step="0.5" min="0" value={horometro} onChange={(e) => setHorometro(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Diésel (Lts, opc.)</label>
            <input type="number" min="0" value={litrosDiesel} onChange={(e) => setLitrosDiesel(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Costo (CLP)</label>
            <input type="number" step="500" min="0" value={costoCLP} onChange={(e) => setCostoCLP(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Operador / Tractorista (Carnet Clase D) o Taller</label>
          <input
            type="text"
            required
            list="maq-tractoristas-list"
            value={operador}
            onChange={(e) => setOperador(e.target.value)}
            className={inputCls}
          />
          <datalist id="maq-tractoristas-list">
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
          {matchedOperador && operadorCarnetEval && (
            <p
              className={`mt-1 text-[11px] flex items-center gap-1 ${
                operadorCarnetEval.estado === 'vigente'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              {operadorCarnetEval.estado === 'vigente' ? (
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>
                {matchedOperador.carnetTractoristaNumero
                  ? `Carnet Tractorista Clase D ${matchedOperador.carnetTractoristaNumero} · ${operadorCarnetEval.label}`
                  : 'Sin Carnet de Tractorista Clase D registrado'}
              </span>
            </p>
          )}
        </div>

        <div>
          <label className={labelCls}>Detalle Técnico</label>
          <textarea rows={2} value={detalle} onChange={(e) => setDetalle(e.target.value)} className={inputCls} />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white">
            Guardar
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* 6. BACKUP & DATA MODAL */
export const BackupModal: React.FC<{
  onClose: () => void;
  onExportJSON: () => void;
  onImportJSON: (data: CuadernoState) => void;
  onResetDemo: () => void;
}> = ({ onClose, onExportJSON, onImportJSON, onResetDemo }) => {
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (
          parsed &&
          Array.isArray(parsed.cuarteles) &&
          Array.isArray(parsed.labores) &&
          Array.isArray(parsed.aplicaciones) &&
          Array.isArray(parsed.cosechas)
        ) {
          onImportJSON(parsed as CuadernoState);
          onClose();
        } else {
          setErrorMsg('El archivo JSON no corresponde al formato del Cuaderno de Campo.');
        }
      } catch {
        setErrorMsg('No se pudo leer el archivo JSON seleccionado.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <ModalShell title="Respaldo y Administración de Datos" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Los registros de Agrícola Queñi se guardan en el servidor y en este navegador. Puedes descargar un respaldo completo en JSON o restaurar un archivo previo.
        </p>

        {errorMsg && (
          <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg p-3">
            {errorMsg}
          </p>
        )}

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onExportJSON}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors"
          >
            <span>Descargar respaldo completo (JSON)</span>
            <Download className="w-4 h-4 text-slate-500" />
          </button>

          <label className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium text-slate-800 dark:text-slate-200 transition-colors cursor-pointer">
            <span>Restaurar desde archivo JSON</span>
            <Upload className="w-4 h-4 text-slate-500" />
            <input type="file" accept="application/json" onChange={handleFile} className="sr-only" />
          </label>

          <button
            type="button"
            onClick={() => {
              onResetDemo();
              onClose();
            }}
            className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-amber-200 dark:border-amber-900/60 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-sm font-medium text-amber-800 dark:text-amber-300 transition-colors"
          >
            <span>Vaciar registros y reiniciar cuaderno limpio</span>
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </ModalShell>
  );
};
