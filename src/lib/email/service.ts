import type { SendEmail, EmailAddress as CfEmailAddress, EmailMessageBuilder } from '@cloudflare/workers-types';
import type {
  EmailRecipient,
  EmailResult,
  IEmailSender,
  SendEmailOptions,
  OtpTemplateProps,
  ReservaTemplateProps,
  InspeccionTemplateProps,
} from './types';
import { sendEmailSchema } from './types';
import { renderOtpTemplate } from './templates/otp';
import { renderReservaTemplate } from './templates/reserva';
import { renderInspeccionTemplate } from './templates/inspeccion';

type RecipientInput = string | { email: string; name?: string | undefined };

/**
 * Normaliza un destinatario hacia la forma requerida por Cloudflare Workers API
 */
function normalizeRecipient(recipient: RecipientInput): string | CfEmailAddress {
  if (typeof recipient === 'string') {
    return recipient.trim();
  }
  return {
    email: recipient.email.trim(),
    name: recipient.name?.trim() || recipient.email.trim(),
  };
}

/**
 * Normaliza un remitente hacia la forma requerida por Cloudflare Workers API
 */
function normalizeSender(sender: RecipientInput): string | CfEmailAddress {
  if (typeof sender === 'string') {
    const match = sender.match(/^(.*?)\s*<(.+?)>$/);
    if (match && match[1] && match[2]) {
      return {
        name: match[1].trim(),
        email: match[2].trim(),
      };
    }
    return sender.trim();
  }
  return {
    email: sender.email.trim(),
    name: sender.name?.trim() || sender.email.trim(),
  };
}

/**
 * Adaptador oficial para Cloudflare Workers send_email binding
 */
export class CloudflareEmailAdapter implements IEmailSender {
  constructor(private readonly emailBinding: SendEmail) {}

  async send(options: SendEmailOptions): Promise<EmailResult> {
    try {
      // 1. Validar esquema
      const validated = sendEmailSchema.parse(options);

      // 2. Formatear remitente y destinatarios
      const to = Array.isArray(validated.to)
        ? validated.to.map((item) => normalizeRecipient(item))
        : normalizeRecipient(validated.to);

      const from = validated.from
        ? normalizeSender(validated.from)
        : 'auth@flotax.innovaweb.pro';

      // 3. Construir mensaje respetando exactOptionalPropertyTypes
      const messageBuilder: EmailMessageBuilder = {
        to,
        from,
        subject: validated.subject,
        html: validated.html,
        text: validated.text,
      };

      if (validated.replyTo) {
        messageBuilder.replyTo = normalizeSender(validated.replyTo);
      }

      if (validated.headers) {
        messageBuilder.headers = validated.headers;
      }

      // 4. Ejecutar llamada al binding nativo de Cloudflare
      const result = await this.emailBinding.send(messageBuilder);

      return {
        success: true,
        messageId: result.messageId,
      };
    } catch (error: unknown) {
      const cfError = error as { code?: string; message?: string };
      const errorCode = cfError.code || 'E_UNKNOWN';
      const errorMessage = cfError.message || String(error);

      console.error(`[CloudflareEmailAdapter Error][${errorCode}]: ${errorMessage}`);

      return {
        success: false,
        code: errorCode,
        error: errorMessage,
      };
    }
  }
}

/**
 * Adaptador de consola/simulación para desarrollo local offline o testing
 */
export class ConsoleEmailAdapter implements IEmailSender {
  async send(options: SendEmailOptions): Promise<EmailResult> {
    const validated = sendEmailSchema.parse(options);
    const mockId = `sim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    console.info(`\n📧 [Simulated Email Sent] ----------------------`);
    console.info(`ID: ${mockId}`);
    console.info(`De: ${JSON.stringify(validated.from || 'auth@flotax.innovaweb.pro')}`);
    console.info(`Para: ${JSON.stringify(validated.to)}`);
    console.info(`Asunto: ${validated.subject}`);
    console.info(`------------------------------------------------\n`);

    return {
      success: true,
      messageId: mockId,
    };
  }
}

export interface EmailServiceConfig {
  defaultFrom?: string | undefined;
  authFrom?: string | undefined;
}

/**
 * Servicio de Dominio para orquestar envíos de correo en FlotaX
 */
export class EmailService {
  private readonly defaultFrom: string;
  private readonly authFrom: string;

  constructor(
    private readonly sender: IEmailSender,
    config?: EmailServiceConfig | undefined
  ) {
    this.defaultFrom =
      config?.defaultFrom || 'FlotaX <notificaciones@flotax.innovaweb.pro>';
    this.authFrom =
      config?.authFrom || 'FlotaX Seguridad <auth@flotax.innovaweb.pro>';
  }

  /**
   * Envía un correo genérico respetando las validaciones del sistema
   */
  async send(options: SendEmailOptions): Promise<EmailResult> {
    const from = options.from || this.defaultFrom;
    return this.sender.send({ ...options, from });
  }

  /**
   * Envía un código OTP para inicio de sesión o verificación de cuenta en FlotaX
   */
  async sendOtp(options: {
    to: EmailRecipient;
    code: string;
    type?: OtpTemplateProps['type'];
    expiresInMinutes?: number | undefined;
  }): Promise<EmailResult> {
    const templateOptions: OtpTemplateProps = {
      code: options.code,
    };
    if (options.type !== undefined) {
      templateOptions.type = options.type;
    }
    if (options.expiresInMinutes !== undefined) {
      templateOptions.expiresInMinutes = options.expiresInMinutes;
    }

    const { subject, html, text } = renderOtpTemplate(templateOptions);

    return this.sender.send({
      to: options.to,
      from: this.authFrom,
      subject,
      html,
      text,
    });
  }

  /**
   * Envía la confirmación de reserva y comprobante de alquiler
   */
  async sendReservaConfirmada(options: {
    to: EmailRecipient;
    datos: ReservaTemplateProps;
  }): Promise<EmailResult> {
    const { subject, html, text } = renderReservaTemplate(options.datos);

    return this.sender.send({
      to: options.to,
      from: this.defaultFrom,
      subject,
      html,
      text,
    });
  }

  /**
   * Envía el acta pericial vehicular (entrega o devolución) con evidencias en R2
   */
  async sendActaInspeccion(options: {
    to: EmailRecipient;
    datos: InspeccionTemplateProps;
  }): Promise<EmailResult> {
    const { subject, html, text } = renderInspeccionTemplate(options.datos);

    return this.sender.send({
      to: options.to,
      from: this.defaultFrom,
      subject,
      html,
      text,
    });
  }
}
