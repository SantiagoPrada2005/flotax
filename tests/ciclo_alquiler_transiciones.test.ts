import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ErrorCicloAlquiler,
  pausarAlquilerD1,
  reanudarAlquilerD1,
  prorrogarAlquilerD1,
  devolverYCerrarAlquilerD1,
  registrarEvaluacionEntregaClienteD1,
  rechazarReservaD1,
  cancelarReservaD1,
  anularAlquilerD1,
  reabrirReservaD1,
  type ContextoActorCiclo,
} from '../src/lib/flota/ciclo-alquiler.ts';
import { registrarEntregaClienteConEvaluacion, type ReservaClienteItem } from '../src/lib/flota/reservas-cliente.ts';
import type { AppDb } from '../src/lib/db.ts';
import {
  reservas,
  contratosAlquiler,
  depositosGarantia,
  eventosAlquiler,
  inspeccionesPericiales,
  mantenimientosVehiculo,
  evaluacionesEntregaCliente,
  vehiculos,
  movimientosCaja,
  cuentasFinancieras,
  auditoriaFinanciera,
} from '../src/db/schema/index.ts';

class MockD1Session {
  readonly active = true;
}

function crearMockBatch() {
  return function (this: { session?: unknown }, ops: unknown[]) {
    if (!this || !this.session) {
      throw new TypeError("Cannot read properties of undefined (reading 'session')");
    }
    return Promise.resolve(ops);
  };
}

function buscarEnChunks(chunk: unknown, buscar: string): boolean {
  if (!chunk) return false;
  if (typeof chunk === 'string') return chunk.includes(buscar);
  if (Array.isArray(chunk)) return chunk.some((c) => buscarEnChunks(c, buscar));
  if (typeof chunk === 'object') {
    if ('value' in chunk) {
      const v = (chunk as { value: unknown }).value;
      if (typeof v === 'string') return v.includes(buscar);
      if (Array.isArray(v)) return v.some((c) => buscarEnChunks(c, buscar));
      if (typeof v === 'object') return buscarEnChunks(v, buscar);
    }
    if ('queryChunks' in chunk && Array.isArray((chunk as { queryChunks: unknown[] }).queryChunks)) {
      return (chunk as { queryChunks: unknown[] }).queryChunks.some((c) => buscarEnChunks(c, buscar));
    }
  }
  return false;
}

function filtrarReservas(store: Record<string, unknown>[], clause?: unknown): Record<string, unknown>[] {
  if (!clause) return store;
  // Detección de query de disponibilidad: busca estados 'CONFIRMADA' o 'EN_CURSO'
  const esCheckDisponibilidad = buscarEnChunks(clause, 'CONFIRMADA') || buscarEnChunks(clause, 'EN_CURSO');
  if (esCheckDisponibilidad) {
    return store.filter((r) => {
      const id = String(r['id'] ?? '');
      // Si la cláusula contiene el ID de esta reserva, está siendo excluida con ne(reservas.id, excludeId)
      if (buscarEnChunks(clause, id)) return false;
      const estado = String(r['estado'] ?? '');
      return ['CONFIRMADA', 'PENDIENTE', 'EN_CURSO', 'PAUSADA'].includes(estado);
    });
  }
  // Búsqueda puntual por id o código
  return store.filter((r) => {
    const id = String(r['id'] ?? '');
    const codigo = String(r['codigo'] ?? '');
    return buscarEnChunks(clause, id) || (codigo && buscarEnChunks(clause, codigo));
  });
}

function filtrarContratos(store: Record<string, unknown>[], clause?: unknown): Record<string, unknown>[] {
  if (!clause) return store;
  return store.filter((c) => {
    const id = String(c['id'] ?? '');
    const reservaId = String(c['reservaId'] ?? '');
    const num = String(c['numeroContrato'] ?? '');
    return (
      (id && buscarEnChunks(clause, id)) ||
      (reservaId && buscarEnChunks(clause, reservaId)) ||
      (num && buscarEnChunks(clause, num))
    );
  });
}

function crearMockQuery(datos: unknown[]) {
  const resolvable = {
    limit: (n?: number) => Promise.resolve(n != null ? datos.slice(0, n) : datos),
    orderBy: () => resolvable,
    where: () => resolvable,
    then: (resolve: (v: unknown) => unknown) => resolve(datos),
  };
  return resolvable;
}

describe('Ciclo de Alquiler - Transiciones, Cierre, Evaluación y Anulación', () => {
  const localId = 'loc-medellin-central';
  const vehiculoId = 'veh-cx30-01';

  it('1. Pausa y Reanudación: ADMIN pausa EN_CURSO +3 días, preserva fechas originales y $0 delta; detecta CONFLICT si colisiona; ASESOR recibe FORBIDDEN; reanudación reactiva contrato y unidad', async () => {
    const vehiculoBase = {
      id: vehiculoId,
      localId,
      marca: 'Mazda',
      modelo: 'CX-30',
      placa: 'FLX-123',
      precioDia: 150_000,
      depositoGarantia: 500_000,
      estado: 'RESERVADO',
      activo: true,
      categoria: 'SUV',
      kilometraje: 20_000,
    };

    const reservaEnCurso = {
      id: 'res-pausa-01',
      codigo: 'FLX-777001',
      localId,
      vehiculoId,
      clienteId: 'usr-cliente-01',
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-05',
      fechaFinOriginal: '2026-12-05',
      diasAlquiler: 5,
      estado: 'EN_CURSO',
      precioDiaCotizado: 150_000,
      totalCotizado: 750_000,
      tokenAccesoPublico: 'token-pausa-123',
    };

    const contratoVigente = {
      id: 'ctr-pausa-01',
      numeroContrato: 'CTR-777001',
      reservaId: 'res-pausa-01',
      localId,
      vehiculoId,
      clienteId: 'usr-cliente-01',
      estadoContrato: 'VIGENTE',
      canonDiarioPactado: 150_000,
      subtotalCanon: 750_000,
      totalLiquidado: 750_000,
      totalPagado: 750_000,
      saldoPendiente: 0,
      estadoPago: 'PAGADO',
      fechaHoraDevolucionPactada: new Date('2026-12-05T20:00:00Z'),
    };

    let reservasStore: Record<string, unknown>[] = [{ ...reservaEnCurso }];
    let contratosStore: Record<string, unknown>[] = [{ ...contratoVigente }];
    let vehiculosStore: Record<string, unknown>[] = [{ ...vehiculoBase }];
    let eventosStore: Record<string, unknown>[] = [];
    let batchCalledWithSession = false;

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) return crearMockQuery(filtrarReservas(reservasStore, clause));
            if (table === contratosAlquiler) return crearMockQuery(filtrarContratos(contratosStore, clause));
            if (table === vehiculos) return crearMockQuery(vehiculosStore);
            if (table === eventosAlquiler) return crearMockQuery(eventosStore);
            if (table === mantenimientosVehiculo) return crearMockQuery([]);
            return crearMockQuery([]);
          },
          limit: (n?: number) => {
            let data: unknown[] = [];
            if (table === reservas) data = reservasStore;
            else if (table === contratosAlquiler) data = contratosStore;
            else if (table === vehiculos) data = vehiculosStore;
            return Promise.resolve(n != null ? data.slice(0, n) : data);
          },
          then: (resolve: (v: unknown) => unknown) => resolve(reservasStore),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === eventosAlquiler) eventosStore.push(vals);
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: async (whereClause?: unknown) => {
            if (table === reservas) {
              reservasStore = reservasStore.map((r) => {
                if (!whereClause || buscarEnChunks(whereClause, String(r['id']))) {
                  return { ...r, ...vals };
                }
                return r;
              });
            }
            if (table === contratosAlquiler) {
              contratosStore = contratosStore.map((c) => {
                if (!whereClause || buscarEnChunks(whereClause, String(c['id']))) {
                  return { ...c, ...vals };
                }
                return c;
              });
            }
            if (table === vehiculos) {
              vehiculosStore = vehiculosStore.map((v) => ({ ...v, ...vals }));
            }
            if (table === eventosAlquiler) {
              eventosStore = eventosStore.map((e) => ({ ...e, ...vals }));
            }
            return [];
          },
        }),
      }),
      session: new MockD1Session(),
      batch: function (this: { session?: unknown }, ops: unknown[]) {
        if (!this || !this.session) {
          throw new TypeError("Cannot read properties of undefined (reading 'session')");
        }
        batchCalledWithSession = true;
        return Promise.resolve(ops);
      },
    } as unknown as AppDb;

    // A. ASESOR recibe FORBIDDEN al intentar pausar
    const actorAsesor: ContextoActorCiclo = { rol: 'ASESOR', usuarioId: 'usr-asesor-1', localId };
    await assert.rejects(
      async () => {
        await pausarAlquilerD1(mockDb, {
          reservaId: reservaEnCurso.id,
          diasPausa: 3,
          actor: actorAsesor,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // B. ADMIN pausa con éxito +3 días
    const actorAdmin: ContextoActorCiclo = { rol: 'ADMIN', usuarioId: 'usr-admin-1', localId };
    const resPausa = await pausarAlquilerD1(mockDb, {
      reservaId: reservaEnCurso.id,
      diasPausa: 3,
      motivo: 'Cliente solicita pausa por viaje de trabajo',
      actor: actorAdmin,
    });

    assert.equal(resPausa.reserva.estado, 'PAUSADA');
    assert.equal(resPausa.reserva.fechaFin, '2026-12-08'); // 2026-12-05 + 3 días
    assert.equal(resPausa.reserva.fechaFinOriginal, '2026-12-05');
    assert.equal(resPausa.reserva.totalCotizado, 750_000); // $0 delta
    assert.equal(resPausa.contrato?.estadoContrato, 'PAUSADO');
    assert.equal(resPausa.contrato?.totalLiquidado, 750_000); // $0 delta
    assert.equal(batchCalledWithSession, true);

    const eventoPausa = eventosStore.find((e) => e['tipoEvento'] === 'PAUSA');
    assert.ok(eventoPausa);
    assert.equal(eventoPausa['diasDelta'], 3);
    assert.equal(eventoPausa['modalidadTarifa'], 'SIN_COSTO');
    assert.equal(eventoPausa['montoDelta'], 0);
    assert.equal(eventoPausa['activo'], true);

    // C. Conflicto de disponibilidad genera CONFLICT sin mutar D1
    const mockDbConConflicto = {
      ...mockDb,
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) {
              const conflictoStore = [
                { ...reservasStore[0]!, estado: 'EN_CURSO' },
                {
                  id: 'res-otra-02',
                  codigo: 'FLX-999002',
                  vehiculoId,
                  fechaInicio: '2026-12-06',
                  fechaFin: '2026-12-10',
                  estado: 'CONFIRMADA',
                },
              ];
              return crearMockQuery(filtrarReservas(conflictoStore, clause));
            }
            if (table === vehiculos) return crearMockQuery(vehiculosStore);
            return crearMockQuery([]);
          },
          limit: () => Promise.resolve([{ ...reservasStore[0]!, estado: 'EN_CURSO' }]),
          then: (r: (v: unknown) => unknown) => r([{ ...reservasStore[0]!, estado: 'EN_CURSO' }]),
        }),
      }),
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await pausarAlquilerD1(mockDbConConflicto, {
          reservaId: reservaEnCurso.id,
          diasPausa: 3,
          actor: actorAdmin,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'CONFLICT');
        return true;
      }
    );

    // D. Reanudación por ADMIN
    const resReanudar = await reanudarAlquilerD1(mockDb, {
      reservaId: reservaEnCurso.id,
      motivo: 'Cliente regresa a la ciudad y reanuda servicio',
      actor: actorAdmin,
    });

    assert.equal(resReanudar.reserva.estado, 'EN_CURSO');
    assert.equal(resReanudar.contrato?.estadoContrato, 'VIGENTE');
    const eventoReanudacion = eventosStore.find((e) => e['tipoEvento'] === 'REANUDACION');
    assert.ok(eventoReanudacion);
  });

  it('2. Prórroga en 3 modalidades + RBAC: ASESOR puede TARIFA_ESTANDAR pero recibe FORBIDDEN en MISMO_PRECIO y PRECIO_PACTADO; ADMIN ejecuta las 3 y detecta CONFLICT', async () => {
    const vehiculo = {
      id: vehiculoId,
      localId,
      precioDia: 120_000,
      estado: 'RESERVADO',
      activo: true,
    };

    const reserva = {
      id: 'res-pror-01',
      codigo: 'FLX-888001',
      localId,
      vehiculoId,
      fechaInicio: '2026-12-10',
      fechaFin: '2026-12-12',
      fechaFinOriginal: '2026-12-12',
      diasAlquiler: 3,
      precioDiaCotizado: 120_000,
      totalCotizado: 360_000,
      estado: 'EN_CURSO',
    };

    const contrato = {
      id: 'ctr-pror-01',
      numeroContrato: 'CTR-888001',
      reservaId: 'res-pror-01',
      localId,
      vehiculoId,
      canonDiarioPactado: 120_000,
      subtotalCanon: 360_000,
      cargosOtrosLocal: 0,
      totalLiquidado: 360_000,
      totalPagado: 360_000,
      saldoPendiente: 0,
      estadoPago: 'PAGADO',
      estadoContrato: 'VIGENTE',
    };

    let reservasStore: Record<string, unknown>[] = [{ ...reserva }];
    let contratosStore: Record<string, unknown>[] = [{ ...contrato }];
    let eventosStore: Record<string, unknown>[] = [];

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) return crearMockQuery(filtrarReservas(reservasStore, clause));
            if (table === contratosAlquiler) return crearMockQuery(filtrarContratos(contratosStore, clause));
            if (table === vehiculos) return crearMockQuery([vehiculo]);
            if (table === eventosAlquiler) return crearMockQuery(eventosStore);
            if (table === mantenimientosVehiculo) return crearMockQuery([]);
            return crearMockQuery([]);
          },
          limit: (n?: number) => {
            let data: unknown[] = [];
            if (table === reservas) data = reservasStore;
            else if (table === contratosAlquiler) data = contratosStore;
            else if (table === vehiculos) data = [vehiculo];
            return Promise.resolve(n != null ? data.slice(0, n) : data);
          },
          then: (r: (v: unknown) => unknown) => r(reservasStore),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === eventosAlquiler) eventosStore.push(vals);
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: async (whereClause?: unknown) => {
            if (table === reservas) {
              reservasStore = reservasStore.map((r) => {
                if (!whereClause || buscarEnChunks(whereClause, String(r['id']))) {
                  return { ...r, ...vals };
                }
                return r;
              });
            }
            if (table === contratosAlquiler) {
              contratosStore = contratosStore.map((c) => {
                if (!whereClause || buscarEnChunks(whereClause, String(c['id']))) {
                  return { ...c, ...vals };
                }
                return c;
              });
            }
            return [];
          },
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const actorAsesor: ContextoActorCiclo = { rol: 'ASESOR', usuarioId: 'usr-asesor-1', localId };
    const actorAdmin: ContextoActorCiclo = { rol: 'ADMIN', usuarioId: 'usr-admin-1', localId };

    // A. ASESOR recibe FORBIDDEN en MISMO_PRECIO y PRECIO_PACTADO
    await assert.rejects(
      async () => {
        await prorrogarAlquilerD1(mockDb, {
          reservaId: reserva.id,
          diasExtra: 2,
          modalidadTarifa: 'MISMO_PRECIO',
          actor: actorAsesor,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await prorrogarAlquilerD1(mockDb, {
          reservaId: reserva.id,
          diasExtra: 2,
          modalidadTarifa: 'PRECIO_PACTADO',
          montoAcordado: 100_000,
          actor: actorAsesor,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // B. ASESOR ejecuta exitosamente TARIFA_ESTANDAR: 2 días * 120_000 = 240_000
    const resProrrEstandar = await prorrogarAlquilerD1(mockDb, {
      reservaId: reserva.id,
      diasExtra: 2,
      modalidadTarifa: 'TARIFA_ESTANDAR',
      actor: actorAsesor,
    });

    assert.equal(resProrrEstandar.reserva.fechaFin, '2026-12-14');
    assert.equal(resProrrEstandar.reserva.diasAlquiler, 5);
    assert.equal(resProrrEstandar.contrato?.totalLiquidado, 600_000); // 360k + 240k
    assert.equal(resProrrEstandar.contrato?.saldoPendiente, 240_000);
    assert.equal(resProrrEstandar.contrato?.estadoPago, 'PARCIAL'); // PAGADO -> PARCIAL

    // C. ADMIN ejecuta MISMO_PRECIO (+1 día, $0 delta)
    const resProrrMismoPrecio = await prorrogarAlquilerD1(mockDb, {
      reservaId: reserva.id,
      diasExtra: 1,
      modalidadTarifa: 'MISMO_PRECIO',
      actor: actorAdmin,
    });
    assert.equal(resProrrMismoPrecio.reserva.fechaFin, '2026-12-15');
    assert.equal(resProrrMismoPrecio.contrato?.totalLiquidado, 600_000); // No aumenta monto

    // D. ADMIN ejecuta PRECIO_PACTADO (+2 días por $150_000 pactado)
    const resProrrPactado = await prorrogarAlquilerD1(mockDb, {
      reservaId: reserva.id,
      diasExtra: 2,
      modalidadTarifa: 'PRECIO_PACTADO',
      montoAcordado: 150_000,
      actor: actorAdmin,
    });
    assert.equal(resProrrPactado.reserva.fechaFin, '2026-12-17');
    assert.equal(resProrrPactado.contrato?.totalLiquidado, 750_000); // 600k + 150k
  });

  it('3. Devolución anticipada (día 2 de 3): copia explícita de local, acorta fechaFin manteniendo original, RBAC en ajustes/sobrecostos, control de excedente y orden taller', async () => {
    const vehiculo = {
      id: vehiculoId,
      localId,
      estado: 'RESERVADO',
      activo: true,
      kilometraje: 10_000,
    };

    // Alquiler 3 días (2026-12-01 al 2026-12-03) pagado 300_000
    const reserva = {
      id: 'res-cierre-01',
      codigo: 'FLX-999001',
      localId,
      vehiculoId,
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-03',
      fechaFinOriginal: '2026-12-03',
      diasAlquiler: 3,
      precioDiaCotizado: 100_000,
      totalCotizado: 300_000,
      estado: 'EN_CURSO',
    };

    const contrato = {
      id: 'ctr-cierre-01',
      numeroContrato: 'CTR-999001',
      reservaId: 'res-cierre-01',
      localId,
      vehiculoId,
      cargosOtrosLocal: 0,
      ajusteDescuentoLocal: 0,
      totalLiquidado: 300_000,
      totalPagado: 300_000,
      saldoPendiente: 0,
      estadoPago: 'PAGADO',
      estadoContrato: 'VIGENTE',
    };

    let reservasStore: Record<string, unknown>[] = [{ ...reserva }];
    let contratosStore: Record<string, unknown>[] = [{ ...contrato }];
    let vehiculosStore: Record<string, unknown>[] = [{ ...vehiculo }];
    let mantenimientosStore: Record<string, unknown>[] = [];
    let inspeccionesStore: Record<string, unknown>[] = [];
    let movimientosStore: Record<string, unknown>[] = [];

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) return crearMockQuery(filtrarReservas(reservasStore, clause));
            if (table === contratosAlquiler) return crearMockQuery(filtrarContratos(contratosStore, clause));
            if (table === vehiculos) return crearMockQuery(vehiculosStore);
            if (table === mantenimientosVehiculo) return crearMockQuery(mantenimientosStore);
            if (table === cuentasFinancieras) return crearMockQuery([{ id: 'cta-caja-1', tipo: 'CAJA_EFECTIVO', activo: true }]);
            return crearMockQuery([]);
          },
          limit: (n?: number) => {
            let data: unknown[] = [];
            if (table === reservas) data = reservasStore;
            else if (table === contratosAlquiler) data = contratosStore;
            else if (table === vehiculos) data = vehiculosStore;
            return Promise.resolve(n != null ? data.slice(0, n) : data);
          },
          then: (r: (v: unknown) => unknown) => r(reservasStore),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === mantenimientosVehiculo) mantenimientosStore.push(vals);
          if (table === inspeccionesPericiales) inspeccionesStore.push(vals);
          if (table === movimientosCaja) movimientosStore.push(vals);
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: async (whereClause?: unknown) => {
            if (table === reservas) {
              reservasStore = reservasStore.map((r) => {
                if (!whereClause || buscarEnChunks(whereClause, String(r['id']))) {
                  return { ...r, ...vals };
                }
                return r;
              });
            }
            if (table === contratosAlquiler) {
              contratosStore = contratosStore.map((c) => {
                if (!whereClause || buscarEnChunks(whereClause, String(c['id']))) {
                  return { ...c, ...vals };
                }
                return c;
              });
            }
            if (table === vehiculos) {
              vehiculosStore = vehiculosStore.map((v) => ({ ...v, ...vals }));
            }
            return [];
          },
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const actorAsesor: ContextoActorCiclo = { rol: 'ASESOR', usuarioId: 'usr-asesor-1', localId };
    const actorAdmin: ContextoActorCiclo = { rol: 'ADMIN', usuarioId: 'usr-admin-1', localId };

    // A. ASESOR recibe FORBIDDEN si intenta aplicar sobrecosto o descuento
    await assert.rejects(
      async () => {
        await devolverYCerrarAlquilerD1(mockDb, {
          reservaId: reserva.id,
          fechaDevolucionReal: '2026-12-02',
          medidorUsoRetorno: 10_150,
          sobrecostoLocal: 50_000,
          motivoSobrecosto: 'Lavado especial',
          actor: actorAsesor,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // B. Regla de excedente: si descuento deja totalLiquidado < totalPagado, exige resolucionExcedente y rechaza saldo negativo
    await assert.rejects(
      async () => {
        await devolverYCerrarAlquilerD1(mockDb, {
          reservaId: reserva.id,
          fechaDevolucionReal: '2026-12-02',
          medidorUsoRetorno: 10_150,
          descuentoAjusteLocal: 100_000, // deja totalLiquidado = 200_000 < totalPagado = 300_000
          motivoDescuento: 'Día no usado devuelto al cliente',
          actor: actorAdmin, // sin resolucionExcedente: 'REEMBOLSO_ALQUILER'
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'BAD_REQUEST');
        return true;
      }
    );

    // C. ADMIN ejecuta devolución anticipada con descuento + reembolso de excedente en caja + orden de taller
    const resDevolucion = await devolverYCerrarAlquilerD1(mockDb, {
      reservaId: reserva.id,
      fechaDevolucionReal: '2026-12-02', // devuelto día 2 de 3
      medidorUsoRetorno: 10_150,
      descuentoAjusteLocal: 100_000,
      motivoDescuento: 'Día no usado devuelto',
      resolucionExcedente: 'REEMBOLSO_ALQUILER',
      cuentaReembolsoId: 'cta-caja-1',
      requiereMantenimiento: true,
      tipoMantenimiento: 'CORRECTIVO_NOVEDAD',
      etiquetaMantenimiento: 'Rayón lateral en puerta derecha',
      fechaFinEstimadaMantenimiento: '2026-12-04',
      actor: actorAdmin,
    });

    // Validaciones
    assert.equal(resDevolucion.reserva.estado, 'COMPLETADA');
    assert.equal(resDevolucion.reserva.fechaFin, '2026-12-02'); // Acortada
    assert.equal(resDevolucion.reserva.fechaFinOriginal, '2026-12-03'); // Preservada
    assert.equal(resDevolucion.reserva.fechaDevolucionReal, '2026-12-02');
    assert.ok(resDevolucion.mensajeLegal.includes('Las condiciones, ajustes y sobrecostos de devolución los establece el local.'));
    assert.equal(resDevolucion.contrato?.totalLiquidado, 200_000);
    assert.equal(resDevolucion.contrato?.saldoPendiente, 0); // No saldo negativo!
    assert.equal(resDevolucion.contrato?.estadoContrato, 'CERRADO_PAZ_Y_SALVO');

    // Mantenimiento creado y unidad en taller
    assert.equal(mantenimientosStore.length, 1);
    assert.equal(mantenimientosStore[0]?.['estado'], 'EN_TALLER');
    assert.equal(mantenimientosStore[0]?.['tipo'], 'CORRECTIVO_NOVEDAD');
    assert.equal(mantenimientosStore[0]?.['reservaOrigenId'], reserva.id);

    // Egreso de caja por REEMBOLSO_ALQUILER
    const egresoReembolso = movimientosStore.find((m) => m['categoria'] === 'REEMBOLSO_ALQUILER');
    assert.ok(egresoReembolso);
    assert.equal(egresoReembolso['monto'], 100_000);
    assert.equal(egresoReembolso['tipo'], 'EGRESO');
  });

  it('4. Evaluación cliente sin cierre: registra en evaluaciones_entrega_cliente validando token/propiedad y NUNCA cambia estado de reserva ni vehículo a COMPLETADA', async () => {
    const reservaActiva = {
      id: 'res-eval-01',
      codigo: 'FLX-555001',
      localId,
      vehiculoId,
      clienteId: 'usr-cliente-55',
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-03',
      estado: 'EN_CURSO',
      tokenAccesoPublico: 'token-secreto-eval-999',
    };

    let evaluacionesStore: Record<string, unknown>[] = [];
    let reservaActual = { ...reservaActiva };

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) return crearMockQuery(filtrarReservas([reservaActual], clause));
            if (table === evaluacionesEntregaCliente) return crearMockQuery(evaluacionesStore);
            return crearMockQuery([]);
          },
          limit: () => Promise.resolve([reservaActual]),
          then: (r: (v: unknown) => unknown) => r([reservaActual]),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === evaluacionesEntregaCliente) evaluacionesStore.push(vals);
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: () => ({
        set: (vals: Record<string, unknown>) => ({
          where: async (whereClause?: unknown) => {
            if (!whereClause || buscarEnChunks(whereClause, String(reservaActual.id))) {
              reservaActual = { ...reservaActual, ...vals };
            }
            return [];
          },
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    // A. Token inválido produce FORBIDDEN
    await assert.rejects(
      async () => {
        await registrarEvaluacionEntregaClienteD1(mockDb, {
          reservaId: reservaActiva.id,
          tokenAccesoPublico: 'token-falso',
          calificacionGeneral: 'SOBRESALIENTE',
          puntajeNumerico: 5,
          aspectosDestacados: ['Limpieza', 'Puntualidad'],
          desempenoVehiculo: 'IMPECABLE',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // B. Con token válido o clienteId correcto guarda evaluación
    const resEval = await registrarEvaluacionEntregaClienteD1(mockDb, {
      reservaId: reservaActiva.id,
      tokenAccesoPublico: 'token-secreto-eval-999',
      calificacionGeneral: 'SOBRESALIENTE',
      puntajeNumerico: 5,
      aspectosDestacados: ['Excelente atención'],
      desempenoVehiculo: 'IMPECABLE',
      comentarioOpcional: 'El auto estaba en perfecto estado',
    });

    assert.equal(resEval.ok, true);
    assert.equal(evaluacionesStore.length, 1);
    assert.equal(evaluacionesStore[0]?.['calificacionGeneral'], 'SOBRESALIENTE');

    // C. INVARIANTE: reservas.estado y vehiculos.estado PERMANECEN INTACTOS (NO COMPLETADA)
    assert.equal(reservaActual.estado, 'EN_CURSO');

    // D. Verificar también que el helper local registrarEntregaClienteConEvaluacion no muta a COMPLETADA
    const mockReservaItem: ReservaClienteItem = {
      codigo: 'FLX-555001',
      vehiculoId,
      vehiculo: {
        id: vehiculoId,
        marca: 'Mazda',
        modelo: 'CX-30',
        linea: 'Grand Touring',
        transmision: 'AUTOMATICA',
        carroceria: 'SUV',
        capacidadPasajeros: 5,
        precioDia: 150_000,
        depositoGarantia: 500_000,
        estado: 'RESERVADO',
        imagenUrl: '',
        color: 'Gris',
        placa: 'FLX-123',
        nivelCombustiblePct: 100,
        kilometraje: 20_000,
        calificacionPromedio: 4.9,
      },
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-03',
      diasAlquiler: 3,
      totalAlquiler: 450_000,
      montoAbonoMinimo: 135_000,
      montoReportado: 135_000,
      saldoPendiente: 315_000,
      estado: 'EN_CURSO',
      estadoGarantia: 'CUSTODIA_ACTIVA',
      kilometrajeEntrega: 20_000,
      nivelCombustibleEntrega: 100,
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Sede Poblado',
      creadoEn: '2026-12-01T08:00:00Z',
      conductor: {
        nombreCompleto: 'Juan Pérez',
        telefono: '3001234567',
        ley1581Aceptada: true,
      },
    };

    const evaluacionLocal = {
      calificacionGeneral: 'SOBRESALIENTE' as const,
      puntajeNumerico: 5 as const,
      aspectosDestacados: ['Excelente'],
      desempenoVehiculo: 'IMPECABLE' as const,
      checklist: {
        cabinaSinObjetos: true,
        telemetriaVerificada: true,
        llavesEntregadas: true,
        combustibleNivel: 'MISMO_NIVEL' as const,
      },
      completadaEnISO: '2026-12-03T18:00:00Z',
    };

    const resLocal = registrarEntregaClienteConEvaluacion(mockReservaItem, evaluacionLocal, null, '2026-12-03');
    assert.notEqual(resLocal.estado, 'COMPLETADA');
    assert.equal(resLocal.estado, 'EN_CURSO');
  });

  it('5. Cancelación, anulación ADMIN y reapertura: invitado cancela PENDIENTE con token; ASESOR bloqueado en CONFIRMADA; ADMIN anula contrato con resolución caja; reapertura valida disponibilidad', async () => {
    const vehiculo = {
      id: vehiculoId,
      localId,
      estado: 'RESERVADO',
      activo: true,
    };

    const reservaPendiente = {
      id: 'res-canc-01',
      codigo: 'FLX-333001',
      localId,
      vehiculoId,
      clienteId: null,
      fechaInicio: '2026-12-20',
      fechaFin: '2026-12-22',
      estado: 'PENDIENTE',
      tokenAccesoPublico: 'token-invitado-correct-123',
      montoAbonoReportado: 0,
    };

    const reservaConfirmada = {
      id: 'res-canc-02',
      codigo: 'FLX-333002',
      localId,
      vehiculoId,
      clienteId: 'usr-cli-1',
      fechaInicio: '2026-12-20',
      fechaFin: '2026-12-22',
      estado: 'CONFIRMADA',
      montoAbonoReportado: 100_000,
    };

    const contratoConfirmado = {
      id: 'ctr-canc-02',
      numeroContrato: 'CTR-333002',
      reservaId: 'res-canc-02',
      localId,
      vehiculoId,
      totalLiquidado: 300_000,
      totalPagado: 100_000,
      saldoPendiente: 200_000,
      estadoContrato: 'BORRADOR',
    };

    let reservasStore: Record<string, unknown>[] = [{ ...reservaPendiente }, { ...reservaConfirmada }];
    let contratosStore: Record<string, unknown>[] = [{ ...contratoConfirmado }];
    let eventosStore: Record<string, unknown>[] = [];
    let movimientosStore: Record<string, unknown>[] = [];

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) return crearMockQuery(filtrarReservas(reservasStore, clause));
            if (table === contratosAlquiler) return crearMockQuery(filtrarContratos(contratosStore, clause));
            if (table === vehiculos) return crearMockQuery([vehiculo]);
            if (table === mantenimientosVehiculo) return crearMockQuery([]);
            if (table === cuentasFinancieras) return crearMockQuery([{ id: 'cta-1', tipo: 'CAJA_EFECTIVO', activo: true }]);
            return crearMockQuery([]);
          },
          limit: (n?: number) => {
            let data: unknown[] = [];
            if (table === reservas) data = reservasStore;
            else if (table === contratosAlquiler) data = contratosStore;
            return Promise.resolve(n != null ? data.slice(0, n) : data);
          },
          then: (r: (v: unknown) => unknown) => r(reservasStore),
        }),
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === eventosAlquiler) eventosStore.push(vals);
          if (table === movimientosCaja) movimientosStore.push(vals);
          if (table === auditoriaFinanciera) return { then: (r: (v: unknown) => unknown) => r([vals]) };
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => ({
          where: async (whereClause?: unknown) => {
            if (table === reservas) {
              reservasStore = reservasStore.map((r) => {
                if (!whereClause || buscarEnChunks(whereClause, String(r['id']))) {
                  return { ...r, ...vals };
                }
                return r;
              });
            }
            if (table === contratosAlquiler) {
              contratosStore = contratosStore.map((c) => {
                if (!whereClause || buscarEnChunks(whereClause, String(c['id']))) {
                  return { ...c, ...vals };
                }
                return c;
              });
            }
            return [];
          },
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    // A. Token incorrecto de invitado recibe FORBIDDEN
    await assert.rejects(
      async () => {
        await cancelarReservaD1(mockDb, {
          reservaId: reservaPendiente.id,
          tokenAccesoPublico: 'token-equivocado',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // B. Token correcto de invitado cancela PENDIENTE sin pagos
    const resCancelaInvitado = await cancelarReservaD1(mockDb, {
      reservaId: reservaPendiente.id,
      tokenAccesoPublico: 'token-invitado-correct-123',
      motivoCancelacion: 'No podré viajar',
    });
    assert.equal(resCancelaInvitado.reserva.estado, 'CANCELADA');

    // C. ASESOR recibe FORBIDDEN al intentar cancelar reserva CONFIRMADA o anular contrato
    const actorAsesor: ContextoActorCiclo = { rol: 'ASESOR', usuarioId: 'usr-asesor-1', localId };
    await assert.rejects(
      async () => {
        await cancelarReservaD1(mockDb, {
          reservaId: reservaConfirmada.id,
          actor: actorAsesor,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    await assert.rejects(
      async () => {
        await anularAlquilerD1(mockDb, {
          reservaId: reservaConfirmada.id,
          motivoAnulacion: 'Error en asignación',
          actor: actorAsesor,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'FORBIDDEN');
        return true;
      }
    );

    // D. ADMIN ejecuta anularAlquilerD1 con resolución REEMBOLSAR_EGRESO
    const actorAdmin: ContextoActorCiclo = { rol: 'ADMIN', usuarioId: 'usr-admin-1', localId };
    const resAnulacion = await anularAlquilerD1(mockDb, {
      reservaId: reservaConfirmada.id,
      motivoAnulacion: 'Acuerdo de anulación total con el cliente',
      resolucionFinanciera: 'REEMBOLSAR_EGRESO',
      cuentaReembolsoId: 'cta-1',
      actor: actorAdmin,
    });
    assert.equal(resAnulacion.reserva.estado, 'CANCELADA');
    assert.equal(resAnulacion.contrato?.estadoContrato, 'ANULADO');
    assert.equal(resAnulacion.contrato?.saldoPendiente, 0);

    // E. Reapertura de reserva CANCELADA
    // E1. Si el vehículo fue tomado por otra reserva, reabrirReservaD1 falla con CONFLICT
    const mockDbReaperturaConflicto = {
      ...mockDb,
      select: () => ({
        from: (table: unknown) => ({
          where: (clause?: unknown) => {
            if (table === reservas) {
              const conflictoStore = [
                { ...reservaConfirmada, estado: 'CANCELADA' },
                {
                  id: 'res-conflicto-99',
                  codigo: 'FLX-999999',
                  vehiculoId,
                  fechaInicio: '2026-12-20',
                  fechaFin: '2026-12-22',
                  estado: 'EN_CURSO',
                },
              ];
              return crearMockQuery(filtrarReservas(conflictoStore, clause));
            }
            if (table === vehiculos) return crearMockQuery([vehiculo]);
            return crearMockQuery([]);
          },
          limit: () => Promise.resolve(reservasStore),
          then: (r: (v: unknown) => unknown) => r(reservasStore),
        }),
      }),
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await reabrirReservaD1(mockDbReaperturaConflicto, {
          reservaId: reservaConfirmada.id,
          actor: actorAdmin,
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal(err.code, 'CONFLICT');
        return true;
      }
    );

    // E2. Si el vehículo está disponible, reabre a PENDIENTE
    const resReapertura = await reabrirReservaD1(mockDb, {
      reservaId: reservaConfirmada.id,
      actor: actorAdmin,
    });
    assert.equal(resReapertura.reserva.estado, 'PENDIENTE');
  });
});
