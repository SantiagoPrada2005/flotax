import { defineAction, ActionError } from 'astro:actions';
import { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '@/lib/db';
import {
  guardarVehiculo,
  actualizarEstadoVehiculo,
  darDeBajaVehiculo,
  obtenerVehiculoAsync,
} from '@/lib/flota/repositorio';
import type { VehiculoItem, CategoriaVehiculo } from '@/lib/flota/types';

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

const vehiculoFormSchema = z.object({
  id: z.string().optional(),
  marca: z.string().min(1, { error: 'La marca es obligatoria' }),
  modelo: z.string().min(1, { error: 'El modelo es obligatorio' }),
  anio: z.number().int().min(1990).max(2035),
  categoria: z.enum(['SEDAN', 'SUV', 'MOTO', 'PATINETA', 'UTILITARIO']),
  categoriaEtiqueta: z.string().optional(),
  placa: z.string().min(3, { error: 'La placa es obligatoria' }),
  estado: z.enum(['DISPONIBLE', 'RESERVADO', 'MANTENIMIENTO', 'FUERA_SERVICIO']),
  precioDia: z.number().min(0, { error: 'El precio por día debe ser mayor o igual a 0' }),
  depositoGarantia: z.number().min(0, { error: 'El depósito de garantía es obligatorio' }),
  transmision: z.enum(['Automática', 'Manual', 'Eléctrica']),
  combustible: z.enum(['Gasolina', 'Diésel', 'Eléctrico', 'Híbrido']),
  capacidadPasajeros: z.number().int().min(1),
  autonomiaKm: z.number().optional(),
  kilometraje: z.number().min(0),
  imagenUrl: z.string().min(1, { error: 'La URL de la imagen es obligatoria' }),
  destacado: z.boolean().optional(),
  descripcion: z.string().min(1, { error: 'La descripción es obligatoria' }),
  aceleracion: z.string().optional(),
  velocidadMaxima: z.string().optional(),
  rating: z.number().optional(),
  autonomiaOdo: z.string().optional(),
});

/**
 * Crea una nueva unidad en la flota o actualiza una existente.
 */
export const guardarVehiculoAction = defineAction({
  input: vehiculoFormSchema,
  handler: async (input, context) => {
    const usuario = context.locals.usuario;
    const localId = usuario?.localActivo?.id;

    const db = env.DB ? getDb(env.DB) : undefined;

    const esEdicion = Boolean(input.id && input.id.trim().length > 0);
    const id = esEdicion
      ? input.id!.trim()
      : `veh-${slugify(input.marca)}-${slugify(input.modelo)}-${crypto.randomUUID().slice(0, 6)}`;

    const categoriaEtiqueta =
      input.categoriaEtiqueta?.trim() ||
      CATEGORIA_ETIQUETAS[input.categoria] ||
      input.categoria;

    const isElectrico =
      input.combustible === 'Eléctrico' || input.combustible === 'Híbrido';

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
      imagenUrl: input.imagenUrl.trim(),
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
    estado: z.enum(['DISPONIBLE', 'RESERVADO', 'MANTENIMIENTO', 'FUERA_SERVICIO']),
  }),
  handler: async (input) => {
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
  handler: async (input) => {
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
  handler: async (input) => {
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
