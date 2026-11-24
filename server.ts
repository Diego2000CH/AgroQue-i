import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import dotenv from 'dotenv';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_FILE = path.join(DATA_DIR, 'auth.json');
const CUADERNO_FILE = path.join(DATA_DIR, 'cuaderno.json');
const SERVICE_STATUS_FILE = path.join(DATA_DIR, 'service-status.json');
const KEYSTORE_FILE = path.join(DATA_DIR, '.keystore');

type NavSection =
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

type UserRole =
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

type NivelAccesoModulo = 'ninguno' | 'lectura' | 'edicion';
type NivelGlobalAcceso =
  | 'Total'
  | 'Alto'
  | 'Medio'
  | 'Básico'
  | 'Solo Lectura'
  | 'Personalizado';
type PermisosUsuario = Partial<Record<NavSection, NivelAccesoModulo>>;

const VALID_ROLES: UserRole[] = [
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
  'Administrador',
  'Operador',
];

const VALID_SECTIONS: NavSection[] = [
  'resumen',
  'mapa',
  'cultivos',
  'cuarteles',
  'maquinaria',
  'riego',
  'clima',
  'heladas',
  'plagas',
  'ordenes',
  'aplicaciones',
  'bodega',
  'labores',
  'cosecha',
  'postcosecha',
  'cuadrillas',
  'suelos',
  'costos',
  'usuarios',
];

const VALID_LEVELS: NivelAccesoModulo[] = ['ninguno', 'lectura', 'edicion'];

interface StoredUser {
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
  passwordHash: string;
  encryptedPassword?: string;
  createdAt: string;
}

interface AuthStore {
  users: StoredUser[];
}

interface SessionRecord {
  userId: string;
  createdAt: number;
}

type ServiceModeStatus = 'Activo' | 'Suspendido';

interface ServiceStatusConfig {
  status: ServiceModeStatus;
  message: string;
  updatedAt: string;
  updatedBy?: string;
}

const DEFAULT_SERVICE_STATUS: ServiceStatusConfig = {
  status: 'Activo',
  message: 'Acceso temporalmente suspendido. Contacte al administrador del sistema.',
  updatedAt: '',
};

const sessions = new Map<string, SessionRecord>();

function isAppAdminRole(rol: UserRole | string): boolean {
  return rol === 'Administrador de la App' || rol === 'Administrador';
}

function normalizeRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toLowerCase();
}

function formatRutDisplay(rut: string): string {
  const clean = normalizeRut(rut);
  if (clean.length < 2) return rut.trim();
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedBody}-${dv}`;
}

function sanitizePermisos(raw: unknown, rol: UserRole): PermisosUsuario | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const clean: PermisosUsuario = {};
  for (const sec of VALID_SECTIONS) {
    const val = (raw as Record<string, unknown>)[sec];
    if (typeof val === 'string' && VALID_LEVELS.includes(val as NivelAccesoModulo)) {
      if (sec === 'usuarios' && !isAppAdminRole(rol)) {
        clean[sec] = 'ninguno';
      } else {
        clean[sec] = val as NivelAccesoModulo;
      }
    }
  }
  return clean;
}

function hasAnyEditPermission(user: StoredUser): boolean {
  if (isAppAdminRole(user.rol)) return true;
  if (user.rol === 'Solo Lectura') {
    if (!user.permisos) return false;
    return Object.entries(user.permisos).some(
      ([sec, lvl]) => sec !== 'usuarios' && lvl === 'edicion'
    );
  }
  if (user.permisos) {
    const anySpecific = Object.entries(user.permisos).some(
      ([sec, lvl]) => sec !== 'usuarios' && lvl === 'edicion'
    );
    if (anySpecific) return true;
    const allReadOrNone = Object.entries(user.permisos)
      .filter(([sec]) => sec !== 'usuarios')
      .every(([, lvl]) => lvl !== 'edicion');
    if (Object.keys(user.permisos).length >= 5 && allReadOrNone) return false;
  }
  return true;
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }
}

function getEncryptionKey(): Buffer {
  const envKey = process.env.DATA_ENCRYPTION_KEY;
  if (envKey && envKey.length >= 32) {
    return crypto.createHash('sha256').update(envKey).digest();
  }
  ensureDataDir();
  if (fs.existsSync(KEYSTORE_FILE)) {
    const hex = fs.readFileSync(KEYSTORE_FILE, 'utf8').trim();
    if (hex.length === 64) {
      return Buffer.from(hex, 'hex');
    }
  }
  const generated = crypto.randomBytes(32);
  fs.writeFileSync(KEYSTORE_FILE, generated.toString('hex'), { mode: 0o600 });
  return generated;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, expectedHex] = stored.split(':');
  if (!salt || !expectedHex) return false;
  const actualBuf = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  if (actualBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function encryptSecret(plain: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(payload?: string): string {
  if (!payload) return '';
  try {
    const [ivHex, tagHex, dataHex] = payload.split(':');
    if (!ivHex || !tagHex || !dataHex) return '';
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return '';
  }
}

function readAuthStore(): AuthStore {
  ensureDataDir();
  if (!fs.existsSync(AUTH_FILE)) {
    return { users: [] };
  }
  try {
    const raw = fs.readFileSync(AUTH_FILE, 'utf8');
    const parsed = JSON.parse(raw) as AuthStore;
    if (Array.isArray(parsed.users)) {
      return parsed;
    }
  } catch {
    // Corrupted file fallback
  }
  return { users: [] };
}

function writeAuthStore(store: AuthStore) {
  ensureDataDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(store, null, 2), { mode: 0o600 });
}

function readServiceStatus(): ServiceStatusConfig {
  ensureDataDir();
  if (!fs.existsSync(SERVICE_STATUS_FILE)) {
    return { ...DEFAULT_SERVICE_STATUS };
  }
  try {
    const raw = fs.readFileSync(SERVICE_STATUS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ServiceStatusConfig>;
    const status: ServiceModeStatus = parsed.status === 'Suspendido' ? 'Suspendido' : 'Activo';
    const message =
      typeof parsed.message === 'string' && parsed.message.trim()
        ? parsed.message.trim().slice(0, 500)
        : DEFAULT_SERVICE_STATUS.message;
    return {
      status,
      message,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : '',
      updatedBy: typeof parsed.updatedBy === 'string' ? parsed.updatedBy : undefined,
    };
  } catch {
    return { ...DEFAULT_SERVICE_STATUS };
  }
}

function writeServiceStatus(next: ServiceStatusConfig) {
  ensureDataDir();
  fs.writeFileSync(SERVICE_STATUS_FILE, JSON.stringify(next, null, 2), { mode: 0o600 });
}

const BOOTSTRAP_APP_ADMIN_EMAIL = 'diegopereiraramirez@gmail.com';
const PREVIOUS_BOOTSTRAP_HASH =
  '4f43464ea037ae914d17ad0a58b8d692:bc1fa4d1a68ae8c12fd144690d3680753a1810285ee96f52f0940be8bbf4d5d52ea167182d56216ea5755cb61e61602024c46b3778f5eff6cab181cf7b8877c1';
const BOOTSTRAP_APP_ADMIN_HASH =
  '5c30b3c90d7985ee85fdf3bea6a206a9:cd2c7c859a9ee6904c853a1186cc59229631fc9bcfad2e30cd5162806554425a7c434963cf7b8dd537b645577bc96fe167ebfe8fe5859f489aadd5ef7298e472';

function ensureInitialAdminAccounts() {
  const store = readAuthStore();
  const existingIdx = store.users.findIndex(
    (u) => u.email?.toLowerCase() === BOOTSTRAP_APP_ADMIN_EMAIL
  );
  if (existingIdx === -1) {
    store.users.unshift({
      id: 'usr-admin-diego',
      username: BOOTSTRAP_APP_ADMIN_EMAIL,
      email: BOOTSTRAP_APP_ADMIN_EMAIL,
      rut: '',
      nombre: 'Diego Pereira Ramírez',
      rol: 'Administrador de la App',
      cargo: 'Administrador de la App',
      activo: true,
      nivelAcceso: 'Total',
      passwordHash: BOOTSTRAP_APP_ADMIN_HASH,
      createdAt: new Date().toISOString(),
    });
    writeAuthStore(store);
  } else if (store.users[existingIdx].passwordHash === PREVIOUS_BOOTSTRAP_HASH) {
    store.users[existingIdx] = {
      ...store.users[existingIdx],
      activo: true,
      rol: 'Administrador de la App',
      nivelAcceso: 'Total',
      passwordHash: BOOTSTRAP_APP_ADMIN_HASH,
    };
    writeAuthStore(store);
  }
}

function toPublicUser(u: StoredUser) {
  return {
    id: u.id,
    username: u.username,
    email: u.email || '',
    rut: u.rut || '',
    nombre: u.nombre,
    rol: u.rol,
    cargo: u.cargo,
    activo: u.activo,
    nivelAcceso: u.nivelAcceso,
    permisos: u.permisos,
    requiereCarnetAplicador: Boolean(u.requiereCarnetAplicador),
    carnetAplicadorNumero: u.carnetAplicadorNumero || '',
    carnetAplicadorVencimiento: u.carnetAplicadorVencimiento || '',
    requiereCarnetTractorista: Boolean(u.requiereCarnetTractorista),
    carnetTractoristaNumero: u.carnetTractoristaNumero || '',
    carnetTractoristaVencimiento: u.carnetTractoristaVencimiento || '',
  };
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function resolveSessionUser(req: Request): StoredUser | null {
  const token = getBearerToken(req);
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > 86400000) {
    sessions.delete(token);
    return null;
  }
  const store = readAuthStore();
  const user = store.users.find((u) => u.id === session.userId);
  if (!user || !user.activo) return null;
  return user;
}

interface AuthedRequest extends Request {
  authUser?: StoredUser;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sesión no válida o expirada.' });
    return;
  }
  req.authUser = user;
  next();
}

function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = resolveSessionUser(req);
  if (!user) {
    res.status(401).json({ error: 'Sesión requerida.' });
    return;
  }
  if (!isAppAdminRole(user.rol)) {
    res.status(403).json({
      error: 'Acceso restringido únicamente al Administrador de la App.',
    });
    return;
  }
  req.authUser = user;
  next();
}

function requireActiveServiceOrAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const serviceStatus = readServiceStatus();
  if (serviceStatus.status === 'Suspendido' && (!req.authUser || !isAppAdminRole(req.authUser.rol))) {
    res.status(423).json({
      error: serviceStatus.message,
      code: 'SERVICE_SUSPENDED',
      serviceStatus,
    });
    return;
  }
  next();
}

function wmoCodeToSpanish(code: number): string {
  if (code === 0) return 'Despejado';
  if (code <= 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (code <= 48) return 'Neblina matinal';
  if (code <= 57) return 'Llovizna';
  if (code <= 67) return 'Lluvia';
  if (code <= 77) return 'Nieve / Agua-nieve';
  if (code <= 82) return 'Chubascos';
  return 'Tormenta / Inestable';
}

function degreesToCardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
  return dirs[Math.round(deg / 45) % 8] || 'N';
}

async function fetchWeatherSnapshot(lat: number, lng: number, locationName: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.VITE_GOOGLE_MAPS_API_KEY || '';
  let googleQuotaExceeded = false;

  if (apiKey) {
    try {
      const currentUrl = new URL('https://weather.googleapis.com/v1/currentConditions:lookup');
      currentUrl.searchParams.set('key', apiKey);
      currentUrl.searchParams.set('location.latitude', String(lat));
      currentUrl.searchParams.set('location.longitude', String(lng));

      const forecastUrl = new URL('https://weather.googleapis.com/v1/forecast/days:lookup');
      forecastUrl.searchParams.set('key', apiKey);
      forecastUrl.searchParams.set('location.latitude', String(lat));
      forecastUrl.searchParams.set('location.longitude', String(lng));
      forecastUrl.searchParams.set('days', '7');

      const [curRes, fcRes] = await Promise.all([
        fetch(currentUrl.toString(), {
          headers: { 'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio' },
        }),
        fetch(forecastUrl.toString(), {
          headers: { 'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio' },
        }),
      ]);

      if (curRes.status === 429 || fcRes.status === 429) {
        googleQuotaExceeded = true;
      }

      if (curRes.ok && fcRes.ok) {
        const cur = (await curRes.json()) as Record<string, any>;
        const fc = (await fcRes.json()) as Record<string, any>;

        const forecastDays = Array.isArray(fc.forecastDays) ? fc.forecastDays : [];
        return {
          source: 'google-weather' as const,
          locationName,
          lat,
          lng,
          observedAt: cur.currentTime || new Date().toISOString(),
          tempC: Number(cur.temperature?.degrees ?? 12),
          feelsLikeC: Number(cur.feelsLikeTemperature?.degrees ?? cur.temperature?.degrees ?? 12),
          humidityPct: Number(cur.relativeHumidity ?? 70),
          windKmH: Number(cur.wind?.speed?.value ?? 6),
          windDirection: String(cur.wind?.direction?.cardinal ?? 'SO'),
          precipMm24h: Number(cur.currentConditionsHistory?.qpf?.quantity ?? 0),
          conditionText: String(cur.weatherCondition?.description?.text ?? 'Variable'),
          uvIndex: Number(cur.uvIndex ?? 2),
          dewPointC: Number(cur.dewPoint?.degrees ?? 6),
          forecast: forecastDays.map((d: any) => ({
            date: `${d.displayDate?.year}-${String(d.displayDate?.month).padStart(2, '0')}-${String(
              d.displayDate?.day
            ).padStart(2, '0')}`,
            conditionText: String(d.daytimeForecast?.weatherCondition?.description?.text ?? 'Variable'),
            tempMaxC: Number(d.maxTemperature?.degrees ?? 18),
            tempMinC: Number(d.minTemperature?.degrees ?? 5),
            precipProbPct: Number(d.daytimeForecast?.precipitation?.probability?.percent ?? 0),
            precipMm: Number(d.daytimeForecast?.precipitation?.qpf?.quantity ?? 0),
            windMaxKmH: Number(d.daytimeForecast?.wind?.speed?.value ?? 8),
            humidityPct: Number(d.daytimeForecast?.relativeHumidity ?? 70),
          })),
        };
      } else {
        const errBody = await (!curRes.ok ? curRes : fcRes).text().catch(() => '');
        if (errBody.includes('RESOURCE_EXHAUSTED')) {
          googleQuotaExceeded = true;
        }
      }
    } catch {
      // Fallback to Open-Meteo for Panguipulli coordinates
    }
  }

  const omUrl = new URL('https://api.open-meteo.com/v1/forecast');
  omUrl.searchParams.set('latitude', String(lat));
  omUrl.searchParams.set('longitude', String(lng));
  omUrl.searchParams.set(
    'current',
    'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,dew_point_2m'
  );
  omUrl.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean'
  );
  omUrl.searchParams.set('timezone', 'America/Santiago');

  const omRes = await fetch(omUrl.toString());
  if (!omRes.ok) {
    throw new Error('No fue posible obtener datos meteorológicos.');
  }
  const om = (await omRes.json()) as Record<string, any>;
  const current = om.current || {};
  const daily = om.daily || {};
  const dates: string[] = Array.isArray(daily.time) ? daily.time : [];

  return {
    source: 'open-meteo' as const,
    quotaExceeded: googleQuotaExceeded,
    locationName,
    lat,
    lng,
    observedAt: String(current.time || new Date().toISOString()),
    tempC: Number(current.temperature_2m ?? 12.5),
    feelsLikeC: Number(current.apparent_temperature ?? 12.0),
    humidityPct: Number(current.relative_humidity_2m ?? 74),
    windKmH: Number(current.wind_speed_10m ?? 5.5),
    windDirection: degreesToCardinal(Number(current.wind_direction_10m ?? 225)),
    precipMm24h: Number(current.precipitation ?? 0),
    conditionText: wmoCodeToSpanish(Number(current.weather_code ?? 2)),
    uvIndex: 4,
    dewPointC: Number(current.dew_point_2m ?? 7.5),
    forecast: dates.slice(0, 7).map((date, idx) => ({
      date,
      conditionText: wmoCodeToSpanish(Number(daily.weather_code?.[idx] ?? 2)),
      tempMaxC: Number(daily.temperature_2m_max?.[idx] ?? 18),
      tempMinC: Number(daily.temperature_2m_min?.[idx] ?? 5),
      precipProbPct: Number(daily.precipitation_probability_max?.[idx] ?? 10),
      precipMm: Number(daily.precipitation_sum?.[idx] ?? 0),
      windMaxKmH: Number(daily.wind_speed_10m_max?.[idx] ?? 10),
      humidityPct: Number(daily.relative_humidity_2m_mean?.[idx] ?? 72),
    })),
  };
}

async function startServer() {
  ensureInitialAdminAccounts();
  const app = express();
  app.use(express.json({ limit: '6mb' }));

  // Auth status
  app.get('/api/auth/status', (req, res) => {
    const store = readAuthStore();
    const hasEnvAdmin = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
    const hasAdmin = store.users.some((u) => isAppAdminRole(u.rol) && u.activo);
    const needsSetup = !hasAdmin && !hasEnvAdmin;
    const sessionUser = resolveSessionUser(req);
    let empresaInfo: Record<string, unknown> | null = null;
    try {
      if (fs.existsSync(CUADERNO_FILE)) {
        const parsed = JSON.parse(fs.readFileSync(CUADERNO_FILE, 'utf8')) as {
          empresaInfo?: Record<string, unknown>;
        };
        if (parsed?.empresaInfo && typeof parsed.empresaInfo === 'object') {
          const e = parsed.empresaInfo;
          empresaInfo = {
            razonSocial: e.razonSocial,
            nombreCorto: e.nombreCorto,
            rut: e.rut,
            referencia: e.referencia,
            domicilio: e.domicilio,
            comuna: e.comuna,
          };
        }
      }
    } catch {
      // Ignore malformed cuaderno file
    }
    res.json({
      needsSetup,
      user: sessionUser ? toPublicUser(sessionUser) : null,
      empresaInfo,
      serviceStatus: readServiceStatus(),
    });
  });

  // First-run admin setup
  app.post('/api/auth/setup', (req, res) => {
    const store = readAuthStore();
    const hasEnvAdmin = Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim());
    const hasAdmin = store.users.some((u) => isAppAdminRole(u.rol) && u.activo);
    if (hasAdmin || hasEnvAdmin) {
      res.status(409).json({ error: 'La cuenta Administrador ya fue configurada.' });
      return;
    }

    const { username, email, rut, nombre, cargo, password } = req.body as Record<
      string,
      string
    >;

    const cleanEmail = email?.trim().toLowerCase() || '';
    const cleanRut = rut?.trim() ? formatRutDisplay(rut) : '';

    if ((!cleanEmail && !cleanRut && !username?.trim()) || !nombre?.trim() || !password || password.length < 4) {
      res.status(400).json({
        error: 'Ingresa nombre completo, correo electrónico o RUT y una clave de al menos 4 caracteres.',
      });
      return;
    }

    const derivedUsername =
      username?.trim().toLowerCase() || cleanEmail || normalizeRut(cleanRut) || 'admin';

    const adminUser: StoredUser = {
      id: `usr-${Date.now()}`,
      username: derivedUsername,
      email: cleanEmail,
      rut: cleanRut,
      nombre: nombre.trim(),
      rol: 'Administrador de la App',
      cargo: cargo?.trim() || 'Administrador de la App',
      activo: true,
      nivelAcceso: 'Total',
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };

    store.users.push(adminUser);
    writeAuthStore(store);

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId: adminUser.id, createdAt: Date.now() });
    res.json({
      token,
      user: toPublicUser(adminUser),
      serviceStatus: readServiceStatus(),
    });
  });

  // Login by Email, RUT or Username
  app.post('/api/auth/login', (req, res) => {
    const { identifier, username, password } = req.body as Record<string, string>;
    const rawLogin = (identifier || username || '').trim();
    if (!rawLogin || !password) {
      res.status(400).json({ error: 'Ingresa tu correo o RUT y tu clave de acceso.' });
      return;
    }

    const normalizedText = rawLogin.toLowerCase();
    const normalizedRutInput = normalizeRut(rawLogin);
    const store = readAuthStore();
    const envAdminPass = process.env.ADMIN_PASSCODE?.trim();

    if (
      envAdminPass &&
      (normalizedText === 'admin' ||
        normalizedText === 'administrador' ||
        normalizedText.includes('@') ||
        normalizedRutInput.length >= 7) &&
      password === envAdminPass
    ) {
      let adminUser =
        store.users.find(
          (u) =>
            isAppAdminRole(u.rol) &&
            u.activo &&
            ((u.email && u.email.toLowerCase() === normalizedText) ||
              (u.rut && normalizedRutInput.length >= 7 && normalizeRut(u.rut) === normalizedRutInput) ||
              (u.username && u.username.toLowerCase() === normalizedText))
        ) || store.users.find((u) => isAppAdminRole(u.rol) && u.activo);
      if (!adminUser) {
        adminUser = {
          id: 'usr-admin-env',
          username: 'admin',
          email: normalizedText.includes('@') ? normalizedText : '',
          rut: normalizedRutInput.length >= 7 && !normalizedText.includes('@') ? formatRutDisplay(rawLogin) : '',
          nombre: 'Administrador General',
          rol: 'Administrador de la App',
          cargo: 'Administración Agrícola Queñi',
          activo: true,
          nivelAcceso: 'Total',
          passwordHash: hashPassword(envAdminPass),
          createdAt: new Date().toISOString(),
        };
        store.users.unshift(adminUser);
        writeAuthStore(store);
      }
      const token = crypto.randomBytes(32).toString('hex');
      sessions.set(token, { userId: adminUser.id, createdAt: Date.now() });
      res.json({
        token,
        user: toPublicUser(adminUser),
        serviceStatus: readServiceStatus(),
      });
      return;
    }

    const found = store.users.find((u) => {
      if (u.email && u.email.toLowerCase() === normalizedText) return true;
      if (u.rut && normalizedRutInput.length >= 7 && normalizeRut(u.rut) === normalizedRutInput) {
        return true;
      }
      if (u.username && u.username.toLowerCase() === normalizedText) return true;
      return false;
    });

    if (!found || !found.activo || !verifyPassword(password, found.passwordHash)) {
      res.status(401).json({ error: 'Correo/RUT o clave incorrectos.' });
      return;
    }

    const serviceStatus = readServiceStatus();
    if (serviceStatus.status === 'Suspendido' && !isAppAdminRole(found.rol)) {
      res.status(423).json({
        error: serviceStatus.message,
        code: 'SERVICE_SUSPENDED',
        serviceStatus,
      });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, { userId: found.id, createdAt: Date.now() });
    res.json({ token, user: toPublicUser(found), serviceStatus });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = getBearerToken(req);
    if (token) sessions.delete(token);
    res.json({ ok: true });
  });

  // Superadmin-only service status / maintenance control
  app.put('/api/service-status', requireAdmin, (req: AuthedRequest, res) => {
    const { status, message } = req.body as { status?: unknown; message?: unknown };
    if (status !== 'Activo' && status !== 'Suspendido') {
      res.status(400).json({ error: 'El estado del servicio debe ser Activo o Suspendido.' });
      return;
    }
    const sanitizedMessage =
      typeof message === 'string' && message.trim()
        ? message.trim().slice(0, 500)
        : DEFAULT_SERVICE_STATUS.message;

    const nextStatus: ServiceStatusConfig = {
      status,
      message: sanitizedMessage,
      updatedAt: new Date().toISOString(),
      updatedBy: req.authUser?.nombre || req.authUser?.email || 'Superadministrador',
    };
    writeServiceStatus(nextStatus);
    res.json({ serviceStatus: nextStatus });
  });

  // Operational staff directory with applicator/tractorista licenses (safe public fields only)
  app.get('/api/personal-habilitado', requireAuth, requireActiveServiceOrAdmin, (_req, res) => {
    const store = readAuthStore();
    res.json({
      personal: store.users
        .filter((u) => u.activo)
        .map((u) => ({
          id: u.id,
          nombre: u.nombre,
          cargo: u.cargo,
          rol: u.rol,
          activo: u.activo,
          requiereCarnetAplicador: Boolean(u.requiereCarnetAplicador),
          carnetAplicadorNumero: u.carnetAplicadorNumero || '',
          carnetAplicadorVencimiento: u.carnetAplicadorVencimiento || '',
          requiereCarnetTractorista: Boolean(u.requiereCarnetTractorista),
          carnetTractoristaNumero: u.carnetTractoristaNumero || '',
          carnetTractoristaVencimiento: u.carnetTractoristaVencimiento || '',
        })),
    });
  });

  // Admin-only Users Management (returns decrypted passwords ONLY to Administrador de la App)
  app.get('/api/users', requireAdmin, (_req, res) => {
    const store = readAuthStore();
    res.json({
      users: store.users.map((u) => ({
        ...toPublicUser(u),
        claveVisible: u.encryptedPassword ? decryptSecret(u.encryptedPassword) : undefined,
        createdAt: u.createdAt,
      })),
    });
  });

  app.post('/api/users', requireAdmin, (req, res) => {
    const {
      username,
      email,
      rut,
      nombre,
      rol,
      cargo,
      password,
      nivelAcceso,
      permisos,
      requiereCarnetAplicador,
      carnetAplicadorNumero,
      carnetAplicadorVencimiento,
      requiereCarnetTractorista,
      carnetTractoristaNumero,
      carnetTractoristaVencimiento,
    } = req.body as Record<string, any>;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanRutRaw = String(rut || '').trim();
    const cleanRutNorm = normalizeRut(cleanRutRaw);
    const cleanRutFormatted = cleanRutNorm ? formatRutDisplay(cleanRutRaw) : '';

    if ((!cleanEmail && !cleanRutNorm && !username?.trim()) || !String(nombre || '').trim()) {
      res.status(400).json({
        error: 'Nombre completo y al menos correo electrónico o RUT son obligatorios.',
      });
      return;
    }
    if (!password || String(password).length < 4) {
      res.status(400).json({ error: 'La clave debe tener al menos 4 caracteres.' });
      return;
    }
    if (!VALID_ROLES.includes(rol as UserRole)) {
      res.status(400).json({ error: 'Tipo de usuario o rol inválido.' });
      return;
    }

    const store = readAuthStore();
    if (cleanEmail && store.users.some((u) => u.email?.toLowerCase() === cleanEmail)) {
      res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo electrónico.' });
      return;
    }
    if (
      cleanRutNorm &&
      store.users.some((u) => u.rut && normalizeRut(u.rut) === cleanRutNorm)
    ) {
      res.status(409).json({ error: 'Ya existe un usuario registrado con ese RUT.' });
      return;
    }

    const derivedUsername =
      String(username || '').trim().toLowerCase() || cleanEmail || cleanRutNorm;

    const newUser: StoredUser = {
      id: `usr-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      username: derivedUsername,
      email: cleanEmail,
      rut: cleanRutFormatted,
      nombre: String(nombre).trim(),
      rol: rol as UserRole,
      cargo: String(cargo || '').trim() || rol,
      activo: true,
      nivelAcceso: nivelAcceso as NivelGlobalAcceso | undefined,
      permisos: sanitizePermisos(permisos, rol as UserRole),
      requiereCarnetAplicador: Boolean(requiereCarnetAplicador),
      carnetAplicadorNumero: String(carnetAplicadorNumero || '').trim(),
      carnetAplicadorVencimiento: String(carnetAplicadorVencimiento || '').trim(),
      requiereCarnetTractorista: Boolean(requiereCarnetTractorista),
      carnetTractoristaNumero: String(carnetTractoristaNumero || '').trim(),
      carnetTractoristaVencimiento: String(carnetTractoristaVencimiento || '').trim(),
      passwordHash: hashPassword(String(password)),
      encryptedPassword: encryptSecret(String(password)),
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    writeAuthStore(store);

    res.status(201).json({
      user: {
        ...toPublicUser(newUser),
        claveVisible: String(password),
        createdAt: newUser.createdAt,
      },
    });
  });

  app.put('/api/users/:id', requireAdmin, (req, res) => {
    const { id } = req.params;
    const {
      email,
      rut,
      nombre,
      rol,
      cargo,
      activo,
      password,
      nivelAcceso,
      permisos,
      requiereCarnetAplicador,
      carnetAplicadorNumero,
      carnetAplicadorVencimiento,
      requiereCarnetTractorista,
      carnetTractoristaNumero,
      carnetTractoristaVencimiento,
    } = req.body as Record<string, any>;

    const store = readAuthStore();
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const current = store.users[idx];
    const nextRol = (rol as UserRole) || current.rol;
    if (!VALID_ROLES.includes(nextRol)) {
      res.status(400).json({ error: 'Rol inválido.' });
      return;
    }
    const nextActivo = typeof activo === 'boolean' ? activo : current.activo;

    const activeAdmins = store.users.filter(
      (u) => isAppAdminRole(u.rol) && u.activo && u.id !== id
    );
    if (
      isAppAdminRole(current.rol) &&
      (!isAppAdminRole(nextRol) || !nextActivo) &&
      activeAdmins.length === 0
    ) {
      res.status(400).json({ error: 'Debe quedar al menos un Administrador de la App activo.' });
      return;
    }

    const nextEmail = email !== undefined ? String(email).trim().toLowerCase() : current.email;
    const nextRutNorm = rut !== undefined ? normalizeRut(String(rut)) : normalizeRut(current.rut || '');
    const nextRut =
      rut !== undefined ? (nextRutNorm ? formatRutDisplay(String(rut)) : '') : current.rut;

    if (
      nextEmail &&
      store.users.some((u) => u.id !== id && u.email?.toLowerCase() === nextEmail)
    ) {
      res.status(409).json({ error: 'Ya existe otro usuario con ese correo electrónico.' });
      return;
    }
    if (
      nextRutNorm &&
      store.users.some((u) => u.id !== id && u.rut && normalizeRut(u.rut) === nextRutNorm)
    ) {
      res.status(409).json({ error: 'Ya existe otro usuario con ese RUT.' });
      return;
    }

    const updated: StoredUser = {
      ...current,
      email: nextEmail,
      rut: nextRut,
      nombre: nombre?.trim() || current.nombre,
      rol: nextRol,
      cargo: cargo !== undefined ? String(cargo).trim() || nextRol : current.cargo,
      activo: nextActivo,
      nivelAcceso: nivelAcceso !== undefined ? nivelAcceso : current.nivelAcceso,
      permisos:
        permisos !== undefined ? sanitizePermisos(permisos, nextRol) : current.permisos,
      requiereCarnetAplicador:
        typeof requiereCarnetAplicador === 'boolean'
          ? requiereCarnetAplicador
          : current.requiereCarnetAplicador,
      carnetAplicadorNumero:
        carnetAplicadorNumero !== undefined
          ? String(carnetAplicadorNumero).trim()
          : current.carnetAplicadorNumero,
      carnetAplicadorVencimiento:
        carnetAplicadorVencimiento !== undefined
          ? String(carnetAplicadorVencimiento).trim()
          : current.carnetAplicadorVencimiento,
      requiereCarnetTractorista:
        typeof requiereCarnetTractorista === 'boolean'
          ? requiereCarnetTractorista
          : current.requiereCarnetTractorista,
      carnetTractoristaNumero:
        carnetTractoristaNumero !== undefined
          ? String(carnetTractoristaNumero).trim()
          : current.carnetTractoristaNumero,
      carnetTractoristaVencimiento:
        carnetTractoristaVencimiento !== undefined
          ? String(carnetTractoristaVencimiento).trim()
          : current.carnetTractoristaVencimiento,
      passwordHash:
        password && String(password).length >= 4 ? hashPassword(String(password)) : current.passwordHash,
      encryptedPassword:
        password && String(password).length >= 4
          ? encryptSecret(String(password))
          : current.encryptedPassword,
    };

    store.users[idx] = updated;
    writeAuthStore(store);

    res.json({
      user: {
        ...toPublicUser(updated),
        claveVisible: updated.encryptedPassword ? decryptSecret(updated.encryptedPassword) : undefined,
        createdAt: updated.createdAt,
      },
    });
  });

  app.delete('/api/users/:id', requireAdmin, (req: AuthedRequest, res) => {
    const { id } = req.params;
    if (req.authUser?.id === id) {
      res.status(400).json({ error: 'No puedes eliminar tu propia cuenta activa.' });
      return;
    }

    const store = readAuthStore();
    const target = store.users.find((u) => u.id === id);
    if (!target) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const remainingAdmins = store.users.filter(
      (u) => u.id !== id && isAppAdminRole(u.rol) && u.activo
    );
    if (isAppAdminRole(target.rol) && remainingAdmins.length === 0) {
      res.status(400).json({ error: 'Debe permanecer al menos un Administrador de la App activo.' });
      return;
    }

    store.users = store.users.filter((u) => u.id !== id);
    writeAuthStore(store);

    for (const [token, sess] of sessions.entries()) {
      if (sess.userId === id) sessions.delete(token);
    }

    res.json({ ok: true });
  });

  // Cuaderno state persistence
  app.get('/api/cuaderno', requireAuth, requireActiveServiceOrAdmin, (_req, res) => {
    ensureDataDir();
    if (!fs.existsSync(CUADERNO_FILE)) {
      res.json({ state: null });
      return;
    }
    try {
      const raw = fs.readFileSync(CUADERNO_FILE, 'utf8');
      res.json({ state: JSON.parse(raw) });
    } catch {
      res.json({ state: null });
    }
  });

  app.put('/api/cuaderno', requireAuth, requireActiveServiceOrAdmin, (req: AuthedRequest, res) => {
    if (req.authUser && !hasAnyEditPermission(req.authUser)) {
      res.status(403).json({ error: 'Tu nivel de acceso es de solo lectura.' });
      return;
    }
    const { state } = req.body as { state?: unknown };
    if (!state || typeof state !== 'object') {
      res.status(400).json({ error: 'Datos de cuaderno inválidos.' });
      return;
    }
    ensureDataDir();
    fs.writeFileSync(CUADERNO_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
    res.json({ ok: true });
  });

  // Google Maps runtime key config
  app.get('/api/maps-config', requireAuth, requireActiveServiceOrAdmin, (_req, res) => {
    const apiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({ apiKey });
  });

  // Georeferenced weather endpoint
  app.get('/api/weather', requireAuth, requireActiveServiceOrAdmin, async (req, res) => {
    const lat = Number(req.query.lat ?? -39.708);
    const lng = Number(req.query.lng ?? -72.385);
    const locationName = String(req.query.name ?? 'Agrícola Queñi, Panguipulli');

    if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      res.status(400).json({ error: 'Coordenadas geográficas inválidas.' });
      return;
    }

    try {
      const snapshot = await fetchWeatherSnapshot(lat, lng, locationName);
      res.json(snapshot);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Error consultando pronóstico climático.',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Agrícola Queñi server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
