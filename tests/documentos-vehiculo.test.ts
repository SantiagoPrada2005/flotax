import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcularFechaPagoDocumento,
  construirEmisionAlertaDocumento,
  esCategoriaExentaDocumentosLegales,
  evaluarDocumentoLegal,
  evaluarResumenDocumentalVehiculo,
  sugerirFechaVencimientoAnual,
} from '../src/lib/documentos-vehiculo/index.ts';

describe('Gestión Documental de Vehículos (SOAT, Tecnomecánica y Ley 2486)', () => {
  it('1. sugerirFechaVencimientoAnual suma 1 año exacto y ajusta 29 de febrero en años no bisiestos', () => {
    assert.equal(sugerirFechaVencimientoAnual('2026-05-14'), '2027-05-14');
    assert.equal(sugerirFechaVencimientoAnual('2024-02-29'), '2025-02-28');
    assert.equal(sugerirFechaVencimientoAnual('2023-02-28'), '2024-02-28');
  });

  it('2. calcularFechaPagoDocumento aplica mismo día en SOAT y 2 días antes en Tecnomecánica', () => {
    assert.equal(calcularFechaPagoDocumento('SOAT', '2026-12-20'), '2026-12-20');
    assert.equal(
      calcularFechaPagoDocumento('TECNICO_MECANICA', '2026-12-20'),
      '2026-12-18'
    );
    // Cruce de fin de mes
    assert.equal(
      calcularFechaPagoDocumento('TECNICO_MECANICA', '2026-03-01'),
      '2026-02-27'
    );
  });

  it('3. evaluarDocumentoLegal recorre las fronteras exactas de los 6 estados para SOAT', () => {
    const docSoat = {
      id: 'doc-soat-1',
      numeroReferencia: 'SOAT-999',
      fechaExpedicion: '2025-12-20',
      fechaVencimiento: '2026-12-20', // fechaPago = 2026-12-20
      vigente: true,
    };

    // 21 días antes -> VIGENTE
    const d21 = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-11-29',
    });
    assert.equal(d21.estado, 'VIGENTE');
    assert.equal(d21.bloqueaOperacion, false);
    assert.equal(d21.requiereNotificacion, false);

    // 20 días antes -> PROXIMO_A_VENCER
    const d20 = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-11-30',
    });
    assert.equal(d20.estado, 'PROXIMO_A_VENCER');
    assert.equal(d20.requiereNotificacion, true);

    // 8 días antes -> PROXIMO_A_VENCER
    const d8 = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-12-12',
    });
    assert.equal(d8.estado, 'PROXIMO_A_VENCER');

    // 7 días antes -> CUENTA_REGRESIVA
    const d7 = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-12-13',
    });
    assert.equal(d7.estado, 'CUENTA_REGRESIVA');
    assert.equal(d7.diasParaPago, 7);
    assert.equal(d7.etiquetaEstado, 'Faltan 7 días para la fecha de pago');

    // 1 día antes -> CUENTA_REGRESIVA singular
    const d1 = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-12-19',
    });
    assert.equal(d1.estado, 'CUENTA_REGRESIVA');
    assert.equal(d1.etiquetaEstado, 'Falta 1 día para la fecha de pago');

    // Día exacto de vencimiento -> HOY_FECHA_PAGO
    const d0 = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-12-20',
    });
    assert.equal(d0.estado, 'HOY_FECHA_PAGO');
    assert.equal(d0.etiquetaEstado, 'Hoy es la fecha de pago');
    assert.equal(d0.bloqueaOperacion, false);
    assert.equal(d0.requiereNotificacion, true);

    // Día siguiente -> SIN_REALIZAR ("Sin SOAT vigente")
    const vencido = evaluarDocumentoLegal({
      tipoDocumento: 'SOAT',
      documento: docSoat,
      hoyISO: '2026-12-21',
    });
    assert.equal(vencido.estado, 'SIN_REALIZAR');
    assert.equal(vencido.etiquetaEstado, 'Sin SOAT vigente');
    assert.equal(vencido.bloqueaOperacion, true);
    assert.equal(vencido.requiereNotificacion, false);
  });

  it('4. Tecnomecánica mantiene "Hoy es la fecha de pago" desde 2 días antes hasta el vencimiento y pasa a "Sin realizar tecnomecánica" después', () => {
    const docRtm = {
      id: 'doc-rtm-1',
      numeroReferencia: 'RTM-101',
      fechaExpedicion: '2025-12-20',
      fechaVencimiento: '2026-12-20', // fechaPago = 2026-12-18
      vigente: true,
    };

    // 2026-12-17 = 1 día antes de fechaPago (2026-12-18) -> CUENTA_REGRESIVA
    const previo = evaluarDocumentoLegal({
      tipoDocumento: 'TECNICO_MECANICA',
      documento: docRtm,
      hoyISO: '2026-12-17',
    });
    assert.equal(previo.estado, 'CUENTA_REGRESIVA');
    assert.equal(previo.diasParaPago, 1);

    // 2026-12-18, 2026-12-19, 2026-12-20 -> HOY_FECHA_PAGO
    for (const fecha of ['2026-12-18', '2026-12-19', '2026-12-20']) {
      const ev = evaluarDocumentoLegal({
        tipoDocumento: 'TECNICO_MECANICA',
        documento: docRtm,
        hoyISO: fecha,
      });
      assert.equal(ev.estado, 'HOY_FECHA_PAGO', `Debe ser HOY_FECHA_PAGO en ${fecha}`);
      assert.equal(ev.etiquetaEstado, 'Hoy es la fecha de pago');
      assert.equal(ev.bloqueaOperacion, false);
      assert.equal(ev.requiereNotificacion, true);
    }

    // 2026-12-21 -> SIN_REALIZAR
    const vencida = evaluarDocumentoLegal({
      tipoDocumento: 'TECNICO_MECANICA',
      documento: docRtm,
      hoyISO: '2026-12-21',
    });
    assert.equal(vencida.estado, 'SIN_REALIZAR');
    assert.equal(vencida.etiquetaEstado, 'Sin realizar tecnomecánica');
    assert.equal(vencida.bloqueaOperacion, true);
  });

  it('5. Patinetas eléctricas livianas (PATINETA) quedan exentas de SOAT, RTM y Licencia de tránsito (Ley 2486 de 2025)', () => {
    assert.equal(esCategoriaExentaDocumentosLegales('PATINETA'), true);
    assert.equal(esCategoriaExentaDocumentosLegales('MOTO'), false);

    const resumenPatineta = evaluarResumenDocumentalVehiculo({
      categoria: 'PATINETA',
      documentos: [],
      hoyISO: '2026-11-23',
    });

    assert.equal(resumenPatineta.exentoPorLey2486, true);
    assert.equal(resumenPatineta.bloqueadoPorDocumentos, false);
    assert.equal(resumenPatineta.soat, null);
    assert.equal(resumenPatineta.tecnomecanica, null);
  });

  it('6. evaluarResumenDocumentalVehiculo bloquea por SIN_REGISTRAR y construye emisiones de notificación con dedupeKey determinista', () => {
    const sinDocs = evaluarResumenDocumentalVehiculo({
      categoria: 'SUV',
      documentos: [],
      hoyISO: '2026-11-23',
    });
    assert.equal(sinDocs.bloqueadoPorDocumentos, true);
    assert.equal(sinDocs.soat?.estado, 'SIN_REGISTRAR');
    assert.equal(sinDocs.tecnomecanica?.estado, 'SIN_REGISTRAR');

    const resumenEnAlerta = evaluarResumenDocumentalVehiculo({
      categoria: 'SUV',
      hoyISO: '2026-12-15',
      documentos: [
        {
          id: 'd1',
          tipoDocumento: 'SOAT',
          numeroReferencia: 'S-1',
          fechaExpedicion: '2025-12-20',
          fechaVencimiento: '2026-12-20', // 5 días para pago -> CUENTA_REGRESIVA
          vigente: true,
          archivoR2Key: null,
          archivoReversoR2Key: null,
          actualizadoEn: new Date('2026-01-01T00:00:00Z'),
        },
        {
          id: 'd2',
          tipoDocumento: 'TECNICO_MECANICA',
          numeroReferencia: 'R-1',
          fechaExpedicion: '2026-01-05',
          fechaVencimiento: '2027-01-05', // 19 días para pago (2027-01-03) -> PROXIMO_A_VENCER
          vigente: true,
          archivoR2Key: null,
          archivoReversoR2Key: null,
          actualizadoEn: new Date('2026-01-05T00:00:00Z'),
        },
      ],
    });

    assert.equal(resumenEnAlerta.bloqueadoPorDocumentos, false);

    const alertaSoat = construirEmisionAlertaDocumento({
      vehiculoId: 'veh-1',
      localId: 'loc-1',
      etiquetaVehiculo: 'Mazda CX-30 (FLX-123)',
      evaluacion: resumenEnAlerta.soat,
      hoyISO: '2026-12-15',
    });
    assert.ok(alertaSoat);
    assert.equal(
      alertaSoat.emision.dedupeKey,
      'doc-alerta:veh-1:SOAT:2026-12-20:countdown:2026-12-15'
    );
    assert.equal(alertaSoat.emision.payload.diasRestantes, 5);

    const alertaRtm = construirEmisionAlertaDocumento({
      vehiculoId: 'veh-1',
      localId: 'loc-1',
      etiquetaVehiculo: 'Mazda CX-30 (FLX-123)',
      evaluacion: resumenEnAlerta.tecnomecanica,
      hoyISO: '2026-12-15',
    });
    assert.ok(alertaRtm);
    assert.equal(
      alertaRtm.emision.dedupeKey,
      'doc-alerta:veh-1:TECNICO_MECANICA:2027-01-05:proximo'
    );
  });
});
