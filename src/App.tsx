import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import {
  AgricolaInfo,
  AnalisisSueloAgua,
  AplicacionFitosanitaria,
  AuthUserSession,
  BodegaItem,
  CategoriaBodega,
  CuadernoState,
  Cuartel,
  CultivoConfig,
  EstadoLabor,
  EstadoOrdenAplicacion,
  EventoHelada,
  LaborAgricola,
  LatLngPoint,
  LotePostcosecha,
  MaquinaEquipo,
  MonitoreoPlaga,
  MovimientoBodega,
  MovimientoCostoExtra,
  NavSection,
  OrdenAplicacion,
  PersonalHabilitadoItem,
  ProgramaFertirriego,
  PuntoMapa,
  RegistroClimaManual,
  RegistroCosecha,
  RegistroCuadrilla,
  RegistroMaquinaria,
  RegistroRiego,
  SectorRiego,
  ServiceStatusConfig,
  WeatherSnapshot,
} from './types/fieldbook';
import {
  AGRICOLA_INFO,
  createInitialCuadernoState,
  setActiveAgricolaInfo,
} from './data/initialData';
import {
  downloadJSON,
  exportRowsToCSV,
  formatDateCL,
  getCarenciaStatus,
  getTodayISO,
} from './utils/formatters';
import { canEditModule, getAllowedSectionsForUser, isAppAdmin } from './utils/rbac';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  OfflineQueueEntry,
  clearOfflineQueue,
  loadOfflineQueue,
  pushOfflineQueueEntry,
} from './utils/offlineQueue';
import {
  getSavedFrostThreshold,
  loadCachedWeather,
  saveCachedWeather,
  saveFrostThreshold,
} from './utils/alertsEngine';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { LoginScreen } from './components/LoginScreen';
import { ServiceBlockedScreen } from './components/ServiceBlockedScreen';
import { UserAccountModal } from './components/UserAccountModal';
import { AgricolaInfoModal } from './components/AgricolaInfoModal';
import { OverviewSection } from './components/OverviewSection';
import { MapSection } from './components/MapSection';
import { LaboresSection } from './components/LaboresSection';
import { OrdenesAplicacionSection } from './components/OrdenesAplicacionSection';
import { AplicacionesSection } from './components/AplicacionesSection';
import { BodegaSection } from './components/BodegaSection';
import { RiegoClimaPlagasSection } from './components/RiegoClimaPlagasSection';
import { CosechaSection } from './components/CosechaSection';
import { CultivosMaquinariaSection } from './components/CultivosMaquinariaSection';
import { AdminUsuariosSection } from './components/AdminUsuariosSection';
import { HeladasSection, PostcosechaSection } from './components/HeladasPostcosechaSection';
import { CuadrillasSection } from './components/CuadrillasCertificacionesSection';
import { SuelosFertirriegoSection, CostosRentabilidadSection } from './components/SuelosCostosSection';
import {
  AplicacionModal,
  BackupModal,
  BodegaItemModal,
  ClimaManualModal,
  CosechaModal,
  CuartelModal,
  CultivoModal,
  LaborModal,
  MaquinaModal,
  MaquinariaModal,
  MovimientoKardexModal,
  OrdenAplicacionModal,
  PlagaModal,
  RiegoModal,
  SectorRiegoModal,
} from './components/Modals';

const STORAGE_KEY = 'agricola_queni_cuaderno_v3';
const THEME_KEY = 'agricola_queni_theme_v1';
const DEFAULT_SERVICE_STATUS: ServiceStatusConfig = {
  status: 'Activo',
  message: 'Acceso temporalmente suspendido. Contacte al administrador del sistema.',
  updatedAt: '',
};

function mergeWithDefaults(raw: Partial<CuadernoState> | null | undefined): CuadernoState {
  const seed = createInitialCuadernoState();
  if (!raw || typeof raw !== 'object') return seed;
  return {
    empresaInfo: raw.empresaInfo
      ? {
          ...AGRICOLA_INFO,
          ...raw.empresaInfo,
          defaultCenter: {
            lat: Number(raw.empresaInfo.defaultCenter?.lat ?? AGRICOLA_INFO.defaultCenter.lat),
            lng: Number(raw.empresaInfo.defaultCenter?.lng ?? AGRICOLA_INFO.defaultCenter.lng),
          },
        }
      : seed.empresaInfo,
    cultivos: Array.isArray(raw.cultivos) && raw.cultivos.length > 0 ? raw.cultivos : seed.cultivos,
    cuarteles: Array.isArray(raw.cuarteles) ? raw.cuarteles : seed.cuarteles,
    puntosMapa: Array.isArray(raw.puntosMapa) ? raw.puntosMapa : seed.puntosMapa,
    labores: Array.isArray(raw.labores) ? raw.labores : seed.labores,
    bodega: Array.isArray(raw.bodega) ? raw.bodega : seed.bodega,
    movimientosBodega: Array.isArray(raw.movimientosBodega) ? raw.movimientosBodega : seed.movimientosBodega,
    ordenesAplicacion: Array.isArray(raw.ordenesAplicacion) ? raw.ordenesAplicacion : seed.ordenesAplicacion,
    aplicaciones: Array.isArray(raw.aplicaciones) ? raw.aplicaciones : seed.aplicaciones,
    cosechas: Array.isArray(raw.cosechas) ? raw.cosechas : seed.cosechas,
    sectoresRiego: Array.isArray(raw.sectoresRiego) ? raw.sectoresRiego : seed.sectoresRiego,
    riegos: Array.isArray(raw.riegos) ? raw.riegos : seed.riegos,
    plagas: Array.isArray(raw.plagas) ? raw.plagas : seed.plagas,
    climaRegistros: Array.isArray(raw.climaRegistros) ? raw.climaRegistros : seed.climaRegistros,
    maquinas: Array.isArray(raw.maquinas) ? raw.maquinas : seed.maquinas,
    maquinaria: Array.isArray(raw.maquinaria) ? raw.maquinaria : seed.maquinaria,
    heladas: Array.isArray(raw.heladas) ? raw.heladas : seed.heladas,
    postcosecha: Array.isArray(raw.postcosecha) ? raw.postcosecha : seed.postcosecha,
    cuadrillas: Array.isArray(raw.cuadrillas) ? raw.cuadrillas : seed.cuadrillas,
    suelosAnalisis: Array.isArray(raw.suelosAnalisis) ? raw.suelosAnalisis : seed.suelosAnalisis,
    programasFertirriego: Array.isArray(raw.programasFertirriego) ? raw.programasFertirriego : seed.programasFertirriego,
    costosExtras: Array.isArray(raw.costosExtras) ? raw.costosExtras : seed.costosExtras,
  };
}

function loadLocalBackup(): CuadernoState {
  try {
    localStorage.removeItem('agricola_queni_cuaderno_v2');
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return mergeWithDefaults(JSON.parse(raw));
    }
  } catch {
    // Fallback to clean state
  }
  return createInitialCuadernoState();
}

export default function App() {
  // Auth state kept strictly in React memory (never persisted to localStorage)
  const [authChecking, setAuthChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [publicEmpresaInfo, setPublicEmpresaInfo] = useState<AgricolaInfo | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatusConfig>(DEFAULT_SERVICE_STATUS);
  const [reactivatingService, setReactivatingService] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUserSession | null>(null);
  const isAdminRecoveryRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.replace(/\/+$/, '') === '/admin-servicio';

  // Maps & quota state
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);

  // App state
  const isOnline = useOnlineStatus();
  const [state, setState] = useState<CuadernoState>(loadLocalBackup);
  const [personalHabilitado, setPersonalHabilitado] = useState<PersonalHabilitadoItem[]>([]);
  const [serverSynced, setServerSynced] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueEntry[]>(loadOfflineQueue);
  const [offlineSyncing, setOfflineSyncing] = useState(false);
  const [justSyncedMessage, setJustSyncedMessage] = useState<string | null>(null);
  const [weatherSnapshot, setWeatherSnapshot] = useState<WeatherSnapshot | null>(
    loadCachedWeather
  );
  const [frostThresholdC, setFrostThresholdC] = useState<number>(getSavedFrostThreshold);
  const focusedQrTarget = useMemo<{ type: string; id: string } | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = new URLSearchParams(window.location.search).get('qr');
    if (!raw) return null;
    const idx = raw.indexOf(':');
    if (idx <= 0) return null;
    return { type: raw.slice(0, idx), id: raw.slice(idx + 1) };
  }, []);
  const [activeSection, setActiveSection] = useState<NavSection>('resumen');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [empresaModalOpen, setEmpresaModalOpen] = useState(false);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  // Modals
  const [laborModal, setLaborModal] = useState<{ open: boolean; editing: LaborAgricola | null }>({
    open: false,
    editing: null,
  });
  const [apModal, setApModal] = useState<{ open: boolean; editing: AplicacionFitosanitaria | null }>({
    open: false,
    editing: null,
  });
  const [cosechaModal, setCosechaModal] = useState<{
    open: boolean;
    editing: RegistroCosecha | null;
    defaultCultivo?: string;
  }>({
    open: false,
    editing: null,
  });
  const [cuartelModal, setCuartelModal] = useState<{
    open: boolean;
    editing: Cuartel | null;
    presetPolygon?: { polygon: LatLngPoint[]; areaHa: number; center: LatLngPoint } | null;
    presetCenter?: LatLngPoint | null;
  }>({
    open: false,
    editing: null,
  });
  const [bodegaModal, setBodegaModal] = useState<{
    open: boolean;
    editing: BodegaItem | null;
    defaultCat?: CategoriaBodega;
  }>({
    open: false,
    editing: null,
  });
  const [ordenModal, setOrdenModal] = useState<{
    open: boolean;
    editing?: OrdenAplicacion | null;
    presetFromPlaga?: MonitoreoPlaga | null;
  }>({
    open: false,
    editing: null,
    presetFromPlaga: null,
  });
  const [riegoModal, setRiegoModal] = useState<{ open: boolean; editing: RegistroRiego | null }>({
    open: false,
    editing: null,
  });
  const [sectorRiegoModal, setSectorRiegoModal] = useState<{
    open: boolean;
    editing: SectorRiego | null;
  }>({
    open: false,
    editing: null,
  });
  const [plagaModal, setPlagaModal] = useState<{ open: boolean; editing: MonitoreoPlaga | null }>({
    open: false,
    editing: null,
  });
  const [climaModal, setClimaModal] = useState<{
    open: boolean;
    editing: RegistroClimaManual | null;
    coords: { lat: number; lng: number; name: string };
  }>({
    open: false,
    editing: null,
    coords: {
      lat: AGRICOLA_INFO.defaultCenter.lat,
      lng: AGRICOLA_INFO.defaultCenter.lng,
      name: 'Agrícola Queñi, Panguipulli',
    },
  });
  const [cultivoModal, setCultivoModal] = useState<{
    open: boolean;
    editing: CultivoConfig | null;
  }>({
    open: false,
    editing: null,
  });
  const [kardexModal, setKardexModal] = useState<{
    open: boolean;
    editing: MovimientoBodega | null;
  }>({
    open: false,
    editing: null,
  });
  const [maquinaModal, setMaquinaModal] = useState<{ open: boolean; editing: MaquinaEquipo | null }>({
    open: false,
    editing: null,
  });
  const [maqModal, setMaqModal] = useState<{ open: boolean; editing: RegistroMaquinaria | null }>({
    open: false,
    editing: null,
  });
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [createTriggers, setCreateTriggers] = useState<Partial<Record<NavSection, number>>>({});
  const triggerSectionCreate = (sec: NavSection) =>
    setCreateTriggers((prev) => ({ ...prev, [sec]: (prev[sec] || 0) + 1 }));

  // Listen for Google Maps Platform quota/auth failure events
  useEffect(() => {
    const handler = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handler);
    return () => window.removeEventListener('gmp-quota-exceeded', handler);
  }, []);

  // Check initial auth & service status + keep in sync for active sessions
  const refreshServiceStatus = useCallback(() => {
    fetch('/api/auth/status', {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    })
      .then((res) => res.json())
      .then((data) => {
        setNeedsSetup(Boolean(data.needsSetup));
        if (data.empresaInfo) {
          setPublicEmpresaInfo(data.empresaInfo);
        }
        if (data.serviceStatus) {
          setServiceStatus(data.serviceStatus);
        }
      })
      .catch(() => {
        // Offline / fallback
      })
      .finally(() => {
        setAuthChecking(false);
      });
  }, [authToken]);

  useEffect(() => {
    refreshServiceStatus();
    const interval = window.setInterval(refreshServiceStatus, 10000);
    const onFocus = () => refreshServiceStatus();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshServiceStatus]);

  const refreshPersonalHabilitado = useCallback(() => {
    if (!authToken) return;
    fetch('/api/personal-habilitado', {
      headers: { Authorization: `Bearer ${authToken}` },
    })
      .then(async (r) => {
        if (r.status === 423) {
          const errData = await r.json().catch(() => ({}));
          if (errData?.serviceStatus) setServiceStatus(errData.serviceStatus);
          return { personal: [] };
        }
        return r.ok ? r.json() : { personal: [] };
      })
      .then((data) => {
        if (Array.isArray(data?.personal)) {
          setPersonalHabilitado(data.personal);
        }
      })
      .catch(() => {});
  }, [authToken]);

  // Fetch server state, maps key & staff licenses once authenticated
  useEffect(() => {
    if (!authToken || !authUser) return;
    if (serviceStatus.status === 'Suspendido' && !isAppAdmin(authUser.rol)) return;
    let active = true;

    Promise.all([
      fetch('/api/cuaderno', { headers: { Authorization: `Bearer ${authToken}` } }).then(async (r) => {
        if (r.status === 423) {
          const errData = await r.json().catch(() => ({}));
          return { blocked: true, serviceStatus: errData?.serviceStatus, state: null };
        }
        return r.ok ? r.json() : { state: null };
      }),
      fetch('/api/maps-config', { headers: { Authorization: `Bearer ${authToken}` } }).then((r) =>
        r.ok ? r.json() : { apiKey: '' }
      ),
      fetch('/api/personal-habilitado', {
        headers: { Authorization: `Bearer ${authToken}` },
      }).then((r) => (r.ok ? r.json() : { personal: [] })),
    ])
      .then(([cuadernoData, mapsData, personalData]) => {
        if (!active) return;
        if (cuadernoData?.blocked) {
          if (cuadernoData.serviceStatus) {
            setServiceStatus(cuadernoData.serviceStatus);
          }
          return;
        }
        if (cuadernoData?.state && loadOfflineQueue().length === 0) {
          const merged = mergeWithDefaults(cuadernoData.state);
          lastSavedSnapshotRef.current = JSON.stringify(merged);
          setState(merged);
        }
        if (mapsData?.apiKey) {
          setMapsApiKey(mapsData.apiKey);
        }
        if (Array.isArray(personalData?.personal)) {
          setPersonalHabilitado(personalData.personal);
        }
        setServerSynced(true);
      })
      .catch(() => {
        if (active) setServerSynced(true);
      });

    return () => {
      active = false;
    };
  }, [authToken, authUser?.id, authUser?.rol, serviceStatus.status]);

  // Route to QR deep-link target once authenticated
  useEffect(() => {
    if (!authToken || !authUser || !focusedQrTarget) return;
    if (focusedQrTarget.type === 'cuartel') {
      setActiveSection('cuarteles');
    } else if (focusedQrTarget.type === 'lote') {
      setActiveSection('postcosecha');
    } else if (focusedQrTarget.type === 'orden') {
      setActiveSection('ordenes');
    }
  }, [authToken, authUser, focusedQrTarget]);

  // Fetch & cache Panguipulli weather snapshot when authenticated and online
  useEffect(() => {
    if (!authToken || !authUser || !isOnline) return;
    if (serviceStatus.status === 'Suspendido' && !isAppAdmin(authUser.rol)) return;
    const center = state.empresaInfo?.defaultCenter || AGRICOLA_INFO.defaultCenter;
    const name = `${state.empresaInfo?.nombreCorto || AGRICOLA_INFO.nombreCorto}, ${
      state.empresaInfo?.comuna || AGRICOLA_INFO.comuna
    }`;
    let active = true;
    fetch(
      `/api/weather?lat=${encodeURIComponent(center.lat)}&lng=${encodeURIComponent(
        center.lng
      )}&name=${encodeURIComponent(name)}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: WeatherSnapshot | null) => {
        if (active && data && typeof data.tempC === 'number') {
          setWeatherSnapshot(data);
          saveCachedWeather(data);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [
    authToken,
    authUser,
    isOnline,
    serviceStatus.status,
    state.empresaInfo?.defaultCenter?.lat,
    state.empresaInfo?.defaultCenter?.lng,
    state.empresaInfo?.nombreCorto,
    state.empresaInfo?.comuna,
  ]);

  const handleChangeFrostThreshold = useCallback((next: number) => {
    const clamped = Math.max(-10, Math.min(10, next));
    setFrostThresholdC(clamped);
    saveFrostThreshold(clamped);
  }, []);

  const syncOfflineChanges = useCallback(async () => {
    if (!authToken || !serverSynced || !isOnline || offlineSyncing) return;
    const suspendedForCurrent =
      serviceStatus.status === 'Suspendido' && (!authUser || !isAppAdmin(authUser.rol));
    if (suspendedForCurrent) return;

    setOfflineSyncing(true);
    try {
      const res = await fetch('/api/cuaderno', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ state }),
      });
      if (res.status === 423) {
        const errData = await res.json().catch(() => ({}));
        if (errData?.serviceStatus) setServiceStatus(errData.serviceStatus);
        return;
      }
      if (res.ok) {
        clearOfflineQueue();
        setOfflineQueue([]);
        setJustSyncedMessage('Cambios de terreno sincronizados con el servidor');
        window.setTimeout(() => setJustSyncedMessage(null), 4000);
      }
    } catch {
      // Keep queue intact for next retry
    } finally {
      setOfflineSyncing(false);
    }
  }, [authToken, authUser, serverSynced, isOnline, offlineSyncing, serviceStatus.status, state]);

  // Auto-sync queued offline changes as soon as signal returns
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0 && authToken && serverSynced && !offlineSyncing) {
      void syncOfflineChanges();
    }
  }, [isOnline, offlineQueue.length, authToken, serverSynced, offlineSyncing, syncOfflineChanges]);

  // Persist locally and sync to server when state changes (never overwrite when suspended for non-admin)
  const saveTimerRef = useRef<number | null>(null);
  const lastSavedSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    const suspendedForCurrent =
      serviceStatus.status === 'Suspendido' && (!authUser || !isAppAdmin(authUser.rol));
    if (suspendedForCurrent) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }

    if (!authToken || !serverSynced) {
      lastSavedSnapshotRef.current = JSON.stringify(state);
      return;
    }

    const serialized = JSON.stringify(state);
    if (lastSavedSnapshotRef.current === null) {
      lastSavedSnapshotRef.current = serialized;
      return;
    }
    if (lastSavedSnapshotRef.current === serialized) return;
    lastSavedSnapshotRef.current = serialized;

    if (!isOnline) {
      setOfflineQueue(
        pushOfflineQueueEntry(
          activeSection.toUpperCase(),
          'Registro actualizado sin conexión (pendiente de envío)'
        )
      );
      return;
    }

    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      fetch('/api/cuaderno', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: serialized ? JSON.stringify({ state }) : JSON.stringify({ state }),
      })
        .then(async (res) => {
          if (res.status === 423) {
            const errData = await res.json().catch(() => ({}));
            if (errData?.serviceStatus) setServiceStatus(errData.serviceStatus);
            return;
          }
          if (!res.ok) {
            setOfflineQueue(
              pushOfflineQueueEntry(
                activeSection.toUpperCase(),
                'Cambio pendiente de sincronización'
              )
            );
          }
        })
        .catch(() => {
          setOfflineQueue(
            pushOfflineQueueEntry(
              activeSection.toUpperCase(),
              'Guardado local por pérdida temporal de red'
            )
          );
        });
    }, 350);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [state, authToken, authUser, serverSynced, serviceStatus.status, isOnline, activeSection]);

  // Theme class sync
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    try {
      localStorage.setItem(THEME_KEY, darkMode ? 'dark' : 'light');
    } catch {
      // Ignore
    }
  }, [darkMode]);

  const handleAuthSuccess = (
    token: string,
    user: AuthUserSession,
    nextServiceStatus?: ServiceStatusConfig
  ) => {
    setAuthToken(token);
    setAuthUser(user);
    setNeedsSetup(false);
    if (nextServiceStatus) {
      setServiceStatus(nextServiceStatus);
    }
    const shouldGoToControl =
      isAppAdmin(user.rol) &&
      (isAdminRecoveryRoute || nextServiceStatus?.status === 'Suspendido');
    setActiveSection(shouldGoToControl ? 'usuarios' : 'resumen');
  };

  const handleQuickReactivateService = async () => {
    if (!authToken) return;
    setReactivatingService(true);
    try {
      const res = await fetch('/api/service-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          status: 'Activo',
          message: serviceStatus.message,
        }),
      });
      const data = await res.json();
      if (res.ok && data.serviceStatus) {
        setServiceStatus(data.serviceStatus);
      }
    } catch {
      // Ignore transient network errors
    } finally {
      setReactivatingService(false);
    }
  };

  const handleLogout = useCallback(() => {
    if (authToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      }).catch(() => {});
    }
    setAuthToken(null);
    setAuthUser(null);
    setPersonalHabilitado([]);
    setServerSynced(false);
    setProfileModalOpen(false);
    setActiveSection('resumen');
  }, [authToken]);

  const empresaInfo = useMemo<AgricolaInfo>(
    () => state.empresaInfo || publicEmpresaInfo || AGRICOLA_INFO,
    [state.empresaInfo, publicEmpresaInfo]
  );

  useEffect(() => {
    setActiveAgricolaInfo(empresaInfo);
  }, [empresaInfo]);

  const totalHa = useMemo(
    () => state.cuarteles.reduce((acc, c) => acc + c.superficieHa, 0),
    [state.cuarteles]
  );

  const carenciasActivas = useMemo(
    () =>
      state.aplicaciones.filter(
        (ap) => getCarenciaStatus(ap.fecha, ap.carenciaDias).enCarencia
      ).length,
    [state.aplicaciones]
  );

  const stockBajoCount = useMemo(
    () => state.bodega.filter((i) => i.stockActual <= i.stockMinimo).length,
    [state.bodega]
  );

  const ordenesPendientesCount = useMemo(
    () =>
      state.ordenesAplicacion.filter(
        (o) => o.estado === 'Emitida' || o.estado === 'En Ejecución'
      ).length,
    [state.ordenesAplicacion]
  );

  const plagasAlertaCount = useMemo(
    () =>
      state.plagas.filter(
        (p) => p.nivel === 'Umbral Alerta' || p.nivel === 'Crítico'
      ).length,
    [state.plagas]
  );

  const uid = (prefix: string) =>
    `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // CRUD Handlers
  const handleSaveLabor = (data: Omit<LaborAgricola, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      labores: id
        ? prev.labores.map((l) => (l.id === id ? { ...data, id } : l))
        : [{ ...data, id: uid('lab') }, ...prev.labores],
    }));
    setLaborModal({ open: false, editing: null });
  };

  const handleToggleLaborEstado = (id: string) => {
    const cycle: Record<EstadoLabor, EstadoLabor> = {
      Programada: 'En Curso',
      'En Curso': 'Completada',
      Completada: 'Programada',
    };
    setState((prev) => ({
      ...prev,
      labores: prev.labores.map((l) => (l.id === id ? { ...l, estado: cycle[l.estado] } : l)),
    }));
  };

  const handleSaveAplicacion = (data: Omit<AplicacionFitosanitaria, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      aplicaciones: id
        ? prev.aplicaciones.map((a) => (a.id === id ? { ...data, id } : a))
        : [{ ...data, id: uid('ap') }, ...prev.aplicaciones],
    }));
    setApModal({ open: false, editing: null });
  };

  const handleSaveCosecha = (data: Omit<RegistroCosecha, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      cosechas: id
        ? prev.cosechas.map((c) => (c.id === id ? { ...data, id } : c))
        : [{ ...data, id: uid('cos') }, ...prev.cosechas],
    }));
    setCosechaModal({ open: false, editing: null });
  };

  const handleSaveCuartel = (data: Omit<Cuartel, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      cuarteles: id
        ? prev.cuarteles.map((c) => (c.id === id ? { ...data, id } : c))
        : [...prev.cuarteles, { ...data, id: uid('c') }],
    }));
    setCuartelModal({ open: false, editing: null });
  };

  const handleSavePuntoMapa = (data: Omit<PuntoMapa, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      puntosMapa: id
        ? prev.puntosMapa.map((p) => (p.id === id ? { ...data, id } : p))
        : [...prev.puntosMapa, { ...data, id: uid('pt') }],
    }));
  };

  const handleSaveBodegaItem = (data: Omit<BodegaItem, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      bodega: id
        ? prev.bodega.map((b) => (b.id === id ? { ...data, id } : b))
        : [{ ...data, id: uid('bod') }, ...prev.bodega],
    }));
    setBodegaModal({ open: false, editing: null });
  };

  const handleRegistrarMovimiento = (
    itemId: string,
    tipo: 'Ingreso' | 'Egreso',
    cantidad: number,
    referencia: string,
    observaciones: string
  ) => {
    const responsable = authUser?.nombre || 'Bodega Central';
    setState((prev) => ({
      ...prev,
      bodega: prev.bodega.map((b) => {
        if (b.id !== itemId) return b;
        const nextStock =
          tipo === 'Ingreso' ? b.stockActual + cantidad : Math.max(0, b.stockActual - cantidad);
        return { ...b, stockActual: Number(nextStock.toFixed(2)) };
      }),
      movimientosBodega: [
        {
          id: uid('mov'),
          fecha: getTodayISO(),
          itemId,
          tipo,
          cantidad,
          referencia,
          responsable,
          observaciones,
        },
        ...prev.movimientosBodega,
      ],
    }));
  };

  const handleSaveOrden = (data: Omit<OrdenAplicacion, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      ordenesAplicacion: id
        ? prev.ordenesAplicacion.map((o) => (o.id === id ? { ...data, id } : o))
        : [{ ...data, id: uid('oa') }, ...prev.ordenesAplicacion],
    }));
    setOrdenModal({ open: false, editing: null, presetFromPlaga: null });
  };

  const handleExecuteOrden = (ordenId: string) => {
    const today = getTodayISO();
    const responsable = authUser?.nombre || 'Operador';
    setState((prev) => {
      const orden = prev.ordenesAplicacion.find((o) => o.id === ordenId);
      if (!orden || orden.estado === 'Ejecutada') return prev;

      let nextBodega = [...prev.bodega];
      const newMovimientos = [...prev.movimientosBodega];

      if (!orden.descontadoBodega) {
        orden.productos.forEach((prod) => {
          nextBodega = nextBodega.map((b) =>
            b.id === prod.bodegaItemId
              ? {
                  ...b,
                  stockActual: Number(Math.max(0, b.stockActual - prod.cantidadTotal).toFixed(2)),
                }
              : b
          );
          newMovimientos.unshift({
            id: uid('mov'),
            fecha: today,
            itemId: prod.bodegaItemId,
            tipo: 'Egreso',
            cantidad: prod.cantidadTotal,
            referencia: orden.numeroOrden,
            responsable,
            observaciones: `Despacho automático por ejecución de ${orden.numeroOrden} (${orden.cultivo})`,
          });
        });
      }

      const newAplicaciones = [...prev.aplicaciones];
      if (orden.tipoOrden === 'Fitosanitaria') {
        orden.cuartelIds.forEach((cId) => {
          orden.productos.forEach((prod) => {
            newAplicaciones.unshift({
              id: uid('ap'),
              fecha: today,
              cuartelId: cId,
              categoria: 'Fungicida',
              productoComercial: prod.nombreProducto,
              ingredienteActivo: prod.ingredienteActivo,
              objetivo: orden.objetivo,
              dosisPorHa: `${prod.dosisPorHa} ${prod.unidadDosis}`,
              mojamientoLtsHa: orden.mojamientoLtsHa,
              carenciaDias: orden.carenciaDias,
              reingresoHoras: orden.reingresoHoras,
              aplicador: orden.aplicador,
              carnetAplicadorRef: orden.carnetAplicadorRef,
              carnetTractoristaRef: orden.tractorista
                ? `${orden.tractorista}${
                    orden.carnetTractoristaRef ? ` (${orden.carnetTractoristaRef})` : ''
                  }`
                : orden.carnetTractoristaRef,
              condicionesClima: orden.condicionesClimaRequeridas,
              ordenAplicacionRef: orden.numeroOrden,
              observaciones: `Registrado automáticamente desde ${orden.numeroOrden}`,
            });
          });
        });
      }

      const newLabores = [...prev.labores];
      orden.cuartelIds.forEach((cId) => {
        newLabores.unshift({
          id: uid('lab'),
          fecha: today,
          cuartelId: cId,
          tipo: orden.tipoOrden === 'Fitosanitaria' ? 'Fitosanitario' : 'Fertilización Base',
          descripcion: `${orden.numeroOrden}: ${orden.objetivo}`,
          responsable: orden.aplicador,
          maquinaria: orden.maquinaria,
          horasTrabajo: 3,
          costoCLP: 0,
          estado: 'Completada',
          observaciones: orden.productos
            .map((p) => `${p.nombreProducto} (${p.cantidadTotal} ${p.unidadTotal})`)
            .join(', '),
        });
      });

      return {
        ...prev,
        bodega: nextBodega,
        movimientosBodega: newMovimientos,
        aplicaciones: newAplicaciones,
        labores: newLabores,
        ordenesAplicacion: prev.ordenesAplicacion.map((o) =>
          o.id === ordenId
            ? { ...o, estado: 'Ejecutada', descontadoBodega: true }
            : o
        ),
      };
    });
  };

  const handleSaveRiego = (data: Omit<RegistroRiego, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      riegos: id
        ? prev.riegos.map((r) => (r.id === id ? { ...data, id } : r))
        : [{ ...data, id: uid('rie') }, ...prev.riegos],
    }));
    setRiegoModal({ open: false, editing: null });
  };

  const handleSaveSectorRiego = (data: Omit<SectorRiego, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      sectoresRiego: id
        ? prev.sectoresRiego.map((s) => (s.id === id ? { ...data, id } : s))
        : [...prev.sectoresRiego, { ...data, id: uid('sr') }],
    }));
    setSectorRiegoModal({ open: false, editing: null });
  };

  const handleSavePlaga = (data: Omit<MonitoreoPlaga, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      plagas: id
        ? prev.plagas.map((p) => (p.id === id ? { ...data, id } : p))
        : [{ ...data, id: uid('plg') }, ...prev.plagas],
    }));
    setPlagaModal({ open: false, editing: null });
  };

  const handleSaveClimaManual = (data: Omit<RegistroClimaManual, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      climaRegistros: id
        ? prev.climaRegistros.map((c) => (c.id === id ? { ...data, id } : c))
        : [{ ...data, id: uid('clm') }, ...prev.climaRegistros],
    }));
    setClimaModal((prev) => ({ ...prev, open: false, editing: null }));
  };

  const handleSaveCultivo = (data: Omit<CultivoConfig, 'id'>, id?: string) => {
    setState((prev) => {
      if (!id) {
        return {
          ...prev,
          cultivos: [...prev.cultivos, { ...data, id: uid('cul') }],
        };
      }
      const oldCultivo = prev.cultivos.find((c) => c.id === id);
      const oldName = oldCultivo?.nombre;
      const newName = data.nombre;
      const shouldRename = Boolean(oldName && oldName !== newName);
      const renameArr = (arr: string[]) =>
        shouldRename && oldName ? arr.map((item) => (item === oldName ? newName : item)) : arr;

      return {
        ...prev,
        cultivos: prev.cultivos.map((c) => (c.id === id ? { ...data, id } : c)),
        cuarteles: shouldRename
          ? prev.cuarteles.map((c) => (c.cultivo === oldName ? { ...c, cultivo: newName } : c))
          : prev.cuarteles,
        bodega: shouldRename
          ? prev.bodega.map((b) => ({ ...b, cultivosCompatibles: renameArr(b.cultivosCompatibles) }))
          : prev.bodega,
        ordenesAplicacion: shouldRename
          ? prev.ordenesAplicacion.map((o) =>
              o.cultivo === oldName ? { ...o, cultivo: newName } : o
            )
          : prev.ordenesAplicacion,
        cosechas: shouldRename
          ? prev.cosechas.map((c) => (c.cultivo === oldName ? { ...c, cultivo: newName } : c))
          : prev.cosechas,
        plagas: shouldRename
          ? prev.plagas.map((p) => (p.cultivo === oldName ? { ...p, cultivo: newName } : p))
          : prev.plagas,
        maquinas: shouldRename
          ? prev.maquinas.map((m) => ({
              ...m,
              cultivosCompatibles: renameArr(m.cultivosCompatibles),
            }))
          : prev.maquinas,
        maquinaria: shouldRename
          ? prev.maquinaria.map((m) => ({
              ...m,
              cultivosAplicados: renameArr(m.cultivosAplicados),
            }))
          : prev.maquinaria,
        postcosecha: shouldRename
          ? prev.postcosecha.map((p) => (p.cultivo === oldName ? { ...p, cultivo: newName } : p))
          : prev.postcosecha,
        cuadrillas: shouldRename
          ? prev.cuadrillas.map((q) => (q.cultivo === oldName ? { ...q, cultivo: newName } : q))
          : prev.cuadrillas,
        programasFertirriego: shouldRename
          ? prev.programasFertirriego.map((pf) =>
              pf.cultivo === oldName ? { ...pf, cultivo: newName } : pf
            )
          : prev.programasFertirriego,
        costosExtras: shouldRename
          ? prev.costosExtras.map((ce) => (ce.cultivo === oldName ? { ...ce, cultivo: newName } : ce))
          : prev.costosExtras,
      };
    });
    setCultivoModal({ open: false, editing: null });
  };

  const handleDeleteCultivo = (id: string) => {
    setState((prev) => ({
      ...prev,
      cultivos: prev.cultivos.filter((c) => c.id !== id),
    }));
  };

  const handleDeleteCuartel = (id: string) => {
    setState((prev) => ({
      ...prev,
      cuarteles: prev.cuarteles.filter((c) => c.id !== id),
    }));
  };

  const handleSaveMovimientoKardex = (data: Omit<MovimientoBodega, 'id'>, id: string) => {
    setState((prev) => {
      const oldMov = prev.movimientosBodega.find((m) => m.id === id);
      if (!oldMov) return prev;
      const oldDelta = oldMov.tipo === 'Ingreso' ? oldMov.cantidad : -oldMov.cantidad;
      const newDelta = data.tipo === 'Ingreso' ? data.cantidad : -data.cantidad;

      const nextBodega = prev.bodega.map((b) => {
        let stock = b.stockActual;
        if (b.id === oldMov.itemId) stock -= oldDelta;
        if (b.id === data.itemId) stock += newDelta;
        return b.id === oldMov.itemId || b.id === data.itemId
          ? { ...b, stockActual: Number(Math.max(0, stock).toFixed(2)) }
          : b;
      });

      return {
        ...prev,
        bodega: nextBodega,
        movimientosBodega: prev.movimientosBodega.map((m) => (m.id === id ? { ...data, id } : m)),
      };
    });
    setKardexModal({ open: false, editing: null });
  };

  const handleDeleteMovimientoKardex = (id: string) => {
    setState((prev) => {
      const oldMov = prev.movimientosBodega.find((m) => m.id === id);
      if (!oldMov) return prev;
      const oldDelta = oldMov.tipo === 'Ingreso' ? oldMov.cantidad : -oldMov.cantidad;
      return {
        ...prev,
        bodega: prev.bodega.map((b) =>
          b.id === oldMov.itemId
            ? { ...b, stockActual: Number(Math.max(0, b.stockActual - oldDelta).toFixed(2)) }
            : b
        ),
        movimientosBodega: prev.movimientosBodega.filter((m) => m.id !== id),
      };
    });
  };

  const handleSaveMaquina = (data: Omit<MaquinaEquipo, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      maquinas: id
        ? prev.maquinas.map((m) => (m.id === id ? { ...data, id } : m))
        : [...prev.maquinas, { ...data, id: uid('eq') }],
    }));
    setMaquinaModal({ open: false, editing: null });
  };

  const handleSaveMaquinariaLog = (data: Omit<RegistroMaquinaria, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      maquinaria: id
        ? prev.maquinaria.map((m) => (m.id === id ? { ...data, id } : m))
        : [{ ...data, id: uid('maq') }, ...prev.maquinaria],
    }));
    setMaqModal({ open: false, editing: null });
  };

  // Handlers for the 6 newly integrated modules
  const handleSaveHelada = (data: Omit<EventoHelada, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      heladas: id
        ? prev.heladas.map((h) => (h.id === id ? { ...data, id } : h))
        : [{ ...data, id: uid('hel') }, ...prev.heladas],
    }));
  };
  const handleSavePostcosecha = (data: Omit<LotePostcosecha, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      postcosecha: id
        ? prev.postcosecha.map((p) => (p.id === id ? { ...data, id } : p))
        : [{ ...data, id: uid('pc') }, ...prev.postcosecha],
    }));
  };
  const handleSaveCuadrilla = (data: Omit<RegistroCuadrilla, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      cuadrillas: id
        ? prev.cuadrillas.map((q) => (q.id === id ? { ...data, id } : q))
        : [{ ...data, id: uid('cua') }, ...prev.cuadrillas],
    }));
  };
  const handleSaveAnalisisSuelo = (data: Omit<AnalisisSueloAgua, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      suelosAnalisis: id
        ? prev.suelosAnalisis.map((a) => (a.id === id ? { ...data, id } : a))
        : [{ ...data, id: uid('lab_sa') }, ...prev.suelosAnalisis],
    }));
  };
  const handleSaveProgramaFert = (data: Omit<ProgramaFertirriego, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      programasFertirriego: id
        ? prev.programasFertirriego.map((p) => (p.id === id ? { ...data, id } : p))
        : [{ ...data, id: uid('pf') }, ...prev.programasFertirriego],
    }));
  };
  const handleSaveCostoExtra = (data: Omit<MovimientoCostoExtra, 'id'>, id?: string) => {
    setState((prev) => ({
      ...prev,
      costosExtras: id
        ? prev.costosExtras.map((c) => (c.id === id ? { ...data, id } : c))
        : [{ ...data, id: uid('ce') }, ...prev.costosExtras],
    }));
  };

  // CSV Export contextual to active section
  const handleExportCSV = () => {
    const today = getTodayISO();
    if (activeSection === 'aplicaciones') {
      exportRowsToCSV(
        `agricola-queni-aplicaciones-${today}.csv`,
        [
          'Fecha',
          'Cuartel',
          'Cultivo',
          'Categoria',
          'Producto Comercial',
          'Ingrediente Activo',
          'Objetivo',
          'Dosis/ha',
          'Mojamiento L/ha',
          'Carencia (dias)',
          'Fecha Liberacion',
          'Reingreso (hrs)',
          'Aplicador',
        ],
        state.aplicaciones.map((ap) => {
          const c = state.cuarteles.find((ct) => ct.id === ap.cuartelId);
          const st = getCarenciaStatus(ap.fecha, ap.carenciaDias);
          return [
            formatDateCL(ap.fecha),
            c ? `${c.codigo} ${c.nombre}` : '',
            c?.cultivo ?? '',
            ap.categoria,
            ap.productoComercial,
            ap.ingredienteActivo,
            ap.objetivo,
            ap.dosisPorHa,
            ap.mojamientoLtsHa,
            ap.carenciaDias,
            formatDateCL(st.fechaLiberacion),
            ap.reingresoHoras,
            ap.aplicador,
          ];
        })
      );
      return;
    }

    if (activeSection === 'cosecha') {
      exportRowsToCSV(
        `agricola-queni-cosechas-${today}.csv`,
        [
          'Fecha',
          'Guia Despacho',
          'Cuartel',
          'Cultivo',
          'Destino',
          'Kilos Brutos',
          'Kilos Descarte',
          'Kilos Netos',
          'Brix',
          'Cosecheros',
          'Observaciones',
        ],
        state.cosechas.map((cos) => {
          const c = state.cuarteles.find((ct) => ct.id === cos.cuartelId);
          return [
            formatDateCL(cos.fecha),
            cos.guiaDespacho,
            c ? `${c.codigo} ${c.nombre}` : '',
            cos.cultivo,
            cos.destino,
            cos.kilosBrutos,
            cos.kilosDescarte,
            Math.max(0, cos.kilosBrutos - cos.kilosDescarte),
            cos.brix,
            cos.cosecheros,
            cos.observaciones,
          ];
        })
      );
      return;
    }

    if (activeSection === 'bodega') {
      exportRowsToCSV(
        `agricola-queni-bodega-${today}.csv`,
        ['Codigo', 'Categoria', 'Nombre', 'Especificacion', 'Cultivos', 'Stock', 'Minimo', 'Unidad', 'Costo Unit.'],
        state.bodega.map((b) => [
          b.codigo,
          b.categoria,
          b.nombre,
          b.ingredienteActivoOEspecificacion,
          b.cultivosCompatibles.join(', '),
          b.stockActual,
          b.stockMinimo,
          b.unidad,
          b.costoUnitarioCLP,
        ])
      );
      return;
    }

    if (activeSection === 'ordenes') {
      exportRowsToCSV(
        `agricola-queni-ordenes-${today}.csv`,
        ['N Orden', 'Emision', 'Programada', 'Tipo', 'Cultivo', 'Superficie (ha)', 'Objetivo', 'Aplicador', 'Carnet SAG', 'Tractorista', 'Estado'],
        state.ordenesAplicacion.map((o) => [
          o.numeroOrden,
          formatDateCL(o.fechaEmision),
          formatDateCL(o.fechaProgramada),
          o.tipoOrden,
          o.cultivo,
          o.superficieTotalHa,
          o.objetivo,
          o.aplicador,
          o.carnetAplicadorRef || '',
          o.tractorista || '',
          o.estado,
        ])
      );
      return;
    }

    if (activeSection === 'cultivos') {
      exportRowsToCSV(
        `agricola-queni-cultivos-${today}.csv`,
        ['Especie', 'Nombre Cientifico', 'pH Optimo', 'Unidad Cosecha'],
        state.cultivos.map((c) => [c.nombre, c.nombreCientifico, c.phOptimo, c.unidadCosecha])
      );
      return;
    }

    if (activeSection === 'cuarteles') {
      exportRowsToCSV(
        `agricola-queni-cuarteles-${today}.csv`,
        ['Codigo', 'Nombre', 'Especie', 'Variedad', 'Superficie (ha)', 'Plantas/ha', 'Año', 'Riego', 'Suelo/pH', 'Estado'],
        state.cuarteles.map((c) => [
          c.codigo,
          c.nombre,
          c.cultivo,
          c.variedad,
          c.superficieHa,
          c.plantasPorHa,
          c.anioPlantacion,
          c.sistemaRiego,
          c.sueloPh,
          c.estado,
        ])
      );
      return;
    }

    if (activeSection === 'maquinaria') {
      exportRowsToCSV(
        `agricola-queni-maquinaria-${today}.csv`,
        ['Codigo', 'Equipo', 'Tipo', 'Marca/Modelo', 'Cultivos', 'Horometro', 'Estado'],
        state.maquinas.map((m) => [
          m.codigo,
          m.nombre,
          m.tipo,
          m.marcaModelo,
          m.cultivosCompatibles.join(', '),
          m.horometroActual,
          m.estado,
        ])
      );
      return;
    }

    if (activeSection === 'riego') {
      exportRowsToCSV(
        `agricola-queni-riego-${today}.csv`,
        ['Fecha', 'Hora', 'Cuartel', 'Horas', 'Caudal m3/h', 'Lamina mm', 'pH', 'CE dS/m', 'Operador'],
        state.riegos.map((r) => {
          const c = state.cuarteles.find((ct) => ct.id === r.cuartelId);
          return [
            formatDateCL(r.fecha),
            r.horaInicio,
            c ? `${c.codigo} ${c.nombre}` : '',
            r.horasRiego,
            r.caudalM3Hora,
            r.laminaMm,
            r.phAgua,
            r.conductividadDsM,
            r.operador,
          ];
        })
      );
      return;
    }

    if (activeSection === 'clima') {
      exportRowsToCSV(
        `agricola-queni-clima-${today}.csv`,
        ['Fecha', 'Hora', 'Ubicacion', 'T Actual C', 'T Min C', 'T Max C', 'Humedad %', 'Viento km/h', 'Lluvia mm'],
        state.climaRegistros.map((cl) => [
          formatDateCL(cl.fecha),
          cl.hora,
          cl.ubicacionNombre,
          cl.tempC,
          cl.tempMinC,
          cl.tempMaxC,
          cl.humedadPct,
          cl.vientoKmH,
          cl.lluviaMm,
        ])
      );
      return;
    }

    if (activeSection === 'plagas') {
      exportRowsToCSV(
        `agricola-queni-plagas-${today}.csv`,
        ['Fecha', 'Cuartel', 'Especie', 'Plaga/Enfermedad', 'Nivel', 'Incidencia %', 'Inspector', 'Recomendacion'],
        state.plagas.map((p) => {
          const c = state.cuarteles.find((ct) => ct.id === p.cuartelId);
          return [
            formatDateCL(p.fecha),
            c ? `${c.codigo} ${c.nombre}` : '',
            p.cultivo,
            p.plagaOEnfermedad,
            p.nivel,
            p.porcentajeIncidencia,
            p.inspector,
            p.recomendacion,
          ];
        })
      );
      return;
    }

    if (activeSection === 'heladas') {
      exportRowsToCSV(
        `agricola-queni-heladas-${today}.csv`,
        ['Fecha', 'Inicio', 'Fin', 'T Minima C', 'Activacion C', 'Metodo', 'Dano %', 'Operador', 'Observaciones'],
        state.heladas.map((h) => [
          formatDateCL(h.fecha),
          h.horaInicio,
          h.horaTermino,
          h.tempMinimaC,
          h.temperaturaActivacionC ?? '',
          h.metodoControl,
          h.danoEstimadoPct,
          h.operador,
          h.observaciones,
        ])
      );
      return;
    }

    if (activeSection === 'postcosecha') {
      exportRowsToCSV(
        `agricola-queni-postcosecha-${today}.csv`,
        ['Codigo Lote', 'Fecha', 'Especie', 'Variedad', 'Kg Recibidos', 'Kg Exportable', 'Calibre', 'T Pulpa Ingreso C', 'Camara', 'Guia Despacho', 'Estado'],
        state.postcosecha.map((l) => [
          l.codigoLote,
          formatDateCL(l.fecha),
          l.cultivo,
          l.variedad,
          l.kilosRecibidos,
          l.kilosExportables,
          l.calibrePromedio,
          l.tempPulpaIngresoC,
          l.camaraFrio,
          l.guiaDespachoRef || '',
          l.estado,
        ])
      );
      return;
    }

    if (activeSection === 'cuadrillas') {
      exportRowsToCSV(
        `agricola-queni-cuadrillas-${today}.csv`,
        ['Fecha', 'Cuadrilla', 'Jefe', 'Especie', 'Trabajadores', 'Kilos', 'Modalidad', 'Total CLP', 'Estado'],
        state.cuadrillas.map((q) => [
          formatDateCL(q.fecha),
          q.cuadrillaNombre,
          q.jefeCuadrilla,
          q.cultivo,
          q.trabajadoresCount,
          q.kilosTotales,
          q.modalidadPago,
          q.totalPagarCLP,
          q.estadoPago,
        ])
      );
      return;
    }

    if (activeSection === 'suelos') {
      exportRowsToCSV(
        `agricola-queni-suelos-agua-${today}.csv`,
        ['Fecha', 'Tipo Muestra', 'Laboratorio', 'pH', 'CE dS/m', 'MO %', 'N ppm', 'P ppm', 'K ppm', 'Recomendacion'],
        state.suelosAnalisis.map((a) => [
          formatDateCL(a.fecha),
          a.tipoMuestra,
          a.laboratorio,
          a.ph,
          a.ceDsM,
          a.materiaOrganicaPct ?? '',
          a.nitrogenoPpm ?? '',
          a.fosforoPpm ?? '',
          a.potasioPpm ?? '',
          a.recomendacion,
        ])
      );
      return;
    }

    if (activeSection === 'costos') {
      exportRowsToCSV(
        `agricola-queni-costos-extras-${today}.csv`,
        ['Fecha', 'Tipo', 'Categoria', 'Cultivo', 'Descripcion', 'Documento', 'Monto CLP'],
        state.costosExtras.map((c) => [
          formatDateCL(c.fecha),
          c.tipo,
          c.categoria,
          c.cultivo || 'General',
          c.descripcion,
          c.documentoRef || '',
          c.montoCLP,
        ])
      );
      return;
    }

    exportRowsToCSV(
      `agricola-queni-labores-${today}.csv`,
      [
        'Fecha',
        'Cuartel',
        'Cultivo',
        'Tipo Labor',
        'Descripcion',
        'Responsable',
        'Maquinaria',
        'Horas',
        'Costo CLP',
        'Estado',
        'Observaciones',
      ],
      state.labores.map((l) => {
        const c = state.cuarteles.find((ct) => ct.id === l.cuartelId);
        return [
          formatDateCL(l.fecha),
          c ? `${c.codigo} ${c.nombre}` : '',
          c?.cultivo ?? '',
          l.tipo,
          l.descripcion,
          l.responsable,
          l.maquinaria,
          l.horasTrabajo,
          l.costoCLP,
          l.estado,
          l.observaciones,
        ];
      })
    );
  };

  if (authChecking) {
    return (
      <div className="min-h-dvh bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-sm text-slate-600 dark:text-slate-400">
        Iniciando Cuaderno de Campo · {empresaInfo.nombreCorto}...
      </div>
    );
  }

  const isServiceSuspended = serviceStatus.status === 'Suspendido';
  const userIsSuperAdmin = Boolean(authUser && isAppAdmin(authUser.rol));

  if (isServiceSuspended && !userIsSuperAdmin && !needsSetup) {
    return (
      <ServiceBlockedScreen
        serviceStatus={serviceStatus}
        empresaInfo={empresaInfo}
        isAuthenticatedNonAdmin={Boolean(authToken && authUser)}
        userName={authUser?.nombre}
        defaultShowAdminLogin={isAdminRecoveryRoute}
        onLogout={handleLogout}
        onAdminUnlockSuccess={handleAuthSuccess}
      />
    );
  }

  if (!authToken || !authUser) {
    return (
      <LoginScreen
        needsSetup={needsSetup}
        empresaInfo={empresaInfo}
        onSuccess={handleAuthSuccess}
        onServiceSuspended={(svc) => setServiceStatus(svc)}
      />
    );
  }

  const allowedSections = getAllowedSectionsForUser(authUser);
  const effectiveSection: NavSection = allowedSections.includes(activeSection)
    ? activeSection
    : allowedSections[0] ?? 'resumen';

  const canEditCurrent = canEditModule(authUser, effectiveSection);
  const nextOrdenNum = `OA-${new Date().getFullYear()}-${String(
    state.ordenesAplicacion.length + 1
  ).padStart(3, '0')}`;

  const primaryActionMap: Partial<Record<NavSection, { label: string; handler: () => void }>> = {
    resumen: { label: 'Registrar Labor', handler: () => setLaborModal({ open: true, editing: null }) },
    mapa: {
      label: 'Nuevo Cuartel',
      handler: () => setCuartelModal({ open: true, editing: null }),
    },
    cultivos: {
      label: 'Nuevo Cultivo',
      handler: () => setCultivoModal({ open: true, editing: null }),
    },
    cuarteles: {
      label: 'Nuevo Cuartel',
      handler: () => setCuartelModal({ open: true, editing: null }),
    },
    maquinaria: {
      label: 'Nueva Máquina',
      handler: () => setMaquinaModal({ open: true, editing: null }),
    },
    riego: { label: 'Registrar Riego', handler: () => setRiegoModal({ open: true, editing: null }) },
    clima: {
      label: 'Registrar Clima',
      handler: () => setClimaModal((prev) => ({ ...prev, open: true, editing: null })),
    },
    heladas: {
      label: 'Registrar Helada',
      handler: () => triggerSectionCreate('heladas'),
    },
    plagas: { label: 'Registrar Plaga', handler: () => setPlagaModal({ open: true, editing: null }) },
    ordenes: {
      label: 'Emitir Orden',
      handler: () => setOrdenModal({ open: true, editing: null, presetFromPlaga: null }),
    },
    aplicaciones: { label: 'Nueva Aplicación', handler: () => setApModal({ open: true, editing: null }) },
    bodega: {
      label: 'Agregar Insumo',
      handler: () => setBodegaModal({ open: true, editing: null, defaultCat: 'Fitosanitario' }),
    },
    labores: { label: 'Registrar Labor', handler: () => setLaborModal({ open: true, editing: null }) },
    cosecha: { label: 'Registrar Cosecha', handler: () => setCosechaModal({ open: true, editing: null }) },
    postcosecha: {
      label: 'Nuevo Lote Packing',
      handler: () => triggerSectionCreate('postcosecha'),
    },
    cuadrillas: {
      label: 'Nueva Planilla Trato',
      handler: () => triggerSectionCreate('cuadrillas'),
    },
    suelos: {
      label: 'Nuevo Análisis / Programa',
      handler: () => triggerSectionCreate('suelos'),
    },
    costos: {
      label: 'Nuevo Costo / Ingreso',
      handler: () => triggerSectionCreate('costos'),
    },
  };

  const activePrimary =
    canEditCurrent && effectiveSection !== 'usuarios' ? primaryActionMap[effectiveSection] : undefined;

  return (
    <div className="min-h-dvh flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        activeSection={effectiveSection}
        onSelectSection={setActiveSection}
        user={authUser}
        empresaInfo={empresaInfo}
        totalHa={totalHa}
        carenciasActivas={carenciasActivas}
        stockBajoCount={stockBajoCount}
        ordenesPendientesCount={ordenesPendientesCount}
        plagasAlertaCount={plagasAlertaCount}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((d) => !d)}
        onOpenBackupModal={() => setBackupModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar
          activeSection={effectiveSection}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onPrimaryAction={activePrimary?.handler}
          primaryActionLabel={activePrimary?.label}
          onExportCSV={effectiveSection === 'usuarios' ? undefined : handleExportCSV}
          isOnline={isOnline}
          pendingSyncCount={offlineQueue.length}
        />

        <OfflineSyncBanner
          isOnline={isOnline}
          pendingEntries={offlineQueue}
          syncing={offlineSyncing}
          justSyncedMessage={justSyncedMessage}
          onSyncNow={() => {
            void syncOfflineChanges();
          }}
        />

        {isServiceSuspended && userIsSuperAdmin && (
          <div className="mx-3 sm:mx-8 mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-900 dark:text-rose-200 print:hidden">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">
                  Servicio Suspendido para usuarios de la agrícola
                </div>
                <div className="text-rose-700 dark:text-rose-300 mt-0.5">
                  Solo tú (Superadministrador) tienes acceso en este momento. Los datos de la base de datos permanecen intactos.
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {effectiveSection !== 'usuarios' && (
                <button
                  type="button"
                  onClick={() => setActiveSection('usuarios')}
                  className="px-3 py-1.5 rounded-lg border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-900 text-rose-800 dark:text-rose-200 font-medium hover:bg-rose-100/60"
                >
                  Configurar Mensaje
                </button>
              )}
              <button
                type="button"
                disabled={reactivatingService}
                onClick={handleQuickReactivateService}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{reactivatingService ? 'Reactivando...' : 'Reactivar a Activo'}</span>
              </button>
            </div>
          </div>
        )}

        {mapsQuotaExceeded && (
          <div className="mx-4 sm:mx-8 mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 print:hidden">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              Google Maps Platform quota reached. If you are the app owner, visit{' '}
              <a
                href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                maps developer site
              </a>{' '}
              for instructions to update your account.
            </div>
          </div>
        )}

        <main className="flex-1 px-3 py-4 sm:p-6 lg:p-8 pb-[max(2rem,env(safe-area-inset-bottom))] max-w-[1440px] w-full mx-auto">
          {effectiveSection === 'resumen' && (
            <OverviewSection
              state={state}
              allowedSections={allowedSections}
              personalHabilitado={personalHabilitado}
              weather={weatherSnapshot}
              frostThresholdC={frostThresholdC}
              canViewUsuarios={isAppAdmin(authUser.rol)}
              canEditLabores={canEditModule(authUser, 'labores')}
              canEditCosecha={canEditModule(authUser, 'cosecha')}
              canEditEmpresa={canEditModule(authUser, 'resumen') || isAppAdmin(authUser.rol)}
              onEditEmpresa={() => setEmpresaModalOpen(true)}
              onNavigate={setActiveSection}
              onOpenNewLabor={() => setLaborModal({ open: true, editing: null })}
              onOpenNewCosecha={() => setCosechaModal({ open: true, editing: null })}
            />
          )}

          {effectiveSection === 'mapa' && (
            <MapSection
              apiKey={mapsApiKey}
              empresaInfo={empresaInfo}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              puntosMapa={state.puntosMapa}
              aplicaciones={state.aplicaciones}
              plagas={state.plagas}
              canEdit={canEditCurrent}
              onCreateCuartelFromPolygon={(polygon, areaHa, center) =>
                setCuartelModal({
                  open: true,
                  editing: null,
                  presetPolygon: { polygon, areaHa, center },
                })
              }
              onQuickCuartel={(center) =>
                setCuartelModal({ open: true, editing: null, presetCenter: center })
              }
              onEditCuartel={(c) => setCuartelModal({ open: true, editing: c })}
              onDeleteCuartel={handleDeleteCuartel}
              onEditPlaga={(pl) => setPlagaModal({ open: true, editing: pl })}
              onSavePunto={handleSavePuntoMapa}
              onDeletePunto={(id) =>
                setState((prev) => ({
                  ...prev,
                  puntosMapa: prev.puntosMapa.filter((p) => p.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'labores' && (
            <LaboresSection
              labores={state.labores}
              cuarteles={state.cuarteles}
              canEdit={canEditCurrent}
              onNewLabor={() => setLaborModal({ open: true, editing: null })}
              onEditLabor={(labor) => setLaborModal({ open: true, editing: labor })}
              onDeleteLabor={(id) =>
                setState((prev) => ({
                  ...prev,
                  labores: prev.labores.filter((l) => l.id !== id),
                }))
              }
              onToggleEstado={handleToggleLaborEstado}
            />
          )}

          {effectiveSection === 'ordenes' && (
            <OrdenesAplicacionSection
              ordenes={state.ordenesAplicacion}
              cuarteles={state.cuarteles}
              canEdit={canEditCurrent}
              focusedOrdenId={focusedQrTarget?.type === 'orden' ? focusedQrTarget.id : null}
              onNewOrden={() =>
                setOrdenModal({ open: true, editing: null, presetFromPlaga: null })
              }
              onEditOrden={(orden) =>
                setOrdenModal({ open: true, editing: orden, presetFromPlaga: null })
              }
              onExecuteOrden={handleExecuteOrden}
              onUpdateOrdenEstado={(ordenId: string, estado: EstadoOrdenAplicacion) =>
                setState((prev) => ({
                  ...prev,
                  ordenesAplicacion: prev.ordenesAplicacion.map((o) =>
                    o.id === ordenId ? { ...o, estado } : o
                  ),
                }))
              }
              onDeleteOrden={(id) =>
                setState((prev) => ({
                  ...prev,
                  ordenesAplicacion: prev.ordenesAplicacion.filter((o) => o.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'aplicaciones' && (
            <AplicacionesSection
              aplicaciones={state.aplicaciones}
              cuarteles={state.cuarteles}
              canEdit={canEditCurrent}
              onNewAplicacion={() => setApModal({ open: true, editing: null })}
              onEditAplicacion={(ap) => setApModal({ open: true, editing: ap })}
              onDeleteAplicacion={(id) =>
                setState((prev) => ({
                  ...prev,
                  aplicaciones: prev.aplicaciones.filter((a) => a.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'bodega' && (
            <BodegaSection
              bodega={state.bodega}
              movimientos={state.movimientosBodega}
              cultivos={state.cultivos}
              canEdit={canEditCurrent}
              onNewItem={(cat) =>
                setBodegaModal({ open: true, editing: null, defaultCat: cat })
              }
              onEditItem={(item) => setBodegaModal({ open: true, editing: item })}
              onDeleteItem={(id) =>
                setState((prev) => ({
                  ...prev,
                  bodega: prev.bodega.filter((b) => b.id !== id),
                }))
              }
              onRegistrarMovimiento={handleRegistrarMovimiento}
              onEditMovimiento={(mov) => setKardexModal({ open: true, editing: mov })}
              onDeleteMovimiento={handleDeleteMovimientoKardex}
            />
          )}

          {(effectiveSection === 'riego' ||
            effectiveSection === 'clima' ||
            effectiveSection === 'plagas') && (
            <RiegoClimaPlagasSection
              mode={effectiveSection}
              authToken={authToken}
              empresaInfo={empresaInfo}
              cuarteles={state.cuarteles}
              sectoresRiego={state.sectoresRiego}
              riegos={state.riegos}
              plagas={state.plagas}
              climaRegistros={state.climaRegistros}
              canEdit={canEditCurrent}
              onNewSectorRiego={() => setSectorRiegoModal({ open: true, editing: null })}
              onEditSectorRiego={(s) => setSectorRiegoModal({ open: true, editing: s })}
              onDeleteSectorRiego={(id) =>
                setState((prev) => ({
                  ...prev,
                  sectoresRiego: prev.sectoresRiego.filter((s) => s.id !== id),
                }))
              }
              onNewRiego={() => setRiegoModal({ open: true, editing: null })}
              onEditRiego={(r) => setRiegoModal({ open: true, editing: r })}
              onDeleteRiego={(id) =>
                setState((prev) => ({
                  ...prev,
                  riegos: prev.riegos.filter((r) => r.id !== id),
                }))
              }
              onNewPlaga={() => setPlagaModal({ open: true, editing: null })}
              onEditPlaga={(p) => setPlagaModal({ open: true, editing: p })}
              onDeletePlaga={(id) =>
                setState((prev) => ({
                  ...prev,
                  plagas: prev.plagas.filter((p) => p.id !== id),
                }))
              }
              onNewClimaManual={(coords) =>
                setClimaModal({ open: true, editing: null, coords })
              }
              onEditClimaManual={(c) =>
                setClimaModal({
                  open: true,
                  editing: c,
                  coords: { lat: c.lat, lng: c.lng, name: c.ubicacionNombre },
                })
              }
              onDeleteClimaManual={(id) =>
                setState((prev) => ({
                  ...prev,
                  climaRegistros: prev.climaRegistros.filter((c) => c.id !== id),
                }))
              }
              onEmitOrdenFromPlaga={(plaga) => {
                setActiveSection('ordenes');
                setOrdenModal({ open: true, editing: null, presetFromPlaga: plaga });
              }}
            />
          )}

          {effectiveSection === 'heladas' && (
            <HeladasSection
              heladas={state.heladas}
              cuarteles={state.cuarteles}
              canEdit={canEditCurrent}
              weather={weatherSnapshot}
              frostThresholdC={frostThresholdC}
              onChangeFrostThreshold={handleChangeFrostThreshold}
              createTrigger={createTriggers.heladas}
              onSaveHelada={handleSaveHelada}
              onDeleteHelada={(id) =>
                setState((prev) => ({
                  ...prev,
                  heladas: prev.heladas.filter((h) => h.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'cosecha' && (
            <CosechaSection
              cosechas={state.cosechas}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              aplicaciones={state.aplicaciones}
              canEdit={canEditCurrent}
              onNewCosecha={(defaultCultivo) =>
                setCosechaModal({ open: true, editing: null, defaultCultivo })
              }
              onEditCosecha={(cos) => setCosechaModal({ open: true, editing: cos })}
              onDeleteCosecha={(id) =>
                setState((prev) => ({
                  ...prev,
                  cosechas: prev.cosechas.filter((c) => c.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'postcosecha' && (
            <PostcosechaSection
              lotes={state.postcosecha}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              canEdit={canEditCurrent}
              focusedLoteId={focusedQrTarget?.type === 'lote' ? focusedQrTarget.id : null}
              createTrigger={createTriggers.postcosecha}
              onSaveLote={handleSavePostcosecha}
              onDeleteLote={(id) =>
                setState((prev) => ({
                  ...prev,
                  postcosecha: prev.postcosecha.filter((p) => p.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'cuadrillas' && (
            <CuadrillasSection
              cuadrillas={state.cuadrillas}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              canEdit={canEditCurrent}
              createTrigger={createTriggers.cuadrillas}
              onSaveCuadrilla={handleSaveCuadrilla}
              onDeleteCuadrilla={(id) =>
                setState((prev) => ({
                  ...prev,
                  cuadrillas: prev.cuadrillas.filter((q) => q.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'suelos' && (
            <SuelosFertirriegoSection
              analisis={state.suelosAnalisis}
              programas={state.programasFertirriego}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              canEdit={canEditCurrent}
              createTrigger={createTriggers.suelos}
              onSaveAnalisis={handleSaveAnalisisSuelo}
              onDeleteAnalisis={(id) =>
                setState((prev) => ({
                  ...prev,
                  suelosAnalisis: prev.suelosAnalisis.filter((a) => a.id !== id),
                }))
              }
              onSavePrograma={handleSaveProgramaFert}
              onDeletePrograma={(id) =>
                setState((prev) => ({
                  ...prev,
                  programasFertirriego: prev.programasFertirriego.filter((p) => p.id !== id),
                }))
              }
            />
          )}

          {effectiveSection === 'costos' && (
            <CostosRentabilidadSection
              costosExtras={state.costosExtras}
              labores={state.labores}
              maquinaria={state.maquinaria}
              cuadrillas={state.cuadrillas}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              canEdit={canEditCurrent}
              createTrigger={createTriggers.costos}
              onSaveCosto={handleSaveCostoExtra}
              onDeleteCosto={(id) =>
                setState((prev) => ({
                  ...prev,
                  costosExtras: prev.costosExtras.filter((c) => c.id !== id),
                }))
              }
            />
          )}

          {(effectiveSection === 'cultivos' ||
            effectiveSection === 'cuarteles' ||
            effectiveSection === 'maquinaria') && (
            <CultivosMaquinariaSection
              mode={effectiveSection}
              cuarteles={state.cuarteles}
              cultivos={state.cultivos}
              labores={state.labores}
              aplicaciones={state.aplicaciones}
              cosechas={state.cosechas}
              maquinas={state.maquinas}
              maquinaria={state.maquinaria}
              canEdit={canEditCurrent}
              focusedCuartelId={focusedQrTarget?.type === 'cuartel' ? focusedQrTarget.id : null}
              onNewCuartel={() => setCuartelModal({ open: true, editing: null })}
              onEditCuartel={(c) => setCuartelModal({ open: true, editing: c })}
              onDeleteCuartel={handleDeleteCuartel}
              onNewMaquina={() => setMaquinaModal({ open: true, editing: null })}
              onEditMaquina={(m) => setMaquinaModal({ open: true, editing: m })}
              onDeleteMaquina={(id) =>
                setState((prev) => ({
                  ...prev,
                  maquinas: prev.maquinas.filter((m) => m.id !== id),
                }))
              }
              onNewMaquinariaLog={() => setMaqModal({ open: true, editing: null })}
              onEditMaquinariaLog={(m) => setMaqModal({ open: true, editing: m })}
              onDeleteMaquinariaLog={(id) =>
                setState((prev) => ({
                  ...prev,
                  maquinaria: prev.maquinaria.filter((m) => m.id !== id),
                }))
              }
              onNewCultivo={() => setCultivoModal({ open: true, editing: null })}
              onEditCultivo={(c) => setCultivoModal({ open: true, editing: c })}
              onDeleteCultivo={handleDeleteCultivo}
            />
          )}

          {effectiveSection === 'usuarios' && isAppAdmin(authUser.rol) && (
            <AdminUsuariosSection
              authToken={authToken}
              currentUserId={authUser.id}
              serviceStatus={serviceStatus}
              onServiceStatusUpdated={setServiceStatus}
              onUsersChanged={refreshPersonalHabilitado}
            />
          )}
        </main>

        <footer className="px-4 sm:px-8 py-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2 max-w-[1440px] w-full mx-auto">
          <span className="font-mono tabular-nums">
            {empresaInfo.razonSocial} · RUT {empresaInfo.rut} · Ref. {empresaInfo.referencia}
          </span>
          <span>
            {empresaInfo.domicilio}, {empresaInfo.comuna}
          </span>
        </footer>
      </div>

      {/* Modals */}
      {laborModal.open && (
        <LaborModal
          initial={laborModal.editing}
          cuarteles={state.cuarteles}
          maquinas={state.maquinas}
          personalHabilitado={personalHabilitado}
          onClose={() => setLaborModal({ open: false, editing: null })}
          onSave={handleSaveLabor}
        />
      )}

      {apModal.open && (
        <AplicacionModal
          initial={apModal.editing}
          cuarteles={state.cuarteles}
          personalHabilitado={personalHabilitado}
          onClose={() => setApModal({ open: false, editing: null })}
          onSave={handleSaveAplicacion}
        />
      )}

      {cosechaModal.open && (
        <CosechaModal
          initial={cosechaModal.editing}
          defaultCultivo={cosechaModal.defaultCultivo}
          cuarteles={state.cuarteles}
          cultivos={state.cultivos}
          aplicaciones={state.aplicaciones}
          onClose={() => setCosechaModal({ open: false, editing: null })}
          onSave={handleSaveCosecha}
        />
      )}

      {cuartelModal.open && (
        <CuartelModal
          initial={cuartelModal.editing}
          cultivos={state.cultivos}
          presetPolygon={cuartelModal.presetPolygon}
          presetCenter={cuartelModal.presetCenter}
          onClose={() => setCuartelModal({ open: false, editing: null })}
          onSave={handleSaveCuartel}
        />
      )}

      {bodegaModal.open && (
        <BodegaItemModal
          initial={bodegaModal.editing}
          defaultCategoria={bodegaModal.defaultCat}
          cultivos={state.cultivos}
          onClose={() => setBodegaModal({ open: false, editing: null })}
          onSave={handleSaveBodegaItem}
        />
      )}

      {ordenModal.open && (
        <OrdenAplicacionModal
          initial={ordenModal.editing}
          cuarteles={state.cuarteles}
          bodega={state.bodega}
          maquinas={state.maquinas}
          personalHabilitado={personalHabilitado}
          nextNumero={nextOrdenNum}
          presetFromPlaga={ordenModal.presetFromPlaga}
          onClose={() =>
            setOrdenModal({ open: false, editing: null, presetFromPlaga: null })
          }
          onSave={handleSaveOrden}
        />
      )}

      {riegoModal.open && (
        <RiegoModal
          initial={riegoModal.editing}
          cuarteles={state.cuarteles}
          sectoresRiego={state.sectoresRiego}
          onClose={() => setRiegoModal({ open: false, editing: null })}
          onSave={handleSaveRiego}
        />
      )}

      {sectorRiegoModal.open && (
        <SectorRiegoModal
          initial={sectorRiegoModal.editing}
          cuarteles={state.cuarteles}
          onClose={() => setSectorRiegoModal({ open: false, editing: null })}
          onSave={handleSaveSectorRiego}
        />
      )}

      {plagaModal.open && (
        <PlagaModal
          initial={plagaModal.editing}
          cuarteles={state.cuarteles}
          onClose={() => setPlagaModal({ open: false, editing: null })}
          onSave={handleSavePlaga}
        />
      )}

      {climaModal.open && (
        <ClimaManualModal
          initial={climaModal.editing}
          coords={climaModal.coords}
          onClose={() => setClimaModal((prev) => ({ ...prev, open: false, editing: null }))}
          onSave={handleSaveClimaManual}
        />
      )}

      {cultivoModal.open && (
        <CultivoModal
          initial={cultivoModal.editing}
          onClose={() => setCultivoModal({ open: false, editing: null })}
          onSave={handleSaveCultivo}
        />
      )}

      {kardexModal.open && kardexModal.editing && (
        <MovimientoKardexModal
          initial={kardexModal.editing}
          bodega={state.bodega}
          onClose={() => setKardexModal({ open: false, editing: null })}
          onSave={handleSaveMovimientoKardex}
        />
      )}

      {maquinaModal.open && (
        <MaquinaModal
          initial={maquinaModal.editing}
          cultivos={state.cultivos}
          onClose={() => setMaquinaModal({ open: false, editing: null })}
          onSave={handleSaveMaquina}
        />
      )}

      {maqModal.open && (
        <MaquinariaModal
          initial={maqModal.editing}
          cultivos={state.cultivos}
          maquinas={state.maquinas}
          personalHabilitado={personalHabilitado}
          onClose={() => setMaqModal({ open: false, editing: null })}
          onSave={handleSaveMaquinariaLog}
        />
      )}

      {backupModalOpen && (
        <BackupModal
          onClose={() => setBackupModalOpen(false)}
          onExportJSON={() =>
            downloadJSON(`agricola-queni-respaldo-${getTodayISO()}.json`, state)
          }
          onImportJSON={(imported) => setState(mergeWithDefaults(imported))}
          onResetDemo={() => setState(createInitialCuadernoState())}
        />
      )}

      {profileModalOpen && (
        <UserAccountModal
          user={authUser}
          onClose={() => setProfileModalOpen(false)}
        />
      )}

      {empresaModalOpen && (
        <AgricolaInfoModal
          initial={empresaInfo}
          onClose={() => setEmpresaModalOpen(false)}
          onSave={(nextInfo) => {
            setState((prev) => ({ ...prev, empresaInfo: nextInfo }));
            setPublicEmpresaInfo(nextInfo);
            setEmpresaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
