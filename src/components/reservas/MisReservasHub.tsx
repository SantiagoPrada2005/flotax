import { useEffect, useMemo, useState, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  ENCABEZADOS_SEMANA_EDITORIAL,
  calcularDiasInclusivos,
  construirCalendarioSuizoReservas,
  formatearFechaCorta,
  formatearRangoReservaHumano,
  obtenerInfoDiaFechaISO,
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
  initialReservas?: ReservaClienteItem[] | undefined;
  vehiculosDisponibles?: { id: string; marca: string; modelo: string; anio: number; placa: string; precioDia: number; imagenUrl: string }[] | undefined;
  cuentasFinancieras?: Array<{ id: string; nombre: string; tipo: string }> | undefined;
}

type FiltroEstadoAdmin =
  | 'TODAS'
  | 'PENDIENTE'
  | 'CONFIRMADA'
  | 'EN_CURSO'
  | 'PAUSADA'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'RECHAZADA';

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
  PAUSADA: 'En pausa',
  COMPLETADA: 'Completada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export default function MisReservasHub({
  hoyISO,
  modo = 'cliente',
  abrirNuevaInicial = false,
  initialReservas,
  vehiculosDisponibles,
  cuentasFinancieras,
}: MisReservasHubProps) {
  const esAdmin = modo === 'admin';
  const catalogoVehiculos = vehiculosDisponibles ?? [];

  const [reservas, setReservas] = useState<ReservaClienteItem[]>(
    () => initialReservas ?? []
  );
  const [codigoActivo, setCodigoActivo] = useState<string>(
    initialReservas?.[0]?.codigo ?? ''
  );
  const [filtroInicioISO, setFiltroInicioISO] = useState<string | null>(null);
  const [filtroFinISO, setFiltroFinISO] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstadoAdmin>('TODAS');
  const [toastOperativo, setToastOperativo] = useState<string | null>(null);
  const [sheetNuevaAbierto, setSheetNuevaAbierto] =
    useState<boolean>(abrirNuevaInicial);

  // Estado del formulario rápido de mostrador (1 paso)
  const [formVehiculoId, setFormVehiculoId] = useState<string>(
    catalogoVehiculos[0]?.id ?? ''
  );
  const [formFechaInicio, setFormFechaInicio] = useState<string>(hoyISO);
  const [formFechaFin, setFormFechaFin] = useState<string>(() =>
    sumarDiasISO(hoyISO, 2)
  );
  const [formNombre, setFormNombre] = useState<string>('');
  const [formCorreo, setFormCorreo] = useState<string>('');
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
  const [cuentaPagoId, setCuentaPagoId] = useState<string>(
    cuentasFinancieras?.[0]?.id ?? ''
  );
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<
    'efectivo' | 'transferencia' | 'tarjeta'
  >('efectivo');

  // Búsqueda de clientes del local
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState<string>('');
  const [clientesEncontrados, setClientesEncontrados] = useState<
    Array<{
      id: string;
      nombre: string;
      correo: string;
      telefono: string | null;
      tipoDocumento: string | null;
      numeroDocumento: string | null;
      licenciaCategoria: string | null;
      estadoKyc: string;
    }>
  >([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [errorModalNueva, setErrorModalNueva] = useState<string | null>(null);
  const [submittingModalNueva, setSubmittingModalNueva] = useState(false);

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
    if (initialReservas) {
      setReservas(initialReservas);
      if (initialReservas[0] && !codigoActivo) {
        setCodigoActivo(initialReservas[0].codigo);
      }
    }
  }, [initialReservas]);

  const conteosPorEstado = useMemo(() => {
    let pendientes = 0;
    let confirmadas = 0;
    let enCurso = 0;
    let pausadas = 0;
    let completadas = 0;
    let canceladas = 0;
    let rechazadas = 0;
    for (const r of reservas) {
      if (r.estado === 'PENDIENTE') pendientes++;
      else if (r.estado === 'CONFIRMADA') confirmadas++;
      else if (r.estado === 'EN_CURSO') enCurso++;
      else if (r.estado === 'PAUSADA') pausadas++;
      else if (r.estado === 'COMPLETADA') completadas++;
      else if (r.estado === 'CANCELADA') canceladas++;
      else if (r.estado === 'RECHAZADA') rechazadas++;
    }
    return {
      todas: reservas.length,
      pendientes,
      confirmadas,
      enCurso,
      pausadas,
      completadas,
      canceladas,
      rechazadas,
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
        if (r.estado !== filtroEstado) {
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
      catalogoVehiculos.find((v) => v.id === formVehiculoId) ?? catalogoVehiculos[0]!;
    const inicio =
      formFechaInicio <= formFechaFin ? formFechaInicio : formFechaFin;
    const fin =
      formFechaFin >= formFechaInicio ? formFechaFin : formFechaInicio;
    const dias = calcularDiasInclusivos(inicio, fin);
    const subtotal = dias * veh.precioDia;
    const total = subtotal + Math.round(subtotal * 0.08);
    return { vehiculo: veh, dias, total };
  }, [catalogoVehiculos, formVehiculoId, formFechaInicio, formFechaFin]);

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
    try {
      const res = await actions.reservas.confirmarReserva({
        codigo: item.codigo,
        autorizarSinDocumentos: true,
        notaAutorizacion: 'Aprobación rápida desde agenda de patio',
      });

      if (res.error || !res.data?.ok) {
        mostrarAviso(`Error: ${res.error?.message ?? 'No fue posible confirmar'}`);
        return;
      }

      setReservas((prev) =>
        prev.map((r) =>
          r.codigo === item.codigo
            ? { ...r, estado: 'CONFIRMADA', estadoGarantia: 'CUSTODIA_ACTIVA' }
            : r
        )
      );
      setCodigoActivo(item.codigo);
      mostrarAviso(
        `Reserva #${item.codigo} confirmada · Lista para entrega R2`
      );
    } catch {
      mostrarAviso('Error de red al confirmar');
    }
  };

  const ejecutarBusquedaCliente = async (query: string) => {
    setBusquedaCliente(query);
    if (query.trim().length < 2) {
      setClientesEncontrados([]);
      return;
    }
    setBuscandoClientes(true);
    try {
      const res = await actions.reservas.buscarClientesLocal({ query: query.trim() });
      if (res.data?.ok && res.data.clientes) {
        setClientesEncontrados(res.data.clientes);
      }
    } catch {
      // Tolerante
    } finally {
      setBuscandoClientes(false);
    }
  };

  const seleccionarCliente = (cliente: {
    id: string;
    nombre: string;
    correo: string;
    telefono: string | null;
    tipoDocumento: string | null;
    numeroDocumento: string | null;
    licenciaCategoria: string | null;
  }) => {
    setClienteSeleccionadoId(cliente.id);
    setFormNombre(cliente.nombre);
    setFormCorreo(cliente.correo);
    if (cliente.telefono) setFormTelefono(cliente.telefono);
    if (
      cliente.tipoDocumento === 'CC' ||
      cliente.tipoDocumento === 'CE' ||
      cliente.tipoDocumento === 'PASAPORTE'
    ) {
      setFormTipoDoc(cliente.tipoDocumento);
    }
    if (cliente.numeroDocumento) setFormNumDoc(cliente.numeroDocumento);
    if (
      cliente.licenciaCategoria === 'B1' ||
      cliente.licenciaCategoria === 'B2' ||
      cliente.licenciaCategoria === 'A2' ||
      cliente.licenciaCategoria === 'C1'
    ) {
      setFormLicencia(cliente.licenciaCategoria);
    }
    setClientesEncontrados([]);
  };

  const limpiarClienteSeleccionado = () => {
    setClienteSeleccionadoId(null);
    setBusquedaCliente('');
  };

  const manejarCrearReservaMostrador = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorModalNueva(null);

    if (catalogoVehiculos.length === 0) {
      setErrorModalNueva('No hay vehículos disponibles en la flota de este patio.');
      return;
    }

    if (!formNombre.trim()) {
      setErrorModalNueva('El nombre del conductor es obligatorio.');
      return;
    }

    if (!formTelefono.trim()) {
      setErrorModalNueva('El teléfono de contacto es obligatorio.');
      return;
    }

    setSubmittingModalNueva(true);

    try {
      const subtotalTarifa = cotizacionRapidaPatio.dias * cotizacionRapidaPatio.vehiculo.precioDia;
      const coberturaPericial = Math.round(subtotalTarifa * 0.08);
      const totalCotizado = cotizacionRapidaPatio.total;
      const montoAbono =
        formPorcentajeAbono === 100
          ? totalCotizado
          : Math.round(totalCotizado * 0.3);

      const pagoConfirmado =
        formEstadoInicial === 'CONFIRMADA' && montoAbono > 0
          ? {
              monto: montoAbono,
              metodoPago: metodoPagoSeleccionado,
              cuentaId: cuentaPagoId || undefined,
              referencia: `Mostrador patio ${hoyISO}`,
            }
          : undefined;

      const res = await actions.reservas.crearReserva({
        vehiculoId: formVehiculoId,
        fechaInicio: formFechaInicio,
        fechaFin: formFechaFin,
        diasAlquiler: cotizacionRapidaPatio.dias,
        precioDiaCotizado: cotizacionRapidaPatio.vehiculo.precioDia,
        subtotalTarifaCotizado: subtotalTarifa,
        coberturaPericialCotizada: coberturaPericial,
        totalCotizado,
        modalidadEntrega: formModalidad,
        sedeNombre: 'Patio Principal',
        modalidadPagoInicial: formPorcentajeAbono === 100 ? 'TOTAL_100' : 'ABONO_30',
        metodoAbonoInicial: 'CAJA_PATIO',
        montoAbonoReportado: montoAbono,
        contactoNombre: formNombre.trim(),
        contactoTipoDocumento: formNumDoc.trim() ? formTipoDoc : undefined,
        contactoNumeroDocumento: formNumDoc.trim() || undefined,
        contactoCategoriaLicencia: formLicencia || undefined,
        contactoTelefono: formTelefono.trim(),
        contactoCorreo: formCorreo.trim() || undefined,
        clienteId: clienteSeleccionadoId ?? undefined,
        estadoInicial: formEstadoInicial,
        pagoConfirmadoInmediato: pagoConfirmado,
        ley1581Aceptada: true,
      });

      if (res.error || !res.data) {
        setErrorModalNueva(res.error?.message ?? 'No fue posible radicar la reserva en el servidor.');
        return;
      }

      const nuevaReserva = res.data.reserva;
      setReservas((prev) => [nuevaReserva, ...prev]);
      setCodigoActivo(nuevaReserva.codigo);
      setFiltroEstado('TODAS');
      setFiltroInicioISO(null);
      setFiltroFinISO(null);
      setSheetNuevaAbierto(false);
      setFormNombre('');
      setFormCorreo('');
      setFormNumDoc('');
      setFormTelefono('');
      setClienteSeleccionadoId(null);
      setBusquedaCliente('');
      setErrorModalNueva(null);

      const [y = 2026, m = 10] = nuevaReserva.fechaInicio.split('-').map(Number);
      setMesCursor({ anio: y, mesIndexCero: m - 1 });
      mostrarAviso(
        `Reserva #${nuevaReserva.codigo} radicada en D1 (${nuevaReserva.estado})`
      );
    } catch (err) {
      setErrorModalNueva(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al radicar la reserva.'
      );
    } finally {
      setSubmittingModalNueva(false);
    }
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
        className="w-full max-w-[430px] mx-auto md:mx-0 md:w-[360px] lg:w-[410px] xl:w-[440px] shrink-0 rounded-[28px] sm:rounded-[34px] bg-white dark:bg-[#1F2937] px-5 sm:px-6 pt-4 pb-4 shadow-[0_10px_28px_-16px_rgba(17,24,39,0.06)] border border-[#E5E4DF]/60 dark:border-white/10 md:sticky md:top-20 transition-colors"
      >
        {/* Barra Superior: Píldora Suave de Mes + Acción Rápida Admin + Controles */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#EDEDED]/80 dark:bg-white/10 px-3.5 py-2 text-xs font-semibold text-[#111827] dark:text-[#EDEDED] transition-colors">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              className="h-4 w-4 text-[#4B5563] dark:text-[#9CA3AF]"
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
                className="fx-press mr-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[#111827] dark:bg-white dark:text-[#111827] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1F2937] dark:hover:bg-[#EDEDED] cursor-pointer"
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
              className="fx-press flex h-11 w-11 items-center justify-center rounded-full text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED]/70 dark:hover:bg-white/10 cursor-pointer"
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
              className="fx-press flex h-11 w-11 items-center justify-center rounded-full text-[#111827] dark:text-[#EDEDED] hover:bg-[#EDEDED]/70 dark:hover:bg-white/10 cursor-pointer"
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
                ? 'bg-[#1F2937]/75 dark:bg-white/20 text-white font-semibold'
                : 'bg-transparent text-[#9CA3AF]/55 font-normal';
            } else if (esInicioFiltro || esFinFiltro) {
              clasesCirculo =
                'bg-[#111827] dark:bg-white text-white dark:text-[#111827] font-bold shadow-xs ring-2 ring-[#111827] dark:ring-white ring-offset-1 ring-offset-white dark:ring-offset-[#1F2937] z-10';
            } else if (esIntermedioFiltro) {
              clasesCirculo = 'bg-[#1F2937] dark:bg-white/30 text-white font-semibold z-10';
            } else if (enAlgunAlquiler) {
              clasesCirculo = celda.enReservaActiva
                ? 'bg-[#9CA3AF]/60 text-[#111827] dark:bg-white/25 dark:text-[#EDEDED] font-bold ring-1.5 ring-[#4B5563] dark:ring-white/40'
                : 'bg-[#9CA3AF]/45 text-[#111827] dark:bg-white/15 dark:text-[#EDEDED] font-semibold ring-1 ring-[#9CA3AF] dark:ring-white/20';
            } else {
              clasesCirculo =
                'bg-[#EDEDED]/65 dark:bg-white/5 text-[#4B5563] dark:text-[#9CA3AF] font-medium hover:bg-[#EDEDED] dark:hover:bg-white/10';
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
                      className={`absolute inset-y-1 bg-[#111827]/12 dark:bg-white/15 ${
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
                  className={`fx-press relative flex h-9 w-9 flex-col items-center justify-center rounded-full text-xs tabular-nums select-none cursor-pointer after:absolute after:-inset-y-1 after:inset-x-0 after:content-[''] ${clasesCirculo}`}
                >
                  <span>{celda.numeroDia}</span>
                  {enAlgunAlquiler && (
                    <span
                      aria-hidden="true"
                      className={`h-1.5 w-1.5 rounded-full ${
                        enRangoFiltro
                          ? 'bg-white/85'
                          : tienePendienteEnDia
                            ? 'bg-[#111827] dark:bg-white'
                            : 'bg-[#4B5563] dark:text-[#9CA3AF]'
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Leyenda compacta + Estado del filtro de doble selección */}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EDEDED] dark:border-white/10 pt-2.5 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]/60 ring-1 ring-[#4B5563]" />
              <span>{esAdmin ? 'En agenda' : 'Con alquiler'}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#111827] dark:bg-white" />
              <span>Filtro</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#111827] dark:text-[#EDEDED] tabular-nums">
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
                className="fx-press inline-flex min-h-[44px] items-center text-[10px] font-bold text-[#111827] dark:text-[#EDEDED] underline hover:text-[#4B5563] dark:hover:text-white cursor-pointer"
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
                  id: 'CONFIRMADA',
                  label: 'Confirmadas',
                  count: conteosPorEstado.confirmadas,
                },
                {
                  id: 'EN_CURSO',
                  label: 'En curso',
                  count: conteosPorEstado.enCurso,
                },
                {
                  id: 'PAUSADA',
                  label: 'En pausa',
                  count: conteosPorEstado.pausadas,
                },
                {
                  id: 'COMPLETADA',
                  label: 'Completadas',
                  count: conteosPorEstado.completadas,
                },
                {
                  id: 'CANCELADA',
                  label: 'Canceladas',
                  count: conteosPorEstado.canceladas,
                },
                {
                  id: 'RECHAZADA',
                  label: 'Rechazadas',
                  count: conteosPorEstado.rechazadas,
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
                  className={`fx-press shrink-0 inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold cursor-pointer ${
                    activo
                      ? 'bg-[#111827] text-white border border-transparent dark:bg-white dark:text-[#111827]'
                      : 'bg-white/75 text-[#4B5563] hover:bg-white hover:text-[#111827] dark:bg-[#1F2937] dark:text-[#EDEDED] dark:hover:bg-white/10 dark:hover:text-white border border-transparent dark:border-white/10'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] tabular-nums ${
                      activo
                        ? 'bg-white/20 text-white dark:bg-black/20 dark:text-[#111827]'
                        : 'bg-[#EDEDED] text-[#111827] dark:bg-white/10 dark:text-[#EDEDED]'
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
              <span className="block text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
                {hayFiltroActivo
                  ? 'FILTRO'
                  : esAdmin
                    ? 'AGENDA DE PATIO'
                    : 'AGENDA'}
              </span>
              <span
                key={`${infoDiaCabecera.numeroDia}-${infoDiaFinFiltro?.numeroDia ?? ''}`}
                className="block font-display text-2xl font-black leading-none text-[#111827] dark:text-[#EDEDED] tabular-nums"
              >
                {infoDiaFinFiltro
                  ? `${infoDiaCabecera.numeroDia}–${infoDiaFinFiltro.numeroDia}`
                  : infoDiaCabecera.numeroDia}
              </span>
              <span className="block text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                {infoDiaFinFiltro
                  ? `${infoDiaCabecera.diaSemanaCorto} – ${infoDiaFinFiltro.diaSemanaCorto}`
                  : infoDiaCabecera.diaSemanaCorto}
              </span>
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-[#111827] dark:text-[#EDEDED]">
                {alquileresMostrados.length}{' '}
                {alquileresMostrados.length === 1
                  ? 'reserva en vista'
                  : 'reservas en lista'}
              </p>
              {esAdmin && conteosPorEstado.pendientes > 0 && (
                <p className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                  {conteosPorEstado.pendientes} por verificar en patio
                </p>
              )}
            </div>
          </div>

          {hayFiltroActivo && (
            <button
              type="button"
              onClick={limpiarFiltro}
              className="fx-press inline-flex min-h-[44px] items-center rounded-full bg-[#111827] dark:bg-white dark:text-[#111827] px-3.5 py-1.5 text-[11px] font-semibold text-white cursor-pointer"
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
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      abrirDetalle(item);
                    }
                  }}
                  className={`fx-pressable group w-full rounded-[22px] p-4 cursor-pointer bg-white dark:bg-[#1F2937] border ${
                    esActiva
                      ? 'border-[#111827]/15 dark:border-white/20 shadow-sm ring-1 ring-[#111827]/10 dark:ring-white/10'
                      : 'border-[#E5E4DF] dark:border-white/10 hover:border-[#111827]/25 dark:hover:border-white/20 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Silueta vehicular con transparencia y brillo fiel */}
                    <div className="relative h-20 w-28 sm:h-22 sm:w-32 shrink-0 flex items-center justify-center">
                      <img
                        src={item.vehiculo.imagenUrl}
                        alt={`${item.vehiculo.marca} ${item.vehiculo.modelo}`}
                        className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                        loading="lazy"
                      />
                    </div>

                    {/* Contenido e información de la reserva */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
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
                              ? 'bg-[#111827] text-white border border-transparent dark:bg-white dark:text-[#111827]'
                              : item.estado === 'EN_CURSO'
                                ? 'bg-[#1F2937] text-white'
                                : 'bg-[#EDEDED] text-[#111827] dark:bg-white/10 dark:text-[#EDEDED]'
                          }`}
                        >
                          {ETIQUETA_ESTADO[item.estado]}
                        </span>
                        {esAdmin && (
                          <span className="font-mono text-[10px] text-[#4B5563] dark:text-[#9CA3AF]">
                            #{item.codigo}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-1 font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827] dark:text-[#EDEDED] uppercase truncate">
                        {item.vehiculo.marca} {item.vehiculo.modelo}
                      </h3>

                      {esAdmin ? (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-[11px] font-semibold text-[#1F2937] dark:text-[#EDEDED] truncate">
                            {item.conductor.nombreCompleto} ·{' '}
                            <span className="font-normal text-[#4B5563] dark:text-[#9CA3AF]">
                              {item.conductor.tipoDocumento}{' '}
                              {item.conductor.numeroDocumento} · Lic.{' '}
                              {item.conductor.categoriaLicencia}
                            </span>
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                              {item.vehiculo.placa} · Abonado {pctAbono}% ·{' '}
                              <span className="font-semibold text-[#111827] dark:text-[#EDEDED]">
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
                                onKeyDown={(e) => e.stopPropagation()}
                                className="fx-press inline-flex min-h-[44px] items-center rounded-full bg-[#111827] dark:bg-white dark:text-[#111827] px-3.5 py-1 text-[11px] font-bold text-white hover:bg-[#1F2937] dark:hover:bg-[#EDEDED] cursor-pointer"
                              >
                                Aprobar
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1 text-[12px] text-[#4B5563] dark:text-[#9CA3AF] tabular-nums">
                          {item.vehiculo.placa} ·{' '}
                          <span className="font-bold text-[#111827] dark:text-[#EDEDED]">
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
          <div className="rounded-[22px] bg-white/70 dark:bg-[#1F2937]/70 px-4 py-5 text-center space-y-2 border border-transparent dark:border-white/10">
            <p className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]">
              {filtroFinISO
                ? 'Sin reservas en este rango de fechas'
                : 'Sin reservas para el filtro seleccionado'}
            </p>
            {hayFiltroActivo && (
              <button
                type="button"
                onClick={limpiarFiltro}
                className="fx-press inline-flex min-h-[44px] items-center rounded-full bg-[#111827] px-4 py-1.5 text-xs font-semibold text-white cursor-pointer"
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
          <div className="[--fx-border-focus:#111827] w-full max-w-[430px] rounded-t-[32px] sm:rounded-[32px] bg-white p-5 shadow-2xl max-h-[90dvh] overflow-y-auto space-y-4">
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
                className="fx-press flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] cursor-pointer"
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
              {/* Error inline accesible */}
              {errorModalNueva && (
                <div
                  role="alert"
                  className="rounded-[16px] bg-[#111827] text-white p-3 text-xs flex items-center justify-between gap-2"
                >
                  <span>{errorModalNueva}</span>
                  <button
                    type="button"
                    onClick={() => setErrorModalNueva(null)}
                    aria-label="Cerrar aviso de error"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#9CA3AF] hover:text-white font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Selección de Vehículo (Regla 16px: text-base) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Unidad de flota
                </label>
                {catalogoVehiculos.length === 0 ? (
                  <div className="rounded-[16px] bg-[#EDEDED] border border-[#9CA3AF]/40 p-4 text-center space-y-2">
                    <p className="text-xs font-bold text-[#111827]">
                      No hay unidades disponibles en este patio
                    </p>
                    <a
                      href="/admin/flota"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white hover:bg-[#1F2937]"
                    >
                      Ir a gestión de flota
                    </a>
                  </div>
                ) : (
                  <select
                    value={formVehiculoId}
                    onChange={(e) => setFormVehiculoId(e.target.value)}
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3.5 py-2.5 text-base font-semibold text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  >
                    {catalogoVehiculos.map((veh) => (
                      <option key={veh.id} value={veh.id}>
                        {veh.marca} {veh.modelo} ({veh.placa}) ·{' '}
                        {formatCop(veh.precioDia)}/día
                      </option>
                    ))}
                  </select>
                )}
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
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2 text-base font-medium text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
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
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2 text-base font-medium text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  />
                </div>
              </div>

              {/* Buscador de Clientes del Local / KYC */}
              <div className="rounded-[18px] bg-[#EDEDED]/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#111827]">
                    Buscador de clientes (Local)
                  </span>
                  {clienteSeleccionadoId && (
                    <button
                      type="button"
                      onClick={limpiarClienteSeleccionado}
                      className="text-[10px] font-semibold text-[#4B5563] hover:text-[#111827] underline cursor-pointer"
                    >
                      Modo presencial / Walk-in
                    </button>
                  )}
                </div>

                {!clienteSeleccionadoId ? (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      placeholder="Buscar por nombre, correo o documento..."
                      value={busquedaCliente}
                      onChange={(e) => ejecutarBusquedaCliente(e.target.value)}
                      className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-3 py-2 text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#111827]"
                    />
                    {buscandoClientes && (
                      <p className="text-[11px] text-[#4B5563]">Buscando clientes...</p>
                    )}
                    {clientesEncontrados.length > 0 && (
                      <ul className="rounded-[12px] bg-white border border-[#9CA3AF]/40 divide-y divide-[#9CA3AF]/20 max-h-36 overflow-y-auto">
                        {clientesEncontrados.map((c) => (
                          <li key={c.id}>
                            <button
                              type="button"
                              onClick={() => seleccionarCliente(c)}
                              className="w-full p-2.5 text-left hover:bg-[#EDEDED] flex items-center justify-between text-xs cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-[#111827] truncate">{c.nombre}</p>
                                <p className="text-[10px] text-[#4B5563] truncate">
                                  {c.numeroDocumento ? `Doc: ${c.numeroDocumento} · ` : ''}{c.correo}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 ml-2 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                  c.estadoKyc === 'APROBADO'
                                    ? 'bg-[#111827] text-white'
                                    : c.estadoKyc === 'PENDIENTE'
                                      ? 'bg-[#EDEDED] text-[#4B5563] border border-[#9CA3AF]/60'
                                      : 'bg-[#EDEDED] text-[#4B5563]'
                                }`}
                              >
                                {c.estadoKyc === 'APROBADO'
                                  ? 'KYC OK'
                                  : c.estadoKyc === 'PENDIENTE'
                                    ? 'En revisión'
                                    : 'Sin docs'}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-[12px] bg-white border border-[#9CA3AF]/30 p-2.5 text-xs">
                    <div>
                      <p className="font-bold text-[#111827]">{formNombre}</p>
                      <p className="text-[11px] text-[#4B5563]">
                        {formNumDoc ? `${formTipoDoc} ${formNumDoc} · ` : ''}{formCorreo}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#111827] text-white px-2 py-0.5 text-[10px] font-bold">
                      Cliente vinculado
                    </span>
                  </div>
                )}
              </div>

              {/* Datos del Conductor (Modo Walk-in: solo nombre y teléfono obligatorios) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Nombre completo del conductor <span className="text-[#111827]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej. Andrés Felipe Mejía"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  required
                  className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3.5 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#111827]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Teléfono móvil <span className="text-[#111827]">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="+57 300 000 0000"
                    value={formTelefono}
                    onChange={(e) => setFormTelefono(e.target.value)}
                    required
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Correo electrónico (opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={formCorreo}
                    onChange={(e) => setFormCorreo(e.target.value)}
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[90px_1fr_84px] gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Tipo doc.
                  </label>
                  <select
                    value={formTipoDoc}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'CC' || v === 'CE' || v === 'PASAPORTE') {
                        setFormTipoDoc(v);
                      }
                    }}
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-2.5 py-2.5 text-base font-semibold text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  >
                    <option value="CC">CC</option>
                    <option value="CE">CE</option>
                    <option value="PASAPORTE">PAS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Documento (opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="1.037.654.321"
                    value={formNumDoc}
                    onChange={(e) => setFormNumDoc(e.target.value)}
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-3 py-2.5 text-base text-[#111827] placeholder:text-[#9CA3AF] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                    Licencia (opc.)
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
                    className="w-full rounded-[14px] bg-[#EDEDED]/75 px-2.5 py-2.5 text-base font-semibold text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                  >
                    <option value="B1">B1</option>
                    <option value="B2">B2</option>
                    <option value="A2">A2</option>
                    <option value="C1">C1</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4B5563] mb-1">
                  Modalidad de entrega
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
                  className="w-full rounded-[14px] bg-[#EDEDED]/75 px-2.5 py-2.5 text-base font-semibold text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                >
                  <option value="PATIO_PRINCIPAL">En Patio</option>
                  <option value="DOMICILIO_MEDELLIN">Domicilio</option>
                </select>
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
                  className="min-h-[44px] rounded-[16px] bg-[#EDEDED]/80 px-3 py-2 text-left cursor-pointer border border-[#9CA3AF]/30"
                >
                  <span className="block text-[10px] font-medium text-[#4B5563]">
                    Estado inicial
                  </span>
                  <span className="font-display text-xs font-extrabold text-[#111827]">
                    {formEstadoInicial === 'CONFIRMADA'
                      ? '✓ Confirmada directa'
                      : 'Pendiente revisión'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setFormPorcentajeAbono((prev) => (prev === 100 ? 30 : 100))
                  }
                  className="min-h-[44px] rounded-[16px] bg-[#EDEDED]/80 px-3 py-2 text-left cursor-pointer border border-[#9CA3AF]/30"
                >
                  <span className="block text-[10px] font-medium text-[#4B5563]">
                    Recaudo en mostrador
                  </span>
                  <span className="font-display text-xs font-extrabold text-[#111827]">
                    {formPorcentajeAbono === 100
                      ? '100% Cancelado'
                      : 'Abono 30%'}
                  </span>
                </button>
              </div>

              {/* Cuenta financiera para recaudo inmediato */}
              {formEstadoInicial === 'CONFIRMADA' && cuentasFinancieras && cuentasFinancieras.length > 0 && (
                <div className="rounded-[16px] bg-[#EDEDED]/80 p-3 space-y-2 border border-[#9CA3AF]/30">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#111827]">
                      Asentar recaudo en caja
                    </span>
                    <span className="text-[10px] text-[#4B5563]">
                      Cuenta operativa
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={cuentaPagoId}
                      onChange={(e) => setCuentaPagoId(e.target.value)}
                      className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-2.5 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                    >
                      {cuentasFinancieras.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} ({c.tipo})
                        </option>
                      ))}
                    </select>
                    <select
                      value={metodoPagoSeleccionado}
                      onChange={(e) =>
                        setMetodoPagoSeleccionado(
                          e.target.value as 'efectivo' | 'transferencia' | 'tarjeta'
                        )
                      }
                      className="w-full rounded-[12px] bg-white border border-[#9CA3AF]/40 px-2.5 py-2 text-base text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia / PSE</option>
                      <option value="tarjeta">Tarjeta Datáfono</option>
                    </select>
                  </div>
                </div>
              )}

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
                  disabled={submittingModalNueva || catalogoVehiculos.length === 0}
                  className="min-h-[44px] rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                >
                  {submittingModalNueva ? 'Radicando...' : 'Radicar reserva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
