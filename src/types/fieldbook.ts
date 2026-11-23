export type NavSection =
  | 'resumen'
  | 'mapa'
  | 'cultivos'
  | 'cuarteles'
  | 'maquinaria'
  | 'riego'
  | 'clima'
  | 'heladas'
  | 'plagas'
  | 'ordenes'
  | 'aplicaciones'
  | 'bodega'
  | 'labores'
  | 'cosecha'
  | 'postcosecha'
  | 'cuadrillas'
  | 'suelos'
  | 'costos'
  | 'usuarios';

export type UserRole =
  | 'Administrador de la App'
  | 'Administrador del Campo'
  | 'Agrónomo'
  | 'Supervisor de Campo'
  | 'Secretaria / Administración'
  | 'Bodeguero'
  | 'Aplicador Fitosanitario'
  | 'Tractorista'
  | 'Operador de Campo'
  | 'Solo Lectura'
  | 'Administrador'
  | 'Operador';

export type NivelAccesoModulo = 'ninguno' | 'lectura' | 'edicion';

export type NivelGlobalAcceso =
  | 'Total'
  | 'Alto'
  | 'Medio'
  | 'Básico'
  | 'Solo Lectura'
  | 'Personalizado';

export type PermisosUsuario = Partial<Record<NavSection, NivelAccesoModulo>>;

export interface AuthUserSession {
  id: string;
  username: string;
  email: string;
  rut: string;
  nombre: string;
  rol: UserRole;
  cargo: string;
  activo: boolean;
  nivelAcceso?: NivelGlobalAcceso;
  permisos?: PermisosUsuario;
  requiereCarnetAplicador?: boolean;
  carnetAplicadorNumero?: string;
  carnetAplicadorVencimiento?: string;
  requiereCarnetTractorista?: boolean;
  carnetTractoristaNumero?: string;
  carnetTractoristaVencimiento?: string;
}

export interface AdminUserRecord extends AuthUserSession {
  claveVisible?: string;
  createdAt: string;
}

export type ServiceModeStatus = 'Activo' | 'Suspendido';

export interface ServiceStatusConfig {
  status: ServiceModeStatus;
  message: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface PersonalHabilitadoItem {
  id: string;
  nombre: string;
  cargo: string;
  rol: UserRole;
  activo: boolean;
  requiereCarnetAplicador?: boolean;
  carnetAplicadorNumero?: string;
  carnetAplicadorVencimiento?: string;
  requiereCarnetTractorista?: boolean;
  carnetTractoristaNumero?: string;
  carnetTractoristaVencimiento?: string;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
}

export interface AgricolaInfo {
  razonSocial: string;
  nombreCorto: string;
  rut: string;
  referencia: string;
  giro?: string;
  domicilio: string;
  comuna: string;
  utm: string;
  defaultCenter: LatLngPoint;
  certificacion: string;
  representanteLegal?: string;
  telefono?: string;
  email?: string;
}

export interface CultivoConfig {
  id: string;
  nombre: string;
  nombreCientifico: string;
  colorHex: string;
  phOptimo: string;
  unidadCosecha: string;
  activo: boolean;
}

export type EstadoCuartel =
  | 'Producción'
  | 'En Cosecha'
  | 'En Carencia'
  | 'Formación / Receso'
  | 'Barbecho';

export interface Cuartel {
  id: string;
  codigo: string;
  nombre: string;
  cultivo: string; // Especie: 'Maqui' | 'Arándanos' | 'Zarzaparrilla' | custom
  variedad: string;
  superficieHa: number;
  plantasPorHa: number;
  anioPlantacion: number;
  sistemaRiego: string;
  sueloPh: string;
  estado: EstadoCuartel;
  notas: string;
  center: LatLngPoint;
  polygon: LatLngPoint[];
}

export type TipoPuntoMapa =
  | 'Barbecho'
  | 'Bodega'
  | 'Oficina'
  | 'Casa Patronal'
  | 'Caseta Riego'
  | 'Pozo DGA'
  | 'Taller'
  | 'Entrada Principal'
  | 'Trampa Plaga'
  | 'Estación Clima';

export interface PuntoMapa {
  id: string;
  nombre: string;
  tipo: TipoPuntoMapa;
  position: LatLngPoint;
  cuartelId?: string;
  notas: string;
}

export type TipoLabor =
  | 'Riego y Fertirriego'
  | 'Poda'
  | 'Fertilización Base'
  | 'Fitosanitario'
  | 'Control Malezas'
  | 'Polinización'
  | 'Control Heladas'
  | 'Cosecha'
  | 'Mantención Camellones';

export type EstadoLabor = 'Completada' | 'En Curso' | 'Programada';

export interface LaborAgricola {
  id: string;
  fecha: string;
  cuartelId: string;
  tipo: TipoLabor;
  descripcion: string;
  responsable: string;
  maquinaria: string;
  horasTrabajo: number;
  costoCLP: number;
  estado: EstadoLabor;
  observaciones: string;
}

export type CategoriaBodega = 'Fitosanitario' | 'Fertilización' | 'Maquinaria y Repuestos';

export interface BodegaItem {
  id: string;
  codigo: string;
  nombre: string;
  categoria: CategoriaBodega;
  subcategoria: string;
  ingredienteActivoOEspecificacion: string;
  registroSagOParte: string;
  cultivosCompatibles: string[];
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  costoUnitarioCLP: number;
  lote: string;
  fechaVencimiento: string;
  carenciaBaseDias?: number;
  reingresoBaseHoras?: number;
  ubicacionBodega: string;
  notas: string;
}

export interface MovimientoBodega {
  id: string;
  fecha: string;
  itemId: string;
  tipo: 'Ingreso' | 'Egreso';
  cantidad: number;
  referencia: string;
  responsable: string;
  observaciones: string;
}

export type EstadoOrdenAplicacion = 'Emitida' | 'En Ejecución' | 'Ejecutada' | 'Anulada';

export interface OrdenAplicacionProducto {
  bodegaItemId: string;
  nombreProducto: string;
  ingredienteActivo: string;
  dosisPorHa: number;
  unidadDosis: string;
  cantidadTotal: number;
  unidadTotal: string;
}

export interface OrdenAplicacion {
  id: string;
  numeroOrden: string;
  fechaEmision: string;
  fechaProgramada: string;
  cuartelIds: string[];
  cultivo: string;
  superficieTotalHa: number;
  tipoOrden: 'Fitosanitaria' | 'Fertirrigación / Foliar';
  objetivo: string;
  productos: OrdenAplicacionProducto[];
  mojamientoLtsHa: number;
  capacidadEstanqueLts: number;
  maquinaria: string;
  aplicador: string;
  tractorista?: string;
  carnetAplicadorRef?: string;
  carnetTractoristaRef?: string;
  responsableTecnico: string;
  eppRequerido: string;
  condicionesClimaRequeridas: string;
  carenciaDias: number;
  reingresoHoras: number;
  estado: EstadoOrdenAplicacion;
  descontadoBodega: boolean;
  observaciones: string;
}

export type CategoriaAplicacion =
  | 'Fungicida'
  | 'Insecticida'
  | 'Herbicida'
  | 'Fertilizante Foliar'
  | 'Bioestimulante';

export interface AplicacionFitosanitaria {
  id: string;
  fecha: string;
  cuartelId: string;
  categoria: CategoriaAplicacion;
  productoComercial: string;
  ingredienteActivo: string;
  objetivo: string;
  dosisPorHa: string;
  mojamientoLtsHa: number;
  carenciaDias: number;
  reingresoHoras: number;
  aplicador: string;
  carnetAplicadorRef?: string;
  carnetTractoristaRef?: string;
  condicionesClima: string;
  ordenAplicacionRef?: string;
  observaciones: string;
}

export type DestinoCosecha =
  | 'Fresco Exportación'
  | 'IQF Congelado'
  | 'Liofilizado / Polvo'
  | 'Agroindustria / Jugos';

export interface RegistroCosecha {
  id: string;
  fecha: string;
  cuartelId: string;
  cultivo: string;
  kilosBrutos: number;
  kilosDescarte: number;
  brix: number;
  destino: DestinoCosecha;
  cosecheros: number;
  guiaDespacho: string;
  observaciones: string;
}

export interface RegistroRiego {
  id: string;
  fecha: string;
  cuartelId: string;
  horaInicio: string;
  horasRiego: number;
  caudalM3Hora: number;
  laminaMm: number;
  presionBar: number;
  phAgua: number;
  conductividadDsM: number;
  humedadSueloCbar: number;
  sectorValvula: string;
  operador: string;
  observaciones: string;
}

export type NivelIncidenciaPlaga = 'Bajo / Monitoreo' | 'Umbral Alerta' | 'Crítico';

export interface MonitoreoPlaga {
  id: string;
  fecha: string;
  cuartelId: string;
  cultivo: string;
  plagaOEnfermedad: string;
  estadoFenologico: string;
  nivel: NivelIncidenciaPlaga;
  conteoTrampa?: number;
  porcentajeIncidencia: number;
  position: LatLngPoint;
  inspector: string;
  recomendacion: string;
}

export interface RegistroClimaManual {
  id: string;
  fecha: string;
  hora: string;
  ubicacionNombre: string;
  lat: number;
  lng: number;
  tempC: number;
  tempMinC: number;
  tempMaxC: number;
  humedadPct: number;
  vientoKmH: number;
  lluviaMm: number;
  observaciones: string;
}

export type EstadoMaquinaria = 'Operativa' | 'En Mantención' | 'Fuera de Servicio';

export interface MaquinaEquipo {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marcaModelo: string;
  patenteOSerie: string;
  cultivosCompatibles: string[];
  horometroActual: number;
  proximaMantencionHrs: number;
  estado: EstadoMaquinaria;
  notas: string;
}

export type TipoRegistroMaquinaria =
  | 'Mantención Preventiva'
  | 'Carga Combustible'
  | 'Reparación'
  | 'Trabajo en Campo';

export interface RegistroMaquinaria {
  id: string;
  fecha: string;
  maquinaId?: string;
  equipo: string;
  cultivosAplicados: string[];
  tipo: TipoRegistroMaquinaria;
  horometro: number;
  litrosDiesel?: number;
  costoCLP: number;
  operador: string;
  detalle: string;
}

export interface WeatherForecastDay {
  date: string;
  conditionText: string;
  tempMaxC: number;
  tempMinC: number;
  precipProbPct: number;
  precipMm: number;
  windMaxKmH: number;
  humidityPct: number;
}

export interface WeatherSnapshot {
  source: 'google-weather' | 'open-meteo';
  locationName: string;
  lat: number;
  lng: number;
  observedAt: string;
  tempC: number;
  feelsLikeC: number;
  humidityPct: number;
  windKmH: number;
  windDirection: string;
  precipMm24h: number;
  conditionText: string;
  uvIndex: number;
  dewPointC: number;
  forecast: WeatherForecastDay[];
}

export type EstadoSectorRiego = 'Operativo' | 'Mantención' | 'Inactivo';

export interface SectorRiego {
  id: string;
  codigo: string;
  nombre: string;
  cuartelIds: string[];
  fuenteAgua: string;
  tipoEmisores: string;
  caudalNominalM3h: number;
  presionBar: number;
  injectorFertirriego: string;
  estado: EstadoSectorRiego;
  notas: string;
}

export type MetodoControlHelada =
  | 'Microaspersión Antihelada'
  | 'Ventiladores / Torres'
  | 'Riego Previo / Humectación'
  | 'Monitoreo Sin Activación';

export interface EventoHelada {
  id: string;
  fecha: string;
  horaInicio: string;
  horaTermino: string;
  cuartelIds: string[];
  tempMinimaC: number;
  temperaturaActivacionC: number;
  metodoControl: MetodoControlHelada;
  danoEstimadoPct: number;
  estadoFenologico: string;
  operador: string;
  observaciones: string;
}

export type EstadoPostcosecha = 'En Pre-Frío' | 'Embalado / En Cámara' | 'Despachado';

export interface LotePostcosecha {
  id: string;
  codigoLote: string;
  fecha: string;
  cuartelId: string;
  cultivo: string;
  variedad: string;
  camaraFrio: string;
  tempPulpaIngresoC: number;
  tempCamaraC: number;
  kilosRecibidos: number;
  kilosExportables: number;
  kilosDescarte: number;
  calibrePromedio: string;
  destinoProceso: DestinoCosecha;
  clienteOExportadora: string;
  guiaDespachoRef: string;
  estado: EstadoPostcosecha;
  observaciones: string;
}

export type ModalidadPagoCuadrilla = 'Trato por Kilo' | 'Jornal Diario' | 'Mixto';
export type EstadoPagoCuadrilla = 'Pendiente' | 'Aprobado' | 'Pagado';

export interface RegistroCuadrilla {
  id: string;
  fecha: string;
  cuadrillaNombre: string;
  jefeCuadrilla: string;
  cuartelId: string;
  cultivo: string;
  trabajadoresCount: number;
  modalidadPago: ModalidadPagoCuadrilla;
  kilosTotales: number;
  tarifaUnitariaCLP: number;
  bonosCLP: number;
  totalPagarCLP: number;
  estadoPago: EstadoPagoCuadrilla;
  observaciones: string;
}

export type TipoAnalisisSueloAgua = 'Suelo' | 'Agua de Riego' | 'Foliar';

export interface AnalisisSueloAgua {
  id: string;
  fecha: string;
  tipoMuestra: TipoAnalisisSueloAgua;
  cuartelId: string;
  laboratorio: string;
  ph: number;
  ceDsM: number;
  materiaOrganicaPct?: number;
  nitrogenoPpm?: number;
  fosforoPpm?: number;
  potasioPpm?: number;
  recomendacion: string;
}

export interface ProgramaFertirriego {
  id: string;
  nombre: string;
  cultivo: string;
  etapaFenologica: string;
  volumenEstanqueLts: number;
  dosisNitrogenoKg: number;
  dosisPotasioKg: number;
  dosisFosforoKg: number;
  acidificanteLts: number;
  phObjetivo: number;
  ceObjetivoDsM: number;
  frecuenciaDias: number;
  activo: boolean;
  notas: string;
}

export type CategoriaCostoExtra =
  | 'Mano de Obra / Tratos'
  | 'Insumos y Fertilizantes'
  | 'Maquinaria y Combustible'
  | 'Riego y Energía'
  | 'Venta / Liquidación Fruta'
  | 'Servicios y Certificación';

export interface MovimientoCostoExtra {
  id: string;
  fecha: string;
  cuartelId: string;
  cultivo: string;
  categoria: CategoriaCostoExtra;
  tipo: 'Costo' | 'Ingreso';
  descripcion: string;
  montoCLP: number;
  documentoRef: string;
}

export interface CuadernoState {
  empresaInfo?: AgricolaInfo;
  cultivos: CultivoConfig[];
  cuarteles: Cuartel[];
  puntosMapa: PuntoMapa[];
  labores: LaborAgricola[];
  bodega: BodegaItem[];
  movimientosBodega: MovimientoBodega[];
  ordenesAplicacion: OrdenAplicacion[];
  aplicaciones: AplicacionFitosanitaria[];
  cosechas: RegistroCosecha[];
  riegos: RegistroRiego[];
  sectoresRiego: SectorRiego[];
  plagas: MonitoreoPlaga[];
  climaRegistros: RegistroClimaManual[];
  maquinas: MaquinaEquipo[];
  maquinaria: RegistroMaquinaria[];
  heladas: EventoHelada[];
  postcosecha: LotePostcosecha[];
  cuadrillas: RegistroCuadrilla[];
  suelosAnalisis: AnalisisSueloAgua[];
  programasFertirriego: ProgramaFertirriego[];
  costosExtras: MovimientoCostoExtra[];
}
