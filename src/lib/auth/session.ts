import type { RolSistema } from './rbac';
import type { AppDb } from '@/lib/db';
import { miembrosLocal, localesAlquiler } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export interface LocalActivoSesion {
  id: string;
  nombre: string;
  slug: string;
  rol: RolSistema;
  esDueno: boolean;
  onboardingCompletado: boolean;
}

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  esSuperAdmin: boolean;
  activo: boolean;
  localOrigenId: string | null;

  // Local en el que está interactuando en la sesión actual
  localActivo: LocalActivoSesion | null;
}

// Tipo de retrocompatibilidad
export type UsuarioAutenticado = {
  id: string;
  nombre: string;
  correo: string;
  rol: RolSistema;
  activo: boolean;
  localActivo?: LocalActivoSesion | null;
};

/**
 * Aserción para asegurar que existe un usuario autenticado.
 */
export function assertUsuarioAutenticado(
  usuario: UsuarioSesion | null
): asserts usuario is UsuarioSesion {
  if (!usuario) {
    throw new Error('Usuario no autenticado');
  }
  if (!usuario.activo) {
    throw new Error('Cuenta de usuario inactiva o suspendida');
  }
}

/**
 * Aserción para asegurar que el usuario tiene un local activo seleccionado
 * (Obligatorio para empleados y dueños).
 */
export function assertLocalActivo(
  usuario: UsuarioSesion
): asserts usuario is UsuarioSesion & { localActivo: LocalActivoSesion } {
  if (!usuario.localActivo) {
    throw new Error('Debe seleccionar un local de alquiler activo para operar');
  }
}

/**
 * Resuelve el local activo de la sesión actual de un usuario.
 * Prioridad:
 * 1. Local explícitamente solicitado (cookie o header) si el usuario es miembro activo.
 * 2. Primer local activo donde el usuario sea miembro activo (empleado/dueño).
 * 3. Local de origen asignado al usuario si opera como cliente (rol USUARIO).
 */
export async function resolveLocalActivo(
  db: AppDb,
  usuarioId: string,
  localOrigenId?: string | null,
  localIdSolicitado?: string | null
): Promise<LocalActivoSesion | null> {
  // 1. Verificar si el usuario es miembro del local solicitado
  if (localIdSolicitado) {
    const miembroSolicitado = await db
      .select({
        localId: localesAlquiler.id,
        nombreLocal: localesAlquiler.nombre,
        slugLocal: localesAlquiler.slug,
        rol: miembrosLocal.rol,
        duenoId: localesAlquiler.duenoId,
        localActivo: localesAlquiler.activo,
        onboardingCompletado: miembrosLocal.onboardingCompletado,
      })
      .from(miembrosLocal)
      .innerJoin(localesAlquiler, eq(miembrosLocal.localId, localesAlquiler.id))
      .where(
        and(
          eq(miembrosLocal.usuarioId, usuarioId),
          eq(miembrosLocal.localId, localIdSolicitado),
          eq(miembrosLocal.activo, true)
        )
      )
      .limit(1);

    const match = miembroSolicitado[0];
    if (match && match.localActivo) {
      return {
        id: match.localId,
        nombre: match.nombreLocal,
        slug: match.slugLocal,
        rol: match.rol,
        esDueno: match.duenoId === usuarioId,
        onboardingCompletado: Boolean(match.onboardingCompletado),
      };
    }
  }

  // 2. Asignar el primer local activo del que sea miembro
  const primerLocal = await db
    .select({
      localId: localesAlquiler.id,
      nombreLocal: localesAlquiler.nombre,
      slugLocal: localesAlquiler.slug,
      rol: miembrosLocal.rol,
      duenoId: localesAlquiler.duenoId,
      localActivo: localesAlquiler.activo,
      onboardingCompletado: miembrosLocal.onboardingCompletado,
    })
    .from(miembrosLocal)
    .innerJoin(localesAlquiler, eq(miembrosLocal.localId, localesAlquiler.id))
    .where(
      and(
        eq(miembrosLocal.usuarioId, usuarioId),
        eq(miembrosLocal.activo, true)
      )
    )
    .limit(1);

  const primerMatch = primerLocal[0];
  if (primerMatch && primerMatch.localActivo) {
    return {
      id: primerMatch.localId,
      nombre: primerMatch.nombreLocal,
      slug: primerMatch.slugLocal,
      rol: primerMatch.rol,
      esDueno: primerMatch.duenoId === usuarioId,
      onboardingCompletado: Boolean(primerMatch.onboardingCompletado),
    };
  }

  // 3. Si no es trabajador ni dueño, verificar local de origen como cliente
  if (localOrigenId) {
    const localOrigen = await db
      .select({
        id: localesAlquiler.id,
        nombre: localesAlquiler.nombre,
        slug: localesAlquiler.slug,
        duenoId: localesAlquiler.duenoId,
        activo: localesAlquiler.activo,
      })
      .from(localesAlquiler)
      .where(eq(localesAlquiler.id, localOrigenId))
      .limit(1);

    const matchOrigen = localOrigen[0];
    if (matchOrigen && matchOrigen.activo) {
      return {
        id: matchOrigen.id,
        nombre: matchOrigen.nombre,
        slug: matchOrigen.slug,
        rol: 'USUARIO',
        esDueno: false,
        onboardingCompletado: true, // Clientes no requieren inducción operativa de patio
      };
    }
  }

  return null;
}

/**
 * Resumen de una membresía activa de un colaborador para el selector multi-sede.
 */
export interface MembresiaLocalResumen {
  localId: string;
  nombreLocal: string;
  slugLocal: string;
  rol: RolSistema;
  esDueno: boolean;
  onboardingCompletado: boolean;
}

/**
 * Retorna todos los locales activos donde el usuario es miembro activo.
 * Usado por el selector rápido de sedes en la barra superior operativa.
 */
export async function obtenerLocalesMembresia(
  db: AppDb,
  usuarioId: string
): Promise<MembresiaLocalResumen[]> {
  const miembros = await db
    .select({
      localId: localesAlquiler.id,
      nombreLocal: localesAlquiler.nombre,
      slugLocal: localesAlquiler.slug,
      rol: miembrosLocal.rol,
      duenoId: localesAlquiler.duenoId,
      onboardingCompletado: miembrosLocal.onboardingCompletado,
      localActivo: localesAlquiler.activo,
    })
    .from(miembrosLocal)
    .innerJoin(localesAlquiler, eq(miembrosLocal.localId, localesAlquiler.id))
    .where(
      and(
        eq(miembrosLocal.usuarioId, usuarioId),
        eq(miembrosLocal.activo, true),
        eq(localesAlquiler.activo, true)
      )
    );

  return miembros.map((m) => ({
    localId: m.localId,
    nombreLocal: m.nombreLocal,
    slugLocal: m.slugLocal,
    rol: m.rol,
    esDueno: m.duenoId === usuarioId,
    onboardingCompletado: Boolean(m.onboardingCompletado),
  }));
}

/**
 * Marca como completada la inducción operativa inicial de un miembro de patio.
 */
export async function completarOnboardingOperativo(
  db: AppDb,
  usuarioId: string,
  localId: string
): Promise<void> {
  await db
    .update(miembrosLocal)
    .set({ onboardingCompletado: true })
    .where(
      and(
        eq(miembrosLocal.usuarioId, usuarioId),
        eq(miembrosLocal.localId, localId)
      )
    );
}

