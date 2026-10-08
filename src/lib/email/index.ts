import type { SendEmail } from '@cloudflare/workers-types';
import {
  EmailService,
  CloudflareEmailAdapter,
  ConsoleEmailAdapter,
  type EmailServiceConfig,
} from './service';

export interface EmailEnvContext {
  EMAIL?: SendEmail | undefined;
  EMAIL_DEFAULT_FROM?: string | undefined;
  EMAIL_AUTH_FROM?: string | undefined;
  [key: string]: unknown;
}

/**
 * Factoría que inicializa y resuelve la instancia adecuada de EmailService
 * detectando si el binding de Cloudflare EMAIL está disponible en el runtime actual.
 */
export function getEmailService(env?: EmailEnvContext | undefined): EmailService {
  const hasCfBinding = Boolean(
    env?.EMAIL && typeof env.EMAIL.send === 'function'
  );

  const adapter = hasCfBinding
    ? new CloudflareEmailAdapter(env!.EMAIL!)
    : new ConsoleEmailAdapter();

  const config: EmailServiceConfig = {};
  if (env?.EMAIL_DEFAULT_FROM) {
    config.defaultFrom = env.EMAIL_DEFAULT_FROM;
  }
  if (env?.EMAIL_AUTH_FROM) {
    config.authFrom = env.EMAIL_AUTH_FROM;
  }

  return new EmailService(adapter, config);
}

export * from './types';
export * from './service';
export * from './templates';
