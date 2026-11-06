import { esModoOscuroActivo } from '@/lib/theme';

/**
 * Utilidades centralizadas para invocar la pantalla de carga cinética canónica de FlotaX.
 * Emite el evento personalizado 'flotax:loading' consumido por PwaRuntimeIsland.
 */

export type FlotaxLoadingVariant = 'orbital' | 'cad';

export interface FlotaxLoadingOptions {
  label?: string;
  variant?: FlotaxLoadingVariant;
}

/**
 * Resuelve la variante canónica para transiciones entre Modo Dueño y Modo Personal:
 * - Modo Claro:
 *   - Dueño → Personal: 'orbital' (animación original sin cambios)
 *   - Personal → Dueño: 'cad' (animación original sin cambios)
 * - Modo Oscuro:
 *   - Dueño → Personal: 'orbital' (animación correcta actual)
 *   - Personal → Dueño: 'orbital' (exactamente la misma animación correcta de Dueño → Personal)
 */
export function resolverVarianteTransicionPortal(
  direccion: 'DUEÑO_A_PERSONAL' | 'PERSONAL_A_DUEÑO'
): FlotaxLoadingVariant {
  if (direccion === 'DUEÑO_A_PERSONAL') {
    return 'orbital';
  }
  // PERSONAL_A_DUEÑO:
  // En modo oscuro se unifica con 'orbital' (fondo sólido #111827).
  // En modo claro se preserva estrictamente la animación original 'cad'.
  return esModoOscuroActivo() ? 'orbital' : 'cad';
}

/**
 * Activa la pantalla de carga cinética a pantalla completa con el logotipo y spinner.
 * Por defecto usa la variante canónica 'orbital'.
 */
export function activarFlotaxLoading(
  label = 'CARGANDO ENTORNO OPERATIVO...',
  variant: FlotaxLoadingVariant = 'orbital'
): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('flotax:loading', {
      detail: {
        visible: true,
        label,
        variant,
      },
    })
  );
}

/**
 * Desactiva la pantalla de carga cinética de FlotaX.
 */
export function desactivarFlotaxLoading(): void {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent('flotax:loading', {
      detail: {
        visible: false,
      },
    })
  );
}

