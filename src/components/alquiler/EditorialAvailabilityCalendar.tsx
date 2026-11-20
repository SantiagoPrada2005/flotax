import { useMemo, useState } from 'react';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  calcularDiasInclusivos,
  construirCalendarioMes,
  esRangoDisponibleValido,
  formatearFechaCorta,
  obtenerDiaSemanaEditorial,
  type BloqueNoDisponible,
  type DiaCalendarioItem,
  type FranjaDisponible,
  type VehiculoItem,
} from '@/lib/flota';

export interface EditorialAvailabilityCalendarProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  onChangeRango: (inicio: string | null, fin: string | null) => void;
  bloquesPrecalculados?: BloqueNoDisponible[] | undefined;
}

export default function EditorialAvailabilityCalendar({
  vehiculo,
  hoyISO,
  fechaInicio,
  fechaFin,
  onChangeRango,
  bloquesPrecalculados,
}: EditorialAvailabilityCalendarProps) {
  const [anioInicial = 2026, mesInicialUno = 10] = hoyISO.split('-').map(Number);

  const [mesCursor, setMesCursor] = useState<{ anio: number; mesIndexCero: number }>({
    anio: anioInicial,
    mesIndexCero: mesInicialUno - 1,
  });

  const [faseSeleccion, setFaseSeleccion] = useState<'ELIGIENDO_FIN' | 'COMPLETO'>(
    fechaInicio && fechaFin && fechaInicio !== fechaFin ? 'COMPLETO' : 'ELIGIENDO_FIN'
  );

  const [avisoFranja, setAvisoFranja] = useState<string | null>(null);

  const calendarioMes = useMemo(
    () =>
      construirCalendarioMes(
        vehiculo.id,
        mesCursor.anio,
        mesCursor.mesIndexCero,
        hoyISO,
        bloquesPrecalculados
      ),
    [vehiculo.id, mesCursor.anio, mesCursor.mesIndexCero, hoyISO, bloquesPrecalculados]
  );

  const franjaActivaId = useMemo(() => {
    if (!fechaInicio) return undefined;
    const diaEnMesActual = calendarioMes.dias.find((d) => d.fechaISO === fechaInicio);
    if (diaEnMesActual?.franjaId) return diaEnMesActual.franjaId;

    const [y = 2026, m = 10] = fechaInicio.split('-').map(Number);
    const calInicio = construirCalendarioMes(vehiculo.id, y, m - 1, hoyISO, bloquesPrecalculados);
    return calInicio.dias.find((d) => d.fechaISO === fechaInicio)?.franjaId;
  }, [fechaInicio, calendarioMes.dias, vehiculo.id, hoyISO, bloquesPrecalculados]);

  const diasSeleccionados = useMemo(() => {
    if (!fechaInicio) return 0;
    const fin = fechaFin ?? fechaInicio;
    return calcularDiasInclusivos(fechaInicio, fin);
  }, [fechaInicio, fechaFin]);

  const codigoDiaEditorial = useMemo(() => {
    if (!fechaInicio) {
      return obtenerDiaSemanaEditorial(hoyISO);
    }
    const d1 = obtenerDiaSemanaEditorial(fechaInicio);
    if (!fechaFin || fechaFin === fechaInicio) {
      return d1;
    }
    const d2 = obtenerDiaSemanaEditorial(fechaFin);
    return `${d1} — ${d2}`;
  }, [fechaInicio, fechaFin, hoyISO]);

  const cambiarMes = (delta: number) => {
    setMesCursor((prev) => {
      const nuevoDate = new Date(Date.UTC(prev.anio, prev.mesIndexCero + delta, 1, 12, 0, 0));
      return {
        anio: nuevoDate.getUTCFullYear(),
        mesIndexCero: nuevoDate.getUTCMonth(),
      };
    });
  };

  const puedeIrMesAnterior =
    mesCursor.anio > anioInicial ||
    (mesCursor.anio === anioInicial && mesCursor.mesIndexCero > mesInicialUno - 1);

  const manejarToqueDia = (dia: DiaCalendarioItem) => {
    if (dia.estado !== 'DISPONIBLE') {
      if (dia.etiquetaBloqueo) {
        setAvisoFranja(
          dia.estado === 'NO_DISPONIBLE'
            ? dia.etiquetaBloqueo
            : `Ocupado: ${dia.etiquetaBloqueo}`
        );
      } else if (dia.estado === 'NO_DISPONIBLE') {
        setAvisoFranja('Vehículo no disponible en esta fecha');
      }
      return;
    }

    setAvisoFranja(null);

    if (!fechaInicio || faseSeleccion === 'COMPLETO') {
      onChangeRango(dia.fechaISO, dia.fechaISO);
      setFaseSeleccion('ELIGIENDO_FIN');
      return;
    }

    if (dia.fechaISO < fechaInicio) {
      onChangeRango(dia.fechaISO, dia.fechaISO);
      setFaseSeleccion('ELIGIENDO_FIN');
      return;
    }

    const esContiguo = esRangoDisponibleValido(
      vehiculo.id,
      fechaInicio,
      dia.fechaISO,
      hoyISO,
      bloquesPrecalculados
    );

    if (!esContiguo) {
      onChangeRango(dia.fechaISO, dia.fechaISO);
      setFaseSeleccion('ELIGIENDO_FIN');
      setAvisoFranja('Nueva franja iniciada (había días reservados en medio).');
      return;
    }

    onChangeRango(fechaInicio, dia.fechaISO);
    setFaseSeleccion('COMPLETO');
  };

  const aplicarFranjaRapida = (franja: FranjaDisponible) => {
    setAvisoFranja(null);
    onChangeRango(franja.fechaInicio, franja.fechaFin);
    setFaseSeleccion('COMPLETO');
  };

  return (
    <section
      aria-label="Calendario de franjas disponibles"
      className="relative overflow-hidden rounded-[28px] bg-white border border-[#9CA3AF]/45 px-4 pt-4 pb-3.5 sm:p-6 shadow-xs dark:bg-[#1F2937] dark:border-white/12"
    >
      {/* 1. Cabecera del Selector de Fechas: Contador de Días + Rango */}
      <div className="flex items-center justify-between gap-3 border-b border-[#9CA3AF]/30 pb-3.5 dark:border-white/12">
        <div className="flex items-baseline gap-2.5">
          <span
            key={diasSeleccionados}
            className="animate-zoom-in font-display text-[3.25rem] sm:text-[3.75rem] font-black leading-[0.84] tracking-tighter text-[#111827] dark:text-[#EDEDED] tabular-nums select-none"
          >
            {diasSeleccionados > 0 ? diasSeleccionados : '—'}
          </span>

          <div className="flex flex-col">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#4B5563] dark:text-[#D1D5DB]">
              {diasSeleccionados === 1 ? 'Día elegido' : 'Días de alquiler'}
            </span>
            {fechaInicio ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#111827] px-2.5 py-0.5 text-[11px] font-bold text-white shadow-2xs dark:bg-[#EDEDED] dark:text-[#111827]">
                <span>{formatearFechaCorta(fechaInicio)}</span>
                <span className="opacity-70">→</span>
                <span>{formatearFechaCorta(fechaFin ?? fechaInicio)}</span>
              </span>
            ) : (
              <span className="mt-0.5 text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB]">
                Toca un día libre
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB]">
            Horario estándar
          </span>
          <span className="mt-0.5 block font-mono text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
            09:00 → 18:00
          </span>
        </div>
      </div>

      {/* 2. Barra Editorial: MES / AÑO + Día Semana + Controles de Mes */}
      <div className="mt-3 flex items-end justify-between border-b border-[#9CA3AF]/25 pb-2.5 dark:border-white/10">
        <div className="flex items-baseline gap-2">
          <h3 className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#111827] dark:text-[#EDEDED] leading-none">
            {calendarioMes.nombreMes}
          </h3>
          <span className="font-display text-base sm:text-lg font-medium tracking-tight text-[#4B5563] dark:text-[#D1D5DB] leading-none tabular-nums">
            {calendarioMes.anio}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-display text-xs sm:text-sm font-extrabold tracking-tight text-[#4B5563] dark:text-[#D1D5DB] uppercase mr-1">
            {codigoDiaEditorial}
          </span>

          <button
            type="button"
            onClick={() => cambiarMes(-1)}
            disabled={!puedeIrMesAnterior}
            aria-label="Mes anterior"
            className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/45 text-[#111827] disabled:opacity-30 disabled:pointer-events-none cursor-pointer dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]"
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
            className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED] border border-[#9CA3AF]/45 text-[#111827] cursor-pointer dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]"
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

      {/* 3. Píldoras de Franjas Disponibles */}
      {calendarioMes.franjasMes.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB] mr-1">
            Franjas:
          </span>
          {calendarioMes.franjasMes.map((franja) => {
            const franjaSeleccionada =
              fechaInicio === franja.fechaInicio &&
              (fechaFin ?? fechaInicio) === franja.fechaFin;
            return (
              <button
                key={franja.id}
                type="button"
                onClick={() => aplicarFranjaRapida(franja)}
                className={`fx-press shrink-0 min-h-[32px] rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer border ${
                  franjaSeleccionada
                    ? 'bg-[#111827] text-white border-[#111827] shadow-2xs dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/45 hover:border-[#111827] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:border-white/40'
                }`}
              >
                <span>{franja.etiquetaCorta}</span>
                <span
                  className={`ml-1 text-[10px] ${
                    franjaSeleccionada
                      ? 'text-[#EDEDED] dark:text-[#4B5563]'
                      : 'text-[#4B5563] dark:text-[#D1D5DB]'
                  }`}
                >
                  · {franja.diasDisponibles}d
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 4. Encabezados de Semana + Matriz Circular de 7 Columnas */}
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {ENCABEZADOS_SEMANA_EDITORIAL.map((dia) => (
          <div
            key={dia.corto}
            className="py-0.5 text-[10px] font-semibold tracking-tight text-[#4B5563] dark:text-[#D1D5DB]"
          >
            {dia.corto}
          </div>
        ))}
      </div>

      <div
        key={`${calendarioMes.anio}-${calendarioMes.mesIndexCero}`}
        className="mt-1 grid grid-cols-7 gap-y-1.5 gap-x-1.5 sm:gap-2 animate-fade-in"
      >
        {Array.from({ length: calendarioMes.celdasVaciasInicio }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-10 sm:h-11 w-full" aria-hidden="true" />
        ))}

        {calendarioMes.dias.map((dia) => {
          const finEfectivo = fechaFin ?? fechaInicio;
          const esInicio = Boolean(fechaInicio && dia.fechaISO === fechaInicio);
          const esFin = Boolean(finEfectivo && dia.fechaISO === finEfectivo);
          const enRango = Boolean(
            fechaInicio &&
              finEfectivo &&
              dia.fechaISO >= fechaInicio &&
              dia.fechaISO <= finEfectivo
          );
          const esIntermedio = enRango && !esInicio && !esFin;

          const perteneceAFranjaActiva =
            dia.estado === 'DISPONIBLE' &&
            (!franjaActivaId || dia.franjaId === franjaActivaId);

          let clasesCirculo = '';
          if (esInicio || esFin) {
            clasesCirculo =
              'bg-[#111827] text-white font-black shadow-md ring-2 ring-[#111827] ring-offset-1 ring-offset-white dark:bg-[#EDEDED] dark:text-[#111827] dark:ring-[#EDEDED] dark:ring-offset-[#1F2937] z-10';
          } else if (esIntermedio) {
            clasesCirculo =
              'bg-[#1F2937] text-white font-bold dark:bg-white/20 dark:text-[#EDEDED] z-10';
          } else if (dia.estado === 'DISPONIBLE') {
            if (perteneceAFranjaActiva) {
              clasesCirculo =
                'bg-[#EDEDED] text-[#111827] font-semibold border border-[#9CA3AF]/55 hover:border-[#111827] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/20 dark:hover:border-white/50';
            } else {
              clasesCirculo =
                'bg-[#EDEDED]/70 text-[#4B5563] font-medium border border-dashed border-[#9CA3AF]/55 hover:bg-[#EDEDED] dark:bg-[#111827]/60 dark:text-[#D1D5DB] dark:border-white/15 dark:hover:bg-[#111827]';
            }
          } else if (dia.estado === 'PASADO') {
            clasesCirculo =
              'bg-[#EDEDED]/40 text-[#9CA3AF] font-normal cursor-not-allowed opacity-55 dark:bg-white/5 dark:text-[#6B7280]';
          } else if (dia.estado === 'NO_DISPONIBLE') {
            clasesCirculo =
              'bg-[#1F2937]/15 text-[#4B5563] font-medium border border-[#4B5563]/50 cursor-not-allowed dark:bg-white/5 dark:text-[#9CA3AF] dark:border-white/10';
          } else {
            clasesCirculo =
              'bg-[#4B5563]/15 text-[#4B5563]/75 font-medium border border-[#9CA3AF]/35 cursor-not-allowed dark:bg-white/5 dark:text-[#9CA3AF] dark:border-white/10';
          }

          return (
            <div
              key={dia.fechaISO}
              className="relative flex items-center justify-center h-10 sm:h-11 w-full"
            >
              {enRango && fechaInicio !== finEfectivo && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-y-1 bg-[#111827]/12 dark:bg-white/12 ${
                    esInicio
                      ? 'left-1/2 right-0 rounded-l-full'
                      : esFin
                      ? 'left-0 right-1/2 rounded-r-full'
                      : 'inset-x-0'
                  }`}
                />
              )}

              <button
                type="button"
                disabled={dia.estado === 'PASADO'}
                onClick={() => manejarToqueDia(dia)}
                aria-label={`${dia.numeroDia} de ${calendarioMes.nombreMes.toLowerCase()}, ${
                  dia.estado === 'DISPONIBLE'
                    ? 'Disponible'
                    : dia.etiquetaBloqueo ?? (dia.estado === 'NO_DISPONIBLE' ? 'No disponible' : 'Ocupado')
                }`}
                aria-pressed={enRango}
                className={`fx-press relative flex h-10 w-10 sm:h-11 sm:w-11 flex-col items-center justify-center rounded-full text-xs tabular-nums select-none cursor-pointer ${clasesCirculo}`}
              >
                <span
                  className={
                    dia.estado === 'RESERVADO' ||
                    dia.estado === 'MANTENIMIENTO' ||
                    dia.estado === 'NO_DISPONIBLE'
                      ? 'line-through decoration-[#4B5563]/70 dark:decoration-[#9CA3AF]/70'
                      : ''
                  }
                >
                  {dia.numeroDia}
                </span>

                {(esInicio || esFin) && (
                  <span className="h-1 w-1 rounded-full bg-white dark:bg-[#111827]" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Aviso breve o Leyenda Compacta en una sola línea */}
      {avisoFranja ? (
        <div
          role="status"
          className="mt-2.5 rounded-full bg-[#EDEDED] border border-[#9CA3AF]/50 px-3 py-1 text-[11px] font-medium text-[#111827] flex items-center justify-between gap-2 animate-fade-in dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED]"
        >
          <span className="truncate">{avisoFranja}</span>
          <button
            type="button"
            onClick={() => setAvisoFranja(null)}
            aria-label="Cerrar aviso"
            className="text-[#4B5563] hover:text-[#111827] dark:text-[#D1D5DB] dark:hover:text-white font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mt-2.5 flex items-center justify-between border-t border-[#9CA3AF]/25 pt-2 text-[10px] font-medium text-[#4B5563] dark:border-white/10 dark:text-[#D1D5DB]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EDEDED] border border-[#9CA3AF] dark:bg-[#111827] dark:border-white/30" />
              Libre
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827] dark:bg-[#EDEDED]" />
              Seleccionado
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#4B5563]/25 dark:bg-white/15" />
              Ocupado
            </span>
          </div>
          <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
            {faseSeleccion === 'ELIGIENDO_FIN' && fechaInicio
              ? 'Toca día final'
              : 'Rango listo'}
          </span>
        </div>
      )}
    </section>
  );
}
