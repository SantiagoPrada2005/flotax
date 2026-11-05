/**
 * Sistema Canónico de Gestión de Temas (Claro, Oscuro, Sistema) - FlotaX
 */

export type TipoTema = 'claro' | 'oscuro' | 'sistema';

export const STORAGE_KEY_TEMA = 'flotax_theme';

/**
 * Obtiene la preferencia de tema guardada en el cliente o el valor por defecto ('sistema').
 */
export function obtenerTemaActual(): TipoTema {
  if (typeof window === 'undefined') return 'sistema';
  try {
    const guardado = localStorage.getItem(STORAGE_KEY_TEMA);
    if (guardado === 'claro' || guardado === 'oscuro' || guardado === 'sistema') {
      return guardado;
    }
  } catch {
    // Entornos sin acceso a storage
  }
  return 'sistema';
}

/**
 * Determina si la interfaz debe mostrarse en modo oscuro según el tema seleccionado
 * y las preferencias actuales del sistema operativo.
 */
export function determinarEsOscuro(tema: TipoTema): boolean {
  if (tema === 'oscuro') return true;
  if (tema === 'claro') return false;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

/**
 * Aplica el tema inmediatamente en el DOM (clase 'dark' y atributo data-theme)
 * y persiste la selección en localStorage y cookies.
 */
export function aplicarTema(tema: TipoTema): void {
  if (typeof window === 'undefined') return;

  const esOscuro = determinarEsOscuro(tema);

  try {
    localStorage.setItem(STORAGE_KEY_TEMA, tema);
    document.cookie = `${STORAGE_KEY_TEMA}=${tema}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Storage restringido
  }

  if (esOscuro) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
  }

  window.dispatchEvent(
    new CustomEvent('flotax:theme-change', {
      detail: { tema, esOscuro },
    })
  );
}

/**
 * Registra un detector en tiempo real para cambios en la preferencia del sistema operativo
 * si el tema configurado es 'sistema'.
 */
export function registrarEscuchadorTemaSistema(): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleCambio = () => {
    const temaActual = obtenerTemaActual();
    if (temaActual === 'sistema') {
      aplicarTema('sistema');
    }
  };

  mediaQuery.addEventListener('change', handleCambio);

  return () => {
    mediaQuery.removeEventListener('change', handleCambio);
  };
}

