import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEstadoFinancieroCompleto } from '../src/lib/caja/repositorio.ts';
import { obtenerDatosMetricasLocalD1 } from '../src/lib/metricas/repositorio.ts';
import { reservas, contratosAlquiler, movimientosCaja } from '../src/db/schema/index.ts';
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

