import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ErrorCicloAlquiler,
  crearReservaConValidaciones,
  vincularReservasHuerfanasPorCorreoD1,
  confirmarReservaD1,
  entregarVehiculoConContratoD1,
  guardarInspeccionR2D1,
  registrarOActualizarDocumentosClienteRapidoD1,
  type CrearReservaCicloInput,
  type ContextoActorCiclo,
} from '../src/lib/flota/ciclo-alquiler.ts';
import type { AppDb } from '../src/lib/db.ts';
import {
  reservas,
  contratosAlquiler,
  depositosGarantia,
  eventosAlquiler,
  inspeccionesPericiales,
  puntosInspeccionR2,
  vehiculos,
  politicasLocal,
  cuentasFinancieras,
  movimientosCaja,
  verificacionesIdentidad,
  documentosVehiculo,
} from '../src/db/schema/index.ts';

function buscarEnChunks(chunk: unknown, buscar: string): boolean {
  if (!chunk) return false;
  if (typeof chunk === 'string') return chunk.includes(buscar);
  if (typeof chunk === 'object') {
    if ('value' in chunk && typeof (chunk as { value: unknown }).value === 'string') {
      if ((chunk as { value: string }).value.includes(buscar)) return true;
    }
    if ('queryChunks' in chunk && Array.isArray((chunk as { queryChunks: unknown[] }).queryChunks)) {
      return (chunk as { queryChunks: unknown[] }).queryChunks.some((c) => buscarEnChunks(c, buscar));
    }
  }
  return false;
}

function crearMockQuery(datos: unknown[], joinedData?: unknown[]) {
  const resolvable = {
    limit: (n?: number) => Promise.resolve(n != null ? datos.slice(0, n) : datos),
    orderBy: () => resolvable,
    where: () => resolvable,
    leftJoin: () => crearMockQuery(joinedData ?? datos),
    then: (resolve: (v: unknown) => unknown) => resolve(datos),
  };
  return resolvable;
}

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

describe('Ciclo de Alquiler - Inicio, Vinculación OTP, Confirmación y Entrega R2', () => {
  const localId = 'loc-medellin-central';
  const vehiculoId = 'veh-mazda-cx30-01';

  it('1. crearReservaConValidaciones (web): recalcula cotización en D1 ignorando datos manipulados, permite sin documentos con token público y bloquea unidad FUERA_SERVICIO o SOAT vencido', async () => {
    const vehiculoValido = {
      id: vehiculoId,
      localId,
      marca: 'Mazda',
      modelo: 'CX-30',
      placa: 'FLX-123',
      precioDia: 180_000,
      depositoGarantia: 600_000,
      estado: 'DISPONIBLE',
      activo: true,
      categoria: 'SUV',
      kilometraje: 15_000,
    };

    const politicaValida = {
      id: 'pol-1',
      localId,
      abonoMinimoPct: 30,
      coberturaPericialPct: 10,
    };

    const cuentaValida = {
      id: 'cta-1',
      localId,
      tipo: 'CAJA_EFECTIVO',
      activo: true,
    };

    let reservaInsertada: Record<string, unknown> | null = null;

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === vehiculos) rows = [vehiculoValido];
          else if (table === politicasLocal) rows = [politicaValida];
          else if (table === cuentasFinancieras) rows = [cuentaValida];
          else if (table === documentosVehiculo) rows = [];
          else if (table === reservas) {
            return crearMockQuery(
              reservaInsertada ? [reservaInsertada] : [],
              reservaInsertada ? [{ reserva: reservaInsertada, vehiculo: vehiculoValido }] : []
            );
          }
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === reservas) reservaInsertada = vals;
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: async () => [],
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const inputWebManipulado: CrearReservaCicloInput = {
      vehiculoId,
      fechaInicio: '2026-12-01',
      fechaFin: '2026-12-03', // 3 días inclusivos
      precioDiaCotizado: 1_000, // manipulado por cliente
      totalCotizado: 3_000,      // manipulado por cliente
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Sede Poblado',
      modalidadPagoInicial: 'ABONO_30',
      metodoAbonoInicial: 'TRANSFERENCIA_PSE',
      montoAbonoReportado: 50_000,
      contactoNombre: 'Cliente Invitado',
      contactoTelefono: '3001234567',
      contactoCorreo: 'invitado@correo.com',
      contactoTipoDocumento: null,
      contactoNumeroDocumento: null,
      contactoCategoriaLicencia: null,
      ley1581Aceptada: true,
    };

    const contextoWeb: ContextoActorCiclo = {
      origen: 'CLIENTE_WEB',
      usuarioId: null,
    };

    const resWeb = await crearReservaConValidaciones(mockDb, inputWebManipulado, contextoWeb);

    assert.ok(resWeb.tokenAccesoPublico, 'Debe emitir tokenAccesoPublico para reserva sin sesión');
    assert.equal(resWeb.reserva.estado, 'PENDIENTE', 'Reserva web inicia en PENDIENTE');
    // 3 días * 180.000 = 540.000 subtotal. Cobertura 10% = 54.000. Total = 594.000
    assert.equal(resWeb.reserva.totalAlquiler, 594_000, 'Debe recalcular totalCotizado en el servidor ignorando manipulación');
    assert.equal(resWeb.advertenciasDocumentales.cliente.faltaDocumentoIdentidad, true, 'Debe detectar falta de documento de identidad');
    assert.equal(resWeb.advertenciasDocumentales.cliente.faltaLicencia, true, 'Debe detectar falta de licencia de conducción');

    // Bloqueo de vehículo FUERA_SERVICIO
    const mockDbFueraServicio = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === vehiculos) {
            rows = [{ ...vehiculoValido, estado: 'FUERA_SERVICIO' }];
          } else if (table === politicasLocal) rows = [politicaValida];
          return crearMockQuery(rows);
        },
      }),
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await crearReservaConValidaciones(mockDbFueraServicio, inputWebManipulado, contextoWeb);
      },
      (err: unknown) => err instanceof ErrorCicloAlquiler && (err.code === 'CONFLICT' || err.code === 'BAD_REQUEST'),
      'Debe rechazar con CONFLICT o BAD_REQUEST si el vehículo está FUERA_SERVICIO'
    );

    // Bloqueo de vehículo con SOAT vencido en flujo web
    const mockDbSoatVencido = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === vehiculos) rows = [vehiculoValido];
          else if (table === politicasLocal) rows = [politicaValida];
          else if (table === documentosVehiculo) {
            rows = [
              {
                id: 'doc-soat',
                vehiculoId,
                tipoDocumento: 'SOAT',
                fechaVencimiento: '2025-01-01', // Vencido respecto a 2026
                vigente: false,
              },
            ];
          }
          return crearMockQuery(rows);
        },
      }),
    } as unknown as AppDb;

    await assert.rejects(
      async () => {
        await crearReservaConValidaciones(mockDbSoatVencido, inputWebManipulado, contextoWeb);
      },
      (err: unknown) => err instanceof ErrorCicloAlquiler && err.code === 'CONFLICT',
      'Debe rechazar con CONFLICT la reserva web si el SOAT del vehículo está vencido'
    );
  });

  it('2. crearReservaConValidaciones (mostrador): clienteId null, datos mínimos sin ficticios, estado CONFIRMADA directo crea contrato BORRADOR y movimiento caja real sin atribuir clienteId al operador', async () => {
    let contratoCreado: Record<string, unknown> | null = null;
    let depositoCreado: Record<string, unknown> | null = null;
    let movimientoCreado: Record<string, unknown> | null = null;
    let reservaCreada: Record<string, unknown> | null = null;

    const vehiculoValido = {
      id: vehiculoId,
      localId,
      marca: 'Mazda',
      modelo: 'CX-30',
      placa: 'FLX-123',
      precioDia: 150_000,
      depositoGarantia: 500_000,
      estado: 'DISPONIBLE',
      activo: true,
      categoria: 'SUV',
      kilometraje: 15_000,
    };

    const politicaValida = {
      id: 'pol-1',
      localId,
      abonoMinimoPct: 30,
      coberturaPericialPct: 8,
    };

    const cuentaCaja = {
      id: 'cta-caja-1',
      localId,
      tipo: 'CAJA_EFECTIVO',
      activo: true,
    };

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === vehiculos) rows = [vehiculoValido];
          else if (table === politicasLocal) rows = [politicaValida];
          else if (table === cuentasFinancieras) rows = [cuentaCaja];
          else if (table === reservas) {
            return crearMockQuery(
              reservaCreada ? [reservaCreada] : [],
              reservaCreada ? [{ reserva: reservaCreada, vehiculo: vehiculoValido }] : []
            );
          }
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === reservas) reservaCreada = vals;
          if (table === contratosAlquiler) contratoCreado = vals;
          if (table === depositosGarantia) depositoCreado = vals;
          if (table === movimientosCaja) movimientoCreado = vals;
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: () => ({
        set: () => ({
          where: async () => [],
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const inputMostrador: CrearReservaCicloInput = {
      vehiculoId,
      localId,
      fechaInicio: '2026-11-20',
      fechaFin: '2026-11-21',
      estadoInicial: 'CONFIRMADA',
      contactoNombre: 'Carlos Walk-in',
      contactoTelefono: '3109876543',
      contactoCorreo: null, // Sin correo electrónico ficticio
      contactoTipoDocumento: null,
      contactoNumeroDocumento: null,
      contactoCategoriaLicencia: null,
      clienteId: null, // Sin cuenta ni atribuir al operador
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Patio Principal Medellín',
      modalidadPagoInicial: 'TOTAL_100',
      metodoAbonoInicial: 'EFECTIVO',
      ley1581Aceptada: true,
      pagoConfirmadoInmediato: {
        monto: 324_000,
        metodoPago: 'efectivo',
      },
    };

    const contextoAsesor: ContextoActorCiclo = {
      origen: 'MOSTRADOR_ADMIN',
      usuarioId: 'usr-asesor-patio-99',
      rol: 'ASESOR',
      localId,
    };

    const res = await crearReservaConValidaciones(mockDb, inputMostrador, contextoAsesor);

    assert.equal(res.reserva.estado, 'CONFIRMADA', 'Debe crearse directamente como CONFIRMADA');
    assert.equal(reservaCreada?.['clienteId'], null, 'No debe asignar clienteId al empleado operador');
    assert.equal(reservaCreada?.['creadoPorId'], 'usr-asesor-patio-99', 'creadoPorId debe rastrear al operador');
    assert.ok(contratoCreado, 'Debe crear contratos_alquiler en BORRADOR');
    assert.equal(contratoCreado?.['estadoContrato'], 'BORRADOR');
    assert.ok(depositoCreado, 'Debe aperturar depositos_garantia en PENDIENTE_RECIBIR');
    assert.equal(depositoCreado?.['estado'], 'PENDIENTE_RECIBIR');
    assert.ok(movimientoCreado, 'Debe registrar movimiento_caja de INGRESO CONFIRMADO');
    assert.equal(movimientoCreado?.['monto'], 324_000);
    assert.equal(movimientoCreado?.['estado'], 'CONFIRMADO');
  });

  it('3. vincularReservasHuerfanasPorCorreoD1: vincula reservas, contratos y garantías con clienteId null hacia el userId normalizando mayúsculas y espacios', async () => {
    let updateReservasVals: Record<string, unknown> | null = null;
    let updateContratosVals: Record<string, unknown> | null = null;
    let updateGarantiasVals: Record<string, unknown> | null = null;

    const mockReservasHuerfanas = [
      {
        id: 'res-huerfana-1',
        codigo: 'FLX-H1',
        localId: 'loc-1',
        clienteId: null,
        contactoCorreo: 'usuario@correo.com',
      },
      {
        id: 'res-huerfana-2',
        codigo: 'FLX-H2',
        localId: 'loc-1',
        clienteId: null,
        contactoCorreo: 'Usuario@Correo.COM',
      },
    ];

    const mockDb = {
      select: () => ({
        from: (table: unknown) => ({
          where: () => Promise.resolve(table === reservas ? mockReservasHuerfanas : []),
        }),
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (table === reservas) updateReservasVals = vals;
          if (table === contratosAlquiler) updateContratosVals = vals;
          if (table === depositosGarantia) updateGarantiasVals = vals;
          return {
            where: async () => [],
          };
        },
      }),
      insert: () => ({
        values: () => ({
          onConflictDoNothing: async () => [],
        }),
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const totalVinculadas = await vincularReservasHuerfanasPorCorreoD1(
      mockDb,
      'usr-nuevo-registrado',
      '  Usuario@Correo.COM '
    );

    assert.equal(totalVinculadas, 2, 'Debe vincular las 2 reservas coincidentes');
    assert.equal(updateReservasVals?.['clienteId'], 'usr-nuevo-registrado');
    assert.equal(updateGarantiasVals?.['clienteId'], 'usr-nuevo-registrado');
    assert.ok(
      updateGarantiasVals?.['actualizadoEn'] instanceof Date,
      'depositosGarantia debe incluir actualizadoEn con la fecha de vinculación'
    );
  });

  it('4. confirmarReservaD1: devuelve requiereAutorizacionSinDocs si no hay KYC/docs; con autorizarSinDocumentos pasa a CONFIRMADA, inserta evento AUTORIZACION_SIN_DOCS y crea BORRADOR', async () => {
    let eventoInsertado: Record<string, unknown> | null = null;
    let contratoCreado: Record<string, unknown> | null = null;
    let depositoCreado: Record<string, unknown> | null = null;
    let reservaActualizada: Record<string, unknown> | null = null;

    const vehiculoData = {
      id: vehiculoId,
      localId,
      marca: 'Mazda',
      modelo: 'CX-30',
      placa: 'FLX-123',
      precioDia: 150_000,
      depositoGarantia: 500_000,
      estado: 'DISPONIBLE',
      activo: true,
      categoria: 'SUV',
      kilometraje: 15_000,
    };

    const reservaPendiente = {
      id: 'res-pend-1',
      codigo: 'FLX-CONF-01',
      localId,
      vehiculoId,
      clienteId: 'usr-sin-kyc',
      fechaInicio: '2026-11-25',
      fechaFin: '2026-11-27',
      diasAlquiler: 3,
      precioDiaCotizado: 150_000,
      subtotalTarifaCotizado: 450_000,
      coberturaPericialCotizada: 36_000,
      totalCotizado: 486_000,
      montoAbonoReportado: 100_000,
      estado: 'PENDIENTE',
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Sede Poblado',
      contactoNombre: 'Cliente Sin KYC',
      contactoTelefono: '3009998877',
      contactoCorreo: 'sin-kyc@correo.com',
      contactoTipoDocumento: null,
      contactoNumeroDocumento: null,
      contactoCategoriaLicencia: null,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === reservas) {
            const data = reservaActualizada ? { ...reservaPendiente, ...reservaActualizada } : reservaPendiente;
            return {
              limit: (n?: number) => Promise.resolve(n != null ? [data].slice(0, n) : [data]),
              orderBy: () => crearMockQuery([data], [{ reserva: data, vehiculo: vehiculoData }]),
              where: (clause?: any) => {
                if (buscarEnChunks(clause, 'res-pend-1')) {
                  // verificarDisponibilidadVehiculo excluyendo res-pend-1: no hay otras reservas
                  return crearMockQuery([]);
                }
                return crearMockQuery([data], [{ reserva: data, vehiculo: vehiculoData }]);
              },
              leftJoin: () => crearMockQuery([{ reserva: data, vehiculo: vehiculoData }]),
              then: (resolve: (v: unknown) => unknown) => resolve([data]),
            };
          } else if (table === vehiculos) rows = [vehiculoData];
          else if (table === verificacionesIdentidad) rows = [];
          else if (table === documentosVehiculo) rows = [];
          else if (table === contratosAlquiler) rows = contratoCreado ? [contratoCreado] : [];
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === eventosAlquiler) eventoInsertado = vals;
          if (table === contratosAlquiler) contratoCreado = vals;
          if (table === depositosGarantia) depositoCreado = vals;
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (table === reservas) reservaActualizada = vals;
          return {
            where: async () => [],
          };
        },
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    // 4a. Intento sin autorizar sin documentos: debe responder requiereAutorizacionSinDocs = true sin mutar
    const resultadoSinAutorizacion = await confirmarReservaD1(mockDb, {
      codigo: 'FLX-CONF-01',
      localId,
      usuarioId: 'usr-admin-1',
      autorizarSinDocumentos: false,
    });

    assert.equal(resultadoSinAutorizacion.requiereAutorizacionSinDocs, true);
    assert.equal(reservaActualizada, null, 'No debe haber mutado reservas en D1');
    assert.equal(contratoCreado, null, 'No debe crear contratos_alquiler');

    // 4b. Confirmación con autorizarSinDocumentos: true
    const resultadoConAutorizacion = await confirmarReservaD1(mockDb, {
      codigo: 'FLX-CONF-01',
      localId,
      usuarioId: 'usr-admin-1',
      autorizarSinDocumentos: true,
      notaAutorizacion: 'Documentos físicos revisados en mostrador',
    });

    assert.equal(resultadoConAutorizacion.requiereAutorizacionSinDocs, false);
    if (!resultadoConAutorizacion.requiereAutorizacionSinDocs) {
      assert.equal(resultadoConAutorizacion.reserva.estado, 'CONFIRMADA', 'Pasa a CONFIRMADA, NO a EN_CURSO');
    }
    assert.equal(reservaActualizada?.['estado'], 'CONFIRMADA');
    assert.equal(reservaActualizada?.['autorizadoSinDocumentosPorId'], 'usr-admin-1');
    assert.ok(eventoInsertado, 'Debe registrar evento de auditoría');
    assert.equal(eventoInsertado?.['tipoEvento'], 'AUTORIZACION_SIN_DOCS');
    assert.ok(contratoCreado, 'Debe crear contrato en estado BORRADOR');
    assert.equal(contratoCreado?.['estadoContrato'], 'BORRADOR');
    assert.ok(depositoCreado, 'Debe crear depósito en estado PENDIENTE_RECIBIR');
    assert.equal(depositoCreado?.['estado'], 'PENDIENTE_RECIBIR');

    // 4c. Si el cliente tiene todos los documentos pero el vehículo tiene SOAT vencido,
    // confirmarReservaD1 debe advertirlo en advertencias.vehiculo.soatVencido y exigir autorización sin documentos.
    const reservaConClienteCompleto = {
      ...reservaPendiente,
      id: 'res-pend-soat-vencido',
      codigo: 'FLX-CONF-SOAT',
      contactoTipoDocumento: 'CC',
      contactoNumeroDocumento: '1020304050',
      contactoCategoriaLicencia: 'B1', // Compatible con SUV
    };

    let updateReservaSoat: Record<string, unknown> | null = null;
    let contratoSoatCreado: Record<string, unknown> | null = null;
    let eventoSoatCreado: Record<string, unknown> | null = null;

    const mockDbSoatVencidoConfirmacion = {
      session: new MockD1Session(),
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === reservas) {
            const data = updateReservaSoat ? { ...reservaConClienteCompleto, ...updateReservaSoat } : reservaConClienteCompleto;
            return {
              limit: (n?: number) => Promise.resolve(n != null ? [data].slice(0, n) : [data]),
              orderBy: () => crearMockQuery([data], [{ reserva: data, vehiculo: vehiculoData }]),
              where: (clause?: any) => {
                if (buscarEnChunks(clause, 'res-pend-soat-vencido')) {
                  return crearMockQuery([]);
                }
                return crearMockQuery([data], [{ reserva: data, vehiculo: vehiculoData }]);
              },
              leftJoin: () => crearMockQuery([{ reserva: data, vehiculo: vehiculoData }]),
              then: (resolve: (v: unknown) => unknown) => resolve([data]),
            };
          } else if (table === vehiculos) rows = [vehiculoData];
          else if (table === verificacionesIdentidad) rows = [{ estado: 'APROBADO' }];
          else if (table === documentosVehiculo) {
            rows = [
              {
                id: 'doc-soat-vencido',
                vehiculoId,
                tipoDocumento: 'SOAT',
                fechaVencimiento: '2025-01-01', // Vencido respecto a 2026-11-25
                vigente: false,
              },
            ];
          }
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === eventosAlquiler) eventoSoatCreado = vals;
          if (table === contratosAlquiler) contratoSoatCreado = vals;
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (table === reservas) updateReservaSoat = vals;
          return {
            where: async () => [],
          };
        },
      }),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const intentoSinAutorizarSoat = await confirmarReservaD1(mockDbSoatVencidoConfirmacion, {
      codigo: 'FLX-CONF-SOAT',
      localId,
      usuarioId: 'usr-admin-1',
      autorizarSinDocumentos: false,
    });

    assert.equal(intentoSinAutorizarSoat.requiereAutorizacionSinDocs, true, 'Debe requerir autorización por SOAT vehicular vencido');
    if (intentoSinAutorizarSoat.requiereAutorizacionSinDocs) {
      assert.equal(intentoSinAutorizarSoat.advertencias.vehiculo.soatVencido, true, 'Debe marcar soatVencido = true');
      assert.equal(intentoSinAutorizarSoat.advertencias.cliente.faltaDocumentoIdentidad, false, 'Cliente tiene CC');
      assert.equal(intentoSinAutorizarSoat.advertencias.cliente.faltaLicencia, false, 'Cliente tiene B1');
    }

    const confirmacionConAutorizacionSoat = await confirmarReservaD1(mockDbSoatVencidoConfirmacion, {
      codigo: 'FLX-CONF-SOAT',
      localId,
      usuarioId: 'usr-admin-1',
      autorizarSinDocumentos: true,
      notaAutorizacion: 'Vehículo autorizado con póliza comercial sustituta en mostrador',
    });

    assert.equal(confirmacionConAutorizacionSoat.requiereAutorizacionSinDocs, false);
    if (!confirmacionConAutorizacionSoat.requiereAutorizacionSinDocs) {
      assert.equal(confirmacionConAutorizacionSoat.reserva.estado, 'CONFIRMADA');
    }
    assert.equal(updateReservaSoat?.['estado'], 'CONFIRMADA');
    assert.ok(eventoSoatCreado, 'Debe registrar evento de autorización');
  });

  it('5. entregarVehiculoConContratoD1: pasa CONFIRMADA a EN_CURSO, contrato a VIGENTE, sella acta ENTREGA, asienta fianza y rechaza con CONFLICT entrega duplicada', async () => {
    let reservaActualizada: Record<string, unknown> | null = null;
    let contratoActualizado: Record<string, unknown> | null = null;
    let actaInspeccion: Record<string, unknown> | null = null;
    let movimientoFianza: Record<string, unknown> | null = null;

    const vehiculoData = {
      id: vehiculoId,
      localId,
      marca: 'Mazda',
      modelo: 'CX-30',
      placa: 'FLX-123',
      kilometraje: 15_000,
      depositoGarantia: 500_000,
      precioDia: 150_000,
      estado: 'RESERVADO',
      activo: true,
      categoria: 'SUV',
    };

    const contratoExistente = {
      id: 'ctr-001',
      numeroContrato: 'CTR-FLX-01',
      reservaId: 'res-conf-1',
      localId,
      vehiculoId,
      arrendatarioNombre: 'Cliente Autorizado',
      arrendatarioTelefono: '3001112233',
      totalLiquidado: 486_000,
      totalPagado: 100_000,
      saldoPendiente: 386_000,
      estadoPago: 'PARCIAL',
      estadoContrato: 'BORRADOR',
      medidorUsoEntrega: 15_000,
      nivelEnergiaEntregaPct: 100,
      fechaHoraDevolucionPactada: new Date(),
    };

    const cuentaCaja = {
      id: 'cta-caja-1',
      localId,
      tipo: 'CAJA_EFECTIVO',
      activo: true,
    };

    const reservaConfirmada = {
      id: 'res-conf-1',
      codigo: 'FLX-ENTREGA-01',
      localId,
      vehiculoId,
      estado: 'CONFIRMADA',
      fechaInicio: '2026-11-25',
      fechaFin: '2026-11-27',
      diasAlquiler: 3,
      precioDiaCotizado: 150_000,
      subtotalTarifaCotizado: 450_000,
      coberturaPericialCotizada: 36_000,
      totalCotizado: 486_000,
      montoAbonoReportado: 100_000,
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Sede Poblado',
      contactoNombre: 'Cliente Autorizado',
      contactoTelefono: '3001112233',
      contactoCorreo: 'autorizado@correo.com',
      autorizadoSinDocumentosPorId: 'usr-admin-1',
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === reservas) {
            const data = reservaActualizada ? { ...reservaConfirmada, ...reservaActualizada } : reservaConfirmada;
            return crearMockQuery([data], [{ reserva: data, vehiculo: vehiculoData }]);
          } else if (table === contratosAlquiler) {
            rows = [contratoActualizado ? { ...contratoExistente, ...contratoActualizado } : contratoExistente];
          } else if (table === vehiculos) rows = [vehiculoData];
          else if (table === cuentasFinancieras) rows = [cuentaCaja];
          else if (table === verificacionesIdentidad) rows = [];
          else if (table === documentosVehiculo) rows = [];
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === inspeccionesPericiales) actaInspeccion = vals;
          if (table === movimientosCaja) movimientoFianza = vals;
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (table === reservas) reservaActualizada = vals;
          if (table === contratosAlquiler) contratoActualizado = vals;
          return {
            where: async () => [],
          };
        },
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const resEntrega = await entregarVehiculoConContratoD1(mockDb, {
      codigo: 'FLX-ENTREGA-01',
      localId,
      usuarioId: 'usr-asesor-1',
      medidorUsoEntrega: 15_230,
      nivelEnergiaEntregaPct: 95,
      recibirGarantiaAhora: {
        monto: 500_000,
        metodoPago: 'efectivo',
        referencia: 'GAR-EFE-01',
      },
    });

    assert.equal(resEntrega.reserva.estado, 'EN_CURSO');
    assert.equal(reservaActualizada?.['estado'], 'EN_CURSO');
    assert.equal(contratoActualizado?.['estadoContrato'], 'VIGENTE');
    assert.ok(contratoActualizado?.['fechaHoraEntregaReal'], 'Debe estampar fechaHoraEntregaReal');
    assert.equal(contratoActualizado?.['medidorUsoEntrega'], 15_230);
    assert.ok(actaInspeccion, 'Debe crear acta de inspección ENTREGA');
    assert.equal(actaInspeccion?.['tipoActo'], 'ENTREGA');
    assert.ok(movimientoFianza, 'Debe asentar movimiento de caja por fianza en custodia');
    assert.equal(movimientoFianza?.['categoria'], 'DEPOSITO_GARANTIA');
    assert.equal(movimientoFianza?.['monto'], 500_000);

    // Segundo intento sobre reserva que ahora está EN_CURSO debe ser rechazado con CONFLICT
    await assert.rejects(
      async () => {
        await entregarVehiculoConContratoD1(mockDb, {
          codigo: 'FLX-ENTREGA-01',
          localId,
          usuarioId: 'usr-asesor-1',
          medidorUsoEntrega: 15_230,
        });
      },
      (err: unknown) => err instanceof ErrorCicloAlquiler && err.code === 'CONFLICT',
      'Debe rechazar con CONFLICT un intento de entrega sobre reserva que ya está EN_CURSO'
    );
  });

  it('6. guardarInspeccionR2D1 y registrarOActualizarDocumentosClienteRapidoD1 funcionan de forma determinista', async () => {
    let inspGuardada: Record<string, unknown> | null = null;
    let puntosGuardados: unknown[] = [];
    let docGuardado: Record<string, unknown> | null = null;

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === reservas) {
            rows = [
              {
                id: 'res-insp-1',
                codigo: 'FLX-INSP-1',
                localId,
                vehiculoId,
              },
            ];
          } else if (table === verificacionesIdentidad) {
            rows = [];
          }
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === inspeccionesPericiales) inspGuardada = vals;
          if (table === puntosInspeccionR2) puntosGuardados.push(vals);
          if (table === verificacionesIdentidad) docGuardado = vals;
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    const r2Res = await guardarInspeccionR2D1(mockDb, {
      reservaId: 'res-insp-1',
      inspectorId: 'usr-insp-1',
      tipoActo: 'ENTREGA',
      medidorUso: 15_500,
      nivelEnergiaPct: 100,
      puntosR2: [
        {
          zona: 'Capó',
          etiqueta: 'Rayón leve',
          dictamen: 'Novedad preexistente registrada en R2',
          estado: 'NOVEDAD',
          gravedad: 'LEVE',
        },
      ],
    });

    assert.ok(r2Res.inspeccionId);
    assert.ok(inspGuardada);
    assert.equal(puntosGuardados.length, 1);

    const kycRes = await registrarOActualizarDocumentosClienteRapidoD1(mockDb, {
      usuarioId: 'usr-cliente-rapido',
      tipoDocumento: 'CC',
      numeroDocumento: '123456789',
      licenciaNumero: 'LIC-9988',
      licenciaCategoria: 'B1',
      aprobarInmediato: true,
    });

    assert.equal(kycRes.ok, true);
    assert.equal(docGuardado?.['estado'], 'APROBADO');
  });

  it('7. preserva el receptor this al invocar db.batch emulando el comportamiento nativo de Cloudflare D1', async () => {
    let batchInvocadoConSession = false;
    const mockDbConSession = {
      session: {
        batch: async (ops: unknown[]) => {
          batchInvocadoConSession = true;
          return ops;
        },
      },
      batch: function (
        this: { session?: { batch: (ops: unknown[]) => Promise<unknown> } },
        ops: unknown[]
      ) {
        if (!this || !this.session) {
          throw new TypeError("Cannot read properties of undefined (reading 'session')");
        }
        return this.session.batch(ops);
      },
    };

    // Al extraer la función del receptor sin vincular, pierde this y lanza TypeError
    const funcionDesvinculada = mockDbConSession.batch;
    assert.throws(
      () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (funcionDesvinculada as any)([]);
      },
      {
        name: 'TypeError',
        message: /Cannot read properties of undefined \(reading 'session'\)/,
      }
    );

    // Al invocar como método o usando .call(db, ops), this es preservado correctamente
    await mockDbConSession.batch([]);
    assert.equal(batchInvocadoConSession, true);
  });

  it('8. entregarVehiculoConContratoD1 (Wizard Typeform): valida licencia compatible, persiste datos comprobados del cliente, checklist, puntos R2, cobro de saldo y fianza', async () => {
    let reservaUpdate: Record<string, unknown> | null = null;
    let contratoUpdate: Record<string, unknown> | null = null;
    let inspInsertada: Record<string, unknown> | null = null;
    const puntosInsertados: Record<string, unknown>[] = [];
    const movimientosInsertados: Record<string, unknown>[] = [];

    const motoData = {
      id: 'veh-moto-01',
      localId,
      marca: 'Yamaha',
      modelo: 'MT-03',
      placa: 'MTO-99A',
      kilometraje: 4_200,
      depositoGarantia: 400_000,
      precioDia: 110_000,
      estado: 'RESERVADO',
      activo: true,
      categoria: 'MOTO',
    };

    const reservaMotoConfirmada = {
      id: 'res-moto-conf',
      codigo: 'FLX-MOTO-01',
      localId,
      vehiculoId: 'veh-moto-01',
      clienteId: null, // Reserva invitado/mostrador sin cuenta
      estado: 'CONFIRMADA',
      fechaInicio: '2026-11-20',
      fechaFin: '2026-11-22',
      diasAlquiler: 3,
      precioDiaCotizado: 110_000,
      subtotalTarifaCotizado: 330_000,
      coberturaPericialCotizada: 26_400,
      totalCotizado: 356_400,
      montoAbonoReportado: 100_000,
      modalidadEntrega: 'PATIO_PRINCIPAL',
      sedeNombre: 'Patio Norte',
      contactoNombre: 'Conductor Inicial',
      contactoTelefono: '3001110000',
      contactoCorreo: null,
      contactoTipoDocumento: null,
      contactoNumeroDocumento: null,
      contactoCategoriaLicencia: null,
      ley1581Aceptada: true,
      creadoEn: new Date(),
      actualizadoEn: new Date(),
    };

    const contratoBorradorMoto = {
      id: 'ctr-moto-01',
      numeroContrato: 'CTR-MOTO-01',
      reservaId: 'res-moto-conf',
      localId,
      vehiculoId: 'veh-moto-01',
      totalLiquidado: 356_400,
      totalPagado: 100_000,
      saldoPendiente: 256_400,
      estadoPago: 'PARCIAL',
      estadoContrato: 'BORRADOR',
      medidorUsoEntrega: 4_200,
      nivelEnergiaEntregaPct: 100,
      fechaHoraDevolucionPactada: new Date(),
    };

    const cuentaBanco = {
      id: 'cta-banco-1',
      localId,
      tipo: 'BANCO',
      activo: true,
    };

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          let rows: unknown[] = [];
          if (table === reservas) {
            const data = reservaUpdate
              ? { ...reservaMotoConfirmada, ...reservaUpdate }
              : reservaMotoConfirmada;
            return crearMockQuery([data], [{ reserva: data, vehiculo: motoData }]);
          } else if (table === contratosAlquiler) {
            rows = [
              contratoUpdate
                ? { ...contratoBorradorMoto, ...contratoUpdate }
                : contratoBorradorMoto,
            ];
          } else if (table === vehiculos) rows = [motoData];
          else if (table === cuentasFinancieras) rows = [cuentaBanco];
          else if (table === documentosVehiculo) rows = [];
          return crearMockQuery(rows);
        },
      }),
      insert: (table: unknown) => ({
        values: (vals: Record<string, unknown>) => {
          if (table === inspeccionesPericiales) inspInsertada = vals;
          if (table === puntosInspeccionR2) puntosInsertados.push(vals);
          if (table === movimientosCaja) movimientosInsertados.push(vals);
          return {
            onConflictDoNothing: async () => [vals],
            then: (resolve: (v: unknown) => unknown) => resolve([vals]),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (table === reservas) reservaUpdate = vals;
          if (table === contratosAlquiler) contratoUpdate = vals;
          return {
            where: async () => [],
          };
        },
      }),
      session: new MockD1Session(),
      batch: crearMockBatch(),
    } as unknown as AppDb;

    // 8a. Licencia incompatible (B1 para MOTO) sin autorización excepcional debe rechazarse
    await assert.rejects(
      async () => {
        await entregarVehiculoConContratoD1(mockDb, {
          codigo: 'FLX-MOTO-01',
          localId,
          usuarioId: 'usr-asesor-1',
          medidorUsoEntrega: 4_250,
          conductorVerificado: {
            nombreCompleto: 'Andrea Torres',
            telefono: '3105558899',
            tipoDocumento: 'CC',
            numeroDocumento: '1020304050',
            licenciaCategoria: 'B1',
          },
        });
      },
      (err: unknown) => err instanceof ErrorCicloAlquiler && err.code === 'BAD_REQUEST',
      'Debe rechazar licencia B1 para una motocicleta si no hay autorización excepcional'
    );

    // 8b. Con licencia A2 compatible, datos comprobados, checklist, puntos R2 y cobros: persiste todo en D1
    const resEntrega = await entregarVehiculoConContratoD1(mockDb, {
      codigo: 'FLX-MOTO-01',
      localId,
      usuarioId: 'usr-asesor-1',
      medidorUsoEntrega: 4_250,
      nivelEnergiaEntregaPct: 100,
      conductorVerificado: {
        nombreCompleto: 'Andrea Torres',
        telefono: '3105558899',
        correo: 'andrea@correo.com',
        tipoDocumento: 'CC',
        numeroDocumento: '1020304050',
        ciudadExpedicion: 'Medellín',
        licenciaNumero: 'LIC-A2-1020',
        licenciaCategoria: 'A2',
        domicilio: 'Cra 43 # 10-20',
      },
      estadoGeneralEntrega: 'OPTIMO',
      observacionesEntrega: 'Moto entregada con 2 cascos certificados',
      respuestasChecklist: [
        {
          codigo: 'cascos-chaleco',
          nombre: 'Casco(s) certificados DOT/ECE y chaleco',
          estado: 'BIEN',
        },
      ],
      puntosR2: [
        {
          zona: 'Tanque',
          etiqueta: 'Verificado OK',
          dictamen: 'Pintura sin rayones',
          estado: 'VERIFICADO',
          coordX: '50%',
          coordY: '40%',
        },
      ],
      consentimientosContrato: {
        ley1581Aceptada: true,
        trasladoFotomultasAceptado: true,
        pagareBlancoFirmado: true,
      },
      cobrarSaldoAhora: {
        monto: 256_400,
        metodoPago: 'transferencia',
        referencia: 'BREB-9001',
      },
      recibirGarantiaAhora: {
        monto: 400_000,
        metodoPago: 'efectivo',
      },
    });

    assert.equal(resEntrega.reserva.estado, 'EN_CURSO');
    assert.equal(reservaUpdate?.['contactoNumeroDocumento'], '1020304050');
    assert.equal(reservaUpdate?.['contactoCategoriaLicencia'], 'A2');
    assert.equal(contratoUpdate?.['estadoContrato'], 'VIGENTE');
    assert.equal(contratoUpdate?.['arrendatarioCiudadExpedicion'], 'Medellín');
    assert.equal(contratoUpdate?.['arrendatarioLicenciaNumero'], 'LIC-A2-1020');
    assert.equal(contratoUpdate?.['arrendatarioDomicilio'], 'Cra 43 # 10-20');
    assert.equal(contratoUpdate?.['estadoPago'], 'PAGADO');
    assert.equal(contratoUpdate?.['saldoPendiente'], 0);
    assert.equal(contratoUpdate?.['pagareBlancoFirmado'], true);
    assert.equal(inspInsertada?.['estadoGeneral'], 'OPTIMO');
    assert.equal(
      (inspInsertada?.['respuestasChecklist'] as unknown[])?.length,
      1,
      'Debe persistir el checklist de entrega en el acta pericial'
    );
    assert.equal(puntosInsertados.length, 1, 'Debe persistir los puntos R2 de salida');
    assert.equal(movimientosInsertados.length, 2, 'Debe registrar saldo y depósito de garantía en caja');
  });

  it('9. registrarOActualizarDocumentosClienteRapidoD1 actualiza reserva y contrato incluso para reservas sin cuenta (clienteId null)', async () => {
    let reservaAct: Record<string, unknown> | null = null;
    let contratoAct: Record<string, unknown> | null = null;

    const mockDb = {
      select: () => ({
        from: (table: unknown) => {
          if (table === reservas) {
            return crearMockQuery([
              {
                id: 'res-invitado-1',
                codigo: 'FLX-INV-1',
                clienteId: null,
              },
            ]);
          }
          return crearMockQuery([]);
        },
      }),
      update: (table: unknown) => ({
        set: (vals: Record<string, unknown>) => {
          if (table === reservas) reservaAct = vals;
          if (table === contratosAlquiler) contratoAct = vals;
          return { where: async () => [] };
        },
      }),
    } as unknown as AppDb;

    const res = await registrarOActualizarDocumentosClienteRapidoD1(mockDb, {
      codigo: 'FLX-INV-1',
      tipoDocumento: 'CE',
      numeroDocumento: '99887766',
      licenciaNumero: 'LIC-99887766',
      licenciaCategoria: 'B1',
    });

    assert.equal(res.ok, true);
    assert.equal(reservaAct?.['contactoTipoDocumento'], 'CE');
    assert.equal(reservaAct?.['contactoNumeroDocumento'], '99887766');
    assert.equal(reservaAct?.['contactoCategoriaLicencia'], 'B1');
    assert.equal(contratoAct?.['arrendatarioNumeroDocumento'], '99887766');
    assert.equal(contratoAct?.['arrendatarioLicenciaNumero'], 'LIC-99887766');
  });
});
