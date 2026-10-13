import type {
  CanalNotificacionNombre,
  ContenidoNotificacion,
  PayloadPorTipo,
  TipoNotificacion,
} from './tipos';

type Plantillas = { [K in TipoNotificacion]: (payload: PayloadPorTipo[K]) => ContenidoNotificacion };

/**
 * Redacción humana de cada aviso (RUL-FLX-006): verbo + objeto en el título,
 * dato clave en el detalle y ruta de destino al tocarlo. Funciones puras.
 */
const PLANTILLAS: Plantillas = {
  SOLICITUD_NUEVA: (p) => ({
    titulo: 'Nueva solicitud de reserva',
    detalle: `${p.clienteNombre} pidió ${p.vehiculo}`,
    href: '/admin/reservas',
    prioridad: 'NORMAL',
  }),
  RESERVA_CONFIRMADA: (p) => ({
    titulo: 'Tu reserva fue confirmada',
    detalle: `${p.vehiculo} · ${p.rangoFechas}`,
    href: `/reservas/${encodeURIComponent(p.reservaCodigo)}`,
    prioridad: 'NORMAL',
  }),
  RESERVA_RECHAZADA: (p) => ({
    titulo: 'No pudimos confirmar tu reserva',
    detalle: p.motivo ? `${p.vehiculo} · ${p.motivo}` : p.vehiculo,
    href: `/reservas/${encodeURIComponent(p.reservaCodigo)}`,
    prioridad: 'URGENTE',
  }),
  ABONO_REGISTRADO: (p) => ({
    titulo: 'Se registró un abono',
    detalle: `${p.montoFormateado} · ${p.metodoPago}`,
    href: '/admin/caja',
    prioridad: 'NORMAL',
  }),
  ENTREGA_PROGRAMADA: (p) => ({
    titulo: 'Entrega de vehículo programada',
    detalle: `${p.vehiculo} · ${p.cuando}`,
    href: `/reservas/${encodeURIComponent(p.reservaCodigo)}`,
    prioridad: 'NORMAL',
  }),
  DEVOLUCION_PROXIMA: (p) => ({
    titulo: 'Tu devolución está cerca',
    detalle: `${p.vehiculo} · ${p.cuando}`,
    href: `/reservas/${encodeURIComponent(p.reservaCodigo)}`,
    prioridad: 'URGENTE',
  }),
  DOCUMENTO_POR_VENCER: (p) => ({
    titulo: 'Un documento está por vencer',
    detalle: `${p.documento} de ${p.vehiculo} vence el ${p.vence}`,
    href: '/admin/flota',
    prioridad: 'URGENTE',
  }),
  INVITACION_RECIBIDA: (p) => ({
    titulo: 'Te invitaron a un patio',
    detalle: `${p.localNombre} te invitó como ${p.rol}`,
    href: '/admin/onboarding',
    prioridad: 'NORMAL',
  }),
  ANUNCIO_PLATAFORMA: (p) => ({
    titulo: p.titulo,
    detalle: p.mensaje,
    href: '/notificaciones',
    prioridad: 'NORMAL',
  }),
};

/**
 * Canales externos por tipo. La bandeja in-app siempre se escribe.
 * El correo se reserva para avisos que el usuario no puede perderse
 * (evita saturar bandejas de entrada).
 */
const CANALES_POR_TIPO: Readonly<Record<TipoNotificacion, readonly CanalNotificacionNombre[]>> = {
  SOLICITUD_NUEVA: ['PUSH'],
  RESERVA_CONFIRMADA: ['PUSH', 'EMAIL'],
  RESERVA_RECHAZADA: ['PUSH', 'EMAIL'],
  ABONO_REGISTRADO: ['PUSH'],
  ENTREGA_PROGRAMADA: ['PUSH', 'EMAIL'],
  DEVOLUCION_PROXIMA: ['PUSH', 'EMAIL'],
  DOCUMENTO_POR_VENCER: ['PUSH', 'EMAIL'],
  INVITACION_RECIBIDA: ['PUSH', 'EMAIL'],
  ANUNCIO_PLATAFORMA: ['PUSH'],
};

export function renderizarNotificacion<K extends TipoNotificacion>(
  tipo: K,
  payload: PayloadPorTipo[K]
): ContenidoNotificacion {
  const plantilla: (p: PayloadPorTipo[K]) => ContenidoNotificacion = PLANTILLAS[tipo];
  return plantilla(payload);
}

export function canalesDeTipo(tipo: TipoNotificacion): readonly CanalNotificacionNombre[] {
  return CANALES_POR_TIPO[tipo];
}
