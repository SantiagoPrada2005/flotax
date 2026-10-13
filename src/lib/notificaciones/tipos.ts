import { z } from 'zod';
import {
  alcancesNotificacion,
  prioridadesNotificacion,
  rolesEmpleadoValidos,
  type PrioridadNotificacion,
} from '@/db/schema';

export type CanalNotificacionNombre = 'PUSH' | 'EMAIL';

/** Catálogo cerrado de eventos que pueden generar una notificación. */
export const tiposNotificacion = [
  'SOLICITUD_NUEVA',
  'RESERVA_CONFIRMADA',
  'RESERVA_RECHAZADA',
  'ABONO_REGISTRADO',
  'ENTREGA_PROGRAMADA',
  'DEVOLUCION_PROXIMA',
  'DOCUMENTO_POR_VENCER',
  'INVITACION_RECIBIDA',
  'ANUNCIO_PLATAFORMA',
] as const;

export type TipoNotificacion = (typeof tiposNotificacion)[number];

export const tipoNotificacionSchema = z.enum(tiposNotificacion);

/** Datos mínimos que necesita cada evento para redactar su aviso. */
export interface PayloadPorTipo {
  SOLICITUD_NUEVA: { reservaId: string; clienteNombre: string; vehiculo: string };
  RESERVA_CONFIRMADA: { reservaCodigo: string; vehiculo: string; rangoFechas: string };
  RESERVA_RECHAZADA: { reservaCodigo: string; vehiculo: string; motivo?: string | undefined };
  ABONO_REGISTRADO: { contratoId: string; montoFormateado: string; metodoPago: string };
  ENTREGA_PROGRAMADA: { reservaCodigo: string; vehiculo: string; cuando: string };
  DEVOLUCION_PROXIMA: { reservaCodigo: string; vehiculo: string; cuando: string };
  DOCUMENTO_POR_VENCER: { vehiculo: string; documento: string; vence: string };
  INVITACION_RECIBIDA: { localNombre: string; rol: string };
  ANUNCIO_PLATAFORMA: { titulo: string; mensaje: string };
}

/** Contenido ya redactado y listo para persistir y entregar. */
export interface ContenidoNotificacion {
  titulo: string;
  detalle: string;
  href: string;
  prioridad: PrioridadNotificacion;
}

/**
 * Scope de la notificación: a quién va dirigida.
 * - USUARIO: uno o varios usuarios concretos.
 * - LOCAL: todos los miembros activos de un patio.
 * - LOCAL_ROLES: miembros activos de un patio con alguno de los roles indicados.
 * - PLATAFORMA: todos los usuarios activos.
 */
export const destinoNotificacionSchema = z.discriminatedUnion('alcance', [
  z.object({ alcance: z.literal(alcancesNotificacion[0]), usuarioIds: z.array(z.string().min(1)).min(1) }),
  z.object({ alcance: z.literal(alcancesNotificacion[1]), localId: z.string().min(1) }),
  z.object({
    alcance: z.literal(alcancesNotificacion[2]),
    localId: z.string().min(1),
    roles: z.array(z.enum(rolesEmpleadoValidos)).min(1),
  }),
  z.object({ alcance: z.literal(alcancesNotificacion[3]) }),
]);

export type DestinoNotificacion = z.infer<typeof destinoNotificacionSchema>;

export const prioridadNotificacionSchema = z.enum(prioridadesNotificacion);
