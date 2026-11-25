import { useMemo, useState } from 'react';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  alternarFechaEnSeleccion,
  construirCalendarioMes,
  esRangoDisponibleValido,
  expandirRangoAFechas,
  formatearResumenFechasSeleccionadas,
  normalizarFechasSeleccionadas,
  obtenerDiaSemanaEditorial,
  sumarDiasISO,
  type BloqueNoDisponible,
  type DiaCalendarioItem,
  type FranjaDisponible,
  type VehiculoItem,
} from '@/lib/flota';

export interface EditorialAvailabilityCalendarProps {
  vehiculo: VehiculoItem;
  hoyISO: string;
  fechasSeleccionadas?: readonly string[] | undefined;
  onChangeFechas?: ((fechas: string[]) => void) | undefined;
  fechaInicio?: string | null | undefined;
  fechaFin?: string | null | undefined;
  onChangeRango?: ((inicio: string | null, fin: string | null) => void) | undefined;
  bloquesPrecalculados?: BloqueNoDisponible[] | undefined;
}

export default function EditorialAvailabilityCalendar({
  vehiculo,
  hoyISO,
  fechasSeleccionadas,
  onChangeFechas,
  fechaInicio = null,
  fechaFin = null,
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

  const esModoPorDia = Boolean(onChangeFechas);

  const fechasActivas = useMemo(() => {
    if (fechasSeleccionadas !== undefined) {
      return normalizarFechasSeleccionadas(fechasSeleccionadas);
    }
    if (fechaInicio) {
      return expandirRangoAFechas(fechaInicio, fechaFin ?? fechaInicio);
    }
    return [];
  }, [fechasSeleccionadas, fechaInicio, fechaFin]);

  const conjuntoFechasActivas = useMemo(
    () => new Set(fechasActivas),
    [fechasActivas]
  );

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

  const diasSeleccionados = fechasActivas.length;

  const resumenFechasTexto = useMemo(
    () => formatearResumenFechasSeleccionadas(fechasActivas),
    [fechasActivas]
  );

  const codigoDiaEditorial = useMemo(() => {
    if (fechasActivas.length === 0) {
      return obtenerDiaSemanaEditorial(hoyISO);
    }
    const primera = fechasActivas[0]!;
    const ultima = fechasActivas[fechasActivas.length - 1]!;
    const d1 = obtenerDiaSemanaEditorial(primera);
    if (primera === ultima) {
      return d1;
    }
    const d2 = obtenerDiaSemanaEditorial(ultima);
    return `${d1} — ${d2}`;
  }, [fechasActivas, hoyISO]);

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

    if (esModoPorDia && onChangeFechas) {
      const siguiente = alternarFechaEnSeleccion(fechasActivas, dia.fechaISO);
      onChangeFechas(siguiente);
      return;
    }

    if (!onChangeRango) return;

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
    if (esModoPorDia && onChangeFechas) {
      const fechasFranja = expandirRangoAFechas(franja.fechaInicio, franja.fechaFin);
      onChangeFechas(fechasFranja);
      return;
    }
    if (onChangeRango) {
      onChangeRango(franja.fechaInicio, franja.fechaFin);
      setFaseSeleccion('COMPLETO');
    }
  };

  return (
    <section
      aria-label="Calendario de franjas disponibles"
      className="relative overflow-hidden rounded-[28px] bg-white border border-[#9CA3AF]/45 px-4 pt-4 pb-3.5 sm:p-6 shadow-xs dark:bg-[#1F2937] dark:border-white/12"
    >
      {/* 1. Cabecera del Selector de Fechas: Contador de Días + Selección */}
      <div className="flex items-center justify-between gap-3 border-b border-[#9CA3AF]/30 pb-3.5 dark:border-white/12">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span
            key={diasSeleccionados}
            className="animate-zoom-in font-display text-[3.25rem] sm:text-[3.75rem] font-black leading-[0.84] tracking-tighter text-[#111827] dark:text-[#EDEDED] tabular-nums select-none shrink-0"
          >
            {diasSeleccionados > 0 ? diasSeleccionados : '—'}
          </span>

          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#4B5563] dark:text-[#D1D5DB]">
              {diasSeleccionados === 1 ? 'Día elegido' : 'Días de alquiler'}
            </span>
            {diasSeleccionados > 0 ? (
              <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-full bg-[#111827] px-2.5 py-0.5 text-[11px] font-bold text-[#EDEDED] shadow-2xs dark:bg-[#EDEDED] dark:text-[#111827] truncate">
                <span className="truncate">{resumenFechasTexto}</span>
              </span>
            ) : (
              <span className="mt-0.5 text-[11px] font-medium text-[#4B5563] dark:text-[#D1D5DB]">
                Toca los días libres que necesites
              </span>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
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
            const fechasFranja = expandirRangoAFechas(franja.fechaInicio, franja.fechaFin);
            const franjaSeleccionada =
              fechasFranja.length > 0 &&
              fechasFranja.length === fechasActivas.length &&
              fechasFranja.every((f, idx) => fechasActivas[idx] === f);
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
          const estaSeleccionado = conjuntoFechasActivas.has(dia.fechaISO);
          const ayerISO = sumarDiasISO(dia.fechaISO, -1);
          const mananaISO = sumarDiasISO(dia.fechaISO, 1);
          const prevSeleccionado = estaSeleccionado && conjuntoFechasActivas.has(ayerISO);
          const nextSeleccionado = estaSeleccionado && conjuntoFechasActivas.has(mananaISO);

          const esIndividual = estaSeleccionado && !prevSeleccionado && !nextSeleccionado;
          const esInicioTramo = estaSeleccionado && !prevSeleccionado && nextSeleccionado;
          const esFinTramo = estaSeleccionado && prevSeleccionado && !nextSeleccionado;
          const esIntermedioTramo = estaSeleccionado && prevSeleccionado && nextSeleccionado;
          const esHoy = dia.fechaISO === hoyISO;

          let clasesCirculo = '';
          if (esIndividual || esInicioTramo || esFinTramo) {
            clasesCirculo =
              'bg-[#111827] text-[#EDEDED] font-black shadow-md ring-2 ring-[#111827]/35 ring-offset-2 ring-offset-white hover:bg-[#1F2937] dark:bg-[#EDEDED] dark:text-[#111827] dark:ring-[#EDEDED]/45 dark:ring-offset-[#1F2937] dark:hover:bg-white z-10';
          } else if (esIntermedioTramo) {
            clasesCirculo =
              'bg-[#1F2937] text-[#EDEDED] font-bold hover:bg-[#111827] dark:bg-[#4B5563] dark:text-[#EDEDED] dark:hover:bg-[#9CA3AF] dark:hover:text-[#111827] z-10';
          } else if (dia.estado === 'DISPONIBLE') {
            clasesCirculo = esHoy
              ? 'bg-[#EDEDED] text-[#111827] font-bold border-2 border-[#111827] hover:bg-[#111827]/12 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-[#EDEDED] dark:hover:bg-[#EDEDED]/15'
              : 'bg-[#EDEDED]/80 text-[#111827] font-semibold border border-[#9CA3AF]/55 hover:bg-[#111827]/10 hover:border-[#111827] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/20 dark:hover:bg-[#EDEDED]/15 dark:hover:border-[#EDEDED]/60';
          } else if (dia.estado === 'PASADO') {
            clasesCirculo =
              'bg-transparent text-[#9CA3AF]/70 font-normal cursor-not-allowed dark:bg-transparent dark:text-[#4B5563]';
          } else if (dia.estado === 'NO_DISPONIBLE') {
            clasesCirculo =
              'bg-[#9CA3AF]/20 text-[#4B5563] font-medium border border-[#9CA3AF]/45 cursor-not-allowed dark:bg-[#111827]/45 dark:text-[#9CA3AF]/60 dark:border-white/10';
          } else {
            clasesCirculo =
              'bg-[#9CA3AF]/20 text-[#4B5563] font-medium border border-[#9CA3AF]/45 cursor-not-allowed dark:bg-[#111827]/45 dark:text-[#9CA3AF]/60 dark:border-white/10';
          }

          return (
            <div
              key={dia.fechaISO}
              className="relative flex items-center justify-center h-10 sm:h-11 w-full"
            >
              {estaSeleccionado && (prevSeleccionado || nextSeleccionado) && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-y-1 bg-[#111827]/15 dark:bg-[#EDEDED]/20 ${
                    esInicioTramo
                      ? 'left-1/2 right-0 rounded-l-full'
                      : esFinTramo
                        ? 'left-0 right-1/2 rounded-r-full'
                        : 'inset-x-0'
                  }`}
                />
              )}

              <button
                type="button"
                disabled={dia.estado === 'PASADO'}
                onClick={() => manejarToqueDia(dia)}
                aria-label={`${dia.numeroDia} de ${calendarioMes.nombreMes.toLowerCase()}${
                  esHoy ? ', hoy' : ''
                }, ${
                  estaSeleccionado
                    ? 'seleccionado'
                    : dia.estado === 'DISPONIBLE'
                      ? 'disponible'
                      : dia.etiquetaBloqueo ?? (dia.estado === 'NO_DISPONIBLE' ? 'no disponible' : 'ocupado')
                }`}
                aria-pressed={estaSeleccionado}
                className={`fx-press relative flex h-10 w-10 sm:h-11 sm:w-11 flex-col items-center justify-center rounded-full text-xs tabular-nums select-none transition-colors ${
                  dia.estado === 'PASADO' ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${clasesCirculo}`}
              >
                <span
                  className={
                    dia.estado === 'RESERVADO' ||
                    dia.estado === 'MANTENIMIENTO' ||
                    dia.estado === 'NO_DISPONIBLE'
                      ? 'line-through decoration-[#4B5563]/75 dark:decoration-[#9CA3AF]/65'
                      : ''
                  }
                >
                  {dia.numeroDia}
                </span>

                {(esIndividual || esInicioTramo || esFinTramo) && (
                  <span className="h-1 w-1 rounded-full bg-[#EDEDED] dark:bg-[#111827]" />
                )}
                {!estaSeleccionado && esHoy && (
                  <span className="h-1 w-1 rounded-full bg-[#111827] dark:bg-[#EDEDED]" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Aviso breve o Leyenda Compacta */}
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
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#9CA3AF]/25 pt-2 text-[10px] font-medium text-[#4B5563] dark:border-white/10 dark:text-[#D1D5DB]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EDEDED] border border-[#9CA3AF] dark:bg-[#111827] dark:border-white/30" />
              Libre
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827] dark:bg-[#EDEDED]" />
              Elegido
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1F2937] dark:bg-[#4B5563]" />
              Intermedio
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]/30 border border-[#9CA3AF]/50 dark:bg-[#111827]/45 dark:border-white/15" />
              Ocupado
            </span>
          </div>
          <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
            {diasSeleccionados === 0
              ? 'Toca cualquier día libre'
              : esModoPorDia
                ? 'Toca para agregar o quitar'
                : faseSeleccion === 'ELIGIENDO_FIN'
                  ? 'Toca día final'
                  : 'Rango listo'}
          </span>
        </div>
      )}
    </section>
  );
}
