/// <reference types="google.maps" />
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Pentagon,
  Plus,
  Check,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
  Compass,
  Undo2,
} from 'lucide-react';
import {
  AgricolaInfo,
  AplicacionFitosanitaria,
  Cuartel,
  CultivoConfig,
  LatLngPoint,
  MonitoreoPlaga,
  PuntoMapa,
  TipoPuntoMapa,
} from '../types/fieldbook';
import {
  computePolygonAreaHa,
  computePolygonCenter,
  formatNumberCL,
  getCarenciaStatus,
} from '../utils/formatters';

interface MapSectionProps {
  apiKey: string;
  empresaInfo: AgricolaInfo;
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  puntosMapa: PuntoMapa[];
  aplicaciones: AplicacionFitosanitaria[];
  plagas: MonitoreoPlaga[];
  canEdit: boolean;
  onCreateCuartelFromPolygon: (polygon: LatLngPoint[], areaHa: number, center: LatLngPoint) => void;
  onQuickCuartel: (center: LatLngPoint) => void;
  onEditCuartel: (c: Cuartel) => void;
  onDeleteCuartel?: (id: string) => void;
  onEditPlaga?: (pl: MonitoreoPlaga) => void;
  onSavePunto: (punto: Omit<PuntoMapa, 'id'>, id?: string) => void;
  onDeletePunto: (id: string) => void;
}

type LayerMode = 'hybrid' | 'satellite' | 'roadmap' | 'terrain';
type VerFilter = 'Todos' | 'Cuarteles' | 'Barbechos' | 'Bodegas' | 'Riego' | 'Plagas';

const PUNTO_STYLES: Record<TipoPuntoMapa, { bg: string; emoji: string }> = {
  Barbecho: { bg: '#D97706', emoji: '🌾' },
  Bodega: { bg: '#7C3AED', emoji: '🧪' },
  Oficina: { bg: '#334155', emoji: '🏢' },
  'Casa Patronal': { bg: '#0F766E', emoji: '🏡' },
  'Caseta Riego': { bg: '#0284C7', emoji: '💧' },
  'Pozo DGA': { bg: '#0369A1', emoji: '🚰' },
  Taller: { bg: '#475569', emoji: '🚜' },
  'Entrada Principal': { bg: '#44403C', emoji: '🚪' },
  'Trampa Plaga': { bg: '#BE123C', emoji: '🪲' },
  'Estación Clima': { bg: '#0D9488', emoji: '🌤️' },
};

function shortVarietyName(variedad: string): string {
  const clean = variedad.trim();
  if (!clean) return 'S/V';
  const first = clean.split('(')[0].trim();
  return first.length > 14 ? `${first.slice(0, 12)}…` : first;
}

const PolygonOverlayManager: React.FC<{
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  drawingVertices: LatLngPoint[];
  visible: boolean;
  onSelectCuartel: (c: Cuartel) => void;
}> = ({ cuarteles, cultivos, drawingVertices, visible, onSelectCuartel }) => {
  const map = useMap();
  const mapsLib = useMapsLibrary('maps');
  const polygonsRef = useRef<google.maps.Polygon[]>([]);
  const previewRef = useRef<google.maps.Polygon | null>(null);

  useEffect(() => {
    polygonsRef.current.forEach((p) => p.setMap(null));
    polygonsRef.current = [];

    if (!map || !mapsLib || !visible) return;

    cuarteles.forEach((c) => {
      if (!c.polygon || c.polygon.length < 3) return;
      const cropColor =
        cultivos.find((cul) => cul.nombre === c.cultivo)?.colorHex || '#16A34A';

      const poly = new mapsLib.Polygon({
        paths: c.polygon,
        strokeColor: cropColor,
        strokeOpacity: 0.95,
        strokeWeight: 2.2,
        fillColor: cropColor,
        fillOpacity: 0.28,
        clickable: true,
        map,
      });

      poly.addListener('click', () => onSelectCuartel(c));
      polygonsRef.current.push(poly);
    });

    return () => {
      polygonsRef.current.forEach((p) => p.setMap(null));
      polygonsRef.current = [];
    };
  }, [map, mapsLib, cuarteles, cultivos, visible, onSelectCuartel]);

  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.setMap(null);
      previewRef.current = null;
    }
    if (!map || !mapsLib || drawingVertices.length < 2) return;

    previewRef.current = new mapsLib.Polygon({
      paths: drawingVertices,
      strokeColor: '#2563EB',
      strokeOpacity: 1,
      strokeWeight: 2.5,
      fillColor: '#3B82F6',
      fillOpacity: 0.25,
      clickable: false,
      map,
    });

    return () => {
      if (previewRef.current) {
        previewRef.current.setMap(null);
        previewRef.current = null;
      }
    };
  }, [map, mapsLib, drawingVertices]);

  return null;
};

const MapInner: React.FC<{
  defaultCenter: LatLngPoint;
  cuarteles: Cuartel[];
  cultivos: CultivoConfig[];
  puntosMapa: PuntoMapa[];
  aplicaciones: AplicacionFitosanitaria[];
  plagas: MonitoreoPlaga[];
  canEdit: boolean;
  mapType: LayerMode;
  onSyncMapType: (mode: LayerMode) => void;
  verFilter: VerFilter;
  drawMode: 'none' | 'polygon' | 'point';
  setDrawMode: (m: 'none' | 'polygon' | 'point') => void;
  drawingVertices: LatLngPoint[];
  setDrawingVertices: React.Dispatch<React.SetStateAction<LatLngPoint[]>>;
  onOpenNewPoint: (pos: LatLngPoint) => void;
  selectedCuartel: Cuartel | null;
  setSelectedCuartel: (c: Cuartel | null) => void;
  selectedPunto: PuntoMapa | null;
  setSelectedPunto: (p: PuntoMapa | null) => void;
  selectedPlaga: MonitoreoPlaga | null;
  setSelectedPlaga: (p: MonitoreoPlaga | null) => void;
  onEditCuartel: (c: Cuartel) => void;
  onDeleteCuartel?: (id: string) => void;
  onEditPunto: (p: PuntoMapa) => void;
  onDeletePunto: (id: string) => void;
  onEditPlaga?: (pl: MonitoreoPlaga) => void;
}> = ({
  defaultCenter,
  cuarteles,
  cultivos,
  puntosMapa,
  aplicaciones,
  plagas,
  canEdit,
  mapType,
  onSyncMapType,
  verFilter,
  drawMode,
  setDrawMode,
  drawingVertices,
  setDrawingVertices,
  onOpenNewPoint,
  selectedCuartel,
  setSelectedCuartel,
  selectedPunto,
  setSelectedPunto,
  selectedPlaga,
  setSelectedPlaga,
  onEditCuartel,
  onDeleteCuartel,
  onEditPunto,
  onDeletePunto,
  onEditPlaga,
}) => {
  const map = useMap();

  useEffect(() => {
    if (map) {
      map.setMapTypeId(mapType);
      map.setOptions({
        draggableCursor: drawMode !== 'none' ? 'crosshair' : null,
      });
    }
  }, [map, mapType, drawMode]);

  useEffect(() => {
    if (map && selectedCuartel) {
      map.panTo(selectedCuartel.center);
    }
  }, [map, selectedCuartel]);

  const showCuarteles = verFilter === 'Todos' || verFilter === 'Cuarteles';
  const showPlagas = verFilter === 'Todos' || verFilter === 'Plagas';
  const filteredPuntos = useMemo(() => {
    return puntosMapa.filter((p) => {
      if (verFilter === 'Todos') return true;
      if (verFilter === 'Cuarteles') return false;
      if (verFilter === 'Barbechos') return p.tipo === 'Barbecho';
      if (verFilter === 'Bodegas') {
        return ['Bodega', 'Oficina', 'Casa Patronal', 'Entrada Principal', 'Taller'].includes(p.tipo);
      }
      if (verFilter === 'Riego') {
        return ['Caseta Riego', 'Pozo DGA', 'Estación Clima'].includes(p.tipo);
      }
      if (verFilter === 'Plagas') {
        return ['Trampa Plaga', 'Estación Clima'].includes(p.tipo);
      }
      return true;
    });
  }, [puntosMapa, verFilter]);

  const handleMapClick = useCallback(
    (ev: { detail?: { latLng?: { lat: number; lng: number } | null } }) => {
      const latLng = ev.detail?.latLng;
      if (!latLng) return;

      if (drawMode === 'polygon') {
        setDrawingVertices((prev) => [
          ...prev,
          { lat: Number(latLng.lat.toFixed(6)), lng: Number(latLng.lng.toFixed(6)) },
        ]);
      } else if (drawMode === 'point') {
        onOpenNewPoint({
          lat: Number(latLng.lat.toFixed(6)),
          lng: Number(latLng.lng.toFixed(6)),
        });
        setDrawMode('none');
      } else {
        setSelectedCuartel(null);
        setSelectedPunto(null);
        setSelectedPlaga(null);
      }
    },
    [
      drawMode,
      setDrawingVertices,
      onOpenNewPoint,
      setDrawMode,
      setSelectedCuartel,
      setSelectedPunto,
      setSelectedPlaga,
    ]
  );

  return (
    <GoogleMap
      defaultCenter={defaultCenter}
      defaultZoom={15}
      mapId="DEMO_MAP_ID"
      mapTypeId={mapType}
      gestureHandling="greedy"
      streetViewControl={true}
      fullscreenControl={true}
      mapTypeControl={true}
      onMapTypeIdChanged={(ev) => {
        const nextId = ev.map?.getMapTypeId() as LayerMode | undefined;
        if (nextId && nextId !== mapType) {
          onSyncMapType(nextId);
        }
      }}
      onClick={handleMapClick}
      internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
      style={{ width: '100%', height: '560px' }}
    >
      <PolygonOverlayManager
        cuarteles={cuarteles}
        cultivos={cultivos}
        drawingVertices={drawingVertices}
        visible={showCuarteles}
        onSelectCuartel={(c) => {
          setSelectedPunto(null);
          setSelectedPlaga(null);
          setSelectedCuartel(c);
        }}
      />

      {/* Drawing vertex markers */}
      {drawingVertices.map((v, idx) => (
        <AdvancedMarker key={`dv-${idx}`} position={v}>
          <div className="w-3.5 h-3.5 rounded-full bg-blue-600 border-2 border-white shadow" />
        </AdvancedMarker>
      ))}

      {/* Cuartel Badge Markers organized by Species & Variety */}
      {showCuarteles &&
        cuarteles.map((c) => {
          const cropColor =
            cultivos.find((cul) => cul.nombre === c.cultivo)?.colorHex || '#16A34A';
          const enCarencia = aplicaciones.some(
            (ap) =>
              ap.cuartelId === c.id &&
              getCarenciaStatus(ap.fecha, ap.carenciaDias).enCarencia
          );
          return (
            <AdvancedMarker
              key={c.id}
              position={c.center}
              onClick={() => {
                setSelectedPunto(null);
                setSelectedPlaga(null);
                setSelectedCuartel(c);
              }}
            >
              <div
                style={{ backgroundColor: cropColor }}
                title={`${c.cultivo} · ${c.variedad} (${c.nombre})`}
                className="px-2.5 py-1 rounded-full border-2 border-white text-white text-[11px] font-bold shadow-md flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <span>{c.codigo}</span>
                <span className="font-normal opacity-90 text-[10px]">
                  · {shortVarietyName(c.variedad)}
                </span>
                {enCarencia && <span title="En carencia">⚠</span>}
              </div>
            </AdvancedMarker>
          );
        })}

      {/* Infrastructure / Point Markers */}
      {filteredPuntos.map((p) => {
        const st = PUNTO_STYLES[p.tipo] || { bg: '#334155', emoji: '📍' };
        return (
          <AdvancedMarker
            key={p.id}
            position={p.position}
            onClick={() => {
              setSelectedCuartel(null);
              setSelectedPlaga(null);
              setSelectedPunto(p);
            }}
          >
            <div
              style={{ backgroundColor: st.bg }}
              className="px-2.5 py-1 rounded-full border-2 border-white text-white text-[11px] font-semibold shadow-md flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>{st.emoji}</span>
              <span>{p.nombre}</span>
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Georeferenced Pest Monitoring Markers */}
      {showPlagas &&
        plagas.map((pl) => (
          <AdvancedMarker
            key={pl.id}
            position={pl.position}
            onClick={() => {
              setSelectedCuartel(null);
              setSelectedPunto(null);
              setSelectedPlaga(pl);
            }}
          >
            <div
              style={{
                backgroundColor:
                  pl.nivel === 'Crítico'
                    ? '#E11D48'
                    : pl.nivel === 'Umbral Alerta'
                    ? '#D97706'
                    : '#0F766E',
              }}
              className="px-2 py-0.5 rounded-full border-2 border-white text-white text-[10px] font-semibold shadow-md flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>🪲</span>
              <span>{pl.plagaOEnfermedad.split('(')[0].trim()}</span>
            </div>
          </AdvancedMarker>
        ))}

      {/* InfoWindow for Cuartel */}
      {selectedCuartel && (
        <InfoWindow
          position={selectedCuartel.center}
          onCloseClick={() => setSelectedCuartel(null)}
        >
          <div className="text-slate-900 min-w-[225px] p-1 space-y-1.5">
            <div className="text-xs font-mono text-slate-500">
              {selectedCuartel.codigo} · {selectedCuartel.estado}
            </div>
            <div className="font-semibold text-sm">{selectedCuartel.nombre}</div>
            <div className="text-xs text-slate-700 space-y-0.5">
              <div>
                <strong>Especie:</strong> {selectedCuartel.cultivo}
              </div>
              <div>
                <strong>Variedad:</strong> {selectedCuartel.variedad || 'Sin especificar'}
              </div>
              <div>
                <strong>Superficie:</strong> {formatNumberCL(selectedCuartel.superficieHa, 2)} ha ·{' '}
                {formatNumberCL(selectedCuartel.plantasPorHa, 0)} pl/ha
              </div>
            </div>
            <div className="text-[11px] font-mono text-slate-500">
              GPS: {selectedCuartel.center.lat.toFixed(5)}, {selectedCuartel.center.lng.toFixed(5)}
            </div>
            {canEdit && (
              <div className="mt-1.5 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onEditCuartel(selectedCuartel)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Editar ficha del cuartel</span>
                </button>
                {onDeleteCuartel && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteCuartel(selectedCuartel.id);
                      setSelectedCuartel(null);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* InfoWindow for Punto */}
      {selectedPunto && (
        <InfoWindow
          position={selectedPunto.position}
          onCloseClick={() => setSelectedPunto(null)}
        >
          <div className="text-slate-900 min-w-[200px] p-1 space-y-1.5">
            <div className="text-xs font-semibold text-slate-500">{selectedPunto.tipo}</div>
            <div className="font-semibold text-sm">{selectedPunto.nombre}</div>
            {selectedPunto.notas && (
              <p className="text-xs text-slate-600">{selectedPunto.notas}</p>
            )}
            <div className="text-[11px] font-mono text-slate-500">
              GPS: {selectedPunto.position.lat.toFixed(5)}, {selectedPunto.position.lng.toFixed(5)}
            </div>
            {canEdit && (
              <div className="flex items-center gap-3 pt-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onEditPunto(selectedPunto);
                    setSelectedPunto(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Editar punto</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeletePunto(selectedPunto.id);
                    setSelectedPunto(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Eliminar</span>
                </button>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* InfoWindow for Plaga */}
      {selectedPlaga && (
        <InfoWindow
          position={selectedPlaga.position}
          onCloseClick={() => setSelectedPlaga(null)}
        >
          <div className="text-slate-900 min-w-[220px] p-1 space-y-1.5">
            <div className="text-xs font-semibold text-rose-700">
              Monitoreo Fitosanitario · {selectedPlaga.nivel}
            </div>
            <div className="font-semibold text-sm">{selectedPlaga.plagaOEnfermedad}</div>
            <div className="text-xs text-slate-600">
              {selectedPlaga.cultivo} · Incidencia {selectedPlaga.porcentajeIncidencia}%
            </div>
            <p className="text-xs text-slate-600">{selectedPlaga.recomendacion}</p>
            <div className="text-[11px] font-mono text-slate-500">
              GPS: {selectedPlaga.position.lat.toFixed(5)}, {selectedPlaga.position.lng.toFixed(5)}
            </div>
            {canEdit && onEditPlaga && (
              <button
                type="button"
                onClick={() => {
                  onEditPlaga(selectedPlaga);
                  setSelectedPlaga(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
              >
                <Pencil className="w-3 h-3" />
                <span>Editar monitoreo</span>
              </button>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
};

export const MapSection: React.FC<MapSectionProps> = ({
  apiKey,
  empresaInfo,
  cuarteles,
  cultivos,
  puntosMapa,
  aplicaciones,
  plagas,
  canEdit,
  onCreateCuartelFromPolygon,
  onQuickCuartel,
  onEditCuartel,
  onDeleteCuartel,
  onEditPlaga,
  onSavePunto,
  onDeletePunto,
}) => {
  const [mapType, setMapType] = useState<LayerMode>('hybrid');
  const [verFilter, setVerFilter] = useState<VerFilter>('Todos');
  const [especieFilter, setEspecieFilter] = useState<string>('Todas');
  const [variedadFilter, setVariedadFilter] = useState<string>('Todas');
  const [drawMode, setDrawMode] = useState<'none' | 'polygon' | 'point'>('none');
  const [drawingVertices, setDrawingVertices] = useState<LatLngPoint[]>([]);
  const [selectedCuartel, setSelectedCuartel] = useState<Cuartel | null>(null);
  const [selectedPunto, setSelectedPunto] = useState<PuntoMapa | null>(null);
  const [selectedPlaga, setSelectedPlaga] = useState<MonitoreoPlaga | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Modal state for infrastructure point (create or edit)
  const [pointModal, setPointModal] = useState<{
    open: boolean;
    editingId?: string;
    pos: LatLngPoint;
  }>({
    open: false,
    pos: empresaInfo.defaultCenter,
  });
  const [pointName, setPointName] = useState('');
  const [pointTipo, setPointTipo] = useState<TipoPuntoMapa>('Bodega');
  const [pointNotas, setPointNotas] = useState('');
  const [pointLat, setPointLat] = useState(String(empresaInfo.defaultCenter.lat));
  const [pointLng, setPointLng] = useState(String(empresaInfo.defaultCenter.lng));

  const openPointModalForNew = (pos: LatLngPoint) => {
    setPointName('');
    setPointTipo('Bodega');
    setPointNotas('');
    setPointLat(String(pos.lat));
    setPointLng(String(pos.lng));
    setPointModal({ open: true, pos });
  };

  const openPointModalForEdit = (p: PuntoMapa) => {
    setPointName(p.nombre);
    setPointTipo(p.tipo);
    setPointNotas(p.notas || '');
    setPointLat(String(p.position.lat));
    setPointLng(String(p.position.lng));
    setPointModal({ open: true, editingId: p.id, pos: p.position });
  };

  // Available varieties dynamically scoped by selected species
  const availableVarieties = useMemo(() => {
    const base =
      especieFilter === 'Todas'
        ? cuarteles
        : cuarteles.filter((c) => c.cultivo === especieFilter);
    return Array.from(new Set(base.map((c) => c.variedad).filter(Boolean))).sort();
  }, [cuarteles, especieFilter]);

  useEffect(() => {
    if (variedadFilter !== 'Todas' && !availableVarieties.includes(variedadFilter)) {
      setVariedadFilter('Todas');
    }
  }, [availableVarieties, variedadFilter]);

  // Filtered and organized cuarteles (sorted by Species -> Variety -> Code)
  const visibleCuarteles = useMemo(() => {
    return cuarteles
      .filter((c) => {
        if (especieFilter !== 'Todas' && c.cultivo !== especieFilter) return false;
        if (variedadFilter !== 'Todas' && c.variedad !== variedadFilter) return false;
        return true;
      })
      .sort((a, b) => {
        const cmpCrop = a.cultivo.localeCompare(b.cultivo);
        if (cmpCrop !== 0) return cmpCrop;
        const cmpVar = a.variedad.localeCompare(b.variedad);
        if (cmpVar !== 0) return cmpVar;
        return a.codigo.localeCompare(b.codigo);
      });
  }, [cuarteles, especieFilter, variedadFilter]);

  const speciesSummary = useMemo(() => {
    return cultivos.map((cul) => {
      const list = cuarteles.filter((c) => c.cultivo === cul.nombre);
      const ha = list.reduce((acc, c) => acc + c.superficieHa, 0);
      const variedades = Array.from(new Set(list.map((c) => c.variedad).filter(Boolean)));
      return {
        ...cul,
        count: list.length,
        ha,
        variedades,
      };
    });
  }, [cultivos, cuarteles]);

  const handleFinishPolygon = () => {
    if (drawingVertices.length < 3) return;
    const areaHa = computePolygonAreaHa(drawingVertices);
    const center = computePolygonCenter(drawingVertices);
    onCreateCuartelFromPolygon(drawingVertices, areaHa, center);
    setDrawingVertices([]);
    setDrawMode('none');
  };

  const handleSubmitPoint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointName.trim()) return;
    onSavePunto(
      {
        nombre: pointName.trim(),
        tipo: pointTipo,
        position: {
          lat: Number(pointLat) || pointModal.pos.lat,
          lng: Number(pointLng) || pointModal.pos.lng,
        },
        notas: pointNotas.trim(),
      },
      pointModal.editingId
    );
    setPointModal({ open: false, pos: empresaInfo.defaultCenter });
    setPointName('');
    setPointNotas('');
  };

  const previewHa = useMemo(
    () => (drawingVertices.length >= 3 ? computePolygonAreaHa(drawingVertices) : 0),
    [drawingVertices]
  );

  return (
    <div className="space-y-4">
      {/* Top Catastro Card matching reference layout */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide">
            <Compass className="w-3.5 h-3.5" />
            <span>CATASTRO PREDIAL & MAPA SATELITAL POR ESPECIE Y VARIEDAD</span>
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
            Mapa del Huerto & Cuarteles de {empresaInfo.nombreCorto}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Cuarteles georreferenciados en Google Maps organizados por especie de cultivo y variedad en {empresaInfo.domicilio} ({empresaInfo.comuna}).
          </p>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setDrawingVertices([]);
                setDrawMode((m) => (m === 'polygon' ? 'none' : 'polygon'));
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                drawMode === 'polygon'
                  ? 'bg-blue-700 text-white ring-2 ring-blue-300'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <Pentagon className="w-4 h-4" />
              <span>Trazar Polígono de Cuartel</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDrawingVertices([]);
                setDrawMode((m) => (m === 'point' ? 'none' : 'point'));
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                drawMode === 'point'
                  ? 'bg-amber-600 text-white ring-2 ring-amber-300'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Agregar Punto</span>
            </button>

            <button
              type="button"
              onClick={() => onQuickCuartel(empresaInfo.defaultCenter)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Cuartel Rápido</span>
            </button>
          </div>
        )}
      </div>

      {/* Interactive Drawing Banner */}
      {drawMode === 'polygon' && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900 dark:text-blue-200">
          <span>
            <strong>Modo Trazado de Polígono:</strong> Haz clic en el mapa satelital para marcar cada vértice del cuartel ({drawingVertices.length} puntos · Superficie estimada:{' '}
            <strong className="font-mono tabular-nums">{formatNumberCL(previewHa, 2)} ha</strong>).
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {drawingVertices.length > 0 && (
              <button
                type="button"
                onClick={() => setDrawingVertices((prev) => prev.slice(0, -1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer punto</span>
              </button>
            )}
            <button
              type="button"
              disabled={drawingVertices.length < 3}
              onClick={handleFinishPolygon}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-medium"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Finalizar y Guardar Cuartel</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDrawingVertices([]);
                setDrawMode('none');
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 font-medium"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          </div>
        </div>
      )}

      {drawMode === 'point' && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
          <span>
            <strong>Modo Agregar Punto:</strong> Haz clic sobre la ubicación exacta en el mapa para georreferenciar Bodega, Pozo DGA, Barbecho, Caseta o Trampa.
          </span>
          <button
            type="button"
            onClick={() => setDrawMode('none')}
            className="px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 font-medium"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Map Container + Dark Top Bar + Species/Variety Organization Bar */}
      <div className="rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-slate-900 shadow-sm">
        {/* Dark Layer & Filter Bar matching screenshot */}
        <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">CAPA DE MAPA:</span>
            {(
              [
                { id: 'hybrid', label: 'Google Híbrido' },
                { id: 'satellite', label: 'Google Satélite' },
                { id: 'roadmap', label: 'Google Calles' },
                { id: 'terrain', label: 'Relieve' },
              ] as const
            ).map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => setMapType(layer.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  mapType === layer.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {layer.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-semibold mr-1">VER:</span>
            {(
              [
                { id: 'Todos', label: 'Todos' },
                { id: 'Cuarteles', label: `Cuarteles (${visibleCuarteles.length})` },
                { id: 'Barbechos', label: 'Barbechos' },
                { id: 'Bodegas', label: 'Bodegas & Oficinas' },
                { id: 'Riego', label: 'Riego & Pozo' },
                { id: 'Plagas', label: `Plagas (${plagas.length})` },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setVerFilter(f.id)}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                  verFilter === f.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Species & Variety Sub-Bar */}
        <div className="bg-slate-950/90 text-slate-200 px-4 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-semibold mr-1">ESPECIE:</span>
            <button
              type="button"
              onClick={() => setEspecieFilter('Todas')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                especieFilter === 'Todas'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Todas ({cuarteles.length})
            </button>
            {speciesSummary.map((sp) => (
              <button
                key={sp.id}
                type="button"
                onClick={() => setEspecieFilter(sp.nombre)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  especieFilter === sp.nombre
                    ? 'bg-emerald-700 text-white ring-1 ring-white/40'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span
                  style={{ backgroundColor: sp.colorHex }}
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                />
                <span>
                  {sp.nombre} ({sp.count})
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-400 font-semibold">VARIEDAD:</span>
            <select
              value={variedadFilter}
              onChange={(e) => setVariedadFilter(e.target.value)}
              aria-label="Filtrar cuarteles por variedad"
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="Todas">Todas las variedades ({availableVarieties.length})</option>
              {availableVarieties.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map Canvas */}
        {!apiKey ? (
          <div className="h-[520px] flex flex-col items-center justify-center p-8 text-center bg-slate-900 text-slate-300">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
            <p className="text-sm font-semibold text-white">
              Clave de Google Maps Platform no disponible en este entorno
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Verifica la configuración de Google Maps en AI Studio para visualizar las capas satelitales interactivas de {empresaInfo.domicilio} ({empresaInfo.defaultCenter.lat}, {empresaInfo.defaultCenter.lng}).
            </p>
          </div>
        ) : (
          <APIProvider apiKey={apiKey} libraries={['geometry', 'marker']} language="es" region="CL">
            <MapInner
              defaultCenter={empresaInfo.defaultCenter}
              cuarteles={visibleCuarteles}
              cultivos={cultivos}
              puntosMapa={puntosMapa}
              aplicaciones={aplicaciones}
              plagas={plagas}
              canEdit={canEdit}
              mapType={mapType}
              onSyncMapType={setMapType}
              verFilter={verFilter}
              drawMode={drawMode}
              setDrawMode={setDrawMode}
              drawingVertices={drawingVertices}
              setDrawingVertices={setDrawingVertices}
              onOpenNewPoint={(pos) => {
                openPointModalForNew(pos);
              }}
              selectedCuartel={selectedCuartel}
              setSelectedCuartel={setSelectedCuartel}
              selectedPunto={selectedPunto}
              setSelectedPunto={setSelectedPunto}
              selectedPlaga={selectedPlaga}
              setSelectedPlaga={setSelectedPlaga}
              onEditCuartel={onEditCuartel}
              onDeleteCuartel={onDeleteCuartel}
              onEditPunto={openPointModalForEdit}
              onDeletePunto={onDeletePunto}
              onEditPlaga={onEditPlaga}
            />
          </APIProvider>
        )}

        {/* Bottom Legend Bar */}
        <div className="bg-white dark:bg-slate-900 px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-800 dark:text-slate-200">Especies & Variedades:</span>
            {speciesSummary.map((cul) => (
              <span key={cul.id} className="inline-flex items-center gap-1.5">
                <span
                  style={{ backgroundColor: cul.colorHex }}
                  className="w-2.5 h-2.5 rounded-full inline-block"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">{cul.nombre}</span>
                {cul.variedades.length > 0 && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ({cul.variedades.join(', ')})
                  </span>
                )}
              </span>
            ))}
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>🌾 Barbecho</span>
            <span>🧪 Bodega</span>
            <span>💧 Caseta Riego</span>
            <span>🚰 Pozo DGA</span>
            <span>🪲 Trampa Plaga</span>
            <span>🌤️ Estación Clima</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Haz clic en cualquier cuartel para ver su especie, variedad y ficha agronómica.
          </span>
        </div>
      </div>

      {/* Georeferenced Table Summary below Map organized by Species & Variety */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Catastro Georreferenciado por Especie y Variedad ({visibleCuarteles.length} cuarteles · {puntosMapa.length} puntos prediales · {plagas.length} focos/trampas)
          </h3>
          <span className="font-mono tabular-nums text-xs text-slate-500 dark:text-slate-400">
            {empresaInfo.utm}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4">Código</th>
                <th className="py-2.5 px-4">Especie de Cultivo</th>
                <th className="py-2.5 px-4">Variedad / Clon</th>
                <th className="py-2.5 px-4">Cuartel</th>
                <th className="py-2.5 px-4 text-right">Superficie</th>
                <th className="py-2.5 px-4">Coordenadas Centro (WGS84)</th>
                <th className="py-2.5 px-4 text-right">Vértices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {visibleCuarteles.map((c) => {
                const cropColor =
                  cultivos.find((cul) => cul.nombre === c.cultivo)?.colorHex || '#16A34A';
                return (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setSelectedPunto(null);
                      setSelectedPlaga(null);
                      setSelectedCuartel(c);
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {c.codigo}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                        <span
                          style={{ backgroundColor: cropColor }}
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                        />
                        <span>{c.cultivo}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {c.variedad}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-slate-100">
                      {c.nombre}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                      {formatNumberCL(c.superficieHa, 2)} ha
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {c.center.lat.toFixed(5)}, {c.center.lng.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                      {c.polygon.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Puntos Prediales Georreferenciados (Editables) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
            Puntos de Infraestructura y Puntos Prediales ({puntosMapa.length})
          </h3>
          {canEdit && (
            <button
              type="button"
              onClick={() => openPointModalForNew(empresaInfo.defaultCenter)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Punto GPS</span>
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4">Tipo</th>
                <th className="py-2.5 px-4">Nombre</th>
                <th className="py-2.5 px-4">Coordenadas GPS</th>
                <th className="py-2.5 px-4">Notas</th>
                {canEdit && <th className="py-2.5 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {puntosMapa.map((pt) => {
                const st = PUNTO_STYLES[pt.tipo] || { bg: '#334155', emoji: '📍' };
                return (
                  <tr
                    key={pt.id}
                    onClick={() => {
                      setSelectedCuartel(null);
                      setSelectedPlaga(null);
                      setSelectedPunto(pt);
                    }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap font-medium">
                      <span className="mr-1.5">{st.emoji}</span>
                      <span>{pt.tipo}</span>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {pt.nombre}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {pt.position.lat.toFixed(5)}, {pt.position.lng.toFixed(5)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">
                      {pt.notas || '—'}
                    </td>
                    {canEdit && (
                      <td
                        className="py-2.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openPointModalForEdit(pt)}
                            aria-label={`Editar ${pt.nombre}`}
                            className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === pt.id ? (
                            <button
                              type="button"
                              onClick={() => {
                                onDeletePunto(pt.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-1 rounded-md bg-rose-600 text-white text-[11px] font-semibold"
                            >
                              Confirmar
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(pt.id)}
                              aria-label={`Eliminar ${pt.nombre}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for new/edit PuntoMapa */}
      {pointModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">
              {pointModal.editingId
                ? 'Editar Punto Georreferenciado'
                : 'Agregar Punto Georreferenciado'}
            </h3>
            <form onSubmit={handleSubmitPoint} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Punto
                </label>
                <select
                  value={pointTipo}
                  onChange={(e) => setPointTipo(e.target.value as TipoPuntoMapa)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {Object.keys(PUNTO_STYLES).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Punto
                </label>
                <input
                  type="text"
                  required
                  value={pointName}
                  onChange={(e) => setPointName(e.target.value)}
                  placeholder="Ej: Bodega Norte / Trampa Drosophila #2"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Latitud (WGS84)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={pointLat}
                    onChange={(e) => setPointLat(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Longitud (WGS84)
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={pointLng}
                    onChange={(e) => setPointLng(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notas
                </label>
                <textarea
                  rows={2}
                  value={pointNotas}
                  onChange={(e) => setPointNotas(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPointModal({ open: false, pos: empresaInfo.defaultCenter })}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-emerald-700 text-white"
                >
                  {pointModal.editingId ? 'Guardar Cambios' : 'Guardar Punto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
