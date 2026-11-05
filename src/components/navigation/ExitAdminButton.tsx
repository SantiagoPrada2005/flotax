import { useTransition } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  activarFlotaxLoading,
  desactivarFlotaxLoading,
  resolverVarianteTransicionPortal,
} from '@/lib/pwa';

export interface ExitAdminButtonProps {
  className?: string | undefined;
}

export default function ExitAdminButton({ className = '' }: ExitAdminButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleExit = () => {
    if (isPending) return;
    const variante = resolverVarianteTransicionPortal('DUEÑO_A_PERSONAL');
    activarFlotaxLoading('CONMUTANDO A PORTAL DE CLIENTE', variante);
    startTransition(async () => {
      try {
        const result = await actions.portal.cambiarModoPortal({ modo: 'CLIENTE' });
        if (result.data?.rutaDestino) {
          navigate(result.data.rutaDestino);
        } else {
          navigate('/catalogo');
        }
      } catch {
        desactivarFlotaxLoading();
        navigate('/catalogo');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleExit}
      disabled={isPending}
      className={`ios-press-bounce flex w-full items-center justify-between rounded-xl border border-border-subtle bg-surface-card px-3 py-2 text-xs font-semibold text-brand-primary transition hover:bg-surface-elevated disabled:opacity-50 ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">🚗</span>
        <span>{isPending ? 'Cambiando...' : 'Modo Personal (Alquilar)'}</span>
      </div>
      <span className="text-neutral-400">→</span>
    </button>
  );
}
