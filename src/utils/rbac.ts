import {
  AuthUserSession,
  NavSection,
  NivelAccesoModulo,
  NivelGlobalAcceso,
  PermisosUsuario,
  UserRole,
} from '../types/fieldbook';

export const SELECTABLE_ROLES: UserRole[] = [
  'Administrador de la App',
  'Administrador del Campo',
  'Agrónomo',
  'Supervisor de Campo',
  'Secretaria / Administración',
  'Bodeguero',
  'Aplicador Fitosanitario',
  'Tractorista',
  'Operador de Campo',
  'Solo Lectura',
];

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Administrador de la App':
    'Control total de la plataforma, gestión de usuarios, roles, carnets, niveles de acceso y visibilidad de claves.',
  'Administrador del Campo':
    'Dirección completa del fundo: cuarteles, cosecha, bodega, órdenes de aplicación, maquinaria y presupuesto.',
  Agrónomo:
    'Gestión técnica y fitosanitaria: mapa, cultivos, plagas, órdenes de aplicación, carencias, riego y clima.',
  'Supervisor de Campo':
    'Supervisión diaria de cuadrillas, labores, monitoreo de plagas, riego y cosecha en terreno.',
  'Secretaria / Administración':
    'Gestión documental y administrativa: guías de cosecha, ingresos de bodega, reportes PDF/Word y labores.',
  Bodeguero:
    'Control total de bodega fitosanitaria, fertilización, repuestos, kardex y seguimiento de órdenes emitidas.',
  'Aplicador Fitosanitario':
    'Ejecución de órdenes y aplicaciones fitosanitarias. Requiere Carnet de Aplicador SAG vigente (y Tractorista si aplica).',
  Tractorista:
    'Operación de tractores, nebulizadores y bitácora de maquinaria/combustible. Requiere Licencia Clase D vigente.',
  'Operador de Campo':
    'Registro operativo de labores diarias, eventos de riego, monitoreos básicos y entregas de cosecha.',
  'Solo Lectura':
    'Acceso de consulta y descarga de reportes sin permisos de creación, edición o eliminación.',
};

export const ALL_MODULE_META: { id: NavSection; label: string }[] = [
  { id: 'resumen', label: 'Resumen Productivo' },
  { id: 'mapa', label: 'Mapa Satelital Huerto' },
  { id: 'cultivos', label: 'Cultivos y Variedades' },
  { id: 'cuarteles', label: 'Cuarteles Prediales' },
  { id: 'maquinaria', label: 'Maquinaria y Equipos' },
  { id: 'riego', label: 'Riego y Sectores' },
  { id: 'clima', label: 'Clima Georreferenciado' },
  { id: 'heladas', label: 'Control de Heladas' },
  { id: 'plagas', label: 'Control de Plagas' },
  { id: 'ordenes', label: 'Órdenes de Aplicación' },
  { id: 'aplicaciones', label: 'Aplicaciones y Carencias' },
  { id: 'bodega', label: 'Bodega e Inventario' },
  { id: 'labores', label: 'Cuaderno de Labores' },
  { id: 'cosecha', label: 'Control de Cosecha' },
  { id: 'postcosecha', label: 'Postcosecha y Frío' },
  { id: 'cuadrillas', label: 'Cuadrillas y Tratos' },
  { id: 'suelos', label: 'Suelos y Fertirriego' },
  { id: 'costos', label: 'Costos y Rentabilidad' },
  { id: 'usuarios', label: 'Usuarios y Accesos' },
];

export const OPERATIONAL_SECTIONS: NavSection[] = ALL_MODULE_META.filter(
  (m) => m.id !== 'usuarios'
).map((m) => m.id);

export function isAppAdmin(rol: UserRole | string | undefined): boolean {
  return rol === 'Administrador de la App' || rol === 'Administrador';
}

export function normalizeRole(rol: UserRole | string): UserRole {
  if (rol === 'Administrador') return 'Administrador de la App';
  if (rol === 'Operador') return 'Operador de Campo';
  return rol as UserRole;
}

export function getDefaultPermissionsForRole(rol: UserRole): Record<NavSection, NivelAccesoModulo> {
  const r = normalizeRole(rol);
  const base: Record<NavSection, NivelAccesoModulo> = {
    resumen: 'lectura',
    mapa: 'ninguno',
    cultivos: 'ninguno',
    cuarteles: 'ninguno',
    maquinaria: 'ninguno',
    riego: 'ninguno',
    clima: 'ninguno',
    heladas: 'ninguno',
    plagas: 'ninguno',
    ordenes: 'ninguno',
    aplicaciones: 'ninguno',
    bodega: 'ninguno',
    labores: 'ninguno',
    cosecha: 'ninguno',
    postcosecha: 'ninguno',
    cuadrillas: 'ninguno',
    suelos: 'ninguno',
    costos: 'ninguno',
    usuarios: 'ninguno',
  };

  switch (r) {
    case 'Administrador de la App':
      ALL_MODULE_META.forEach((m) => {
        base[m.id] = 'edicion';
      });
      return base;

    case 'Administrador del Campo':
      OPERATIONAL_SECTIONS.forEach((id) => {
        base[id] = 'edicion';
      });
      return base;

    case 'Agrónomo':
      return {
        ...base,
        resumen: 'edicion',
        mapa: 'edicion',
        cultivos: 'edicion',
        cuarteles: 'edicion',
        maquinaria: 'lectura',
        riego: 'edicion',
        clima: 'edicion',
        heladas: 'edicion',
        plagas: 'edicion',
        ordenes: 'edicion',
        aplicaciones: 'edicion',
        bodega: 'lectura',
        labores: 'edicion',
        cosecha: 'edicion',
        postcosecha: 'edicion',
        cuadrillas: 'lectura',
        suelos: 'edicion',
        costos: 'lectura',
      };

    case 'Supervisor de Campo':
      return {
        ...base,
        resumen: 'lectura',
        mapa: 'lectura',
        cultivos: 'lectura',
        cuarteles: 'lectura',
        maquinaria: 'lectura',
        riego: 'edicion',
        clima: 'lectura',
        heladas: 'edicion',
        plagas: 'edicion',
        ordenes: 'lectura',
        aplicaciones: 'lectura',
        bodega: 'lectura',
        labores: 'edicion',
        cosecha: 'edicion',
        postcosecha: 'edicion',
        cuadrillas: 'edicion',
        suelos: 'lectura',
      };

    case 'Secretaria / Administración':
      return {
        ...base,
        resumen: 'lectura',
        mapa: 'lectura',
        cultivos: 'lectura',
        cuarteles: 'lectura',
        maquinaria: 'lectura',
        riego: 'lectura',
        clima: 'lectura',
        heladas: 'lectura',
        plagas: 'lectura',
        ordenes: 'lectura',
        aplicaciones: 'lectura',
        bodega: 'edicion',
        labores: 'edicion',
        cosecha: 'edicion',
        postcosecha: 'edicion',
        cuadrillas: 'edicion',
        suelos: 'lectura',
        costos: 'edicion',
      };

    case 'Bodeguero':
      return {
        ...base,
        resumen: 'lectura',
        cultivos: 'lectura',
        cuarteles: 'lectura',
        maquinaria: 'lectura',
        ordenes: 'lectura',
        aplicaciones: 'lectura',
        bodega: 'edicion',
      };

    case 'Aplicador Fitosanitario':
      return {
        ...base,
        resumen: 'lectura',
        mapa: 'lectura',
        cuarteles: 'lectura',
        clima: 'lectura',
        heladas: 'lectura',
        maquinaria: 'lectura',
        bodega: 'lectura',
        plagas: 'edicion',
        ordenes: 'edicion',
        aplicaciones: 'edicion',
        labores: 'edicion',
      };

    case 'Tractorista':
      return {
        ...base,
        resumen: 'lectura',
        mapa: 'lectura',
        cuarteles: 'lectura',
        clima: 'lectura',
        heladas: 'lectura',
        riego: 'lectura',
        ordenes: 'lectura',
        maquinaria: 'edicion',
        labores: 'edicion',
      };

    case 'Operador de Campo':
      return {
        ...base,
        resumen: 'lectura',
        mapa: 'lectura',
        cuarteles: 'lectura',
        clima: 'lectura',
        heladas: 'edicion',
        ordenes: 'lectura',
        riego: 'edicion',
        plagas: 'edicion',
        labores: 'edicion',
        cosecha: 'edicion',
        postcosecha: 'edicion',
        cuadrillas: 'edicion',
      };

    case 'Solo Lectura':
    default:
      OPERATIONAL_SECTIONS.forEach((id) => {
        base[id] = 'lectura';
      });
      return base;
  }
}

export function getPresetGlobalPermissions(
  nivel: NivelGlobalAcceso,
  rol: UserRole
): Record<NavSection, NivelAccesoModulo> {
  if (nivel === 'Personalizado') {
    return getDefaultPermissionsForRole(rol);
  }
  const base = getDefaultPermissionsForRole(rol);
  if (nivel === 'Total') {
    OPERATIONAL_SECTIONS.forEach((id) => {
      base[id] = 'edicion';
    });
    base.usuarios = isAppAdmin(rol) ? 'edicion' : 'ninguno';
    return base;
  }
  if (nivel === 'Alto') {
    OPERATIONAL_SECTIONS.forEach((id) => {
      base[id] = 'edicion';
    });
    base.usuarios = 'ninguno';
    return base;
  }
  if (nivel === 'Medio') {
    OPERATIONAL_SECTIONS.forEach((id) => {
      if (base[id] === 'ninguno') base[id] = 'lectura';
    });
    base.usuarios = 'ninguno';
    return base;
  }
  if (nivel === 'Básico') {
    return {
      resumen: 'lectura',
      mapa: 'lectura',
      cultivos: 'ninguno',
      cuarteles: 'lectura',
      maquinaria: 'ninguno',
      riego: 'edicion',
      clima: 'lectura',
      heladas: 'lectura',
      plagas: 'edicion',
      ordenes: 'ninguno',
      aplicaciones: 'ninguno',
      bodega: 'ninguno',
      labores: 'edicion',
      cosecha: 'edicion',
      postcosecha: 'ninguno',
      cuadrillas: 'ninguno',
      suelos: 'ninguno',
      costos: 'ninguno',
      usuarios: 'ninguno',
    };
  }
  // Solo Lectura
  OPERATIONAL_SECTIONS.forEach((id) => {
    base[id] = 'lectura';
  });
  base.usuarios = 'ninguno';
  return base;
}

export function getEffectivePermissions(
  user: Pick<AuthUserSession, 'rol' | 'permisos'>
): Record<NavSection, NivelAccesoModulo> {
  const defaults = getDefaultPermissionsForRole(user.rol);
  const merged: Record<NavSection, NivelAccesoModulo> = {
    ...defaults,
    ...(user.permisos || {}),
  };
  if (!isAppAdmin(user.rol)) {
    merged.usuarios = 'ninguno';
  } else {
    merged.usuarios = 'edicion';
  }
  return merged;
}

export function getAllowedSectionsForUser(
  user: Pick<AuthUserSession, 'rol' | 'permisos'>
): NavSection[] {
  const perms = getEffectivePermissions(user);
  return ALL_MODULE_META.filter((m) => perms[m.id] !== 'ninguno').map((m) => m.id);
}

export function canEditModule(
  user: Pick<AuthUserSession, 'rol' | 'permisos'>,
  section: NavSection
): boolean {
  if (section === 'usuarios') return isAppAdmin(user.rol);
  const perms = getEffectivePermissions(user);
  return perms[section] === 'edicion';
}

export function normalizeRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toLowerCase();
}

export function formatRutDisplay(rut: string): string {
  const clean = normalizeRut(rut);
  if (clean.length < 2) return rut.trim();
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

export type CarnetEstado = 'vigente' | 'por_vencer' | 'vencido' | 'faltante' | 'no_aplica';

export function evaluateCarnetStatus(
  requiere?: boolean,
  numero?: string,
  vencimiento?: string
): { estado: CarnetEstado; label: string; diasRestantes: number | null } {
  if (!requiere) {
    return { estado: 'no_aplica', label: 'No aplica', diasRestantes: null };
  }
  if (!numero?.trim()) {
    return { estado: 'faltante', label: 'Falta N° Carnet', diasRestantes: null };
  }
  if (!vencimiento) {
    return { estado: 'vigente', label: 'Registrado (sin fecha)', diasRestantes: null };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(`${vencimiento}T00:00:00`);
  if (Number.isNaN(exp.getTime())) {
    return { estado: 'vigente', label: 'Registrado', diasRestantes: null };
  }
  const diffDays = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) {
    return { estado: 'vencido', label: `Vencido (${Math.abs(diffDays)} d)`, diasRestantes: diffDays };
  }
  if (diffDays <= 30) {
    return { estado: 'por_vencer', label: `Vence en ${diffDays} d`, diasRestantes: diffDays };
  }
  return { estado: 'vigente', label: `Vigente (${diffDays} d)`, diasRestantes: diffDays };
}

export function getUserInitials(nombre: string): string {
  const parts = String(nombre || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'AQ';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function getSuggestedLicenseFlags(rol: UserRole): {
  requiereCarnetAplicador: boolean;
  requiereCarnetTractorista: boolean;
} {
  const r = normalizeRole(rol);
  if (r === 'Aplicador Fitosanitario') {
    return { requiereCarnetAplicador: true, requiereCarnetTractorista: false };
  }
  if (r === 'Tractorista') {
    return { requiereCarnetAplicador: false, requiereCarnetTractorista: true };
  }
  return { requiereCarnetAplicador: false, requiereCarnetTractorista: false };
}

export function validatePermisosSanity(
  permisos?: PermisosUsuario
): PermisosUsuario | undefined {
  if (!permisos || typeof permisos !== 'object') return undefined;
  const clean: PermisosUsuario = {};
  const validLevels: NivelAccesoModulo[] = ['ninguno', 'lectura', 'edicion'];
  ALL_MODULE_META.forEach((m) => {
    const val = permisos[m.id];
    if (val && validLevels.includes(val)) {
      clean[m.id] = val;
    }
  });
  return clean;
}
