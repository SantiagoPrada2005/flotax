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
});
