import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  construirCalendarioMes,
  esRangoDisponibleValido,
  encontrarPrimerRangoDisponible,
  calcularDiasInclusivos,
  sumarDiasISO,
  verificarDisponibilidadVehiculo,
} from '../src/lib/flota/disponibilidad.ts';
import type { BloqueNoDisponible } from '../src/lib/flota/types.ts';
import { vehiculos, mantenimientosVehiculo, reservas } from '../src/db/schema/index.ts';

describe('Disponibilidad de Vehículos - FlotaX', () => {
  const vehiculoIdPrueba = 'veh-test-mazda-cx30';
  const hoyPrueba = '2026-11-05';

  function crearMockDb(config: {
    vehiculo?: { id: string; activo: boolean; estado: string };
    mantenimientos?: Array<{ id: string; fechaInicio: string; fechaFin: string; etiqueta?: string; estado: string }>;
    reservas?: Array<{ id: string; codigo: string; fechaInicio: string; fechaFin: string; estado: string }>;
  }) {
    return {
      select: () => ({
        from: (table: unknown) => {
          let datos: unknown[] = [];
          if (table === vehiculos) {
            datos = config.vehiculo ? [config.vehiculo] : [];
          } else if (table === mantenimientosVehiculo) {
            datos = config.mantenimientos ?? [];
          } else if (table === reservas) {
            datos = config.reservas ?? [];
          }
          return {
            where: () => ({
              limit: () => Promise.resolve(datos),
              orderBy: () => ({
                limit: () => Promise.resolve(datos),
              }),
            }),
          };
        },
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
});
