import { renderBaseLayout, escapeHtml } from '../../email/templates/base';
import type { LogEntry, AlertThrottleConfig } from '../types';
import type { ThrottleDecision } from '../alerts/throttle';

export interface DeveloperAlertTemplateProps {
  entry: LogEntry;
  fingerprint: string;
  decision: ThrottleDecision;
  config: AlertThrottleConfig;
}

export interface RenderedAlertEmail {
  subject: string;
  html: string;
  text: string;
}

export function renderDeveloperAlertEmail(
  props: DeveloperAlertTemplateProps
): RenderedAlertEmail {
  const { entry, fingerprint, decision, config } = props;
  const isFatal = entry.level === 'fatal';
  const isSpike = decision.isSpike;
  const errorTitle = entry.error?.name || 'Error en Runtime';
  const errorMessage = entry.error?.message || entry.message;
  const envLabel = config.environment.toUpperCase();

  let badgeText = isFatal ? 'CRÍTICO' : 'ERROR DE SISTEMA';
  if (isSpike) {
    badgeText = 'RÁFAGA / PICO DETECTADO';
  }

  const subject = `[FlotaX ${badgeText}] [${envLabel}] ${errorMessage.slice(0, 60)} (${fingerprint})`;

  const preheader = `Alerta de error en FlotaX: ${errorMessage.slice(0, 100)}`;

  const contextItems: { label: string; value: string }[] = [
    { label: 'Entorno', value: config.environment },
    { label: 'Incidente ID', value: decision.incidentId },
    { label: 'Huella (Fingerprint)', value: fingerprint },
    { label: 'Ocurrencias Acumuladas', value: String(decision.totalOccurrences) },
    { label: 'Fecha / Hora (UTC)', value: entry.timestamp },
    { label: 'Causa de Alerta', value: decision.reason },
  ];

  if (entry.context.requestId) {
    contextItems.push({ label: 'Request ID', value: String(entry.context.requestId) });
  }
  if (entry.context.path) {
    contextItems.push({
      label: 'Endpoint / Ruta',
      value: `${entry.context.method || 'GET'} ${entry.context.path}`,
    });
  }
  if (entry.context.action) {
    contextItems.push({ label: 'Acción Astro', value: String(entry.context.action) });
  }
  if (entry.context.userId) {
    contextItems.push({ label: 'Usuario ID', value: String(entry.context.userId) });
  }
  if (entry.context.localId) {
    contextItems.push({ label: 'Local ID', value: String(entry.context.localId) });
  }
  if (entry.context.colocation) {
    contextItems.push({ label: 'CF Colocation', value: String(entry.context.colocation) });
  }

  const contextTableHtml = contextItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 12px; color: #9CA3AF; font-size: 13px; font-weight: 500; border-bottom: 1px solid #111827; width: 38%;">
          ${escapeHtml(item.label)}
        </td>
        <td style="padding: 6px 12px; color: #EDEDED; font-size: 13px; font-family: monospace; border-bottom: 1px solid #111827;">
          ${escapeHtml(item.value)}
        </td>
      </tr>`
    )
    .join('');

  const stackHtml = entry.error?.stack
    ? `
      <div style="margin-top: 20px;">
        <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF; margin-bottom: 8px;">
          Pila de Ejecución (Stack Trace)
        </div>
        <pre style="background-color: #111827; border: 1px solid #4B5563; border-radius: 8px; padding: 14px; color: #EDEDED; font-size: 11px; line-height: 1.45; overflow-x: auto; white-space: pre-wrap; word-break: break-all; margin: 0; font-family: monospace;">${escapeHtml(
          entry.error.stack
        )}</pre>
      </div>`
    : '';

  const contentHtml = `
    <!-- Header del Incidente -->
    <div style="margin-bottom: 24px; text-align: left;">
      <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
        <tr>
          <td style="background-color: #111827; border: 1px solid #4B5563; border-radius: 6px; padding: 4px 10px;">
            <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #EDEDED;">
              🚨 ${escapeHtml(badgeText)}
            </span>
          </td>
        </tr>
      </table>
      <h1 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #EDEDED; line-height: 1.3;">
        ${escapeHtml(errorTitle)}
      </h1>
      <p style="margin: 0; font-size: 14px; color: #9CA3AF; line-height: 1.5; word-break: break-word;">
        ${escapeHtml(errorMessage)}
      </p>
    </div>

    <!-- Tabla de Diagnóstico Técnico -->
    <div style="background-color: #1F2937; border: 1px solid #4B5563; border-radius: 8px; overflow: hidden; margin-bottom: 20px;">
      <div style="padding: 10px 14px; background-color: #111827; border-bottom: 1px solid #4B5563; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #9CA3AF;">
        Detalles del Contexto y Diagnóstico
      </div>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
        ${contextTableHtml}
      </table>
    </div>

    <!-- Pila de Ejecución -->
    ${stackHtml}

    <!-- Pie de Alerta Temprana -->
    <div style="margin-top: 24px; padding: 12px 16px; background-color: #111827; border-radius: 8px; border: 1px dashed #4B5563; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
      💡 <strong>Control de Alertas Tempranas FlotaX:</strong> Esta notificación se envió de inmediato al registrarse la incidencia. Ocurrencias idénticas subsiguientes permanecerán en supresión durante una ventana de enfriamiento de ${config.cooldownMinutes} minutos para proteger cuotas de envío.
    </div>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader,
    contentHtml,
  });

  const textLines = [
    `[FLOTAX ALERTA] ${badgeText}`,
    `Error: ${errorTitle}`,
    `Mensaje: ${errorMessage}`,
    `Entorno: ${config.environment}`,
    `Huella: ${fingerprint}`,
    `Incidente: ${decision.incidentId}`,
    `Ocurrencias: ${decision.totalOccurrences}`,
    `Timestamp: ${entry.timestamp}`,
    `Causa de Alerta: ${decision.reason}`,
    '',
    '--- Contexto ---',
    ...contextItems.map((item) => `${item.label}: ${item.value}`),
  ];

  if (entry.error?.stack) {
    textLines.push('', '--- Stack Trace ---', entry.error.stack);
  }

  const text = textLines.join('\n');

  return { subject, html, text };
}
