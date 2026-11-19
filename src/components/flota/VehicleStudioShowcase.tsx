import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';
import type { CategoriaGaleriaVehiculo, VehiculoItem } from '@/lib/flota/types';
import type { LocalPublicoContexto } from '@/lib/flota/locales-captacion';

const ETIQUETA_CATEGORIA_GALERIA: Record<CategoriaGaleriaVehiculo, string> = {
  EXTERIOR: 'Exterior',
  INTERIOR: 'Interior',
  ESTADO: 'Estado',
};

export interface VehicleStudioShowcaseProps {
  vehiculoInicial: VehiculoItem;
  flotaLocal: VehiculoItem[];
  local: LocalPublicoContexto;
  hoyISO?: string;
}

type StudioAngleId = 'estudio' | 'perfil' | 'cabina' | 'desempeno';

interface StudioAngleOption {
  id: StudioAngleId;
  label: string;
  badge: string;
  imageClass: string;
}

const STUDIO_ANGLES: StudioAngleOption[] = [
  {
    id: 'estudio',
    label: '3/4 Estudio',
    badge: 'Vista Principal',
    imageClass: 'scale-100 rotate-0',
  },
  {
    id: 'perfil',
    label: 'Dinámica',
    badge: 'Perfil Lateral',
    imageClass: 'scale-105 -rotate-1',
  },
  {
    id: 'cabina',
    label: 'Detalle Zoom',
    badge: 'Acabado & Confort',
    imageClass: 'scale-115 translate-y-1',
  },
  {
    id: 'desempeno',
    label: 'Perspectiva',
    badge: 'Tren Motriz',
    imageClass: 'scale-95 -scale-x-100',
  },
];

function formatCop(val: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);
}

export default function VehicleStudioShowcase({
  vehiculoInicial,
  flotaLocal,
  local,
}: VehicleStudioShowcaseProps) {
  const listaUnidades = useMemo(() => {
    if (flotaLocal.length === 0) return [vehiculoInicial];
    const existe = flotaLocal.some((v) => v.id === vehiculoInicial.id);
    return existe ? flotaLocal : [vehiculoInicial, ...flotaLocal];
  }, [flotaLocal, vehiculoInicial]);

  const indiceInicial = Math.max(
    0,
    listaUnidades.findIndex((v) => v.id === vehiculoInicial.id)
  );

  const [unidadIndex, setUnidadIndex] = useState<number>(indiceInicial);
  const [angleIndex, setAngleIndex] = useState<number>(2); // Tercer thumbnail activo en oscuro como en Pantalla 3
  const [galeriaIndex, setGaleriaIndex] = useState<number>(0);
  const [lightboxAbierto, setLightboxAbierto] = useState<boolean>(false);

  const vehiculo = listaUnidades[unidadIndex] ?? vehiculoInicial;
  const currentAngle = STUDIO_ANGLES[angleIndex] ?? STUDIO_ANGLES[0]!;
  const galeriaPublica = useMemo(() => {
    if (!vehiculo.galeria || vehiculo.galeria.length === 0) return [];
    return [...vehiculo.galeria].sort((a, b) => {
      if (a.esPrincipal && !b.esPrincipal) return -1;
      if (!a.esPrincipal && b.esPrincipal) return 1;
      return a.orden - b.orden;
    });
  }, [vehiculo.galeria]);
  const tieneGaleria = galeriaPublica.length > 0;
  const fotoActualGaleria = galeriaPublica[galeriaIndex] ?? galeriaPublica[0];

  useEffect(() => {
    setGaleriaIndex(0);
    setLightboxAbierto(false);
  }, [vehiculo.id]);

  useEffect(() => {
    if (!lightboxAbierto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxAbierto(false);
      } else if (e.key === 'ArrowRight' && galeriaPublica.length > 1) {
        setGaleriaIndex((prev) => (prev + 1) % galeriaPublica.length);
      } else if (e.key === 'ArrowLeft' && galeriaPublica.length > 1) {
        setGaleriaIndex((prev) => (prev - 1 + galeriaPublica.length) % galeriaPublica.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [galeriaPublica.length, lightboxAbierto]);

  const triggerHaptic = (ms = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar si no está soportado
      }
    }
  };

  const cambiarUnidad = (delta: number) => {
    triggerHaptic(10);
    setUnidadIndex((prev) => {
      const total = listaUnidades.length;
      return (prev + delta + total) % total;
    });
  };

  const rotarAngulo = () => {
    triggerHaptic(6);
    setAngleIndex((prev) => (prev + 1) % STUDIO_ANGLES.length);
  };

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl space-y-4 pb-10">
      {/* =====================================================================
          1. ESCENARIO STUDIO 360° CON PEDESTAL ELÍPTICO Y MINIATURAS (PANTALLAS 3 Y 4)
         ===================================================================== */}
      <section className="rounded-[32px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/30 dark:border-white/12 shadow-[0_16px_38px_-10px_rgba(17,24,39,0.08)] relative overflow-hidden">
        {/* Escenario Principal: Fotografía 16:9 de borde a borde, sin marco ni relleno */}
        <div className="relative w-full aspect-video rounded-t-[31px] overflow-hidden">
          {tieneGaleria && fotoActualGaleria ? (
            <>
              <button
                type="button"
                onClick={() => setLightboxAbierto(true)}
                aria-label="Ampliar fotografía del vehículo"
                className="block h-full w-full cursor-pointer"
              >
                <img
                  src={fotoActualGaleria.url}
                  alt={`${vehiculo.marca} ${vehiculo.modelo} - ${ETIQUETA_CATEGORIA_GALERIA[fotoActualGaleria.categoria]}`}
                  className="h-full w-full object-cover object-center block select-none"
                />
              </button>

              <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#111827]/75 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <span>
                  {fotoActualGaleria.esPrincipal
                    ? 'Principal'
                    : ETIQUETA_CATEGORIA_GALERIA[fotoActualGaleria.categoria]}
                </span>
                <span>•</span>
                <span className="font-mono tabular-nums">
                  {galeriaIndex + 1}/{galeriaPublica.length}
                </span>
              </span>

              {galeriaPublica.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Fotografía anterior"
                    onClick={() => {
                      triggerHaptic(6);
                      setGaleriaIndex((prev) => (prev - 1 + galeriaPublica.length) % galeriaPublica.length);
                    }}
                    className="fx-press absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/75 text-white border border-white/20 backdrop-blur-md hover:bg-[#111827] cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente fotografía"
                    onClick={() => {
                      triggerHaptic(6);
                      setGaleriaIndex((prev) => (prev + 1) % galeriaPublica.length);
                    }}
                    className="fx-press absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/75 text-white border border-white/20 backdrop-blur-md hover:bg-[#111827] cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => setLightboxAbierto(true)}
                aria-label="Ver fotografía ampliada"
                className="fx-press absolute right-3.5 bottom-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/25 backdrop-blur-md shadow-md hover:bg-[#111827] cursor-pointer"
              >
                <ZoomIn className="h-4 w-4" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <img
                src={vehiculo.imagenUrl}
                alt={`${vehiculo.marca} ${vehiculo.modelo} - ${currentAngle.label}`}
                className={`h-full w-full object-cover object-center block transition-transform duration-300 ease-out select-none ${currentAngle.imageClass}`}
              />

              {/* Etiqueta de Vista Activa */}
              <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#111827]/75 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <span>{currentAngle.badge}</span>
                <span>•</span>
                <span className="font-mono tabular-nums">
                  ★ {vehiculo.rating}
                </span>
              </span>

              {/* Indicadores Verticales de Paginación a la Derecha */}
              <div
                aria-label="Indicador de perspectiva"
                className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
              >
                {STUDIO_ANGLES.map((ang, idx) => {
                  const active = idx === angleIndex;
                  return (
                    <button
                      key={ang.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(6);
                        setAngleIndex(idx);
                      }}
                      aria-label={`Ver perspectiva ${ang.label}`}
                      className={`transition-colors cursor-pointer flex items-center justify-center ${
                        active
                          ? 'h-5 w-5 rounded-full border border-white bg-[#111827]/85 shadow-2xs'
                          : 'h-2.5 w-2.5 rounded-full bg-white/55 hover:bg-white'
                      }`}
                    >
                      {active && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botón '< >' para rotar perspectiva */}
              <button
                type="button"
                onClick={rotarAngulo}
                aria-label="Rotar perspectiva del vehículo"
                className="fx-press absolute right-3.5 bottom-3.5 flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/25 backdrop-blur-md shadow-md hover:bg-[#111827] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="m9 18-6-6 6-6" />
                  <path d="m15 6 6 6-6 6" />
                </svg>
              </button>
            </>
          )}
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Tira de Miniaturas */}
          {tieneGaleria ? (
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {galeriaPublica.map((foto, idx) => {
                const isSelected = idx === galeriaIndex;
                return (
                  <button
                    key={foto.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setGaleriaIndex(idx);
                    }}
                    className={`fx-press shrink-0 w-24 rounded-[18px] overflow-hidden pb-1.5 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#1F2937] text-[#EDEDED] border-[#111827] shadow-md dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-[#EDEDED]/55 text-[#111827] border-[#9CA3AF]/25 hover:bg-[#EDEDED] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="w-full aspect-video overflow-hidden">
                      <img
                        src={foto.url}
                        alt={ETIQUETA_CATEGORIA_GALERIA[foto.categoria]}
                        className="h-full w-full object-cover object-center block"
                      />
                    </div>
                    <span
                      className={`px-1 text-[10px] font-bold truncate max-w-full ${
                        isSelected
                          ? 'text-[#EDEDED] dark:text-[#111827]'
                          : 'text-[#4B5563] dark:text-[#D1D5DB]'
                      }`}
                    >
                      {foto.esPrincipal ? 'Principal' : ETIQUETA_CATEGORIA_GALERIA[foto.categoria]}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2.5">
              {STUDIO_ANGLES.map((ang, idx) => {
                const isSelected = idx === angleIndex;
                return (
                  <button
                    key={ang.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setAngleIndex(idx);
                    }}
                    className={`fx-press rounded-[18px] overflow-hidden pb-2 flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#1F2937] text-[#EDEDED] border-[#111827] shadow-md dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                        : 'bg-[#EDEDED]/55 text-[#111827] border-[#9CA3AF]/25 hover:bg-[#EDEDED] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="w-full aspect-video overflow-hidden">
                      <img
                        src={vehiculo.imagenUrl}
                        alt={ang.label}
                        className={`h-full w-full object-cover object-center block transition-transform ${ang.imageClass}`}
                      />
                    </div>
                    <span
                      className={`px-1 text-[10px] font-bold truncate max-w-full ${
                        isSelected
                          ? 'text-[#EDEDED] dark:text-[#111827]'
                          : 'text-[#4B5563] dark:text-[#D1D5DB]'
                      }`}
                    >
                      {ang.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        {/* ===================================================================
            2. INFORMACIÓN PRINCIPAL: FICHA TÉCNICA Y REQUISITOS (EN UN SOLO LUGAR)
           =================================================================== */}
        <div className="space-y-3.5 pt-1">
          {/* Ficha Técnica */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#EDEDED] dark:border-white/10 pb-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                Ficha Técnica
              </span>
              <span className="text-[11px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                {vehiculo.categoriaEtiqueta} • {vehiculo.anio}
              </span>
            </div>

            <div className="grid grid-cols-2 rounded-2xl overflow-hidden bg-[#EDEDED]/60 dark:bg-[#111827] border border-[#9CA3AF]/25 dark:border-white/10 text-xs">
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 border-r border-b border-[#9CA3AF]/25 dark:border-white/10">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">Transmisión</span>
                <span className="font-bold text-[#111827] dark:text-[#EDEDED] truncate">{vehiculo.transmision}</span>
              </div>
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 border-b border-[#9CA3AF]/25 dark:border-white/10">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">Propulsión</span>
                <span className="font-bold text-[#111827] dark:text-[#EDEDED] truncate">{vehiculo.combustible}</span>
              </div>
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2 border-r border-[#9CA3AF]/25 dark:border-white/10">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">Capacidad</span>
                <span className="font-mono tabular-nums font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                  {vehiculo.capacidadPasajeros} pasajeros
                </span>
              </div>
              <div className="p-2.5 sm:p-3 flex items-center justify-between gap-2">
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">Depósito</span>
                <span className="font-mono tabular-nums font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                  {formatCop(vehiculo.depositoGarantia)}
                </span>
              </div>
            </div>
          </div>

          {/* Requisitos de Alquiler */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#EDEDED] dark:border-white/10 pb-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                Requisitos para Alquilar
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                Verificación en patio
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] dark:border dark:border-white/10 p-2.5 sm:p-3 flex flex-col justify-between gap-1.5">
                <span className="font-mono text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                  ✓ KYC en línea
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED] leading-snug">
                  Documento de identidad y licencia vigente
                </span>
              </div>

              <div className="rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] dark:border dark:border-white/10 p-2.5 sm:p-3 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] truncate">
                  ✓ Garantía ({local.nombre})
                </span>
                <div>
                  <span className="font-mono tabular-nums font-bold text-sm text-[#111827] dark:text-[#EDEDED] block">
                    {formatCop(vehiculo.depositoGarantia)}
                  </span>
                  <span className="text-[10px] text-[#4B5563] dark:text-[#D1D5DB]">
                    Depósito reembolsable
                  </span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
              Entrega con acta fotográfica pericial verificada en patio.
            </p>
          </div>
        </div>

        {/* ===================================================================
            3. BOTÓN DE ACCIÓN INFERIOR (PANTALLAS 1 Y 2: "Add to Cart" + "Buy Now")
           =================================================================== */}
        <div className="pt-2 grid grid-cols-1 gap-3">
          <a
            href={`/alquilar/${vehiculo.id}`}
            onClick={() => triggerHaptic(8)}
            className="fx-press min-h-[48px] inline-flex items-center justify-center rounded-full bg-white border border-[#9CA3AF]/60 px-4 py-3 text-xs sm:text-sm font-extrabold text-[#111827] hover:bg-[#EDEDED]/60 transition-colors dark:bg-[#111827] dark:border-white/20 dark:text-[#EDEDED] dark:hover:bg-white/10"
          >
            Elegir fechas
          </a>

        </div>
        </div>
      </section>

      {/* =====================================================================
          6. BARRA INFERIOR OSCURA DE PAGINACIÓN DEL PATIO (PANTALLA 4 FOOTER)
         ===================================================================== */}
      {listaUnidades.length > 1 && (
        <div className="rounded-[24px] bg-[#1F2937] text-[#EDEDED] px-5 py-3.5 shadow-lg flex items-center justify-between">
          <button
            type="button"
            onClick={() => cambiarUnidad(-1)}
            aria-label="Vehículo anterior de este local"
            className="ios-press-bounce min-h-[40px] min-w-[44px] flex items-center justify-start text-sm font-bold text-[#EDEDED] hover:text-white cursor-pointer"
          >
            ←
          </button>

          <div className="flex items-center gap-2">
            {listaUnidades.map((item, idx) => {
              const active = idx === unidadIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic(6);
                    setUnidadIndex(idx);
                  }}
                  aria-label={`Ver ${item.marca} ${item.modelo}`}
                  className={`rounded-full transition-all cursor-pointer ${active
                    ? 'h-2 w-5 bg-[#EDEDED]'
                    : 'h-2 w-2 bg-[#9CA3AF]/45 hover:bg-[#9CA3AF]'
                    }`}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => cambiarUnidad(1)}
            aria-label="Siguiente vehículo de este local"
            className="ios-press-bounce min-h-[40px] min-w-[44px] flex items-center justify-end text-sm font-bold text-[#EDEDED] hover:text-white cursor-pointer"
          >
            →
          </button>
        </div>
      )}

      {/* Lightbox de galería pública */}
      {lightboxAbierto && fotoActualGaleria && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galería ampliada del vehículo"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar galería ampliada"
            onClick={() => setLightboxAbierto(false)}
            className="fixed inset-0 bg-[#090E1A]/85 backdrop-blur-xs"
          />

          <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#111827] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDEDED]">
                {fotoActualGaleria.esPrincipal
                  ? 'Principal'
                  : ETIQUETA_CATEGORIA_GALERIA[fotoActualGaleria.categoria]}{' '}
                · {galeriaIndex + 1}/{galeriaPublica.length}
              </span>
              <button
                type="button"
                aria-label="Cerrar galería ampliada"
                onClick={() => setLightboxAbierto(false)}
                className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="relative flex max-h-[75vh] items-center justify-center bg-[#090D16]">
              <img
                src={fotoActualGaleria.url}
                alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                className="max-h-[75vh] w-full object-contain"
              />
              {galeriaPublica.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Fotografía anterior"
                    onClick={() =>
                      setGaleriaIndex(
                        (prev) => (prev - 1 + galeriaPublica.length) % galeriaPublica.length
                      )
                    }
                    className="fx-press absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/15 hover:bg-[#111827]"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente fotografía"
                    onClick={() =>
                      setGaleriaIndex((prev) => (prev + 1) % galeriaPublica.length)
                    }
                    className="fx-press absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/15 hover:bg-[#111827]"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
