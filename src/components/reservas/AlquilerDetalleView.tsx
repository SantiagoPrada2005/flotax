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

type TabDetalleAlquiler = 'WAYBILL' | 'INSPECCION' | 'HIGHLIGHTS';

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
  const [tabActiva, setTabActiva] = useState<TabDetalleAlquiler>('WAYBILL');
  const [puntoActivoId, setPuntoActivoId] = useState<string>('r2-carroceria');
  const [rubroActivoId, setRubroActivoId] = useState<string>('total-contrato');

  // Hidratar desde localStorage si el alquiler fue creado por el usuario en el navegador
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
    4,
    Math.round((pctAbonado / 100) * TOTAL_TICKS_BARRA)
  );

  const [potenciaValor = '288', potenciaUnidad = 'hp'] =
    specsBento.potenciaHp.split(' ');
  const [acelValor = '3.8', acelUnidad = 's'] =
    vehiculo.aceleracion.split(' ');

  // Cálculo del arco SVG para el aro circular de liquidación (Pantalla 3 Ref.)
  const radioCirculo = 58;
  const circunferencia = 2 * Math.PI * radioCirculo;
  const offsetArco =
    circunferencia -
    (Math.min(100, Math.max(12, rubroSeleccionado.porcentajeSobreTotal)) / 100) *
      circunferencia;

  return (
    <div className="space-y-4 pb-6">
      {/* =====================================================================
          ZONA 1: IDENTIDAD, PÍLDORAS Y ESCENARIO DE INSPECCIÓN CON CÁPSULA VERTICAL
          (Basado en Pantalla 2 de la Referencia Fotográfica)
          ===================================================================== */}
      <section
        aria-label={`Inspección y estado de ${vehiculo.marca} ${vehiculo.modelo}`}
        className="relative overflow-hidden rounded-[32px] bg-white border border-[#9CA3AF]/40 p-4 sm:p-6 shadow-xs"
      >
        {/* 1. Título Editorial en 2 Líneas */}
        <header>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#111827] leading-tight">
            {vehiculo.marca}
            <span className="block text-[#1F2937]">{vehiculo.modelo}</span>
          </h1>

          {/* 2. Cluster de 5 Píldoras de Metadatos (Estilo California / 4.2 Liters / Value / Auction) */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/35 px-3 py-1 text-[11px] font-medium text-[#111827]">
              {reserva.sedeNombre}
            </span>
            <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/35 px-3 py-1 text-[11px] font-medium text-[#111827]">
              {vehiculo.combustible} · {vehiculo.autonomiaOdo}
            </span>
            <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/35 px-3 py-1 text-[11px] font-semibold text-[#111827] tabular-nums">
              {formatCop(reserva.totalAlquiler)} Total
            </span>
            <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/35 px-3 py-1 text-[11px] font-medium text-[#4B5563] tabular-nums">
              {formatCop(vehiculo.depositoGarantia)} Garantía
            </span>
            <span className="rounded-full bg-[#EDEDED] border border-[#9CA3AF]/35 px-3 py-1 font-mono text-[11px] font-bold text-[#111827]">
              #{reserva.codigo}
            </span>
          </div>
        </header>

        {/* 3. Escenario del Vehículo + Hotspots Periciales R2 + Cápsula Vertical en Cristal */}
        <div className="relative mt-4 flex items-center justify-center py-4 min-h-[210px] sm:min-h-[240px]">
          {/* Imagen del Vehículo con Puntos Interactivos */}
          <div className="relative w-full pr-12 sm:pr-14">
            <img
              src={vehiculo.imagenUrl}
              alt={`${vehiculo.marca} ${vehiculo.modelo}`}
              className="w-full max-h-46 sm:max-h-54 object-contain mx-auto drop-shadow-[0_14px_22px_rgba(17,24,39,0.18)]"
            />
            <div
              aria-hidden="true"
              className="mx-auto -mt-2 h-3.5 w-4/5 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0.22)_0%,_transparent_75%)]"
            />

            {/* Hotspots de Inspección Fotográfica R2 sobre el Vehículo */}
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
                  aria-label={`Punto de inspección: ${punto.zona}`}
                  className={`ios-press-bounce absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full transition-transform cursor-pointer ${
                    activo
                      ? 'bg-[#111827] text-white ring-4 ring-white/90 scale-110 shadow-md z-20'
                      : 'bg-white/90 text-[#111827] border border-[#111827]/40 shadow-xs hover:scale-105 z-10'
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

          {/* Miniatura de Silueta / Placa en Esquina Inferior Izquierda (Ref. Pantalla 2) */}
          <div className="absolute bottom-1 left-0 flex items-center gap-2 rounded-[14px] bg-[#EDEDED]/90 border border-[#9CA3AF]/45 px-2.5 py-1.5">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
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

          {/* Cápsula Vertical Flotante Derecha (Estilo Pantalla 2 Ref.) */}
          <div
            role="toolbar"
            aria-label="Vistas del alquiler"
            className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-2 rounded-full bg-[#111827]/12 backdrop-blur-xl border border-white/70 p-1.5 shadow-[0_12px_28px_-6px_rgba(17,24,39,0.18)] z-20"
          >
            <button
              type="button"
              onClick={() => setTabActiva('WAYBILL')}
              aria-label="Liquidación y Waybill"
              title="Waybill y costos"
              className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                tabActiva === 'WAYBILL'
                  ? 'bg-[#111827] text-white shadow-xs'
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
              onClick={() => setTabActiva('INSPECCION')}
              aria-label="Inspección Pericial R2"
              title="Inspección R2"
              className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                tabActiva === 'INSPECCION'
                  ? 'bg-[#111827] text-white shadow-xs'
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
              onClick={() => setTabActiva('HIGHLIGHTS')}
              aria-label="Especificaciones de la unidad"
              title="Feature Highlights"
              className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
                tabActiva === 'HIGHLIGHTS'
                  ? 'bg-[#111827] text-white shadow-xs'
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
        </div>
      </section>

      {/* =====================================================================
          ZONA 2: PESTAÑAS CON CONTADORES + TARJETA ACTIVA
          (Basado en Pantalla 3 y Pantalla 2 de la Referencia)
          ===================================================================== */}
      <section aria-label="Detalle operativo del alquiler" className="space-y-3">
        {/* Barra de Pestañas con Badges Numéricos (Estilo Maintenance [4] | Mismatches [17] | Accident [3]) */}
        <div
          role="tablist"
          aria-label="Secciones del alquiler"
          className="grid grid-cols-3 gap-1.5 rounded-full bg-white border border-[#9CA3AF]/40 p-1.5 shadow-2xs"
        >
          {[
            { id: 'WAYBILL' as const, label: 'Waybill', count: rubrosWaybill.length },
            { id: 'INSPECCION' as const, label: 'Peritaje R2', count: puntosR2.length },
            { id: 'HIGHLIGHTS' as const, label: 'Highlights', count: 4 },
          ].map((tab) => {
            const activa = tabActiva === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setTabActiva(tab.id)}
                className={`ios-press-bounce flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                  activa
                    ? 'bg-[#EDEDED] text-[#111827]'
                    : 'bg-transparent text-[#4B5563] hover:text-[#111827]'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                <span
                  className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                    activa
                      ? 'bg-[#111827] text-white'
                      : 'bg-[#EDEDED] text-[#4B5563]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* -------------------------------------------------------------------
            MODO 1: WAYBILL & ARO CIRCULAR DE LIQUIDACIÓN (Pantalla 3 Ref.)
            ------------------------------------------------------------------- */}
        {tabActiva === 'WAYBILL' && (
          <div className="space-y-3 animate-fade-up">
            <div className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-4 sm:p-5 shadow-xs space-y-4">
              {/* Cabecera #Waybill + Fecha + Píldora de Rango */}
              <div className="flex items-start justify-between gap-2 border-b border-[#9CA3AF]/25 pb-3.5">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <h2 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#111827]">
                      #{reserva.codigo}
                    </h2>
                    <span className="text-[11px] font-semibold text-[#4B5563]">
                      Waybill
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[#4B5563]">
                    {reserva.fechaInicio.replaceAll('-', '.')} · Servicio Oficial{' '}
                    {reserva.sedeNombre}
                  </p>
                </div>

                <span className="rounded-full bg-white border border-[#9CA3AF]/55 px-3.5 py-1.5 text-xs font-bold text-[#111827]">
                  {formatearRangoReservaHumano(
                    reserva.fechaInicio,
                    reserva.fechaFin
                  )}
                </span>
              </div>

              {/* Bloque "Potential Expenses" -> Desglose + Aro Circular Derecho */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm sm:text-base font-bold text-[#111827]">
                    Desglose del Contrato
                  </h3>
                  <span className="font-mono text-[11px] font-semibold text-[#4B5563]">
                    {reserva.diasAlquiler}{' '}
                    {reserva.diasAlquiler === 1 ? 'día' : 'días'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Columna Izquierda: Píldoras Interactivas de Rubros */}
                  <div className="w-full sm:w-auto flex-1 flex flex-col gap-1.5">
                    {rubrosWaybill.map((rubro) => {
                      const seleccionado = rubroSeleccionado.id === rubro.id;
                      return (
                        <button
                          key={rubro.id}
                          type="button"
                          onClick={() => setRubroActivoId(rubro.id)}
                          className={`ios-press-bounce w-full rounded-full px-3.5 py-2 text-left text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                            seleccionado
                              ? 'bg-[#111827] text-white font-bold shadow-2xs'
                              : 'bg-[#EDEDED] text-[#111827] font-medium hover:border-[#9CA3AF]'
                          }`}
                        >
                          <span className="truncate">{rubro.etiqueta}</span>
                          <span
                            className={`font-mono text-[11px] tabular-nums shrink-0 ${
                              seleccionado ? 'text-[#EDEDED]' : 'text-[#4B5563]'
                            }`}
                          >
                            {formatCop(rubro.monto)}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Columna Derecha: Aro Circular de Calibre con Valor Activo */}
                  <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                    <svg
                      viewBox="0 0 132 132"
                      className="h-full w-full -rotate-90"
                      aria-hidden="true"
                    >
                      <circle
                        cx="66"
                        cy="66"
                        r={radioCirculo}
                        fill="none"
                        stroke="#EDEDED"
                        strokeWidth="7"
                      />
                      <circle
                        cx="66"
                        cy="66"
                        r={radioCirculo}
                        fill="none"
                        stroke="#111827"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray={circunferencia}
                        strokeDashoffset={offsetArco}
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                        {rubroSeleccionado.etiquetaCorta}
                      </span>
                      <span className="mt-0.5 font-display text-sm sm:text-base font-black tracking-tight text-[#111827] tabular-nums">
                        {formatCop(rubroSeleccionado.monto)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fila Inferior de 3 Porcentajes con Barras (Estilo 39% Replaced | 41% Damaged | 20% Original) */}
                <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#9CA3AF]/25 pt-3.5">
                  <div>
                    <span className="font-display text-sm font-black text-[#111827] tabular-nums">
                      {pctAbonado}%
                    </span>
                    <span className="block text-[10px] text-[#4B5563]">
                      Abonado
                    </span>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EDEDED]">
                      <div
                        className="h-full rounded-full bg-[#111827]"
                        style={{ width: `${pctAbonado}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="font-display text-sm font-black text-[#111827] tabular-nums">
                      {pctSaldo}%
                    </span>
                    <span className="block text-[10px] text-[#4B5563]">
                      Saldo patio
                    </span>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EDEDED]">
                      <div
                        className="h-full rounded-full bg-[#4B5563]"
                        style={{ width: `${pctSaldo}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="font-display text-sm font-black text-[#111827] tabular-nums">
                      100%
                    </span>
                    <span className="block text-[10px] text-[#4B5563]">
                      Garantía R2
                    </span>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#EDEDED]">
                      <div className="h-full w-full rounded-full bg-[#1F2937]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tarjeta Compacta de Barra de Trazos Verticales (Estilo "Repairs Performed" Pantalla 3) */}
            <div className="rounded-[24px] bg-white border border-[#9CA3AF]/40 p-4 shadow-2xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EDEDED] font-mono text-[11px] font-bold text-[#111827]">
                  1
                </span>
                <div className="min-w-0">
                  <p className="font-display text-sm font-black text-[#111827] tabular-nums">
                    {formatCop(vehiculo.precioDia)} / día
                  </p>
                  <p className="text-[11px] text-[#4B5563] truncate">
                    Tarifa base contratada · { specsBento.paqueteEstilo }
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0">
                <div
                  aria-hidden="true"
                  className="flex items-center gap-[2px] h-3"
                >
                  {Array.from({ length: 18 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-[2px] rounded-full ${
                        i < 14 ? 'h-3 bg-[#111827]' : 'h-2 bg-[#9CA3AF]/50'
                      }`}
                    />
                  ))}
                </div>
                <span className="mt-1 font-display text-xs font-black text-[#111827] tabular-nums">
                  {pctAbonado}%{' '}
                  <span className="font-normal text-[10px] text-[#4B5563]">
                    Cubierto
                  </span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            MODO 2: INSPECCIÓN PERICIAL R2 Y BARRA DE CONFIANZA (Pantalla 2 Ref.)
            ------------------------------------------------------------------- */}
        {tabActiva === 'INSPECCION' && (
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-4 sm:p-5 shadow-xs space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base sm:text-lg font-black text-[#111827]">
                  Inspección Pericial Cloudflare R2
                </h2>
                <p className="text-xs text-[#4B5563]">
                  Toca los puntos sobre el vehículo o en la lista para ver el dictamen
                </p>
              </div>
              <span className="rounded-full bg-[#111827] px-3 py-1 font-mono text-[10px] font-bold text-white">
                {vehiculo.placa}
              </span>
            </div>

            {/* Lista de Puntos Verificados */}
            <div className="space-y-2">
              {puntosR2.map((punto) => {
                const activo = puntoSeleccionado.id === punto.id;
                return (
                  <button
                    key={punto.id}
                    type="button"
                    onClick={() => setPuntoActivoId(punto.id)}
                    className={`ios-press-bounce w-full rounded-[20px] p-3.5 text-left transition-colors cursor-pointer border ${
                      activo
                        ? 'bg-[#111827] text-white border-[#111827]'
                        : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-xs sm:text-sm font-bold">
                        {punto.zona}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          activo
                            ? 'bg-white text-[#111827]'
                            : 'bg-white text-[#111827] border border-[#9CA3AF]/40'
                        }`}
                      >
                        {punto.etiqueta}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-[11px] ${
                        activo ? 'text-[#EDEDED]' : 'text-[#4B5563]'
                      }`}
                    >
                      {punto.dictamen}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Barra de Trazos Verticales (Estilo "Seller's Description: 2 deals | 0 reviews | Confidence Level") */}
            <div className="border-t border-[#9CA3AF]/25 pt-3.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                <span>{puntosR2.length} verificaciones R2</span>
                <span>0 novedades en entrega</span>
              </div>

              <div
                aria-hidden="true"
                className="mt-2 flex items-center justify-between gap-[2px] h-3.5"
              >
                {Array.from({ length: TOTAL_TICKS_BARRA }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`flex-1 rounded-full ${
                      idx < ticksActivos
                        ? 'h-3.5 bg-[#111827]'
                        : 'h-2.5 bg-[#9CA3AF]/45'
                    }`}
                  />
                ))}
              </div>

              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#4B5563]">
                <span>Nivel de confianza pericial</span>
                <span className="font-semibold text-[#111827]">
                  100% Verificado en Patio
                </span>
              </div>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------
            MODO 3: FEATURE HIGHLIGHTS BENTO 2x2 (Pantalla 1 Referencia 1)
            ------------------------------------------------------------------- */}
        {tabActiva === 'HIGHLIGHTS' && (
          <div className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-4 sm:p-5 shadow-xs space-y-3 animate-fade-up">
            {/* Tarjeta Superior Ancho Completo: Passenger Capacity */}
            <div className="rounded-[22px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-medium text-[#4B5563]">
                  Passenger
                </span>
                <span className="font-display text-base font-black text-[#111827]">
                  capacity
                </span>
                <span className="mt-1 inline-block rounded-full bg-white border border-[#9CA3AF]/45 px-2.5 py-0.5 text-[10px] font-bold text-[#111827]">
                  {specsBento.carroceriaTag}
                </span>
              </div>

              <div className="relative h-22 w-40 sm:w-48 shrink-0 overflow-hidden rounded-[16px] bg-[#1F2937]">
                <img
                  src={vehiculo.imagenUrl}
                  alt={vehiculo.modelo}
                  className="h-full w-full object-cover object-center opacity-85"
                />
                <div className="absolute left-2 top-2 flex h-9 min-w-[40px] items-center justify-center rounded-[12px] bg-[#EDEDED]/95 px-2.5 font-display text-base font-black text-[#111827]">
                  {vehiculo.capacidadPasajeros}
                </div>
              </div>
            </div>

            {/* Grid 2x2: Engine, Power, Transmisión con Píldora Negra, Accel */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-[22px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 flex flex-col justify-between min-h-[124px]">
                <span className="text-[11px] font-semibold text-[#4B5563]">
                  Engine · Propulsión
                </span>
                <div className="mt-2">
                  <span className="block text-[10px] text-[#4B5563]">
                    {specsBento.motorSubtitulo}
                  </span>
                  <p className="mt-0.5 font-display text-xs sm:text-sm font-black text-[#111827] leading-snug">
                    {specsBento.motorDetalle}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 flex flex-col justify-between min-h-[124px]">
                <span className="text-[11px] font-semibold text-[#4B5563]">
                  Power · Potencia
                </span>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl font-black text-[#111827] tabular-nums">
                      {potenciaValor}
                    </span>
                    <span className="font-display text-sm font-bold text-[#4B5563]">
                      {potenciaUnidad}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#4B5563]">
                    {specsBento.rangoRpm}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 flex flex-col justify-between min-h-[132px]">
                <span className="text-[11px] font-semibold text-[#4B5563]">
                  Transmisión {vehiculo.transmision.toLowerCase()}
                </span>
                <div className="mt-2 rounded-[14px] bg-[#111827] px-3 py-2 text-white">
                  <p className="font-display text-[11px] font-bold leading-tight">
                    {specsBento.transmisionBadge}
                  </p>
                </div>
              </div>

              <div className="rounded-[22px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-3.5 flex flex-col justify-between min-h-[132px]">
                <span className="text-[11px] font-semibold text-[#4B5563]">
                  Accel · Velocidad
                </span>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-2xl sm:text-3xl font-black text-[#111827] tabular-nums leading-none">
                      {acelValor}
                    </span>
                    <span className="font-display text-xs font-bold text-[#4B5563]">
                      {acelUnidad}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-[#111827]">
                    0-100 km/h · {vehiculo.velocidadMaxima}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
