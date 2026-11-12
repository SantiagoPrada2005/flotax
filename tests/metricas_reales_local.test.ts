import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEstadoFinancieroCompleto } from '../src/lib/caja/repositorio.ts';
import { obtenerDatosMetricasLocalD1 } from '../src/lib/metricas/repositorio.ts';
import { getYardMetricsSnapshot } from '../src/lib/metricas/telemetry-provider.ts';
import {
  reservas,
  contratosAlquiler,
  movimientosCaja,
  type ReservaSelect,
  type ContratoAlquilerSelect,
  type MovimientoCajaSelect,
} from '../src/db/schema/index.ts';
import type { VehiculoItem } from '../src/lib/flota/types.ts';
import type { AppDb } from '../src/lib/db.ts';

function crearMockDbVacio(): AppDb {
  const vacio: unknown[] = [];
  const chain: Record<string, unknown> = {
    all: async () => vacio,
    then: (resolve?: (val: unknown) => unknown, reject?: (err: unknown) => unknown) =>
      Promise.resolve(vacio).then(resolve, reject),
    catch: (reject?: (err: unknown) => unknown) =>
      Promise.resolve(vacio).catch(reject),
  };
  chain.from = () => chain;
  chain.where = () => chain;
  chain.orderBy = () => chain;
  chain.innerJoin = () => chain;
  chain.leftJoin = () => chain;

  return {
    select: () => chain,
  } as unknown as AppDb;
}

describe('Aislamiento Financiero por Local - FlotaX', () => {
  it('1. Con DB conectada y local sin movimientos: retorna métricas en cero sin fugar semillas', async () => {
    const mockDb = crearMockDbVacio();
    const resultado = await obtenerEstadoFinancieroCompleto({
      localId: 'local-vacio',
      periodo: 'ESTE_MES',
      db: mockDb,
    });

    assert.equal(resultado.indicadores.ingresosPeriodo, 0);
    assert.equal(resultado.todosMovimientos.length, 0);
    assert.equal(resultado.carteraContratos.length, 0);
    assert.equal(resultado.alertas.length, 0);
  });

  it('2. Con DB definida pero localId no especificado: retorna listas vacías sin consultar sin filtro', async () => {
    let selectInvocado = false;
    const dbConDetector = {
      select: () => {
        selectInvocado = true;
        return crearMockDbVacio().select();
      },
    } as unknown as AppDb;

    const resultado = await obtenerEstadoFinancieroCompleto({
      localId: undefined,
      periodo: 'ESTE_MES',
      db: dbConDetector,
    });

    assert.equal(resultado.indicadores.ingresosPeriodo, 0);
    assert.equal(resultado.todosMovimientos.length, 0);
    assert.equal(resultado.carteraContratos.length, 0);
    assert.equal(resultado.cuentas.length, 0);
    assert.equal(resultado.alertas.length, 0);
    assert.equal(selectInvocado, false, 'No debió ejecutar select en DB cuando localId es undefined');
  });
});

describe('Repositorio D1 de Métricas por Local (obtenerDatosMetricasLocalD1) - FlotaX', () => {
  it('1. Sin db o con localId vacío: retorna colecciones vacías sin invocar base de datos', async () => {
    let selectInvocado = false;
    const dbSpy = {
      select: () => {
        selectInvocado = true;
        return crearMockDbVacio().select();
      },
    } as unknown as AppDb;

    const resSinDb = await obtenerDatosMetricasLocalD1(undefined, 'local-1', '2026-11-12');
    assert.deepEqual(resSinDb, {
      reservas: [],
      contratosVigentes: [],
      movimientosConfirmados: [],
    });

    const resLocalVacio = await obtenerDatosMetricasLocalD1(dbSpy, '', '2026-11-12');
    assert.deepEqual(resLocalVacio, {
      reservas: [],
      contratosVigentes: [],
      movimientosConfirmados: [],
    });
    assert.equal(selectInvocado, false, 'No debe consultar la DB si localId está vacío');
  });

  it('2. Con db simulado: ejecuta las 3 consultas filtradas por localId y retorna registros entregados por D1', async () => {
    const mockReservas = [
      { id: 'res-1', localId: 'local-poblado', codigo: 'RES-001', estado: 'CONFIRMADA', fechaFin: '2026-11-20' },
    ];
    const mockContratos = [
      { id: 'con-1', localId: 'local-poblado', codigoContrato: 'CON-001', estadoContrato: 'VIGENTE' },
    ];
    const mockMovimientos = [
      { id: 'mov-1', localId: 'local-poblado', monto: 150000, estado: 'CONFIRMADO', fechaMovimiento: new Date('2026-11-10T12:00:00Z') },
    ];

    const tablasConsultadas: unknown[] = [];

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => {
          tablasConsultadas.push(tabla);
          let datos: unknown[] = [];
          if (tabla === reservas) datos = mockReservas;
          else if (tabla === contratosAlquiler) datos = mockContratos;
          else if (tabla === movimientosCaja) datos = mockMovimientos;

          const queryChain: Record<string, unknown> = {
            all: async () => datos,
            then: (resolve?: (val: unknown) => unknown, reject?: (err: unknown) => unknown) =>
              Promise.resolve(datos).then(resolve, reject),
            catch: (reject?: (err: unknown) => unknown) =>
              Promise.resolve(datos).catch(reject),
            orderBy: () => queryChain,
          };

          return {
            where: () => queryChain,
          };
        },
      }),
    } as unknown as AppDb;

    const res = await obtenerDatosMetricasLocalD1(mockDb, 'local-poblado', '2026-11-12');

    assert.equal(res.reservas.length, 1);
    assert.equal(res.reservas[0]?.id, 'res-1');
    assert.equal(res.contratosVigentes.length, 1);
    assert.equal(res.contratosVigentes[0]?.id, 'con-1');
    assert.equal(res.movimientosConfirmados.length, 1);
    assert.equal(res.movimientosConfirmados[0]?.id, 'mov-1');

    assert.equal(tablasConsultadas.includes(reservas), true, 'Debe consultar tabla reservas');
    assert.equal(tablasConsultadas.includes(contratosAlquiler), true, 'Debe consultar tabla contratosAlquiler');
    assert.equal(tablasConsultadas.includes(movimientosCaja), true, 'Debe consultar tabla movimientosCaja');
  });

  it('3. Ante error en D1: captura la excepción y retorna colecciones vacías de forma segura', async () => {
    const dbConFallo = {
      select: () => {
        throw new Error('D1_SIMULATED_FAILURE');
      },
    } as unknown as AppDb;

    const res = await obtenerDatosMetricasLocalD1(dbConFallo, 'local-poblado', '2026-11-12');
    assert.deepEqual(res, {
      reservas: [],
      contratosVigentes: [],
      movimientosConfirmados: [],
    });
  });
});

function crearVehiculoMock(overrides: Partial<VehiculoItem> & { id: string; placa: string }): VehiculoItem {
  return {
    marca: 'Mazda',
    modelo: '3 Grand Touring',
    anio: 2025,
    categoria: 'SEDAN',
    categoriaEtiqueta: 'Sedán',
    estado: 'DISPONIBLE',
    precioDia: 220_000,
    depositoGarantia: 500_000,
    transmision: 'Automática',
    combustible: 'Gasolina',
    capacidadPasajeros: 5,
    kilometraje: 12_000,
    imagenUrl: '/img/vehiculo.webp',
    descripcion: 'Unidad de prueba',
    aceleracion: '8.2 s',
    velocidadMaxima: '210 km/h',
    rating: 4.9,
    autonomiaOdo: '620 km',
    ...overrides,
  };
}

function crearReservaMock(overrides: Partial<ReservaSelect> & { id: string; vehiculoId: string; codigo: string }): ReservaSelect {
  const ahora = new Date('2026-11-10T12:00:00Z');
  return {
    localId: 'local-1',
    clienteId: 'cli-1',
    fechaInicio: '2026-11-10',
    fechaFin: '2026-11-15',
    diasAlquiler: 6,
    estado: 'EN_CURSO',
    modalidadEntrega: 'PATIO_PRINCIPAL',
    direccionEntrega: null,
    sedeNombre: 'Patio Norte',
    precioDiaCotizado: 220_000,
    subtotalTarifaCotizado: 1_320_000,
    coberturaPericialCotizada: 0,
    totalCotizado: 1_320_000,
    modalidadPagoInicial: 'ABONO_30',
    metodoAbonoInicial: 'TRANSFERENCIA_PSE',
    montoAbonoReportado: 400_000,
    referenciaAbonoInicial: null,
    contactoNombre: 'Laura Restrepo',
    contactoTipoDocumento: 'CC',
    contactoNumeroDocumento: '1037600111',
    contactoCategoriaLicencia: 'B1',
    contactoTelefono: '3001234567',
    contactoCorreo: 'laura@example.com',
    ley1581Aceptada: true,
    motivoRechazo: null,
    creadoPorId: null,
    confirmadoPorId: null,
    creadoEn: ahora,
    actualizadoEn: ahora,
    ...overrides,
  };
}

function crearContratoMock(
  overrides: Partial<ContratoAlquilerSelect> & { id: string; reservaId: string; vehiculoId: string; numeroContrato: string }
): ContratoAlquilerSelect {
  const ahora = new Date('2026-11-10T12:00:00Z');
  return {
    localId: 'local-1',
    clienteId: 'cli-1',
    arrendatarioNombre: 'Laura Restrepo',
    arrendatarioTipoDocumento: 'CC',
    arrendatarioNumeroDocumento: '1037600111',
    arrendatarioCiudadExpedicion: 'Medellín',
    arrendatarioLicenciaNumero: '1037600111',
    arrendatarioLicenciaCategoria: 'B1',
    arrendatarioDomicilio: 'Medellín',
    arrendatarioTelefono: '3001234567',
    arrendatarioCorreo: 'laura@example.com',
    ley1581Aceptada: true,
    trasladoFotomultasAceptado: true,
    pagareBlancoFirmado: false,
    fechaHoraEntregaReal: ahora,
    fechaHoraDevolucionPactada: new Date('2026-11-15T18:00:00-05:00'),
    fechaHoraDevolucionReal: null,
    medidorUsoEntrega: 12_000,
    medidorUsoRetorno: null,
    nivelEnergiaEntregaPct: 100,
    nivelEnergiaRetornoPct: null,
    canonDiarioPactado: 220_000,
    subtotalCanon: 1_320_000,
    coberturaPericial: 0,
    cargosMora: 0,
    cargosNovedadesDanos: 0,
    cargosCombustibleLavado: 0,
    totalLiquidado: 1_320_000,
    totalPagado: 400_000,
    saldoPendiente: 920_000,
    estadoPago: 'PARCIAL',
    estadoContrato: 'VIGENTE',
    firmaArrendadorR2Key: null,
    firmaArrendatarioR2Key: null,
    contratoPdfR2Key: null,
    creadoEn: ahora,
    actualizadoEn: ahora,
    ...overrides,
  };
}

function crearMovimientoMock(
  overrides: Partial<MovimientoCajaSelect> & { id: string; monto: number; fechaMovimiento: Date }
): MovimientoCajaSelect {
  return {
    localId: 'local-1',
    tipo: 'INGRESO',
    categoria: 'PAGO_ALQUILER',
    concepto: 'Pago de alquiler',
    metodoPago: 'transferencia',
    cuentaId: 'cta-1',
    cuentaDestinoId: null,
    contratoId: 'CTR-001',
    clienteId: null,
    clienteNombre: 'Laura Restrepo',
    vehiculoId: null,
    proveedor: null,
    referencia: 'REF-001',
    soporteUrl: null,
    estado: 'CONFIRMADO',
    motivoAnulacion: null,
    anuladoPorId: null,
    anuladoEn: null,
    creadoPorId: 'op-1',
    observaciones: null,
    creadoEn: overrides.fechaMovimiento,
    actualizadoEn: overrides.fechaMovimiento,
    ...overrides,
  };
}

describe('Cálculos Reales de Telemetría (getYardMetricsSnapshot) - FlotaX', () => {
  it('1. Local vacío (vehiculos: [], datosD1 vacío): retorna todo en cero sin datos simulados', () => {
    const snapshot = getYardMetricsSnapshot({
      hoyISO: '2026-11-12',
      timezone: 'America/Bogota',
      vehiculos: [],
      datosD1: {
        reservas: [],
        contratosVigentes: [],
        movimientosConfirmados: [],
      },
    });

    assert.equal(snapshot.dailyEarnings.todayEarnings, 0);
    assert.equal(snapshot.dailyEarnings.dailyAverage, 0);
    assert.equal(snapshot.dailyEarnings.byCategory.length, 0);

    assert.equal(snapshot.rentedFleet.rentedAutomobilesCount, 0);
    assert.equal(snapshot.rentedFleet.totalAutomobilesCount, 0);
    assert.equal(snapshot.rentedFleet.automobilesOccupancyPct, 0);
    assert.equal(snapshot.rentedFleet.rentedAutomobiles.length, 0);

    assert.equal(snapshot.monthlyOccupancy.currentOccupancyPct, 0);
    assert.equal(snapshot.monthlyOccupancy.months.length, 6);
    for (const mes of snapshot.monthlyOccupancy.months) {
      assert.equal(mes.reservationsCount, 0);
      assert.equal(mes.occupancyPct, 0);
      assert.equal(mes.earnings, 0);
    }

    assert.equal(snapshot.dailyMovements.items.length, 0);
    assert.equal(snapshot.dailyMovements.totalIncome, 0);
    assert.equal(snapshot.dailyMovements.totalExpense, 0);
    assert.equal(snapshot.dailyMovements.curvePoints.length, 5);
    for (const punto of snapshot.dailyMovements.curvePoints) {
      assert.equal(punto.income, 0);
      assert.equal(punto.expense, 0);
    }
  });

  it('2. Flota alquilada real cruzada por vehiculoId y reservaId sin clientesRespaldo', () => {
    const vehiculos: VehiculoItem[] = [
      crearVehiculoMock({ id: 'veh-sedan-1', placa: 'AAA-101', categoria: 'SEDAN', estado: 'RESERVADO' }),
      crearVehiculoMock({ id: 'veh-suv-1', placa: 'BBB-202', categoria: 'SUV', categoriaEtiqueta: 'SUV', estado: 'DISPONIBLE' }),
      crearVehiculoMock({ id: 'veh-moto-1', placa: 'CCC-30C', categoria: 'MOTO', categoriaEtiqueta: 'Moto', estado: 'DISPONIBLE' }),
    ];

    const reservaActiva = crearReservaMock({
      id: 'res-real-1',
      vehiculoId: 'veh-sedan-1',
      codigo: 'FLX-777001',
      fechaInicio: '2026-11-10',
      fechaFin: '2026-11-15',
      estado: 'EN_CURSO',
      contactoNombre: 'Mateo Saldarriaga',
    });

    const contratoVigente = crearContratoMock({
      id: 'ctr-real-1',
      reservaId: 'res-real-1',
      vehiculoId: 'veh-sedan-1',
      numeroContrato: 'CTR-9901',
      arrendatarioNombre: 'Mateo Saldarriaga',
    });

    const snapshot = getYardMetricsSnapshot({
      hoyISO: '2026-11-12',
      timezone: 'America/Bogota',
      vehiculos,
      datosD1: {
        reservas: [reservaActiva],
        contratosVigentes: [contratoVigente],
        movimientosConfirmados: [],
      },
    });

    assert.equal(snapshot.rentedFleet.rentedAutomobilesCount, 1);
    assert.equal(snapshot.rentedFleet.totalAutomobilesCount, 2);
    assert.equal(snapshot.rentedFleet.automobilesOccupancyPct, 50);
    assert.equal(snapshot.rentedFleet.availableAutomobilesCount, 1);
    assert.equal(snapshot.rentedFleet.otherRentedUnitsCount, 0);
    assert.equal(snapshot.rentedFleet.rentedAutomobiles.length, 1);

    const autoAlquilado = snapshot.rentedFleet.rentedAutomobiles[0]!;
    assert.equal(autoAlquilado.plate, 'AAA-101');
    assert.equal(autoAlquilado.clientName, 'Mateo Saldarriaga');
    assert.equal(autoAlquilado.contractCode, 'CTR-9901');
    assert.equal(autoAlquilado.daysActive, 3);
  });

  it('3. Zona horaria, filtro de movimientos de hoy, exclusión de depósitos y desglose por categoría', () => {
    const vehiculos: VehiculoItem[] = [
      crearVehiculoMock({ id: 'veh-suv-1', placa: 'SUV-500', categoria: 'SUV', categoriaEtiqueta: 'SUV', estado: 'RESERVADO' }),
    ];

    const movHoyOperativo = crearMovimientoMock({
      id: 'mov-hoy-1',
      tipo: 'INGRESO',
      categoria: 'PAGO_ALQUILER',
      concepto: 'Pago alquiler SUV-500',
      monto: 450_000,
      vehiculoId: 'veh-suv-1',
      fechaMovimiento: new Date('2026-11-12T23:30:00-05:00'),
    });

    const movHoyDeposito = crearMovimientoMock({
      id: 'mov-hoy-dep',
      tipo: 'INGRESO',
      categoria: 'DEPOSITO_GARANTIA',
      concepto: 'Depósito garantía SUV-500',
      monto: 600_000,
      vehiculoId: 'veh-suv-1',
      fechaMovimiento: new Date('2026-11-12T10:00:00-05:00'),
    });

    const movAyer = crearMovimientoMock({
      id: 'mov-ayer-1',
      tipo: 'INGRESO',
      categoria: 'PAGO_ALQUILER',
      concepto: 'Pago ayer',
      monto: 200_000,
      vehiculoId: 'veh-suv-1',
      fechaMovimiento: new Date('2026-11-11T15:00:00-05:00'),
    });

    const snapshot = getYardMetricsSnapshot({
      hoyISO: '2026-11-12',
      timezone: 'America/Bogota',
      vehiculos,
      datosD1: {
        reservas: [],
        contratosVigentes: [],
        movimientosConfirmados: [movHoyOperativo, movHoyDeposito, movAyer],
      },
    });

    assert.equal(snapshot.dailyEarnings.todayEarnings, 450_000);
    assert.equal(snapshot.dailyEarnings.byCategory.length, 1);
    assert.equal(snapshot.dailyEarnings.byCategory[0]?.amount, 450_000);
    assert.equal(snapshot.dailyEarnings.byCategory[0]?.sharePct, 100);

    const itemHoyOperativo = snapshot.dailyMovements.items.find((i) => i.id === 'mov-hoy-1');
    assert.ok(itemHoyOperativo, 'Debe incluir el movimiento de las 23:30-05:00 en hoyISO=2026-11-12');
    assert.equal(itemHoyOperativo.timeLabel, '23:30');
    assert.equal(snapshot.dailyMovements.items.some((i) => i.id === 'mov-ayer-1'), false);
  });

  it('4. Ocupación mensual de 6 meses calculada con días reales sobre capacidad de flota', () => {
    const vehiculos: VehiculoItem[] = [
      crearVehiculoMock({ id: 'veh-1', placa: 'FLX-001', categoria: 'SEDAN' }),
      crearVehiculoMock({ id: 'veh-2', placa: 'FLX-002', categoria: 'SUV' }),
    ];

    // Noviembre 2026 tiene 30 días. Capacidad = 2 * 30 = 60 días-vehículo.
    // 1 reserva de 15 días en Noviembre => 15 / 60 = 25%
    const resNov = crearReservaMock({
      id: 'res-nov',
      vehiculoId: 'veh-1',
      codigo: 'FLX-NOV',
      fechaInicio: '2026-11-01',
      fechaFin: '2026-11-15',
      estado: 'EN_CURSO',
    });

    // Octubre 2026 tiene 31 días. Capacidad = 2 * 31 = 62 días-vehículo.
    // 1 reserva de todo el mes (31 días) => 31 / 62 = 50%
    const resOct = crearReservaMock({
      id: 'res-oct',
      vehiculoId: 'veh-2',
      codigo: 'FLX-OCT',
      fechaInicio: '2026-10-01',
      fechaFin: '2026-10-31',
      estado: 'COMPLETADA',
    });

    const movNov = crearMovimientoMock({
      id: 'mov-nov',
      monto: 900_000,
      vehiculoId: 'veh-1',
      fechaMovimiento: new Date('2026-11-05T12:00:00-05:00'),
    });

    const movOct = crearMovimientoMock({
      id: 'mov-oct',
      monto: 1_500_000,
      vehiculoId: 'veh-2',
      fechaMovimiento: new Date('2026-10-15T12:00:00-05:00'),
    });

    const snapshot = getYardMetricsSnapshot({
      hoyISO: '2026-11-12',
      timezone: 'America/Bogota',
      vehiculos,
      datosD1: {
        reservas: [resNov, resOct],
        contratosVigentes: [],
        movimientosConfirmados: [movNov, movOct],
      },
    });

    assert.equal(snapshot.monthlyOccupancy.months.length, 6);
    const mesActual = snapshot.monthlyOccupancy.months[5]!;
    const mesAnterior = snapshot.monthlyOccupancy.months[4]!;

    assert.equal(mesActual.id, 'mes-2026-11');
    assert.equal(mesActual.reservationsCount, 1);
    assert.equal(mesActual.earnings, 900_000);
    assert.equal(mesActual.occupancyPct, 25);

    assert.equal(mesAnterior.id, 'mes-2026-10');
    assert.equal(mesAnterior.reservationsCount, 1);
    assert.equal(mesAnterior.earnings, 1_500_000);
    assert.equal(mesAnterior.occupancyPct, 50);
  });
});

