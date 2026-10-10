import type { D1Database } from '@cloudflare/workers-types';
import type { ILogSink, LogEntry, AlertThrottleConfig } from '../types';
import type { EmailService } from '@/lib/email';
import { computeErrorFingerprint } from '../alerts/fingerprint';
import { evaluateIncidentThrottle, recordIncidentDispatched } from '../alerts/throttle';
import { renderDeveloperAlertEmail } from '../templates/alert-email';

export class EmailAlertSink implements ILogSink {
  readonly name = 'email-alert';

  constructor(
    private readonly emailService: EmailService,
    private readonly config: AlertThrottleConfig,
    private readonly d1?: D1Database | undefined
  ) {}

  async write(entry: LogEntry): Promise<void> {
    // 1. Filtrar por umbral de severidad: solo 'error' y 'fatal' activan alertas a desarrolladores
    if (entry.level !== 'error' && entry.level !== 'fatal') {
      return;
    }

    // 2. Si no hay desarrolladores configurados, omitir
    if (!this.config.developerEmails || this.config.developerEmails.length === 0) {
      return;
    }

    try {
      // 3. Generar huella digital determinista
      const fingerprint = await computeErrorFingerprint(entry);

      // 4. Evaluar aceleración y mitigación de tormentas (Throttling)
      const decision = await evaluateIncidentThrottle(
        entry,
        fingerprint,
        this.config,
        this.d1
      );

      // Si el enfriamiento está activo o el disyuntor se activó, no enviar correo
      if (!decision.shouldDispatch) {
        return;
      }

      // 5. Construir contenido del correo
      const { subject, html, text } = renderDeveloperAlertEmail({
        entry,
        fingerprint,
        decision,
        config: this.config,
      });

      // 6. Despachar a todos los destinatarios configurados y verificar entrega efectiva
      let atLeastOneDispatched = false;
      for (const developerEmail of this.config.developerEmails) {
        const sendResult = await this.emailService.send({
          to: developerEmail,
          from: this.config.alertsFrom,
          subject,
          html,
          text,
        });

        if (sendResult.success) {
          atLeastOneDispatched = true;
        } else {
          console.error(
            `[EmailAlertSink Despacho Fallido a ${developerEmail}]: ${sendResult.error || sendResult.code || 'Desconocido'}`
          );
        }
      }

      // 7. Solo si se despachó al menos una alerta, registrar enfriamiento y actualizar D1
      if (atLeastOneDispatched) {
        await recordIncidentDispatched(
          this.d1,
          fingerprint,
          decision.incidentId,
          Date.now()
        );
      }
    } catch (sinkError) {
      // Fail-Safe: Una falla en el envío de la alerta NUNCA debe tumbar la petición
      console.error('[EmailAlertSink Fail-Safe Exception]:', sinkError);
    }
  }
}
