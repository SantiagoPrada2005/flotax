import {
  FLOTA_CANONICA,
  registrarVehiculoEnMemoria,
  eliminarVehiculoEnMemoria,
} from './mock-vehiculos';
import type { VehiculoItem, EstadoVehiculo } from './types';
import type { AppDb } from '@/lib/db';
import { vehiculos } from '@/db/schema/vehiculos';
import { eq, desc } from 'drizzle-orm';

// Registro dinámico en memoria para asegurar reactividad inmediata durante la sesión
const registroVehiculosMemoria = new Map<string, VehiculoItem>();

// Inicializar con la flota canónica
for (const v of FLOTA_CANONICA) {
  registroVehiculosMemoria.set(v.id, { ...v });
}

function mapD1ToVehiculoItem(row: typeof vehiculos.$inferSelect): VehiculoItem {
  const categoria = (row.categoria as VehiculoItem['categoria']) || 'SEDAN';
  const estado = (row.estado as EstadoVehiculo) || 'DISPONIBLE';
  const transmision = (row.transmision as VehiculoItem['transmision']) || 'Automática';
  const combustible = (row.combustible as VehiculoItem['combustible']) || 'Gasolina';
  const isElectrico = combustible === 'Eléctrico' || combustible === 'Híbrido';

  return {
    id: row.id,
    localId: row.localId ?? 'local-patio-norte',
    marca: row.marca,
    modelo: row.modelo,
    anio: row.anio,
    categoria,
    categoriaEtiqueta: row.categoriaEtiqueta,
    placa: row.placa,
    estado,
    precioDia: row.precioDia,
    depositoGarantia: row.depositoGarantia,
    transmision,
    combustible,
    capacidadPasajeros: row.capacidadPasajeros,
    autonomiaKm: row.autonomiaKm ?? undefined,
    kilometraje: row.kilometraje,
    imagenUrl: row.imagenUrl,
    destacado: Boolean(row.destacado),
    descripcion: row.descripcion,
    aceleracion: row.aceleracion || '5.5 s',
    velocidadMaxima: row.velocidadMaxima || '180 km/h',
    rating: row.rating ? Number(row.rating) : 4.8,
    autonomiaOdo: row.autonomiaOdo || `${row.kilometraje} km`,
    tipoPropulsionIcon: isElectrico ? 'electric' : 'gas',
  };
}

export interface OpcionesListarVehiculos {
  localId?: string | null | undefined;
}

function filtrarPorLocalConFallbackCanonico(
  todos: VehiculoItem[],
  localId?: string | null
): VehiculoItem[] {
  if (!localId) return todos;
  const propios = todos.filter((v) => v.localId === localId);
  if (propios.length > 0) {
    return propios;
  }
  // Si el local consultado aún no tiene unidades con su UUID explícito (ej. entorno demo/seed inicial),
  // retornar las unidades base asignadas al contexto de ese local para evitar catálogos vacíos rotos.
  return todos.map((v) => ({
    ...v,
    localId,
  }));
}

/**
 * Obtiene el catálogo de vehículos activos, opcionalmente aislado a un local específico.
 * Consulta Cloudflare D1 si está disponible; de lo contrario o si falla la tabla,
 * consume el registro sincronizado en memoria.
 */
export async function listarVehiculos(
  db?: AppDb,
  opciones?: OpcionesListarVehiculos
): Promise<VehiculoItem[]> {
  if (db) {
    try {
      const rows = await db
        .select()
        .from(vehiculos)
        .where(eq(vehiculos.activo, true))
        .orderBy(desc(vehiculos.creadoEn));

      if (rows && rows.length > 0) {
        // Sincronizar memoria con D1
        for (const row of rows) {
          const item = mapD1ToVehiculoItem(row);
          registroVehiculosMemoria.set(item.id, item);
        }
        const lista = Array.from(registroVehiculosMemoria.values());
        return filtrarPorLocalConFallbackCanonico(lista, opciones?.localId);
      }
    } catch {
      // Si la tabla no está creada aún en D1 local/remoto, fallback transparente a memoria
    }
  }

  const listaMemoria = Array.from(registroVehiculosMemoria.values());
  return filtrarPorLocalConFallbackCanonico(listaMemoria, opciones?.localId);
}

/**
 * Busca una unidad por su identificador único, validando opcionalmente que pertenezca al local cautivo.
 */
export async function obtenerVehiculoAsync(
  id: string,
  db?: AppDb,
  localIdRestringido?: string | null
): Promise<VehiculoItem | undefined> {
  let encontrado: VehiculoItem | undefined;

  if (db) {
    try {
      const rows = await db
        .select()
        .from(vehiculos)
        .where(eq(vehiculos.id, id))
        .limit(1);

      if (rows && rows.length > 0) {
        const item = mapD1ToVehiculoItem(rows[0]!);
        registroVehiculosMemoria.set(item.id, item);
        encontrado = item;
      }
    } catch {
      // Fallback a memoria
    }
  }

  if (!encontrado) {
    encontrado = registroVehiculosMemoria.get(id);
  }

  if (!encontrado) return undefined;

  // Verificar aislamiento si el local restringido tiene flota propia diferenciada
  if (localIdRestringido && encontrado.localId && encontrado.localId !== localIdRestringido) {
    const todos = Array.from(registroVehiculosMemoria.values());
    const localTieneFlotaPropia = todos.some((v) => v.localId === localIdRestringido);
    if (localTieneFlotaPropia) {
      return undefined;
    }
  }

  return encontrado;
}

/**
 * Guarda o actualiza un vehículo tanto en memoria como en D1 si está disponible.
 */
export async function guardarVehiculo(
  item: VehiculoItem,
  db?: AppDb,
  localId?: string
): Promise<VehiculoItem> {
  const itemConLocal: VehiculoItem = {
    ...item,
    localId: localId || item.localId || 'local-patio-norte',
  };

  // 1. Guardar en registro memoria
  registroVehiculosMemoria.set(itemConLocal.id, { ...itemConLocal });
  registrarVehiculoEnMemoria({ ...itemConLocal });

  // 2. Si D1 está disponible, persistir en D1
  if (db) {
    try {
      const ahora = new Date();
      await db
        .insert(vehiculos)
        .values({
          id: item.id,
          localId: localId || null,
          marca: item.marca,
          modelo: item.modelo,
          anio: item.anio,
          categoria: item.categoria,
          categoriaEtiqueta: item.categoriaEtiqueta,
          placa: item.placa,
          estado: item.estado,
          precioDia: item.precioDia,
          depositoGarantia: item.depositoGarantia,
          transmision: item.transmision,
          combustible: item.combustible,
          capacidadPasajeros: item.capacidadPasajeros,
          autonomiaKm: item.autonomiaKm ?? null,
          kilometraje: item.kilometraje,
          imagenUrl: item.imagenUrl,
          destacado: item.destacado ? true : false,
          descripcion: item.descripcion,
          aceleracion: item.aceleracion,
          velocidadMaxima: item.velocidadMaxima,
          rating: item.rating,
          autonomiaOdo: item.autonomiaOdo,
          activo: true,
          creadoEn: ahora,
          actualizadoEn: ahora,
        })
        .onConflictDoUpdate({
          target: vehiculos.id,
          set: {
            marca: item.marca,
            modelo: item.modelo,
            anio: item.anio,
            categoria: item.categoria,
            categoriaEtiqueta: item.categoriaEtiqueta,
            placa: item.placa,
            estado: item.estado,
            precioDia: item.precioDia,
            depositoGarantia: item.depositoGarantia,
            transmision: item.transmision,
            combustible: item.combustible,
            capacidadPasajeros: item.capacidadPasajeros,
            autonomiaKm: item.autonomiaKm ?? null,
            kilometraje: item.kilometraje,
            imagenUrl: item.imagenUrl,
            destacado: item.destacado ? true : false,
            descripcion: item.descripcion,
            aceleracion: item.aceleracion,
            velocidadMaxima: item.velocidadMaxima,
            rating: item.rating,
            autonomiaOdo: item.autonomiaOdo,
            actualizadoEn: ahora,
          },
        });
    } catch {
      // Si la tabla aún no existe en D1, la operación en memoria ya surtió efecto
    }
  }

  return item;
}

/**
 * Cambia el estado operativo de una unidad (DISPONIBLE, RESERVADO, MANTENIMIENTO, FUERA_SERVICIO).
 */
export async function actualizarEstadoVehiculo(
  id: string,
  nuevoEstado: EstadoVehiculo,
  db?: AppDb
): Promise<VehiculoItem | undefined> {
  const actual = registroVehiculosMemoria.get(id);
  if (!actual) return undefined;

  const actualizado: VehiculoItem = {
    ...actual,
    estado: nuevoEstado,
  };
  registroVehiculosMemoria.set(id, actualizado);
  registrarVehiculoEnMemoria(actualizado);

  if (db) {
    try {
      await db
        .update(vehiculos)
        .set({
          estado: nuevoEstado,
          actualizadoEn: new Date(),
        })
        .where(eq(vehiculos.id, id));
    } catch {
      // Fallback
    }
  }

  return actualizado;
}

/**
 * Da de baja o elimina una unidad.
 */
export async function darDeBajaVehiculo(
  id: string,
  db?: AppDb
): Promise<boolean> {
  const existe = registroVehiculosMemoria.has(id);
  if (!existe) return false;

  registroVehiculosMemoria.delete(id);
  eliminarVehiculoEnMemoria(id);

  if (db) {
    try {
      await db
        .update(vehiculos)
        .set({
          activo: false,
          estado: 'FUERA_SERVICIO',
          actualizadoEn: new Date(),
        })
        .where(eq(vehiculos.id, id));
    } catch {
      // Fallback
    }
  }

  return true;
}
