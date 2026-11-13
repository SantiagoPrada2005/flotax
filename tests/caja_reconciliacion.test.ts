import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  anularMovimientoRepo,
  registrarMovimientoRepo,
  registrarAbonoRepo,
  reconciliarSaldosContratoYReservaD1,
  obtenerEstadoFinancieroCompleto,
} from '../src/lib/caja/repositorio.ts';
import {
  anularMovimientoAction,
  registrarMovimientoAction,
} from '../src/actions/caja.ts';
import type { AppDb } from '../src/lib/db.ts';
import type { ContextWithLocals } from '../src/lib/auth/guard.ts';
import {
  movimientosCaja,
  cuentasFinancieras,
  contratosAlquiler,
  reservas,
  auditoriaFinanciera,
} from '../src/db/schema/index.ts';

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

  it('5. reconciliarSaldosContratoYReservaD1 ejecuta db.batch con consulta acotada y usuarioId valido sin fallback sistema', async () => {
    let batchLlamado = false;
    let batchOperacionesCount = 0;
    let auditoriaValues: Record<string, unknown> | null = null;
    let whereMovimientosInvocado = false;

    const mockContrato = {
      id: 'ctr-rec-1',
      numeroContrato: 'CTR-REC-01',
      reservaId: 'res-rec-1',
      localId: 'local-patio-1',
      clienteId: 'usr-cliente-real',
      totalLiquidado: 1_000_000,
      totalPagado: 200_000,
      saldoPendiente: 800_000,
      estadoPago: 'PARCIAL',
    };

    const mockReserva = {
      id: 'res-rec-1',
      codigo: 'FLX-REC-01',
      localId: 'local-patio-1',
      clienteId: 'usr-cliente-real',
      totalCotizado: 1_000_000,
      montoAbonoReportado: 200_000,
    };

    const mockMovimientos = [
      {
        id: 'mov-1',
        tipo: 'INGRESO',
        categoria: 'PAGO_ALQUILER',
        monto: 700_000,
        estado: 'CONFIRMADO',
        contratoId: 'CTR-REC-01',
      },
      {
        id: 'mov-2',
        tipo: 'EGRESO',
        categoria: 'REEMBOLSO_ALQUILER',
        monto: 100_000,
        estado: 'CONFIRMADO',
        contratoId: 'CTR-REC-01',
      },
    ];

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => ({
          where: () => {
            if (tabla === movimientosCaja) {
              whereMovimientosInvocado = true;
              return Promise.resolve(mockMovimientos);
            }
            return {
              limit: async () => {
                if (tabla === contratosAlquiler) return [mockContrato];
                if (tabla === reservas) return [mockReserva];
                return [];
              },
            };
          },
        }),
      }),
      update: (tabla: unknown) => ({
        set: (valores: Record<string, unknown>) => ({
          where: () => ({ tabla, valores }),
        }),
      }),
      insert: (tabla: unknown) => ({
        values: (valores: Record<string, unknown>) => {
          if (tabla === auditoriaFinanciera) {
            auditoriaValues = valores;
          }
          return { tabla, valores };
        },
      }),
      batch: async (ops: unknown[]) => {
        batchLlamado = true;
        batchOperacionesCount = ops.length;
      },
    } as unknown as AppDb;

    // Caso A: Con usuarioId explícito
    const res = await reconciliarSaldosContratoYReservaD1(
      mockDb,
      'local-patio-1',
      'CTR-REC-01',
      undefined,
      'usr-operador-real'
    );

    assert.equal(whereMovimientosInvocado, true, 'Debe consultar movimientosCaja con predicado push-down');
    assert.equal(batchLlamado, true, 'Debe ejecutar db.batch');
    assert.equal(batchOperacionesCount, 3, 'Debe sincronizar contratosAlquiler, reservas y registrar auditoriaFinanciera');
    assert.equal(res.totalPagadoNeto, 600_000, 'Total pagado neto debe ser 700.000 - 100.000 = 600.000');
    assert.equal(res.saldoPendiente, 400_000, 'Saldo pendiente debe ser 1.000.000 - 600.000 = 400.000');
    assert.equal(res.estadoPago, 'PARCIAL');

    assert.ok(auditoriaValues, 'Debe registrar auditoría financiera');
    assert.equal(
      auditoriaValues.usuarioId,
      'usr-operador-real',
      'Debe asignar el usuarioId del operador'
    );
    assert.notEqual(
      auditoriaValues.usuarioId,
      'sistema',
      'Jamás debe usar "sistema" por restricción FK contra user.id'
    );

    // Caso B: Sin usuarioId explícito, debe resolver clienteId del contrato/reserva y nunca 'sistema'
    auditoriaValues = null;
    await reconciliarSaldosContratoYReservaD1(
      mockDb,
      'local-patio-1',
      'CTR-REC-01',
      undefined,
      undefined
    );

    assert.ok(auditoriaValues, 'Debe registrar auditoría resolviendo clienteId');
    assert.equal(
      auditoriaValues.usuarioId,
      'usr-cliente-real',
      'Debe resolver clienteId existente en vez de "sistema"'
    );
  });

  it('6. registrarAbonoRepo rechaza reserva de otro local antes de insertar en movimientosCaja', async () => {
    let insertMovimientoLlamado = false;

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => ({
          where: () => ({
            limit: async () => {
              // Si consulta contratos: vacío (es una reserva sin contrato)
              if (tabla === contratosAlquiler) return [];
              // Si consulta reservas: retorna reserva de OTRO local
              if (tabla === reservas) {
                return [
                  {
                    id: 'res-otro-local-1',
                    codigo: 'FLX-OTRO-99',
                    localId: 'local-patio-ajeno',
                  },
                ];
              }
              // Cuentas financieras del local
              if (tabla === cuentasFinancieras) {
                return [{ id: 'cta-local-1', activo: true, tipo: 'CAJA_EFECTIVO' }];
              }
              return [];
            },
            all: async () => [
              { id: 'cta-local-1', activo: true, tipo: 'CAJA_EFECTIVO' },
            ],
            then: (resolve?: (val: unknown) => unknown) =>
              Promise.resolve([
                { id: 'cta-local-1', activo: true, tipo: 'CAJA_EFECTIVO' },
              ]).then(resolve),
          }),
        }),
      }),
      insert: (tabla: unknown) => {
        if (tabla === movimientosCaja) {
          insertMovimientoLlamado = true;
        }
        return {
          values: () => ({}),
        };
      },
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await registrarAbonoRepo({
          localId: 'local-patio-mio',
          contratoId: 'FLX-OTRO-99',
          monto: 150_000,
          metodoPago: 'efectivo',
          usuarioId: 'usr-operador-1',
          db: mockDb,
        });
      },
      /reserva pertenece a otro local/i,
      'Debe rechazar la reserva ajena antes de escribir en movimientosCaja'
    );

    assert.equal(
      insertMovimientoLlamado,
      false,
      'Jamás debe insertar en movimientosCaja si la reserva pertenece a otro local'
    );
  });

  it('7. registrarMovimientoRepo para local-A con cuentaId de local-B aplica filtro de localId y nunca asienta cuenta ajena', async () => {
    let cuentaInsertadaEnMovimiento: string | null = null;
    const queriesCuentasFinancieras: unknown[] = [];

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

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => ({
          where: (predicado?: unknown) => {
            if (tabla === cuentasFinancieras) {
              queriesCuentasFinancieras.push(predicado);
              const esConsultaLocalA = contieneEnSQL(predicado, 'local-A');
              const esConsultaCtaAjena = contieneEnSQL(predicado, 'cta-local-b');

              // Si consulta cuenta ajena pero con localId == local-A, no existe coincidencia (retorna vacío)
              if (esConsultaCtaAjena && esConsultaLocalA) {
                return {
                  limit: async () => [],
                };
              }
              // Si consulta cta-local-b sin exigir localId (la vulnerabilidad antes del fix):
              if (esConsultaCtaAjena && !esConsultaLocalA) {
                return {
                  limit: async () => [{ id: 'cta-local-b' }],
                };
              }
              // Si consulta la cuenta propia de local-A o el fallback de primera cuenta de local-A:
              if (esConsultaLocalA) {
                return {
                  limit: async () => [{ id: 'cta-local-a-default' }],
                };
              }
            }
            return {
              limit: async () => [],
            };
          },
        }),
      }),
      insert: (tabla: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (tabla === movimientosCaja) {
            cuentaInsertadaEnMovimiento = (vals.cuentaId as string) ?? null;
          }
          return {
            tabla,
            vals,
            onConflictDoNothing: async () => [],
            then: (resolve: (val: unknown) => unknown) => resolve({ tabla, vals }),
          };
        },
      }),
    } as unknown as AppDb;

    const res = await registrarMovimientoRepo({
      localId: 'local-A',
      tipo: 'INGRESO',
      categoria: 'ABONO_CONTRATO',
      concepto: 'Intento de asentar abono con cuenta de otro patio',
      monto: 200_000,
      metodoPago: 'efectivo',
      cuentaId: 'cta-local-b',
      usuarioId: 'usr-operador-1',
      db: mockDb,
    });

    // 1. Debe verificar que ctaCheck incluye localId: 'local-A'
    const primeraQuery = queriesCuentasFinancieras[0];
    assert.ok(
      contieneEnSQL(primeraQuery, 'local-A'),
      'La primera consulta ctaCheck a cuentasFinancieras debe estar aislada por localId'
    );

    // 2. El movimiento insertado en D1 debe usar el fallback de local-A, jamás la cuenta ajena de local-B
    assert.notEqual(
      cuentaInsertadaEnMovimiento,
      'cta-local-b',
      'Jamás debe insertar un movimiento con la cuenta ajena de otro local'
    );
    assert.equal(
      cuentaInsertadaEnMovimiento,
      'cta-local-a-default',
      'Debe asignar la cuenta propia del local-A'
    );

    // 3. El objeto retornado debe reflejar la cuenta efectiva
    assert.equal(
      res.cuentaId,
      'cta-local-a-default',
      'El movimiento retornado debe reflejar la cuentaId efectiva corregida'
    );
  });

  it('8. reconciliarSaldosContratoYReservaD1 retiene estadoPago EN_MORA ante pago parcial hasta cubrir el saldo total', async () => {
    let contratoActualizado: Record<string, unknown> | null = null;

    const mockContratoEnMora = {
      id: 'ctr-mora-1',
      numeroContrato: 'CTR-MORA-01',
      reservaId: 'res-mora-1',
      localId: 'local-1',
      clienteId: 'usr-cliente-1',
      totalLiquidado: 300_000,
      totalPagado: 0,
      saldoPendiente: 300_000,
      estadoPago: 'EN_MORA',
    };

    const mockReserva = {
      id: 'res-mora-1',
      codigo: 'FLX-MORA-01',
      localId: 'local-1',
      clienteId: 'usr-cliente-1',
      totalCotizado: 300_000,
      montoAbonoReportado: 0,
    };

    let movimientosSimulados: Array<{
      id: string;
      tipo: string;
      categoria: string;
      monto: number;
      estado: string;
      contratoId: string;
    }> = [];

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => ({
          where: () => {
            if (tabla === movimientosCaja) {
              return Promise.resolve(movimientosSimulados);
            }
            return {
              limit: async () => {
                if (tabla === contratosAlquiler) return [mockContratoEnMora];
                if (tabla === reservas) return [mockReserva];
                return [];
              },
            };
          },
        }),
      }),
      update: (tabla: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (tabla === contratosAlquiler) {
            contratoActualizado = vals;
          }
          return {
            where: () => ({ tabla, vals }),
          };
        },
      }),
      insert: () => ({
        values: () => ({}),
      }),
      batch: async () => {},
    } as unknown as AppDb;

    // Caso 8.1: Pago parcial de 100.000 sobre deuda de 300.000 -> Retiene EN_MORA
    movimientosSimulados = [
      {
        id: 'mov-parcial-1',
        tipo: 'INGRESO',
        categoria: 'PAGO_ALQUILER',
        monto: 100_000,
        estado: 'CONFIRMADO',
        contratoId: 'CTR-MORA-01',
      },
    ];

    const resParcial = await reconciliarSaldosContratoYReservaD1(
      mockDb,
      'local-1',
      'ctr-mora-1',
      undefined,
      'usr-operador-1'
    );

    assert.equal(
      resParcial.estadoPago,
      'EN_MORA',
      'Un contrato en mora debe permanecer EN_MORA si el pago es solo parcial'
    );
    assert.equal(resParcial.totalPagadoNeto, 100_000);
    assert.equal(resParcial.saldoPendiente, 200_000);
    assert.equal(
      contratoActualizado?.['estadoPago'],
      'EN_MORA',
      'El update en D1 debe persistir EN_MORA'
    );

    // Caso 8.2: Pago completo restante (+200.000, total = 300.000) -> Pasa a PAGADO
    movimientosSimulados.push({
      id: 'mov-parcial-2',
      tipo: 'INGRESO',
      categoria: 'PAGO_ALQUILER',
      monto: 200_000,
      estado: 'CONFIRMADO',
      contratoId: 'CTR-MORA-01',
    });

    const resCompleto = await reconciliarSaldosContratoYReservaD1(
      mockDb,
      'local-1',
      'ctr-mora-1',
      undefined,
      'usr-operador-1'
    );

    assert.equal(
      resCompleto.estadoPago,
      'PAGADO',
      'Una vez cubierto el totalLiquidado, pasa a PAGADO'
    );
    assert.equal(resCompleto.totalPagadoNeto, 300_000);
    assert.equal(resCompleto.saldoPendiente, 0);
    assert.equal(
      contratoActualizado?.['estadoPago'],
      'PAGADO',
      'El update en D1 debe persistir PAGADO'
    );
  });
});
