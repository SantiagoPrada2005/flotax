import { z } from 'zod';

export interface EmailAddress {
  email: string;
  name?: string | undefined;
}

export type EmailRecipient = string | EmailAddress;

export interface EmailAttachment {
  filename: string;
  content: string; // Base64 o string
  type: string;
  disposition?: 'attachment' | 'inline' | undefined;
  contentId?: string | undefined;
}

export interface SendEmailOptions {
  to: EmailRecipient | EmailRecipient[];
  from?: EmailRecipient | undefined;
  subject: string;
  html: string;
  text: string;
  replyTo?: EmailRecipient | undefined;
  cc?: EmailRecipient | EmailRecipient[] | undefined;
  bcc?: EmailRecipient | EmailRecipient[] | undefined;
  attachments?: EmailAttachment[] | undefined;
  headers?: Record<string, string> | undefined;
}

export interface EmailResult {
  success: boolean;
  messageId?: string | undefined;
  error?: string | undefined;
  code?: string | undefined;
}

export interface IEmailSender {
  send(options: SendEmailOptions): Promise<EmailResult>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAMED_EMAIL_REGEX = /^([^<]+)<([^\s@]+@[^\s@]+\.[^\s@]+)>$/;

export const emailRecipientSchema = z.union([
  z.string().refine(
    (val) => {
      const trimmed = val.trim();
      return EMAIL_REGEX.test(trimmed) || NAMED_EMAIL_REGEX.test(trimmed);
    },
    {
      error:
        'Debe ser una dirección de correo válida o formato "Nombre <correo@dominio.com>"',
    }
  ),
  z.object({
    email: z.string().refine((val) => EMAIL_REGEX.test(val.trim()), {
      error: 'Debe ser una dirección de correo válida',
    }),
    name: z.string().optional(),
  }),
]);

export const sendEmailSchema = z.object({
  to: z.union([emailRecipientSchema, z.array(emailRecipientSchema).nonempty()]),
  from: emailRecipientSchema.optional(),
  subject: z.string().min(1, { error: 'El asunto es obligatorio' }),
  html: z.string().min(1, { error: 'El contenido HTML es obligatorio' }),
  text: z.string().min(1, { error: 'El contenido de texto plano es obligatorio' }),
  replyTo: emailRecipientSchema.optional(),
  headers: z.record(z.string(), z.string()).optional(),
});

export interface OtpTemplateProps {
  code: string;
  type?: 'sign-in' | 'email-verification' | 'forget-password' | string | undefined;
  expiresInMinutes?: number | undefined;
}

export interface ReservaTemplateProps {
  clienteNombre: string;
  reservaNumero: string;
  vehiculoMarcaModelo: string;
  vehiculoPlaca: string;
  fechaInicio: string;
  fechaFin: string;
  localNombre: string;
  totalEstimado: string;
  depositoGarantia: string;
  enlaceDetalle?: string | undefined;
}

export interface InspeccionTemplateProps {
  clienteNombre: string;
  reservaNumero: string;
  vehiculoMarcaModelo: string;
  vehiculoPlaca: string;
  tipoInspeccion: 'ENTREGA' | 'DEVOLUCION';
  fechaInspeccion: string;
  kilometraje: number | string;
  nivelCombustible: string;
  danosDetectadosCount: number;
  enlaceActa?: string | undefined;
}
