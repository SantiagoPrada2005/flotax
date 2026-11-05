import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import {
  localesAlquiler,
  clientesLocal,
  user,
  politicasLocal,
  cuentasFinancieras,
} from '@/db/schema';
import type { LocalAlquilerSelect } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

export const COOKIE_LOCAL_CAPTACION = 'movix_local_captacion';

/** Proyección pública del tenant: subconjunto de `locales_alquiler` visible al cliente. */
export type LocalPublicoContexto = Pick<
  LocalAlquilerSelect,
  'id' | 'nombre' | 'slug' | 'ciudad' | 'direccion' | 'telefono'
>;

export const LOCAL_CANONICO_DEFECTO: LocalPublicoContexto = {
  id: 'local-patio-norte',
  nombre: 'FlotaX Patio Norte',
  slug: 'patio-norte',
  ciudad: 'Medellín',
  direccion: 'Av. El Poblado #10-45, Sede Principal',
  telefono: '+57 300 450 8890',
};

// Registro en memoria para entornos de desarrollo o pre-migración D1
const registroLocalesMemoria = new Map<string, LocalPublicoContexto>([
  [LOCAL_CANONICO_DEFECTO.id, { ...LOCAL_CANONICO_DEFECTO }],
]);

export function normalizarSlugLocal(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function registrarLocalEnMemoria(local: LocalPublicoContexto): void {
  registroLocalesMemoria.set(local.id, { ...local });
}

/**
 * Busca un local activo por su `slug` comercial o por su `id` único.
 * Consulta primero Cloudflare D1 y mantiene sincronizado el registro en memoria.
 */
export async function obtenerLocalPorSlugOId(
  identificador: string,
  db?: AppDb
): Promise<LocalPublicoContexto | null> {
  const limpio = identificador.trim();
  if (!limpio) return null;
  const slugNormalizado = normalizarSlugLocal(limpio);

  if (db) {
    try {
      const filas = await db
        .select({
          id: localesAlquiler.id,
          nombre: localesAlquiler.nombre,
          slug: localesAlquiler.slug,
          ciudad: localesAlquiler.ciudad,
          direccion: localesAlquiler.direccion,
          telefono: localesAlquiler.telefono,
          activo: localesAlquiler.activo,
        })
        .from(localesAlquiler)
        .where(
          and(
            eq(localesAlquiler.activo, true),
            or(
              eq(localesAlquiler.slug, limpio),
              eq(localesAlquiler.slug, slugNormalizado),
              eq(localesAlquiler.id, limpio)
            )
          )
        )
        .limit(1);

      const encontrado = filas[0];
      if (encontrado) {
        const ctx: LocalPublicoContexto = {
          id: encontrado.id,
          nombre: encontrado.nombre,
          slug: encontrado.slug,
          ciudad: encontrado.ciudad ?? 'Medellín',
          direccion: encontrado.direccion ?? null,
          telefono: encontrado.telefono ?? null,
        };
        registroLocalesMemoria.set(ctx.id, ctx);
        return ctx;
      }
    } catch (error) {
      // Fallback transparente a memoria si la tabla no responde
      logFalloD1('locales.porSlugOId.select', error, { identificador: limpio });
    }
  }

  for (const item of registroLocalesMemoria.values()) {
    if (
      item.id === limpio ||
      item.slug === limpio ||
      item.slug === slugNormalizado
    ) {
      return { ...item };
    }
  }

  return null;
}

/**
 * Obtiene el local público por defecto cuando aún no se ha fijado uno específico.
 */
export async function obtenerLocalCatalogoPorDefecto(
  db?: AppDb
): Promise<LocalPublicoContexto> {
  if (db) {
    try {
      const filas = await db
        .select({
          id: localesAlquiler.id,
          nombre: localesAlquiler.nombre,
          slug: localesAlquiler.slug,
          ciudad: localesAlquiler.ciudad,
          direccion: localesAlquiler.direccion,
          telefono: localesAlquiler.telefono,
        })
        .from(localesAlquiler)
        .where(eq(localesAlquiler.activo, true))
        .limit(1);

      const primero = filas[0];
      if (primero) {
        const ctx: LocalPublicoContexto = {
          id: primero.id,
          nombre: primero.nombre,
          slug: primero.slug,
          ciudad: primero.ciudad ?? 'Medellín',
          direccion: primero.direccion ?? null,
          telefono: primero.telefono ?? null,
        };
        registroLocalesMemoria.set(ctx.id, ctx);
        return ctx;
      }
    } catch (error) {
      // Continuar con fallback canónico
      logFalloD1('locales.porDefecto.select', error, {});
    }
  }

  return (
    registroLocalesMemoria.get(LOCAL_CANONICO_DEFECTO.id) ??
    LOCAL_CANONICO_DEFECTO
  );
}

/**
 * Registra de forma idempotente la captación de un cliente por un local:
 * 1. Si el usuario aún no posee `localOrigenId`, se fija este local como su captador original.
 * 2. Inserta o actualiza la relación en `clientes_local` con la marca de tiempo de última visita.
 */
export async function registrarCaptacionClienteEnLocal(
  db: AppDb,
  usuarioId: string,
  localId: string
): Promise<void> {
  try {
    const ahora = new Date();

    // 1. Verificar usuario actual para proteger el primer local de captación (anti-fuga)
    const usuarioRows = await db
      .select({
        id: user.id,
        localOrigenId: user.localOrigenId,
      })
      .from(user)
      .where(eq(user.id, usuarioId))
      .limit(1);

    const usr = usuarioRows[0];
    const sinLocalOrigenPrevio = Boolean(usr && !usr.localOrigenId);

    if (sinLocalOrigenPrevio) {
      await db
        .update(user)
        .set({
          localOrigenId: localId,
          updatedAt: ahora,
        })
        .where(eq(user.id, usuarioId));
    }

    // 2. Verificar si ya existe registro en clientes_local
    const relacionExistente = await db
      .select({
        id: clientesLocal.id,
      })
      .from(clientesLocal)
      .where(
        and(
          eq(clientesLocal.usuarioId, usuarioId),
          eq(clientesLocal.localId, localId)
        )
      )
      .limit(1);

    if (relacionExistente[0]) {
      await db
        .update(clientesLocal)
        .set({
          ultimaVisitaEn: ahora,
        })
        .where(eq(clientesLocal.id, relacionExistente[0].id));
    } else {
      await db.insert(clientesLocal).values({
        id: crypto.randomUUID(),
        usuarioId,
        localId,
        esLocalOrigen: sinLocalOrigenPrevio,
        esPreferido: true,
        ultimaVisitaEn: ahora,
        creadoEn: ahora,
      });
    }
  } catch (error) {
    // No bloquear el flujo del cliente si el local es de demostración en memoria
    logFalloD1('clientesLocal.upsert', error, { usuarioId, localId });
  }
}

/**
 * Permite al dueño o administrador del local actualizar el slug público,
 * teléfono de atención y dirección que ven sus clientes en el link compartido.
 */
export async function actualizarConfigCatalogoLocal(
  localId: string,
  datos: {
    slug: string;
    nombre?: string | undefined;
    ciudad?: string | undefined;
    direccion?: string | undefined;
    telefono?: string | undefined;
  },
  db?: AppDb
): Promise<{ ok: boolean; local?: LocalPublicoContexto; error?: string }> {
  const slugLimpio = normalizarSlugLocal(datos.slug);
  if (!slugLimpio || slugLimpio.length < 3) {
    return {
      ok: false,
      error: 'El identificador del enlace debe tener al menos 3 caracteres válidos.',
    };
  }

  const previo =
    (await obtenerLocalPorSlugOId(localId, db)) ?? LOCAL_CANONICO_DEFECTO;

  if (db) {
    try {
      // Verificar que ningún otro local tenga ya ese slug
      const colision = await db
        .select({ id: localesAlquiler.id })
        .from(localesAlquiler)
        .where(eq(localesAlquiler.slug, slugLimpio))
        .limit(1);

      if (colision[0] && colision[0].id !== localId) {
        return {
          ok: false,
          error: 'Este enlace personalizado ya está en uso por otra sede. Elige uno distinto.',
        };
      }

      const ahora = new Date();
      await db
        .update(localesAlquiler)
        .set({
          slug: slugLimpio,
          nombre: datos.nombre?.trim() || previo.nombre,
          ciudad: datos.ciudad?.trim() || previo.ciudad,
          direccion: datos.direccion?.trim() || previo.direccion,
          telefono: datos.telefono?.trim() || previo.telefono,
          actualizadoEn: ahora,
        })
        .where(eq(localesAlquiler.id, localId));
    } catch (error) {
      // Fallback a actualización en memoria
      logFalloD1('locales.actualizarCatalogo.update', error, { localId });
    }
  }

  const actualizado: LocalPublicoContexto = {
    id: localId,
    nombre: datos.nombre?.trim() || previo.nombre,
    slug: slugLimpio,
    ciudad: datos.ciudad?.trim() ?? previo.ciudad ?? 'Medellín',
    direccion: datos.direccion?.trim() ?? previo.direccion,
    telefono: datos.telefono?.trim() ?? previo.telefono,
  };

  registroLocalesMemoria.set(localId, actualizado);
  if (localId === LOCAL_CANONICO_DEFECTO.id) {
    LOCAL_CANONICO_DEFECTO.slug = actualizado.slug;
    LOCAL_CANONICO_DEFECTO.nombre = actualizado.nombre;
    LOCAL_CANONICO_DEFECTO.ciudad = actualizado.ciudad;
    LOCAL_CANONICO_DEFECTO.direccion = actualizado.direccion;
    LOCAL_CANONICO_DEFECTO.telefono = actualizado.telefono;
  }

  return {
    ok: true,
    local: actualizado,
  };
}

/**
 * Garantiza de forma idempotente que un local cuente con sus políticas contractuales
 * y al menos una cuenta financiera activa en D1 para operar reservas, caja y cobros.
 */
export async function asegurarConfiguracionBaseLocal(
  db: AppDb,
  localId: string
): Promise<void> {
  const ahora = new Date();

  try {
    // 1. Políticas operativas del local
    const polExistente = await db
      .select({ id: politicasLocal.id })
      .from(politicasLocal)
      .where(eq(politicasLocal.localId, localId))
      .limit(1);

    if (!polExistente[0]) {
      await db
        .insert(politicasLocal)
        .values({
          id: `pol-${localId.slice(0, 24)}`,
          localId,
          abonoMinimoPct: 30,
          coberturaPericialPct: 8,
          recargoMoraDiariaPct: 200,
          recargoAdminFotomultaPct: 30,
          cargoLavadoEstandar: 45000,
          limiteKmDiario: null,
          cargoKmAdicional: 0,
          nitArrendador: '901.482.109-4 · FlotaX Mobility S.A.S.',
          representanteLegal: 'Representante Operativo FlotaX',
          municipioContractual: 'Medellín, Antioquia',
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
        .onConflictDoNothing();
    }

    // 2. Cuentas financieras operativas
    const ctaExistente = await db
      .select({ id: cuentasFinancieras.id })
      .from(cuentasFinancieras)
      .where(
        and(
          eq(cuentasFinancieras.localId, localId),
          eq(cuentasFinancieras.activo, true)
        )
      )
      .limit(1);

    if (!ctaExistente[0]) {
      await db
        .insert(cuentasFinancieras)
        .values([
          {
            id: `cta-caja-${localId.slice(0, 20)}`,
            localId,
            nombre: 'Caja Operativa (Efectivo)',
            tipo: 'CAJA_EFECTIVO',
            saldoInicial: 1_000_000,
            activo: true,
            creadoEn: ahora,
            actualizadoEn: ahora,
          },
          {
            id: `cta-banco-${localId.slice(0, 20)}`,
            localId,
            nombre: 'Cuenta Bancaria Recaudos',
            tipo: 'BANCO',
            saldoInicial: 5_000_000,
            activo: true,
            creadoEn: ahora,
            actualizadoEn: ahora,
          },
        ])
        .onConflictDoNothing();
    }
  } catch (error) {
    logFalloD1('locales.asegurarConfiguracionBase', error, { localId });
  }
}

