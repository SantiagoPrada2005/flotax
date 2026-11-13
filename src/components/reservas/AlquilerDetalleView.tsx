import { useEffect, useMemo, useState } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  formatearRangoReservaHumano,
  obtenerPuntosInspeccionPorVehiculo,
  obtenerRubrosWaybillReserva,
  type EstadoPuntoR2,
  type EstadoReservaCliente,
  type PuntoInspeccionR2,
  type ReservaClienteItem,
} from '@/lib/flota';
import type { CapacidadesOperacionAlquiler } from '@/lib/auth/capacidades-alquiler';
import SemaforoDocumentalPanel from './SemaforoDocumentalPanel';
import {
  ModalPausar,
  ModalProrrogar,
  ModalDevolverCerrar,
  ModalCancelarAnular,
} from './AlquilerCicloModals';

export interface AlquilerDetalleViewProps {
  codigo: string;
  reservaInicial: ReservaClienteItem;
  hoyISO: string;
  modo?: 'cliente' | 'admin' | undefined;
  capacidades?: CapacidadesOperacionAlquiler | undefined;
  cuentasFinancieras?: Array<{ id: string; nombre: string; tipo: string }> | undefined;
  tokenAccesoPublico?: string | null | undefined;
}

type TabDetalleAlquiler = 'INSPECCION' | 'WAYBILL' | 'HIGHLIGHTS';

const TOTAL_TICKS_BARRA = 28;

const ETIQUETA_ESTADO_CABECERA: Readonly<
  Record<EstadoReservaCliente, string>
> = {
  PENDIENTE: 'Solicitud pendiente de revisión',
  CONFIRMADA: 'Confirmada · Lista para entrega R2',
  EN_CURSO: 'En curso · Unidad en ruta',
  PAUSADA: 'Alquiler en pausa',
  COMPLETADA: 'Completada · Contrato cerrado',
  RECHAZADA: 'Solicitud rechazada',
  CANCELADA: 'Reserva cancelada',
};

const formatCop = (val: number): string =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val);

export default function AlquilerDetalleView({
  codigo: _codigo,
  reservaInicial,
  hoyISO: _hoyISO,
  modo = 'cliente',
  capacidades,
  cuentasFinancieras = [],
  tokenAccesoPublico,
}: AlquilerDetalleViewProps) {
  const esAdmin = modo === 'admin';

  const [reserva, setReserva] = useState<ReservaClienteItem>(reservaInicial);
  const [tabActiva, setTabActiva] = useState<TabDetalleAlquiler>('INSPECCION');
  const [puntoActivoId, setPuntoActivoId] = useState<string>('r2-carroceria');
  const [rubroActivoId, setRubroActivoId] = useState<string>('total-contrato');

  // Estados de interactividad operativa y modales RBAC
  const [toastMensaje, setToastMensaje] = useState<string | null>(null);
  const [editandoDictamen, setEditandoDictamen] = useState<boolean>(false);
  const [borradorDictamen, setBorradorDictamen] = useState<string>('');
  const [metodoCobroSaldo, setMetodoCobroSaldo] = useState<
    'efectivo' | 'transferencia' | 'tarjeta'
  >('transferencia');
  const [cuentaCobroId, setCuentaCobroId] = useState<string>(
    cuentasFinancieras?.[0]?.id ?? ''
  );
  const [autorizarSinDocumentos, setAutorizarSinDocumentos] = useState<boolean>(false);
  const [modalPausarAbierto, setModalPausarAbierto] = useState<boolean>(false);
  const [modalProrrogarAbierto, setModalProrrogarAbierto] = useState<boolean>(false);
  const [modalDevolverAbierto, setModalDevolverAbierto] = useState<boolean>(false);
  const [modalCancelarAbierto, setModalCancelarAbierto] = useState<boolean>(false);
  const [tipoModalCancelar, setTipoModalCancelar] = useState<
    'CANCELAR' | 'ANULAR' | 'RECHAZAR'
  >('CANCELAR');
  const [operacionCargando, setOperacionCargando] = useState<boolean>(false);
  const [errorOperacion, setErrorOperacion] = useState<string | null>(null);

  const mostrarAviso = (texto: string) => {
    setToastMensaje(texto);
    window.setTimeout(() => {
      setToastMensaje(null);
    }, 3600);
  };

  useEffect(() => {
    setReserva(reservaInicial);
  }, [reservaInicial]);

  const { vehiculo, specsBento } = reserva;

  const puntosR2 = useMemo(
    () => obtenerPuntosInspeccionPorVehiculo(vehiculo, reserva),
    [vehiculo, reserva]
  );

  const puntoSeleccionado = useMemo(
    () => puntosR2.find((p) => p.id === puntoActivoId) ?? puntosR2[0]!,
    [puntosR2, puntoActivoId]
  );

  const cantidadNovedadesR2 = useMemo(
    () => puntosR2.filter((p) => p.estado === 'NOVEDAD').length,
    [puntosR2]
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

  const saldoPatioPendiente = Math.max(
    0,
    reserva.totalAlquiler - reserva.montoReportado
  );

  const pctAbonado = Math.min(
    100,
    Math.round(
      (reserva.montoReportado / Math.max(1, reserva.totalAlquiler)) * 100
    )
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
    (Math.min(100, Math.max(15, rubroSeleccionado.porcentajeSobreTotal)) /
      100) *
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

  const guardarCambioReserva = (actualizada: ReservaClienteItem) => {
    setReserva(actualizada);
  };

  // --- Acciones Operativas Estación 1: Inspección R2 ---
  const persistirInspeccionR2EnD1 = async (
    puntos: PuntoInspeccionR2[],
    km: number,
    carga: number
  ) => {
    try {
      const res = await actions.reservas.guardarInspeccionR2({
        reservaId: reserva.codigo,
        tipoActo:
          reserva.estado === 'EN_CURSO' || reserva.estado === 'COMPLETADA'
            ? 'RECEPCION'
            : 'ENTREGA',
        medidorUso: km,
        nivelEnergiaPct: carga,
        puntosR2: puntos.map((p) => ({
          zona: p.zona,
          etiqueta: p.etiqueta,
          dictamen: p.dictamen,
          estado: p.estado,
          coordX: p.coordX,
          coordY: p.coordY,
        })),
      });
      if (res?.error) {
        setErrorOperacion(res.error.message ?? 'No se pudo guardar la inspección en D1');
        mostrarAviso('Error al guardar inspección en D1');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de conexión al persistir inspección';
      setErrorOperacion(msg);
      mostrarAviso(msg);
    }
  };

  const cambiarEstadoPuntoR2 = (nuevoEstado: EstadoPuntoR2) => {
    const etiquetaSugerida =
      nuevoEstado === 'NOVEDAD'
        ? 'Novedad registrada en patio'
        : nuevoEstado === 'VERIFICADO'
          ? 'Verificado OK en patio'
          : 'Original sin novedades';

    const nuevosPuntos: PuntoInspeccionR2[] = puntosR2.map((p) =>
      p.id === puntoSeleccionado.id
        ? {
            ...p,
            estado: nuevoEstado,
            etiqueta: etiquetaSugerida,
          }
        : p
    );

    guardarCambioReserva({
      ...reserva,
      puntosR2Custom: nuevosPuntos,
    });
    persistirInspeccionR2EnD1(
      nuevosPuntos,
      reserva.kilometrajeEntrega,
      reserva.nivelCargaPorcentaje
    );
    mostrarAviso(`Punto "${puntoSeleccionado.zona}" marcado como ${etiquetaSugerida}`);
  };

  const abrirEdicionDictamen = () => {
    setBorradorDictamen(puntoSeleccionado.dictamen);
    setEditandoDictamen(true);
  };

  const guardarDictamenEditado = () => {
    if (!borradorDictamen.trim()) {
      setEditandoDictamen(false);
      return;
    }
    const nuevosPuntos: PuntoInspeccionR2[] = puntosR2.map((p) =>
      p.id === puntoSeleccionado.id
        ? { ...p, dictamen: borradorDictamen.trim() }
        : p
    );
    guardarCambioReserva({
      ...reserva,
      puntosR2Custom: nuevosPuntos,
    });
    setEditandoDictamen(false);
    persistirInspeccionR2EnD1(
      nuevosPuntos,
      reserva.kilometrajeEntrega,
      reserva.nivelCargaPorcentaje
    );
    mostrarAviso('Dictamen pericial R2 actualizado');
  };

  const ajustarTelemetriaPatio = (deltaKm: number, deltaCarga: number) => {
    const nuevoKm = Math.max(0, reserva.kilometrajeEntrega + deltaKm);
    const nuevaCarga = Math.min(
      100,
      Math.max(10, reserva.nivelCargaPorcentaje + deltaCarga)
    );
    const nuevosPuntos: PuntoInspeccionR2[] = puntosR2.map((p) =>
      p.id === 'r2-telemetria'
        ? {
            ...p,
            etiqueta: `Lectura: ${nuevoKm.toLocaleString('es-CO')} km · ${nuevaCarga}%`,
            dictamen: `Odómetro verificado en ${nuevoKm.toLocaleString('es-CO')} km con nivel de energía/combustible al ${nuevaCarga}%`,
          }
        : p
    );

    guardarCambioReserva({
      ...reserva,
      kilometrajeEntrega: nuevoKm,
      nivelCargaPorcentaje: nuevaCarga,
      puntosR2Custom: nuevosPuntos,
    });
    persistirInspeccionR2EnD1(nuevosPuntos, nuevoKm, nuevaCarga);
  };

  // --- Acciones Operativas Estación 2: Waybill & Caja ---
  const asentarCobroSaldoPatio = async () => {
    if (saldoPatioPendiente <= 0 || operacionCargando) return;
    setOperacionCargando(true);
    setErrorOperacion(null);
    try {
      const res = await actions.reservas.registrarCobroWaybill({
        codigo: reserva.codigo,
        monto: saldoPatioPendiente,
        metodoPago: metodoCobroSaldo,
        cuentaId: cuentaCobroId || undefined,
      });

      if (res.error) {
        setErrorOperacion(res.error.message);
        mostrarAviso(`Error cobro: ${res.error.message}`);
      } else {
        const montoCobrado = saldoPatioPendiente;
        const actualizada: ReservaClienteItem = {
          ...reserva,
          montoReportado: reserva.totalAlquiler,
        };
        guardarCambioReserva(actualizada);
        setRubroActivoId('abono-verificado');
        mostrarAviso(
          `Cobro de ${formatCop(montoCobrado)} (${metodoCobroSaldo}) asentado · 100% pagado`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error inesperado al registrar cobro.';
      setErrorOperacion(msg);
      mostrarAviso(msg);
    } finally {
      setOperacionCargando(false);
    }
  };


  // --- Acciones Operativas Ciclo de Vida (Máquina de Estados D1) ---
  const confirmarReservaOperativa = async () => {
    if (operacionCargando) return;
    setOperacionCargando(true);
    setErrorOperacion(null);
    try {
      const res = await actions.reservas.confirmarReserva({
        codigo: reserva.codigo,
        autorizarSinDocumentos,
        notaAutorizacion: autorizarSinDocumentos
          ? 'Confirmación autorizada bajo responsabilidad del local en patio'
          : undefined,
      });

      if (res.error) {
        setErrorOperacion(res.error.message);
        mostrarAviso(res.error.message);
      } else if (res.data?.requiereAutorizacionSinDocs) {
        const adv = res.data.advertencias;
        const listaDetalles = [
          ...(adv?.cliente?.detalles ?? []),
          ...(adv?.vehiculo?.detalles ?? []),
        ];
        const detalle = listaDetalles.join(', ') || 'Documentación incompleta.';
        setErrorOperacion(
          `${detalle} Marca la casilla "Autorizar operación bajo responsabilidad del local" para continuar.`
        );
        mostrarAviso('Documentación pendiente');
      } else if (res.data?.reserva) {
        guardarCambioReserva({
          ...reserva,
          estado: 'CONFIRMADA',
        });
        mostrarAviso(`Reserva #${reserva.codigo} confirmada exitosamente`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al confirmar la reserva';
      setErrorOperacion(msg);
      mostrarAviso(msg);
    } finally {
      setOperacionCargando(false);
    }
  };

  const entregarVehiculoOperativo = async () => {
    if (operacionCargando) return;
    setOperacionCargando(true);
    setErrorOperacion(null);
    try {
      const res = await actions.reservas.entregarVehiculo({
        codigo: reserva.codigo,
        medidorUsoEntrega: reserva.kilometrajeEntrega,
        nivelEnergiaEntregaPct: reserva.nivelCargaPorcentaje,
        autorizarSinDocumentos,
        notaAutorizacion: autorizarSinDocumentos
          ? 'Entrega autorizada bajo responsabilidad del local'
          : undefined,
      });

      if (res.error) {
        setErrorOperacion(res.error.message);
        mostrarAviso(res.error.message);
      } else if (res.data?.reserva) {
        guardarCambioReserva({
          ...reserva,
          estado: 'EN_CURSO',
          kilometrajeEntrega:
            res.data.reserva.kilometrajeEntrega ?? reserva.kilometrajeEntrega,
        });
        mostrarAviso(
          `Vehículo entregado · Contrato vigente · Unidad ${vehiculo.placa} en ruta`
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al entregar el vehículo';
      setErrorOperacion(msg);
      mostrarAviso(msg);
    } finally {
      setOperacionCargando(false);
    }
  };

  const reanudarAlquilerOperativo = async () => {
    if (operacionCargando) return;
    setOperacionCargando(true);
    setErrorOperacion(null);
    try {
      const res = await actions.reservas.reanudarAlquiler({
        codigo: reserva.codigo,
      });

      if (res.error) {
        setErrorOperacion(res.error.message);
        mostrarAviso(res.error.message);
      } else if (res.data?.reserva) {
        guardarCambioReserva({
          ...reserva,
          estado: 'EN_CURSO',
        });
        mostrarAviso('Alquiler reanudado · Unidad de nuevo en curso');
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al reanudar el alquiler';
      setErrorOperacion(msg);
      mostrarAviso(msg);
    } finally {
      setOperacionCargando(false);
    }
  };

  const reabrirReservaOperativa = async () => {
    if (operacionCargando) return;
    setOperacionCargando(true);
    setErrorOperacion(null);
    try {
      const res = await actions.reservas.reabrirReserva({
        codigo: reserva.codigo,
        motivoReapertura: 'Reapertura operativa desde patio',
      });

      if (res.error) {
        setErrorOperacion(res.error.message);
        mostrarAviso(res.error.message);
      } else if (res.data?.reserva) {
        guardarCambioReserva({
          ...reserva,
          estado: 'PENDIENTE',
        });
        mostrarAviso(`Reserva #${reserva.codigo} reabierta para revisión`);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Error al reabrir la reserva';
      setErrorOperacion(msg);
      mostrarAviso(msg);
    } finally {
      setOperacionCargando(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-7.5rem)] pb-8">
      {/* Toast Operativo */}
      {toastMensaje && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-xs font-semibold text-white shadow-lg animate-fade-up"
        >
          <span className="h-2 w-2 rounded-full bg-[#EDEDED]" />
          <span>{toastMensaje}</span>
        </div>
      )}

      {/* Grid Responsivo: 1 Columna en móvil, 2 Columnas Cockpit en Desktop */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
        {/* Columna Izquierda (En PC): Cabecera + Escenario 3D de Inspección R2 */}
        <div className="w-full lg:w-7/12 xl:w-3/5 space-y-5 lg:sticky lg:top-20">
          {/* =====================================================================
              ZONA 1: CABECERA EDITORIAL Y PÍLDORAS DIRECTAS SOBRE EL LIENZO MÓVIL
              ===================================================================== */}
          <header className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold tracking-tight text-[#111827] leading-[1.08]">
            {vehiculo.marca}
            <span className="block font-bold text-[#1F2937]">
              {vehiculo.modelo}
            </span>
          </h1>

          {esAdmin && (
            <span
              className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                reserva.estado === 'PENDIENTE'
                  ? 'bg-[#111827] text-white'
                  : reserva.estado === 'EN_CURSO'
                    ? 'bg-[#1F2937] text-white'
                    : 'bg-white text-[#111827]'
              }`}
            >
              {ETIQUETA_ESTADO_CABECERA[reserva.estado]}
            </span>
          )}
        </div>

        {/* Píldoras Suaves sin Bordes sobre el Lienzo #EDEDED */}
        <div className="flex flex-wrap items-center gap-1.5">
          {esAdmin && (
            <button
              type="button"
              onClick={() => setTabActiva('HIGHLIGHTS')}
              className="ios-press-bounce rounded-full bg-[#111827] px-3 py-1 text-[11px] font-semibold text-white cursor-pointer"
            >
              {reserva.conductor.nombreCompleto} · Lic.{' '}
              {reserva.conductor.categoriaLicencia}
            </button>
          )}
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
          ===================================================================== */}
      <section
        aria-label={`Escenario de inspección de ${vehiculo.marca} ${vehiculo.modelo}`}
        className="relative my-auto flex items-center justify-center py-5 min-h-[205px]"
      >
        <div className="relative w-full pr-12">
          <img
            src={vehiculo.imagenUrl}
            alt={`${vehiculo.marca} ${vehiculo.modelo}`}
            className="w-full max-h-48 sm:max-h-52 object-contain mx-auto drop-shadow-[0_18px_26px_rgba(17,24,39,0.18)]"
          />
          <div
            aria-hidden="true"
            className="mx-auto -mt-2 h-3.5 w-4/5 rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(17,24,39,0.20)_0%,_transparent_75%)]"
          />

          {/* Puntos Interactivos R2 sobre la Silueta del Vehículo */}
          {puntosR2.map((punto) => {
            const activo = puntoSeleccionado.id === punto.id;
            const tieneNovedad = punto.estado === 'NOVEDAD';
            return (
              <button
                key={punto.id}
                type="button"
                onClick={() => {
                  setPuntoActivoId(punto.id);
                  setTabActiva('INSPECCION');
                  setEditandoDictamen(false);
                }}
                style={{ left: punto.coordX, top: punto.coordY }}
                aria-label={`Inspección: ${punto.zona}`}
                className={`ios-press-bounce absolute -translate-x-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full transition-transform cursor-pointer ${
                  activo
                    ? 'bg-[#111827] text-white ring-4 ring-white/85 scale-110 z-20'
                    : tieneNovedad
                      ? 'bg-[#1F2937] text-white ring-2 ring-white z-10'
                      : 'bg-white/90 text-[#111827] hover:scale-105 z-10'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    activo || tieneNovedad ? 'bg-white' : 'bg-[#111827]'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Insignia Inferior Izquierda: Silueta y Placa */}
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

        {/* Cápsula Vertical Flotante Derecha (3 Estaciones) */}
        <div
          role="toolbar"
          aria-label="Cambiar estación de trabajo del alquiler"
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
            aria-label={
              esAdmin ? 'Expediente del conductor y ficha' : 'Ficha Técnica'
            }
            aria-pressed={tabActiva === 'HIGHLIGHTS'}
            className={`ios-press-bounce flex h-10 w-10 items-center justify-center rounded-full transition-colors cursor-pointer ${
              tabActiva === 'HIGHLIGHTS'
                ? 'bg-[#111827] text-white'
                : 'bg-white/80 text-[#111827] hover:bg-white'
            }`}
          >
            {esAdmin ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
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
            )}
          </button>
        </div>
      </section>
    </div>

    {/* Columna Derecha (En PC): Panel Blanco de Estaciones (Inspección, Waybill, Highlights) */}
    <div className="w-full lg:w-5/12 xl:w-2/5">
          {/* =====================================================================
              ZONA 3: ÚNICA LÁMINA BLANCA + ESTACIÓN ACTIVA + CICLO DE VIDA
              ===================================================================== */}
          <section
            aria-label="Panel inferior del alquiler"
            className="rounded-[32px] bg-white p-5 sm:p-6 shadow-[0_10px_30px_-15px_rgba(17,24,39,0.06)] border border-[#E5E4DF]/70 space-y-4"
          >
        {/* -------------------------------------------------------------------
            VISTA 1: INSPECCIÓN PERICIAL & BARRA DE CONFIANZA
            ------------------------------------------------------------------- */}
        {tabActiva === 'INSPECCION' && (
          <div className="space-y-3.5 animate-fade-up">
            {/* Cabecera de zona + Botón Circular ↗ */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-bold text-[#111827] truncate">
                    {puntoSeleccionado.zona}
                  </h2>
                  {esAdmin && (
                    <button
                      type="button"
                      onClick={abrirEdicionDictamen}
                      className="rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[10px] font-bold text-[#111827] hover:bg-[#9CA3AF]/40 cursor-pointer"
                    >
                      Editar nota
                    </button>
                  )}
                </div>

                {esAdmin && editandoDictamen ? (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={borradorDictamen}
                      onChange={(e) => setBorradorDictamen(e.target.value)}
                      className="flex-1 min-h-[44px] rounded-[12px] bg-[#EDEDED] px-3 py-1.5 text-base text-[#111827] outline-none"
                    />
                    <button
                      type="button"
                      onClick={guardarDictamenEditado}
                      className="min-h-[44px] rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white cursor-pointer"
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <p className="mt-0.5 text-xs text-[#4B5563] leading-relaxed">
                    {puntoSeleccionado.dictamen}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={ciclarVista}
                aria-label="Ver liquidación Waybill"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#EDEDED]/75 text-[#111827] hover:bg-[#EDEDED] cursor-pointer"
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

            {/* Selector Horizontal Ligero de Zonas */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {puntosR2.map((punto) => {
                const activo = puntoSeleccionado.id === punto.id;
                return (
                  <button
                    key={punto.id}
                    type="button"
                    onClick={() => {
                      setPuntoActivoId(punto.id);
                      setEditandoDictamen(false);
                    }}
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

            {/* Controles de Dictamen R2 y Telemetría (Solo Admin) */}
            {esAdmin && (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-[#EDEDED]/65 px-3 py-2">
                  <span className="text-[11px] font-semibold text-[#4B5563]">
                    Dictamen del punto:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        { id: 'VERIFICADO', label: 'Verificado OK' },
                        { id: 'ORIGINAL', label: 'Original R2' },
                        { id: 'NOVEDAD', label: 'Con novedad' },
                      ] as const
                    ).map((op) => {
                      const esActual = puntoSeleccionado.estado === op.id;
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => cambiarEstadoPuntoR2(op.id)}
                          className={`ios-press-bounce rounded-full px-2.5 py-1 text-[10px] font-bold transition-colors cursor-pointer ${
                            esActual
                              ? 'bg-[#111827] text-white'
                              : 'bg-white text-[#4B5563] hover:text-[#111827]'
                          }`}
                        >
                          {op.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ajuste Rápido de Odómetro y Carga cuando está en el punto de telemetría */}
                {puntoSeleccionado.id === 'r2-telemetria' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between rounded-[16px] bg-[#EDEDED]/65 px-3 py-2">
                      <div>
                        <span className="block text-[10px] text-[#4B5563]">
                          Odómetro patio
                        </span>
                        <span className="font-mono text-xs font-bold text-[#111827] tabular-nums">
                          {reserva.kilometrajeEntrega.toLocaleString('es-CO')} km
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => ajustarTelemetriaPatio(-50, 0)}
                          aria-label="Restar 50 km"
                          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white text-xs font-bold text-[#111827] cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => ajustarTelemetriaPatio(50, 0)}
                          aria-label="Sumar 50 km"
                          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-[16px] bg-[#EDEDED]/65 px-3 py-2">
                      <div>
                        <span className="block text-[10px] text-[#4B5563]">
                          Carga / Tanque
                        </span>
                        <span className="font-mono text-xs font-bold text-[#111827] tabular-nums">
                          {reserva.nivelCargaPorcentaje}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => ajustarTelemetriaPatio(0, -10)}
                          aria-label="Restar 10% de carga"
                          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-white text-xs font-bold text-[#111827] cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => ajustarTelemetriaPatio(0, 10)}
                          aria-label="Sumar 10% de carga"
                          className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-white cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Barra de 28 Trazos Verticales */}
            <div className="pt-0.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#111827]">
                <span>{puntosR2.length} verificaciones R2</span>
                <span>
                  {cantidadNovedadesR2 === 0
                    ? '0 novedades'
                    : `${cantidadNovedadesR2} ${
                        cantidadNovedadesR2 === 1 ? 'novedad' : 'novedades'
                      }`}
                </span>
              </div>

              <div
                aria-hidden="true"
                className="mt-2 flex items-center justify-between gap-[3px] h-3"
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
            VISTA 2: WAYBILL & ARO CIRCULAR DE LIQUIDACIÓN
            ------------------------------------------------------------------- */}
        {tabActiva === 'WAYBILL' && (
          <div className="space-y-3.5 animate-fade-up">
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
                aria-label="Ver expediente y especificaciones"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#EDEDED]/75 text-[#111827] hover:bg-[#EDEDED] cursor-pointer"
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
                    className="transition-[stroke-dashoffset] duration-300"
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

            {/* 3 Indicadores de Porcentaje Planos */}
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
                  {reserva.estadoGarantia === 'LIBERADA'
                    ? 'Liberada'
                    : reserva.estadoGarantia === 'RETENIDA_NOVEDAD'
                      ? 'Retenida'
                      : '100%'}
                </span>
                <span className="block text-[10px] text-[#9CA3AF]">
                  Garantía R2
                </span>
                <div className="mt-1 h-1 w-full rounded-full bg-[#EDEDED]">
                  <div className="h-full w-full rounded-full bg-[#1F2937]" />
                </div>
              </div>
            </div>

            {/* Acciones de Caja y Garantía (Solo Admin) */}
            {esAdmin && (
              <div className="space-y-2 pt-1">
                {saldoPatioPendiente > 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-[#EDEDED]/75 p-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="flex items-center gap-1">
                        {(
                          [
                            { id: 'transferencia', label: 'Bre-B / PSE' },
                            { id: 'efectivo', label: 'Efectivo' },
                            { id: 'tarjeta', label: 'Datáfono' },
                          ] as const
                        ).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMetodoCobroSaldo(m.id)}
                            className={`min-h-[44px] rounded-full px-3 py-1.5 text-xs font-bold cursor-pointer ${
                              metodoCobroSaldo === m.id
                                ? 'bg-[#111827] text-white'
                                : 'bg-white text-[#4B5563]'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {cuentasFinancieras && cuentasFinancieras.length > 0 && (
                        <select
                          value={cuentaCobroId}
                          onChange={(e) => setCuentaCobroId(e.target.value)}
                          className="min-h-[44px] rounded-[10px] border border-[#9CA3AF]/40 bg-white px-3 py-2 text-base font-medium text-[#111827] focus-visible:ring-2 focus-visible:ring-[#111827]"
                          aria-label="Cuenta receptora del abono"
                        >
                          {cuentasFinancieras.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={operacionCargando}
                      onClick={asentarCobroSaldoPatio}
                      className="min-h-[44px] rounded-full bg-[#111827] px-4 py-2 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                    >
                      {operacionCargando
                        ? 'Asentando...'
                        : `Asentar saldo (${formatCop(saldoPatioPendiente)})`}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-[18px] bg-[#EDEDED]/65 px-3.5 py-2 text-[11px] font-semibold text-[#111827]">
                    <span>Contrato 100% pagado en caja</span>
                    <span className="font-mono text-[10px] text-[#4B5563]">
                      PAZ Y SALVO
                    </span>
                  </div>
                )}

                {/* Control de Depósito de Garantía */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-[18px] bg-[#EDEDED]/65 px-3.5 py-2.5">
                  <span className="text-[11px] font-semibold text-[#4B5563]">
                    Garantía ({formatCop(vehiculo.depositoGarantia)}):
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        reserva.estadoGarantia === 'CUSTODIA_ACTIVA'
                          ? 'bg-[#111827] text-white'
                          : reserva.estadoGarantia === 'LIBERADA'
                            ? 'bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/60'
                            : 'bg-[#1F2937] text-white border border-[#4B5563]'
                      }`}
                    >
                      {reserva.estadoGarantia === 'CUSTODIA_ACTIVA'
                        ? 'En custodia activa'
                        : reserva.estadoGarantia === 'LIBERADA'
                          ? 'Liberada al cliente'
                          : 'Retenida por novedad'}
                    </span>

                    {capacidades?.puedeGestionarGarantias &&
                      (reserva.estado === 'EN_CURSO' || reserva.estado === 'PAUSADA') && (
                        <button
                          type="button"
                          onClick={() => setModalDevolverAbierto(true)}
                          className="min-h-[44px] rounded-full bg-[#111827] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1F2937] cursor-pointer inline-flex items-center"
                        >
                          Devolución / Liquidar
                        </button>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* -------------------------------------------------------------------
            VISTA 3: EXPEDIENTE DEL CONDUCTOR (Admin) / HIGHLIGHTS 2x2 (Cliente)
            ------------------------------------------------------------------- */}
        {tabActiva === 'HIGHLIGHTS' && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#111827]">
                {esAdmin
                  ? 'Expediente del Conductor y Unidad'
                  : 'Feature Highlights'}
              </h2>
              <button
                type="button"
                onClick={ciclarVista}
                aria-label="Volver a inspección"
                className="flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full bg-[#EDEDED]/75 text-[#111827] cursor-pointer"
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

            {esAdmin ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                  <span className="text-[10px] font-medium text-[#4B5563]">
                    Conductor titular
                  </span>
                  <p className="mt-1 font-display text-xs font-extrabold text-[#111827] truncate">
                    {reserva.conductor.nombreCompleto}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-[#4B5563] truncate">
                    {reserva.conductor.telefono}
                  </p>
                </div>

                <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                  <span className="text-[10px] font-medium text-[#4B5563]">
                    Identificación y licencia
                  </span>
                  <p className="mt-1 font-display text-xs font-extrabold text-[#111827] tabular-nums">
                    {reserva.conductor.tipoDocumento}{' '}
                    {reserva.conductor.numeroDocumento}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-[#1F2937]">
                    Categoría {reserva.conductor.categoriaLicencia} vigente
                  </p>
                </div>

                <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                  <span className="text-[10px] font-medium text-[#4B5563]">
                    Entrega y Ley 1581
                  </span>
                  <p className="mt-1 font-display text-xs font-bold text-[#111827] truncate">
                    {reserva.modalidadEntrega === 'DOMICILIO_MEDELLIN'
                      ? 'Domicilio Medellín'
                      : 'Entrega en Patio'}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold text-[#4B5563]">
                    {reserva.conductor.ley1581Aceptada
                      ? 'Datos y R2 autorizados ✓'
                      : 'Pendiente firma'}
                  </p>
                </div>

                <div className="rounded-[20px] bg-[#EDEDED]/65 p-3.5">
                  <span className="text-[10px] font-medium text-[#4B5563]">
                    Unidad · {vehiculo.placa}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="font-display text-base font-black text-[#111827] tabular-nums">
                      {potenciaValor}
                    </span>
                    <span className="text-[11px] font-bold text-[#4B5563]">
                      {potenciaUnidad} · {vehiculo.transmision}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#4B5563] truncate">
                    {specsBento.carroceriaTag}
                  </p>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {/* ===================================================================
            SEMÁFORO DOCUMENTAL Y BARRA DE CICLO DE VIDA OPERATIVO (RBAC D1)
            =================================================================== */}
        {esAdmin && (
          <div className="border-t border-[#EDEDED] pt-3.5 space-y-3">
            {/* Panel Semáforo: KYC Cliente + SOAT / RTM Vehículo */}
            <SemaforoDocumentalPanel
              reserva={reserva}
              autorizarSinDocumentos={autorizarSinDocumentos}
              onToggleAutorizarSinDocs={setAutorizarSinDocumentos}
              onDocumentosActualizados={() => {
                mostrarAviso('Expediente documental del cliente actualizado');
              }}
            />

            {errorOperacion && (
              <div
                role="alert"
                className="rounded-[18px] border border-[#9CA3AF]/40 bg-[#111827] px-4 py-3 text-xs text-white"
              >
                <div className="flex items-start gap-2">
                  <span className="font-bold text-[#EDEDED]">Atención:</span>
                  <span className="flex-1">{errorOperacion}</span>
                  <button
                    type="button"
                    onClick={() => setErrorOperacion(null)}
                    aria-label="Cerrar aviso de error"
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[11px] text-[#9CA3AF] hover:text-white cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Etapa 1: PENDIENTE -> Confirmar o Rechazar */}
            {reserva.estado === 'PENDIENTE' && (
              <div className="flex flex-wrap items-center gap-2">
                {capacidades?.puedeConfirmarRechazar && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={() => {
                      setTipoModalCancelar('RECHAZAR');
                      setModalCancelarAbierto(true);
                    }}
                    className="min-h-[44px] rounded-full bg-[#EDEDED] px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/40 disabled:opacity-50 cursor-pointer"
                  >
                    Rechazar
                  </button>
                )}
                {capacidades?.puedeConfirmarRechazar && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={confirmarReservaOperativa}
                    className="min-h-[44px] flex-1 rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                  >
                    {operacionCargando
                      ? 'Confirmando...'
                      : 'Confirmar reserva y notificar'}
                  </button>
                )}
              </div>
            )}

            {/* Etapa 2: CONFIRMADA -> Entrega del vehículo (Contrato VIGENTE) o Cancelar */}
            {reserva.estado === 'CONFIRMADA' && (
              <div className="flex flex-wrap items-center gap-2">
                {capacidades?.puedeEntregar && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={entregarVehiculoOperativo}
                    className="min-h-[44px] flex-1 rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                  >
                    {operacionCargando
                      ? 'Entregando...'
                      : 'Confirmar entrega y salida R2 (Vigente)'}
                  </button>
                )}
                {capacidades?.puedeConfirmarRechazar && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={() => {
                      setTipoModalCancelar('CANCELAR');
                      setModalCancelarAbierto(true);
                    }}
                    className="min-h-[44px] rounded-full bg-[#EDEDED] px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/40 disabled:opacity-50 cursor-pointer"
                  >
                    Cancelar reserva
                  </button>
                )}
              </div>
            )}

            {/* Etapa 3: EN_CURSO -> Pausar, Prorrogar, Devolver o Anular */}
            {reserva.estado === 'EN_CURSO' && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {capacidades?.puedePausar && (
                    <button
                      type="button"
                      disabled={operacionCargando}
                      onClick={() => setModalPausarAbierto(true)}
                      className="min-h-[44px] rounded-full bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/40 disabled:opacity-50 cursor-pointer"
                    >
                      Pausar (+1 día $0)
                    </button>
                  )}
                  {capacidades?.puedeProrrogarEstandar && (
                    <button
                      type="button"
                      disabled={operacionCargando}
                      onClick={() => setModalProrrogarAbierto(true)}
                      className="min-h-[44px] rounded-full bg-[#EDEDED] px-3.5 py-2 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/40 disabled:opacity-50 cursor-pointer"
                    >
                      Prorrogar alquiler
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={operacionCargando}
                  onClick={() => setModalDevolverAbierto(true)}
                  className="min-h-[44px] w-full rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                >
                  Devolver y cerrar contrato
                </button>

                {capacidades?.puedeAnularContrato && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={() => {
                      setTipoModalCancelar('ANULAR');
                      setModalCancelarAbierto(true);
                    }}
                    className="min-h-[44px] w-full text-center text-[11px] font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer"
                  >
                    Anular contrato y alquiler
                  </button>
                )}
              </div>
            )}

            {/* Etapa 4: PAUSADA -> Reanudar, Prorrogar, Devolver o Anular */}
            {reserva.estado === 'PAUSADA' && (
              <div className="space-y-2">
                <div className="rounded-[16px] bg-[#EDEDED]/85 p-3 text-xs text-[#111827]">
                  <span className="font-bold">Alquiler pausado por acuerdo.</span>
                  <p className="mt-0.5 text-[11px] text-[#4B5563]">
                    La unidad está temporalmente resguardada. La pausa no genera costos adicionales ($0).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {capacidades?.puedePausar && (
                    <button
                      type="button"
                      disabled={operacionCargando}
                      onClick={reanudarAlquilerOperativo}
                      className="min-h-[44px] rounded-full bg-[#111827] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1F2937] disabled:opacity-50 cursor-pointer"
                    >
                      {operacionCargando ? 'Reanudando...' : 'Reanudar alquiler'}
                    </button>
                  )}
                  {capacidades?.puedeProrrogarEstandar && (
                    <button
                      type="button"
                      disabled={operacionCargando}
                      onClick={() => setModalProrrogarAbierto(true)}
                      className="min-h-[44px] rounded-full bg-[#EDEDED] px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#9CA3AF]/40 disabled:opacity-50 cursor-pointer"
                    >
                      Prorrogar alquiler
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={operacionCargando}
                  onClick={() => setModalDevolverAbierto(true)}
                  className="min-h-[44px] w-full rounded-full border border-[#9CA3AF]/50 bg-white px-5 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#EDEDED] disabled:opacity-50 cursor-pointer"
                >
                  Devolver y cerrar contrato
                </button>

                {capacidades?.puedeAnularContrato && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={() => {
                      setTipoModalCancelar('ANULAR');
                      setModalCancelarAbierto(true);
                    }}
                    className="min-h-[44px] w-full text-center text-[11px] font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer"
                  >
                    Anular contrato y alquiler
                  </button>
                )}
              </div>
            )}

            {/* Etapa 5: COMPLETADA / RECHAZADA / CANCELADA -> Resumen + Reabrir */}
            {(reserva.estado === 'COMPLETADA' ||
              reserva.estado === 'RECHAZADA' ||
              reserva.estado === 'CANCELADA') && (
              <div className="flex items-center justify-between gap-2 rounded-[18px] bg-[#EDEDED]/75 px-3.5 py-2.5">
                <div className="min-w-0">
                  <span className="block text-xs font-bold text-[#111827]">
                    {reserva.estado === 'COMPLETADA'
                      ? reserva.requiereMantenimientoRetorno
                        ? 'Contrato cerrado · Unidad en mantenimiento'
                        : 'Contrato cerrado · Unidad disponible en patio'
                      : reserva.estado === 'RECHAZADA'
                        ? 'Solicitud rechazada'
                        : 'Reserva cancelada'}
                  </span>
                  {reserva.motivoRechazo && (
                    <span className="block text-[11px] text-[#4B5563] truncate">
                      Motivo: {reserva.motivoRechazo}
                    </span>
                  )}
                </div>

                {capacidades?.puedeAnularContrato && (
                  <button
                    type="button"
                    disabled={operacionCargando}
                    onClick={reabrirReservaOperativa}
                    className="shrink-0 min-h-[44px] rounded-full bg-white px-4 py-2 text-xs font-bold text-[#111827] hover:bg-[#EDEDED] disabled:opacity-50 cursor-pointer"
                  >
                    {operacionCargando ? 'Reabriendo...' : 'Reabrir'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Cliente: Opción de cancelar solicitud pendiente sin abono */}
        {!esAdmin &&
          modo === 'cliente' &&
          reserva.estado === 'PENDIENTE' &&
          reserva.montoReportado === 0 && (
            <div className="border-t border-[#EDEDED] pt-3.5">
              <button
                type="button"
                onClick={() => {
                  setTipoModalCancelar('CANCELAR');
                  setModalCancelarAbierto(true);
                }}
                className="min-h-[44px] w-full rounded-full border border-[#9CA3AF]/40 bg-white px-4 py-2.5 text-xs font-semibold text-[#4B5563] hover:text-[#111827] cursor-pointer"
              >
                Cancelar mi solicitud de alquiler
              </button>
            </div>
          )}

        {/* ===================================================================
            BARRA DE ENTREGA Y EVALUACIÓN INTERACTIVA (100DVH WIZARD)
            =================================================================== */}
        <div className="border-t border-[#EDEDED] pt-3.5 space-y-2.5">
          {reserva.evaluacionEntrega ? (
            <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#EDEDED]/85 px-3.5 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-[#111827] px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                    {reserva.evaluacionEntrega.puntajeNumerico}.0 ★
                  </span>
                  <span className="font-display text-xs font-bold text-[#111827] truncate">
                    Entrega y evaluación registradas
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] font-medium text-[#4B5563] truncate">
                  {reserva.evaluacionEntrega.aspectosDestacados.join(' · ') ||
                    'Paz y salvo digital R2 activo'}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    esAdmin
                      ? `/reservas/${reserva.codigo}/entrega?retorno=/admin/reservas/${reserva.codigo}`
                      : `/reservas/${reserva.codigo}/entrega${
                          tokenAccesoPublico
                            ? `?token=${encodeURIComponent(tokenAccesoPublico)}`
                            : ''
                        }`
                  )
                }
                className="ios-press-bounce shrink-0 min-h-[44px] rounded-full bg-white px-4 py-2 text-xs font-bold text-[#111827] cursor-pointer"
              >
                Ver resumen
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                navigate(
                  esAdmin
                    ? `/reservas/${reserva.codigo}/entrega?retorno=/admin/reservas/${reserva.codigo}`
                    : `/reservas/${reserva.codigo}/entrega${
                        tokenAccesoPublico
                          ? `?token=${encodeURIComponent(tokenAccesoPublico)}`
                          : ''
                      }`
                )
              }
              className="ios-press-bounce flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-[#111827] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#1F2937] cursor-pointer"
            >
              <span>⛶</span>
              <span>
                {esAdmin
                  ? 'Realizar entrega pericial y evaluación R2'
                  : 'Entregar vehículo y calificar servicio'}
              </span>
              <span>→</span>
            </button>
          )}
        </div>
          </section>
        </div>
      </div>

      {/* Modales del ciclo de vida RBAC */}
      <ModalPausar
        isOpen={modalPausarAbierto}
        onClose={() => setModalPausarAbierto(false)}
        reserva={reserva}
        onExito={(actualizada, msg) => {
          guardarCambioReserva(actualizada);
          if (msg) mostrarAviso(msg);
        }}
      />

      <ModalProrrogar
        isOpen={modalProrrogarAbierto}
        onClose={() => setModalProrrogarAbierto(false)}
        reserva={reserva}
        capacidades={capacidades}
        onExito={(actualizada, msg) => {
          guardarCambioReserva(actualizada);
          if (msg) mostrarAviso(msg);
        }}
      />

      <ModalDevolverCerrar
        isOpen={modalDevolverAbierto}
        onClose={() => setModalDevolverAbierto(false)}
        reserva={reserva}
        hoyISO={_hoyISO}
        capacidades={capacidades}
        cuentasFinancieras={cuentasFinancieras}
        onExito={(actualizada, msg) => {
          guardarCambioReserva(actualizada);
          if (msg) mostrarAviso(msg);
        }}
      />

      <ModalCancelarAnular
        isOpen={modalCancelarAbierto}
        onClose={() => setModalCancelarAbierto(false)}
        reserva={reserva}
        tipo={tipoModalCancelar}
        cuentasFinancieras={cuentasFinancieras}
        tokenAccesoPublico={tokenAccesoPublico}
        onExito={(actualizada, msg) => {
          guardarCambioReserva(actualizada);
          if (msg) mostrarAviso(msg);
        }}
      />
    </div>
  );
}

