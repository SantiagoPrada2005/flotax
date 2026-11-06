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
 * Determina si el modo oscuro está actualmente activo en el cliente.
 * Consulta la clase 'dark' o atributo data-theme en document.documentElement,
 * o resuelve según la preferencia guardada en localStorage y el sistema.
 */
export function esModoOscuroActivo(): boolean {
  if (typeof document !== 'undefined') {
    if (document.documentElement.classList.contains('dark')) return true;
    if (document.documentElement.getAttribute('data-theme') === 'dark') return true;
  }
  return determinarEsOscuro(obtenerTemaActual());
}

/**
 * Aplica el tema inmediatamente en el DOM (clase 'dark', atributo data-theme y meta theme-color),
 * utilizando View Transitions para un crossfade suave con halo azul canónico si está soportado,
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

  const mutarDOM = () => {
    const html = document.documentElement;
    if (esOscuro) {
      html.classList.add('dark');
      html.setAttribute('data-theme', 'dark');
      html.style.backgroundColor = '#111827';
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.setAttribute('data-theme', 'light');
      html.style.backgroundColor = '#ededed';
      html.style.colorScheme = 'light';
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', esOscuro ? '#111827' : '#EDEDED');
    }

    window.dispatchEvent(
      new CustomEvent('flotax:theme-change', {
        detail: { tema, esOscuro },
      })
    );
  };

  // View Transition pericial con animación sutil blanco/azul
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (
    !reduceMotion &&
    typeof document !== 'undefined' &&
    'startViewTransition' in document
  ) {
    document.documentElement.classList.add('flotax-theme-transitioning');
    const transicion = (document as Document & { startViewTransition: (cb: () => void) => { finished: Promise<void> } }).startViewTransition(() => {
      mutarDOM();
    });
    transicion.finished.finally(() => {
      document.documentElement.classList.remove('flotax-theme-transitioning');
    });
  } else {
    mutarDOM();
  }
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

