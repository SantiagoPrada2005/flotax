import { useEffect, useMemo, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  construirCalendarioSuizoReservas,
  formatearFechaCorta,
  formatearRangoReservaHumano,
  hidratarReservasCliente,
  obtenerInfoDiaFechaISO,
  obtenerReservasSemillaCliente,
  type CeldaCalendarioSuizo,
  type EstadoReservaCliente,
  type ReservaClienteItem,
} from '@/lib/flota';

export interface MisReservasHubProps {
  hoyISO: string;
}

const STORAGE_KEY_RESERVAS = 'flotax_reservas_cliente';

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

const ETIQUETA_ESTADO: Readonly<Record<EstadoReservaCliente, string>> = {
  EN_CURSO: 'En curso',
  CONFIRMADA: 'Confirmada',
  PENDIENTE: 'Pendiente',
  COMPLETADA: 'Completada',
};

export default function MisReservasHub({ hoyISO }: MisReservasHubProps) {
  const [reservas, setReservas] = useState<ReservaClienteItem[]>(() =>
    obtenerReservasSemillaCliente(hoyISO)
  );
  const [codigoActivo, setCodigoActivo] = useState<string>('');
  const [filtroInicioISO, setFiltroInicioISO] = useState<string | null>(null);
  const [filtroFinISO, setFiltroFinISO] = useState<string | null>(null);

  const [anioHoy = 2026, mesHoyUno = 10] = hoyISO.split('-').map(Number);
  const [mesCursor, setMesCursor] = useState<{
    anio: number;
    mesIndexCero: number;
  }>({
    anio: anioHoy,
    mesIndexCero: mesHoyUno - 1,
  });

  useEffect(() => {
    try {
      const rawReservas = window.localStorage.getItem(STORAGE_KEY_RESERVAS);
      const hidratadas = hidratarReservasCliente(rawReservas, null, hoyISO);
      setReservas(hidratadas);
      if (hidratadas[0]) {
        setCodigoActivo(hidratadas[0].codigo);
      }
    } catch {
      // Fallback a semillas por defecto
    }
  }, [hoyISO]);

  const reservaActiva = useMemo(() => {
    if (reservas.length === 0) return null;
    return (
      reservas.find((r) => r.codigo === codigoActivo) ?? reservas[0] ?? null
    );
  }, [reservas, codigoActivo]);

  const hayFiltroActivo = filtroInicioISO !== null;
  const finFiltroEfectivo = filtroFinISO ?? filtroInicioISO;

  const fechaCabeceraISO =
    filtroInicioISO ?? reservaActiva?.fechaInicio ?? hoyISO;

  const infoDiaCabecera = useMemo(
    () => obtenerInfoDiaFechaISO(fechaCabeceraISO),
    [fechaCabeceraISO]
  );

  const infoDiaFinFiltro = useMemo(
    () => (filtroFinISO ? obtenerInfoDiaFechaISO(filtroFinISO) : null),
    [filtroFinISO]
  );

  const calendario = useMemo(
    () =>
      construirCalendarioSuizoReservas(
        mesCursor.anio,
        mesCursor.mesIndexCero,
        reservaActiva,
        reservas,
        hoyISO
      ),
    [mesCursor.anio, mesCursor.mesIndexCero, reservaActiva, reservas, hoyISO]
  );

  const alquileresMostrados = useMemo(() => {
    if (!filtroInicioISO) return reservas;
    const fin = filtroFinISO ?? filtroInicioISO;
    return reservas.filter(
      (r) => r.fechaInicio <= fin && r.fechaFin >= filtroInicioISO
    );
  }, [reservas, filtroInicioISO, filtroFinISO]);

  const cambiarMes = (delta: number) => {
    setMesCursor((prev) => {
      const dt = new Date(
        Date.UTC(prev.anio, prev.mesIndexCero + delta, 1, 12, 0, 0)
      );
      return {
        anio: dt.getUTCFullYear(),
        mesIndexCero: dt.getUTCMonth(),
      };
    });
  };

  const limpiarFiltro = () => {
    setFiltroInicioISO(null);
    setFiltroFinISO(null);
  };

  const manejarToqueDia = (celda: CeldaCalendarioSuizo) => {
    if (!celda.esMesActual) {
      const [y = 2026, m = 10] = celda.fechaISO.split('-').map(Number);
      setMesCursor({ anio: y, mesIndexCero: m - 1 });
    }

    const fechaTocada = celda.fechaISO;

    // Paso 1: Si no hay inicio o ya había un rango completo, iniciar nueva selección
    if (!filtroInicioISO || filtroFinISO !== null) {
      setFiltroInicioISO(fechaTocada);
      setFiltroFinISO(null);
      return;
    }

    // Si toca el mismo día de inicio estando pendiente el fin, limpia el filtro
    if (fechaTocada === filtroInicioISO) {
      setFiltroInicioISO(null);
      setFiltroFinISO(null);
      return;
    }

    // Paso 2: Completar el rango ordenando inicio y fin cronológicamente
    if (fechaTocada < filtroInicioISO) {
      setFiltroFinISO(filtroInicioISO);
      setFiltroInicioISO(fechaTocada);
    } else {
      setFiltroFinISO(fechaTocada);
    }
  };

  const seleccionarAlquilerDeLista = (reserva: ReservaClienteItem) => {
    setCodigoActivo(reserva.codigo);
    limpiarFiltro();
    const [y = 2026, m = 10] = reserva.fechaInicio.split('-').map(Number);
    setMesCursor({ anio: y, mesIndexCero: m - 1 });
  };

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col justify-between pb-2">
      {/* =====================================================================
          SECCIÓN 1: SUPERFICIE SUPERIOR DE CALENDARIO (Sin bordes de card,
          integrada al viewport móvil estilo Mobile Calendar Ref.)
          ===================================================================== */}
      <section
        aria-label="Calendario de reservas"
        className="rounded-b-[34px] sm:rounded-[34px] bg-white px-5 pt-3.5 pb-3.5 shadow-[0_10px_28px_-16px_rgba(17,24,39,0.06)]"
      >
        {/* Barra Superior: Píldora Suave de Mes + Controles Limpios */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDEDED]/80 px-3.5 py-2 text-xs font-semibold text-[#111827]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              className="h-4 w-4 text-[#4B5563]"
            >
              <rect width="18" height="18" x="3" y="4" rx="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            <span>
              {calendario.nombreMesCapitalizado} {calendario.anio}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full text-[#111827] hover:bg-[#EDEDED]/70 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              className="ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full text-[#111827] hover:bg-[#EDEDED]/70 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Encabezados de Semana Limpios (Lu Ma Mi Ju Vi Sá Do) */}
        <div className="mt-3 grid grid-cols-7 text-center">
          {ENCABEZADOS_SEMANA_EDITORIAL.map((dia) => (
            <div
              key={dia.corto}
              className="py-1 text-[11px] font-medium text-[#9CA3AF]"
            >
              {dia.corto.slice(0, 2)}
            </div>
          ))}
        </div>

        {/* Matriz Circular de 7 Columnas (Cero bordes pesados, lectura descansada) */}
        <div
          key={`${calendario.anio}-${calendario.mesIndexCero}`}
          className="mt-1 grid grid-cols-7 gap-y-1.5 animate-fade-in"
        >
          {calendario.celdas.map((celda) => {
            const esInicioFiltro = Boolean(
              filtroInicioISO && celda.fechaISO === filtroInicioISO
            );
            const esFinFiltro = Boolean(
              finFiltroEfectivo && celda.fechaISO === finFiltroEfectivo
            );
            const enRangoFiltro = Boolean(
              filtroInicioISO &&
                finFiltroEfectivo &&
                celda.fechaISO >= filtroInicioISO &&
                celda.fechaISO <= finFiltroEfectivo
            );
            const esIntermedioFiltro =
              enRangoFiltro && !esInicioFiltro && !esFinFiltro;

            const enAlgunAlquiler = reservas.some(
              (r) =>
                celda.fechaISO >= r.fechaInicio && celda.fechaISO <= r.fechaFin
            );

            let clasesCirculo = '';
            if (!celda.esMesActual) {
              // Días fuera de mes sin fondo circular para evitar fatiga visual
              clasesCirculo = enRangoFiltro
                ? 'bg-[#1F2937]/75 text-white font-semibold'
                : 'bg-transparent text-[#9CA3AF]/55 font-normal';
            } else if (esInicioFiltro || esFinFiltro) {
              // Extremos del filtro (Inicio / Fin): tono más oscuro de la paleta
              clasesCirculo =
                'bg-[#111827] text-white font-bold shadow-xs ring-2 ring-[#111827] ring-offset-1 ring-offset-white z-10';
            } else if (esIntermedioFiltro) {
              // Días intermedios dentro del rango filtrado
              clasesCirculo = 'bg-[#1F2937] text-white font-semibold z-10';
            } else if (enAlgunAlquiler) {
              // Días con alquiler de vehículo: tono más claro que el filtro
              clasesCirculo = celda.enReservaActiva
                ? 'bg-[#9CA3AF]/60 text-[#111827] font-bold ring-1.5 ring-[#4B5563]'
                : 'bg-[#9CA3AF]/45 text-[#111827] font-semibold ring-1 ring-[#9CA3AF]';
            } else {
              // Días regulares sin alquiler
              clasesCirculo =
                'bg-[#EDEDED]/65 text-[#4B5563] font-medium hover:bg-[#EDEDED]';
            }

            return (
              <div
                key={celda.fechaISO}
                className="relative flex items-center justify-center h-10 w-full"
              >
                {enRangoFiltro &&
                  filtroInicioISO &&
                  finFiltroEfectivo &&
                  filtroInicioISO !== finFiltroEfectivo && (
                    <div
                      aria-hidden="true"
                      className={`absolute inset-y-1 bg-[#111827]/12 ${
                        esInicioFiltro
                          ? 'left-1/2 right-0 rounded-l-full'
                          : esFinFiltro
                          ? 'left-0 right-1/2 rounded-r-full'
                          : 'inset-x-0'
                      }`}
                    />
                  )}

                <button
                  type="button"
                  onClick={() => manejarToqueDia(celda)}
                  aria-label={`${celda.numeroDia} de ${calendario.nombreMesCapitalizado}${
                    enAlgunAlquiler ? ' (Día con alquiler)' : ''
                  }`}
                  aria-pressed={enRangoFiltro}
                  className={`ios-press-bounce relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-xs tabular-nums select-none cursor-pointer transition-colors ${clasesCirculo}`}
                >
                  <span>{celda.numeroDia}</span>
                  {enAlgunAlquiler && (
                    <span
                      aria-hidden="true"
                      className={`h-1 w-1 rounded-full ${
                        enRangoFiltro ? 'bg-white/85' : 'bg-[#4B5563]'
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Leyenda compacta + Estado del filtro de doble selección */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EDEDED] pt-2.5 text-[11px] font-medium text-[#4B5563]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]/60 ring-1 ring-[#4B5563]" />
              <span>Con alquiler</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827]" />
              <span>Filtro</span>
            </span>
          </div>

          <span className="text-[11px] font-semibold text-[#111827] tabular-nums">
            {!filtroInicioISO
              ? 'Toca inicio y fin para filtrar'
              : !filtroFinISO
              ? `Desde ${formatearFechaCorta(filtroInicioISO)} · Toca día final`
              : `${formatearFechaCorta(filtroInicioISO)} – ${formatearFechaCorta(filtroFinISO)}`}
          </span>
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 2: AGENDA DE ALQUILERES SOBRE EL LIENZO MÓVIL
          (Sin contenedor card envolvente, filas planas sin bordes)
          ===================================================================== */}
      <section
        aria-label="Listado de alquileres"
        className="flex-1 px-5 pt-5 space-y-3.5"
      >
        {/* Cabecera Editorial: Día / Rango Grande + Conteo + Píldora "Ver todos" */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="border-l-2 border-[#9CA3AF]/60 pl-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                {hayFiltroActivo ? 'FILTRO' : 'AGENDA'}
              </span>
              <span
                key={`${infoDiaCabecera.numeroDia}-${infoDiaFinFiltro?.numeroDia ?? ''}`}
                className="block font-display text-2xl font-black leading-none text-[#111827] tabular-nums"
              >
                {infoDiaFinFiltro
                  ? `${infoDiaCabecera.numeroDia}–${infoDiaFinFiltro.numeroDia}`
                  : infoDiaCabecera.numeroDia}
              </span>
              <span className="block text-[11px] font-medium text-[#4B5563]">
                {infoDiaFinFiltro
                  ? `${infoDiaCabecera.diaSemanaCorto} – ${infoDiaFinFiltro.diaSemanaCorto}`
                  : infoDiaCabecera.diaSemanaCorto}
              </span>
            </div>

            <p className="text-xs font-medium text-[#4B5563]">
              {alquileresMostrados.length}{' '}
              {alquileresMostrados.length === 1
                ? 'alquiler programado'
                : 'alquileres en lista'}
            </p>
          </div>

          {hayFiltroActivo && (
            <button
              type="button"
              onClick={limpiarFiltro}
              className="ios-press-bounce rounded-full bg-[#111827] px-3.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
            >
              Ver todos
            </button>
          )}
        </div>

        {/* Filas Planas de Alquiler (Sin bordes ni cajas anidadas) */}
        {alquileresMostrados.length > 0 ? (
          <div className="space-y-2.5">
            {alquileresMostrados.map((item) => {
              const esActiva = reservaActiva?.codigo === item.codigo;
              return (
                <div
                  key={item.codigo}
                  className={`w-full rounded-[22px] px-4 py-3.5 transition-colors flex items-center justify-between gap-3 min-w-0 animate-fade-up ${
                    esActiva ? 'bg-white' : 'bg-white/65 hover:bg-white'
                  }`}
                >
                  {/* Selección de fila para enfocar días en el calendario */}
                  <button
                    type="button"
                    onClick={() => seleccionarAlquilerDeLista(item)}
                    className="flex flex-1 items-center justify-between gap-2 min-w-0 text-left cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-[#4B5563]">
                        <span className="tabular-nums">
                          {formatearRangoReservaHumano(
                            item.fechaInicio,
                            item.fechaFin
                          )}
                        </span>
                        <span>·</span>
                        <span className="text-[#111827] font-semibold">
                          {ETIQUETA_ESTADO[item.estado]}
                        </span>
                      </div>

                      <h3 className="mt-0.5 font-display text-sm font-extrabold tracking-tight text-[#111827] uppercase truncate">
                        {item.vehiculo.marca} {item.vehiculo.modelo}
                      </h3>

                      <p className="mt-0.5 text-[11px] text-[#4B5563] tabular-nums">
                        {item.vehiculo.placa} · {formatCop(item.totalAlquiler)}
                      </p>
                    </div>

                    {/* Silueta limpia sin recuadro gris anidado */}
                    <img
                      src={item.vehiculo.imagenUrl}
                      alt={`${item.vehiculo.marca} ${item.vehiculo.modelo}`}
                      className="h-11 w-16 shrink-0 object-contain"
                    />
                  </button>

                  {/* Botón Circular Negro ↗ hacia la Vista Dedicada */}
                  <button
                    type="button"
                    onClick={() => navigate(`/reservas/${item.codigo}`)}
                    aria-label={`Abrir alquiler ${item.codigo}`}
                    className="ios-press-bounce flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white hover:bg-[#1F2937] cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      className="h-4 w-4"
                    >
                      <path d="M7 17 17 7" />
                      <path d="M7 7h10v10" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[22px] bg-white/70 px-4 py-5 text-center space-y-2">
            <p className="text-xs font-medium text-[#4B5563]">
              {filtroFinISO
                ? 'Sin alquileres en este rango de fechas'
                : 'Sin alquileres en este día'}
            </p>
            {hayFiltroActivo && (
              <button
                type="button"
                onClick={limpiarFiltro}
                className="ios-press-bounce rounded-full bg-[#111827] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
              >
                Ver todos
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
