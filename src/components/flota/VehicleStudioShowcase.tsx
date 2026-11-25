import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import {
  obtenerEtiquetaPerspectivaGaleria,
  type VehiculoGaleriaFoto,
  type VehiculoItem,
  type ZonaEvidenciaVehiculo,
} from '@/lib/flota/types';
import type { LocalPublicoContexto } from '@/lib/flota/locales-captacion';

const RANURAS_FICHA_PUBLICA: ReadonlyArray<{
  zona: ZonaEvidenciaVehiculo;
  etiqueta: string;
}> = [
  { zona: 'EXTERIOR_LATERAL_IZQ', etiqueta: 'Lateral (Principal)' },
  { zona: 'EXTERIOR_FRONTAL', etiqueta: 'Frontal' },
  { zona: 'EXTERIOR_TRASERO', etiqueta: 'Trasera' },
  { zona: 'INTERIOR_ASIENTOS', etiqueta: 'Cojinería y asientos' },
  { zona: 'PANTALLA_TABLERO_ODOMETRO', etiqueta: 'Tablero y condiciones' },
];

export interface VehicleStudioShowcaseProps {
  vehiculoInicial: VehiculoItem;
  flotaLocal: VehiculoItem[];
  local: LocalPublicoContexto;
  hoyISO?: string;
}

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
    if (!existe) return [vehiculoInicial, ...flotaLocal];
    return flotaLocal.map((v) =>
      v.id === vehiculoInicial.id
        ? {
            ...v,
            galeria: vehiculoInicial.galeria?.length
              ? vehiculoInicial.galeria
              : v.galeria,
          }
        : v
    );
  }, [flotaLocal, vehiculoInicial]);

  const indiceInicial = Math.max(
    0,
    listaUnidades.findIndex((v) => v.id === vehiculoInicial.id)
  );

  const [unidadIndex, setUnidadIndex] = useState<number>(indiceInicial);
  const [galeriaIndex, setGaleriaIndex] = useState<number>(0);
  const [lightboxAbierto, setLightboxAbierto] = useState<boolean>(false);

  const vehiculo = listaUnidades[unidadIndex] ?? vehiculoInicial;
  const galeriaPublica = useMemo(() => {
    if (vehiculo.galeria && vehiculo.galeria.length > 0) {
      return [...vehiculo.galeria].sort((a, b) => {
        if (a.esPrincipal && !b.esPrincipal) return -1;
        if (!a.esPrincipal && b.esPrincipal) return 1;
        return a.orden - b.orden;
      });
    }
    if (vehiculo.imagenUrl) {
      return [
        {
          id: `principal-${vehiculo.id}`,
          url: vehiculo.imagenUrl,
          categoria: 'EXTERIOR' as const,
          zona: 'EXTERIOR_LATERAL_IZQ' as const,
          esPrincipal: true,
          orden: 0,
        },
      ];
    }
    return [];
  }, [vehiculo.galeria, vehiculo.id, vehiculo.imagenUrl]);
  const fotoActualGaleria = galeriaPublica[galeriaIndex] ?? galeriaPublica[0];

  const recuadrosPerspectivas = useMemo(() => {
    const usados = new Set<string>();
    const items: Array<{
      clave: string;
      etiqueta: string;
      foto: VehiculoGaleriaFoto | null;
      indiceGaleria: number;
    }> = [];

    for (const ranura of RANURAS_FICHA_PUBLICA) {
      let indice = -1;
      if (ranura.zona === 'EXTERIOR_LATERAL_IZQ') {
        indice = galeriaPublica.findIndex(
          (f) => f.esPrincipal || f.zona === 'EXTERIOR_LATERAL_IZQ'
        );
      } else {
        indice = galeriaPublica.findIndex(
          (f) => !f.esPrincipal && !usados.has(f.id) && f.zona === ranura.zona
        );
      }

      const foto = indice >= 0 ? (galeriaPublica[indice] ?? null) : null;
      if (foto) usados.add(foto.id);

      items.push({
        clave: ranura.zona,
        etiqueta: ranura.etiqueta,
        foto,
        indiceGaleria: indice,
      });
    }

    const extras = galeriaPublica
      .map((foto, indice) => ({ foto, indice }))
      .filter(({ foto }) => !usados.has(foto.id));

    if (extras.length > 0) {
      extras.forEach(({ foto, indice }, idxExtra) => {
        items.push({
          clave: `extra-${foto.id}`,
          etiqueta:
            foto.zona && foto.zona !== 'INTERIOR_CABINA'
              ? obtenerEtiquetaPerspectivaGaleria(foto)
              : extras.length === 1
                ? 'Adicional'
                : `Adicional ${idxExtra + 1}`,
          foto,
          indiceGaleria: indice,
        });
      });
    }

    return items;
  }, [galeriaPublica]);

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

  return (
    <div className="mx-auto w-full max-w-md sm:max-w-xl space-y-4 pb-10">
      {/* =====================================================================
          1. GALERÍA FOTOGRÁFICA REAL DEL VEHÍCULO
         ===================================================================== */}
      <section className="rounded-[32px] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/30 dark:border-white/12 shadow-[0_16px_38px_-10px_rgba(17,24,39,0.08)] relative overflow-hidden">
        {/* Escenario Principal: Fotografía 16:9 de borde a borde, sin marco ni relleno */}
        <div className="relative w-full aspect-video rounded-t-[31px] overflow-hidden">
          {fotoActualGaleria && (
            <>
              <button
                type="button"
                onClick={() => setLightboxAbierto(true)}
                aria-label="Ampliar fotografía del vehículo"
                className="block h-full w-full cursor-pointer"
              >
                <img
                  src={fotoActualGaleria.url}
                  alt={`${vehiculo.marca} ${vehiculo.modelo} - ${obtenerEtiquetaPerspectivaGaleria(fotoActualGaleria)}`}
                  className="h-full w-full object-cover object-center block select-none"
                />
              </button>

              <span className="absolute left-3.5 top-3.5 inline-flex items-center gap-1.5 rounded-full bg-[#111827]/75 backdrop-blur-md border border-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white max-w-[calc(100%-5rem)]">
                <span className="truncate">
                  {obtenerEtiquetaPerspectivaGaleria(fotoActualGaleria)}
                </span>
                <span className="shrink-0">•</span>
                <span className="shrink-0 font-mono tabular-nums">
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
          )}
        </div>

        <div className="p-4 sm:p-6 space-y-5">
          {/* Recuadros de Perspectivas y Fotografías Adicionales */}
          <div
            className={`grid grid-cols-3 gap-2 ${
              recuadrosPerspectivas.length <= 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-6'
            }`}
          >
            {recuadrosPerspectivas.map((item) => {
              const foto = item.foto;
              if (!foto) {
                return (
                  <div
                    key={item.clave}
                    aria-label={`${item.etiqueta}: sin fotografía`}
                    className="rounded-[16px] border border-dashed border-[#9CA3AF]/45 bg-[#EDEDED]/40 pb-1.5 flex flex-col items-center justify-between gap-1 dark:border-white/15 dark:bg-[#111827]/55"
                  >
                    <div className="w-full aspect-video flex items-center justify-center text-[#9CA3AF] dark:text-[#9CA3AF]/70">
                      <ImageIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <span
                      title={item.etiqueta}
                      className="px-1.5 text-[10px] font-semibold text-[#4B5563]/80 truncate max-w-full dark:text-[#9CA3AF]"
                    >
                      {item.etiqueta}
                    </span>
                  </div>
                );
              }

              const isSelected = item.indiceGaleria === galeriaIndex;
              return (
                <button
                  key={item.clave}
                  type="button"
                  onClick={() => {
                    triggerHaptic(8);
                    setGaleriaIndex(item.indiceGaleria);
                  }}
                  className={`fx-press rounded-[16px] overflow-hidden pb-1.5 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer border ${
                    isSelected
                      ? 'bg-[#1F2937] text-[#EDEDED] border-[#111827] shadow-md dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED]/55 text-[#111827] border-[#9CA3AF]/25 hover:bg-[#EDEDED] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/10'
                  }`}
                >
                  <div className="w-full aspect-video overflow-hidden">
                    <img
                      src={foto.url}
                      alt={item.etiqueta}
                      className="h-full w-full object-cover object-center block"
                    />
                  </div>
                  <span
                    title={item.etiqueta}
                    className={`px-1.5 text-[10px] font-bold truncate max-w-full ${
                      isSelected
                        ? 'text-[#EDEDED] dark:text-[#111827]'
                        : 'text-[#4B5563] dark:text-[#D1D5DB]'
                    }`}
                  >
                    {item.etiqueta}
                  </span>
                </button>
              );
            })}
          </div>
        {/* ===================================================================
            2. INFORMACIÓN PRINCIPAL: FICHA TÉCNICA Y TARIFA DIARIA
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
                <span className="text-[#4B5563] dark:text-[#D1D5DB]">Kilometraje</span>
                <span className="font-mono tabular-nums font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                  {vehiculo.kilometraje.toLocaleString('es-CO')} km
                </span>
              </div>
            </div>
          </div>

          {/* Requisitos y Tarifa Diaria */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#EDEDED] dark:border-white/10 pb-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                Tarifa y Requisitos
              </span>
              <span className="font-mono text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                {local.nombre}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] dark:border dark:border-white/10 p-2.5 sm:p-3 flex flex-col justify-between gap-1.5">
                <span className="font-mono text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB]">
                  Documentación
                </span>
                <span className="font-semibold text-[#111827] dark:text-[#EDEDED] leading-snug">
                  Documento de identidad y licencia vigente
                </span>
              </div>

              <div className="rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] dark:border dark:border-white/10 p-2.5 sm:p-3 flex flex-col justify-between gap-1.5">
                <span className="text-[10px] font-semibold text-[#4B5563] dark:text-[#D1D5DB] truncate">
                  Precio de alquiler
                </span>
                <div>
                  <span className="font-mono tabular-nums font-bold text-sm text-[#111827] dark:text-[#EDEDED] block">
                    {formatCop(vehiculo.precioDia)} / día
                  </span>
                  <span className="text-[10px] text-[#4B5563] dark:text-[#D1D5DB]">
                    Tarifa por día de alquiler
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
                  className={`rounded-full transition-colors cursor-pointer ${active
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
                {obtenerEtiquetaPerspectivaGaleria(fotoActualGaleria)}{' '}
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
