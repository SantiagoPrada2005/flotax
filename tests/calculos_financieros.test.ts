import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatearMonedaCOP,
  formatearMonedaCompactaCOP,
  calcularSaldoCuenta,
  calcularGarantiasPorDevolver,
  esIngresoOperativo,
  esGastoOperativo,
  calcularIndicadoresFinancieros,
  calcularDistribucionMetodosPago,
  calcularDistribucionGastosCategorias,
  calcularTotalPagadoNetoContrato,
} from '../src/lib/caja/calculos.ts';
import type {
  CuentaFinancieraSelect,
  MovimientoCajaSelect,
  DepositoGarantiaSelect,
  ContratoCarteraItem,
} from '../src/lib/caja/tipos.ts';

describe('Cálculos Financieros Canónicos - FlotaX', () => {
  const cuentaEjemplo: CuentaFinancieraSelect = {
    id: 'cta-1',
    localId: 'local-1',
    nombre: 'Caja Principal Efectivo',
    tipo: 'CAJA_EFECTIVO',
    saldoInicial: 1_000_000,
    activo: true,
    creadoEn: new Date('2026-10-01'),
    actualizadoEn: new Date('2026-10-01'),
  };

  test('1. Saldo de cuenta = saldo inicial + entradas confirmadas - salidas confirmadas', () => {
    const movimientos: MovimientoCajaSelect[] = [
      {
        id: 'm1',
        localId: 'local-1',
        tipo: 'INGRESO',
        categoria: 'PAGO_ALQUILER',
        concepto: 'Pago Alquiler',
        monto: 500_000,
        metodoPago: 'efectivo',
        cuentaId: 'cta-1',
        cuentaDestinoId: null,
        contratoId: 'C1',
        clienteId: null,
        clienteNombre: 'Cliente A',
        vehiculoId: null,
        proveedor: null,
        referencia: null,
        soporteUrl: null,
        estado: 'CONFIRMADO',
        motivoAnulacion: null,
        anuladoPorId: null,
        anuladoEn: null,
        creadoPorId: 'u1',
        observaciones: null,
        fechaMovimiento: new Date('2026-10-02'),
        creadoEn: new Date('2026-10-02'),
        actualizadoEn: new Date('2026-10-02'),
      },
      {
        id: 'm2',
        localId: 'local-1',
        tipo: 'EGRESO',
        categoria: 'MANTENIMIENTO_REPARACION',
        concepto: 'Cambio de aceite',
        monto: 200_000,
        metodoPago: 'efectivo',
        cuentaId: 'cta-1',
        cuentaDestinoId: null,
        contratoId: null,
        clienteId: null,
        clienteNombre: null,
        vehiculoId: 'veh-1',
        proveedor: 'Taller',
        referencia: null,
        soporteUrl: null,
        estado: 'CONFIRMADO',
        motivoAnulacion: null,
        anuladoPorId: null,
        anuladoEn: null,
        creadoPorId: 'u1',
        observaciones: null,
        fechaMovimiento: new Date('2026-10-03'),
        creadoEn: new Date('2026-10-03'),
        actualizadoEn: new Date('2026-10-03'),
      },
      {
        id: 'm3_anulado',
        localId: 'local-1',
        tipo: 'EGRESO',
        categoria: 'OTRO_EGRESO',
        concepto: 'Egreso anulado',
        monto: 300_000,
        metodoPago: 'efectivo',
        cuentaId: 'cta-1',
        cuentaDestinoId: null,
        contratoId: null,
        clienteId: null,
        clienteNombre: null,
        vehiculoId: null,
        proveedor: null,
        referencia: null,
        soporteUrl: null,
        estado: 'ANULADO',
        motivoAnulacion: 'Error en digitación',
        anuladoPorId: 'u1',
        anuladoEn: new Date('2026-10-04'),
        creadoPorId: 'u1',
        observaciones: null,
        fechaMovimiento: new Date('2026-10-04'),
        creadoEn: new Date('2026-10-04'),
        actualizadoEn: new Date('2026-10-04'),
      },
    ];

    // 1_000_000 (inicial) + 500_000 (ingreso) - 200_000 (egreso) = 1_300_000 (el anulado no resta)
    const saldo = calcularSaldoCuenta(cuentaEjemplo, movimientos);
    assert.equal(saldo, 1_300_000);
  });

  test('2. Depósito de garantía en custodia no es ingreso operativo', () => {
    const movGarantia: MovimientoCajaSelect = {
      id: 'g1',
      localId: 'local-1',
      tipo: 'INGRESO',
      categoria: 'DEPOSITO_GARANTIA',
      concepto: 'Fianza en custodia',
      monto: 750_000,
      metodoPago: 'transferencia',
      cuentaId: 'cta-1',
      cuentaDestinoId: null,
      contratoId: 'C1',
      clienteId: null,
      clienteNombre: 'Cliente B',
      vehiculoId: null,
      proveedor: null,
      referencia: null,
      soporteUrl: null,
      estado: 'CONFIRMADO',
      motivoAnulacion: null,
      anuladoPorId: null,
      anuladoEn: null,
      creadoPorId: 'u1',
      observaciones: null,
      fechaMovimiento: new Date('2026-10-05'),
      creadoEn: new Date('2026-10-05'),
      actualizadoEn: new Date('2026-10-05'),
    };

    assert.equal(esIngresoOperativo(movGarantia), false);
  });

  test('3. Reembolso de garantía no es gasto operativo', () => {
    const movReembolso: MovimientoCajaSelect = {
      id: 'r1',
      localId: 'local-1',
      tipo: 'EGRESO',
      categoria: 'REEMBOLSO_GARANTIA',
      concepto: 'Devolución fianza',
      monto: 750_000,
      metodoPago: 'transferencia',
      cuentaId: 'cta-1',
      cuentaDestinoId: null,
      contratoId: 'C1',
      clienteId: null,
      clienteNombre: 'Cliente B',
      vehiculoId: null,
      proveedor: null,
      referencia: null,
      soporteUrl: null,
      estado: 'CONFIRMADO',
      motivoAnulacion: null,
      anuladoPorId: null,
      anuladoEn: null,
      creadoPorId: 'u1',
      observaciones: null,
      fechaMovimiento: new Date('2026-10-08'),
      creadoEn: new Date('2026-10-08'),
      actualizadoEn: new Date('2026-10-08'),
    };

    assert.equal(esGastoOperativo(movReembolso), false);
  });

  test('4. Garantías por devolver calculadas correctamente', () => {
    const garantias: DepositoGarantiaSelect[] = [
      {
        id: 'g-activa',
        localId: 'local-1',
        contratoId: 'C1',
        clienteId: null,
        clienteNombre: 'Cliente 1',
        vehiculoId: null,
        montoEsperado: 800_000,
        montoRecibido: 800_000,
        montoRetenido: 100_000, // Retenido por daño menor
        montoDevuelto: 200_000, // Devolución parcial
        saldoComprometido: 500_000,
        estado: 'DEVUELTO_PARCIAL',
        cuentaId: 'cta-1',
        metodoPago: 'transferencia',
        referenciaRecepcion: null,
        fechaRecepcion: new Date(),
        fechaDevolucionPrevista: new Date(),
        fechaDevolucionReal: null,
        referenciaDevolucion: null,
        motivoRetencion: 'Rayón paragolpes',
        observaciones: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      {
        id: 'g-devuelta-total',
        localId: 'local-1',
        contratoId: 'C2',
        clienteId: null,
        clienteNombre: 'Cliente 2',
        vehiculoId: null,
        montoEsperado: 500_000,
        montoRecibido: 500_000,
        montoRetenido: 0,
        montoDevuelto: 500_000,
        saldoComprometido: 0,
        estado: 'DEVUELTO_TOTAL',
        cuentaId: 'cta-1',
        metodoPago: 'efectivo',
        referenciaRecepcion: null,
        fechaRecepcion: new Date(),
        fechaDevolucionPrevista: new Date(),
        fechaDevolucionReal: new Date(),
        referenciaDevolucion: null,
        motivoRetencion: null,
        observaciones: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ];

    // Solo la primera tiene 800_000 - 100_000 - 200_000 = 500_000 pendiente por devolver
    const porDevolver = calcularGarantiasPorDevolver(garantias);
    assert.equal(porDevolver, 500_000);
  });

  test('5. Saldo disponible real descuenta los depósitos comprometidos', () => {
    const cuentas: CuentaFinancieraSelect[] = [
      {
        id: 'c1',
        localId: 'l1',
        nombre: 'Caja',
        tipo: 'CAJA_EFECTIVO',
        saldoInicial: 2_000_000,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
      {
        id: 'c2',
        localId: 'l1',
        nombre: 'Banco',
        tipo: 'BANCO',
        saldoInicial: 5_000_000,
        activo: true,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ];

    // Total en cuentas = 7_000_000
    // Supongamos 1_500_000 en depósitos de garantía por devolver
    const garantias: DepositoGarantiaSelect[] = [
      {
        id: 'g1',
        localId: 'l1',
        contratoId: 'C1',
        clienteId: null,
        clienteNombre: 'Cliente',
        vehiculoId: null,
        montoEsperado: 1_500_000,
        montoRecibido: 1_500_000,
        montoRetenido: 0,
        montoDevuelto: 0,
        saldoComprometido: 1_500_000,
        estado: 'RECIBIDO_CUSTODIA',
        cuentaId: 'c2',
        metodoPago: 'transferencia',
        referenciaRecepcion: null,
        fechaRecepcion: new Date(),
        fechaDevolucionPrevista: new Date(),
        fechaDevolucionReal: null,
        referenciaDevolucion: null,
        motivoRetencion: null,
        observaciones: null,
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ];

    const kpis = calcularIndicadoresFinancieros({
      cuentas,
      movimientosTodos: [],
      movimientosPeriodo: [],
      depositosGarantia: garantias,
      carteraContratos: [],
    });

    assert.equal(kpis.totalEnCuentas, 7_000_000);
    assert.equal(kpis.depositosPorDevolver, 1_500_000);
    // Saldo disponible = 7_000_000 - 1_500_000 = 5_500_000
    assert.equal(kpis.saldoDisponibleTotal, 5_500_000);
  });

  test('6. Formateo de moneda colombiana COP', () => {
    const texto = formatearMonedaCOP(1_250_000);
    assert.ok(texto.includes('1.250.000') || texto.includes('1,250,000'));
    assert.equal(formatearMonedaCompactaCOP(1_500_000), '$1.5M');
    assert.equal(formatearMonedaCompactaCOP(450_000), '$450K');
  });

  test('7. REEMBOLSO_ALQUILER no es gasto operativo ni infla los gastos del período', () => {
    // 7.1. Verificación directa por categoría string y objeto movimiento
    assert.equal(esGastoOperativo('REEMBOLSO_ALQUILER'), false);

    const movReembolsoAlquiler: MovimientoCajaSelect = {
      id: 'm-rem-1',
      localId: 'local-1',
      tipo: 'EGRESO',
      categoria: 'REEMBOLSO_ALQUILER',
      concepto: 'Reembolso por devolución anticipada',
      monto: 300_000,
      metodoPago: 'transferencia',
      cuentaId: 'cta-1',
      cuentaDestinoId: null,
      contratoId: 'C1',
      clienteId: null,
      clienteNombre: 'Cliente C',
      vehiculoId: null,
      proveedor: null,
      referencia: null,
      soporteUrl: null,
      estado: 'CONFIRMADO',
      motivoAnulacion: null,
      anuladoPorId: null,
      anuladoEn: null,
      creadoPorId: 'u1',
      observaciones: null,
      fechaMovimiento: new Date('2026-10-10'),
      creadoEn: new Date('2026-10-10'),
      actualizadoEn: new Date('2026-10-10'),
    };

    assert.equal(esGastoOperativo(movReembolsoAlquiler), false);

    // 7.2. En indicadores financieros, los gastos operativos deben ser 0 si el único egreso es reembolso de alquiler
    const kpis = calcularIndicadoresFinancieros({
      cuentas: [cuentaEjemplo],
      movimientosTodos: [movReembolsoAlquiler],
      movimientosPeriodo: [movReembolsoAlquiler],
      depositosGarantia: [],
      carteraContratos: [],
    });

    assert.equal(kpis.egresosPeriodo, 300_000, 'El dinero sí salió de caja (egreso bruto)');
    assert.equal(kpis.resultadoOperativoPeriodo, 0, 'No debe descontarse como gasto operativo');
  });

  test('8. calcularTotalPagadoNetoContrato: abonos menos reembolsos de alquiler no deja neto positivo si se devolvió todo', () => {
    const movimientos = [
      {
        tipo: 'INGRESO' as const,
        categoria: 'ABONO_CONTRATO' as const,
        monto: 500_000,
        estado: 'CONFIRMADO' as const,
      },
      {
        tipo: 'EGRESO' as const,
        categoria: 'REEMBOLSO_ALQUILER' as const,
        monto: 500_000,
        estado: 'CONFIRMADO' as const,
      },
      {
        tipo: 'EGRESO' as const,
        categoria: 'OTRO_EGRESO' as const,
        monto: 100_000,
        estado: 'CONFIRMADO' as const,
      },
    ];

    const neto = calcularTotalPagadoNetoContrato(movimientos);
    assert.equal(neto, 0, 'Si se reembolsó la totalidad del abono, el total pagado neto debe ser 0');

    // Con abono parcial restante
    const netoParcial = calcularTotalPagadoNetoContrato([
      { tipo: 'INGRESO', categoria: 'PAGO_ALQUILER', monto: 600_000, estado: 'CONFIRMADO' },
      { tipo: 'EGRESO', categoria: 'REEMBOLSO_ALQUILER', monto: 200_000, estado: 'CONFIRMADO' },
    ]);
    assert.equal(netoParcial, 400_000);
  });
});
