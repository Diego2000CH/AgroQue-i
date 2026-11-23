import { AgricolaInfo, CuadernoState } from '../types/fieldbook';

export const AGRICOLA_INFO: AgricolaInfo = {
  razonSocial: 'Agrícola Queñi',
  nombreCorto: 'Agrícola Queñi',
  rut: '79.886.390-8',
  referencia: '00294071',
  giro: 'Control productivo de Maqui, Arándanos y Zarzaparrilla',
  domicilio: '',
  comuna: 'Panguipulli, Valdivia, Región de Los Ríos',
  utm: '',
  defaultCenter: { lat: -39.708, lng: -72.385 },
  certificacion: '',
  representanteLegal: '',
  telefono: '',
  email: '',
};

let activeAgricolaInfo: AgricolaInfo = {
  ...AGRICOLA_INFO,
  defaultCenter: { ...AGRICOLA_INFO.defaultCenter },
};

export function setActiveAgricolaInfo(info?: Partial<AgricolaInfo> | null) {
  if (!info) {
    activeAgricolaInfo = {
      ...AGRICOLA_INFO,
      defaultCenter: { ...AGRICOLA_INFO.defaultCenter },
    };
    return;
  }
  activeAgricolaInfo = {
    ...AGRICOLA_INFO,
    ...info,
    defaultCenter: {
      lat: Number(info.defaultCenter?.lat ?? AGRICOLA_INFO.defaultCenter.lat),
      lng: Number(info.defaultCenter?.lng ?? AGRICOLA_INFO.defaultCenter.lng),
    },
  };
}

export function getActiveAgricolaInfo(): AgricolaInfo {
  return activeAgricolaInfo;
}

export const ESTATE_IMAGES = {
  panorama: '/src/assets/images/fundo_panorama_1795369383872.jpg',
  cuartel: '/src/assets/images/cuartel_frutal_1795369384293.jpg',
  pradera: '/src/assets/images/potrero_pradera_1795369384212.jpg',
};

export function createInitialCuadernoState(): CuadernoState {
  return {
    empresaInfo: {
      ...AGRICOLA_INFO,
      defaultCenter: { ...AGRICOLA_INFO.defaultCenter },
    },
    cultivos: [
      {
        id: 'cul-maqui',
        nombre: 'Maqui',
        nombreCientifico: 'Aristotelia chilensis',
        colorHex: '#7C3AED',
        phOptimo: '5.2 – 5.8',
        unidadCosecha: 'kg',
        activo: true,
      },
      {
        id: 'cul-arandanos',
        nombre: 'Arándanos',
        nombreCientifico: 'Vaccinium corymbosum',
        colorHex: '#2563EB',
        phOptimo: '4.8 – 5.4',
        unidadCosecha: 'kg',
        activo: true,
      },
      {
        id: 'cul-zarzaparrilla',
        nombre: 'Zarzaparrilla',
        nombreCientifico: 'Ribes rubrum / nigrum',
        colorHex: '#E11D48',
        phOptimo: '5.5 – 6.2',
        unidadCosecha: 'kg',
        activo: true,
      },
    ],
    cuarteles: [],
    puntosMapa: [],
    labores: [],
    bodega: [],
    movimientosBodega: [],
    ordenesAplicacion: [],
    aplicaciones: [],
    cosechas: [],
    sectoresRiego: [],
    riegos: [],
    plagas: [],
    climaRegistros: [],
    maquinas: [],
    maquinaria: [],
    heladas: [],
    postcosecha: [],
    cuadrillas: [],
    suelosAnalisis: [],
    programasFertirriego: [],
    costosExtras: [],
  };
}
