import { defineAction, ActionError } from 'astro:actions';
import { marcarRevisionNavegacion } from '@/lib/pwa/revision';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import {
  ErrorCicloAlquiler,
  type ErrorCicloAlquilerCode,
  crearReservaConValidaciones,
  confirmarReservaD1,
  guardarInspeccionR2D1,
  entregarVehiculoConContratoD1,
  pausarAlquilerD1,
  reanudarAlquilerD1,
  prorrogarAlquilerD1,
  devolverYCerrarAlquilerD1,
  rechazarReservaD1,
  cancelarReservaD1,
  anularAlquilerD1,
  reabrirReservaD1,
  registrarEvaluacionEntregaClienteD1,
  registrarOActualizarDocumentosClienteRapidoD1,
} from '@/lib/flota/ciclo-alquiler';
import { registrarCobroWaybillD1 } from '@/lib/flota/repositorio-reservas';
import {
  clientesLocal,
  user,
  verificacionesIdentidad,
  modalidadesEntregaReserva,
  modalidadesPagoInicial,
  metodosAbonoInicial,
  categoriasLicenciaConduccion,
  tiposDocumentoIdentidad,
  estadosReserva,
  estadosGeneralesInspeccion,
  estadosPuntoInspeccionR2,
  gravedadesNovedadInspeccion,
  tiposMantenimientoVehiculo,
  metodosPagoFinanciero,
} from '@/db/schema';
import { and, eq, like, or, sql } from 'drizzle-orm';
import { crearServicioNotificaciones } from '@/lib/notificaciones';
import { requireLocalAuth, PERMISOS, tienePermiso } from '@/lib/auth';

function manejarErrorCiclo(error: unknown): never {
  if (error instanceof ActionError) {
    throw error;
  }
  if (error instanceof ErrorCicloAlquiler) {
    const codeMap: Record<ErrorCicloAlquilerCode, ActionError['code']> = {
      BAD_REQUEST: 'BAD_REQUEST',
      CONFLICT: 'CONFLICT',
      FORBIDDEN: 'FORBIDDEN',
      NOT_FOUND: 'NOT_FOUND',
      INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
    };
    throw new ActionError({
      code: codeMap[error.code] ?? 'BAD_REQUEST',
      message: error.message,
    });
  }
  if (error instanceof Error) {
    throw new ActionError({
      code: 'BAD_REQUEST',
      message: error.message,
    });
  }
  throw new ActionError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Error inesperado en el ciclo de alquiler.',
  });
}

/**
 * 1. Radicar solicitud o crear reserva directa con validación estricta de servidor.
 */
export const crearReservaAction = defineAction({
  input: z.object({
    vehiculoId: z.string().min(1, { error: 'El vehículo es obligatorio' }),
    fechaInicio: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha de inicio no válida (YYYY-MM-DD)' }),
    fechaFin: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha de fin no válida (YYYY-MM-DD)' }),
    diasAlquiler: z.number().int().positive({ error: 'Días deben ser mayores a 0' }).optional(),
    precioDiaCotizado: z.number().positive().optional(),
    subtotalTarifaCotizado: z.number().positive().optional(),
    coberturaPericialCotizada: z.number().nonnegative().optional(),
    totalCotizado: z.number().positive().optional(),
    modalidadEntrega: z.enum(modalidadesEntregaReserva).optional(),
    direccionEntrega: z.string().optional(),
    sedeNombre: z.string().optional(),
    localId: z.string().optional(),
    modalidadPagoInicial: z.enum(modalidadesPagoInicial).optional(),
    metodoAbonoInicial: z.enum(metodosAbonoInicial).optional(),
    montoAbonoReportado: z.number().nonnegative().optional(),
    referenciaAbonoInicial: z.string().optional(),
    contactoNombre: z.string().min(1, { error: 'El nombre completo es obligatorio' }),
    contactoTipoDocumento: z.enum(tiposDocumentoIdentidad).optional(),
    contactoNumeroDocumento: z.string().optional(),
    contactoCategoriaLicencia: z.enum(categoriasLicenciaConduccion).optional(),
    contactoTelefono: z.string().min(1, { error: 'El número de teléfono es obligatorio' }),
    contactoCorreo: z.email({ error: 'Correo electrónico de contacto no válido' }).optional(),
    ley1581Aceptada: z.boolean().optional(),
    clienteId: z.string().optional(),
    estadoInicial: z.enum(['PENDIENTE', 'CONFIRMADA']).optional(),
    pagoConfirmadoInmediato: z
      .object({
        monto: z.number().positive({ error: 'Monto debe ser mayor a 0' }),
        metodoPago: z.enum(metodosPagoFinanciero),
        cuentaId: z.string().optional(),
        referencia: z.string().optional(),
      })
      .optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const usuario = context.locals.usuario;
    const localId =
      input.localId ||
      usuario?.localActivo?.id ||
      context.locals.localCaptacion?.id ||
      'local-patio-norte';

    try {
      const res = await crearReservaConValidaciones(
        db,
        {
          ...input,
          localId,
          clienteId:
            input.clienteId ??
            (usuario?.localActivo ? null : usuario?.id ?? null),
        },
        {
          usuarioId: usuario?.id ?? null,
          rol: usuario?.localActivo?.rol ?? (usuario ? 'USUARIO' : undefined),
          localId,
          origen: usuario?.localActivo ? 'MOSTRADOR_ADMIN' : 'CLIENTE_WEB',
        }
      );

      // Notificación in-app no bloqueante
      try {
        await crearServicioNotificaciones(env, context.locals.logger).notificar({
          tipo: 'SOLICITUD_NUEVA',
          payload: {
            reservaId: res.reserva.codigo,
            clienteNombre: res.reserva.conductor.nombreCompleto,
            vehiculo: `${res.reserva.vehiculo.marca} ${res.reserva.vehiculo.modelo}`,
          },
          destino: {
            alcance: 'LOCAL_ROLES',
            localId,
            roles: ['DUENO', 'ADMIN', 'ASESOR'],
          },
          localId,
          actorId: usuario?.id,
        });
      } catch {
        // Tolerante
      }

      return {
        ok: true,
        codigo: res.reserva.codigo,
        rutaDestino: `/reservas/${res.reserva.codigo}${res.tokenAccesoPublico ? `?token=${res.tokenAccesoPublico}` : ''}`,
        reserva: res.reserva,
        tokenAccesoPublico: res.tokenAccesoPublico,
        advertencias: res.advertenciasDocumentales,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 2. Confirmar reserva (PENDIENTE -> CONFIRMADA) con auditoría documental.
 */
export const confirmarReservaAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    autorizarSinDocumentos: z.boolean().optional(),
    notaAutorizacion: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await confirmarReservaD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        usuarioId: usuario.id,
        autorizarSinDocumentos: input.autorizarSinDocumentos,
        notaAutorizacion: input.notaAutorizacion,
      });

      if (res.requiereAutorizacionSinDocs) {
        return {
          ok: false,
          requiereAutorizacionSinDocs: true as const,
          advertencias: res.advertencias,
        };
      }

      return {
        ok: true,
        requiereAutorizacionSinDocs: false as const,
        reserva: res.reserva,
        contratoId: res.contratoId,
        mensaje: `Reserva #${res.reserva.codigo} confirmada correctamente.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 3. Rechazar reserva (PENDIENTE -> RECHAZADA) con motivo obligatorio.
 */
export const rechazarReservaAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    motivoRechazo: z
      .string()
      .min(3, { error: 'El motivo de rechazo es obligatorio (mínimo 3 caracteres)' }),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await rechazarReservaD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        usuarioId: usuario.id,
        motivoRechazo: input.motivoRechazo,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        mensaje: `Reserva #${res.reserva.codigo} rechazada.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 4. Guardar inspección pericial R2 (salida o retorno).
 */
export const guardarInspeccionR2Action = defineAction({
  input: z.object({
    reservaId: z.string().min(1, { error: 'ID de reserva obligatorio' }),
    tipoActo: z.enum(['ENTREGA', 'RECEPCION']),
    medidorUso: z.number().int().min(0, { error: 'Medidor de uso no válido' }),
    nivelEnergiaPct: z
      .number()
      .int()
      .min(0)
      .max(100, { error: 'Nivel de energía debe estar entre 0 y 100' }),
    estadoGeneral: z.enum(estadosGeneralesInspeccion).optional(),
    observaciones: z.string().optional(),
    puntosR2: z
      .array(
        z.object({
          id: z.string().optional(),
          zona: z.string(),
          etiqueta: z.string(),
          dictamen: z.string(),
          estado: z.enum(estadosPuntoInspeccionR2),
          gravedad: z.enum(gravedadesNovedadInspeccion).optional(),
          coordX: z.string().optional(),
          coordY: z.string().optional(),
          costoEstimado: z.number().optional(),
          generaCargoCliente: z.boolean().optional(),
        })
      )
      .optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.INSPECCIONES_REGISTRAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await guardarInspeccionR2D1(db, {
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        inspectorId: usuario.id,
        tipoActo: input.tipoActo,
        medidorUso: input.medidorUso,
        nivelEnergiaPct: input.nivelEnergiaPct,
        estadoGeneral: input.estadoGeneral,
        observaciones: input.observaciones,
        puntosR2: input.puntosR2,
      });

      return {
        ok: true,
        inspeccionId: res.inspeccionId,
        mensaje: `Inspección ${input.tipoActo} guardada correctamente en Cloudflare D1.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 5. Entregar vehículo con contrato VIGENTE y fianza (CONFIRMADA -> EN_CURSO).
 */
export const entregarVehiculoAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    medidorUsoEntrega: z
      .number()
      .int()
      .min(0, { error: 'Medidor de entrega no válido' }),
    nivelEnergiaEntregaPct: z.number().int().min(0).max(100).optional(),
    firmaArrendadorR2Key: z.string().optional(),
    firmaArrendatarioR2Key: z.string().optional(),
    recibirGarantiaAhora: z
      .object({
        monto: z.number().min(0),
        metodoPago: z.enum(metodosPagoFinanciero),
        cuentaId: z.string().optional(),
        referencia: z.string().optional(),
      })
      .optional(),
    autorizarSinDocumentos: z.boolean().optional(),
    notaAutorizacion: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_CREAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await entregarVehiculoConContratoD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        usuarioId: usuario.id,
        medidorUsoEntrega: input.medidorUsoEntrega,
        nivelEnergiaEntregaPct: input.nivelEnergiaEntregaPct,
        firmaArrendadorR2Key: input.firmaArrendadorR2Key,
        firmaArrendatarioR2Key: input.firmaArrendatarioR2Key,
        recibirGarantiaAhora: input.recibirGarantiaAhora,
        autorizarSinDocumentos: input.autorizarSinDocumentos,
        notaAutorizacion: input.notaAutorizacion,
      });

      return {
        ok: true,
        reserva: res.reserva,
        contratoId: res.contratoId,
        mensaje: `Vehículo entregado y contrato #${res.contratoId} vigente.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 6. Pausar alquiler (EN_CURSO -> PAUSADA, vehículo NO_DISPONIBLE, +1/+N días $0).
 */
export const pausarAlquilerAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    diasPausa: z
      .number()
      .int()
      .min(1, { error: 'Debe pausar al menos 1 día' })
      .default(1),
    motivo: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_PAUSAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await pausarAlquilerD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        diasPausa: input.diasPausa,
        motivo: input.motivo,
        usuarioId: usuario.id,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        contrato: res.contrato,
        mensaje: `Alquiler pausado por ${input.diasPausa} día(s).`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 7. Reanudar alquiler (PAUSADA -> EN_CURSO).
 */
export const reanudarAlquilerAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    motivo: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_PAUSAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await reanudarAlquilerD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        motivo: input.motivo,
        usuarioId: usuario.id,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        contrato: res.contrato,
        mensaje: 'Alquiler reanudado exitosamente.',
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 8. Prorrogar alquiler (+1/+N días con 3 modalidades de tarifa).
 */
export const prorrogarAlquilerAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    diasExtra: z.number().int().min(1, { error: 'Debe prorrogar al menos 1 día' }),
    modalidadTarifa: z.enum([
      'MISMO_PRECIO',
      'TARIFA_ESTANDAR',
      'PRECIO_PACTADO',
    ]),
    montoAcordado: z.number().min(0).optional(),
    precioDia: z.number().min(0).optional(),
    clausulaAcuerdo: z.string().optional(),
    motivo: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_CREAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await prorrogarAlquilerD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        diasExtra: input.diasExtra,
        modalidadTarifa: input.modalidadTarifa,
        montoAcordado: input.montoAcordado,
        precioDia: input.precioDia,
        clausulaAcuerdo: input.clausulaAcuerdo,
        motivo: input.motivo,
        usuarioId: usuario.id,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        contrato: res.contrato,
        mensaje: `Prórroga de +${input.diasExtra} día(s) aplicada correctamente.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 9. Devolver y cerrar alquiler (normal o anticipada con cláusula, caja y fianza).
 */
export const devolverYCerrarAlquilerAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    fechaDevolucionReal: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha no válida (YYYY-MM-DD)' })
      .optional(),
    medidorUsoRetorno: z
      .number()
      .int()
      .min(0, { error: 'Medidor de retorno obligatorio' }),
    nivelEnergiaRetornoPct: z.number().int().min(0).max(100).optional(),
    estadoGeneral: z.enum(estadosGeneralesInspeccion).optional(),
    observaciones: z.string().optional(),
    clausulaEncargado: z.string().optional(),
    sobrecostoLocal: z.number().min(0).optional(),
    motivoSobrecosto: z.string().optional(),
    descuentoAjusteLocal: z.number().min(0).optional(),
    motivoDescuento: z.string().optional(),
    resolucionExcedente: z
      .enum(['REEMBOLSO_ALQUILER', 'RETENER_SALDO_LOCAL'])
      .optional(),
    cuentaReembolsoId: z.string().optional(),
    cobrarSaldoAhora: z
      .object({
        monto: z.number().min(0).optional(),
        metodoPago: z.enum(metodosPagoFinanciero),
        cuentaId: z.string().optional(),
        referencia: z.string().optional(),
      })
      .optional(),
    gestionGarantia: z
      .object({
        accion: z.enum([
          'DEVOLVER_TOTAL',
          'DEVOLVER_PARCIAL',
          'RETENER_CARGOS',
          'DEJAR_CUSTODIA',
        ]),
        montoDevolver: z.number().min(0).optional(),
        cuentaId: z.string().optional(),
        motivoRetencion: z.string().optional(),
      })
      .optional(),
    requiereMantenimiento: z.boolean().optional(),
    tipoMantenimiento: z.enum(tiposMantenimientoVehiculo).optional(),
    etiquetaMantenimiento: z.string().optional(),
    fechaFinEstimadaMantenimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_FINALIZAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await devolverYCerrarAlquilerD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        fechaDevolucionReal: input.fechaDevolucionReal,
        medidorUsoRetorno: input.medidorUsoRetorno,
        nivelEnergiaRetornoPct: input.nivelEnergiaRetornoPct,
        estadoGeneral: input.estadoGeneral,
        observaciones: input.observaciones,
        clausulaEncargado: input.clausulaEncargado,
        sobrecostoLocal: input.sobrecostoLocal,
        motivoSobrecosto: input.motivoSobrecosto,
        descuentoAjusteLocal: input.descuentoAjusteLocal,
        motivoDescuento: input.motivoDescuento,
        resolucionExcedente: input.resolucionExcedente,
        cuentaReembolsoId: input.cuentaReembolsoId,
        cobrarSaldoAhora: input.cobrarSaldoAhora,
        gestionGarantia: input.gestionGarantia,
        requiereMantenimiento: input.requiereMantenimiento,
        tipoMantenimiento: input.tipoMantenimiento,
        etiquetaMantenimiento: input.etiquetaMantenimiento,
        fechaFinEstimadaMantenimiento: input.fechaFinEstimadaMantenimiento,
        usuarioId: usuario.id,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        contrato: res.contrato,
        garantia: res.garantia,
        mensajeLegal: res.mensajeLegal,
        mensaje:
          'Devolución registrada y contrato cerrado correctamente en Cloudflare D1.',
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 10. Cancelar reserva (por cliente/invitado con token o por local con RBAC).
 */
export const cancelarReservaAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    tokenAccesoPublico: z.string().optional(),
    motivoCancelacion: z.string().optional(),
    resolucionFinanciera: z
      .enum(['REEMBOLSAR_EGRESO', 'ANULAR_MOVIMIENTOS', 'RETENER_SALDO_LOCAL'])
      .optional(),
    cuentaReembolsoId: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const usuario = context.locals.usuario;
    const actor = usuario?.localActivo
      ? {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        }
      : usuario
        ? {
            usuarioId: usuario.id,
            rol: 'USUARIO' as const,
          }
        : undefined;

    try {
      const res = await cancelarReservaD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario?.localActivo?.id,
        clienteId: usuario?.id,
        tokenAccesoPublico: input.tokenAccesoPublico,
        motivoCancelacion: input.motivoCancelacion,
        resolucionFinanciera: input.resolucionFinanciera,
        cuentaReembolsoId: input.cuentaReembolsoId,
        usuarioId: usuario?.id,
        actor,
      });

      return {
        ok: true,
        reserva: res.reserva,
        mensaje: `Reserva #${res.reserva.codigo} cancelada correctamente.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 11. Anular contrato/alquiler (exclusivo ADMIN / DUENO).
 */
export const anularContratoAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    contratoId: z.string().optional(),
    motivoAnulacion: z
      .string()
      .min(5, { error: 'El motivo de anulación debe tener al menos 5 caracteres' }),
    resolucionFinanciera: z
      .enum(['REEMBOLSAR_EGRESO', 'ANULAR_MOVIMIENTOS', 'RETENER_SALDO_LOCAL'])
      .optional(),
    cuentaReembolsoId: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_ANULAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await anularAlquilerD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        contratoId: input.contratoId,
        localId: usuario.localActivo.id,
        motivoAnulacion: input.motivoAnulacion,
        resolucionFinanciera: input.resolucionFinanciera,
        cuentaReembolsoId: input.cuentaReembolsoId,
        usuarioId: usuario.id,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        contrato: res.contrato,
        mensaje: 'Contrato y alquiler anulados correctamente.',
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 12. Reabrir reserva cancelada o rechazada a PENDIENTE (exclusivo ADMIN / DUENO).
 */
export const reabrirReservaAction = defineAction({
  input: z.object({
    codigo: z.string().optional(),
    reservaId: z.string().optional(),
    motivoReapertura: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CONTRATOS_ANULAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const res = await reabrirReservaD1(db, {
        codigo: input.codigo,
        reservaId: input.reservaId,
        localId: usuario.localActivo.id,
        motivoReapertura: input.motivoReapertura,
        usuarioId: usuario.id,
        actor: {
          usuarioId: usuario.id,
          rol: usuario.localActivo.rol,
          localId: usuario.localActivo.id,
        },
      });

      return {
        ok: true,
        reserva: res.reserva,
        mensaje: `Reserva #${res.reserva.codigo} reabierta en estado PENDIENTE.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 13. Asentar cobro en Waybill y caja operativa.
 */
export const registrarCobroWaybillAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    monto: z.number().min(0, { error: 'El monto debe ser válido' }),
    metodoPago: z.enum(['efectivo', 'transferencia', 'tarjeta']),
    cuentaId: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
    const localId = usuario.localActivo.id;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      const ok = await registrarCobroWaybillD1(db, {
        codigo: input.codigo,
        monto: input.monto,
        metodoPago: input.metodoPago,
        cuentaId: input.cuentaId,
        localId,
        usuarioId: usuario.id,
      });

      if (!ok) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: `No fue posible asentar el cobro de la reserva #${input.codigo}. Verifica la cuenta operativa.`,
        });
      }

      return {
        ok: true,
        codigo: input.codigo,
        monto: input.monto,
        metodoPago: input.metodoPago,
        mensaje: `Cobro asentado en el Waybill #${input.codigo}.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 14. Registrar evaluación de entrega del cliente / invitado en D1.
 */
export const registrarEntregaEvaluacionAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    vehiculoId: z.string().optional(),
    vehiculoNombre: z.string().optional(),
    calificacionGeneral: z.enum([
      'SOBRESALIENTE',
      'MUY_BUENO',
      'REGULAR',
      'ATENCION_REQUERIDA',
    ]),
    puntajeNumerico: z.number().int().min(1).max(5),
    aspectosDestacados: z.array(z.string()).default([]),
    desempenoVehiculo: z.enum(['IMPECABLE', 'OPTIMO', 'DETALLE_MENOR']),
    comentarioOpcional: z.string().optional(),
    cabinaSinObjetos: z.boolean().default(true),
    telemetriaVerificada: z.boolean().default(true),
    llavesEntregadas: z.boolean().default(true),
    combustibleNivel: z
      .enum(['MISMO_NIVEL', 'CARGA_COMPLETA', 'RECARGA_PENDIENTE'])
      .optional(),
    tokenAccesoPublico: z.string().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const usuario = context.locals.usuario;

    try {
      const res = await registrarEvaluacionEntregaClienteD1(db, {
        codigo: input.codigo,
        clienteId: usuario?.id,
        tokenAccesoPublico: input.tokenAccesoPublico,
        calificacionGeneral: input.calificacionGeneral,
        puntajeNumerico: input.puntajeNumerico,
        aspectosDestacados: input.aspectosDestacados,
        desempenoVehiculo: input.desempenoVehiculo,
        comentarioOpcional: input.comentarioOpcional,
        cabinaSinObjetos: input.cabinaSinObjetos,
        telemetriaVerificada: input.telemetriaVerificada,
        llavesEntregadas: input.llavesEntregadas,
        combustibleNivel: input.combustibleNivel,
      });

      return {
        ok: true,
        evaluacionId: res.evaluacionId,
        mensaje:
          'Evaluación recibida exitosamente. El equipo de patio verificará la devolución.',
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 15. Registrar o actualizar documentación KYC rápida de un cliente presencial en mostrador.
 */
export const registrarOActualizarDocumentosRapidoAction = defineAction({
  input: z.object({
    usuarioId: z.string().min(1, { error: 'ID de usuario requerido' }),
    tipoDocumento: z.enum(['CC', 'CE', 'PASAPORTE', 'NIT']),
    numeroDocumento: z.string().min(4, { error: 'Número de documento requerido' }),
    licenciaNumero: z.string().optional(),
    licenciaCategoria: z.string().optional(),
    licenciaVencimiento: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Fecha no válida' })
      .optional(),
    documentoFrenteKey: z.string().optional(),
    documentoDorsoKey: z.string().optional(),
    licenciaFrenteKey: z.string().optional(),
    licenciaDorsoKey: z.string().optional(),
    aprobarInmediato: z.boolean().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CLIENTES_ACTUALIZAR);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    try {
      await registrarOActualizarDocumentosClienteRapidoD1(db, {
        usuarioId: input.usuarioId,
        tipoDocumento: input.tipoDocumento,
        numeroDocumento: input.numeroDocumento,
        licenciaNumero: input.licenciaNumero,
        licenciaCategoria: input.licenciaCategoria,
        licenciaVencimiento: input.licenciaVencimiento,
        documentoFrenteKey: input.documentoFrenteKey,
        documentoDorsoKey: input.documentoDorsoKey,
        licenciaFrenteKey: input.licenciaFrenteKey,
        licenciaDorsoKey: input.licenciaDorsoKey,
        aprobarInmediato: input.aprobarInmediato,
        operadorId: usuario.id,
      });

      return {
        ok: true,
        mensaje: 'Documentos del cliente registrados/actualizados correctamente.',
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 16. Buscar clientes del local por nombre, correo o documento con estado KYC.
 */
export const buscarClientesLocalAction = defineAction({
  input: z.object({
    query: z.string().min(1, { error: 'Término de búsqueda requerido' }),
    limite: z.number().int().min(1).max(50).default(10).optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.CLIENTES_LEER);
    const localId = usuario.localActivo.id;

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const termino = `%${input.query.trim().toLowerCase()}%`;

    try {
      const filas = await db
        .select({
          id: user.id,
          nombre: user.name,
          correo: user.email,
          telefono: user.telefono,
          tipoDocumento: verificacionesIdentidad.tipoDocumento,
          numeroDocumento: verificacionesIdentidad.numeroDocumento,
          licenciaCategoria: verificacionesIdentidad.licenciaCategoria,
          estadoKyc: verificacionesIdentidad.estado,
        })
        .from(clientesLocal)
        .innerJoin(user, eq(clientesLocal.usuarioId, user.id))
        .leftJoin(
          verificacionesIdentidad,
          eq(clientesLocal.usuarioId, verificacionesIdentidad.usuarioId)
        )
        .where(
          and(
            eq(clientesLocal.localId, localId),
            or(
              like(sql`lower(${user.name})`, termino),
              like(sql`lower(${user.email})`, termino),
              like(
                sql`lower(${verificacionesIdentidad.numeroDocumento})`,
                termino
              )
            )
          )
        )
        .limit(input.limite ?? 10)
        .all();

      return {
        ok: true,
        clientes: filas.map((c) => ({
          id: c.id,
          nombre: c.nombre,
          correo: c.correo,
          telefono: c.telefono ?? null,
          tipoDocumento: c.tipoDocumento ?? null,
          numeroDocumento: c.numeroDocumento ?? null,
          licenciaCategoria: c.licenciaCategoria ?? null,
          estadoKyc: c.estadoKyc ?? 'SIN_DOCUMENTOS',
        })),
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});

/**
 * 17. Cambiar estado operativo de reserva (retrocompatible, delegando al servicio con RBAC).
 */
export const cambiarEstadoReservaAction = defineAction({
  input: z.object({
    codigo: z.string().min(1, { error: 'El código de reserva es obligatorio' }),
    vehiculoId: z.string().min(1, { error: 'El ID del vehículo es obligatorio' }),
    vehiculoNombre: z.string().min(1, { error: 'El nombre del vehículo es obligatorio' }),
    rangoFechas: z.string().min(1, { error: 'El rango de fechas es obligatorio' }),
    nuevoEstado: z.enum(estadosReserva),
    motivoRechazo: z.string().optional(),
    requiereMantenimiento: z.boolean().optional(),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context);
    const localId = usuario.localActivo.id;

    const sujeto = {
      rol: usuario.localActivo.rol,
      esSuperAdmin: usuario.esSuperAdmin,
      permisosConcedidos: usuario.localActivo.permisosConcedidos,
      permisosRevocados: usuario.localActivo.permisosRevocados,
    };

    if (input.nuevoEstado === 'CONFIRMADA' || input.nuevoEstado === 'RECHAZADA') {
      if (!tienePermiso(sujeto, PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR)) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: `No posee privilegios para ${input.nuevoEstado === 'CONFIRMADA' ? 'confirmar' : 'rechazar'} reservas (${PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR}).`,
        });
      }
    } else if (input.nuevoEstado === 'EN_CURSO') {
      if (
        !tienePermiso(sujeto, PERMISOS.CONTRATOS_CREAR) &&
        !tienePermiso(sujeto, PERMISOS.CONTRATOS_PAUSAR)
      ) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: `No posee privilegios para iniciar o reanudar contratos (${PERMISOS.CONTRATOS_CREAR}).`,
        });
      }
    } else if (input.nuevoEstado === 'PAUSADA') {
      if (!tienePermiso(sujeto, PERMISOS.CONTRATOS_PAUSAR)) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: `No posee privilegios para pausar contratos (${PERMISOS.CONTRATOS_PAUSAR}).`,
        });
      }
    } else if (input.nuevoEstado === 'COMPLETADA') {
      if (!tienePermiso(sujeto, PERMISOS.CONTRATOS_FINALIZAR)) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: `No posee privilegios para devolver y cerrar alquileres (${PERMISOS.CONTRATOS_FINALIZAR}).`,
        });
      }
    } else if (input.nuevoEstado === 'CANCELADA') {
      if (
        !tienePermiso(sujeto, PERMISOS.CONTRATOS_ANULAR) &&
        !tienePermiso(sujeto, PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR)
      ) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: `No posee privilegios para cancelar reservas (${PERMISOS.RESERVAS_CONFIRMAR_RECHAZAR} o ${PERMISOS.CONTRATOS_ANULAR}).`,
        });
      }
    } else if (input.nuevoEstado === 'PENDIENTE') {
      if (!tienePermiso(sujeto, PERMISOS.CONTRATOS_ANULAR)) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: `No posee privilegios para reabrir reservas (${PERMISOS.CONTRATOS_ANULAR}).`,
        });
      }
    }

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const actor = {
      usuarioId: usuario.id,
      rol: usuario.localActivo.rol,
      localId,
    };

    try {
      if (input.nuevoEstado === 'CONFIRMADA') {
        await confirmarReservaD1(db, {
          codigo: input.codigo,
          localId,
          usuarioId: usuario.id,
          autorizarSinDocumentos: true,
        });
      } else if (input.nuevoEstado === 'RECHAZADA') {
        await rechazarReservaD1(db, {
          codigo: input.codigo,
          localId,
          motivoRechazo:
            input.motivoRechazo ?? 'Rechazo operativo en cabina de mostrador',
          usuarioId: usuario.id,
          actor,
        });
      } else if (input.nuevoEstado === 'CANCELADA') {
        await cancelarReservaD1(db, {
          codigo: input.codigo,
          localId,
          motivoCancelacion: input.motivoRechazo,
          usuarioId: usuario.id,
          actor,
        });
      } else if (input.nuevoEstado === 'PAUSADA') {
        await pausarAlquilerD1(db, {
          codigo: input.codigo,
          localId,
          diasPausa: 1,
          usuarioId: usuario.id,
          actor,
        });
      } else if (input.nuevoEstado === 'EN_CURSO') {
        try {
          await reanudarAlquilerD1(db, {
            codigo: input.codigo,
            localId,
            usuarioId: usuario.id,
            actor,
          });
        } catch {
          await entregarVehiculoConContratoD1(db, {
            codigo: input.codigo,
            localId,
            usuarioId: usuario.id,
            medidorUsoEntrega: 0,
            autorizarSinDocumentos: true,
          });
        }
      } else if (input.nuevoEstado === 'COMPLETADA') {
        await devolverYCerrarAlquilerD1(db, {
          codigo: input.codigo,
          localId,
          usuarioId: usuario.id,
          medidorUsoRetorno: 0,
          requiereMantenimiento: input.requiereMantenimiento,
          actor,
        });
      } else if (input.nuevoEstado === 'PENDIENTE') {
        await reabrirReservaD1(db, {
          codigo: input.codigo,
          localId,
          motivoReapertura:
            input.motivoRechazo ?? 'Reapertura operativa desde cabina',
          usuarioId: usuario.id,
          actor,
        });
      }

      return {
        ok: true,
        codigo: input.codigo,
        nuevoEstado: input.nuevoEstado,
        mensaje: `Reserva #${input.codigo} actualizada a ${input.nuevoEstado}.`,
      };
    } catch (error) {
      manejarErrorCiclo(error);
    }
  },
});
