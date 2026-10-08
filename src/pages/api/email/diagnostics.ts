import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getEmailService } from '@/lib/email';
import { z } from 'zod';

const testEmailSchema = z.object({
  to: z.email({ error: 'Debe ser un correo electrónico válido' }),
  tipo: z.enum(['otp', 'reserva', 'personalizado']).default('otp'),
  asunto: z.string().optional(),
  mensaje: z.string().optional(),
});

export const GET: APIRoute = async () => {
  const hasEmailBinding = Boolean(
    env?.EMAIL && typeof env.EMAIL.send === 'function'
  );

  return new Response(
    JSON.stringify(
      {
        modulo: 'FlotaX Email Service',
        dominio: 'flotax.innovaweb.pro',
        estado: {
          bindingPresente: hasEmailBinding,
          tipoAdapter: hasEmailBinding ? 'CloudflareEmailAdapter' : 'ConsoleEmailAdapter (Simulación)',
          remitenteAuthDefault: env?.EMAIL_AUTH_FROM || 'FlotaX Seguridad <auth@flotax.innovaweb.pro>',
          remitenteOperativoDefault: env?.EMAIL_DEFAULT_FROM || 'FlotaX <notificaciones@flotax.innovaweb.pro>',
        },
        instrucciones:
          'Envía una petición POST con JSON { "to": "tu-email@gmail.com", "tipo": "otp" } para verificar la entrega.',
      },
      null,
      2
    ),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = testEmailSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Parámetros inválidos',
          detalles: z.treeifyError(parseResult.error),
          issues: parseResult.error.issues,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { to, tipo, asunto, mensaje } = parseResult.data;
    const emailService = getEmailService(env);

    let result;

    if (tipo === 'otp') {
      const codigoPrueba = Math.floor(100000 + Math.random() * 900000).toString();
      result = await emailService.sendOtp({
        to,
        code: codigoPrueba,
        type: 'sign-in',
      });
    } else if (tipo === 'reserva') {
      result = await emailService.sendReservaConfirmada({
        to,
        datos: {
          clienteNombre: 'Conductor de Prueba',
          reservaNumero: 'FLX-' + Math.floor(1000 + Math.random() * 9000),
          vehiculoMarcaModelo: 'Toyota Hilux 4x4',
          vehiculoPlaca: 'ABC-123',
          fechaInicio: '10 Octubre 2026, 09:00 AM',
          fechaFin: '15 Octubre 2026, 18:00 PM',
          localNombre: 'Patio Principal Norte',
          totalEstimado: '$ 450.00 USD',
          depositoGarantia: '$ 200.00 USD',
          enlaceDetalle: 'https://flotax.innovaweb.pro/reservas/demo',
        },
      });
    } else {
      result = await emailService.send({
        to,
        subject: asunto || 'FlotaX: Correo de Prueba',
        html: `<p style="color: #EDEDED;">${mensaje || 'Este es un correo de prueba desde FlotaX (flotax.innovaweb.pro).'}</p>`,
        text: mensaje || 'Este es un correo de prueba desde FlotaX (flotax.innovaweb.pro).',
      });
    }

    return new Response(
      JSON.stringify(
        {
          success: result.success,
          messageId: result.messageId,
          error: result.error,
          code: result.code,
          destinatario: to,
          tipo,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      ),
      {
        status: result.success ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        error: 'Error interno ejecutando diagnóstico de correo',
        mensaje: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
