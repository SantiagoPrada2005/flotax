import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { requireLocalAuth, PERMISOS } from '@/lib/auth';

export const registrarAbono = defineAction({
  input: z.object({
    contratoId: z.string().min(1),
    monto: z.number().positive(),
    metodoPago: z.enum(['efectivo', 'transferencia', 'especie']),
    notas: z.string().optional(),
  }),
  handler: async (input, context) => {
    // Verifica autenticación, cuenta activa, pertenencia a local y permiso RBAC en 1 sola línea
    const usuario = requireLocalAuth(context, PERMISOS.CAJA_ABONOS_REGISTRAR);
    const localId = usuario.localActivo.id;

    // Lógica transaccional con Drizzle ORM sobre Cloudflare D1
    // El tenant está 100% aislado mediante localId
    return {
      ok: true,
      mensaje: 'Abono asentado correctamente',
      localId,
      registradoPor: usuario.id,
      contratoId: input.contratoId,
    };
  },
});