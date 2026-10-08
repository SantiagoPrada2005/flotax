import type { SendEmail, D1Database } from '@cloudflare/workers-types';
import type { ILogger, ILogSink, LogContext, AlertThrottleConfig } from './types';
import { Logger } from './logger';
import { ConsoleLogSink } from './sinks/console-sink';
import { EmailAlertSink } from './sinks/email-alert-sink';
import { getEmailService } from '@/lib/email';

export interface LoggerEnvContext {
  DB?: D1Database | undefined;
  EMAIL?: SendEmail | undefined;
  EMAIL_DEFAULT_FROM?: string | undefined;
  EMAIL_AUTH_FROM?: string | undefined;
  EMAIL_ALERTS_FROM?: string | undefined;
  ALERT_DEVELOPER_EMAILS?: string | undefined;
  APP_ENV?: string | undefined;
  [key: string]: unknown;
}

/**
 * Parsea una lista de correos separados por comas o espacios
 */
function parseDeveloperEmails(rawEmails?: string): string[] {
  if (!rawEmails) return [];
  return rawEmails
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && e.includes('@'));
}

/**
 * Factoría oficial que inicializa y resuelve el Logger canónico para FlotaX
 */
export function getLogger(
  envContext?: LoggerEnvContext | undefined,
  initialContext?: LogContext | undefined
): ILogger {
  const environment = envContext?.APP_ENV || 'development';
  const isProduction = environment === 'production';

  const sinks: ILogSink[] = [
    new ConsoleLogSink(isProduction),
  ];

  // Configuración de alertas tempranas a desarrolladores
  const developerEmails = parseDeveloperEmails(envContext?.ALERT_DEVELOPER_EMAILS);
  const alertsFrom =
    envContext?.EMAIL_ALERTS_FROM || 'FlotaX Alertas <soporte@flotax.innovaweb.pro>';

  // Si hay correos de desarrolladores especificados, activar el EmailAlertSink
  if (developerEmails.length > 0) {
    const emailService = getEmailService(envContext);

    const alertConfig: AlertThrottleConfig = {
      cooldownMinutes: 15,
      spikeThreshold: 5,
      maxAlertsPerHour: 15,
      developerEmails,
      alertsFrom,
      environment,
    };

    sinks.push(new EmailAlertSink(emailService, alertConfig, envContext?.DB));
  }

  return new Logger(sinks, initialContext || {});
}

export * from './types';
export * from './logger';
export * from './serializer';
export * from './sinks/console-sink';
export * from './sinks/email-alert-sink';
export * from './alerts/fingerprint';
export * from './alerts/throttle';
