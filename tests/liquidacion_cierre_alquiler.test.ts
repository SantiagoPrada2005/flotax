import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularLiquidacionCierreAlquiler,
  etiquetaEstadoGarantia,
  etiquetaZonaEvidencia,
  ZONAS_FOTOS_ALQUILER,
} from '@/lib/flota/liquidacion-cierre';
import { parsearLineasCobrosAdicionales } from '@/lib/flota/detalle-reserva-admin';
import { devolverYCerrarAlquilerD1 } from '@/lib/flota/ciclo-alquiler-transiciones';
import type { ContextoActorCiclo } from '@/lib/flota/ciclo-alquiler';
import type { AppDb } from '@/lib/db';
import {
  reservas,
  contratosAlquiler,
  depositosGarantia,
  cuentasFinancieras,
  movimientosCaja,
  auditoriaFinanciera,
  inspeccionesPericiales,
  puntosInspeccionR2,
  eventosAlquiler,
  vehiculos,
  mantenimientosVehiculo,
} from '@/db/schema';

function crearMockQuery<T>(data: T[]) {
  const arr = [...data];
  const obj = {
    limit: (n: number) => Promise.resolve(arr.slice(0, n)),
    all: () => Promise.resolve(arr),
    orderBy: () => obj,
    then: (resolve: (v: T[]) => unknown) => Promise.resolve(arr).then(resolve),
  };
  return obj;
}

function crearMockBatch() {
  return async (ops: unknown[]) => {
    const results = [];
    for (const op of ops) {
      results.push(await op);
    }
    return results;
  };
}

class MockD1Session {
  async batch(ops: unknown[]) {
    return Promise.all(ops);
  }
}

describe('Liquidación de cierre con cobros adicionales y garantía (FlotaX)', () => {
  it('1. calcularLiquidacionCierreAlquiler: si el cobro es menor que la garantía, retiene el cobro y devuelve la diferencia sin doble cobro', () => {
    const res = calcularLiquidacionCierreAlquiler({
      totalAlquilerBase: 500_000,
      totalPagadoPrevio: 500_000,
      totalCobrosAdicionales: 150_000,
      garantiaDisponible: 500_000,
    });

    assert.equal(res.totalFacturaFinal, 650_000);
    assert.equal(res.garantiaRetenidaPorCobros, 150_000);
    assert.equal(res.garantiaADevolver, 350_000);
    assert.equal(res.excedenteCobrosPorCobrar, 0);
    assert.equal(res.saldoPendientePorCobrar, 0);
    assert.equal(res.estadoFinalGarantiaSugerido, 'DEVUELTO_PARCIAL');
  });

  it('2. calcularLiquidacionCierreAlquiler: si el cobro supera la garantía, retiene 100% de garantía y genera saldo pendiente por el excedente', () => {
    const res = calcularLiquidacionCierreAlquiler({
      totalAlquilerBase: 500_000,
      totalPagadoPrevio: 500_000,
      totalCobrosAdicionales: 750_000,
      garantiaDisponible: 500_000,
    });

    assert.equal(res.totalFacturaFinal, 1_250_000);
    assert.equal(res.garantiaRetenidaPorCobros, 500_000);
    assert.equal(res.garantiaADevolver, 0);
    assert.equal(res.excedenteCobrosPorCobrar, 250_000);
    assert.equal(res.saldoPendientePorCobrar, 250_000);
    assert.equal(res.estadoFinalGarantiaSugerido, 'APLICADO_CARGOS');
  });

  it('3. calcularLiquidacionCierreAlquiler: combina correctamente saldo pendiente base y garantía sin cobrar doble', () => {
    const resMenor = calcularLiquidacionCierreAlquiler({
      totalAlquilerBase: 500_000,
      totalPagadoPrevio: 150_000, // 350k pendientes del alquiler base
      totalCobrosAdicionales: 200_000,
      garantiaDisponible: 500_000,
    });

    assert.equal(resMenor.saldoPendienteBase, 350_000);
    assert.equal(resMenor.garantiaRetenidaPorCobros, 200_000);
    assert.equal(resMenor.garantiaADevolver, 300_000);
    assert.equal(resMenor.saldoPendientePorCobrar, 350_000); // Solo base, no 550k

    const resMayor = calcularLiquidacionCierreAlquiler({
      totalAlquilerBase: 500_000,
      totalPagadoPrevio: 150_000, // 350k base
      totalCobrosAdicionales: 650_000, // 500k garantía + 150k excedente
      garantiaDisponible: 500_000,
    });

    assert.equal(resMayor.garantiaRetenidaPorCobros, 500_000);
    assert.equal(resMayor.garantiaADevolver, 0);
    assert.equal(resMayor.excedenteCobrosPorCobrar, 150_000);
    assert.equal(resMayor.saldoPendientePorCobrar, 500_000); // 350k base + 150k excedente
  });

  it('4. devolverYCerrarAlquilerD1 (LIQUIDAR_AUTOMATICO): descuenta cobro menor de garantía, devuelve diferencia y guarda trazabilidad (quién y cuándo)', async () => {
    const localId = 'loc-patio-norte';
    const vehiculoId = 'veh-onix-01';
    const reservaBase = {
      id: 'res-liq-01',
      codigo: 'FLX-771001',
      localId,
      vehiculoId,
      clienteId: 'usr-cli-01',
      fechaInicio: '2026-11-18',
      fechaFin: '2026-11-20',
      fechaFinOriginal: '2026-11-20',
      estado: 'EN_CURSO',
      totalCotizado: 400_000,
      montoAbonoReportado: 400_000,
    };
    const contratoBase = {
      id: 'ctr-liq-01',
      numeroContrato: 'CTR-771001',
      reservaId: reservaBase.id,
      localId,
      vehiculoId,
      totalLiquidado: 400_000,
      totalPagado: 400_000,
      saldoPendiente: 0,
      cargosNovedadesDanos: 0,
      cargosOtrosLocal: 0,
      detalleOtrosCargos: null as string | null,
      ajusteDescuentoLocal: 0,
      estadoContrato: 'VIGENTE',
      estadoPago: 'PAGADO',
    };
    const garantiaBase = {
      id: 'dep-liq-01',
      localId,
      contratoId: contratoBase.id,
      montoEsperado: 500_000,
      montoRecibido: 500_000,
      montoRetenido: 0,
      montoDevuelto: 0,
      saldoComprometido: 500_000,
      estado: 'RECIBIDO_CUSTODIA',
      cuentaId: 'cta-caja-01',
      metodoPago: 'efectivo',
      motivoRetencion: null as string | null,
      observaciones: null as string | null,
    };
    const cuentaActiva = {
      id: 'cta-caja-01',
      localId,
      nombre: 'Caja Principal',
      tipo: 'CAJA_EFECTIVO',
      activo: true,
    };

    let reservasStore = [{ ...reservaBase }];
    let contratosStore = [{ ...contratoBase }];
    let garantiasStore = [{ ...garantiaBase }];
    let vehiculosStore = [{ id: vehiculoId, estado: 'RESERVADO', kilometraje: 10_000 }];
    const movimientosStore: Record<string, unknown>[] = [];
    const auditoriaStore: Record<string, unknown>[] = [];
    const inspeccionesStore: Record<string, unknown>[] = [];
    const puntosStore: Record<string, unknown>[] = [];
    const eventosStore: Record<string, unknown>[] = [];

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === reservas) return crearMockQuery(reservasStore);
            if (table === contratosAlquiler) return crearMockQuery(contratosStore);
            if (table === depositosGarantia) return crearMockQuery(garantiasStore);
            if (table === cuentasFinancieras) return crearMockQuery([cuentaActiva]);
            if (table === vehiculos) return crearMockQuery(vehiculosStore);
            if (table === mantenimientosVehiculo) return crearMockQuery([]);
            if (table === eventosAlquiler) return crearMockQuery(eventosStore);
            return crearMockQuery([]);
          },
          limit: () => Promise.resolve(reservasStore.slice(0, 1)),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === movimientosCaja) movimientosStore.push(vals);
          if (table === auditoriaFinanciera) auditoriaStore.push(vals);
          if (table === inspeccionesPericiales) inspeccionesStore.push(vals);
          if (table === puntosInspeccionR2) puntosStore.push(vals);
          if (table === eventosAlquiler) eventosStore.push(vals);
          return Promise.resolve([]);
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            if (table === reservas) {
              reservasStore = reservasStore.map((r) => ({ ...r, ...vals }));
            }
            if (table === contratosAlquiler) {
              contratosStore = contratosStore.map((c) => ({ ...c, ...vals }));
            }
            if (table === depositosGarantia) {
              garantiasStore = garantiasStore.map((g) => ({ ...g, ...vals }));
            }
            if (table === vehiculos) {
              vehiculosStore = vehiculosStore.map((v) => ({ ...v, ...vals }));
            }
            return Promise.resolve([]);
          },
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const actorAdmin: ContextoActorCiclo = {
      rol: 'ADMIN',
      usuarioId: 'usr-op-99',
      localId,
    };

    const res = await devolverYCerrarAlquilerD1(mockDb, {
      codigo: reservaBase.codigo,
      localId,
      fechaDevolucionReal: '2026-11-20',
      medidorUsoRetorno: 10_220,
      nivelEnergiaRetornoPct: 90,
      gestionGarantia: {
        accion: 'LIQUIDAR_AUTOMATICO',
        cuentaId: 'cta-caja-01',
      },
      novedadesZonas: [
        {
          zona: 'EXTERIOR_LATERAL_DER',
          etiqueta: 'Lateral derecho',
          estado: 'CON_NOVEDAD',
          nota: 'Rayón profundo en puerta delantera derecha',
          evidenciaId: 'med-dev-123',
          evidenciaUrl: '/api/multimedia/test.jpg',
          cobroConcepto: 'Rayón en puerta',
          cobroValor: 150_000,
        },
      ],
      cobrosAdicionales: [
        {
          id: 'cobro-nov-1',
          concepto: 'Rayón en puerta',
          valor: 150_000,
          nota: 'Rayón profundo en puerta delantera derecha',
          zona: 'Lateral derecho',
          evidenciaId: 'med-dev-123',
          evidenciaUrl: '/api/multimedia/test.jpg',
        },
      ],
      usuarioId: 'usr-op-99',
      usuarioNombre: 'Javier Operador',
      actor: actorAdmin,
    });

    // Garantía: 150k retenidos, 350k devueltos, saldo comprometido 0
    assert.equal(res.garantia?.montoRetenido, 150_000);
    assert.equal(res.garantia?.montoDevuelto, 350_000);
    assert.equal(res.garantia?.saldoComprometido, 0);
    assert.equal(res.garantia?.estado, 'DEVUELTO_PARCIAL');

    // Contrato: total 550k (400k + 150k), pagado 550k (400k + 150k de garantía), saldo pendiente 0
    assert.equal(res.contrato?.totalLiquidado, 550_000);
    assert.equal(res.contrato?.totalPagado, 550_000);
    assert.equal(res.contrato?.saldoPendiente, 0);
    assert.equal(res.contrato?.estadoContrato, 'CERRADO_PAZ_Y_SALVO');

    // Movimientos de caja: ingreso por aplicación de garantía (150k) + egreso devolución diferencia (350k)
    const ingDanos = movimientosStore.find((m) => m['categoria'] === 'COBRO_DANOS_MULTAS');
    const egrGarantia = movimientosStore.find((m) => m['categoria'] === 'REEMBOLSO_GARANTIA');
    assert.equal(ingDanos?.['monto'], 150_000);
    assert.equal(egrGarantia?.['monto'], 350_000);

    // Trazabilidad completa en detalleOtrosCargos (quién y cuándo)
    const lineas = parsearLineasCobrosAdicionales(res.contrato?.detalleOtrosCargos);
    assert.equal(lineas.length, 1);
    assert.equal(lineas[0]?.concepto, 'Rayón en puerta');
    assert.equal(lineas[0]?.valor, 150_000);
    assert.equal(lineas[0]?.registradoPorId, 'usr-op-99');
    assert.equal(lineas[0]?.registradoPorNombre, 'Javier Operador');
    assert.ok(lineas[0]?.registradoEnISO && !Number.isNaN(Date.parse(lineas[0].registradoEnISO)));

    // Auditoría financiera persistida
    assert.ok(auditoriaStore.length >= 2);
  });

  it('5. devolverYCerrarAlquilerD1 (LIQUIDAR_AUTOMATICO): si cobro supera la garantía, aplica 100% garantía y deja saldo pendiente por el excedente', async () => {
    const localId = 'loc-patio-norte';
    const vehiculoId = 'veh-onix-02';
    let reservasStore = [
      {
        id: 'res-liq-02',
        codigo: 'FLX-771002',
        localId,
        vehiculoId,
        clienteId: 'usr-cli-02',
        fechaInicio: '2026-11-18',
        fechaFin: '2026-11-20',
        fechaFinOriginal: '2026-11-20',
        estado: 'EN_CURSO',
        totalCotizado: 400_000,
        montoAbonoReportado: 400_000,
      },
    ];
    let contratosStore = [
      {
        id: 'ctr-liq-02',
        numeroContrato: 'CTR-771002',
        reservaId: 'res-liq-02',
        localId,
        vehiculoId,
        totalLiquidado: 400_000,
        totalPagado: 400_000,
        saldoPendiente: 0,
        cargosNovedadesDanos: 0,
        cargosOtrosLocal: 0,
        detalleOtrosCargos: null as string | null,
        ajusteDescuentoLocal: 0,
        estadoContrato: 'VIGENTE',
        estadoPago: 'PAGADO',
      },
    ];
    let garantiasStore = [
      {
        id: 'dep-liq-02',
        localId,
        contratoId: 'ctr-liq-02',
        montoEsperado: 500_000,
        montoRecibido: 500_000,
        montoRetenido: 0,
        montoDevuelto: 0,
        saldoComprometido: 500_000,
        estado: 'RECIBIDO_CUSTODIA',
        cuentaId: 'cta-caja-01',
        metodoPago: 'efectivo',
        motivoRetencion: null as string | null,
        observaciones: null as string | null,
      },
    ];
    let vehiculosStore = [{ id: vehiculoId, estado: 'RESERVADO', kilometraje: 10_000 }];
    const movimientosStore: Record<string, unknown>[] = [];

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => {
            if (table === reservas) return crearMockQuery(reservasStore);
            if (table === contratosAlquiler) return crearMockQuery(contratosStore);
            if (table === depositosGarantia) return crearMockQuery(garantiasStore);
            if (table === cuentasFinancieras)
              return crearMockQuery([
                { id: 'cta-caja-01', localId, nombre: 'Caja', tipo: 'CAJA_EFECTIVO', activo: true },
              ]);
            if (table === vehiculos) return crearMockQuery(vehiculosStore);
            return crearMockQuery([]);
          },
          limit: () => Promise.resolve(reservasStore.slice(0, 1)),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === movimientosCaja) movimientosStore.push(vals);
          return Promise.resolve([]);
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: () => {
            if (table === reservas) reservasStore = reservasStore.map((r) => ({ ...r, ...vals }));
            if (table === contratosAlquiler)
              contratosStore = contratosStore.map((c) => ({ ...c, ...vals }));
            if (table === depositosGarantia)
              garantiasStore = garantiasStore.map((g) => ({ ...g, ...vals }));
            if (table === vehiculos)
              vehiculosStore = vehiculosStore.map((v) => ({ ...v, ...vals }));
            return Promise.resolve([]);
          },
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const res = await devolverYCerrarAlquilerD1(mockDb, {
      codigo: 'FLX-771002',
      localId,
      fechaDevolucionReal: '2026-11-20',
      medidorUsoRetorno: 10_300,
      gestionGarantia: {
        accion: 'LIQUIDAR_AUTOMATICO',
        cuentaId: 'cta-caja-01',
      },
      cobrosAdicionales: [
        {
          id: 'cobro-nov-1',
          concepto: 'Daño en parachoques',
          valor: 750_000,
          nota: 'Fisura lateral',
          zona: 'Frente',
        },
      ],
      usuarioId: 'usr-op-99',
      usuarioNombre: 'Javier Operador',
      actor: { rol: 'ADMIN', usuarioId: 'usr-op-99', localId },
    });

    assert.equal(res.garantia?.montoRetenido, 500_000);
    assert.equal(res.garantia?.montoDevuelto, 0);
    assert.equal(res.garantia?.saldoComprometido, 0);
    assert.equal(res.garantia?.estado, 'APLICADO_CARGOS');

    // Total 1.150.000 (400k + 750k); pagado 900k (400k + 500k garantía); saldo pendiente 250k
    assert.equal(res.contrato?.totalLiquidado, 1_150_000);
    assert.equal(res.contrato?.totalPagado, 900_000);
    assert.equal(res.contrato?.saldoPendiente, 250_000);
    assert.equal(res.contrato?.estadoContrato, 'CERRADO_CON_SALDO');
    assert.equal(
      movimientosStore.filter((m) => m['categoria'] === 'REEMBOLSO_GARANTIA').length,
      0
    );
  });

  it('6. ZONAS_FOTOS_ALQUILER y etiquetas humanas cubren las 6 zonas obligatorias sin exponer enums crudos', () => {
    assert.equal(ZONAS_FOTOS_ALQUILER.length, 6);
    assert.equal(etiquetaZonaEvidencia('EXTERIOR_FRONTAL'), 'Frente');
    assert.equal(etiquetaZonaEvidencia('PANTALLA_TABLERO_ODOMETRO'), 'Tablero y odómetro');
    assert.equal(etiquetaEstadoGarantia('RECIBIDO_CUSTODIA'), 'En custodia');
    assert.equal(etiquetaEstadoGarantia('DEVUELTO_PARCIAL'), 'Devuelta parcialmente');
  });
});
