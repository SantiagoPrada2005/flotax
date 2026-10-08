/**
 * Base layout HTML para correos transaccionales de FlotaX
 * Cumple estrictamente con la paleta canónica:
 * Fondo externo: #111827
 * Contenedor tarjeta: #1F2937 con borde #4B5563
 * Texto principal: #EDEDED
 * Texto atenuado/secundario: #9CA3AF
 * Acentos y divisores: #4B5563
 */

export interface BaseLayoutOptions {
  title: string;
  preheader?: string;
  contentHtml: string;
  year?: number;
}

export function renderBaseLayout({
  title,
  preheader = 'Notificación oficial de FlotaX',
  contentHtml,
  year = new Date().getFullYear(),
}: BaseLayoutOptions): string {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      background-color: #111827;
      color: #EDEDED;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    img {
      border: 0;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    a {
      color: #EDEDED;
      text-decoration: underline;
    }
    @media only screen and (max-width: 600px) {
      .container {
        width: 100% !important;
        padding: 16px !important;
      }
      .card {
        padding: 24px 16px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #111827; color: #EDEDED; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <!-- Preheader oculto para clientes de correo -->
  <div style="display: none; font-size: 1px; color: #111827; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${escapeHtml(preheader)}
  </div>

  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #111827; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" class="container" width="560" border="0" cellspacing="0" cellpadding="0" style="width: 560px; max-width: 100%;">
          <!-- Header con Brand Identity FlotaX -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="background-color: #1F2937; border: 1px solid #4B5563; border-radius: 8px; padding: 8px 16px; text-align: center;">
                    <span style="font-size: 18px; font-weight: 700; letter-spacing: 0.1em; color: #EDEDED; text-transform: uppercase;">
                      FLOTA<span style="color: #9CA3AF;">X</span>
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size: 11px; color: #9CA3AF; letter-spacing: 0.05em; text-transform: uppercase; margin-top: 8px;">
                Gestión Operativa de Flota
              </div>
            </td>
          </tr>

          <!-- Tarjeta de Contenido Principal -->
          <tr>
            <td class="card" style="background-color: #1F2937; border: 1px solid #4B5563; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer Legal y Dominio -->
          <tr>
            <td align="center" style="padding-top: 24px; color: #9CA3AF; font-size: 12px; line-height: 1.5; text-align: center;">
              <p style="margin: 0 0 6px 0;">
                Enviado de forma segura desde <strong>flotax.innovaweb.pro</strong> por la plataforma FlotaX.
              </p>
              <p style="margin: 0 0 6px 0;">
                Este es un mensaje transaccional automatizado. Si no solicitaste esta acción, puedes ignorar este mensaje.
              </p>
              <p style="margin: 0; color: #4B5563; font-size: 11px;">
                © ${year} FlotaX · Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
