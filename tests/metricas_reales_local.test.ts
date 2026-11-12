import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { obtenerEstadoFinancieroCompleto } from '../src/lib/caja/repositorio.ts';
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
