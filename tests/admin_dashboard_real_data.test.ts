import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularMetricasFlotaAdmin,
  calcularResumenCajaTurnoHoy,
} from '../src/lib/dashboard/resumen-admin.ts';
import {
  mapearReservaAAlquilerEnProceso,
  listarAlquileresEnProcesoD1,
} from '../src/lib/dashboard/alquileres-proceso.ts';
import type { MovimientoCajaSelect } from '../src/db/schema/caja.ts';
import type { ReservaSelect } from '../src/db/schema/reservas.ts';

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

function crearReservaBase(
  overrides: Partial<ReservaSelect> = {}
): ReservaSelect {
  const ahora = new Date('2026-11-12T14:00:00-05:00');
  return {
    id: 'res-1',
    codigo: 'FLX-849210',
    localId: 'local-1',
    vehiculoId: 'veh-1',
    clienteId: 'usr-cliente-1',
    fechaInicio: '2026-11-12',
    fechaFin: '2026-11-15',
    diasAlquiler: 3,
    estado: 'PENDIENTE',
    modalidadEntrega: 'PATIO_PRINCIPAL',
    direccionEntrega: null,
    sedeNombre: 'Sede Poblado',
    precioDiaCotizado: 220_000,
    subtotalTarifaCotizado: 660_000,
    coberturaPericialCotizada: 45_000,
    totalCotizado: 705_000,
    modalidadPagoInicial: 'ABONO_30',
    metodoAbonoInicial: 'TRANSFERENCIA_PSE',
    montoAbonoReportado: 0,
    referenciaAbonoInicial: null,
    contactoNombre: 'Carlos Andrés Mejía',
    contactoTipoDocumento: 'CC',
    contactoNumeroDocumento: '1.037.648.291',
    contactoCategoriaLicencia: 'B1',
    contactoTelefono: '3001234567',
    contactoCorreo: 'carlos@example.com',
    ley1581Aceptada: true,
    motivoRechazo: null,
    creadoPorId: null,
    confirmadoPorId: null,
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

describe('Mapeo de Alquileres en Proceso (D1 a UI)', () => {
  it('1. Reserva PENDIENTE sin contrato, inspección ni verificación mapea a EN_PROCESO con todos los pasos PENDIENTE', () => {
    const reserva = crearReservaBase({
      estado: 'PENDIENTE',
      montoAbonoReportado: 0,
    });
    const item = mapearReservaAAlquilerEnProceso({
      reserva,
      vehiculo: { placa: 'MOV-304', imagenUrl: '/images/vehiculos/mazda-cx30.webp' },
      contrato: null,
      inspeccionEntrega: null,
      verificacion: null,
    });

    assert.equal(item.estado, 'EN_PROCESO');
    assert.equal(item.clienteNombre, 'Carlos Andrés Mejía');
    assert.equal(item.placa, 'MOV-304');
    const pasos = item.pasosProceso ?? [];
    assert.equal(pasos.find((p) => p.id === 'kyc')?.estado, 'PENDIENTE');
    assert.equal(pasos.find((p) => p.id === 'abono')?.estado, 'PENDIENTE');
    assert.equal(pasos.find((p) => p.id === 'peritaje')?.estado, 'PENDIENTE');
    assert.equal(pasos.find((p) => p.id === 'firma')?.estado, 'PENDIENTE');
  });

  it('2. Reserva CONFIRMADA con abono > 0 e inspección iniciada (sin finalizar) mapea abono COMPLETADO y peritaje EN_PROCESO', () => {
    const ahora = new Date('2026-11-12T14:30:00-05:00');
    const reserva = crearReservaBase({
      estado: 'CONFIRMADA',
      montoAbonoReportado: 200_000,
    });
    const item = mapearReservaAAlquilerEnProceso({
      reserva,
      vehiculo: { placa: 'FLX-801', imagenUrl: '/images/vehiculos/white-suv.webp' },
      contrato: null,
      inspeccionEntrega: {
        iniciadaEn: ahora,
        finalizadaEn: null,
      },
      verificacion: null,
    });

    assert.equal(item.estado, 'EN_PROCESO');
    const pasos = item.pasosProceso ?? [];
    assert.equal(pasos.find((p) => p.id === 'abono')?.estado, 'COMPLETADO');
    assert.equal(pasos.find((p) => p.id === 'peritaje')?.estado, 'EN_PROCESO');
  });

  it('3. Reserva EN_CURSO con contrato VIGENTE, pago, entrega real e inspección finalizada mapea a COMPLETADO con completadoEn', () => {
    const fechaEntrega = new Date('2026-11-12T15:00:00.000Z');
    const reserva = crearReservaBase({
      estado: 'EN_CURSO',
      montoAbonoReportado: 300_000,
    });
    const item = mapearReservaAAlquilerEnProceso({
      reserva,
      vehiculo: { placa: 'BMW-240', imagenUrl: '/images/vehiculos/dark-coupe.webp' },
      contrato: {
        numeroContrato: 'CTR-849204',
        estadoContrato: 'VIGENTE',
        totalPagado: 705_000,
        firmaArrendatarioR2Key: 'firmas/ctr-849204-cliente.png',
        fechaHoraEntregaReal: fechaEntrega,
        actualizadoEn: fechaEntrega,
      },
      inspeccionEntrega: {
        iniciadaEn: new Date('2026-11-12T14:30:00.000Z'),
        finalizadaEn: fechaEntrega,
      },
      verificacion: {
        estado: 'APROBADO',
      },
    });

    assert.equal(item.estado, 'COMPLETADO');
    assert.equal(item.completadoEn, fechaEntrega.toISOString());
    const pasos = item.pasosProceso ?? [];
    assert.equal(pasos.find((p) => p.id === 'kyc')?.estado, 'COMPLETADO');
    assert.equal(pasos.find((p) => p.id === 'abono')?.estado, 'COMPLETADO');
    assert.equal(pasos.find((p) => p.id === 'peritaje')?.estado, 'COMPLETADO');
    assert.equal(pasos.find((p) => p.id === 'firma')?.estado, 'COMPLETADO');
  });

  it('4. listarAlquileresEnProcesoD1 sin DB retorna array vacío', async () => {
    const res = await listarAlquileresEnProcesoD1(undefined, 'local-1');
    assert.deepEqual(res, []);
  });
});
