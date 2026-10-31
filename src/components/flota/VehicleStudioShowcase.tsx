import { useState, useMemo } from 'react';
import type { VehiculoItem } from '@/lib/flota/types';
import type { LocalPublicoContexto } from '@/lib/flota/locales-captacion';

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

  const vehiculo = listaUnidades[unidadIndex] ?? vehiculoInicial;
  const currentAngle = STUDIO_ANGLES[angleIndex] ?? STUDIO_ANGLES[0]!;

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
      <section className="rounded-[32px] bg-white border border-[#9CA3AF]/30 p-4 sm:p-6 shadow-[0_16px_38px_-10px_rgba(17,24,39,0.08)] space-y-5 relative overflow-hidden">
        {/* Escenario Principal */}
        <div className="relative flex flex-col items-center justify-center pt-3 pb-2 min-h-[230px] sm:min-h-[260px]">
          {/* Silueta Secundaria Desenfocada Flotante (Detalle artístico de Pantallas 3 y 4) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1 top-2 w-20 h-20 rounded-2xl bg-[#EDEDED]/60 p-2 flex items-center justify-center blur-[1px] opacity-75"
          >
            <img
              src={vehiculo.imagenUrl}
              alt=""
              className="w-full h-full object-contain -scale-x-100 opacity-70"
            />
          </div>

          {/* Etiqueta de Vista Activa */}
          <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
            <span>{currentAngle.badge}</span>
            <span>•</span>
            <span className="font-mono tabular-nums text-[#111827]">
              ★ {vehiculo.rating}
            </span>
          </span>

          {/* Imagen Principal del Vehículo con Transición Elástica */}
          <div className="w-full px-6 flex items-center justify-center overflow-hidden">
            <img
              src={vehiculo.imagenUrl}
              alt={`${vehiculo.marca} ${vehiculo.modelo} - ${currentAngle.label}`}
              className={`w-full max-h-48 sm:max-h-56 object-contain mx-auto transition-all duration-500 ease-out select-none ${currentAngle.imageClass}`}
            />
          </div>

          {/* Indicadores Verticales de Paginación a la Derecha (Pantallas 3 y 4) */}
          <div
            aria-label="Indicador de perspectiva"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2"
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
                  className={`transition-all cursor-pointer flex items-center justify-center ${active
                    ? 'h-5 w-5 rounded-full border border-[#111827] bg-white shadow-2xs'
                    : 'h-2.5 w-2.5 rounded-full bg-[#9CA3AF]/50 hover:bg-[#4B5563]'
                    }`}
                >
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-[#111827]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Pedestal Elíptico Curvo 360° con Botón '< >' Central (Pantalla 3) */}
          <div className="relative w-full max-w-[290px] sm:max-w-[330px] mt-1 flex flex-col items-center">
            <svg
              viewBox="0 0 320 42"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full h-10 text-[#111827]"
              aria-hidden="true"
            >
              <ellipse
                cx="160"
                cy="16"
                rx="145"
                ry="13"
                stroke="#9CA3AF"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity="0.55"
              />
              <path
                d="M 18 16 A 145 14 0 0 0 302 16"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <button
              type="button"
              onClick={rotarAngulo}
              aria-label="Rotar perspectiva del vehículo"
              className="ios-press-bounce -mt-6 flex h-9 w-9 items-center justify-center rounded-full bg-[#1F2937] text-[#EDEDED] border-2 border-white shadow-md hover:bg-[#111827] cursor-pointer"
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
          </div>
        </div>

        {/* Tira de 4 Miniaturas Squircle (Pantalla 3: Activa en #1F2937) */}
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
                className={`ios-press-bounce rounded-[18px] p-2.5 flex flex-col items-center justify-center gap-1.5 transition cursor-pointer border ${isSelected
                  ? 'bg-[#1F2937] text-[#EDEDED] border-[#111827] shadow-md scale-[1.02]'
                  : 'bg-[#EDEDED]/55 text-[#111827] border-[#9CA3AF]/25 hover:bg-[#EDEDED]'
                  }`}
              >
                <img
                  src={vehiculo.imagenUrl}
                  alt={ang.label}
                  className={`h-10 w-full object-contain transition-transform ${ang.imageClass}`}
                />
                <span
                  className={`text-[10px] font-bold truncate max-w-full ${isSelected ? 'text-[#EDEDED]' : 'text-[#4B5563]'
                    }`}
                >
                  {ang.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* ===================================================================
            2. INFORMACIÓN PRINCIPAL: FICHA TÉCNICA Y REQUISITOS (EN UN SOLO LUGAR)
           =================================================================== */}
        <div className="space-y-3.5 pt-1">
          {/* Ficha Técnica */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#EDEDED] pb-1.5">
              <span className="text-xs sm:text-sm font-bold text-[#111827]">
                Ficha Técnica
              </span>
              <span className="text-[11px] font-semibold text-[#4B5563]">
                {vehiculo.categoriaEtiqueta} • {vehiculo.anio}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-2xl bg-[#EDEDED]/60 p-2.5 sm:p-3 flex items-center justify-between">
                <span className="text-[#4B5563]">Transmisión</span>
                <span className="font-bold text-[#111827]">{vehiculo.transmision}</span>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/60 p-2.5 sm:p-3 flex items-center justify-between">
                <span className="text-[#4B5563]">Propulsión</span>
                <span className="font-bold text-[#111827]">{vehiculo.combustible}</span>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/60 p-2.5 sm:p-3 flex items-center justify-between">
                <span className="text-[#4B5563]">Capacidad</span>
                <span className="font-mono tabular-nums font-bold text-[#111827]">
                  {vehiculo.capacidadPasajeros} pasajeros
                </span>
              </div>
              <div className="rounded-2xl bg-[#EDEDED]/60 p-2.5 sm:p-3 flex items-center justify-between">
                <span className="text-[#4B5563]">Depósito</span>
                <span className="font-mono tabular-nums font-bold text-[#111827]">
                  {formatCop(vehiculo.depositoGarantia)}
                </span>
              </div>
            </div>
          </div>

          {/* Requisitos de Alquiler */}
          <div className="rounded-2xl bg-[#EDEDED]/60 p-3 sm:p-3.5 space-y-2 text-xs text-[#4B5563]">
            <span className="text-xs font-bold text-[#111827] block">
              Requisitos para Alquilar
            </span>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#111827]">
                ✓ Documento de identidad y licencia vigente
              </span>
              <span className="font-mono text-[10px] text-[#4B5563] shrink-0">KYC en línea</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#111827]">
                ✓ Depósito reembolsable en garantía ({local.nombre})
              </span>
              <span className="font-mono tabular-nums font-bold text-[#111827] shrink-0">
                {formatCop(vehiculo.depositoGarantia)}
              </span>
            </div>
            <p className="text-[11px] text-[#4B5563] pt-0.5">
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
            className="ios-press-bounce min-h-[48px] inline-flex items-center justify-center rounded-full bg-white border border-[#9CA3AF]/60 px-4 py-3 text-xs sm:text-sm font-extrabold text-[#111827] hover:bg-[#EDEDED]/60 transition"
          >
            Elegir fechas
          </a>

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
    </div>
  );
}
