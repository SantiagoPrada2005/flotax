import { defineAction, ActionError } from 'astro:actions';
import { marcarRevisionNavegacion } from '@/lib/pwa/revision';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import {
  guardarVehiculo,
  actualizarEstadoVehiculo,
  darDeBajaVehiculo,
  obtenerVehiculoAsync,
  actualizarGaleriaVehiculoD1,
} from '@/lib/flota/repositorio';
import { obtenerBloquesNoDisponiblesD1 } from '@/lib/flota/disponibilidad';
import { resolveClientTimeContext } from '@/lib/time/client-time';
import {
  obtenerCategoriaPorZona,
  type VehiculoItem,
  type CategoriaVehiculo,
  type VehiculoGaleriaFoto,
} from '@/lib/flota/types';
import {
  construirClaveR2MultimediaVehiculo,
  resolverUrlMultimediaR2,
} from '@/lib/media/r2-vehiculo-keys';
import {
  zonasEvidenciaVehiculo,
  type ZonaEvidenciaVehiculo,
  categoriasVehiculo,
  estadosVehiculo,
  transmisionesVehiculo,
  combustiblesVehiculo,
} from '@/db/schema';
import { requireLocalAuth, PERMISOS } from '@/lib/auth';

const CATEGORIA_ETIQUETAS: Record<CategoriaVehiculo, string> = {
  SEDAN: 'Sedán Ejecutivo',
  SUV: 'SUV Familiar',
  MOTO: 'Motocicleta Urbana',
  PATINETA: 'Monopatín Eléctrico',
  UTILITARIO: 'Utilitario Operativo',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

const galeriaFotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  categoria: z.enum(['EXTERIOR', 'INTERIOR', 'ESTADO']),
  zona: z.enum(zonasEvidenciaVehiculo).optional(),
  esPrincipal: z.boolean(),
  orden: z.number().int().min(0),
});

const galeriaArraySchema = z
  .array(galeriaFotoSchema)
  .min(1, { error: 'Debes agregar al menos una fotografía del vehículo.' })
  .max(24, { error: 'Se permiten máximo 24 fotografías por vehículo.' })
  .refine((fotos) => fotos.some((f) => f.esPrincipal), {
    error: 'Debes marcar una fotografía como imagen principal.',
  });

const vehiculoFormSchema = z.object({
  id: z.string().optional(),
  marca: z.string().min(1, { error: 'La marca es obligatoria' }),
  modelo: z.string().min(1, { error: 'El modelo es obligatorio' }),
  anio: z.number().int().min(1990).max(2035),
  categoria: z.enum(categoriasVehiculo),
  categoriaEtiqueta: z.string().optional(),
  placa: z.string().min(3, { error: 'La placa es obligatoria' }),
  estado: z.enum(estadosVehiculo),
  precioDia: z.number().min(0, { error: 'El precio por día debe ser mayor o igual a 0' }),
  depositoGarantia: z.number().min(0, { error: 'El depósito de garantía es obligatorio' }),
  transmision: z.enum(transmisionesVehiculo),
  combustible: z.enum(combustiblesVehiculo),
  capacidadPasajeros: z.number().int().min(1),
  autonomiaKm: z.number().optional(),
  kilometraje: z.number().min(0),
  imagenUrl: z.string().min(1, { error: 'Debes seleccionar una imagen principal para el vehículo.' }),
  galeria: galeriaArraySchema,
  destacado: z.boolean().optional(),
  descripcion: z.string().min(1, { error: 'La descripción es obligatoria' }),
  aceleracion: z.string().optional(),
  velocidadMaxima: z.string().optional(),
  rating: z.number().optional(),
  autonomiaOdo: z.string().optional(),
});

async function subirDataUrlAR2(params: {
  bucket: typeof env.BUCKET_MULTIMEDIA | undefined;
  localId: string;
  vehiculoId: string;
  dataUrl: string;
  zona: ZonaEvidenciaVehiculo;
  indice: number;
}): Promise<string> {
  const { bucket, localId, vehiculoId, dataUrl, zona, indice } = params;
  if (!bucket || !dataUrl.startsWith('data:image/')) {
    return dataUrl;
  }
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match || !match[1] || !match[2]) {
    return dataUrl;
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const ext =
    mimeType === 'image/webp'
      ? 'webp'
      : mimeType === 'image/png'
        ? 'png'
        : 'jpg';
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const r2Key = construirClaveR2MultimediaVehiculo({
    localId,
    vehiculoId,
    etapaOperativa: 'CATALOGO_ESTUDIO',
    zonaEvidencia: zona,
    extension: ext,
    timestampMs: Date.now() + indice,
  });
  await bucket.put(r2Key, bytes.buffer, {
    httpMetadata: { contentType: mimeType },
  });
  return resolverUrlMultimediaR2(r2Key);
}

function zonaPorFoto(foto: {
  zona?: ZonaEvidenciaVehiculo | undefined;
  esPrincipal: boolean;
  categoria: 'EXTERIOR' | 'INTERIOR' | 'ESTADO';
}): ZonaEvidenciaVehiculo {
  if (foto.zona) return foto.zona;
  if (foto.esPrincipal) return 'EXTERIOR_LATERAL_IZQ';
  if (foto.categoria === 'INTERIOR') return 'INTERIOR_CABINA';
  if (foto.categoria === 'ESTADO') return 'PANTALLA_TABLERO_ODOMETRO';
  return 'EXTERIOR_FRONTAL';
}

async function resolverGaleriaParaR2(params: {
  bucket: typeof env.BUCKET_MULTIMEDIA | undefined;
  localId: string;
  vehiculoId: string;
  galeria: Array<z.infer<typeof galeriaFotoSchema>>;
}): Promise<VehiculoGaleriaFoto[]> {
  return Promise.all(
    params.galeria.map(async (foto, idx) => {
      const zona = zonaPorFoto(foto);
      return {
        id: foto.id,
        url: await subirDataUrlAR2({
          bucket: params.bucket,
          localId: params.localId,
          vehiculoId: params.vehiculoId,
          dataUrl: foto.url.trim(),
          zona,
          indice: idx,
        }),
        categoria: foto.zona ? obtenerCategoriaPorZona(foto.zona) : foto.categoria,
        zona,
        esPrincipal: foto.esPrincipal,
        orden: idx,
      };
    })
  );
}

/**
 * Crea una nueva unidad en la flota o actualiza una existente.
 */
export const guardarVehiculoAction = defineAction({
  input: vehiculoFormSchema,
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const esEdicion = Boolean(input.id && input.id.trim().length > 0);
    const usuario = requireLocalAuth(
      context,
      esEdicion ? PERMISOS.FLOTA_ACTUALIZAR : PERMISOS.FLOTA_CREAR
    );
    const localId = usuario.localActivo.id;

    const db = env.DB ? getDb(env.DB) : undefined;

    const id = esEdicion
      ? input.id!.trim()
      : `veh-${slugify(input.marca)}-${slugify(input.modelo)}-${crypto.randomUUID().slice(0, 6)}`;

    const categoriaEtiqueta =
      input.categoriaEtiqueta?.trim() ||
      CATEGORIA_ETIQUETAS[input.categoria] ||
      input.categoria;

    const isElectrico =
      input.combustible === 'Eléctrico' || input.combustible === 'Híbrido';

    const bucket = env.BUCKET_MULTIMEDIA;

    const galeriaResuelta = await resolverGaleriaParaR2({
      bucket,
      localId,
      vehiculoId: id,
      galeria: input.galeria,
    });

    const portadaGaleria =
      galeriaResuelta.find((f) => f.esPrincipal)?.url ??
      galeriaResuelta[0]?.url;

    const imagenPrincipalResuelta =
      portadaGaleria ??
      (await subirDataUrlAR2({
        bucket,
        localId,
        vehiculoId: id,
        dataUrl: input.imagenUrl.trim(),
        zona: 'EXTERIOR_LATERAL_IZQ',
        indice: 0,
      }));

    const vehiculoItem: VehiculoItem = {
      id,
      marca: input.marca.trim(),
      modelo: input.modelo.trim(),
      anio: input.anio,
      categoria: input.categoria,
      categoriaEtiqueta,
      placa: input.placa.trim().toUpperCase(),
      estado: input.estado,
      precioDia: Math.round(input.precioDia),
      depositoGarantia: Math.round(input.depositoGarantia),
      transmision: input.transmision,
      combustible: input.combustible,
      capacidadPasajeros: input.capacidadPasajeros,
      autonomiaKm: input.autonomiaKm,
      kilometraje: Math.round(input.kilometraje),
      imagenUrl: imagenPrincipalResuelta,
      galeria: galeriaResuelta,
      destacado: Boolean(input.destacado),
      descripcion: input.descripcion.trim(),
      aceleracion: input.aceleracion?.trim() || (isElectrico ? '4.5 s' : '7.2 s'),
      velocidadMaxima: input.velocidadMaxima?.trim() || (isElectrico ? '180 km/h' : '200 km/h'),
      rating: input.rating ?? 4.8,
      autonomiaOdo: input.autonomiaOdo?.trim() || `${input.kilometraje.toLocaleString('es-CO')} km`,
      tipoPropulsionIcon: isElectrico ? 'electric' : 'gas',
    };

    try {
      const guardado = await guardarVehiculo(vehiculoItem, db, localId);
      return {
        ok: true,
        accion: esEdicion ? 'actualizado' : 'creado',
        mensaje: esEdicion
          ? `Unidad ${guardado.marca} ${guardado.modelo} modificada con éxito.`
          : `Nueva unidad ${guardado.marca} ${guardado.modelo} dada de alta en la flota.`,
        vehiculo: guardado,
      };
    } catch (err) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'No fue posible guardar la unidad en la flota. Verifique los datos.',
      });
    }
  },
});

/**
 * Cambia rápidamente el estado operativo de una unidad (Disponible, Reservado, etc.)
 */
export const cambiarEstadoVehiculoAction = defineAction({
  input: z.object({
    id: z.string().min(1, { error: 'ID de unidad requerido' }),
    estado: z.enum(estadosVehiculo),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    requireLocalAuth(context, PERMISOS.FLOTA_CAMBIAR_ESTADO);
    const db = env.DB ? getDb(env.DB) : undefined;
    const actualizado = await actualizarEstadoVehiculo(input.id, input.estado, db);

    if (!actualizado) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: 'La unidad solicitada no existe en el registro.',
      });
    }

    return {
      ok: true,
      mensaje: `Estado de la unidad actualizado a ${input.estado}.`,
      vehiculo: actualizado,
    };
  },
});

/**
 * Elimina o retira una unidad de la flota.
 */
export const eliminarVehiculoAction = defineAction({
  input: z.object({
    id: z.string().min(1, { error: 'ID de unidad requerido' }),
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    requireLocalAuth(context, PERMISOS.FLOTA_ELIMINAR);
    const db = env.DB ? getDb(env.DB) : undefined;
    const eliminado = await darDeBajaVehiculo(input.id, db);

    if (!eliminado) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: 'La unidad que desea retirar no fue encontrada.',
      });
    }

    return {
      ok: true,
      mensaje: 'La unidad fue retirada exitosamente de la flota.',
      id: input.id,
    };
  },
});

/**
 * Consulta los datos actuales de una unidad para edición.
 */
export const obtenerVehiculoDetalleAction = defineAction({
  input: z.object({
    id: z.string().min(1, { error: 'ID de unidad requerido' }),
  }),
  handler: async (input, context) => {
    requireLocalAuth(context, PERMISOS.FLOTA_LEER);
    const db = env.DB ? getDb(env.DB) : undefined;
    const vehiculo = await obtenerVehiculoAsync(input.id, db);

    if (!vehiculo) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: 'Vehículo no encontrado.',
      });
    }

    return {
      ok: true,
      vehiculo,
    };
  },
});

/**
 * Consulta en Cloudflare D1 los bloques reales de indisponibilidad (reservas y mantenimientos)
 * para un vehículo determinado, permitiendo refrescar el calendario en el cliente.
 */
export const consultarDisponibilidadVehiculoAction = defineAction({
  input: z.object({
    vehiculoId: z.string().min(1, { error: 'ID de vehículo requerido' }),
    horizonteDias: z.number().int().positive().optional(),
  }),
  handler: async (input, context) => {
    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const { dateString: hoyISO } = resolveClientTimeContext(context.request);
    const horizonte = input.horizonteDias ?? 180;

    const bloques = await obtenerBloquesNoDisponiblesD1(
      db,
      input.vehiculoId,
      hoyISO,
      horizonte
    );

    return {
      ok: true,
      vehiculoId: input.vehiculoId,
      hoyISO,
      bloques,
    };
  },
});

/**
 * Actualiza las fotografías por perspectiva de la ficha técnica de un vehículo sin modificar otros datos.
 */
export const actualizarGaleriaVehiculoAction = defineAction({
  input: z.object({
    vehiculoId: z.string().min(1, { error: 'ID de vehículo requerido' }),
    galeria: galeriaArraySchema,
  }),
  handler: async (input, context) => {
    marcarRevisionNavegacion(context.cookies);
    const usuario = requireLocalAuth(context, PERMISOS.FLOTA_ACTUALIZAR);
    if (!env.DB) {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Base de datos no disponible.',
      });
    }

    const db = getDb(env.DB);
    const vehiculo = await obtenerVehiculoAsync(
      input.vehiculoId,
      db,
      usuario.esSuperAdmin ? undefined : usuario.localActivo.id
    );

    if (!vehiculo) {
      throw new ActionError({
        code: 'NOT_FOUND',
        message: 'Vehículo no encontrado en tu local operativo.',
      });
    }

    const localId = vehiculo.localId ?? usuario.localActivo.id;
    const galeriaResuelta = await resolverGaleriaParaR2({
      bucket: env.BUCKET_MULTIMEDIA,
      localId,
      vehiculoId: vehiculo.id,
      galeria: input.galeria,
    });

    const imagenPrincipal =
      galeriaResuelta.find((f) => f.esPrincipal)?.url ??
      galeriaResuelta[0]?.url ??
      vehiculo.imagenUrl;

    try {
      await actualizarGaleriaVehiculoD1(db, {
        vehiculoId: vehiculo.id,
        localId,
        galeria: galeriaResuelta,
        imagenUrlPrincipal: imagenPrincipal,
      });

      return {
        ok: true,
        vehiculoId: vehiculo.id,
        imagenUrl: imagenPrincipal,
        galeria: galeriaResuelta,
        mensaje: 'Galería fotográfica actualizada con éxito.',
      };
    } catch {
      throw new ActionError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'No fue posible guardar las fotografías en la ficha técnica.',
      });
    }
  },
});
