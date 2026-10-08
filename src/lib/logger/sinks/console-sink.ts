import type { ILogSink, LogEntry } from '../types';

export class ConsoleLogSink implements ILogSink {
  readonly name = 'console';

  constructor(private readonly isProduction: boolean = false) {}

  write(entry: LogEntry): void {
    if (this.isProduction) {
      // Formato JSON estructurado para Cloudflare Observability y Logpush
      const serialized = JSON.stringify(entry);
      if (entry.level === 'error' || entry.level === 'fatal') {
        console.error(serialized);
      } else if (entry.level === 'warn') {
        console.warn(serialized);
      } else {
        console.log(serialized);
      }
      return;
    }

    // Formato legible en desarrollo local (terminal)
    const levelBadge = `[${entry.level.toUpperCase()}]`;
    const time = entry.timestamp.split('T')[1]?.replace('Z', '') || entry.timestamp;
    const prefix = `${time} ${levelBadge}`;

    if (entry.level === 'error' || entry.level === 'fatal') {
      console.error(`${prefix} ${entry.message}`, {
        context: entry.context,
        error: entry.error,
      });
      if (entry.error?.stack) {
        console.error(entry.error.stack);
      }
    } else if (entry.level === 'warn') {
      console.warn(`${prefix} ${entry.message}`, {
        context: entry.context,
        error: entry.error,
      });
    } else if (entry.level === 'info') {
      console.info(`${prefix} ${entry.message}`, Object.keys(entry.context).length > 0 ? entry.context : '');
    } else {
      console.debug(`${prefix} ${entry.message}`, entry.context);
    }
  }
}
