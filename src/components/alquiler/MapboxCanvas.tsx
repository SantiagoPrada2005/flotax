import { useEffect, useId, useRef, useState } from 'react';
import {
  construirPoligonoCirculoGeoJson,
  formatearCoordenadasHumanas,
  formatearDistanciaKm,
  type CoordenadasGeo,
} from '@/lib/ubicacion';
import type { Map as MapboxMapInstance, Marker as MapboxMarkerInstance } from 'mapbox-gl';

export interface MapboxCanvasProps {
  accessToken: string | null;
  mode: 'patio' | 'domicilio';
  patioCoords: CoordenadasGeo;
  patioNombre: string;
  patioDireccion?: string | null | undefined;
  selectedCoords?: CoordenadasGeo | null | undefined;
  coverageRadiusKm?: number | undefined;
  withinCoverage?: boolean | undefined;
  distanceKm?: number | null | undefined;
  onPinChange?: ((coords: CoordenadasGeo) => void) | undefined;
  heightClass?: string | undefined;
}

const SOURCE_COBERTURA = 'flotax-zona-cobertura';
const LAYER_COBERTURA_FILL = 'flotax-zona-cobertura-fill';
const LAYER_COBERTURA_LINE = 'flotax-zona-cobertura-line';
const SOURCE_PATIO = 'flotax-patio-ancla';
const LAYER_PATIO_HALO = 'flotax-patio-halo';
const LAYER_PATIO_DOT = 'flotax-patio-dot';

function detectarTemaOscuro(): boolean {
  if (typeof document === 'undefined') return false;
  return (
    document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
}

function obtenerEstiloMapbox(esOscuro: boolean): string {
  return esOscuro
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/streets-v12';
}

function esErrorFatalDeToken(errorObj: unknown): boolean {
  if (!errorObj || typeof errorObj !== 'object') return false;
  const status = (errorObj as { status?: unknown }).status;
  return status === 401 || status === 403;
}

export default function MapboxCanvas({
  accessToken,
  mode,
  patioCoords,
  patioNombre,
  patioDireccion,
  selectedCoords,
  coverageRadiusKm = 15,
  withinCoverage = true,
  distanceKm,
  onPinChange,
  heightClass = 'h-[270px] sm:h-[315px]',
}: MapboxCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markerRef = useRef<MapboxMarkerInstance | null>(null);
  const onPinChangeRef = useRef(onPinChange);
  const isDraggingRef = useRef(false);
  const appliedDarkRef = useRef<boolean | null>(null);
  const mapTitleId = useId();

  const [isDark, setIsDark] = useState<boolean>(() => detectarTemaOscuro());
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'fallback'>(() =>
    accessToken ? 'loading' : 'fallback'
  );

  useEffect(() => {
    onPinChangeRef.current = onPinChange;
  }, [onPinChange]);

  // Observar cambios de tema claro/oscuro de FlotaX
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    const syncTheme = () => {
      setIsDark(detectarTemaOscuro());
    };

    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  const coordsActivas: CoordenadasGeo =
    mode === 'domicilio' && selectedCoords ? selectedCoords : patioCoords;

  // Montaje diferido de mapbox-gl únicamente cuando existe token público válido
  useEffect(() => {
    if (!accessToken) {
      setMapState('fallback');
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    let cancelado = false;
    let mapInstance: MapboxMapInstance | null = null;
    let markerInstance: MapboxMarkerInstance | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const pintarCapasGeograficas = (map: MapboxMapInstance, darkActual: boolean) => {
      const patioGeoJson = {
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'Point' as const,
          coordinates: [patioCoords.lng, patioCoords.lat],
        },
      };

      if (mode === 'domicilio') {
        const circuloGeoJson = construirPoligonoCirculoGeoJson(
          patioCoords,
          coverageRadiusKm,
          64
        );

        if (!map.getSource(SOURCE_COBERTURA)) {
          map.addSource(SOURCE_COBERTURA, {
            type: 'geojson',
            data: circuloGeoJson,
          });
        }
        if (!map.getLayer(LAYER_COBERTURA_FILL)) {
          map.addLayer({
            id: LAYER_COBERTURA_FILL,
            type: 'fill',
            source: SOURCE_COBERTURA,
            paint: {
              'fill-color': darkActual ? '#EDEDED' : '#111827',
              'fill-opacity': darkActual ? 0.08 : 0.06,
            },
          });
        }
        if (!map.getLayer(LAYER_COBERTURA_LINE)) {
          map.addLayer({
            id: LAYER_COBERTURA_LINE,
            type: 'line',
            source: SOURCE_COBERTURA,
            paint: {
              'line-color': darkActual ? '#9CA3AF' : '#4B5563',
              'line-width': 1.75,
              'line-dasharray': [3, 2],
              'line-opacity': 0.85,
            },
          });
        }
      }

      if (!map.getSource(SOURCE_PATIO)) {
        map.addSource(SOURCE_PATIO, {
          type: 'geojson',
          data: patioGeoJson,
        });
      }
      if (!map.getLayer(LAYER_PATIO_HALO)) {
        map.addLayer({
          id: LAYER_PATIO_HALO,
          type: 'circle',
          source: SOURCE_PATIO,
          paint: {
            'circle-radius': mode === 'patio' ? 18 : 10,
            'circle-color': darkActual ? '#EDEDED' : '#111827',
            'circle-opacity': mode === 'patio' ? 0.16 : 0.2,
          },
        });
      }
      if (!map.getLayer(LAYER_PATIO_DOT)) {
        map.addLayer({
          id: LAYER_PATIO_DOT,
          type: 'circle',
          source: SOURCE_PATIO,
          paint: {
            'circle-radius': mode === 'patio' ? 5.5 : 4.5,
            'circle-color': darkActual ? '#EDEDED' : '#111827',
            'circle-stroke-width': 2,
            'circle-stroke-color': darkActual ? '#111827' : '#FFFFFF',
          },
        });
      }
    };

    const inicializarMapa = async () => {
      setMapState('loading');
      try {
        const [mapboxModule] = await Promise.all([
          import('mapbox-gl'),
          import('mapbox-gl/dist/mapbox-gl.css'),
        ]);

        if (cancelado || !containerRef.current) return;

        const mapboxgl = mapboxModule.default;
        if (typeof mapboxgl.supported === 'function' && !mapboxgl.supported()) {
          setMapState('fallback');
          return;
        }

        mapboxgl.accessToken = accessToken;

        const darkInicial = detectarTemaOscuro();
        appliedDarkRef.current = darkInicial;

        const inicial: CoordenadasGeo =
          mode === 'domicilio' && selectedCoords ? selectedCoords : patioCoords;

        mapInstance = new mapboxgl.Map({
          container: containerRef.current,
          style: obtenerEstiloMapbox(darkInicial),
          center: [inicial.lng, inicial.lat],
          zoom: mode === 'patio' ? 15.5 : selectedCoords ? 15 : 12.2,
          attributionControl: false,
          cooperativeGestures: false,
          dragRotate: false,
          pitchWithRotate: false,
        });

        mapInstance.addControl(
          new mapboxgl.AttributionControl({ compact: true }),
          'bottom-right'
        );

        const pinColor = darkInicial ? '#EDEDED' : '#111827';
        markerInstance = new mapboxgl.Marker({
          color: pinColor,
          draggable: mode === 'domicilio',
        })
          .setLngLat([inicial.lng, inicial.lat])
          .addTo(mapInstance);

        if (mode === 'domicilio') {
          markerInstance.on('dragstart', () => {
            isDraggingRef.current = true;
          });

          markerInstance.on('dragend', () => {
            isDraggingRef.current = false;
            if (!markerInstance) return;
            const pos = markerInstance.getLngLat();
            onPinChangeRef.current?.({
              lat: Number(pos.lat.toFixed(6)),
              lng: Number(pos.lng.toFixed(6)),
            });
          });

          mapInstance.on('click', (evt) => {
            const nuevaPos: CoordenadasGeo = {
              lat: Number(evt.lngLat.lat.toFixed(6)),
              lng: Number(evt.lngLat.lng.toFixed(6)),
            };
            markerInstance?.setLngLat([nuevaPos.lng, nuevaPos.lat]);
            onPinChangeRef.current?.(nuevaPos);
          });
        }

        mapInstance.on('style.load', () => {
          if (mapInstance) {
            pintarCapasGeograficas(mapInstance, detectarTemaOscuro());
          }
        });

        mapInstance.on('load', () => {
          if (!cancelado) {
            mapInstance?.resize();
            setMapState('ready');
          }
        });

        mapInstance.on('error', (evt) => {
          if (cancelado) return;
          if (esErrorFatalDeToken(evt.error)) {
            setMapState((prev) => (prev === 'ready' ? prev : 'fallback'));
          }
        });

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserver = new ResizeObserver(() => {
            mapInstance?.resize();
          });
          resizeObserver.observe(containerRef.current);
        }

        mapRef.current = mapInstance;
        markerRef.current = markerInstance;
      } catch {
        if (!cancelado) {
          setMapState('fallback');
        }
      }
    };

    void inicializarMapa();

    return () => {
      cancelado = true;
      resizeObserver?.disconnect();
      markerInstance?.remove();
      mapInstance?.remove();
      markerRef.current = null;
      mapRef.current = null;
      appliedDarkRef.current = null;
    };
    // Re-inicializa únicamente al cambiar el token, el modo o el patio base
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, mode, patioCoords.lat, patioCoords.lng, coverageRadiusKm]);

  // Sincronizar cambio de tema claro/oscuro en el estilo de Mapbox solo si cambió respecto al aplicado
  useEffect(() => {
    const map = mapRef.current;
    if (!map || mapState !== 'ready') return;
    if (appliedDarkRef.current === isDark) return;
    appliedDarkRef.current = isDark;
    map.setStyle(obtenerEstiloMapbox(isDark));
  }, [isDark, mapState]);

  // Sincronizar posición del pin cuando el usuario elige sugerencia o GPS actual
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || mode !== 'domicilio' || !selectedCoords) return;
    if (isDraggingRef.current) return;

    const actual = marker.getLngLat();
    const diff =
      Math.abs(actual.lat - selectedCoords.lat) +
      Math.abs(actual.lng - selectedCoords.lng);

    if (diff > 0.00001) {
      marker.setLngLat([selectedCoords.lng, selectedCoords.lat]);
      map.flyTo({
        center: [selectedCoords.lng, selectedCoords.lat],
        zoom: Math.max(map.getZoom(), 15),
        duration: 280,
      });
    }
  }, [mode, selectedCoords]);

  const recentrarMapa = () => {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({
      center: [coordsActivas.lng, coordsActivas.lat],
      zoom: mode === 'patio' ? 15.5 : 15,
      duration: 240,
    });
  };

  const acercarMapa = () => {
    mapRef.current?.zoomIn({ duration: 180 });
  };

  const alejarMapa = () => {
    mapRef.current?.zoomOut({ duration: 180 });
  };

  const etiquetaEstadoSuperior =
    mode === 'patio'
      ? `Sede · ${patioNombre}`
      : selectedCoords
        ? withinCoverage
          ? distanceKm != null
            ? `En cobertura · ${formatearDistanciaKm(distanceKm)}`
            : 'Dentro de cobertura'
          : distanceKm != null
            ? `Fuera de cobertura · ${formatearDistanciaKm(distanceKm)}`
            : 'Fuera de cobertura'
        : `Cobertura · ${formatearDistanciaKm(coverageRadiusKm)}`;

  return (
    <div
      role="region"
      aria-labelledby={mapTitleId}
      className={`relative w-full overflow-hidden rounded-[20px] border border-[#9CA3AF]/55 bg-[#EDEDED] dark:border-white/15 dark:bg-[#111827] ${heightClass}`}
    >
      <span id={mapTitleId} className="sr-only">
        {mode === 'patio'
          ? `Mapa interactivo de ${patioNombre}`
          : 'Mapa interactivo para ubicar la dirección de entrega a domicilio'}
      </span>

      {/* Contenedor WebGL de Mapbox GL JS */}
      {accessToken && mapState !== 'fallback' && (
        <div
          ref={containerRef}
          className="h-full w-full"
          aria-label={
            mode === 'patio'
              ? 'Mapa interactivo con ubicación fija del patio principal'
              : 'Mapa interactivo con pin ajustable para entrega a domicilio'
          }
        />
      )}

      {/* Skeleton de carga sin layout shift */}
      {mapState === 'loading' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#EDEDED] dark:bg-[#111827]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-[#111827] dark:border-white/25 dark:border-t-[#EDEDED]" />
          <span className="text-xs font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
            Cargando mapa interactivo...
          </span>
        </div>
      )}

      {/* Vista de respaldo únicamente si el navegador no soporta WebGL o el token es inválido */}
      {mapState === 'fallback' && (
        <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#EDEDED] px-4 text-center dark:bg-[#111827]">
          <div className="relative z-10 flex flex-col items-center gap-1.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-5 w-5"
              >
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <p className="text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
              {mode === 'patio' ? patioNombre : 'Ubicación de entrega'}
            </p>
            <p className="max-w-xs text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
              {mode === 'patio'
                ? patioDireccion || 'Sede principal FlotaX'
                : selectedCoords
                  ? `Pin confirmado en ${formatearCoordenadasHumanas(selectedCoords.lat, selectedCoords.lng)}`
                  : 'Usa tu ubicación actual o busca tu dirección.'}
            </p>
          </div>
        </div>
      )}

      {/* Píldora flotante superior (Liquid Glass) con estado del pin o cobertura */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-20 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold backdrop-blur-md ${
            mode === 'domicilio' && selectedCoords && !withinCoverage
              ? 'border-[#111827] bg-[#111827]/95 text-white dark:border-white/30 dark:bg-[#EDEDED]/95 dark:text-[#111827]'
              : 'border-[#9CA3AF]/45 bg-white/92 text-[#111827] dark:border-white/15 dark:bg-[#1F2937]/90 dark:text-[#EDEDED]'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              mode === 'domicilio' && selectedCoords && !withinCoverage
                ? 'bg-[#EDEDED] dark:bg-[#111827]'
                : 'bg-[#111827] dark:bg-[#EDEDED]'
            }`}
          />
          {etiquetaEstadoSuperior}
        </span>

        {mapState === 'ready' && (
          <div className="pointer-events-auto flex flex-col gap-1.5">
            <button
              type="button"
              onClick={recentrarMapa}
              aria-label="Centrar mapa en el pin"
              title="Centrar mapa"
              className="fx-press flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#9CA3AF]/50 bg-white/92 text-[#111827] backdrop-blur-md cursor-pointer hover:bg-[#EDEDED] dark:border-white/15 dark:bg-[#1F2937]/92 dark:text-[#EDEDED] dark:hover:bg-[#111827]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </button>

            <div className="flex flex-col overflow-hidden rounded-full border border-[#9CA3AF]/50 bg-white/92 backdrop-blur-md dark:border-white/15 dark:bg-[#1F2937]/92">
              <button
                type="button"
                onClick={acercarMapa}
                aria-label="Acercar mapa"
                className="fx-press flex min-h-[44px] min-w-[44px] items-center justify-center text-base font-bold text-[#111827] cursor-pointer hover:bg-[#EDEDED] dark:text-[#EDEDED] dark:hover:bg-[#111827]"
              >
                +
              </button>
              <span className="h-px w-full bg-[#9CA3AF]/35 dark:bg-white/12" />
              <button
                type="button"
                onClick={alejarMapa}
                aria-label="Alejar mapa"
                className="fx-press flex min-h-[44px] min-w-[44px] items-center justify-center text-base font-bold text-[#111827] cursor-pointer hover:bg-[#EDEDED] dark:text-[#EDEDED] dark:hover:bg-[#111827]"
              >
                −
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Indicación inferior discreta cuando el mapa está listo */}
      {mapState === 'ready' && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20">
          <span className="inline-flex items-center rounded-full border border-[#9CA3AF]/45 bg-white/92 px-2.5 py-1 text-[10px] font-semibold text-[#4B5563] backdrop-blur-md dark:border-white/15 dark:bg-[#1F2937]/92 dark:text-[#D1D5DB]">
            {mode === 'domicilio'
              ? 'Arrastra el pin o toca el mapa para ajustar'
              : 'Explora el mapa o usa + / − para acercar'}
          </span>
        </div>
      )}
    </div>
  );
}
