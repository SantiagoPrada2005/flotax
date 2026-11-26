import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  construirCalendarioMes,
  esRangoDisponibleValido,
  encontrarPrimerRangoDisponible,
  calcularDiasInclusivos,
  sumarDiasISO,
  verificarDisponibilidadVehiculo,
  obtenerBloquesNoDisponiblesD1,
  obtenerEstadoDocumentalVehiculoD1,
  alternarFechaEnSeleccion,
  agruparFechasEnTramos,
  sonFechasDisponiblesValidas,
  calcularCotizacionPorFechas,
  obtenerFechaFinMinimaAlquiler,
  obtenerUltimoDiaContiguoLibre,
  validarReglasRangoAlquiler,
  actualizarRangoAlquilerPorToque,
} from '../src/lib/flota/disponibilidad.ts';
import {
  obtenerEtiquetaPerspectivaGaleria,
  type BloqueNoDisponible,
} from '../src/lib/flota/types.ts';
import { listarVehiculos } from '../src/lib/flota/repositorio.ts';
import { actualizarRangoFiltroReservasPorToque } from '../src/lib/flota/reservas-cliente.ts';
import { resolverEstadoActualVehiculo } from '../src/lib/mantenimientos/repositorio.ts';
import {
  vehiculos,
  mantenimientosVehiculo,
  reservas,
  documentosVehiculo,
} from '../src/db/schema/index.ts';

function contieneEnSQL(sqlObj: unknown, texto: string): boolean {
  if (!sqlObj) return false;
  if (typeof sqlObj === 'string') return sqlObj.includes(texto);
  if (typeof sqlObj === 'object') {
    if ('value' in sqlObj) {
      const val = (sqlObj as { value: unknown }).value;
      if (typeof val === 'string' && val.includes(texto)) return true;
      if (Array.isArray(val) && val.some((v) => typeof v === 'string' && v.includes(texto))) return true;
    }
    if ('queryChunks' in sqlObj && Array.isArray((sqlObj as { queryChunks: unknown[] }).queryChunks)) {
      return (sqlObj as { queryChunks: unknown[] }).queryChunks.some((c) => contieneEnSQL(c, texto));
    }
  }
  return false;
}

describe('Disponibilidad de Vehículos - FlotaX', () => {
  const vehiculoIdPrueba = 'veh-test-mazda-cx30';
  const hoyPrueba = '2026-11-05';

  function crearMockDb(config: {
    vehiculo?: { id: string; activo: boolean; estado: string; categoria?: string };
    vehiculosLista?: any[];
    mantenimientos?: Array<{ id: string; fechaInicio: string; fechaFin: string; etiqueta?: string; estado: string }>;
    reservas?: Array<{ id: string; codigo: string; fechaInicio: string; fechaFin: string; estado: string }>;
    documentos?: Array<{ id: string; vehiculoId: string; tipoDocumento: string; fechaVencimiento: string | null; vigente: boolean }>;
  }) {
    return {
      select: () => ({
        from: (table: unknown) => {
          let datos: unknown[] = [];
          if (table === vehiculos) {
            datos = config.vehiculosLista ?? (config.vehiculo ? [config.vehiculo] : []);
          } else if (table === mantenimientosVehiculo) {
            datos = config.mantenimientos ?? [];
          } else if (table === reservas) {
            datos = config.reservas ?? [];
          } else if (table === documentosVehiculo) {
            datos = config.documentos ?? [
              {
                id: 'doc-soat-default',
                vehiculoId: vehiculoIdPrueba,
                tipoDocumento: 'SOAT',
                fechaVencimiento: '2027-12-31',
                vigente: true,
              },
              {
                id: 'doc-rtm-default',
                vehiculoId: vehiculoIdPrueba,
                tipoDocumento: 'TECNICO_MECANICA',
                fechaVencimiento: '2027-12-31',
                vigente: true,
              },
            ];
          }

          const crearQueryResult = (items: unknown[]) => ({
            limit: (n?: number) => Promise.resolve(n != null ? items.slice(0, n) : items),
            orderBy: () => ({
              limit: (n?: number) => Promise.resolve(n != null ? items.slice(0, n) : items),
              then: (resolve: any) => resolve(items),
            }),
            then: (resolve: any) => resolve(items),
          });

          return {
            where: (predicado?: unknown) => {
              let filtrados = datos;
              if (table === reservas && config.reservas) {
                filtrados = config.reservas.filter((r) => {
                  if (predicado && contieneEnSQL(predicado, r.id)) {
                    return false;
                  }
                  return true;
                });
              } else if (table === vehiculos && (config.vehiculosLista || config.vehiculo)) {
                const lista = config.vehiculosLista ?? (config.vehiculo ? [config.vehiculo] : []);
                filtrados = lista.filter((v: any) => {
                  if (predicado) {
                    if (contieneEnSQL(predicado, 'FUERA_SERVICIO') && v.estado === 'FUERA_SERVICIO') {
                      return false;
                    }
                    if (contieneEnSQL(predicado, 'NO_DISPONIBLE') && v.estado === 'NO_DISPONIBLE') {
                      return false;
                    }
                  }
                  return true;
                });
              }
              return crearQueryResult(filtrados);
            },
            orderBy: () => crearQueryResult(datos),
            limit: (n?: number) => Promise.resolve(n != null ? datos.slice(0, n) : datos),
            then: (resolve: any) => resolve(datos),
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: () => Promise.resolve(),
        }),
      }),
    } as any;
  }

  test('1. Vehículo sin reservas ni mantenimientos: todos los días >= hoy son DISPONIBLE', () => {
    // Al pasar bloquesPrecalculados = [], no debe inyectar datos mock falsos
    const cal = construirCalendarioMes(vehiculoIdPrueba, 2026, 10, hoyPrueba, []);

    const diasFuturos = cal.dias.filter((d) => d.fechaISO >= hoyPrueba);
    const diasPasados = cal.dias.filter((d) => d.fechaISO < hoyPrueba);

    assert.ok(diasFuturos.length > 0, 'Debe haber días futuros en el mes');
    assert.ok(
      diasFuturos.every((d) => d.estado === 'DISPONIBLE'),
      'Todos los días futuros deben estar disponibles cuando no hay bloques'
    );
    assert.ok(
      diasPasados.every((d) => d.estado === 'PASADO'),
      'Todos los días pasados deben estar en estado PASADO'
    );
  });

  test('2. Bloques reales de D1: refleja exactamente los días ocupados', () => {
    const bloquesReales: BloqueNoDisponible[] = [
      {
        id: 'res-101',
        vehiculoId: vehiculoIdPrueba,
        fechaInicio: '2026-11-10',
        fechaFin: '2026-11-12',
        motivo: 'RESERVADO',
        etiqueta: 'Reserva confirmada en patio',
      },
      {
        id: 'mant-202',
        vehiculoId: vehiculoIdPrueba,
        fechaInicio: '2026-11-20',
        fechaFin: '2026-11-21',
        motivo: 'MANTENIMIENTO',
        etiqueta: 'Inspección de frenos',
      },
    ];

    const cal = construirCalendarioMes(vehiculoIdPrueba, 2026, 10, hoyPrueba, bloquesReales);

    const dia10 = cal.dias.find((d) => d.fechaISO === '2026-11-10');
    const dia11 = cal.dias.find((d) => d.fechaISO === '2026-11-11');
    const dia12 = cal.dias.find((d) => d.fechaISO === '2026-11-12');
    const dia13 = cal.dias.find((d) => d.fechaISO === '2026-11-13');
    const dia20 = cal.dias.find((d) => d.fechaISO === '2026-11-20');

    assert.equal(dia10?.estado, 'RESERVADO');
    assert.equal(dia11?.estado, 'RESERVADO');
    assert.equal(dia12?.estado, 'RESERVADO');
    assert.equal(dia13?.estado, 'DISPONIBLE');
    assert.equal(dia20?.estado, 'MANTENIMIENTO');
    assert.equal(dia20?.etiquetaBloqueo, 'Inspección de frenos');
  });

  test('3. esRangoDisponibleValido detecta solapamientos correctamente', () => {
    const bloques: BloqueNoDisponible[] = [
      {
        id: 'res-1',
        vehiculoId: vehiculoIdPrueba,
        fechaInicio: '2026-11-10',
        fechaFin: '2026-11-14',
        motivo: 'RESERVADO',
        etiqueta: 'Reserva activa',
      },
    ];

    // Rango totalmente libre
    assert.equal(
      esRangoDisponibleValido(vehiculoIdPrueba, '2026-11-06', '2026-11-09', hoyPrueba, bloques),
      true
    );

    // Rango que empieza antes y termina dentro de la reserva
    assert.equal(
      esRangoDisponibleValido(vehiculoIdPrueba, '2026-11-08', '2026-11-11', hoyPrueba, bloques),
      false
    );

    // Rango exactamente igual a la reserva
    assert.equal(
      esRangoDisponibleValido(vehiculoIdPrueba, '2026-11-10', '2026-11-14', hoyPrueba, bloques),
      false
    );

    // Rango que contiene completamente la reserva
    assert.equal(
      esRangoDisponibleValido(vehiculoIdPrueba, '2026-11-08', '2026-11-16', hoyPrueba, bloques),
      false
    );

    // Rango que empieza en el pasado
    assert.equal(
      esRangoDisponibleValido(vehiculoIdPrueba, '2026-11-01', '2026-11-06', hoyPrueba, bloques),
      false
    );

    // Rango invertido
    assert.equal(
      esRangoDisponibleValido(vehiculoIdPrueba, '2026-11-15', '2026-11-10', hoyPrueba, bloques),
      false
    );
  });

  test('4. encontrarPrimerRangoDisponible salta fechas ocupadas automáticamente', () => {
    // Si hoy (05 Nov) al 07 Nov está ocupado por una reserva
    const bloques: BloqueNoDisponible[] = [
      {
        id: 'res-hoy',
        vehiculoId: vehiculoIdPrueba,
        fechaInicio: '2026-11-05',
        fechaFin: '2026-11-07',
        motivo: 'RESERVADO',
        etiqueta: 'En curso',
      },
    ];

    const rangoSugerido = encontrarPrimerRangoDisponible(
      vehiculoIdPrueba,
      hoyPrueba,
      bloques,
      3
    );

    // Debe saltar al primer día libre (08 Nov) y sugerir 3 días: 08, 09 y 10 de Noviembre
    assert.equal(rangoSugerido.fechaInicio, '2026-11-08');
    assert.equal(rangoSugerido.fechaFin, '2026-11-10');
  });

  test('5. Cálculos inclusivos y sumas de días deterministas', () => {
    assert.equal(calcularDiasInclusivos('2026-11-05', '2026-11-05'), 1);
    assert.equal(calcularDiasInclusivos('2026-11-05', '2026-11-07'), 3);
    assert.equal(sumarDiasISO('2026-11-05', 2), '2026-11-07');
    assert.equal(sumarDiasISO('2026-11-30', 1), '2026-12-01');
  });

  test('6. verificarDisponibilidadVehiculo: rechaza unidad inactiva o FUERA_SERVICIO', async () => {
    const mockDbInactivo = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: false, estado: 'FUERA_SERVICIO' },
    });
    const dictamen = await verificarDisponibilidadVehiculo(
      mockDbInactivo,
      vehiculoIdPrueba,
      '2026-11-10',
      '2026-11-12',
      hoyPrueba
    );
    assert.equal(dictamen.disponible, false);
    assert.equal(dictamen.usable, false);
    assert.equal(dictamen.estadoSugerido, 'FUERA_SERVICIO');
  });

  test('7. verificarDisponibilidadVehiculo: detecta orden de taller y marca MANTENIMIENTO', async () => {
    const mockDbTaller = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      mantenimientos: [
        {
          id: 'mant-1',
          fechaInicio: '2026-11-10',
          fechaFin: '2026-11-12',
          etiqueta: 'Cambio de pastillas de freno',
          estado: 'EN_TALLER',
        },
      ],
    });
    const dictamen = await verificarDisponibilidadVehiculo(
      mockDbTaller,
      vehiculoIdPrueba,
      '2026-11-11',
      '2026-11-14',
      hoyPrueba
    );
    assert.equal(dictamen.disponible, false);
    assert.equal(dictamen.usable, false);
    assert.equal(dictamen.ocupado, true);
    assert.equal(dictamen.estadoSugerido, 'MANTENIMIENTO');
    assert.equal(dictamen.etiqueta, 'Cambio de pastillas de freno');
  });

  test('8. verificarDisponibilidadVehiculo: detecta reserva PENDIENTE de otro cliente y resuelve RESERVADO', async () => {
    const mockDbReservaPendiente = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      reservas: [
        {
          id: 'res-99',
          codigo: 'RES-998877',
          fechaInicio: '2026-11-10',
          fechaFin: '2026-11-12',
          estado: 'PENDIENTE',
        },
      ],
    });
    const dictamen = await verificarDisponibilidadVehiculo(
      mockDbReservaPendiente,
      vehiculoIdPrueba,
      '2026-11-10',
      '2026-11-12',
      hoyPrueba
    );
    assert.equal(dictamen.disponible, false);
    assert.equal(dictamen.usable, true); // Es mecánicamente usable pero ocupado
    assert.equal(dictamen.ocupado, true);
    assert.equal(dictamen.estadoSugerido, 'RESERVADO');
    assert.equal(dictamen.reservaCodigo, 'RES-998877');
  });

  test('9. verificarDisponibilidadVehiculo: confirma DISPONIBLE cuando no hay bloqueos', async () => {
    const mockDbLibre = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      reservas: [],
      mantenimientos: [],
    });
    const dictamen = await verificarDisponibilidadVehiculo(
      mockDbLibre,
      vehiculoIdPrueba,
      '2026-11-15',
      '2026-11-18',
      hoyPrueba
    );
    assert.equal(dictamen.disponible, true);
    assert.equal(dictamen.usable, true);
    assert.equal(dictamen.ocupado, false);
    assert.equal(dictamen.estadoSugerido, 'DISPONIBLE');
  });

  test('10. Reserva PAUSADA genera BloqueNoDisponible con motivo NO_DISPONIBLE y calendario toma NO_DISPONIBLE', async () => {
    const mockDbPausada = crearMockDb({
      reservas: [
        {
          id: 'res-pausa-1',
          codigo: 'RES-PAUSA-01',
          fechaInicio: '2026-11-10',
          fechaFin: '2026-11-12',
          estado: 'PAUSADA',
        },
      ],
      mantenimientos: [],
    });

    const bloques = await obtenerBloquesNoDisponiblesD1(
      mockDbPausada,
      vehiculoIdPrueba,
      hoyPrueba
    );

    assert.equal(bloques.length, 1);
    assert.equal(bloques[0]?.motivo, 'NO_DISPONIBLE');
    assert.equal(bloques[0]?.id, 'res-pausa-1');

    const cal = construirCalendarioMes(vehiculoIdPrueba, 2026, 10, hoyPrueba, bloques);
    const dia10 = cal.dias.find((d) => d.fechaISO === '2026-11-10');
    const dia11 = cal.dias.find((d) => d.fechaISO === '2026-11-11');
    const dia12 = cal.dias.find((d) => d.fechaISO === '2026-11-12');
    const dia13 = cal.dias.find((d) => d.fechaISO === '2026-11-13');

    assert.equal(dia10?.estado, 'NO_DISPONIBLE');
    assert.equal(dia11?.estado, 'NO_DISPONIBLE');
    assert.equal(dia12?.estado, 'NO_DISPONIBLE');
    assert.notEqual(dia10?.estado, 'RESERVADO');
    assert.notEqual(dia10?.estado, 'DISPONIBLE');
    assert.equal(dia13?.estado, 'DISPONIBLE');
  });

  test('11. resolverEstadoActualVehiculo retorna NO_DISPONIBLE cuando hay reserva PAUSADA hoy respetando prioridades', async () => {
    // Caso 1: Reserva PAUSADA activa hoy -> NO_DISPONIBLE
    const dbPausa = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      reservas: [
        {
          id: 'res-p-hoy',
          codigo: 'RES-P-01',
          fechaInicio: '2026-11-01',
          fechaFin: '2026-11-10',
          estado: 'PAUSADA',
        },
      ],
      mantenimientos: [],
    });
    const estadoPausa = await resolverEstadoActualVehiculo(dbPausa, vehiculoIdPrueba, hoyPrueba);
    assert.equal(estadoPausa, 'NO_DISPONIBLE');

    // Caso 2: Prioridad EN_TALLER sobre PAUSADA
    const dbTaller = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      reservas: [
        {
          id: 'res-p-hoy',
          codigo: 'RES-P-01',
          fechaInicio: '2026-11-01',
          fechaFin: '2026-11-10',
          estado: 'PAUSADA',
        },
      ],
      mantenimientos: [
        {
          id: 'mant-urgente',
          fechaInicio: '2026-11-04',
          fechaFin: '2026-11-06',
          estado: 'EN_TALLER',
        },
      ],
    });
    const estadoTaller = await resolverEstadoActualVehiculo(dbTaller, vehiculoIdPrueba, hoyPrueba);
    assert.equal(estadoTaller, 'MANTENIMIENTO');

    // Caso 3: Prioridad FUERA_SERVICIO sobre todo
    const dbFueraServicio = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'FUERA_SERVICIO' },
      reservas: [
        {
          id: 'res-p-hoy',
          codigo: 'RES-P-01',
          fechaInicio: '2026-11-01',
          fechaFin: '2026-11-10',
          estado: 'PAUSADA',
        },
      ],
    });
    const estadoFs = await resolverEstadoActualVehiculo(dbFueraServicio, vehiculoIdPrueba, hoyPrueba);
    assert.equal(estadoFs, 'FUERA_SERVICIO');

    // Caso 4: Sin reserva ni taller -> DISPONIBLE
    const dbLibre = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      reservas: [],
      mantenimientos: [],
    });
    const estadoLibre = await resolverEstadoActualVehiculo(dbLibre, vehiculoIdPrueba, hoyPrueba);
    assert.equal(estadoLibre, 'DISPONIBLE');
  });

  test('12. obtenerEstadoDocumentalVehiculoD1: bloquea por SOAT/RTM vencido o sin registrar y exime PATINETA (Ley 2486 de 2025)', async () => {
    // Subcaso A: Sin filas aún en documentos_vehiculo -> bloquea por SIN_REGISTRAR y reporta faltantes
    const dbVacio = crearMockDb({
      documentos: [],
    });
    const docVacioSedan = await obtenerEstadoDocumentalVehiculoD1(
      dbVacio,
      vehiculoIdPrueba,
      'SEDAN',
      hoyPrueba
    );
    assert.equal(docVacioSedan.tieneVencidos, false);
    assert.equal(docVacioSedan.bloqueadoPorDocumentos, true);
    assert.equal(docVacioSedan.requiereRtm, true);
    assert.deepEqual(docVacioSedan.faltantesSinCarga, ['SOAT', 'TECNICO_MECANICA']);
    assert.deepEqual(docVacioSedan.vencidos, []);

    // Subcaso B: SOAT vencido por fecha -> bloquea
    const dbSoatVencido = crearMockDb({
      documentos: [
        {
          id: 'doc-1',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'SOAT',
          fechaVencimiento: '2026-11-01',
          vigente: true,
        },
        {
          id: 'doc-2',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'TECNICO_MECANICA',
          fechaVencimiento: '2027-01-01',
          vigente: true,
        },
      ],
    });
    const docSoatVenc = await obtenerEstadoDocumentalVehiculoD1(
      dbSoatVencido,
      vehiculoIdPrueba,
      'SEDAN',
      hoyPrueba
    );
    assert.equal(docSoatVenc.tieneVencidos, true);
    assert.equal(docSoatVenc.vencidos.length, 1);
    assert.equal(docSoatVenc.vencidos[0]?.tipo, 'SOAT');

    // Subcaso C: RTM con vigente = false -> bloquea en SEDAN
    const dbRtmInvalido = crearMockDb({
      documentos: [
        {
          id: 'doc-1',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'SOAT',
          fechaVencimiento: '2027-01-01',
          vigente: true,
        },
        {
          id: 'doc-2',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'TECNICO_MECANICA',
          fechaVencimiento: '2027-01-01',
          vigente: false,
        },
      ],
    });
    const docRtmInvalido = await obtenerEstadoDocumentalVehiculoD1(
      dbRtmInvalido,
      vehiculoIdPrueba,
      'SEDAN',
      hoyPrueba
    );
    assert.equal(docRtmInvalido.tieneVencidos, true);
    assert.equal(docRtmInvalido.vencidos[0]?.tipo, 'TECNICO_MECANICA');

    // Subcaso D: PATINETA está exenta de SOAT y TECNICO_MECANICA por Ley 2486 de 2025
    const dbPatineta = crearMockDb({
      documentos: [
        {
          id: 'doc-2',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'TECNICO_MECANICA',
          fechaVencimiento: '2026-01-01',
          vigente: false,
        },
      ],
    });
    const docPatineta = await obtenerEstadoDocumentalVehiculoD1(
      dbPatineta,
      vehiculoIdPrueba,
      'PATINETA',
      hoyPrueba
    );
    assert.equal(docPatineta.requiereRtm, false);
    assert.equal(docPatineta.exentoPorLey2486, true);
    assert.equal(docPatineta.bloqueadoPorDocumentos, false);
    assert.equal(docPatineta.tieneVencidos, false);
    assert.deepEqual(docPatineta.faltantesSinCarga, []);
    assert.deepEqual(docPatineta.vencidos, []);
  });

  test('13. obtenerEstadoDocumentalVehiculoD1: evalúa el documento más reciente por tipo ante registros históricos', async () => {
    // Caso: Fila antigua de SOAT vencida primero en el mock, seguida de SOAT renovado vigente
    const dbHistorico = crearMockDb({
      documentos: [
        {
          id: 'doc-soat-antiguo',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'SOAT',
          fechaVencimiento: '2025-10-31',
          vigente: false,
        },
        {
          id: 'doc-soat-renovado',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'SOAT',
          fechaVencimiento: '2027-10-31',
          vigente: true,
        },
        {
          id: 'doc-rtm-antiguo',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'TECNICO_MECANICA',
          fechaVencimiento: '2025-05-20',
          vigente: false,
        },
        {
          id: 'doc-rtm-renovado',
          vehiculoId: vehiculoIdPrueba,
          tipoDocumento: 'TECNICO_MECANICA',
          fechaVencimiento: '2027-05-20',
          vigente: true,
        },
      ],
    });

    const dictamen = await obtenerEstadoDocumentalVehiculoD1(
      dbHistorico,
      vehiculoIdPrueba,
      'SEDAN',
      hoyPrueba
    );

    assert.equal(
      dictamen.tieneVencidos,
      false,
      'No debe marcar vencidos si existe renovación vigente más reciente'
    );
    assert.deepEqual(dictamen.vencidos, [], 'La lista de vencidos debe estar vacía');
    assert.deepEqual(
      dictamen.faltantesSinCarga,
      [],
      'No debe reportar faltantes ya que ambos documentos están cargados'
    );
  });

  test('17. verificarDisponibilidadVehiculo con reservaExcluirId no colisiona con la misma reserva al pausar o extender', async () => {
    const reservaIdPropia = 'res-propia-101';
    const mockDbConReserva = crearMockDb({
      vehiculo: { id: vehiculoIdPrueba, activo: true, estado: 'DISPONIBLE' },
      reservas: [
        {
          id: reservaIdPropia,
          codigo: 'RES-PROP-01',
          fechaInicio: '2026-11-10',
          fechaFin: '2026-11-15',
          estado: 'CONFIRMADA',
        },
      ],
      mantenimientos: [],
    });

    // Sin reservaExcluirId: la reserva solapada bloquea el rango
    const dictamenSinExclusion = await verificarDisponibilidadVehiculo(
      mockDbConReserva,
      vehiculoIdPrueba,
      '2026-11-10',
      '2026-11-15',
      hoyPrueba
    );
    assert.equal(dictamenSinExclusion.disponible, false);
    assert.equal(dictamenSinExclusion.ocupado, true);

    // Con reservaExcluirId = reservaIdPropia: la reserva se auto-excluye y reporta DISPONIBLE
    const dictamenConExclusion = await verificarDisponibilidadVehiculo(
      mockDbConReserva,
      vehiculoIdPrueba,
      '2026-11-10',
      '2026-11-15',
      hoyPrueba,
      reservaIdPropia
    );
    assert.equal(
      dictamenConExclusion.disponible,
      true,
      'Debe reportar disponible cuando la única reserva solapada coincide con reservaExcluirId'
    );
    assert.equal(dictamenConExclusion.ocupado, false);
    assert.equal(dictamenConExclusion.estadoSugerido, 'DISPONIBLE');
  });

  test('18. listarVehiculos preserva NO_DISPONIBLE en D1 sin reservas solapadas y lo filtra cuando soloDisponibles: true', async () => {
    const vehiculoBloqueado = {
      id: 'veh-bloqueado-1',
      localId: 'local-patio-norte',
      marca: 'Toyota',
      modelo: 'Corolla',
      anio: 2023,
      categoria: 'SEDAN',
      categoriaEtiqueta: 'Sedán',
      placa: 'XYZ-789',
      estado: 'NO_DISPONIBLE',
      precioDia: 140000,
      depositoGarantia: 500000,
      transmision: 'Automática',
      combustible: 'Gasolina',
      capacidadPasajeros: 5,
      autonomiaKm: null,
      kilometraje: 20000,
      imagenUrl: '/images/corolla.jpg',
      destacado: false,
      descripcion: 'Bloqueado administrativamente',
      especificacionesBentoJson: null,
      tipoUsoContador: 'KM',
      horasMotor: null,
      minutosUso: null,
      activo: true,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const vehiculoDisponible = {
      id: 'veh-disponible-2',
      localId: 'local-patio-norte',
      marca: 'Mazda',
      modelo: 'CX-30',
      anio: 2024,
      categoria: 'SUV',
      categoriaEtiqueta: 'Camioneta',
      placa: 'FLX-123',
      estado: 'DISPONIBLE',
      precioDia: 160000,
      depositoGarantia: 500000,
      transmision: 'Automática',
      combustible: 'Gasolina',
      capacidadPasajeros: 5,
      autonomiaKm: null,
      kilometraje: 10000,
      imagenUrl: '/images/cx30.jpg',
      destacado: false,
      descripcion: 'Disponible',
      especificacionesBentoJson: null,
      tipoUsoContador: 'KM',
      horasMotor: null,
      minutosUso: null,
      activo: true,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const mockDbFlota = crearMockDb({
      vehiculosLista: [vehiculoBloqueado, vehiculoDisponible],
      reservas: [],
      mantenimientos: [],
    });

    // Caso A: Sin soloDisponibles (o false), el vehículo en D1 con NO_DISPONIBLE NO debe resetearse a DISPONIBLE
    const listaGeneral = await listarVehiculos(mockDbFlota, {
      soloDisponibles: false,
      hoyISO: hoyPrueba,
    });
    assert.equal(listaGeneral.length, 2);
    const itemBloqueado = listaGeneral.find((v) => v.id === 'veh-bloqueado-1');
    assert.ok(itemBloqueado, 'El vehículo bloqueado debe figurar en la lista general');
    assert.equal(
      itemBloqueado.estado,
      'NO_DISPONIBLE',
      'El estado NO_DISPONIBLE en D1 debe preservarse y jamás mutar a DISPONIBLE'
    );

    // Caso B: Con soloDisponibles: true, el vehículo con NO_DISPONIBLE debe ser filtrado (tanto en SQL como en el resultado final)
    const listaSoloDisponibles = await listarVehiculos(mockDbFlota, {
      soloDisponibles: true,
      hoyISO: hoyPrueba,
    });
    assert.equal(
      listaSoloDisponibles.length,
      1,
      'Solo debe retornar la unidad realmente DISPONIBLE'
    );
    assert.equal(listaSoloDisponibles[0]?.id, 'veh-disponible-2');
    assert.equal(listaSoloDisponibles[0]?.estado, 'DISPONIBLE');
  });

  test('19. listarVehiculos preserva RESERVADO y MANTENIMIENTO manuales en D1 sin bloqueos solapados', async () => {
    const vehiculoReservado = {
      id: 'veh-reservado-manual',
      localId: 'local-test',
      marca: 'Mazda',
      modelo: '3',
      anio: 2024,
      categoria: 'SEDAN',
      categoriaEtiqueta: 'Sedán Ejecutivo',
      placa: 'RES123',
      estado: 'RESERVADO',
      precioDia: 180000,
      depositoGarantia: 400000,
      transmision: 'Automática',
      combustible: 'Gasolina',
      capacidadPasajeros: 5,
      kilometraje: 5000,
      imagenUrl: '/img/mazda3.png',
      destacado: false,
      descripcion: 'Reservado manualmente',
      activo: true,
    };

    const vehiculoMantenimiento = {
      ...vehiculoReservado,
      id: 'veh-mant-manual',
      placa: 'MNT456',
      estado: 'MANTENIMIENTO',
    };

    const mockDbFlota = crearMockDb({
      vehiculosLista: [vehiculoReservado, vehiculoMantenimiento],
      reservas: [],
      mantenimientos: [],
    });

    const lista = await listarVehiculos(mockDbFlota, {
      soloDisponibles: false,
      hoyISO: hoyPrueba,
    });
    assert.equal(lista.find((v) => v.id === 'veh-reservado-manual')?.estado, 'RESERVADO');
    assert.equal(lista.find((v) => v.id === 'veh-mant-manual')?.estado, 'MANTENIMIENTO');
  });

  test('20. alternarFechaEnSeleccion elimina únicamente el día tocado sin reiniciar los demás', () => {
    const inicialTres = ['2026-11-20', '2026-11-21', '2026-11-22'];
    assert.deepEqual(alternarFechaEnSeleccion(inicialTres, '2026-11-21'), [
      '2026-11-20',
      '2026-11-22',
    ]);

    const inicialCuatro = ['2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23'];
    assert.deepEqual(alternarFechaEnSeleccion(inicialCuatro, '2026-11-22'), [
      '2026-11-20',
      '2026-11-21',
      '2026-11-23',
    ]);

    // Agregar un día nuevo conserva los existentes y ordena ascendentemente
    assert.deepEqual(
      alternarFechaEnSeleccion(['2026-11-20', '2026-11-22'], '2026-11-21'),
      ['2026-11-20', '2026-11-21', '2026-11-22']
    );
  });

  test('21. sonFechasDisponiblesValidas y agruparFechasEnTramos respetan días individuales no contiguos', () => {
    const bloques: BloqueNoDisponible[] = [
      {
        id: 'b-21',
        vehiculoId: vehiculoIdPrueba,
        fechaInicio: '2026-11-21',
        fechaFin: '2026-11-21',
        motivo: 'RESERVADO',
        etiqueta: 'Ocupado día 21',
      },
    ];

    assert.equal(
      sonFechasDisponiblesValidas(
        vehiculoIdPrueba,
        ['2026-11-20', '2026-11-22'],
        hoyPrueba,
        bloques
      ),
      true
    );
    assert.equal(
      sonFechasDisponiblesValidas(
        vehiculoIdPrueba,
        ['2026-11-20', '2026-11-21', '2026-11-22'],
        hoyPrueba,
        bloques
      ),
      false
    );

    const tramos = agruparFechasEnTramos([
      '2026-11-20',
      '2026-11-22',
      '2026-11-23',
    ]);
    assert.deepEqual(tramos, [
      { inicio: '2026-11-20', fin: '2026-11-20', dias: 1 },
      { inicio: '2026-11-22', fin: '2026-11-23', dias: 2 },
    ]);
  });

  test('22. calcularCotizacionPorFechas recalcula días reales y precio total según los días elegidos', () => {
    const vehiculoMock = {
      id: vehiculoIdPrueba,
      marca: 'Mazda',
      modelo: 'CX-30',
      anio: 2025,
      categoria: 'SUV' as const,
      categoriaEtiqueta: 'SUV',
      placa: 'FLX-100',
      estado: 'DISPONIBLE' as const,
      precioDia: 150000,
      depositoGarantia: 500000,
      transmision: 'Automática' as const,
      combustible: 'Gasolina' as const,
      capacidadPasajeros: 5,
      kilometraje: 12000,
      imagenUrl: '/img/cx30.webp',
      descripcion: 'SUV',
      aceleracion: '7.5 s',
      velocidadMaxima: '190 km/h',
      rating: 4.9,
      autonomiaOdo: '12.000 km',
    };

    const cot2Dias = calcularCotizacionPorFechas(
      vehiculoMock,
      ['2026-11-20', '2026-11-22'],
      0
    );
    assert.equal(cot2Dias.diasAlquiler, 2);
    assert.equal(cot2Dias.subtotalTarifa, 300000);
    assert.equal(cot2Dias.coberturaPericial, 24000);
    assert.equal(cot2Dias.totalAlquiler, 324000);
  });

  test('23. validarReglasRangoAlquiler permite rangos continuos desde 1 día y rechaza huecos o reglas estrictas opcionales', () => {
    assert.equal(obtenerFechaFinMinimaAlquiler('2026-11-27'), '2026-11-29');
    assert.equal(obtenerFechaFinMinimaAlquiler('2026-11-27', true), '2026-11-27');

    const bloques: BloqueNoDisponible[] = [
      {
        id: 'b-futuro',
        vehiculoId: vehiculoIdPrueba,
        fechaInicio: '2026-12-03',
        fechaFin: '2026-12-05',
        motivo: 'RESERVADO',
        etiqueta: 'Reserva futura',
      },
    ];
    assert.equal(obtenerUltimoDiaContiguoLibre('2026-11-27', bloques), '2026-12-02');
    assert.equal(obtenerUltimoDiaContiguoLibre('2026-12-06', bloques), null);

    // Por defecto permite 1 día y rangos continuos de 2+ días (ej. 20-21)
    assert.equal(
      validarReglasRangoAlquiler({ fechaInicio: '2026-11-27', fechaFin: '2026-11-27' }).valido,
      true
    );
    assert.equal(
      validarReglasRangoAlquiler({ fechaInicio: '2026-11-27', fechaFin: '2026-11-28' }).valido,
      true
    );

    // Modo estricto explícito excluye el día siguiente inmediato
    assert.equal(
      validarReglasRangoAlquiler({
        fechaInicio: '2026-11-27',
        fechaFin: '2026-11-28',
        permitirAlquilerUnDia: false,
      }).valido,
      false
    );

    // Rechaza fechas con huecos intermedios
    assert.equal(
      validarReglasRangoAlquiler({
        fechaInicio: '2026-11-27',
        fechaFin: '2026-11-30',
        fechasSeleccionadas: ['2026-11-27', '2026-11-30'],
      }).valido,
      false
    );
  });

  test('25. actualizarRangoAlquilerPorToque selecciona 1 a 1 o varios días y al quitar el fin deja solo el día inicial', () => {
    // 1. Desde 20-21-22, tocar 21 elimina únicamente el 22 y deja 20-21
    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: '2026-11-20',
        fechaFin: '2026-11-22',
        fechaTocada: '2026-11-21',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: hoyPrueba,
      }),
      { fechaInicio: '2026-11-20', fechaFin: '2026-11-21' }
    );

    // 2. Tocar el extremo final (22 en 20-21-22) deja únicamente el inicio (20)
    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: '2026-11-20',
        fechaFin: '2026-11-22',
        fechaTocada: '2026-11-22',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: hoyPrueba,
      }),
      { fechaInicio: '2026-11-20', fechaFin: '2026-11-20' }
    );

    // 2b. Rango del 3 al 10: al quitar el 10 queda solo el 3 y se quitan todos los anteriores (4..9)
    const rangoColapsado = actualizarRangoAlquilerPorToque({
      fechaInicio: '2026-11-03',
      fechaFin: '2026-11-10',
      fechaTocada: '2026-11-10',
      vehiculoId: vehiculoIdPrueba,
      hoyISO: '2026-11-01',
    });
    assert.deepEqual(rangoColapsado, { fechaInicio: '2026-11-03', fechaFin: '2026-11-03' });

    // 2c. Tocar nuevamente el 3 cuando solo queda el 3 limpia la selección a 0 días
    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: rangoColapsado.fechaInicio,
        fechaFin: rangoColapsado.fechaFin,
        fechaTocada: '2026-11-03',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: '2026-11-01',
      }),
      { fechaInicio: null, fechaFin: null }
    );

    // 2d. Ejemplos explícitos de rangos (10..20 -> 10, 10..15 -> 10, 5..8 -> 5) y nueva selección de fin
    const diezAVeinteColapsado = actualizarRangoAlquilerPorToque({
      fechaInicio: '2026-11-10',
      fechaFin: '2026-11-20',
      fechaTocada: '2026-11-20',
      vehiculoId: vehiculoIdPrueba,
      hoyISO: '2026-11-01',
    });
    assert.deepEqual(diezAVeinteColapsado, {
      fechaInicio: '2026-11-10',
      fechaFin: '2026-11-10',
    });
    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: diezAVeinteColapsado.fechaInicio,
        fechaFin: diezAVeinteColapsado.fechaFin,
        fechaTocada: '2026-11-14',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: '2026-11-01',
      }),
      { fechaInicio: '2026-11-10', fechaFin: '2026-11-14' }
    );

    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: '2026-11-10',
        fechaFin: '2026-11-15',
        fechaTocada: '2026-11-15',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: '2026-11-01',
      }),
      { fechaInicio: '2026-11-10', fechaFin: '2026-11-10' }
    );

    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: '2026-11-05',
        fechaFin: '2026-11-08',
        fechaTocada: '2026-11-08',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: '2026-11-01',
      }),
      { fechaInicio: '2026-11-05', fechaFin: '2026-11-05' }
    );

    // 3. Tocar el extremo inicial (20 en 20-21-22) recorta a 21-22
    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: '2026-11-20',
        fechaFin: '2026-11-22',
        fechaTocada: '2026-11-20',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: hoyPrueba,
      }),
      { fechaInicio: '2026-11-21', fechaFin: '2026-11-22' }
    );

    // 4. Selección 1 por 1 o varios a la vez desde selección vacía
    const primero = actualizarRangoAlquilerPorToque({
      fechaInicio: null,
      fechaFin: null,
      fechaTocada: '2026-11-20',
      vehiculoId: vehiculoIdPrueba,
      hoyISO: hoyPrueba,
    });
    assert.deepEqual(primero, { fechaInicio: '2026-11-20', fechaFin: '2026-11-20' });

    const variosALaVez = actualizarRangoAlquilerPorToque({
      fechaInicio: primero.fechaInicio,
      fechaFin: primero.fechaFin,
      fechaTocada: '2026-11-24',
      vehiculoId: vehiculoIdPrueba,
      hoyISO: hoyPrueba,
    });
    assert.deepEqual(variosALaVez, { fechaInicio: '2026-11-20', fechaFin: '2026-11-24' });

    // 5. Extender día siguiente inmediato en rango múltiple
    assert.deepEqual(
      actualizarRangoAlquilerPorToque({
        fechaInicio: '2026-11-20',
        fechaFin: '2026-11-21',
        fechaTocada: '2026-11-22',
        vehiculoId: vehiculoIdPrueba,
        hoyISO: hoyPrueba,
      }),
      { fechaInicio: '2026-11-20', fechaFin: '2026-11-22' }
    );
  });

  test('26. actualizarRangoFiltroReservasPorToque al quitar el fin conserva solo la fecha inicial y limpia intermedios', () => {
    // 10 al 20 -> quita 20 -> queda solo 10
    const colapsado10a20 = actualizarRangoFiltroReservasPorToque(
      '2026-11-10',
      '2026-11-20',
      '2026-11-20'
    );
    assert.deepEqual(colapsado10a20, { inicio: '2026-11-10', fin: null });

    // Desde 10, selecciona 14 -> forma rango 10 al 14
    assert.deepEqual(
      actualizarRangoFiltroReservasPorToque(
        colapsado10a20.inicio,
        colapsado10a20.fin,
        '2026-11-14'
      ),
      { inicio: '2026-11-10', fin: '2026-11-14' }
    );

    // 10 al 15 -> quita 15 -> queda solo 10
    assert.deepEqual(
      actualizarRangoFiltroReservasPorToque('2026-11-10', '2026-11-15', '2026-11-15'),
      { inicio: '2026-11-10', fin: null }
    );

    // 5 al 8 -> quita 8 -> queda solo 5
    assert.deepEqual(
      actualizarRangoFiltroReservasPorToque('2026-11-05', '2026-11-08', '2026-11-08'),
      { inicio: '2026-11-05', fin: null }
    );

    // Tocar nuevamente el inicio único limpia toda la selección
    assert.deepEqual(
      actualizarRangoFiltroReservasPorToque('2026-11-10', null, '2026-11-10'),
      { inicio: null, fin: null }
    );
  });

  test('24. obtenerEtiquetaPerspectivaGaleria identifica correctamente la lateral principal y perspectivas adicionales', () => {
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'EXTERIOR',
        zona: 'EXTERIOR_LATERAL_IZQ',
        esPrincipal: true,
      }),
      'Fotografía lateral (Principal)'
    );
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'EXTERIOR',
        zona: 'EXTERIOR_FRONTAL',
        esPrincipal: false,
      }),
      'Fotografía frontal'
    );
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'EXTERIOR',
        zona: 'EXTERIOR_TRASERO',
        esPrincipal: false,
      }),
      'Fotografía trasera'
    );
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'EXTERIOR',
        zona: 'EXTERIOR_LATERAL_DER',
        esPrincipal: false,
      }),
      'Fotografía lateral opuesta'
    );
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'INTERIOR',
        zona: 'INTERIOR_ASIENTOS',
        esPrincipal: false,
      }),
      'Cojinería y asientos'
    );
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'ESTADO',
        zona: 'PANTALLA_TABLERO_ODOMETRO',
        esPrincipal: false,
      }),
      'Tablero y condiciones'
    );
    assert.equal(
      obtenerEtiquetaPerspectivaGaleria({
        categoria: 'INTERIOR',
        zona: 'INTERIOR_CABINA',
        esPrincipal: false,
      }),
      'Interior adicional'
    );
  });
});
