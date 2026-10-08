import { renderBaseLayout, escapeHtml } from './base';
import type { InspeccionTemplateProps } from '../types';

export function renderInspeccionTemplate({
  clienteNombre,
  reservaNumero,
  vehiculoMarcaModelo,
  vehiculoPlaca,
  tipoInspeccion,
  fechaInspeccion,
  kilometraje,
  nivelCombustible,
  danosDetectadosCount,
  enlaceActa,
}: InspeccionTemplateProps): { subject: string; html: string; text: string } {
  const tipoTitulo = tipoInspeccion === 'ENTREGA' ? 'Entrega / Check-in' : 'Devolución / Check-out';
  const subject = `FlotaX: Acta Pericial de ${tipoTitulo} - Placa ${vehiculoPlaca}`;
  const preheader = `Acta de inspección de vehículo ${vehiculoMarcaModelo} correspondiente a la reserva #${reservaNumero}.`;

  const contentHtml = `
    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #EDEDED; text-align: center;">
      Acta Pericial Vehicular
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #9CA3AF; text-align: center;">
      Inspección de <strong>${escapeHtml(tipoTitulo)}</strong> · Reserva #${escapeHtml(reservaNumero)}
    </p>

    <!-- Datos de la Inspección -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111827; border: 1px solid #4B5563; border-radius: 8px; margin-bottom: 20px;">
      <tr>
        <td style="padding: 16px;">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 13px; color: #9CA3AF; padding-bottom: 6px;">Vehículo / Placa:</td>
              <td align="right" style="font-size: 14px; color: #EDEDED; font-weight: 600; padding-bottom: 6px;">
                ${escapeHtml(vehiculoMarcaModelo)} (${escapeHtml(vehiculoPlaca)})
              </td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #9CA3AF; padding-bottom: 6px;">Fecha y Hora:</td>
              <td align="right" style="font-size: 14px; color: #EDEDED; padding-bottom: 6px;">${escapeHtml(fechaInspeccion)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #9CA3AF; padding-bottom: 6px;">Kilometraje Registrado:</td>
              <td align="right" style="font-size: 14px; color: #EDEDED; font-weight: 600; padding-bottom: 6px;">${escapeHtml(String(kilometraje))} km</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #9CA3AF; padding-bottom: 6px;">Nivel de Combustible:</td>
              <td align="right" style="font-size: 14px; color: #EDEDED; padding-bottom: 6px;">${escapeHtml(nivelCombustible)}</td>
            </tr>
            <tr>
              <td style="font-size: 13px; color: #9CA3AF;">Evidencias de Daño:</td>
              <td align="right" style="font-size: 14px; color: ${danosDetectadosCount > 0 ? '#F87171' : '#34D399'}; font-weight: 600;">
                ${danosDetectadosCount > 0 ? `${danosDetectadosCount} daño(s) registrado(s)` : 'Sin daños reportados'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${
      enlaceActa
        ? `
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 16px;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(enlaceActa)}" style="background-color: #EDEDED; color: #111827; display: inline-block; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; text-decoration: none;">
            Ver Acta Completa y Fotos en R2
          </a>
        </td>
      </tr>
    </table>
    `
        : ''
    }

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #9CA3AF; line-height: 1.4; text-align: center;">
      Este reporte pericial digital cuenta con validez legal y registro fotográfico inmutable en la nube para respaldo de ambas partes.
    </p>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `
FLOTAX - Acta Pericial Vehicular (${tipoTitulo})
=================================================

Cliente: ${clienteNombre}
Reserva: #${reservaNumero}
Vehículo: ${vehiculoMarcaModelo} (Placa: ${vehiculoPlaca})

DETALLES PERICIALES:
- Fecha: ${fechaInspeccion}
- Kilometraje: ${kilometraje} km
- Nivel Combustible: ${nivelCombustible}
- Daños detectados: ${danosDetectadosCount}

${enlaceActa ? `Ver evidencia fotográfica: ${enlaceActa}\n` : ''}
---
Enviado desde flotax.innovaweb.pro por FlotaX.
`.trim();

  return { subject, html, text };
}
