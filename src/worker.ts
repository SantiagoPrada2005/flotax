import { handle } from '@astrojs/cloudflare/handler';
import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import {
  ejecutarAlertasDiariasDocumentos,
  type EnvAlertasDocumentos,
} from '@/lib/documentos-vehiculo';

export default {
  fetch: handle,
  async scheduled(
    _controller: ScheduledController,
    env: EnvAlertasDocumentos,
    ctx: ExecutionContext
  ): Promise<void> {
    ctx.waitUntil(ejecutarAlertasDiariasDocumentos(env));
  },
};
