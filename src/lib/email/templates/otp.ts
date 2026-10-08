import { renderBaseLayout, escapeHtml } from './base';
import type { OtpTemplateProps } from '../types';

export function renderOtpTemplate({
  code,
  type = 'sign-in',
  expiresInMinutes = 10,
}: OtpTemplateProps): { subject: string; html: string; text: string } {
  const isSignIn = type === 'sign-in';
  const actionLabel = isSignIn
    ? 'iniciar sesión en FlotaX'
    : 'verificar tu cuenta en FlotaX';

  const subject = `FlotaX: Código de verificación [${code}]`;
  const preheader = `Tu código de un solo uso para ${actionLabel} es ${code}`;

  const contentHtml = `
    <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #EDEDED; text-align: center;">
      Código de Acceso
    </h1>
    <p style="margin: 0 0 24px 0; font-size: 14px; color: #9CA3AF; text-align: center; line-height: 1.5;">
      Usa el siguiente código de un solo uso para ${escapeHtml(actionLabel)}.
    </p>

    <!-- Caja del Código OTP -->
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="background-color: #111827; border: 2px dashed #4B5563; border-radius: 8px; padding: 18px 24px; display: inline-block;">
            <span style="font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 0.35em; color: #EDEDED; padding-left: 0.35em;">
              ${escapeHtml(code)}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <div style="background-color: #111827; border-left: 3px solid #9CA3AF; padding: 12px 16px; border-radius: 4px; margin: 24px 0 16px 0;">
      <p style="margin: 0; font-size: 13px; color: #EDEDED; line-height: 1.4;">
        ⏱️ Este código expira en <strong>${expiresInMinutes} minutos</strong>.
      </p>
      <p style="margin: 6px 0 0 0; font-size: 12px; color: #9CA3AF; line-height: 1.4;">
        Por seguridad, nunca compartas este código con nadie. El equipo de FlotaX nunca te pedirá este código por llamada o mensaje.
      </p>
    </div>

    <p style="margin: 16px 0 0 0; font-size: 12px; color: #9CA3AF; text-align: center;">
      Si no intentaste ingresar, puedes desestimar este mensaje de forma segura.
    </p>
  `;

  const html = renderBaseLayout({
    title: subject,
    preheader,
    contentHtml,
  });

  const text = `
FLOTAX - Código de Verificación
================================

Tu código para ${actionLabel} es:

  ${code}

Este código es válido por ${expiresInMinutes} minutos.
Por tu seguridad, nunca compartas este código con nadie.

Si no solicitaste este código, ignora este mensaje.

---
Enviado desde flotax.innovaweb.pro por FlotaX.
`.trim();

  return { subject, html, text };
}
