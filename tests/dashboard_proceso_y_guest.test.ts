import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapearReservaAAlquilerEnProceso,
  type MapearReservaAAlquilerEnProcesoParams,
} from '@/lib/dashboard/alquileres-proceso';
import {
  validarAccesoReservaLectura,
  esRutaDetalleConTokenPublico,
} from '@/lib/auth/acceso-reserva';
import {
  calcularCapacidadesOperacionAlquiler,
} from '@/lib/auth/capacidades-alquiler';
import { registrarCobroWaybillD1 } from '@/lib/flota/repositorio-reservas';
import { ErrorCicloAlquiler } from '@/lib/flota/errores';
import { cambiarEstadoReservaAction } from '@/actions/reservas';
import type { AppDb } from '@/lib/db';
import type { ContextWithLocals } from '@/lib/auth/guard';

function crearReservaMock(overrides: Partial<MapearReservaAAlquilerEnProcesoParams['reserva']> = {}): MapearReservaAAlquilerEnProcesoParams['reserva'] {
  return {
    id: 'res-test-1',
    codigo: 'FLX-123456',
    localId: 'local-patio-1',
    vehiculoId: 'veh-1',
    clienteId: 'usr-cliente-1',
    fechaInicio: '2026-11-15',
    fechaFin: '2026-11-18',
    fechaFinOriginal: '2026-11-18',
    fechaDevolucionReal: null,
    diasAlquiler: 3,
    estado: 'PENDIENTE',
    modalidadEntrega: 'PATIO_PRINCIPAL',
    direccionEntrega: null,
    sedeNombre: 'Sede Poblado',
    tokenAccesoPublico: 'tok-pub-1234567890abcdef',
    precioDiaCotizado: 150000,
    subtotalTarifaCotizado: 450000,
    coberturaPericialCotizada: 45000,
    totalCotizado: 495000,
    modalidadPagoInicial: 'ABONO_30',
    metodoAbonoInicial: 'TRANSFERENCIA_PSE',
    montoAbonoReportado: 150000,
    referenciaAbonoInicial: 'REF-001',
    contactoNombre: 'Carlos Santana',
    contactoTipoDocumento: 'CC',
    contactoNumeroDocumento: '1098765432',
    contactoCategoriaLicencia: 'B1',
    contactoTelefono: '+573001234567',
    contactoCorreo: 'carlos@ejemplo.com',
    ley1581Aceptada: true,
    autorizadoSinDocumentosPorId: null,
    notaAutorizacionDocumentos: null,
    motivoCancelacion: null,
    canceladoPorId: null,
    canceladoEn: null,
    motivoRechazo: null,
    creadoPorId: 'usr-cliente-1',
    confirmadoPorId: null,
    creadoEn: new Date('2026-11-12T10:00:00Z'),
    actualizadoEn: new Date('2026-11-12T10:00:00Z'),
    ...overrides,
  };
}

describe('mapearReservaAAlquilerEnProceso', () => {
  test('mapea estado PAUSADA a tarjeta PAUSADO con motivo legible', () => {
    const reserva = crearReservaMock({ estado: 'PAUSADA' });
    const item = mapearReservaAAlquilerEnProceso({
      reserva,
      vehiculo: { placa: 'ABC-123', imagenUrl: '/vehiculo.png' },
      contrato: {
        numeroContrato: 'CTR-001',
        estadoContrato: 'PAUSADO',
        totalPagado: 495000,
        firmaArrendatarioR2Key: 'firma.png',
        fechaHoraEntregaReal: new Date('2026-11-15T09:00:00Z'),
        actualizadoEn: new Date('2026-11-16T12:00:00Z'),
      },
      inspeccionEntrega: {
        iniciadaEn: new Date('2026-11-15T08:30:00Z'),
        finalizadaEn: new Date('2026-11-15T08:50:00Z'),
      },
      verificacion: { estado: 'APROBADO' },
    });

    assert.equal(item.estado, 'PAUSADO');
    assert.match(item.etapaActualResumen ?? '', /pausad/i);
    // En pausa, los 4 pasos deben reflejar avance real (KYC, abono, peritaje completados, paso 4 en pausa)
    assert.equal(item.pasosProceso?.[0]?.estado, 'COMPLETADO');
    assert.equal(item.pasosProceso?.[1]?.estado, 'COMPLETADO');
    assert.equal(item.pasosProceso?.[2]?.estado, 'COMPLETADO');
    assert.equal(item.pasosProceso?.[3]?.estado, 'PAUSADO');
  });

  test('mapea estado CONFIRMADA y EN_CURSO a EN_PROCESO', () => {
    const reservaConfirmada = crearReservaMock({ estado: 'CONFIRMADA' });
    const itemConfirmada = mapearReservaAAlquilerEnProceso({
      reserva: reservaConfirmada,
      vehiculo: { placa: 'ABC-123', imagenUrl: '/vehiculo.png' },
      contrato: null,
      inspeccionEntrega: null,
      verificacion: { estado: 'APROBADO' },
    });
    assert.equal(itemConfirmada.estado, 'EN_PROCESO');

    const reservaEnCurso = crearReservaMock({ estado: 'EN_CURSO' });
    const itemEnCurso = mapearReservaAAlquilerEnProceso({
      reserva: reservaEnCurso,
      vehiculo: { placa: 'ABC-123', imagenUrl: '/vehiculo.png' },
      contrato: {
        numeroContrato: 'CTR-001',
        estadoContrato: 'VIGENTE',
        totalPagado: 495000,
        firmaArrendatarioR2Key: 'firma.png',
        fechaHoraEntregaReal: new Date('2026-11-15T09:00:00Z'),
        actualizadoEn: new Date('2026-11-15T09:00:00Z'),
      },
      inspeccionEntrega: {
        iniciadaEn: new Date('2026-11-15T08:30:00Z'),
        finalizadaEn: new Date('2026-11-15T08:50:00Z'),
      },
      verificacion: { estado: 'APROBADO' },
    });
    assert.equal(itemEnCurso.estado, 'EN_PROCESO');
  });

  test('mapea estado COMPLETADA a COMPLETADO con completadoEn derivado de fechaHoraDevolucionReal', () => {
    const fechaCierre = new Date('2026-11-18T16:45:00Z');
    const reservaCompletada = crearReservaMock({
      estado: 'COMPLETADA',
      fechaDevolucionReal: '2026-11-18',
      actualizadoEn: fechaCierre,
    });
    const item = mapearReservaAAlquilerEnProceso({
      reserva: reservaCompletada,
      vehiculo: { placa: 'ABC-123', imagenUrl: '/vehiculo.png' },
      contrato: {
        numeroContrato: 'CTR-001',
        estadoContrato: 'CERRADO_PAZ_Y_SALVO',
        totalPagado: 495000,
        firmaArrendatarioR2Key: 'firma.png',
        fechaHoraEntregaReal: new Date('2026-11-15T09:00:00Z'),
        actualizadoEn: fechaCierre,
      },
      inspeccionEntrega: {
        iniciadaEn: new Date('2026-11-15T08:30:00Z'),
        finalizadaEn: new Date('2026-11-15T08:50:00Z'),
      },
      verificacion: { estado: 'APROBADO' },
    });

    assert.equal(item.estado, 'COMPLETADO');
    assert.ok(item.completadoEn);
    assert.equal(new Date(item.completadoEn).getTime(), fechaCierre.getTime());
    // Todos los 4 pasos completados
    assert.equal(item.pasosProceso?.[0]?.estado, 'COMPLETADO');
    assert.equal(item.pasosProceso?.[1]?.estado, 'COMPLETADO');
    assert.equal(item.pasosProceso?.[2]?.estado, 'COMPLETADO');
    assert.equal(item.pasosProceso?.[3]?.estado, 'COMPLETADO');
  });
});

describe('validarAccesoReservaLectura', () => {
  const reserva = {
    localId: 'local-patio-norte',
    clienteId: 'cliente-123',
    tokenAccesoPublico: 'token-secreto-valido-abc',
  };

  test('permite acceso al colaborador del mismo localId', () => {
    const usuarioStaffMismoLocal = {
      id: 'staff-1',
      localActivo: { id: 'local-patio-norte', rol: 'ASESOR' as const },
    };
    assert.equal(validarAccesoReservaLectura(reserva, usuarioStaffMismoLocal), true);
  });

  test('permite acceso al superadmin sin importar local', () => {
    const superAdmin = {
      id: 'super-1',
      esSuperAdmin: true,
      localActivo: { id: 'otro-local', rol: 'SUPER_ADMIN' as const },
    };
    assert.equal(validarAccesoReservaLectura(reserva, superAdmin), true);
  });

  test('rechaza a colaborador de otro localId que no es el cliente', () => {
    const usuarioStaffOtroLocal = {
      id: 'staff-2',
      localActivo: { id: 'local-patio-sur', rol: 'ADMIN' as const },
    };
    assert.equal(validarAccesoReservaLectura(reserva, usuarioStaffOtroLocal), false);
  });

  test('permite acceso al cliente dueño de la reserva', () => {
    const clienteDuenio = {
      id: 'cliente-123',
      localActivo: null,
    };
    assert.equal(validarAccesoReservaLectura(reserva, clienteDuenio), true);
  });

  test('rechaza a otro cliente autenticado distinto', () => {
    const clienteAjeno = {
      id: 'cliente-999',
      localActivo: null,
    };
    assert.equal(validarAccesoReservaLectura(reserva, clienteAjeno), false);
  });

  test('permite acceso a invitado sin sesión solo con tokenQuery exacto no vacío', () => {
    assert.equal(validarAccesoReservaLectura(reserva, null, 'token-secreto-valido-abc'), true);
    assert.equal(validarAccesoReservaLectura(reserva, undefined, 'token-secreto-valido-abc'), true);
  });

  test('rechaza token erróneo, vacío o con espacios', () => {
    assert.equal(validarAccesoReservaLectura(reserva, null, 'token-incorrecto'), false);
    assert.equal(validarAccesoReservaLectura(reserva, null, ''), false);
    assert.equal(validarAccesoReservaLectura(reserva, null, '   '), false);
    assert.equal(validarAccesoReservaLectura(reserva, null, undefined), false);
  });

  test('rechaza token si la reserva no tiene tokenAccesoPublico configurado', () => {
    const reservaSinToken = {
      localId: 'local-patio-norte',
      clienteId: 'cliente-123',
      tokenAccesoPublico: null,
    };
    assert.equal(validarAccesoReservaLectura(reservaSinToken, null, 'token-secreto-valido-abc'), false);
  });
});

describe('esRutaDetalleConTokenPublico', () => {
  test('permite /reservas/<codigo> con ?token=... no vacío', () => {
    const params = new URLSearchParams('token=tok123');
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988', params), true);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988/', params), true);
  });

  test('permite /reservas/<codigo>/entrega con ?token=... no vacío', () => {
    const params = new URLSearchParams('token=tok123');
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988/entrega', params), true);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988/entrega/', params), true);
  });

  test('bloquea rutas raíz o sin código', () => {
    const params = new URLSearchParams('token=tok123');
    assert.equal(esRutaDetalleConTokenPublico('/reservas', params), false);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/', params), false);
  });

  test('bloquea /reservas/<codigo> cuando el token está vacío o falta', () => {
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988', new URLSearchParams()), false);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988', new URLSearchParams('token=')), false);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988', new URLSearchParams('token=   ')), false);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988', null), false);
  });

  test('bloquea /admin/* y otras rutas protegidas aunque lleven token', () => {
    const params = new URLSearchParams('token=tok123');
    assert.equal(esRutaDetalleConTokenPublico('/admin/reservas/FLX-9988', params), false);
    assert.equal(esRutaDetalleConTokenPublico('/perfil', params), false);
    assert.equal(esRutaDetalleConTokenPublico('/notificaciones', params), false);
    assert.equal(esRutaDetalleConTokenPublico('/reservas/FLX-9988/otra-cosa', params), false);
  });
});

describe('calcularCapacidadesOperacionAlquiler', () => {
  test('restringe estrictamente al ASESOR de pausas, prórrogas con tarifa y anulaciones', () => {
    const caps = calcularCapacidadesOperacionAlquiler('ASESOR');
    assert.equal(caps.puedeConfirmarRechazar, true);
    assert.equal(caps.puedeEntregar, true);
    assert.equal(caps.puedeGuardarInspeccionR2, true);
    assert.equal(caps.puedePausar, false, 'ASESOR no puede pausar');
    assert.equal(caps.puedeProrrogarEstandar, true);
    assert.equal(caps.puedeAjustarTarifasYCargos, false, 'ASESOR no puede ajustar tarifas');
    assert.equal(caps.puedeReembolsarYAnularCaja, false, 'ASESOR no puede reembolsar ni anular caja');
    assert.equal(caps.puedeAnularContrato, false, 'ASESOR no puede anular contratos');
  });

  test('otorga capacidades completas al ADMIN y DUENO', () => {
    for (const rol of ['ADMIN', 'DUENO'] as const) {
      const caps = calcularCapacidadesOperacionAlquiler(rol);
      assert.equal(caps.puedeConfirmarRechazar, true);
      assert.equal(caps.puedeEntregar, true);
      assert.equal(caps.puedeGuardarInspeccionR2, true);
      assert.equal(caps.puedePausar, true);
      assert.equal(caps.puedeProrrogarEstandar, true);
      assert.equal(caps.puedeAjustarTarifasYCargos, true);
      assert.equal(caps.puedeReembolsarYAnularCaja, true);
      assert.equal(caps.puedeAnularContrato, true);
      assert.equal(caps.puedeGestionarGarantias, true);
    }
  });

  test('retorna todas las capacidades en false para usuario sin rol', () => {
    const caps = calcularCapacidadesOperacionAlquiler(null);
    assert.equal(caps.puedePausar, false);
    assert.equal(caps.puedeEntregar, false);
    assert.equal(caps.puedeConfirmarRechazar, false);
  });

  test('SuperAdmin con cualquier rol de membresía (ej. ASESOR) recibe capacidades operativas completas', () => {
    const caps = calcularCapacidadesOperacionAlquiler({
      rol: 'ASESOR',
      esSuperAdmin: true,
    });
    assert.equal(caps.puedeConfirmarRechazar, true);
    assert.equal(caps.puedeEntregar, true);
    assert.equal(caps.puedeGuardarInspeccionR2, true);
    assert.equal(caps.puedePausar, true);
    assert.equal(caps.puedeProrrogarEstandar, true);
    assert.equal(caps.puedeAjustarTarifasYCargos, true);
    assert.equal(caps.puedeReembolsarYAnularCaja, true);
    assert.equal(caps.puedeAnularContrato, true);
    assert.equal(caps.puedeGestionarGarantias, true);
    assert.equal(caps.puedeGestionarTaller, true);
  });
});

describe('registrarCobroWaybillD1 - Tenant Isolation & Cuenta Id', () => {
  function crearMockDbCobroWaybill(opciones: {
    reserva?: Record<string, unknown> | null;
    cuentas?: Array<Record<string, unknown>>;
  } = {}) {
    const reserva =
      opciones.reserva !== undefined
        ? opciones.reserva
        : {
            id: 'res-wb-1',
            codigo: 'FLX-WB100',
            localId: 'local-patio-1',
            clienteId: 'usr-cli-1',
            contactoNombre: 'Pedro Pascal',
            vehiculoId: 'veh-1',
          };

    const cuentas =
      opciones.cuentas ?? [
        {
          id: 'cta-efectivo-1',
          localId: 'local-patio-1',
          nombre: 'Caja Mostrador',
          tipo: 'CAJA_EFECTIVO',
          activo: true,
        },
        {
          id: 'cta-banco-1',
          localId: 'local-patio-1',
          nombre: 'Cuenta Corriente',
          tipo: 'BANCO',
          activo: true,
        },
      ];

    const insertados: Array<{ tabla: unknown; values: unknown }> = [];

    const mockDb = {
      select: () => ({
        from: (tabla: unknown) => {
          const obtenerFilas = () => {
            if (tabla && typeof tabla === 'object' && 'codigo' in tabla) {
              return reserva ? [reserva] : [];
            }
            if (tabla && typeof tabla === 'object' && 'tipo' in tabla) {
              return cuentas;
            }
            return [];
          };

          const crearThenable = () => {
            const filas = obtenerFilas();
            const p = Promise.resolve(filas);
            return Object.assign(p, {
              limit: async () => filas,
              all: async () => filas,
              where: () => crearThenable(),
            });
          };

          return {
            where: () => crearThenable(),
            limit: async () => obtenerFilas(),
            all: async () => obtenerFilas(),
          };
        },
      }),
      insert: (tabla: unknown) => ({
        values: async (valores: unknown) => {
          insertados.push({ tabla, values: valores });
          return { success: true };
        },
      }),
      update: () => ({
        set: () => ({
          where: async () => ({ success: true }),
        }),
      }),
    } as unknown as AppDb;

    return { mockDb, insertados };
  }

  test('rechaza con FORBIDDEN si localId no coincide con la reserva (tenant isolation)', async () => {
    const { mockDb } = crearMockDbCobroWaybill();

    await assert.rejects(
      async () => {
        await registrarCobroWaybillD1(mockDb, {
          codigo: 'FLX-WB100',
          monto: 100_000,
          metodoPago: 'efectivo',
          usuarioId: 'usr-operador-1',
          localId: 'local-otro-patio',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal((err as ErrorCicloAlquiler).code, 'FORBIDDEN');
        assert.match((err as ErrorCicloAlquiler).message, /no pertenece al local/i);
        return true;
      }
    );
  });

  test('rechaza con BAD_REQUEST si cuentaId especificada no pertenece al local activo', async () => {
    const { mockDb } = crearMockDbCobroWaybill();

    await assert.rejects(
      async () => {
        await registrarCobroWaybillD1(mockDb, {
          codigo: 'FLX-WB100',
          monto: 100_000,
          metodoPago: 'efectivo',
          usuarioId: 'usr-operador-1',
          localId: 'local-patio-1',
          cuentaId: 'cta-ajena-no-activa',
        });
      },
      (err: unknown) => {
        assert.ok(err instanceof ErrorCicloAlquiler);
        assert.equal((err as ErrorCicloAlquiler).code, 'BAD_REQUEST');
        assert.match((err as ErrorCicloAlquiler).message, /cuenta financiera/i);
        return true;
      }
    );
  });

  test('asienta el cobro correctamente usando la cuentaId solicitada si pertenece al local', async () => {
    const { mockDb, insertados } = crearMockDbCobroWaybill();

    const ok = await registrarCobroWaybillD1(mockDb, {
      codigo: 'FLX-WB100',
      monto: 150_000,
      metodoPago: 'transferencia',
      usuarioId: 'usr-operador-1',
      localId: 'local-patio-1',
      cuentaId: 'cta-banco-1',
    });

    assert.equal(ok, true);
    const mov = insertados.find(
      (i) => (i.values as Record<string, unknown>).tipo === 'INGRESO'
    );
    assert.ok(mov, 'Debe haber insertado movimiento de ingreso');
    const valoresMov = mov.values as Record<string, unknown>;
    assert.equal(valoresMov.cuentaId, 'cta-banco-1');
    assert.equal(valoresMov.monto, 150_000);
    assert.equal(valoresMov.localId, 'local-patio-1');
  });
});

describe('cambiarEstadoReservaAction - Enforzamiento RBAC', () => {
  const contextoAsesor = {
    locals: {
      usuario: {
        id: 'usr-asesor-1',
        nombre: 'Asesor Mostrador',
        email: 'asesor@flotax.co',
        rol: 'ASESOR',
        activo: true,
        esSuperAdmin: false,
        localActivo: {
          id: 'local-patio-1',
          nombre: 'Patio Norte',
          rol: 'ASESOR' as const,
          permisosConcedidos: [],
          permisosRevocados: [],
        },
      },
    },
    cookies: {
      set: () => {},
      get: () => undefined,
    },
  };

  test('rechaza con FORBIDDEN a ASESOR intentando pausar (falta CONTRATOS_PAUSAR)', async () => {
    await assert.rejects(
      async () => {
        await (cambiarEstadoReservaAction as any).handler(
          {
            codigo: 'FLX-123456',
            vehiculoId: 'veh-1',
            vehiculoNombre: 'Renault Sandero',
            rangoFechas: '15/11 - 18/11',
            nuevoEstado: 'PAUSADA',
          },
          contextoAsesor
        );
      },
      (err: unknown) => {
        const actionErr = err as { code?: string; message?: string };
        assert.equal(actionErr.code, 'FORBIDDEN');
        assert.match(actionErr.message ?? '', /pausar contratos/i);
        return true;
      }
    );
  });

  test('rechaza con FORBIDDEN a ASESOR intentando reabrir a PENDIENTE (falta CONTRATOS_ANULAR)', async () => {
    await assert.rejects(
      async () => {
        await (cambiarEstadoReservaAction as any).handler(
          {
            codigo: 'FLX-123456',
            vehiculoId: 'veh-1',
            vehiculoNombre: 'Renault Sandero',
            rangoFechas: '15/11 - 18/11',
            nuevoEstado: 'PENDIENTE',
          },
          contextoAsesor
        );
      },
      (err: unknown) => {
        const actionErr = err as { code?: string; message?: string };
        assert.equal(actionErr.code, 'FORBIDDEN');
        assert.match(actionErr.message ?? '', /reabrir reservas/i);
        return true;
      }
    );
  });

  test('rechaza con FORBIDDEN a CONTADOR intentando completar/cerrar (falta CONTRATOS_FINALIZAR)', async () => {
    const contextoContador = {
      locals: {
        usuario: {
          id: 'usr-contador-1',
          nombre: 'Contador General',
          email: 'contador@flotax.co',
          rol: 'CONTADOR',
          activo: true,
          esSuperAdmin: false,
          localActivo: {
            id: 'local-patio-1',
            nombre: 'Patio Norte',
            rol: 'CONTADOR' as const,
            permisosConcedidos: [],
            permisosRevocados: [],
          },
        },
      },
      cookies: {
        set: () => {},
        get: () => undefined,
      },
    };

    await assert.rejects(
      async () => {
        await (cambiarEstadoReservaAction as any).handler(
          {
            codigo: 'FLX-123456',
            vehiculoId: 'veh-1',
            vehiculoNombre: 'Renault Sandero',
            rangoFechas: '15/11 - 18/11',
            nuevoEstado: 'COMPLETADA',
          },
          contextoContador
        );
      },
      (err: unknown) => {
        const actionErr = err as { code?: string; message?: string };
        assert.equal(actionErr.code, 'FORBIDDEN');
        assert.match(actionErr.message ?? '', /cerrar alquileres/i);
        return true;
      }
    );
  });
});
