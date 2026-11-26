import { useEffect, useMemo, useState } from 'react';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  actualizarRangoAlquilerPorToque,
  alternarFechaEnSeleccion,
  construirCalendarioMes,
  esRangoDisponibleValido,
  expandirRangoAFechas,
  formatearFechaCorta,
  formatearResumenFechasSeleccionadas,
  normalizarFechasSeleccionadas,
  obtenerDiaSemanaEditorial,
  obtenerFechaFinMinimaAlquiler,
  obtenerUltimoDiaContiguoLibre,
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
  excluirDiaSiguiente?: boolean | undefined;
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
  excluirDiaSiguiente = false,
}: EditorialAvailabilityCalendarProps) {
  const [anioInicial = 2026, mesInicialUno = 10] = hoyISO.split('-').map(Number);

  const [mesCursor, setMesCursor] = useState<{ anio: number; mesIndexCero: number }>({
    anio: anioInicial,
    mesIndexCero: mesInicialUno - 1,
  });

  const [faseSeleccion, setFaseSeleccion] = useState<'ELIGIENDO_FIN' | 'COMPLETO'>(() => {
    if (!fechaInicio || !fechaFin) return 'ELIGIENDO_FIN';
    if (excluirDiaSiguiente) {
      return fechaFin >= obtenerFechaFinMinimaAlquiler(fechaInicio, false)
        ? 'COMPLETO'
        : 'ELIGIENDO_FIN';
    }
    return 'COMPLETO';
  });

  useEffect(() => {
    if (fechaInicio && !fechaFin) {
      setFaseSeleccion('ELIGIENDO_FIN');
    } else if (
      fechaInicio &&
      fechaFin &&
      (!excluirDiaSiguiente ||
        fechaFin >= obtenerFechaFinMinimaAlquiler(fechaInicio, false))
    ) {
      setFaseSeleccion('COMPLETO');
    }
  }, [excluirDiaSiguiente, fechaFin, fechaInicio]);

  const [avisoFranja, setAvisoFranja] = useState<string | null>(null);

  const esModoPorDia = Boolean(onChangeFechas) && !onChangeRango;

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

  const esperandoFinRango =
    !esModoPorDia &&
    Boolean(onChangeRango) &&
    Boolean(fechaInicio) &&
    (faseSeleccion === 'ELIGIENDO_FIN' || !fechaFin);

  const diaSiguienteExcluidoISO = useMemo(() => {
    if (!excluirDiaSiguiente || !esperandoFinRango || !fechaInicio) {
      return null;
    }
    return sumarDiasISO(fechaInicio, 1);
  }, [excluirDiaSiguiente, esperandoFinRango, fechaInicio]);

  const fechaFinMinimaISO = useMemo(() => {
    if (!fechaInicio) return null;
    return obtenerFechaFinMinimaAlquiler(fechaInicio, !excluirDiaSiguiente);
  }, [excluirDiaSiguiente, fechaInicio]);

  const ultimoDiaContiguoISO = useMemo(() => {
    if (!esperandoFinRango || !fechaInicio) return null;
    return obtenerUltimoDiaContiguoLibre(fechaInicio, bloquesPrecalculados);
  }, [bloquesPrecalculados, esperandoFinRango, fechaInicio]);

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

  const franjasVisibles = useMemo(() => {
    if (!excluirDiaSiguiente) return calendarioMes.franjasMes;
    return calendarioMes.franjasMes.filter(
      (f) => f.fechaFin >= obtenerFechaFinMinimaAlquiler(f.fechaInicio, false)
    );
  }, [calendarioMes.franjasMes, excluirDiaSiguiente]);

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

  const validarInicioPosible = (inicioISO: string): boolean => {
    if (!excluirDiaSiguiente) return true;
    const minFin = obtenerFechaFinMinimaAlquiler(inicioISO, false);
    if (!esRangoDisponibleValido(vehiculo.id, inicioISO, minFin, hoyISO, bloquesPrecalculados)) {
      setAvisoFranja(
        `Desde el ${formatearFechaCorta(inicioISO)} no alcanza hasta el ${formatearFechaCorta(minFin)} sin cruzarse con un bloqueo cercano.`
      );
      return false;
    }
    return true;
  };

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

    if (!excluirDiaSiguiente) {
      const resultado = actualizarRangoAlquilerPorToque({
        fechaInicio,
        fechaFin,
        fechaTocada: dia.fechaISO,
        vehiculoId: vehiculo.id,
        hoyISO,
        bloques: bloquesPrecalculados,
      });
      if (resultado.aviso) {
        setAvisoFranja(resultado.aviso);
      }
      onChangeRango(resultado.fechaInicio, resultado.fechaFin);
      setFaseSeleccion('COMPLETO');
      return;
    }

    if (!fechaInicio || faseSeleccion === 'COMPLETO') {
      if (fechaInicio && fechaFin && fechaFin !== fechaInicio && dia.fechaISO === fechaFin) {
        onChangeRango(fechaInicio, null);
        setFaseSeleccion('ELIGIENDO_FIN');
        return;
      }
      if (!validarInicioPosible(dia.fechaISO)) {
        return;
      }
      onChangeRango(dia.fechaISO, excluirDiaSiguiente ? null : dia.fechaISO);
      setFaseSeleccion('ELIGIENDO_FIN');
      return;
    }

    if (excluirDiaSiguiente && diaSiguienteExcluidoISO === dia.fechaISO) {
      setAvisoFranja(
        `El ${formatearFechaCorta(dia.fechaISO)} queda excluido por defecto. Elige devolución desde el ${formatearFechaCorta(fechaFinMinimaISO ?? sumarDiasISO(fechaInicio, 2))}.`
      );
      return;
    }

    if (dia.fechaISO === fechaInicio) {
      if (!excluirDiaSiguiente) {
        onChangeRango(fechaInicio, dia.fechaISO);
        setFaseSeleccion('COMPLETO');
      } else {
        setAvisoFranja(
          `Inicio fijado el ${formatearFechaCorta(fechaInicio)}. Elige la devolución desde el ${formatearFechaCorta(fechaFinMinimaISO ?? sumarDiasISO(fechaInicio, 2))}.`
        );
      }
      return;
    }

    if (dia.fechaISO < fechaInicio) {
      if (!validarInicioPosible(dia.fechaISO)) {
        return;
      }
      onChangeRango(dia.fechaISO, excluirDiaSiguiente ? null : dia.fechaISO);
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
      if (!validarInicioPosible(dia.fechaISO)) {
        return;
      }
      onChangeRango(dia.fechaISO, excluirDiaSiguiente ? null : dia.fechaISO);
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
            {diasSeleccionados}
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
                Elige la fecha de inicio disponible
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

      {/* Guía de selección activa cuando se está eligiendo la fecha de fin */}
      {esperandoFinRango && fechaInicio && (
        <div
          role="status"
          className="mt-2.5 flex items-center justify-between gap-2 rounded-2xl border border-[#4B5563]/45 bg-[#EDEDED]/70 px-3 py-2 text-[11px] font-semibold text-[#111827] dark:border-white/20 dark:bg-[#111827] dark:text-[#EDEDED]"
        >
          <span>
            Inicio: <strong>{formatearFechaCorta(fechaInicio)}</strong>.{' '}
            {excluirDiaSiguiente && fechaFinMinimaISO
              ? `Elige devolución desde el ${formatearFechaCorta(fechaFinMinimaISO)}${
                  ultimoDiaContiguoISO ? ` hasta el ${formatearFechaCorta(ultimoDiaContiguoISO)}` : ''
                }.`
              : 'Toca la fecha de cierre del rango.'}
          </span>
          {onChangeRango && (
            <button
              type="button"
              onClick={() => {
                setAvisoFranja(null);
                onChangeRango(null, null);
                setFaseSeleccion('ELIGIENDO_FIN');
              }}
              className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wide text-[#111827] hover:underline cursor-pointer dark:text-[#EDEDED]"
            >
              Reiniciar
            </button>
          )}
        </div>
      )}

      {/* 3. Píldoras de Franjas Disponibles */}
      {franjasVisibles.length > 0 && (
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#D1D5DB] mr-1">
            Franjas:
          </span>
          {franjasVisibles.map((franja) => {
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
                className={`fx-press shrink-0 min-h-[32px] rounded-full px-3 py-1 text-[11px] font-bold cursor-pointer border transition-colors duration-150 ${
                  franjaSeleccionada
                    ? 'bg-[#111827] text-[#EDEDED] border-[#111827] shadow-[0_0_12px_rgba(31,41,55,0.4)] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED] dark:shadow-[0_0_12px_rgba(237,237,237,0.35)]'
                    : 'bg-[#EDEDED] text-[#111827] border-[#9CA3AF]/45 hover:border-[#111827] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/15 dark:hover:border-[#EDEDED]/60'
                }`}
              >
                <span>{franja.etiquetaCorta}</span>
                <span
                  className={`ml-1 text-[10px] ${
                    franjaSeleccionada
                      ? 'text-[#EDEDED]/85 dark:text-[#4B5563]'
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

      {/* 4. Encabezados de Semana + Matriz Circular de 7 Columnas (sin franja rectangular trasera) */}
      <div className="mt-2.5 grid grid-cols-7 gap-1 text-center">
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
        className="mt-1.5 grid grid-cols-7 gap-y-2 gap-x-1.5 sm:gap-2 animate-fade-in"
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

          const esDiaSiguienteExcluido =
            Boolean(diaSiguienteExcluidoISO) &&
            dia.fechaISO === diaSiguienteExcluidoISO &&
            dia.estado === 'DISPONIBLE';

          const fueraDeVentanaCierre =
            esperandoFinRango &&
            excluirDiaSiguiente &&
            Boolean(fechaInicio) &&
            dia.estado === 'DISPONIBLE' &&
            !estaSeleccionado &&
            !esDiaSiguienteExcluido &&
            (dia.fechaISO < fechaInicio! ||
              (ultimoDiaContiguoISO !== null && dia.fechaISO > ultimoDiaContiguoISO));

          const esDeshabilitado = dia.estado === 'PASADO' || esDiaSiguienteExcluido;

          let clasesCirculo = '';
          if (esIndividual || esInicioTramo || esFinTramo) {
            clasesCirculo =
              'bg-[#111827] text-[#EDEDED] font-bold shadow-[0_0_0_2px_rgba(17,24,39,0.85),0_0_14px_rgba(31,41,55,0.45)] dark:bg-[#EDEDED] dark:text-[#111827] dark:shadow-[0_0_0_2px_rgba(237,237,237,0.9),0_0_18px_rgba(237,237,237,0.45)] z-10';
          } else if (esIntermedioTramo) {
            clasesCirculo =
              'bg-[#9CA3AF]/35 text-[#111827] font-semibold border border-[#9CA3AF]/60 dark:bg-white/15 dark:text-[#EDEDED] dark:border-white/25 z-10';
          } else if (esDiaSiguienteExcluido) {
            clasesCirculo =
              'bg-transparent text-[#9CA3AF] font-medium border border-dashed border-[#9CA3AF]/60 opacity-60 cursor-not-allowed dark:text-[#9CA3AF]/65 dark:border-white/25';
          } else if (dia.estado === 'DISPONIBLE') {
            const atenuado = fueraDeVentanaCierre ? 'opacity-45' : '';
            clasesCirculo = esHoy
              ? `bg-[#EDEDED] text-[#111827] font-bold border-2 border-[#111827] hover:border-[#4B5563] dark:bg-[#111827] dark:text-[#EDEDED] dark:border-[#EDEDED] dark:hover:border-[#9CA3AF] ${atenuado}`
              : `bg-[#EDEDED]/80 text-[#111827] font-semibold border border-[#9CA3AF]/55 hover:border-[#111827] hover:bg-[#111827]/10 dark:bg-[#111827] dark:text-[#EDEDED] dark:border-white/20 dark:hover:border-[#EDEDED]/60 dark:hover:bg-[#EDEDED]/12 ${atenuado}`;
          } else if (dia.estado === 'PASADO') {
            clasesCirculo =
              'bg-transparent text-[#9CA3AF]/70 font-normal cursor-not-allowed dark:bg-transparent dark:text-[#4B5563]';
          } else {
            clasesCirculo =
              'bg-[#9CA3AF]/20 text-[#4B5563] font-medium border border-[#9CA3AF]/45 cursor-not-allowed dark:bg-[#111827]/45 dark:text-[#9CA3AF]/60 dark:border-white/10';
          }

          return (
            <div
              key={dia.fechaISO}
              className="relative flex items-center justify-center h-10 sm:h-11 w-full"
            >
              <button
                type="button"
                disabled={esDeshabilitado}
                onClick={() => manejarToqueDia(dia)}
                aria-label={`${dia.numeroDia} de ${calendarioMes.nombreMes.toLowerCase()}${
                  esHoy ? ', hoy' : ''
                }, ${
                  estaSeleccionado
                    ? esInicioTramo
                      ? 'fecha de inicio seleccionada'
                      : esFinTramo
                        ? 'fecha de devolución seleccionada'
                        : 'día seleccionado'
                    : esDiaSiguienteExcluido
                      ? 'día siguiente excluido por mínimo de reserva'
                      : dia.estado === 'DISPONIBLE'
                        ? 'disponible'
                        : dia.etiquetaBloqueo ??
                          (dia.estado === 'NO_DISPONIBLE' ? 'no disponible' : 'ocupado')
                }`}
                aria-pressed={estaSeleccionado}
                className={`fx-press relative flex h-10 w-10 sm:h-11 sm:w-11 flex-col items-center justify-center rounded-full text-xs tabular-nums select-none transition-colors duration-150 ${
                  esDeshabilitado ? 'cursor-not-allowed' : 'cursor-pointer'
                } ${clasesCirculo}`}
              >
                <span
                  className={
                    dia.estado === 'RESERVADO' ||
                    dia.estado === 'MANTENIMIENTO' ||
                    dia.estado === 'NO_DISPONIBLE' ||
                    esDiaSiguienteExcluido
                      ? 'line-through decoration-[#4B5563]/75 dark:decoration-[#9CA3AF]/65'
                      : ''
                  }
                >
                  {dia.numeroDia}
                </span>

                {(esIndividual || esInicioTramo || esFinTramo) && (
                  <span className="h-1 w-1 rounded-full bg-[#EDEDED] dark:bg-[#111827]" />
                )}
                {!estaSeleccionado && !esDiaSiguienteExcluido && esHoy && (
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
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827] shadow-[0_0_6px_rgba(31,41,55,0.65)] dark:bg-[#EDEDED] dark:shadow-[0_0_6px_rgba(237,237,237,0.65)]" />
              Inicio / Fin
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]/35 border border-[#9CA3AF]/60 dark:bg-white/15 dark:border-white/25" />
              Intermedio
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]/30 border border-[#9CA3AF]/50 dark:bg-[#111827]/45 dark:border-white/15" />
              Ocupado
            </span>
          </div>
          <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
            {diasSeleccionados === 0
              ? 'Toca fecha de inicio'
              : esModoPorDia
                ? 'Toca para agregar o quitar'
                : excluirDiaSiguiente && esperandoFinRango
                  ? 'Elige fecha de devolución'
                  : 'Toca días para ampliar o recortar'}
          </span>
        </div>
      )}
    </section>
  );
}
