import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import {
  registrarMovimientoRepo,
  anularMovimientoRepo,
  registrarTransferenciaInternaRepo,
  aperturaCajaRepo,
  cierreCajaRepo,
  gestionarGarantiaRepo,
  crearCuentaRepo,
} from '@/lib/caja';
import { crearServicioNotificaciones } from '@/lib/notificaciones';
import { requireLocalAuth, PERMISOS } from '@/lib/auth';
import {
  metodosPagoFinanciero,
  categoriasMovimiento,
  tiposCuentaFinanciera,
} from '@/db/schema';

const metodoPagoSchema = z.enum(metodosPagoFinanciero);

/** Subconjunto operable del formulario: las transferencias tienen su propia acción. */
const tiposMovimientoRegistrable = ['INGRESO', 'EGRESO'] as const;

/** Estados asignables al crear: `ANULADO` lo produce la anulación, no el alta. */
const estadosMovimientoRegistrable = ['CONFIRMADO', 'PENDIENTE'] as const;

export const registrarMovimientoAction = defineAction({
  input: z.object({
    tipo: z.enum(tiposMovimientoRegistrable),
    categoria: z.enum(categoriasMovimiento, { error: 'La categoría no es válida' }),
    concepto: z.string().min(3, { error: 'El concepto debe tener al menos 3 caracteres' }),
    monto: z.number().positive({ error: 'El monto debe ser un valor positivo en COP' }),
    metodoPago: metodoPagoSchema,
    cuentaId: z.string().min(1, { error: 'La cuenta financiera es obligatoria' }),
    contratoId: z.string().optional(),
    clienteNombre: z.string().optional(),
    vehiculoId: z.string().optional(),
    proveedor: z.string().optional(),
    referencia: z.string().optional(),
    observaciones: z.string().optional(),
    estado: z.enum(estadosMovimientoRegistrable).optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(
      context,
      input.tipo === 'INGRESO'
        ? PERMISOS.CAJA_ABONOS_REGISTRAR
        : PERMISOS.CAJA_GASTOS_REGISTRAR
    );
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const movimiento = await registrarMovimientoRepo({
      localId,
      tipo: input.tipo,
      categoria: input.categoria,
      concepto: input.concepto,
      monto: input.monto,
      metodoPago: input.metodoPago,
      cuentaId: input.cuentaId,
      contratoId: input.contratoId,
      clienteNombre: input.clienteNombre,
      vehiculoId: input.vehiculoId,
      proveedor: input.proveedor,
      referencia: input.referencia,
      observaciones: input.observaciones,
      estado: input.estado,
      usuarioId: usuario.id,
      db,
    });

    if (env.DB) {
      try {
        await crearServicioNotificaciones(env, context.locals.logger).notificar({
          tipo: input.tipo === 'INGRESO' ? 'ABONO_REGISTRADO' : 'SOLICITUD_NUEVA',
          payload: {
            contratoId: input.contratoId ?? movimiento.id,
            montoFormateado: new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0,
            }).format(input.monto),
            metodoPago: input.metodoPago,
          },
          destino: {
            alcance: 'LOCAL_ROLES',
            localId,
            roles: ['DUENO', 'ADMIN', 'AUDITOR_FINANCIERO'],
          },
          localId,
          actorId: usuario.id,
        });
      } catch {
        // Tolerante en entornos sin notificaciones configuradas
      }
    }

    return {
      ok: true,
      mensaje: `${input.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} asentado exitosamente`,
      movimiento,
    };
  },
});

export const anularMovimientoAction = defineAction({
  input: z.object({
    movimientoId: z.string().min(1, { error: 'El ID de movimiento es obligatorio' }),
    motivo: z.string().min(5, { error: 'El motivo de anulación debe tener al menos 5 caracteres' }),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_GASTOS_REGISTRAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const movimiento = await anularMovimientoRepo({
      movimientoId: input.movimientoId,
      motivo: input.motivo,
      usuarioId: usuario.id,
      localId,
      db,
    });

    return {
      ok: true,
      mensaje: `Movimiento #${input.movimientoId} anulado con registro de auditoría`,
      movimiento,
    };
  },
});

export const registrarTransferenciaAction = defineAction({
  input: z.object({
    cuentaOrigenId: z.string().min(1, { error: 'La cuenta origen es requerida' }),
    cuentaDestinoId: z.string().min(1, { error: 'La cuenta destino es requerida' }),
    monto: z.number().positive({ error: 'El monto debe ser positivo' }),
    concepto: z.string().min(3, { error: 'El concepto debe tener al menos 3 caracteres' }),
    referencia: z.string().optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_GASTOS_REGISTRAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const movimiento = await registrarTransferenciaInternaRepo({
      cuentaOrigenId: input.cuentaOrigenId,
      cuentaDestinoId: input.cuentaDestinoId,
      monto: input.monto,
      concepto: input.concepto,
      referencia: input.referencia,
      usuarioId: usuario.id,
      localId,
      db,
    });

    return {
      ok: true,
      mensaje: 'Transferencia interna realizada exitosamente',
      movimiento,
    };
  },
});

export const aperturaCajaAction = defineAction({
  input: z.object({
    cuentaId: z.string().min(1, { error: 'La caja o punto operativo es requerido' }),
    saldoInicialContado: z.number().min(0, { error: 'El saldo inicial contado debe ser mayor o igual a 0' }),
    observaciones: z.string().optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const sesion = await aperturaCajaRepo({
      cuentaId: input.cuentaId,
      saldoInicialContado: input.saldoInicialContado,
      observaciones: input.observaciones,
      usuarioId: usuario.id,
      localId,
      db,
    });

    return {
      ok: true,
      mensaje: 'Apertura de turno de caja iniciada con éxito',
      sesion,
    };
  },
});

export const cierreCajaAction = defineAction({
  input: z.object({
    sesionId: z.string().min(1, { error: 'El ID de la sesión es requerido' }),
    saldoRealContado: z.number().min(0, { error: 'El saldo contado debe ser un valor válido' }),
    motivoDiferencia: z.string().optional(),
    observaciones: z.string().optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ARQUEO_CERRAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const sesion = await cierreCajaRepo({
      sesionId: input.sesionId,
      saldoRealContado: input.saldoRealContado,
      motivoDiferencia: input.motivoDiferencia,
      observaciones: input.observaciones,
      usuarioId: usuario.id,
      localId,
      db,
    });

    return {
      ok: true,
      mensaje: 'Cierre de caja y arqueo completado correctamente',
      sesion,
    };
  },
});

export const registrarAbonoAction = defineAction({
  input: z.object({
    contratoId: z.string().min(1, { error: 'El código de contrato es requerido' }),
    monto: z.number().positive({ error: 'El monto del abono debe ser mayor a cero' }),
    metodoPago: metodoPagoSchema,
    cuentaId: z.string().optional(),
    referencia: z.string().optional(),
    notas: z.string().optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const cuentaId =
      input.cuentaId ??
      (input.metodoPago === 'efectivo'
        ? 'cta-caja-principal'
        : 'cta-bancolombia-ope');

    const movimiento = await registrarMovimientoRepo({
      localId,
      tipo: 'INGRESO',
      categoria: 'ABONO_CONTRATO',
      concepto: `Abono a contrato #${input.contratoId}`,
      monto: input.monto,
      metodoPago: input.metodoPago,
      cuentaId,
      contratoId: input.contratoId,
      referencia: input.referencia,
      observaciones: input.notas,
      usuarioId: usuario.id,
      db,
    });

    if (env.DB) {
      try {
        await crearServicioNotificaciones(env, context.locals.logger).notificar({
          tipo: 'ABONO_REGISTRADO',
          payload: {
            contratoId: input.contratoId,
            montoFormateado: new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: 'COP',
              maximumFractionDigits: 0,
            }).format(input.monto),
            metodoPago: input.metodoPago,
          },
          destino: {
            alcance: 'LOCAL_ROLES',
            localId,
            roles: ['DUENO', 'ADMIN', 'AUDITOR_FINANCIERO'],
          },
          localId,
          actorId: usuario.id,
        });
      } catch {
        // Fallback
      }
    }

    return {
      ok: true,
      mensaje: `Abono de ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(input.monto)} asentado al contrato #${input.contratoId}`,
      movimiento,
    };
  },
});

export const gestionarGarantiaAction = defineAction({
  input: z.object({
    garantiaId: z.string().min(1, { error: 'El ID de la garantía es requerido' }),
    accion: z.enum(['RECIBIR', 'DEVOLVER', 'RETENER_CARGOS']),
    monto: z.number().positive({ error: 'El monto debe ser mayor a cero' }),
    cuentaId: z.string().optional(),
    metodoPago: metodoPagoSchema.optional(),
    referencia: z.string().optional(),
    motivo: z.string().optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const garantia = await gestionarGarantiaRepo({
      garantiaId: input.garantiaId,
      accion: input.accion,
      monto: input.monto,
      cuentaId: input.cuentaId,
      metodoPago: input.metodoPago,
      referencia: input.referencia,
      motivo: input.motivo,
      usuarioId: usuario.id,
      localId,
      db,
    });

    const accionMsg =
      input.accion === 'RECIBIR'
        ? 'recibida en custodia'
        : input.accion === 'DEVOLVER'
          ? 'restituida al cliente'
          : 'aplicada a cargos autorizados';

    return {
      ok: true,
      mensaje: `Garantía contractual #${input.garantiaId} ${accionMsg} exitosamente`,
      garantia,
    };
  },
});

export const crearCuentaAction = defineAction({
  input: z.object({
    nombre: z.string().min(2, { error: 'El nombre de la cuenta debe tener al menos 2 caracteres' }),
    tipo: z.enum(tiposCuentaFinanciera),
    saldoInicial: z.number().min(0, { error: 'El saldo inicial no puede ser negativo' }),
  }),
  handler: async (input, context) => {
    const usuario = requireLocalAuth(context, PERMISOS.LOCAL_GESTIONAR);
    const localId = usuario.localActivo.id;
    const db = env.DB ? getDb(env.DB) : undefined;

    const cuenta = await crearCuentaRepo({
      nombre: input.nombre,
      tipo: input.tipo,
      saldoInicial: input.saldoInicial,
      localId,
      usuarioId: usuario.id,
      db,
    });

    return {
      ok: true,
      mensaje: `Cuenta "${input.nombre}" creada satisfactoriamente`,
      cuenta,
    };
  },
});