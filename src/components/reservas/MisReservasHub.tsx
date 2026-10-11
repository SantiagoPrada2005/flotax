import { useEffect, useMemo, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  construirCalendarioSuizoReservas,
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
  const [fechaFiltroISO, setFechaFiltroISO] = useState<string | null>(null);

  const [anioHoy = 2026, mesHoyUno = 10] = hoyISO.split('-').map(Number);
  const [mesCursor, setMesCursor] = useState<{
    anio: number;
    mesIndexCero: number;
  }>({
    anio: anioHoy,
    mesIndexCero: mesHoyUno - 1,
  });

  // Sincronizar con localStorage al montar
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

  const fechaCabeceraISO =
    fechaFiltroISO ?? reservaActiva?.fechaInicio ?? hoyISO;

  const infoDiaCabecera = useMemo(
    () => obtenerInfoDiaFechaISO(fechaCabeceraISO),
    [fechaCabeceraISO]
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

  // Alquileres visibles en la Sección 2 (todos o filtrados por el día tocado)
  const alquileresMostrados = useMemo(() => {
    if (!fechaFiltroISO) return reservas;
    return reservas.filter(
      (r) => fechaFiltroISO >= r.fechaInicio && fechaFiltroISO <= r.fechaFin
    );
  }, [reservas, fechaFiltroISO]);

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

  const manejarToqueDia = (celda: CeldaCalendarioSuizo) => {
    if (!celda.esMesActual) {
      const [y = 2026, m = 10] = celda.fechaISO.split('-').map(Number);
      setMesCursor({ anio: y, mesIndexCero: m - 1 });
    }

    const reservaEnFecha = reservas.find(
      (r) => celda.fechaISO >= r.fechaInicio && celda.fechaISO <= r.fechaFin
    );
    if (reservaEnFecha) {
      setCodigoActivo(reservaEnFecha.codigo);
    }

    setFechaFiltroISO((prev) =>
      prev === celda.fechaISO ? null : celda.fechaISO
    );
  };

  const seleccionarAlquilerDeLista = (reserva: ReservaClienteItem) => {
    setCodigoActivo(reserva.codigo);
    setFechaFiltroISO(null);
    const [y = 2026, m = 10] = reserva.fechaInicio.split('-').map(Number);
    setMesCursor({ anio: y, mesIndexCero: m - 1 });
  };

  return (
    <div className="space-y-4 pb-4">
      {/* =====================================================================
          SECCIÓN 1: EL CALENDARIO (Diseño Editorial Suizo Compacto)
          ===================================================================== */}
      <section
        aria-label="Calendario de reservas"
        className="rounded-[28px] bg-white border border-[#9CA3AF]/40 p-4 sm:p-5 shadow-xs"
      >
        {/* Cabecera Suiza: Número Gigante + Mes/Año + Controles de Mes */}
        <div className="flex items-end justify-between gap-2 border-b border-[#9CA3AF]/25 pb-3">
          <div className="flex items-baseline gap-3">
            <span
              key={infoDiaCabecera.numeroDia}
              className="animate-zoom-in font-display text-[3.5rem] sm:text-[4rem] font-black leading-[0.82] tracking-tighter text-[#111827] tabular-nums select-none"
            >
              {infoDiaCabecera.numeroDia}
            </span>

            <div>
              <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#111827] uppercase leading-none">
                {calendario.nombreMes}
              </h1>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="font-display text-sm font-medium text-[#4B5563] tabular-nums">
                  {calendario.anio}
                </span>
                <span className="text-[#9CA3AF]">·</span>
                <span className="font-display text-xs font-bold uppercase text-[#4B5563]">
                  {infoDiaCabecera.diaSemanaCorto}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => cambiarMes(-1)}
              aria-label="Mes anterior"
              className="ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/45 text-[#111827] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-4 w-4"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => cambiarMes(1)}
              aria-label="Mes siguiente"
              className="ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/45 text-[#111827] cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                className="h-4 w-4"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Encabezados de Semana (Lu Ma Mi Ju Vi Sá Do) */}
        <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
          {ENCABEZADOS_SEMANA_EDITORIAL.map((dia) => (
            <div
              key={dia.corto}
              className="py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#4B5563]"
            >
              {dia.corto.slice(0, 2)}
            </div>
          ))}
        </div>

        {/* Matriz Circular de 7 Columnas */}
        <div
          key={`${calendario.anio}-${calendario.mesIndexCero}`}
          className="mt-1 grid grid-cols-7 gap-y-1.5 gap-x-1 sm:gap-2 animate-fade-in"
        >
          {calendario.celdas.map((celda) => {
            const esDiaFiltrado = celda.fechaISO === fechaFiltroISO;
            const enAlgunAlquiler = reservas.some(
              (r) =>
                celda.fechaISO >= r.fechaInicio && celda.fechaISO <= r.fechaFin
            );

            let clasesCirculo = '';
            if (!celda.esMesActual) {
              clasesCirculo =
                'bg-transparent border border-[#9CA3AF]/40 text-[#9CA3AF] font-normal opacity-65';
            } else if (esDiaFiltrado) {
              clasesCirculo =
                'bg-[#1F2937] text-white font-black ring-2 ring-[#111827] ring-offset-2 ring-offset-white shadow-sm z-10';
            } else if (celda.enReservaActiva) {
              clasesCirculo = 'bg-[#111827] text-white font-bold shadow-2xs';
            } else if (enAlgunAlquiler) {
              clasesCirculo =
                'bg-white text-[#111827] border-2 border-[#111827] font-bold';
            } else {
              clasesCirculo =
                'bg-[#EDEDED] text-[#111827] font-medium hover:border hover:border-[#9CA3AF]';
            }

            return (
              <div
                key={celda.fechaISO}
                className="flex items-center justify-center h-10 w-full"
              >
                <button
                  type="button"
                  onClick={() => manejarToqueDia(celda)}
                  aria-label={`${celda.numeroDia} de ${calendario.nombreMesCapitalizado}`}
                  aria-pressed={esDiaFiltrado || celda.enReservaActiva}
                  className={`ios-press-bounce flex h-10 w-10 flex-col items-center justify-center rounded-full text-xs tabular-nums select-none cursor-pointer ${clasesCirculo}`}
                >
                  <span>{celda.numeroDia}</span>
                  {(celda.esHoy ||
                    celda.esInicioReservaActiva ||
                    celda.esFinReservaActiva) && (
                    <span
                      className={`h-1 w-1 rounded-full ${
                        esDiaFiltrado || celda.enReservaActiva
                          ? 'bg-white'
                          : 'bg-[#111827]'
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 2: EL LISTADO DE ALQUILERES
          ===================================================================== */}
      <section aria-label="Listado de alquileres" className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="border-l-[3px] border-[#111827] pl-3">
            <span className="block text-[10px] font-black uppercase tracking-wider text-[#4B5563]">
              {fechaFiltroISO
                ? `FILTRADO · ${infoDiaCabecera.numeroDia} ${infoDiaCabecera.mesNombre.toUpperCase()}`
                : 'HISTORIAL Y ACTIVOS'}
            </span>
            <h2 className="font-display text-lg font-black tracking-tight text-[#111827] leading-tight">
              Mis Alquileres ({alquileresMostrados.length})
            </h2>
          </div>

          {fechaFiltroISO && (
            <button
              type="button"
              onClick={() => setFechaFiltroISO(null)}
              className="ios-press-bounce min-h-[38px] rounded-full bg-[#111827] px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer"
            >
              Ver todos
            </button>
          )}
        </div>

        {/* Filas de Alquileres con Botón Circular Negro ↗ a la Vista Dedicada */}
        {alquileresMostrados.length > 0 ? (
          <div className="space-y-2.5">
            {alquileresMostrados.map((item) => {
              const esActiva = reservaActiva?.codigo === item.codigo;
              return (
                <div
                  key={item.codigo}
                  className={`w-full rounded-[22px] p-3 transition-colors border flex items-center gap-3 min-w-0 animate-fade-up ${
                    esActiva
                      ? 'bg-white border-[#111827] ring-1 ring-[#111827] shadow-xs'
                      : 'bg-white/90 border-[#9CA3AF]/40 hover:border-[#111827]'
                  }`}
                >
                  {/* Cuerpo seleccionable para enfocar fechas en el calendario */}
                  <button
                    type="button"
                    onClick={() => seleccionarAlquilerDeLista(item)}
                    className="flex flex-1 items-center gap-3 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex h-13 w-18 shrink-0 items-center justify-center rounded-[14px] bg-[#EDEDED] p-1.5">
                      <img
                        src={item.vehiculo.imagenUrl}
                        alt={`${item.vehiculo.marca} ${item.vehiculo.modelo}`}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-semibold text-[#4B5563] truncate">
                          {formatearRangoReservaHumano(
                            item.fechaInicio,
                            item.fechaFin
                          )}{' '}
                          · {item.diasAlquiler}d
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.estado === 'EN_CURSO'
                              ? 'bg-[#111827] text-white'
                              : 'bg-[#EDEDED] text-[#111827]'
                          }`}
                        >
                          {ETIQUETA_ESTADO[item.estado]}
                        </span>
                      </div>

                      <h3 className="mt-0.5 font-display text-sm font-black tracking-tight text-[#111827] uppercase truncate">
                        {item.vehiculo.marca} {item.vehiculo.modelo}
                      </h3>

                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#4B5563]">
                        <span className="font-mono font-semibold text-[#111827]">
                          {item.vehiculo.placa}
                        </span>
                        <span>·</span>
                        <span className="font-display font-bold text-[#111827] tabular-nums">
                          {formatCop(item.totalAlquiler)}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Botón Circular Negro ↗ para abrir la Vista Dedicada del Alquiler (Estilo Ref. Pantalla 1) */}
                  <button
                    type="button"
                    onClick={() => navigate(`/reservas/${item.codigo}`)}
                    aria-label={`Ver detalle del alquiler ${item.codigo}`}
                    title="Abrir inspección y detalle del alquiler"
                    className="ios-press-bounce flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#111827] text-white shadow-2xs hover:bg-[#1F2937] cursor-pointer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.3"
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
          <div className="rounded-[22px] bg-white border border-[#9CA3AF]/40 p-5 text-center space-y-2.5">
            <p className="text-xs font-bold text-[#111827]">
              No tienes alquileres activos en esta fecha
            </p>
            {fechaFiltroISO && (
              <button
                type="button"
                onClick={() => setFechaFiltroISO(null)}
                className="ios-press-bounce min-h-[38px] rounded-full bg-[#111827] px-4 py-1.5 text-xs font-bold text-white cursor-pointer"
              >
                Mostrar todos los alquileres
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
