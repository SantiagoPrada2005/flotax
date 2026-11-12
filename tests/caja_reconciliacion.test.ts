import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  anularMovimientoRepo,
  registrarMovimientoRepo,
  obtenerEstadoFinancieroCompleto,
} from '../src/lib/caja/repositorio.ts';
import {
  anularMovimientoAction,
  registrarMovimientoAction,
} from '../src/actions/caja.ts';
import type { AppDb } from '../src/lib/db.ts';
import type { ContextWithLocals } from '../src/lib/auth/guard.ts';
import { movimientosCaja, cuentasFinancieras } from '../src/db/schema/index.ts';

describe('Reconciliación Real de Caja y Garantías D1 - FlotaX', () => {
  it('1. anularMovimientoRepo rechaza cuando movimiento.localId !== localId sin alterar D1', async () => {
    let updateEjecutado = false;

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => ({
          where: () => ({
            limit: async () => [
              {
                id: 'mov-ajeno',
                localId: 'local-otro-patio',
                tipo: 'INGRESO',
                categoria: 'PAGO_ALQUILER',
                concepto: 'Pago ajeno',
                monto: 300_000,
                metodoPago: 'efectivo',
                cuentaId: 'cta-1',
                estado: 'CONFIRMADO',
                fechaMovimiento: new Date(),
                creadoEn: new Date(),
                actualizadoEn: new Date(),
              },
            ],
          }),
        }),
      }),
      update: () => {
        updateEjecutado = true;
        return {
          set: () => ({
            where: async () => {},
          }),
        };
      },
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await anularMovimientoRepo({
          movimientoId: 'mov-ajeno',
          motivo: 'Intento de anulación indebida',
          usuarioId: 'usr-operador-1',
          localId: 'local-mi-patio',
          db: mockDb,
        });
      },
      /local/i,
      'Debe rechazar la anulación si el movimiento pertenece a otro local'
    );

    assert.equal(updateEjecutado, false, 'No debe ejecutar UPDATE en D1 si el local no coincide');
  });

  it('2. Ante error lanzado por db en registrarMovimientoRepo o anularMovimientoRepo, lanza error explícito sin tragar en cacheCartera', async () => {
    const dbConFalloInsert = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [{ id: 'cta-1' }],
          }),
        }),
      }),
      insert: () => {
        throw new Error('D1_STORAGE_WRITE_FAILURE');
      },
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await registrarMovimientoRepo({
          localId: 'local-1',
          tipo: 'INGRESO',
          categoria: 'ABONO_CONTRATO',
          concepto: 'Abono con fallo D1',
          monto: 250_000,
          metodoPago: 'efectivo',
          cuentaId: 'cta-1',
          contratoId: 'CTR-ERROR-1',
          usuarioId: 'usr-1',
          db: dbConFalloInsert,
        });
      },
      /D1_STORAGE_WRITE_FAILURE/,
      'Debe propagar explícitamente el fallo de D1 en registrarMovimientoRepo'
    );

    const dbConFalloUpdate = {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [
              {
                id: 'mov-existente',
                localId: 'local-1',
                tipo: 'INGRESO',
                categoria: 'ABONO_CONTRATO',
                concepto: 'Abono para anular',
                monto: 200_000,
                metodoPago: 'efectivo',
                cuentaId: 'cta-1',
                estado: 'CONFIRMADO',
              },
            ],
          }),
        }),
      }),
      update: () => {
        throw new Error('D1_STORAGE_UPDATE_FAILURE');
      },
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await anularMovimientoRepo({
          movimientoId: 'mov-existente',
          motivo: 'Motivo válido de prueba',
          usuarioId: 'usr-1',
          localId: 'local-1',
          db: dbConFalloUpdate,
        });
      },
      /D1_STORAGE_UPDATE_FAILURE/,
      'Debe propagar explícitamente el fallo de D1 en anularMovimientoRepo'
    );
  });

  it('3. Invocar anularMovimientoAction o emitir REEMBOLSO_ALQUILER como ASESOR queda bloqueado por falta de CAJA_GASTOS_REGISTRAR', async () => {
    const contextoAsesor: ContextWithLocals & { cookies: { set: () => void } } = {
      locals: {
        usuario: {
          id: 'usr-asesor-1',
          nombre: 'Asesor Mostrador',
          email: 'asesor@flotax.co',
          rol: 'ASESOR',
          activo: true,
          esSuperAdmin: false,
          localActivo: {
            id: 'local-1',
            nombre: 'Patio Central',
            rol: 'ASESOR',
            permisosConcedidos: [],
            permisosRevocados: [],
          },
        },
      },
      cookies: {
        set: () => {},
      },
    };

    type ActionContext = Parameters<typeof anularMovimientoAction.handler>[1];

    // 3.1 anularMovimientoAction debe fallar con código FORBIDDEN para ASESOR
    await assert.rejects(
      async () => {
        await anularMovimientoAction.handler(
          {
            movimientoId: 'mov-1',
            motivo: 'Anulación solicitada por cliente',
          },
          contextoAsesor as unknown as ActionContext
        );
      },
      (err: unknown) => {
        const errorAction = err as { code?: string };
        assert.equal(errorAction.code, 'FORBIDDEN', 'El error debe ser FORBIDDEN');
        return true;
      }
    );

    // 3.2 registrarMovimientoAction con REEMBOLSO_ALQUILER debe fallar con FORBIDDEN para ASESOR
    await assert.rejects(
      async () => {
        await registrarMovimientoAction.handler(
          {
            tipo: 'EGRESO',
            categoria: 'REEMBOLSO_ALQUILER',
            concepto: 'Devolución anticipada de canon',
            monto: 150_000,
            metodoPago: 'efectivo',
            cuentaId: 'cta-1',
          },
          contextoAsesor as unknown as ActionContext
        );
      },
      (err: unknown) => {
        const errorAction = err as { code?: string };
        assert.equal(errorAction.code, 'FORBIDDEN', 'Debe exigir CAJA_GASTOS_REGISTRAR en reembolsos de alquiler');
        return true;
      }
    );
  });

  it('4. obtenerEstadoFinancieroCompleto utiliza montoEsperado real de vehiculos.depositoGarantia/contratos en vez de 1500000', async () => {
    const mockDb = {
      select: (fields?: Record<string, unknown>) => {
        const queryChain: Record<string, unknown> = {
          from: () => queryChain,
          where: () => queryChain,
          orderBy: () => queryChain,
          innerJoin: () => queryChain,
          leftJoin: () => queryChain,
          all: async () => [],
          then: (resolve?: (val: unknown) => unknown) => {
            // Si es la consulta de contratos que proyecta las columnas de contratosAlquiler + vehiculos:
            if (fields && fields.id && fields.vehiculoDepositoGarantia) {
              return Promise.resolve([
                {
                  id: 'ctr-101',
                  numeroContrato: 'CTR-101',
                  localId: 'local-1',
                  arrendatarioNombre: 'Cliente Fianza Baja',
                  arrendatarioTipoDocumento: 'CC',
                  arrendatarioNumeroDocumento: '10998877',
                  totalLiquidado: 600_000,
                  totalPagado: 200_000,
                  saldoPendiente: 400_000,
                  estadoPago: 'PARCIAL',
                  creadoEn: new Date(),
                  reservaVehiculoId: 'veh-moto-1',
                  reservaFechaInicio: '2026-11-01',
                  reservaFechaFin: '2026-11-05',
                  vehiculoMarca: 'Yamaha',
                  vehiculoModelo: 'NMAX',
                  vehiculoPlaca: 'ABC-12D',
                  vehiculoDepositoGarantia: 350_000, // Garantía real de moto (350.000, no 1.500.000)
                },
              ]).then(resolve);
            }
            return Promise.resolve([]).then(resolve);
          },
        };
        return queryChain;
      },
    } as unknown as AppDb;

    const res = await obtenerEstadoFinancieroCompleto({
      localId: 'local-1',
      periodo: 'ESTE_MES',
      db: mockDb,
    });

    assert.equal(res.carteraContratos.length, 1);
    assert.equal(
      res.carteraContratos[0]?.garantiaEsperada,
      350_000,
      'Debe leer vehiculos.depositoGarantia (350.000) en lugar del fallback 1.500.000'
    );
  });
});
