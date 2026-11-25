import type {
  CategoriaGaleriaVehiculo,
  EstadoVehiculo,
  VehiculoGaleriaFoto,
  VehiculoItem,
} from './types';
import type { AppDb } from '@/lib/db';
import { logFalloD1 } from '@/lib/db/diagnostics';
import { vehiculos, type VehiculoSelect } from '@/db/schema/vehiculos';
import {
  multimediaVehiculo,
  reservas,
  mantenimientosVehiculo,
  type ZonaEvidenciaVehiculo,
} from '@/db/schema';
import { eq, ne, desc, asc, and, inArray, gte, lte } from 'drizzle-orm';
import { toClientISODate } from '@/lib/time/client-time';
import { verificarDisponibilidadVehiculo } from './disponibilidad';
import { resolverUrlMultimediaR2 } from '@/lib/media/r2-vehiculo-keys';

function zonaACategoriaGaleria(zona: ZonaEvidenciaVehiculo): CategoriaGaleriaVehiculo {
  if (
    zona === 'INTERIOR_CABINA' ||
    zona === 'INTERIOR_ASIENTOS' ||
    zona === 'BAUL_EQUIPAJE'
  ) {
    return 'INTERIOR';
  }
  if (
    zona === 'LLANTAS_RINES' ||
    zona === 'MOTOR_CAPO' ||
    zona === 'DETALLE_NOVEDAD_DANO' ||
    zona === 'KIT_CARRETERA_ACCESORIOS' ||
    zona === 'PANTALLA_TABLERO_ODOMETRO' ||
    zona === 'NIVEL_COMBUSTIBLE_BATERIA'
  ) {
    return 'ESTADO';
  }
  return 'EXTERIOR';
}

function categoriaAZonaEvidencia(cat: CategoriaGaleriaVehiculo): ZonaEvidenciaVehiculo {
  switch (cat) {
    case 'INTERIOR':
      return 'INTERIOR_CABINA';
    case 'ESTADO':
      return 'LLANTAS_RINES';
    case 'EXTERIOR':
    default:
      return 'EXTERIOR_FRONTAL';
  }
}

/**
 * Mapea una fila relacional de Cloudflare D1 (Drizzle) a la estructura de dominio `VehiculoItem`.
 */
export function mapD1ToVehiculoItem(row: VehiculoSelect): VehiculoItem {
  const isElectrico = row.combustible === 'Eléctrico' || row.combustible === 'Híbrido';

  return {
    id: row.id,
    localId: row.localId ?? 'local-patio-norte',
    marca: row.marca,
    modelo: row.modelo,
    anio: row.anio,
    categoria: row.categoria,
    categoriaEtiqueta: row.categoriaEtiqueta,
    placa: row.placa,
    estado: row.estado,
    precioDia: row.precioDia,
    depositoGarantia: row.depositoGarantia,
    transmision: row.transmision,
    combustible: row.combustible,
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
    color: row.color,
    numeroMotor: row.numeroMotor,
    numeroChasis: row.numeroChasis,
    valorComercial: row.valorComercial,
    unidadMedidaUso: row.unidadMedidaUso,
    specsBento: row.specsBento,
  };
}

export interface OpcionesListarVehiculos {
  localId?: string | null | undefined;
  soloDisponibles?: boolean | undefined;
  desde?: string | undefined;
  hasta?: string | undefined;
  hoyISO?: string | undefined;
}

/**
 * Obtiene el catálogo de vehículos activos desde Cloudflare D1,
 * resolviendo dinámicamente su disponibilidad real (usabilidad y ocupación por reservas/mantenimiento)
 * para la ventana temporal indicada o para el día actual.
 */
export async function listarVehiculos(
  db?: AppDb,
  opciones?: OpcionesListarVehiculos
): Promise<VehiculoItem[]> {
  if (!db) return [];

  try {
    const condiciones = [eq(vehiculos.activo, true)];

    if (opciones?.localId) {
      condiciones.push(eq(vehiculos.localId, opciones.localId));
    }
    if (opciones?.soloDisponibles) {
      condiciones.push(ne(vehiculos.estado, 'FUERA_SERVICIO'));
      condiciones.push(ne(vehiculos.estado, 'NO_DISPONIBLE'));
    }

    const rows = await db
      .select()
      .from(vehiculos)
      .where(and(...condiciones))
      .orderBy(desc(vehiculos.creadoEn));

    if (!rows || rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const hoy = opciones?.hoyISO ?? toClientISODate(new Date());
    const ventanaInicio = opciones?.desde ?? hoy;
    const ventanaFin = opciones?.hasta ?? opciones?.desde ?? hoy;

    const [reservasOcupadas, mantenimientosOcupados] = await Promise.all([
      db
        .select({
          vehiculoId: reservas.vehiculoId,
          estado: reservas.estado,
        })
        .from(reservas)
        .where(
          and(
            inArray(reservas.vehiculoId, ids),
            inArray(reservas.estado, ['CONFIRMADA', 'PENDIENTE', 'EN_CURSO', 'PAUSADA']),
            lte(reservas.fechaInicio, ventanaFin),
            gte(reservas.fechaFin, ventanaInicio)
          )
        ),
      db
        .select({
          vehiculoId: mantenimientosVehiculo.vehiculoId,
        })
        .from(mantenimientosVehiculo)
        .where(
          and(
            inArray(mantenimientosVehiculo.vehiculoId, ids),
            inArray(mantenimientosVehiculo.estado, ['PROGRAMADO', 'EN_TALLER']),
            lte(mantenimientosVehiculo.fechaInicio, ventanaFin),
            gte(mantenimientosVehiculo.fechaFin, ventanaInicio)
          )
        ),
    ]);

    const vehiculosConMantenimiento = new Set(
      mantenimientosOcupados.map((m) => m.vehiculoId)
    );
    const vehiculosConPausa = new Set(
      reservasOcupadas.filter((r) => r.estado === 'PAUSADA').map((r) => r.vehiculoId)
    );
    const vehiculosConReserva = new Set(
      reservasOcupadas.filter((r) => r.estado !== 'PAUSADA').map((r) => r.vehiculoId)
    );

    const galeriaPorVehiculo = new Map<string, VehiculoGaleriaFoto[]>();
    try {
      const mediaRows = await db
        .select()
        .from(multimediaVehiculo)
        .where(
          and(
            inArray(multimediaVehiculo.vehiculoId, ids),
            eq(multimediaVehiculo.etapaOperativa, 'CATALOGO_ESTUDIO'),
            eq(multimediaVehiculo.tipoMedio, 'IMAGEN')
          )
        )
        .orderBy(
          desc(multimediaVehiculo.esPortadaCatalogo),
          asc(multimediaVehiculo.ordenVisual)
        );

      for (const m of mediaRows) {
        const lista = galeriaPorVehiculo.get(m.vehiculoId) ?? [];
        lista.push({
          id: m.id,
          url: resolverUrlMultimediaR2(m.r2Key),
          categoria: zonaACategoriaGaleria(m.zonaEvidencia),
          zona: m.zonaEvidencia,
          esPrincipal: m.esPortadaCatalogo,
          orden: m.ordenVisual,
        });
        galeriaPorVehiculo.set(m.vehiculoId, lista);
      }
    } catch {
      // No bloquear el listado si aún no hay registros multimedia o en mocks
    }

    const items = rows.map((row) => {
      const item = mapD1ToVehiculoItem(row);
      const galeriaItem = galeriaPorVehiculo.get(item.id);
      if (galeriaItem && galeriaItem.length > 0) {
        item.galeria = galeriaItem;
      }

      // Si el vehículo está fuera de servicio permanentemente o administrativamente no disponible, se respeta
      if (item.estado === 'FUERA_SERVICIO' || item.estado === 'NO_DISPONIBLE') {
        return item;
      }

      // Si tiene mantenimiento activo en la ventana evaluada
      if (vehiculosConMantenimiento.has(item.id)) {
        item.estado = 'MANTENIMIENTO';
        return item;
      }

      // Si tiene reserva en pausa (NO_DISPONIBLE) en la ventana evaluada
      if (vehiculosConPausa.has(item.id)) {
        item.estado = 'NO_DISPONIBLE';
        return item;
      }

      // Si tiene reserva activa (PENDIENTE, CONFIRMADA, EN_CURSO) en la ventana evaluada
      if (vehiculosConReserva.has(item.id)) {
        item.estado = 'RESERVADO';
        return item;
      }

      // Si no tiene bloqueos en la ventana, preservamos el estado guardado en D1 (DISPONIBLE, RESERVADO, MANTENIMIENTO, etc.)
      return item;
    });

    if (opciones?.soloDisponibles) {
      return items.filter((item) => item.estado === 'DISPONIBLE');
    }

    return items;
  } catch (error) {
    logFalloD1('vehiculos.listar', error, { localId: opciones?.localId ?? null });
    return [];
  }
}

/**
 * Busca una unidad por su identificador único en D1, validando opcionalmente que pertenezca al local activo
 * y resolviendo su estado operativo real para hoy (si no está FUERA_SERVICIO).
 */
export async function obtenerVehiculoAsync(
  id: string,
  db?: AppDb,
  localIdRestringido?: string | null,
  hoyISO?: string
): Promise<VehiculoItem | undefined> {
  if (!db) return undefined;

  try {
    const rows = await db
      .select()
      .from(vehiculos)
      .where(and(eq(vehiculos.id, id), eq(vehiculos.activo, true)))
      .limit(1);

    if (!rows || rows.length === 0) return undefined;

    const item = mapD1ToVehiculoItem(rows[0]!);

    if (localIdRestringido && item.localId && item.localId !== localIdRestringido) {
      return undefined;
    }

    if (item.estado === 'DISPONIBLE') {
      const hoy = hoyISO ?? toClientISODate(new Date());
      const dictamen = await verificarDisponibilidadVehiculo(db, item.id, hoy, hoy, hoy);
      item.estado = dictamen.estadoSugerido;
    }

    // Cargar únicamente las fotografías públicas de catálogo (CATALOGO_ESTUDIO)
    try {
      const mediaRows = await db
        .select()
        .from(multimediaVehiculo)
        .where(
          and(
            eq(multimediaVehiculo.vehiculoId, item.id),
            eq(multimediaVehiculo.etapaOperativa, 'CATALOGO_ESTUDIO'),
            eq(multimediaVehiculo.tipoMedio, 'IMAGEN')
          )
        )
        .orderBy(
          desc(multimediaVehiculo.esPortadaCatalogo),
          asc(multimediaVehiculo.ordenVisual)
        );

      if (mediaRows.length > 0) {
        item.galeria = mediaRows.map(
          (m): VehiculoGaleriaFoto => ({
            id: m.id,
            url: resolverUrlMultimediaR2(m.r2Key),
            categoria: zonaACategoriaGaleria(m.zonaEvidencia),
            zona: m.zonaEvidencia,
            esPrincipal: m.esPortadaCatalogo,
            orden: m.ordenVisual,
          })
        );
      }
    } catch {
      // No bloquear la ficha si la tabla multimedia aún no tiene registros
    }

    return item;
  } catch (error) {
    logFalloD1('vehiculos.obtener', error, { vehiculoId: id });
    return undefined;
  }
}

/**
 * Sincroniza en D1 la galería pública (`CATALOGO_ESTUDIO`) de un vehículo sin afectar actas ni mantenimientos.
 */
async function sincronizarGaleriaEstudioD1(
  db: AppDb,
  params: {
    vehiculoId: string;
    localId: string;
    galeria: readonly VehiculoGaleriaFoto[];
    ahora?: Date;
  }
): Promise<void> {
  const ahora = params.ahora ?? new Date();
  await db
    .delete(multimediaVehiculo)
    .where(
      and(
        eq(multimediaVehiculo.vehiculoId, params.vehiculoId),
        eq(multimediaVehiculo.etapaOperativa, 'CATALOGO_ESTUDIO')
      )
    );

  const vistas = new Set<string>();
  const filasGaleria = params.galeria
    .filter((foto) => {
      const clave = foto.url.startsWith('/api/multimedia/')
        ? foto.url.slice('/api/multimedia/'.length)
        : foto.url;
      if (!clave || vistas.has(clave)) return false;
      vistas.add(clave);
      return true;
    })
    .map((foto, idx) => {
      const r2Key = foto.url.startsWith('/api/multimedia/')
        ? foto.url.slice('/api/multimedia/'.length)
        : foto.url;
      const zonaEvidencia =
        foto.zona ??
        (foto.esPrincipal
          ? 'EXTERIOR_LATERAL_IZQ'
          : categoriaAZonaEvidencia(foto.categoria));
      return {
        id: foto.id || crypto.randomUUID(),
        localId: params.localId,
        vehiculoId: params.vehiculoId,
        tipoMedio: 'IMAGEN' as const,
        etapaOperativa: 'CATALOGO_ESTUDIO' as const,
        zonaEvidencia,
        esPortadaCatalogo: foto.esPrincipal,
        ordenVisual: idx,
        r2Key,
        mimeType: 'image/jpeg',
        tamanoBytes: 0,
        capturadoEn: ahora,
        creadoEn: ahora,
      };
    });

  if (filasGaleria.length > 0) {
    await db.insert(multimediaVehiculo).values(filasGaleria);
  }
}

/**
 * Guarda o actualiza un vehículo de la flota en Cloudflare D1.
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

  if (!db) {
    return itemConLocal;
  }

  try {
    const ahora = new Date();
    await db
      .insert(vehiculos)
      .values({
        id: itemConLocal.id,
        localId: itemConLocal.localId,
        marca: itemConLocal.marca,
        modelo: itemConLocal.modelo,
        anio: itemConLocal.anio,
        categoria: itemConLocal.categoria,
        categoriaEtiqueta: itemConLocal.categoriaEtiqueta,
        placa: itemConLocal.placa,
        estado: itemConLocal.estado,
        precioDia: itemConLocal.precioDia,
        depositoGarantia: itemConLocal.depositoGarantia,
        transmision: itemConLocal.transmision,
        combustible: itemConLocal.combustible,
        capacidadPasajeros: itemConLocal.capacidadPasajeros,
        autonomiaKm: itemConLocal.autonomiaKm ?? null,
        kilometraje: itemConLocal.kilometraje,
        imagenUrl: itemConLocal.imagenUrl,
        destacado: itemConLocal.destacado ? true : false,
        descripcion: itemConLocal.descripcion,
        aceleracion: itemConLocal.aceleracion,
        velocidadMaxima: itemConLocal.velocidadMaxima,
        rating: itemConLocal.rating,
        autonomiaOdo: itemConLocal.autonomiaOdo,
        color: itemConLocal.color ?? null,
        numeroMotor: itemConLocal.numeroMotor ?? null,
        numeroChasis: itemConLocal.numeroChasis ?? null,
        valorComercial: itemConLocal.valorComercial ?? null,
        unidadMedidaUso: itemConLocal.unidadMedidaUso ?? 'KM',
        specsBento: itemConLocal.specsBento ?? null,
        activo: true,
        creadoEn: ahora,
        actualizadoEn: ahora,
      })
      .onConflictDoUpdate({
        target: vehiculos.id,
        set: {
          marca: itemConLocal.marca,
          modelo: itemConLocal.modelo,
          anio: itemConLocal.anio,
          categoria: itemConLocal.categoria,
          categoriaEtiqueta: itemConLocal.categoriaEtiqueta,
          placa: itemConLocal.placa,
          estado: itemConLocal.estado,
          precioDia: itemConLocal.precioDia,
          depositoGarantia: itemConLocal.depositoGarantia,
          transmision: itemConLocal.transmision,
          combustible: itemConLocal.combustible,
          capacidadPasajeros: itemConLocal.capacidadPasajeros,
          autonomiaKm: itemConLocal.autonomiaKm ?? null,
          kilometraje: itemConLocal.kilometraje,
          imagenUrl: itemConLocal.imagenUrl,
          destacado: itemConLocal.destacado ? true : false,
          descripcion: itemConLocal.descripcion,
          aceleracion: itemConLocal.aceleracion,
          velocidadMaxima: itemConLocal.velocidadMaxima,
          rating: itemConLocal.rating,
          autonomiaOdo: itemConLocal.autonomiaOdo,
          color: itemConLocal.color ?? null,
          numeroMotor: itemConLocal.numeroMotor ?? null,
          numeroChasis: itemConLocal.numeroChasis ?? null,
          valorComercial: itemConLocal.valorComercial ?? null,
          unidadMedidaUso: itemConLocal.unidadMedidaUso ?? 'KM',
          specsBento: itemConLocal.specsBento ?? null,
          actualizadoEn: ahora,
        },
      });

    if (Array.isArray(itemConLocal.galeria) && itemConLocal.galeria.length > 0) {
      await sincronizarGaleriaEstudioD1(db, {
        vehiculoId: itemConLocal.id,
        localId: itemConLocal.localId!,
        galeria: itemConLocal.galeria,
        ahora,
      });
    }
  } catch (error) {
    logFalloD1('vehiculos.guardar', error, { vehiculoId: item.id, localId });
    throw error;
  }

  return itemConLocal;
}

/**
 * Actualiza exclusivamente la galería fotográfica y la imagen principal de un vehículo en D1.
 */
export async function actualizarGaleriaVehiculoD1(
  db: AppDb,
  params: {
    vehiculoId: string;
    localId: string;
    galeria: VehiculoGaleriaFoto[];
    imagenUrlPrincipal: string;
  }
): Promise<VehiculoGaleriaFoto[]> {
  const ahora = new Date();
  await db
    .update(vehiculos)
    .set({
      imagenUrl: params.imagenUrlPrincipal,
      actualizadoEn: ahora,
    })
    .where(eq(vehiculos.id, params.vehiculoId));

  await sincronizarGaleriaEstudioD1(db, {
    vehiculoId: params.vehiculoId,
    localId: params.localId,
    galeria: params.galeria,
    ahora,
  });

  return params.galeria;
}

/**
 * Cambia el estado operativo de una unidad (DISPONIBLE, RESERVADO, MANTENIMIENTO, FUERA_SERVICIO) en D1.
 */
export async function actualizarEstadoVehiculo(
  id: string,
  nuevoEstado: EstadoVehiculo,
  db?: AppDb
): Promise<boolean> {
  if (!db) return false;

  try {
    await db
      .update(vehiculos)
      .set({
        estado: nuevoEstado,
        actualizadoEn: new Date(),
      })
      .where(eq(vehiculos.id, id));
    return true;
  } catch (error) {
    logFalloD1('vehiculos.cambiarEstado', error, { vehiculoId: id, estado: nuevoEstado });
    return false;
  }
}

/**
 * Da de baja o elimina lógicamente una unidad en D1.
 */
export async function darDeBajaVehiculo(
  id: string,
  db?: AppDb
): Promise<boolean> {
  if (!db) return false;

  try {
    await db
      .update(vehiculos)
      .set({
        activo: false,
        estado: 'FUERA_SERVICIO',
        actualizadoEn: new Date(),
      })
      .where(eq(vehiculos.id, id));
    return true;
  } catch (error) {
    logFalloD1('vehiculos.darDeBaja', error, { vehiculoId: id });
    return false;
  }
}
