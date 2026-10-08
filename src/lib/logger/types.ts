export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  requestId?: string | undefined;
  userId?: string | undefined;
  localId?: string | undefined;
  path?: string | undefined;
  method?: string | undefined;
  action?: string | undefined;
  module?: string | undefined;
  colocation?: string | undefined;
  ip?: string | undefined;
  userAgent?: string | undefined;
  [key: string]: unknown;
}

export interface SerializedError {
  name: string;
  message: string;
  stack?: string | undefined;
  cause?: unknown;
  code?: string | number | undefined;
  details?: unknown;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  error?: SerializedError | undefined;
}

export interface ILogSink {
  readonly name: string;
  write(entry: LogEntry): Promise<void> | void;
}

export interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, errorOrContext?: unknown, context?: LogContext): void;
  error(message: string, error?: unknown, context?: LogContext): Promise<void>;
  fatal(message: string, error?: unknown, context?: LogContext): Promise<void>;
  withContext(extraContext: LogContext): ILogger;
}

export interface AlertThrottleConfig {
  /** Minutos de supresión para una misma huella de error (por defecto: 15) */
  cooldownMinutes: number;
  /** Umbral de ocurrencias en enfriamiento para detonar alerta de ráfaga (por defecto: 5) */
  spikeThreshold: number;
  /** Límite global de correos por hora para proteger cuotas (por defecto: 15) */
  maxAlertsPerHour: number;
  /** Lista de correos de desarrolladores destinatarios */
  developerEmails: string[];
  /** Remitente oficial de alertas */
  alertsFrom: string;
  /** Entorno de ejecución: production, staging, development */
  environment: string;
}
