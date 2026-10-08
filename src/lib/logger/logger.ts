import type {
  ILogger,
  ILogSink,
  LogContext,
  LogEntry,
  LogLevel,
} from './types';
import { cleanLogContext, serializeError } from './serializer';

export class Logger implements ILogger {
  constructor(
    private readonly sinks: ILogSink[],
    private readonly context: LogContext = {}
  ) {}

  withContext(extraContext: LogContext): ILogger {
    return new Logger(this.sinks, {
      ...this.context,
      ...cleanLogContext(extraContext),
    });
  }

  debug(message: string, context?: LogContext): void {
    this.dispatch('debug', message, undefined, context);
  }

  info(message: string, context?: LogContext): void {
    this.dispatch('info', message, undefined, context);
  }

  warn(message: string, errorOrContext?: unknown, context?: LogContext): void {
    let error: unknown = undefined;
    let extraContext: LogContext | undefined = context;

    if (errorOrContext instanceof Error) {
      error = errorOrContext;
    } else if (typeof errorOrContext === 'object' && errorOrContext !== null && !context) {
      extraContext = errorOrContext as LogContext;
    }

    this.dispatch('warn', message, error, extraContext);
  }

  async error(message: string, error?: unknown, context?: LogContext): Promise<void> {
    await this.dispatchAsync('error', message, error, context);
  }

  async fatal(message: string, error?: unknown, context?: LogContext): Promise<void> {
    await this.dispatchAsync('fatal', message, error, context);
  }

  private createEntry(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): LogEntry {
    const mergedContext = {
      ...this.context,
      ...(context ? cleanLogContext(context) : {}),
    };

    return {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      message,
      context: mergedContext,
      error: error ? serializeError(error) : undefined,
    };
  }

  private dispatch(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): void {
    const entry = this.createEntry(level, message, error, context);
    for (const sink of this.sinks) {
      try {
        const res = sink.write(entry);
        if (res instanceof Promise) {
          res.catch((err) =>
            console.error(`[Logger Sink ${sink.name} Error]:`, err)
          );
        }
      } catch (err) {
        console.error(`[Logger Sink ${sink.name} Sync Error]:`, err);
      }
    }
  }

  private async dispatchAsync(
    level: LogLevel,
    message: string,
    error?: unknown,
    context?: LogContext
  ): Promise<void> {
    const entry = this.createEntry(level, message, error, context);
    for (const sink of this.sinks) {
      try {
        await sink.write(entry);
      } catch (err) {
        console.error(`[Logger Sink ${sink.name} Async Error]:`, err);
      }
    }
  }
}
