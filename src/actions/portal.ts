import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import {
  requireAuth,
  requireLocalAuth,
} from '@/lib/auth';
import {
  obtenerLocalesMembresia,
  completarOnboardingOperativo,
} from '@/lib/auth/session';

const COOKIE_OPTIONS = {
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 30, // 30 días de persistencia
};

/**
 * Conmuta explícitamente entre el Portal de Cliente y el Portal Operativo de Patio.
 * Persiste la preferencia en cookie segura y valida membresías en D1.
 */
export const cambiarModoPortal = defineAction({
  input: z.object({
    modo: z.enum(['CLIENTE', 'ADMIN']),
  }),
  handler: async (input, context) => {
    const usuario = requireAuth(context);

    if (input.modo === 'CLIENTE') {
      context.cookies.set('movix_portal_modo', 'CLIENTE', COOKIE_OPTIONS);
      return {
        ok: true,
        modo: 'CLIENTE',
        rutaDestino: '/catalogo',
        onboardingPendiente: false,
      };
    }

    // Modo ADMIN / OPERATIVO
    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);

    if (usuario.esSuperAdmin) {
      context.cookies.set('movix_portal_modo', 'ADMIN', COOKIE_OPTIONS);
      return {
        ok: true,
        modo: 'ADMIN',
        rutaDestino: '/admin',
        onboardingPendiente: false,
      };
    }

    const membresias = await obtenerLocalesMembresia(db, usuario.id);

    const primerSede = membresias[0];
    if (!primerSede) {
      throw new ActionError({
        code: 'FORBIDDEN',
        message: 'No posees membresías operativas activas en ningún patio de alquiler.',
      });
    }

    // Resolver sede activa: si la actual es válida, mantenerla; si no, seleccionar la primera
    const sedeActualValida = membresias.find(
      (m) => m.localId === usuario.localActivo?.id
    );
    const sedeSeleccionada = sedeActualValida ?? primerSede;

    context.cookies.set('movix_portal_modo', 'ADMIN', COOKIE_OPTIONS);
    context.cookies.set(
      'movix_local_activo',
      sedeSeleccionada.localId,
      COOKIE_OPTIONS
    );

    const onboardingPendiente = !sedeSeleccionada.onboardingCompletado;
    const rutaDestino = onboardingPendiente ? '/admin/onboarding' : '/admin';

    return {
      ok: true,
      modo: 'ADMIN',
      rutaDestino,
      onboardingPendiente,
      localActivoId: sedeSeleccionada.localId,
    };
  },
});

/**
 * Conmuta la sede de trabajo activa en una experiencia multi-patio.
 */
export const conmutarLocalActivo = defineAction({
  input: z.object({
    localId: z.string().min(1, { error: 'El identificador del local es obligatorio' }),
  }),
  handler: async (input, context) => {
    const usuario = requireAuth(context);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const membresias = await obtenerLocalesMembresia(db, usuario.id);

    const membresiaDestino = membresias.find(
      (m) => m.localId === input.localId
    );

    if (!usuario.esSuperAdmin && !membresiaDestino) {
      throw new ActionError({
        code: 'FORBIDDEN',
        message: 'No tienes autorización para operar en la sede seleccionada.',
      });
    }

    context.cookies.set('movix_local_activo', input.localId, COOKIE_OPTIONS);

    const onboardingPendiente = Boolean(
      membresiaDestino && !membresiaDestino.onboardingCompletado
    );
    const rutaDestino = onboardingPendiente ? '/admin/onboarding' : '/admin';

    return {
      ok: true,
      localId: input.localId,
      onboardingPendiente,
      rutaDestino,
    };
  },
});

import { localesAlquiler, miembrosLocal } from '@/db/schema';

function generarSlug(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const sufijo = crypto.randomUUID().substring(0, 5);
  return `${base || 'patio'}-${sufijo}`;
}

/**
 * Registra la finalización de la inducción inicial del operador en patio.
 */
export const finalizarOnboardingOperativo = defineAction({
  handler: async (_input, context) => {
    const usuario = requireLocalAuth(context);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    await completarOnboardingOperativo(db, usuario.id, usuario.localActivo.id);

    return {
      ok: true,
      rutaDestino: '/admin',
    };
  },
});

/**
 * Crea un nuevo patio/sede de alquiler donde el usuario se convierte en DUENO.
 * Permite a cualquier cliente ofrecer sus vehículos de manera libre a otros usuarios.
 */
export const crearPatioOperativo = defineAction({
  input: z.object({
    nombre: z.string().min(3, { error: 'El nombre del negocio debe tener al menos 3 caracteres' }),
    ciudad: z.string().min(2, { error: 'La ciudad es obligatoria' }),
    direccion: z.string().optional(),
    telefono: z.string().optional(),
  }),
  handler: async (input, context) => {
    const usuario = requireAuth(context);

    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const localId = crypto.randomUUID();
    const slug = generarSlug(input.nombre);
    const ahora = new Date();

    // 1. Crear local en D1 con el usuario como DUENO
    await db.insert(localesAlquiler).values({
      id: localId,
      nombre: input.nombre.trim(),
      slug,
      ciudad: input.ciudad.trim(),
      direccion: input.direccion?.trim() || null,
      telefono: input.telefono?.trim() || null,
      duenoId: usuario.id,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

    // 2. Asociar membresía automática con rol DUENO
    await db.insert(miembrosLocal).values({
      id: crypto.randomUUID(),
      localId,
      usuarioId: usuario.id,
      rol: 'DUENO',
      activo: true,
      onboardingCompletado: true,
      creadoEn: ahora,
    });

    // 3. Establecer cookies de sesión activas
    context.cookies.set('movix_portal_modo', 'ADMIN', COOKIE_OPTIONS);
    context.cookies.set('movix_local_activo', localId, COOKIE_OPTIONS);

    return {
      ok: true,
      localId,
      nombre: input.nombre.trim(),
      rutaDestino: '/admin',
    };
  },
});
