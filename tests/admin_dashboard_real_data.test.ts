import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularMetricasFlotaAdmin,
  calcularResumenCajaTurnoHoy,
} from '../src/lib/dashboard/resumen-admin.ts';
import type { MovimientoCajaSelect } from '../src/db/schema/caja.ts';

function crearMovimientoBase(
  overrides: Partial<MovimientoCajaSelect>
): MovimientoCajaSelect {
  const ahora = new Date('2026-11-12T14:00:00-05:00');
  return {
    id: 'mov-1',
    localId: 'local-1',
    cuentaId: 'cta-1',
    cuentaDestinoId: null,
    contratoId: null,
    clienteId: null,
    clienteNombre: null,
    vehiculoId: null,
    proveedor: null,
    referencia: null,
    soporteUrl: null,
    tipo: 'INGRESO',
    categoria: 'PAGO_ALQUILER',
    monto: 200_000,
    metodoPago: 'transferencia',
    concepto: 'Pago canon',
    estado: 'CONFIRMADO',
    motivoAnulacion: null,
    anuladoPorId: null,
    anuladoEn: null,
    creadoPorId: 'usr-1',
    observaciones: null,
    fechaMovimiento: ahora,
    creadoEn: ahora,
    actualizadoEn: ahora,
    ...overrides,
  };
}

describe('Resumen Admin - Métricas de Flota y Caja Turno', () => {
  it('1. Flota vacía retorna todos los contadores en 0 y 0% de ocupación', () => {
    const res = calcularMetricasFlotaAdmin([]);
    assert.deepEqual(res, {
      totalUnits: 0,
      disponiblesCount: 0,
      activasCount: 0,
      mantenimientoCount: 0,
      fueraServicioCount: 0,
      occupancyPercentage: 0,
    });
  });

  it('2. Calcula contadores reales por estado y porcentaje de ocupación', () => {
    const res = calcularMetricasFlotaAdmin([
      { estado: 'DISPONIBLE' },
      { estado: 'DISPONIBLE' },
      { estado: 'RESERVADO' },
      { estado: 'MANTENIMIENTO' },
      { estado: 'FUERA_SERVICIO' },
    ]);
    assert.equal(res.totalUnits, 5);
    assert.equal(res.disponiblesCount, 2);
    assert.equal(res.activasCount, 1);
    assert.equal(res.mantenimientoCount, 1);
    assert.equal(res.fueraServicioCount, 1);
    assert.equal(res.occupancyPercentage, 20);
  });

  it('3. Caja sin sesión abierta ni movimientos retorna CERRADA y $ 0', () => {
    const res = calcularResumenCajaTurnoHoy({
      sesiones: [{ estado: 'CERRADA' }],
      movimientos: [],
      hoyISO: '2026-11-12',
    });
    assert.equal(res.shiftStatus, 'CERRADA');
    assert.equal(res.totalValorDia, 0);
  });

  it('4. Caja suma solo ingresos operativos CONFIRMADOS de hoy (excluye depósitos, anulados y días previos)', () => {
    const hoy = new Date('2026-11-12T10:30:00-05:00');
    const ayer = new Date('2026-11-11T18:00:00-05:00');

    const res = calcularResumenCajaTurnoHoy({
      sesiones: [{ estado: 'ABIERTA' }],
      movimientos: [
        crearMovimientoBase({ id: '1', monto: 350_000, fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '2', monto: 150_000, categoria: 'ABONO_CONTRATO', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '3', monto: 1_000_000, categoria: 'DEPOSITO_GARANTIA', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '4', monto: 500_000, estado: 'ANULADO', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '5', monto: 250_000, tipo: 'EGRESO', categoria: 'COMBUSTIBLE_OPERACION', fechaMovimiento: hoy }),
        crearMovimientoBase({ id: '6', monto: 400_000, fechaMovimiento: ayer }),
      ],
      hoyISO: '2026-11-12',
    });

    assert.equal(res.shiftStatus, 'ABIERTA');
    assert.equal(res.totalValorDia, 500_000);
  });
});
