import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { actions } from 'astro:actions';
import {
  evaluarCoberturaDomicilio,
  formatearCoordenadasHumanas,
  formatearDistanciaKm,
  type CoordenadasGeo,
  type PoliticaDomicilioLocal,
  type SugerenciaDireccionMapbox,
  type UbicacionPatio,
} from '@/lib/ubicacion';
import MapboxCanvas from './MapboxCanvas';

export type ModalidadEntregaSeleccion =
  | 'PATIO_PRINCIPAL'
  | 'DOMICILIO_MEDELLIN'
  | null;

export interface EstadoEntregaWizard {
  modalidadEntrega: ModalidadEntregaSeleccion;
  direccionEntrega: string;
  entregaReferencia: string;
  latitud: number | null;
  longitud: number | null;
  distanciaKm: number | null;
  recargoDomicilio: number;
  dentroCobertura: boolean;
  mensajeCobertura: string | null;
}

export interface DeliveryLocationSelectorProps {
  localId?: string | undefined;
  patio: UbicacionPatio;
  politicaDomicilio: PoliticaDomicilioLocal;
  mapboxPublicToken: string | null;
  valor: EstadoEntregaWizard;
  onChange: (next: EstadoEntregaWizard) => void;
}

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function DeliveryLocationSelector({
  localId,
  patio,
  politicaDomicilio,
  mapboxPublicToken,
  valor,
  onChange,
}: DeliveryLocationSelectorProps) {
  const listboxId = useId();
  const [consultaDireccion, setConsultaDireccion] = useState<string>(
    valor.direccionEntrega
  );
  const [sugerencias, setSugerencias] = useState<SugerenciaDireccionMapbox[]>([]);
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const [indiceActivo, setIndiceActivo] = useState<number>(-1);
  const [buscandoDirecciones, setBuscandoDirecciones] = useState<boolean>(false);
  const [buscandoGps, setBuscandoGps] = useState<boolean>(false);
  const [resolviendoPin, setResolviendoPin] = useState<boolean>(false);
  const [avisoUbicacion, setAvisoUbicacion] = useState<string | null>(null);
  const [avisoAutocomplete, setAvisoAutocomplete] = useState<string | null>(null);
  const [mostrarReferencia, setMostrarReferencia] = useState<boolean>(() =>
    Boolean(valor.entregaReferencia.trim())
  );

  const secuenciaBusquedaRef = useRef<number>(0);
  const saltarSiguienteBusquedaRef = useRef<boolean>(false);

  const patioCoords: CoordenadasGeo = useMemo(
    () => ({ lat: patio.lat, lng: patio.lng }),
    [patio.lat, patio.lng]
  );

  const esDomicilio = valor.modalidadEntrega === 'DOMICILIO_MEDELLIN';
  const esPatio = valor.modalidadEntrega === 'PATIO_PRINCIPAL';

  // Sincronizar texto cuando cambia externamente (ej. al volver entre slides)
  useEffect(() => {
    if (valor.direccionEntrega !== consultaDireccion && !menuAbierto) {
      setConsultaDireccion(valor.direccionEntrega);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor.direccionEntrega]);

  // Autocompletado Mapbox EXCLUSIVAMENTE en modalidad DOMICILIO_MEDELLIN
  useEffect(() => {
    if (!esDomicilio) {
      setSugerencias([]);
      setMenuAbierto(false);
      setBuscandoDirecciones(false);
      setAvisoAutocomplete(null);
      return;
    }

    if (saltarSiguienteBusquedaRef.current) {
      saltarSiguienteBusquedaRef.current = false;
      return;
    }

    const textoLimpio = consultaDireccion.trim();
    if (textoLimpio.length < 3 || !mapboxPublicToken) {
      setSugerencias([]);
      setMenuAbierto(false);
      setBuscandoDirecciones(false);
      return;
    }

    const seq = ++secuenciaBusquedaRef.current;
    const timer = window.setTimeout(async () => {
      setBuscandoDirecciones(true);
      setAvisoAutocomplete(null);
      try {
        const { data, error } = await actions.ubicacion.buscarDirecciones({
          consulta: textoLimpio,
          localId,
          modalidadEntrega: 'DOMICILIO_MEDELLIN',
        });

        if (seq !== secuenciaBusquedaRef.current) return;

        if (error || !data) {
          setSugerencias([]);
          setAvisoAutocomplete(
            'No pudimos consultar sugerencias ahora. Ajusta el pin directamente en el mapa.'
          );
          return;
        }

        setSugerencias(data.sugerencias);
        setMenuAbierto(data.sugerencias.length > 0);
        setIndiceActivo(-1);
        setAvisoAutocomplete(data.aviso ?? null);
      } catch {
        if (seq !== secuenciaBusquedaRef.current) return;
        setSugerencias([]);
        setAvisoAutocomplete(
          'Sin conexión con el buscador. Puedes ajustar el pin manualmente en el mapa.'
        );
      } finally {
        if (seq === secuenciaBusquedaRef.current) {
          setBuscandoDirecciones(false);
        }
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [consultaDireccion, esDomicilio, localId, mapboxPublicToken]);

  const seleccionarPatio = () => {
    setAvisoUbicacion(null);
    setAvisoAutocomplete(null);
    setSugerencias([]);
    setMenuAbierto(false);
    setMostrarReferencia(false);
    onChange({
      modalidadEntrega: 'PATIO_PRINCIPAL',
      direccionEntrega: '',
      entregaReferencia: '',
      latitud: null,
      longitud: null,
      distanciaKm: null,
      recargoDomicilio: 0,
      dentroCobertura: true,
      mensajeCobertura: null,
    });
  };

  const seleccionarDomicilio = () => {
    if (!politicaDomicilio.domicilioHabilitado) return;
    setAvisoUbicacion(null);
    onChange({
      ...valor,
      modalidadEntrega: 'DOMICILIO_MEDELLIN',
    });
  };

  const aplicarSugerencia = (sug: SugerenciaDireccionMapbox) => {
    saltarSiguienteBusquedaRef.current = true;
    setConsultaDireccion(sug.direccionCompleta);
    setMenuAbierto(false);
    setSugerencias([]);
    setAvisoUbicacion(null);

    onChange({
      ...valor,
      modalidadEntrega: 'DOMICILIO_MEDELLIN',
      direccionEntrega: sug.direccionCompleta,
      latitud: sug.latitud,
      longitud: sug.longitud,
      distanciaKm: sug.distanciaKm,
      recargoDomicilio: sug.recargoDomicilio,
      dentroCobertura: sug.dentroCobertura,
      mensajeCobertura: sug.mensajeCobertura,
    });
  };

  const actualizarDesdeCoordenadas = async (
    coords: CoordenadasGeo,
    direccionManual?: string
  ) => {
    const evalLocal = evaluarCoberturaDomicilio(
      coords,
      patioCoords,
      politicaDomicilio
    );

    const direccionProvisional =
      direccionManual ??
      (consultaDireccion.trim() ||
        `Ubicación marcada (${formatearCoordenadasHumanas(coords.lat, coords.lng)})`);

    onChange({
      ...valor,
      modalidadEntrega: 'DOMICILIO_MEDELLIN',
      direccionEntrega: direccionProvisional,
      latitud: coords.lat,
      longitud: coords.lng,
      distanciaKm: evalLocal.distanciaKm,
      recargoDomicilio: evalLocal.recargoDomicilio,
      dentroCobertura: evalLocal.dentroCobertura,
      mensajeCobertura: evalLocal.mensaje,
    });

    if (direccionManual) {
      saltarSiguienteBusquedaRef.current = true;
      setConsultaDireccion(direccionManual);
      return;
    }

    setResolviendoPin(true);
    try {
      const { data } = await actions.ubicacion.geocodificarInversa({
        latitud: coords.lat,
        longitud: coords.lng,
        localId,
        modalidadEntrega: 'DOMICILIO_MEDELLIN',
      });

      if (data?.ok) {
        const direccionFinal =
          data.origenDireccion === 'mapbox'
            ? data.direccion
            : consultaDireccion.trim() || data.direccion;

        saltarSiguienteBusquedaRef.current = true;
        setConsultaDireccion(direccionFinal);
        if (data.aviso) {
          setAvisoAutocomplete(data.aviso);
        }

        onChange({
          ...valor,
          modalidadEntrega: 'DOMICILIO_MEDELLIN',
          direccionEntrega: direccionFinal,
          latitud: coords.lat,
          longitud: coords.lng,
          distanciaKm: data.cobertura.distanciaKm,
          recargoDomicilio: data.cobertura.recargoDomicilio,
          dentroCobertura: data.cobertura.dentroCobertura,
          mensajeCobertura: data.cobertura.mensaje,
        });
      }
    } catch {
      // Conserva evaluación local si falla la red
    } finally {
      setResolviendoPin(false);
    }
  };

  const usarMiUbicacionActual = () => {
    setAvisoUbicacion(null);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setAvisoUbicacion(
        'Tu navegador no permite detectar la ubicación. Busca tu dirección o mueve el pin en el mapa.'
      );
      return;
    }

    setBuscandoGps(true);
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        setBuscandoGps(false);
        const coords: CoordenadasGeo = {
          lat: Number(posicion.coords.latitude.toFixed(6)),
          lng: Number(posicion.coords.longitude.toFixed(6)),
        };
        void actualizarDesdeCoordenadas(coords);
      },
      (geoError) => {
        setBuscandoGps(false);
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setAvisoUbicacion(
            'Permiso de ubicación denegado. Actívalo en tu navegador o ubica el pin manualmente en el mapa.'
          );
          return;
        }
        if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setAvisoUbicacion(
            'No detectamos señal de ubicación. Escribe tu dirección o mueve el pin en el mapa.'
          );
          return;
        }
        if (geoError.code === geoError.TIMEOUT) {
          setAvisoUbicacion(
            'La ubicación tardó demasiado en responder. Intenta de nuevo o toca el mapa.'
          );
          return;
        }
        setAvisoUbicacion(
          'No fue posible obtener tu ubicación actual. Escribe tu dirección o ajusta el pin en el mapa.'
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 60_000,
      }
    );
  };

  const coordsSeleccionadas: CoordenadasGeo | null =
    valor.latitud != null && valor.longitud != null
      ? { lat: valor.latitud, lng: valor.longitud }
      : null;

  const subtituloDomicilio = !politicaDomicilio.domicilioHabilitado
    ? 'No disponible en esta sede'
    : politicaDomicilio.tarifaDomicilioBase > 0
      ? `Desde ${formatCop(politicaDomicilio.tarifaDomicilioBase)} · Radio ${formatearDistanciaKm(politicaDomicilio.radioCoberturaKm)}`
      : `Cobertura hasta ${formatearDistanciaKm(politicaDomicilio.radioCoberturaKm)}`;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED]">
          Punto de entrega
        </h2>
        <p className="mt-0.5 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
          Elige dónde recibir el vehículo para abrir el mapa.
        </p>
      </div>

      {/* Nivel 1 (Progressive Disclosure): Solo 2 opciones claras */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          aria-pressed={esPatio}
          onClick={seleccionarPatio}
          className={`fx-press min-h-[64px] rounded-[16px] p-3.5 text-left border transition-colors cursor-pointer ${
            esPatio
              ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
              : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/55 hover:bg-[#9CA3AF]/20 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/10'
          }`}
        >
          <p className="text-sm font-bold">Retiro en Patio Principal</p>
          <p
            className={`text-[11px] mt-0.5 ${
              esPatio
                ? 'text-[#EDEDED] dark:text-[#4B5563]'
                : 'text-[#4B5563] dark:text-[#D1D5DB]'
            }`}
          >
            Sin recargo · {patio.nombre}
          </p>
        </button>

        <button
          type="button"
          aria-pressed={esDomicilio}
          disabled={!politicaDomicilio.domicilioHabilitado}
          onClick={seleccionarDomicilio}
          className={`fx-press min-h-[64px] rounded-[16px] p-3.5 text-left border transition-colors ${
            !politicaDomicilio.domicilioHabilitado
              ? 'bg-[#EDEDED] text-[#4B5563] border-[#9CA3AF]/40 opacity-40 cursor-not-allowed dark:bg-[#111827] dark:text-[#9CA3AF] dark:border-white/10'
              : esDomicilio
                ? 'bg-[#111827] text-white border-[#111827] cursor-pointer dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/55 cursor-pointer hover:bg-[#9CA3AF]/20 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/10'
          }`}
        >
          <p className="text-sm font-bold">Entrega en tu ubicación</p>
          <p
            className={`text-[11px] mt-0.5 ${
              esDomicilio
                ? 'text-[#EDEDED] dark:text-[#4B5563]'
                : 'text-[#4B5563] dark:text-[#D1D5DB]'
            }`}
          >
            {subtituloDomicilio}
          </p>
        </button>
      </div>

      {/* Nivel 2A: Retiro en Patio -> Mapa Mapbox interactivo sin redirección a Google Maps */}
      {esPatio && (
        <div className="space-y-3 animate-fade-in">
          <MapboxCanvas
            accessToken={mapboxPublicToken}
            mode="patio"
            patioCoords={patioCoords}
            patioNombre={patio.nombre}
            patioDireccion={patio.direccion}
            heightClass="h-[290px] sm:h-[340px]"
          />

          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF]/40 px-3.5 py-2.5 dark:bg-[#111827] dark:border-white/12">
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                {patio.nombre}
              </p>
              <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB] truncate">
                {patio.direccion || 'Sede Principal FlotaX'}
                {patio.ciudad ? ` · ${patio.ciudad}` : ''}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white border border-[#9CA3AF]/45 px-2.5 py-1 text-[10px] font-bold text-[#111827] dark:bg-[#1F2937] dark:border-white/15 dark:text-[#EDEDED]">
              Sin recargo
            </span>
          </div>
        </div>
      )}

      {/* Nivel 2B: Entrega en tu ubicación -> Buscador + GPS + Mapa Mapbox interactivo */}
      {esDomicilio && (
        <div className="space-y-3 animate-fade-in">
          {/* Buscador con autocompletado Mapbox (exclusivo de domicilio) */}
          <div className="relative space-y-2">
            <div className="relative flex items-center">
              <input
                id="domicilio-direccion"
                type="text"
                role="combobox"
                aria-label="Dirección de entrega"
                aria-expanded={menuAbierto}
                aria-controls={listboxId}
                aria-autocomplete="list"
                autoComplete="street-address"
                value={consultaDireccion}
                onChange={(e) => {
                  const siguiente = e.target.value;
                  setConsultaDireccion(siguiente);
                  onChange({
                    ...valor,
                    modalidadEntrega: 'DOMICILIO_MEDELLIN',
                    direccionEntrega: siguiente,
                  });
                }}
                onFocus={() => {
                  if (sugerencias.length > 0) setMenuAbierto(true);
                }}
                onKeyDown={(e) => {
                  if (!menuAbierto || sugerencias.length === 0) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setIndiceActivo((prev) =>
                      prev < sugerencias.length - 1 ? prev + 1 : 0
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setIndiceActivo((prev) =>
                      prev > 0 ? prev - 1 : sugerencias.length - 1
                    );
                  } else if (e.key === 'Enter' && indiceActivo >= 0) {
                    e.preventDefault();
                    const elegida = sugerencias[indiceActivo];
                    if (elegida) aplicarSugerencia(elegida);
                  } else if (e.key === 'Escape') {
                    setMenuAbierto(false);
                  }
                }}
                placeholder="Buscar dirección (ej. Cra. 43A #10-45, El Poblado)"
                className="w-full min-h-[48px] rounded-[12px] border border-[#9CA3AF] bg-[#EDEDED] pl-3.5 pr-12 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:border-white/20 dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
              />

              {(buscandoDirecciones || resolviendoPin) && (
                <span
                  aria-label="Buscando direcciones"
                  className="pointer-events-none absolute right-3.5 h-4 w-4 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-[#111827] dark:border-white/25 dark:border-t-[#EDEDED]"
                />
              )}

              {!buscandoDirecciones && !resolviendoPin && consultaDireccion.length > 0 && (
                <button
                  type="button"
                  aria-label="Limpiar dirección"
                  onClick={() => {
                    setConsultaDireccion('');
                    setSugerencias([]);
                    setMenuAbierto(false);
                    onChange({
                      ...valor,
                      modalidadEntrega: 'DOMICILIO_MEDELLIN',
                      direccionEntrega: '',
                      latitud: null,
                      longitud: null,
                      distanciaKm: null,
                      recargoDomicilio: 0,
                      dentroCobertura: false,
                      mensajeCobertura: null,
                    });
                  }}
                  className="fx-press absolute right-1 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-xs font-bold text-[#4B5563] hover:text-[#111827] cursor-pointer dark:text-[#D1D5DB] dark:hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sugerencias Mapbox */}
            {menuAbierto && sugerencias.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                className="max-h-56 overflow-y-auto rounded-[16px] border border-[#9CA3AF]/60 bg-white p-1.5 shadow-lg dark:border-white/15 dark:bg-[#1F2937]"
              >
                {sugerencias.map((sug, idx) => (
                  <li key={sug.id} role="option" aria-selected={idx === indiceActivo}>
                    <button
                      type="button"
                      onClick={() => aplicarSugerencia(sug)}
                      className={`fx-press flex w-full min-h-[44px] items-start justify-between gap-2.5 rounded-[12px] px-3 py-2 text-left transition-colors cursor-pointer ${
                        idx === indiceActivo
                          ? 'bg-[#EDEDED] dark:bg-[#111827]'
                          : 'hover:bg-[#EDEDED]/75 dark:hover:bg-[#111827]/70'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                          {sug.titulo}
                        </p>
                        <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB] truncate">
                          {sug.contexto}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                          sug.dentroCobertura
                            ? 'bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/50 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15'
                            : 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]'
                        }`}
                      >
                        {sug.dentroCobertura
                          ? formatearDistanciaKm(sug.distanciaKm)
                          : 'Fuera de zona'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={usarMiUbicacionActual}
              disabled={buscandoGps}
              aria-busy={buscandoGps}
              className="fx-press flex w-full min-h-[44px] items-center justify-center gap-2 rounded-[12px] border border-[#9CA3AF]/60 bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed dark:border-white/15 dark:bg-[#111827] dark:text-[#EDEDED] dark:hover:bg-white/10"
            >
              {buscandoGps ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9CA3AF] border-t-[#111827] dark:border-white/25 dark:border-t-[#EDEDED]" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
              )}
              <span>
                {buscandoGps ? 'Obteniendo tu ubicación...' : 'Usar mi ubicación actual'}
              </span>
            </button>

            {avisoAutocomplete && (
              <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
                {avisoAutocomplete}
              </p>
            )}

            {avisoUbicacion && (
              <div
                role="alert"
                className="rounded-[12px] border border-[#111827]/30 bg-[#EDEDED] px-3 py-2 text-xs text-[#111827] dark:border-white/20 dark:bg-[#111827] dark:text-[#EDEDED]"
              >
                {avisoUbicacion}
              </div>
            )}
          </div>

          {/* Mapa Mapbox interactivo con pin arrastrable y círculo de cobertura */}
          <MapboxCanvas
            accessToken={mapboxPublicToken}
            mode="domicilio"
            patioCoords={patioCoords}
            patioNombre={patio.nombre}
            patioDireccion={patio.direccion}
            selectedCoords={coordsSeleccionadas}
            coverageRadiusKm={politicaDomicilio.radioCoberturaKm}
            withinCoverage={valor.dentroCobertura}
            distanceKm={valor.distanciaKm}
            heightClass="h-[270px] sm:h-[320px]"
            onPinChange={(coords) => {
              void actualizarDesdeCoordenadas(coords);
            }}
          />

          {/* Nivel 3 (Progressive Disclosure): Dictamen solo tras elegir ubicación */}
          {coordsSeleccionadas && !valor.dentroCobertura && (
            <div
              role="alert"
              className="rounded-[16px] bg-[#111827] p-3.5 text-white space-y-2.5 dark:bg-[#111827] dark:border dark:border-white/20"
            >
              <p className="text-xs font-bold">
                Fuera de zona de cobertura ({formatearDistanciaKm(politicaDomicilio.radioCoberturaKm)} máx.)
              </p>
              <p className="text-[11px] text-[#EDEDED]/90">
                {valor.mensajeCobertura ||
                  'Mueve el pin dentro del perímetro o elige retiro en patio.'}
              </p>
              <button
                type="button"
                onClick={seleccionarPatio}
                className="fx-press min-h-[44px] w-full rounded-[12px] bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-white cursor-pointer"
              >
                Cambiar a Retiro en Patio Principal
              </button>
            </div>
          )}

          {coordsSeleccionadas && valor.dentroCobertura && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 rounded-[14px] bg-[#EDEDED] border border-[#9CA3AF]/45 px-3.5 py-2.5 text-xs dark:bg-[#111827] dark:border-white/15">
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED] truncate">
                  {valor.distanciaKm != null
                    ? `En cobertura · ${formatearDistanciaKm(valor.distanciaKm)}`
                    : 'Cobertura confirmada'}
                </span>
                <span className="font-mono text-[11px] font-bold text-[#111827] tabular-nums shrink-0 dark:text-[#EDEDED]">
                  {valor.recargoDomicilio > 0
                    ? `+ ${formatCop(valor.recargoDomicilio)}`
                    : 'Sin recargo'}
                </span>
              </div>

              {/* Progressive Disclosure para notas opcionales de entrega */}
              {!mostrarReferencia ? (
                <button
                  type="button"
                  onClick={() => setMostrarReferencia(true)}
                  className="fx-press min-h-[44px] w-full rounded-[12px] border border-dashed border-[#9CA3AF]/70 px-3.5 py-2 text-left text-xs font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer dark:border-white/20 dark:text-[#D1D5DB] dark:hover:text-white"
                >
                  + Agregar apartamento, torre o indicaciones (opcional)
                </button>
              ) : (
                <div className="animate-fade-in">
                  <label
                    htmlFor="domicilio-referencia"
                    className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1.5"
                  >
                    Indicaciones para la entrega (opcional)
                  </label>
                  <input
                    id="domicilio-referencia"
                    type="text"
                    maxLength={200}
                    value={valor.entregaReferencia}
                    onChange={(e) =>
                      onChange({
                        ...valor,
                        modalidadEntrega: 'DOMICILIO_MEDELLIN',
                        entregaReferencia: e.target.value,
                      })
                    }
                    placeholder="Ej. Torre 2, Apto 504 · Portería sur"
                    className="w-full min-h-[48px] rounded-[12px] border border-[#9CA3AF] bg-[#EDEDED] px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#4B5563] focus-visible:ring-2 focus-visible:ring-[#111827] dark:border-white/20 dark:bg-[#111827] dark:text-[#EDEDED] dark:placeholder:text-[#9CA3AF]"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
