import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  FLOTA_CANONICA,
  STORAGE_KEY_RESERVAS_FLOTAX,
  calcularDiasInclusivos,
  construirCalendarioSuizoReservas,
  crearReservaMostradorPatio,
  formatearFechaCorta,
  formatearRangoReservaHumano,
  hidratarReservasCliente,
  obtenerInfoDiaFechaISO,
  obtenerReservasSemillaCliente,
  persistirReservaActualizadaEnStorage,
  sumarDiasISO,
  type CeldaCalendarioSuizo,
  type EstadoReservaCliente,
  type ModalidadEntregaReserva,
  type ReservaClienteItem,
} from '@/lib/flota';

export interface MisReservasHubProps {
  hoyISO: string;
  modo?: 'cliente' | 'admin' | undefined;
  abrirNuevaInicial?: boolean | undefined;
}

type FiltroEstadoAdmin =
  | 'TODAS'
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'EN_CURSO'
  | 'CERRADAS';

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
  RECHAZADA: 'Rechazada',
};

export default function MisReservasHub({
  hoyISO,
  modo = 'cliente',
  abrirNuevaInicial = false,
}: MisReservasHubProps) {
  const esAdmin = modo === 'admin';

  const [reservas, setReservas] = useState<ReservaClienteItem[]>(() =>
    obtenerReservasSemillaCliente(hoyISO)
  );
  const [codigoActivo, setCodigoActivo] = useState<string>('');
  const [filtroInicioISO, setFiltroInicioISO] = useState<string | null>(null);
  const [filtroFinISO, setFiltroFinISO] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoAdmin>('TODAS');
  const [toastOperativo, setToastOperativo] = useState<string | null>(null);
  const [sheetNuevaAbierto, setSheetNuevaAbierto] =
    useState<boolean>(abrirNuevaInicial);

  // Estado del formulario rápido de mostrador (1 paso)
  const [formVehiculoId, setFormVehiculoId] = useState<string>(
    FLOTA_CANONICA[0]?.id ?? 'veh-mercedes-eqb'
  );
  const [formFechaInicio, setFormFechaInicio] = useState<string>(hoyISO);
  const [formFechaFin, setFormFechaFin] = useState<string>(() =>
    sumarDiasISO(hoyISO, 2)
  );
  const [formNombre, setFormNombre] = useState<string>('');
  const [formTipoDoc, setFormTipoDoc] = useState<'CC' | 'CE' | 'PASAPORTE'>('CC');
  const [formNumDoc, setFormNumDoc] = useState<string>('');
  const [formLicencia, setFormLicencia] = useState<'B1' | 'B2' | 'A2' | 'C1'>('B1');
  const [formTelefono, setFormTelefono] = useState<string>('');
  const [formModalidad, setFormModalidad] =
    useState<ModalidadEntregaReserva>('PATIO_PRINCIPAL');
  const [formEstadoInicial, setFormEstadoInicial] = useState<
    'CONFIRMADA' | 'PENDIENTE'
  >('CONFIRMADA');
  const [formPorcentajeAbono, setFormPorcentajeAbono] = useState<30 | 100>(100);

  const [anioHoy = 2026, mesHoyUno = 10] = hoyISO.split('-').map(Number);
  const [mesCursor, setMesCursor] = useState<{
    anio: number;
    mesIndexCero: number;
  }>({
    anio: anioHoy,
    mesIndexCero: mesHoyUno - 1,
  });

  const mostrarAviso = (texto: string) => {
    setToastOperativo(texto);
    window.setTimeout(() => {
      setToastOperativo(null);
    }, 3600);
  };

  useEffect(() => {
    try {
      const rawReservas = window.localStorage.getItem(
        STORAGE_KEY_RESERVAS_FLOTAX
      );
      const hidratadas = hidratarReservasCliente(rawReservas, null, hoyISO);
      setReservas(hidratadas);
      if (hidratadas[0]) {
        setCodigoActivo(hidratadas[0].codigo);
      }
    } catch {
      // Fallback a semillas por defecto
    }
  }, [hoyISO]);

  const conteosPorEstado = useMemo(() => {
    let pendientes = 0;
    let confirmadas = 0;
    let enCurso = 0;
    let cerradas = 0;
    for (const r of reservas) {
      if (r.estado === 'PENDIENTE') pendientes++;
      else if (r.estado === 'CONFIRMADA') confirmadas++;
      else if (r.estado === 'EN_CURSO') enCurso++;
      else cerradas++;
    }
    return {
      todas: reservas.length,
      pendientes,
      confirmadas,
      enCurso,
      cerradas,
    };
  }, [reservas]);

  const reservaActiva = useMemo(() => {
    if (reservas.length === 0) return null;
    return (
      reservas.find((r) => r.codigo === codigoActivo) ?? reservas[0] ?? null
    );
  }, [reservas, codigoActivo]);

  const hayFiltroActivo =
    filtroInicioISO !== null || (esAdmin && filtroEstado !== 'TODAS');
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
    return reservas.filter((r) => {
      if (esAdmin && filtroEstado !== 'TODAS') {
        if (filtroEstado === 'CERRADAS') {
          if (r.estado !== 'COMPLETADA' && r.estado !== 'RECHAZADA') {
            return false;
          }
        } else if (r.estado !== filtroEstado) {
          return false;
        }
      }
      if (filtroInicioISO) {
        const fin = filtroFinISO ?? filtroInicioISO;
        if (!(r.fechaInicio <= fin && r.fechaFin >= filtroInicioISO)) {
          return false;
        }
      }
      return true;
    });
  }, [reservas, filtroInicioISO, filtroFinISO, esAdmin, filtroEstado]);

  const cotizacionRapidaPatio = useMemo(() => {
    const veh =
      FLOTA_CANONICA.find((v) => v.id === formVehiculoId) ?? FLOTA_CANONICA[0]!;
    const inicio =
      formFechaInicio <= formFechaFin ? formFechaInicio : formFechaFin;
    const fin =
      formFechaFin >= formFechaInicio ? formFechaFin : formFechaInicio;
    const dias = calcularDiasInclusivos(inicio, fin);
    const subtotal = dias * veh.precioDia;
    const total = subtotal + Math.round(subtotal * 0.08);
    return { vehiculo: veh, dias, total };
  }, [formVehiculoId, formFechaInicio, formFechaFin]);

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
    setFiltroEstado('TODAS');
  };

  const manejarToqueDia = (celda: CeldaCalendarioSuizo) => {
    if (!celda.esMesActual) {
      const [y = 2026, m = 10] = celda.fechaISO.split('-').map(Number);
      setMesCursor({ anio: y, mesIndexCero: m - 1 });
    }

    const fechaTocada = celda.fechaISO;

    if (!filtroInicioISO || filtroFinISO !== null) {
      setFiltroInicioISO(fechaTocada);
      setFiltroFinISO(null);
      return;
    }

    if (fechaTocada === filtroInicioISO) {
      setFiltroInicioISO(null);
      setFiltroFinISO(null);
      return;
    }

    if (fechaTocada < filtroInicioISO) {
      setFiltroFinISO(filtroInicioISO);
      setFiltroInicioISO(fechaTocada);
    } else {
      setFiltroFinISO(fechaTocada);
    }
  };

  const abrirDetalle = (reserva: ReservaClienteItem) => {
    setCodigoActivo(reserva.codigo);
    navigate(rutaDetallePorCodigo(reserva.codigo));
  };

  const aprobarSolicitudRapida = async (item: ReservaClienteItem) => {
    const actualizada: ReservaClienteItem = {
      ...item,
      estado: 'CONFIRMADA',
      estadoGarantia: 'CUSTODIA_ACTIVA',
    };
    const rawActual =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY_RESERVAS_FLOTAX)
        : null;
    const nuevaLista = persistirReservaActualizadaEnStorage(
      actualizada,
      rawActual,
      hoyISO
    );
    setReservas(nuevaLista);
    setCodigoActivo(item.codigo);
    mostrarAviso(
      `Reserva #${item.codigo} confirmada · Lista para entrega R2`
    );

    try {
      await actions.reservas.cambiarEstado({
        codigo: item.codigo,
        vehiculoId: item.vehiculo.id,
        vehiculoNombre: `${item.vehiculo.marca} ${item.vehiculo.modelo}`,
        rangoFechas: formatearRangoReservaHumano(
          item.fechaInicio,
          item.fechaFin
        ),
        nuevoEstado: 'CONFIRMADA',
      });
    } catch {
      // Persistido localmente
    }
  };

  const manejarCrearReservaMostrador = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const rawActual =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY_RESERVAS_FLOTAX)
        : null;
    const { creada, lista } = crearReservaMostradorPatio(
      {
        vehiculoId: formVehiculoId,
        fechaInicio: formFechaInicio,
        fechaFin: formFechaFin,
        nombreCompleto: formNombre || 'Cliente Presencial Patio',
        tipoDocumento: formTipoDoc,
        numeroDocumento: formNumDoc || '1.037.482.910',
        categoriaLicencia: formLicencia,
        telefono: formTelefono || '+57 300 512 9080',
        correo: 'mostrador@flotax.co',
        modalidadEntrega: formModalidad,
        estadoInicial: formEstadoInicial,
        porcentajeAbonoInicial: formPorcentajeAbono,
      },
      rawActual,
      hoyISO
    );

    setReservas(lista);
    setCodigoActivo(creada.codigo);
    setFiltroEstado('TODAS');
    setFiltroInicioISO(null);
    setFiltroFinISO(null);
    setSheetNuevaAbierto(false);
    setFormNombre('');
    setFormNumDoc('');
    setFormTelefono('');

    const [y = 2026, m = 10] = creada.fechaInicio.split('-').map(Number);
    setMesCursor({ anio: y, mesIndexCero: m - 1 });
    mostrarAviso(`Reserva #${creada.codigo} radicada en agenda de patio`);
  };

  const rutaDetallePorCodigo = (codigo: string): string =>
    esAdmin ? `/admin/reservas/${codigo}` : `/reservas/${codigo}`;

  return (
    <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col md:flex-row md:items-start gap-5 md:gap-7 pb-8">
      {/* Toast Operativo Flotante */}
      {toastOperativo && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-fade-up"
        >
          <span className="h-2 w-2 rounded-full bg-[#EDEDED]" />
          <span>{toastOperativo}</span>
        </div>
      )}

      {/* =====================================================================
          SECCIÓN 1: SUPERFICIE DE CALENDARIO EDITORIAL SUIZO (STICKY EN PC)
          ===================================================================== */}
      <section
        aria-label="Calendario de reservas"
        className="w-full max-w-[430px] mx-auto md:mx-0 md:w-[360px] lg:w-[410px] xl:w-[440px] shrink-0 rounded-[28px] sm:rounded-[34px] bg-white px-5 sm:px-6 pt-4 pb-4 shadow-[0_10px_28px_-16px_rgba(17,24,39,0.06)] border border-[#E5E4DF]/60 md:sticky md:top-20"
      >
        {/* Barra Superior: Píldora Suave de Mes + Acción Rápida Admin + Controles */}
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
            {esAdmin && (
              <button
                type="button"
                onClick={() => setSheetNuevaAbierto(true)}
                className="ios-press-bounce mr-1 inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#111827] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1F2937] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  className="h-3.5 w-3.5"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Nueva</span>
              </button>
            )}

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

        {/* Matriz Circular de 7 Columnas */}
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
                r.estado !== 'RECHAZADA' &&
                celda.fechaISO >= r.fechaInicio &&
                celda.fechaISO <= r.fechaFin
            );

            const tienePendienteEnDia =
              esAdmin &&
              reservas.some(
                (r) =>
                  r.estado === 'PENDIENTE' &&
                  celda.fechaISO >= r.fechaInicio &&
                  celda.fechaISO <= r.fechaFin
              );

            let clasesCirculo = '';
            if (!celda.esMesActual) {
              clasesCirculo = enRangoFiltro
                ? 'bg-[#1F2937]/75 text-white font-semibold'
                : 'bg-transparent text-[#9CA3AF]/55 font-normal';
            } else if (esInicioFiltro || esFinFiltro) {
              clasesCirculo =
                'bg-[#111827] text-white font-bold shadow-xs ring-2 ring-[#111827] ring-offset-1 ring-offset-white z-10';
            } else if (esIntermedioFiltro) {
              clasesCirculo = 'bg-[#1F2937] text-white font-semibold z-10';
            } else if (enAlgunAlquiler) {
              clasesCirculo = celda.enReservaActiva
                ? 'bg-[#9CA3AF]/60 text-[#111827] font-bold ring-1.5 ring-[#4B5563]'
                : 'bg-[#9CA3AF]/45 text-[#111827] font-semibold ring-1 ring-[#9CA3AF]';
            } else {
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
                      className={`h-1.5 w-1.5 rounded-full ${
                        enRangoFiltro
                          ? 'bg-white/85'
                          : tienePendienteEnDia
                            ? 'bg-[#111827]'
                            : 'bg-[#4B5563]'
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
              <span>{esAdmin ? 'En agenda' : 'Con alquiler'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827]" />
              <span>Filtro</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#111827] tabular-nums">
              {!filtroInicioISO
                ? 'Toca inicio y fin para filtrar'
                : !filtroFinISO
                  ? `Desde ${formatearFechaCorta(filtroInicioISO)} · Toca día final`
                  : `${formatearFechaCorta(filtroInicioISO)} – ${formatearFechaCorta(filtroFinISO)}`}
            </span>
            {hayFiltroActivo && (
              <button
                type="button"
                onClick={limpiarFiltro}
                className="ios-press-bounce text-[10px] font-bold text-[#111827] underline hover:text-[#4B5563] cursor-pointer"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECCIÓN 2: AGENDA DE ALQUILERES SOBRE EL LIENZO MÓVIL Y DESKTOP
          ===================================================================== */}
      <section
        aria-label="Listado de alquileres"
        className="flex-1 min-w-0 w-full px-2 sm:px-4 pt-1 md:pt-0 space-y-4"
      >
        {/* Píldoras de Triage Operativo (Solo en modo Admin) */}
        {esAdmin && (
          <div
            role="tablist"
            aria-label="Filtrar reservas por estado operativo"
            className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
          >
            {(
              [
                {
                  id: 'TODAS',
                  label: 'Todas',
                  count: conteosPorEstado.todas,
                },
                {
                  id: 'PENDIENTE',
                  label: 'Pendientes',
                  count: conteosPorEstado.pendientes,
                },
                {
                  id: 'EN_CURSO',
                  label: 'En curso',
                  count: conteosPorEstado.enCurso,
                },
                {
                  id: 'CONFIRMADA',
                  label: 'Confirmadas',
                  count: conteosPorEstado.confirmadas,
                },
                {
                  id: 'CERRADAS',
                  label: 'Cerradas',
                  count: conteosPorEstado.cerradas,
                },
              ] as const
            ).map((tab) => {
              const activo = filtroEstado === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setFiltroEstado(tab.id)}
                  className={`ios-press-bounce shrink-0 inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                    activo
                      ? 'bg-[#111827] text-white'
                      : 'bg-white/75 text-[#4B5563] hover:bg-white hover:text-[#111827]'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                      activo
                        ? 'bg-white/20 text-white'
                        : 'bg-[#EDEDED] text-[#111827]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Cabecera Editorial: Día / Rango Grande + Conteo + Píldora "Ver todos" */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="border-l-2 border-[#9CA3AF]/60 pl-3">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                {hayFiltroActivo
                  ? 'FILTRO'
                  : esAdmin
                    ? 'AGENDA DE PATIO'
                    : 'AGENDA'}
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

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#111827]">
                {alquileresMostrados.length}{' '}
                {alquileresMostrados.length === 1
                  ? 'reserva en vista'
                  : 'reservas en lista'}
              </p>
              {esAdmin && conteosPorEstado.pendientes > 0 && (
                <p className="text-[11px] font-medium text-[#4B5563]">
                  {conteosPorEstado.pendientes} por verificar en patio
                </p>
              )}
            </div>
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

        {/* Grilla Responsiva de Alquileres (1 columna móvil, 2 en PC/tablet) */}
        {alquileresMostrados.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3.5">
            {alquileresMostrados.map((item) => {
              const esActiva = reservaActiva?.codigo === item.codigo;
              const pctAbono = Math.min(
                100,
                Math.round(
                  (item.montoReportado / Math.max(1, item.totalAlquiler)) * 100
                )
              );

              return (
                <div
                  key={item.codigo}
                  role="button"
                  tabIndex={0}
                  onClick={() => abrirDetalle(item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      abrirDetalle(item);
                    }
                  }}
                  className={`group w-full rounded-[22px] p-4 transition-all duration-200 cursor-pointer animate-fade-up bg-white border ${
                    esActiva
                      ? 'border-[#111827]/15 shadow-sm ring-1 ring-[#111827]/10'
                      : 'border-[#E5E4DF] hover:border-[#111827]/25 shadow-2xs hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Silueta vehicular sin recuadro ni relieve (fondo blanco puro 100% integrado) */}
                    <div className="relative h-20 w-28 sm:h-22 sm:w-32 shrink-0 flex items-center justify-center">
                      <img
                        src={item.vehiculo.imagenUrl}
                        alt={`${item.vehiculo.marca} ${item.vehiculo.modelo}`}
                        className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    {/* Contenido e información de la reserva */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#4B5563]">
                        <span className="tabular-nums">
                          {formatearRangoReservaHumano(
                            item.fechaInicio,
                            item.fechaFin
                          )}
                        </span>
                        <span>·</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            item.estado === 'PENDIENTE'
                              ? 'bg-[#111827] text-white'
                              : item.estado === 'EN_CURSO'
                                ? 'bg-[#1F2937] text-white'
                                : 'bg-[#EDEDED] text-[#111827]'
                          }`}
                        >
                          {ETIQUETA_ESTADO[item.estado]}
                        </span>
                        {esAdmin && (
                          <span className="font-mono text-[10px] text-[#4B5563]">
                            #{item.codigo}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827] uppercase truncate">
                        {item.vehiculo.marca} {item.vehiculo.modelo}
                      </h3>

                      {esAdmin ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[11px] font-semibold text-[#1F2937] truncate">
                            {item.conductor.nombreCompleto} ·{' '}
                            <span className="font-normal text-[#4B5563]">
                              {item.conductor.tipoDocumento}{' '}
                              {item.conductor.numeroDocumento} · Lic.{' '}
                              {item.conductor.categoriaLicencia}
                            </span>
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-[#4B5563] tabular-nums">
                              {item.vehiculo.placa} · Abonado {pctAbono}% ·{' '}
                              <span className="font-semibold text-[#111827]">
                                {formatCop(item.totalAlquiler)}
                              </span>
                            </p>
                            {item.estado === 'PENDIENTE' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  aprobarSolicitudRapida(item);
                                }}
                                className="ios-press-bounce min-h-[32px] rounded-full bg-[#111827] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#1F2937] cursor-pointer"
                              >
                                Aprobar
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-[12px] text-[#4B5563] tabular-nums">
                          {item.vehiculo.placa} ·{' '}
                          <span className="font-bold text-[#111827]">
                            {formatCop(item.totalAlquiler)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[22px] bg-white/70 px-4 py-5 text-center space-y-2">
            <p className="text-xs font-medium text-[#4B5563]">
              {filtroFinISO
                ? 'Sin reservas en este rango de fechas'
                : 'Sin reservas para el filtro seleccionado'}
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

      {/* =====================================================================
          SHEET RÁPIDO: + NUEVA RESERVA EN PATIO (1 PASO PARA MOSTRADOR)
          ===================================================================== */}
      {esAdmin && sheetNuevaAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nueva reserva en patio"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#111827]/45 backdrop-blur-xs p-0 sm:p-4 animate-fade-in"
        >
          <div className="w-full max-w-[430px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-2xl max-h-[90dvh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  Mostrador de Patio · 1 Paso
                </span>
                <h2 className="font-display text-lg font-extrabold text-[#111827]">
                  Nueva Reserva Operativa
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSheetNuevaAbierto(false)}
                aria-label="Cerrar ventana"
                className="ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] cursor-pointer"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={manejarCrearReservaMostrador} className="space-y-3.5">
              {/* Selección de Vehículo (Regla 16px: text-base) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Unidad de flota
                </label>
                <select
                  value={formVehiculoId}
                  onChange={(e) => setFormVehiculoId(e.target.value)}
                  className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3.5 py-2.5 text-base font-semibold text-[#111827] outline-none focus:ring-2 focus:ring-[#111827]"
                >
                  {FLOTA_CANONICA.map((veh) => (
                    <option key={veh.id} value={veh.id}>
                      {veh.marca} {veh.modelo} ({veh.placa}) ·{' '}
                      {formatCop(veh.precioDia)}/día
                    </option>
                  ))}
                </select>
              </div>

              {/* Rango de Fechas */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Entrega
                  </label>
                  <input
                    type="date"
                    value={formFechaInicio}
                    onChange={(e) => setFormFechaInicio(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2 text-base font-medium text-[#111827] outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Devolución
                  </label>
                  <input
                    type="date"
                    value={formFechaFin}
                    min={formFechaInicio}
                    onChange={(e) => setFormFechaFin(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2 text-base font-medium text-[#111827] outline-none focus:ring-2 focus:ring-[#111827]"
                  />
                </div>
              </div>

              {/* Datos del Conductor */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Nombre completo del conductor
                </label>
                <input
                  type="text"
                  placeholder="Ej. Andrés Felipe Mejía"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#111827]"
                />
              </div>

              <div className="grid grid-cols-[90px_1fr_84px] gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Tipo
                  </label>
                  <select
                    value={formTipoDoc}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'CC' || v === 'CE' || v === 'PASAPORTE') {
                        setFormTipoDoc(v);
                      }
                    }}
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-2.5 py-2.5 text-base font-semibold text-[#111827] outline-none"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">PAS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Documento
                  </label>
                  <input
                    type="text"
                    placeholder="1.037.654.321"
                    value={formNumDoc}
                    onChange={(e) => setFormNumDoc(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Licencia
                  </label>
                  <select
                    value={formLicencia}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (
                        v === 'B1' ||
                        v === 'B2' ||
                        v === 'A2' ||
                        v === 'C1'
                      ) {
                        setFormLicencia(v);
                      }
                    }}
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-2.5 py-2.5 text-base font-semibold text-[#111827] outline-none"
                  >
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="A2">A2</option>
                    <option value="C1">C1</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Teléfono móvil
                  </label>
                  <input
                    type="tel"
                    placeholder="+57 300 000 0000"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Modalidad
                  </label>
                  <select
                    value={formModalidad}
                    onChange={(e) =>
                      setFormModalidad(
                        e.target.value === 'DOMICILIO_MEDELLIN'
                          ? 'DOMICILIO_MEDELLIN'
                          : 'PATIO_PRINCIPAL'
                      )
                    }
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-2.5 py-2.5 text-base font-semibold text-[#111827] outline-none"
                  >
                    <option value="PATIO_PRINCIPAL">En Patio</option>
                    <option value="DOMICILIO_MEDELLIN">Domicilio</option>
                  </select>
                </div>
              </div>

              {/* Estado inicial y Abono */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setFormEstadoInicial((prev) =>
                      prev === 'CONFIRMADA' ? 'PENDIENTE' : 'CONFIRMADA'
                    )
                  }
                  className="min-h-[44px] rounded-[16px] bg-[#EDEDED]/80 px-3 py-2 text-left cursor-pointer"
                >
                  <span className="block text-[10px] font-medium text-[#4B5563]">
                    Estado inicial
                  </span>
                  <span className="font-display text-xs font-extrabold text-[#111827]">
                    {formEstadoInicial === 'CONFIRMADA'
                      ? 'Confirmada directa'
                      : 'Pendiente revisión'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormPorcentajeAbono((prev) => (prev === 100 ? 30 : 100))
                  }
                  className="min-h-[44px] rounded-[16px] bg-[#EDEDED]/80 px-3 py-2 text-left cursor-pointer"
                >
                  <span className="block text-[10px] font-medium text-[#4B5563]">
                    Recaudo en caja
                  </span>
                  <span className="font-display text-xs font-extrabold text-[#111827]">
                    {formPorcentajeAbono === 100
                      ? '100% Cancelado'
                      : 'Abono 30%'}
                  </span>
                </button>
              </div>

              {/* Resumen de liquidación y Submit */}
              <div className="flex items-center justify-between rounded-[18px] bg-[#EDEDED] px-4 py-3">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                    Total ({cotizacionRapidaPatio.dias} días · Incluye R2)
                  </span>
                  <span className="font-display text-base font-black text-[#111827] tabular-nums">
                    {formatCop(cotizacionRapidaPatio.total)}
                  </span>
                </div>
                <button
                  type="submit"
                  className="ios-press-bounce min-h-[44px] rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] cursor-pointer"
                >
                  Radicar reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
