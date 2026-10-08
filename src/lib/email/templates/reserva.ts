import { renderBaseLayout, escapeHtml } from './base';
import type { ReservaTemplateProps } from '../types';

export function renderReservaTemplate({
  clienteNombre,
  reservaNumero,
  vehiculoMarcaModelo,
  vehiculoPlaca,
  fechaInicio,
  fechaFin,
  localNombre,
  totalEstimado,
  depositoGarantia,
  enlaceDetalle,
}: ReservaTemplateProps): { subject: string; html: string; text: string } {
  const subject = `FlotaX: Reserva Confirmada #${reservaNumero} - ${vehiculoMarcaModelo}`;
  const preheader = `Hola ${clienteNombre}, tu reserva de alquiler #${reservaNumero} está confirmada.`;

  const contentHtml = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #EDEDED; text-align: center;">
      ¡Reserva Confirmada!
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #9CA3AF; text-align: center;">
      Reserva <strong>#${escapeHtml(reservaNumero)}</strong> · Hola, ${escapeHtml(clienteNombre)}.
    </p>

    <!-- Ficha del Vehículo y Patio -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #4B5563; border-radius: 8px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="color: #9CA3AF; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; padding-bottom: 4px;">
                Vehículo Asignado
              </td>
            </tr>
            <tr>
              <td style="color: #EDEDED; font-size: 18px; font-weight: 700; padding-bottom: 12px;">
                ${escapeHtml(vehiculoMarcaModelo)} <span style="font-size: 13px; color: #9CA3AF; font-weight: 400;">(${escapeHtml(vehiculoPlaca)})</span>
              </td>
            </tr>
            <tr>
              <td style="border-top: 1px solid #1F2937; padding-top: 12px;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td width="50%" valign="top" style="padding-right: 8px;">
                      <span style="display: block; font-size: 11px; color: #9CA3AF; text-transform: uppercase;">Retiro</span>
                      <strong style="display: block; font-size: 13px; color: #EDEDED; margin-top: 2px;">${escapeHtml(fechaInicio)}</strong>
                    </td>
                    <td width="50%" valign="top" style="padding-left: 8px;">
                      <span style="display: block; font-size: 11px; color: #9CA3AF; text-transform: uppercase;">Devolución</span>
                      <strong style="display: block; font-size: 13px; color: #EDEDED; margin-top: 2px;">${escapeHtml(fechaFin)}</strong>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 12px;">
                <span style="display: block; font-size: 11px; color: #9CA3AF; text-transform: uppercase;">Patio / Local</span>
                <strong style="display: block; font-size: 13px; color: #EDEDED; margin-top: 2px;">📍 ${escapeHtml(localNombre)}</strong>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Desglose Económico -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #4B5563; border-radius: 8px; margin-bottom: 24px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #9CA3AF; padding-bottom: 6px;">Total Estimado Alquiler:</td>
              <td align="right" style="font-size: 14px; color: #EDEDED; font-weight: 600; padding-bottom: 6px;">${escapeHtml(totalEstimado)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #9CA3AF;">Depósito en Garantía:</td>
              <td align="right" style="font-size: 14px; color: #EDEDED; font-weight: 600;">${escapeHtml(depositoGarantia)}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${
      enlaceDetalle
        ? `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(enlaceDetalle)}" style="background-color: #EDEDED; color: #111827; display: inline-block; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none;">
            Ver Detalles y Contrato en FlotaX
          </a>
        </td>
      </tr>
    </table>
    `
        : ''
    }

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #9CA3AF; line-height: 1.4; text-align: center;">
      Recuerda presentar tu documento de identidad y licencia de conducir vigente al momento de retirar la unidad en patio.
    </p>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `
FLOTAX - Reserva Confirmada #${reservaNumero}
=============================================

Hola ${clienteNombre}, tu reserva ha sido confirmada con éxito.

DETALLES DE LA UNIDAD:
- Vehículo: ${vehiculoMarcaModelo} (Placa: ${vehiculoPlaca})
- Retiro: ${fechaInicio}
- Devolución: ${fechaFin}
- Local/Patio: ${localNombre}

LIQUIDACIÓN:
- Total Alquiler: ${totalEstimado}
- Depósito en Garantía: ${depositoGarantia}

${enlaceDetalle ? `Ver en línea: ${enlaceDetalle}\n` : ''}
Recuerda llevar tu documento y licencia vigente al patio.

---
Enviado desde flotax.innovaweb.pro por FlotaX.
`.trim();

  return { subject, html, text };
}
