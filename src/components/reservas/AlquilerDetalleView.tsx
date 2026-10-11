import { useEffect, useMemo, useState } from 'react';
import {
  formatearRangoReservaHumano,
  obtenerPuntosInspeccionPorVehiculo,
  obtenerReservaClientePorCodigo,
  obtenerRubrosWaybillReserva,
  type ReservaClienteItem,
} from '@/lib/flota';

export interface AlquilerDetalleViewProps {
  codigo: string;
  reservaInicial: ReservaClienteItem;
  hoyISO: string;
}

type TabDetalleAlquiler = 'INSPECCION' | 'WAYBILL' | 'HIGHLIGHTS';

const STORAGE_KEY_RESERVAS = 'flotax_reservas_cliente';
const TOTAL_TICKS_BARRA = 28;

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function AlquilerDetalleView({
  codigo,
  reservaInicial,
  hoyISO,
}: AlquilerDetalleViewProps) {
  const [reserva, setReserva] = useState<ReservaClienteItem>(reservaInicial);
  const [tabActiva, setTabActiva] = useState<TabDetalleAlquiler>('INSPECCION');
  const [puntoActivoId, setPuntoActivoId] = useState<string>('r2-carroceria');
  const [rubroActivoId, setRubroActivoId] = useState<string>('total-contrato');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_RESERVAS);
      const encontrada = obtenerReservaClientePorCodigo(codigo, raw, hoyISO);
      if (encontrada) {
        setReserva(encontrada);
      }
    } catch {
      // Mantener reservaInicial SSR
    }
  }, [codigo, hoyISO]);

  const { vehiculo, specsBento } = reserva;

  const puntosR2 = useMemo(
    () => obtenerPuntosInspeccionPorVehiculo(vehiculo),
    [vehiculo]
  );

  const puntoSeleccionado = useMemo(
    () => puntosR2.find((p) => p.id === puntoActivoId) ?? puntosR2[0]!,
    [puntosR2, puntoActivoId]
  );

  const rubrosWaybill = useMemo(
    () => obtenerRubrosWaybillReserva(reserva),
    [reserva]
  );

  const rubroSeleccionado = useMemo(
    () =>
      rubrosWaybill.find((r) => r.id === rubroActivoId) ?? rubrosWaybill[0]!,
    [rubrosWaybill, rubroActivoId]
  );

  const pctAbonado = Math.min(
    100,
    Math.round((reserva.montoReportado / Math.max(1, reserva.totalAlquiler)) * 100)
  );
  const pctSaldo = Math.max(0, 100 - pctAbonado);
  const ticksActivos = Math.max(
    6,
    Math.round((pctAbonado / 100) * TOTAL_TICKS_BARRA)
  );

  const [potenciaValor = '288', potenciaUnidad = 'hp'] =
    specsBento.potenciaHp.split(' ');
  const [acelValor = '3.8', acelUnidad = 's'] =
    vehiculo.aceleracion.split(' ');

  // Geometría del dial circular SVG (Waybill)
  const radioCirculo = 52;
  const circunferencia = 2 * Math.PI * radioCirculo;
  const offsetArco =
    circunferencia -
    (Math.min(100, Math.max(15, rubroSeleccionado.porcentajeSobreTotal)) / 100) *
      circunferencia;

  const ciclarVista = () => {
    setTabActiva((prev) =>
      prev === 'INSPECCION'
        ? 'WAYBILL'
        : prev === 'WAYBILL'
          ? 'HIGHLIGHTS'
          : 'INSPECCION'
    );
  };

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col justify-between px-5 pt-2 pb-3">
      {/* =====================================================================
          ZONA 1: CABECERA EDITORIAL Y PÍLDORAS DIRECTAS SOBRE EL LIENZO MÓVIL
          (Sin card contenedora, 100% fiel a la pantalla central de la referencia)
          ===================================================================== */}
      <header className="space-y-3">
        <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#111827] leading-[1.08]">
          {vehiculo.marca}
          <span className="block font-bold text-[#1F2937]">{vehiculo.modelo}</span>
        </h1>

        {/* 5 Píldoras Suaves sin Bordes sobre el Lienzo #EDEDED */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-medium text-[#111827]">
            {reserva.sedeNombre}
          </span>
          <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-medium text-[#111827]">
            {vehiculo.combustible} · {vehiculo.autonomiaOdo}
          </span>
          <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-semibold text-[#111827] tabular-nums">
            {formatCop(reserva.totalAlquiler)} Total
          </span>
          <span className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-medium text-[#4B5563] tabular-nums">
            {formatCop(vehiculo.depositoGarantia)} Garantía
          </span>
          <span className="rounded-full bg-white/75 px-3 py-1 font-mono text-[11px] font-semibold text-[#111827]">
            #{reserva.codigo}
          </span>
        </div>
      </header>

      {/* =====================================================================
          ZONA 2: ESCENARIO ABIERTO DEL VEHÍCULO + CÁPSULA VERTICAL EN CRISTAL
          (El vehículo respira libre sobre el fondo móvil, sin caja alrededor)
          ===================================================================== */}
      <section
        aria-label={`Escenario de inspección de ${vehiculo.marca} ${vehiculo.modelo}`}
        className="relative my-auto flex items-center justify-center py-6 min-h-[220px]"
      >
        <div className="relative w-full pr-12">
          <img
            src={vehiculo.imagenUrl}
            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
            className="w-full max-h-52 object-contain mx-auto drop-shadow-[0_18px_26px_rgba(17,24,39,0.18)]"
          />
          <div
            aria-hidden="true"
            className="mx-auto -mt-2 h-3.5 w-4/5 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0.20)_0%,_transparent_75%)]"
          />

          {/* Puntos Interactivos R2 sobre la Silueta del Vehículo */}
          {puntosR2.map((punto) => {
            const activo = puntoSeleccionado.id === punto.id;
            return (
              <button
                key={punto.id}
                type="button"
                onClick={() => {
                  setPuntoActivoId(punto.id);
                  setTabActiva('INSPECCION');
                }}
                style={{ left: punto.coordX, top: punto.coordY }}
                aria-label={`Inspección: ${punto.zona}`}
                className={`ios-press-bounce absolute -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full transition-transform cursor-pointer ${
                  activo
                    ? 'bg-[#111827] text-white ring-4 ring-white/80 scale-110 z-20'
                    : 'bg-white/90 text-[#111827] hover:scale-105 z-10'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    activo ? 'bg-white' : 'bg-[#111827]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Insignia Inferior Izquierda: Silueta y Placa (Sin borde pesado) */}
        <div className="absolute bottom-1 left-0 flex items-center gap-1.5 rounded-2xl bg-white/65 backdrop-blur-md px-3 py-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="h-4 w-4 text-[#111827]"
          >
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
            <circle cx="7" cy="17" r="2" />
            <path d="M9 17h6" />
            <circle cx="17" cy="17" r="2" />
          </svg>
          <span className="font-mono text-[10px] font-bold text-[#111827]">
            {vehiculo.placa}
          </span>
        </div>

        {/* Cápsula Vertical Flotante Derecha (Único selector de modo, sin barra duplicada) */}
        <div
          role="toolbar"
          aria-label="Cambiar vista del alquiler"
          className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 rounded-full bg-[#9CA3AF]/25 backdrop-blur-xl border border-white/60 p-1.5 shadow-[0_12px_28px_-8px_rgba(17,24,39,0.14)] z-20"
        >
          <button
            type="button"
            onClick={() => setTabActiva('INSPECCION')}
            aria-label="Inspección Pericial R2"
            aria-pressed={tabActiva === 'INSPECCION'}
            className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
              tabActiva === 'INSPECCION'
                ? 'bg-[#111827] text-white'
                : 'bg-white/80 text-[#111827] hover:bg-white'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('WAYBILL')}
            aria-label="Waybill y Liquidación"
            aria-pressed={tabActiva === 'WAYBILL'}
            className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
              tabActiva === 'WAYBILL'
                ? 'bg-[#111827] text-white'
                : 'bg-white/80 text-[#111827] hover:bg-white'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva('HIGHLIGHTS')}
            aria-label="Ficha Técnica"
            aria-pressed={tabActiva === 'HIGHLIGHTS'}
            className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
              tabActiva === 'HIGHLIGHTS'
                ? 'bg-[#111827] text-white'
                : 'bg-white/80 text-[#111827] hover:bg-white'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <rect width="7" height="7" x="3" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="3" rx="1" />
              <rect width="7" height="7" x="14" y="14" rx="1" />
              <rect width="7" height="7" x="3" y="14" rx="1" />
            </svg>
          </button>
        </div>
      </section>

      {/* =====================================================================
          ZONA 3: ÚNICA LÁMINA INFERIOR BLANCA (Cero cards anidadas con bordes)
          ===================================================================== */}
      <section
        aria-label="Panel inferior del alquiler"
        className="rounded-[32px] bg-white p-5 shadow-[0_10px_30px_-15px_rgba(17,24,39,0.06)]"
      >
        {/* -------------------------------------------------------------------
            VISTA 1: INSPECCIÓN PERICIAL & BARRA DE CONFIANZA (Pantalla 2 Ref.)
            ------------------------------------------------------------------- */}
        {tabActiva === 'INSPECCION' && (
          <div className="space-y-4 animate-fade-up">
            {/* Cabecera estilo "Seller's Description" + Botón Circular ↗ */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#111827]">
                  {puntoSeleccionado.zona}
                </h2>
                <p className="mt-0.5 text-xs text-[#4B5563] leading-relaxed">
                  {puntoSeleccionado.dictamen}
                </p>
              </div>

              <button
                type="button"
                onClick={ciclarVista}
                aria-label="Ver liquidación Waybill"
                className="ios-press-bounce flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDEDED]/75 text-[#111827] hover:bg-[#EDEDED] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
            </div>

            {/* Selector Horizontal Ligero de Zonas (En lugar de 4 cards apiladas) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {puntosR2.map((punto) => {
                const activo = puntoSeleccionado.id === punto.id;
                return (
                  <button
                    key={punto.id}
                    type="button"
                    onClick={() => setPuntoActivoId(punto.id)}
                    className={`ios-press-bounce shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                      activo
                        ? 'bg-[#111827] text-white'
                        : 'bg-[#EDEDED]/75 text-[#4B5563] hover:text-[#111827]'
                    }`}
                  >
                    {punto.zona.split(' ')[0]} · {punto.etiqueta}
                  </button>
                );
              })}
            </div>

            {/* Barra de 28 Trazos Verticales (Estilo "2 deals | 0 reviews | Confidence Level") */}
            <div className="pt-1">
              <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                <span>{puntosR2.length} verificaciones R2</span>
                <span>0 novedades</span>
              </div>

              <div
                aria-hidden="true"
                className="mt-2.5 flex items-center justify-between gap-[3px] h-3"
              >
                {Array.from({ length: TOTAL_TICKS_BARRA }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`flex-1 rounded-full ${
                      idx < ticksActivos
                        ? 'h-3 bg-[#111827]'
                        : 'h-2 bg-[#9CA3AF]/40'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#9CA3AF]">
                <span>Nivel de confianza</span>
                <span className="font-medium text-[#4B5563]">
                  {formatearRangoReservaHumano(
                    reserva.fechaInicio,
                    reserva.fechaFin
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            VISTA 2: WAYBILL & ARO CIRCULAR DE LIQUIDACIÓN (Pantalla 3 Ref.)
            ------------------------------------------------------------------- */}
        {tabActiva === 'WAYBILL' && (
          <div className="space-y-4 animate-fade-up">
            {/* Cabecera #Waybill + Botón Circular ↗ */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <h2 className="font-display text-lg font-extrabold tracking-tight text-[#111827]">
                    #{reserva.codigo}
                  </h2>
                  <span className="text-[11px] font-medium text-[#4B5563]">
                    Waybill
                  </span>
                </div>
                <p className="text-[11px] text-[#9CA3AF]">
                  {formatearRangoReservaHumano(
                    reserva.fechaInicio,
                    reserva.fechaFin
                  )}{' '}
                  · {reserva.diasAlquiler} días
                </p>
              </div>

              <button
                type="button"
                onClick={ciclarVista}
                aria-label="Ver especificaciones"
                className="ios-press-bounce flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EDEDED]/75 text-[#111827] hover:bg-[#EDEDED] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
            </div>

            {/* Layout Lado a Lado en Móvil: Píldoras Izquierda + Aro Circular Derecha */}
            <div className="grid grid-cols-[1fr_120px] items-center gap-3">
              <div className="flex flex-col gap-1.5 min-w-0">
                {rubrosWaybill.map((rubro) => {
                  const seleccionado = rubroSeleccionado.id === rubro.id;
                  return (
                    <button
                      key={rubro.id}
                      type="button"
                      onClick={() => setRubroActivoId(rubro.id)}
                      className={`ios-press-bounce w-full rounded-full px-3 py-1.5 text-left text-[11px] transition-colors cursor-pointer truncate ${
                        seleccionado
                          ? 'bg-[#111827] text-white font-semibold'
                          : 'bg-[#EDEDED]/75 text-[#4B5563] font-medium hover:text-[#111827]'
                      }`}
                    >
                      {rubro.etiqueta}
                    </button>
                  );
                })}
              </div>

              {/* Dial Circular SVG Compacto */}
              <div className="relative flex h-[120px] w-[120px] shrink-0 items-center justify-center">
                <svg
                  viewBox="0 0 120 120"
                  className="h-full w-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r={radioCirculo}
                    fill="none"
                    stroke="#EDEDED"
                    strokeWidth="5"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r={radioCirculo}
                    fill="none"
                    stroke="#111827"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circunferencia}
                    strokeDashoffset={offsetArco}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
                  <span className="font-display text-xs font-extrabold tracking-tight text-[#111827] tabular-nums">
                    {formatCop(rubroSeleccionado.monto)}
                  </span>
                  <span className="mt-0.5 text-[9px] font-medium text-[#9CA3AF]">
                    {rubroSeleccionado.etiquetaCorta}
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Indicadores de Porcentaje Planos (39% | 41% | 20% Ref.) */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div>
                <span className="font-display text-xs font-extrabold text-[#111827] tabular-nums">
                  {pctAbonado}%
                </span>
                <span className="block text-[10px] text-[#9CA3AF]">Abonado</span>
                <div className="mt-1 h-1 w-full rounded-full bg-[#EDEDED]">
                  <div
                    className="h-full rounded-full bg-[#111827]"
                    style={{ width: `${pctAbonado}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="font-display text-xs font-extrabold text-[#111827] tabular-nums">
                  {pctSaldo}%
                </span>
                <span className="block text-[10px] text-[#9CA3AF]">
                  Saldo patio
                </span>
                <div className="mt-1 h-1 w-full rounded-full bg-[#EDEDED]">
                  <div
                    className="h-full rounded-full bg-[#4B5563]"
                    style={{ width: `${pctSaldo}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="font-display text-xs font-extrabold text-[#111827] tabular-nums">
                  100%
                </span>
                <span className="block text-[10px] text-[#9CA3AF]">
                  Garantía R2
                </span>
                <div className="mt-1 h-1 w-full rounded-full bg-[#EDEDED]">
                  <div className="h-full w-full rounded-full bg-[#1F2937]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            VISTA 3: ESPECIFICACIONES PLANAS 2x2 (Sin bordes internos)
            ------------------------------------------------------------------- */}
        {tabActiva === 'HIGHLIGHTS' && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#111827]">
                Feature Highlights
              </h2>
              <button
                type="button"
                onClick={ciclarVista}
                aria-label="Volver a inspección"
                className="ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED]/75 text-[#111827] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-3.5 w-3.5"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                <span className="text-[10px] font-medium text-[#4B5563]">
                  Passenger capacity
                </span>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="font-display text-xl font-black text-[#111827] tabular-nums">
                    {vehiculo.capacidadPasajeros}
                  </span>
                  <span className="text-[11px] font-semibold text-[#4B5563]">
                    {specsBento.carroceriaTag}
                  </span>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                <span className="text-[10px] font-medium text-[#4B5563]">
                  Power · {specsBento.motorSubtitulo}
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-xl font-black text-[#111827] tabular-nums">
                    {potenciaValor}
                  </span>
                  <span className="text-xs font-bold text-[#4B5563]">
                    {potenciaUnidad}
                  </span>
                </div>
              </div>

              <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                <span className="text-[10px] font-medium text-[#4B5563]">
                  Transmisión {vehiculo.transmision.toLowerCase()}
                </span>
                <p className="mt-1 font-display text-xs font-bold text-[#111827] truncate">
                  {specsBento.transmisionBadge}
                </p>
              </div>

              <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                <span className="text-[10px] font-medium text-[#4B5563]">
                  0-100 km/h · {vehiculo.velocidadMaxima}
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-display text-xl font-black text-[#111827] tabular-nums">
                    {acelValor}
                  </span>
                  <span className="text-xs font-bold text-[#4B5563]">
                    {acelUnidad}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
