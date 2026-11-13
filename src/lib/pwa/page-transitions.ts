/**
 * Coordinador de transiciones horizontales sincronizadas entre pantallas
 * mediante Astro ClientRouter y la View Transitions API nativa.
 *
 * Determina la dirección del desplazamiento según el orden lógico de las
 * opciones de navegación del portal activo (Cliente o Admin), aislando el
 * contenido principal para que el TopBar, Sidebar y BottomNav permanezcan fijos.
 */

export type PageSlideDirection = 'slide-forward' | 'slide-back';

export interface NavOrderMatch {
  readonly portal: 'admin' | 'client';
  readonly index: number;
}

interface AstroNavigationEventLike {
  readonly from: URL;
  readonly to: URL;
  readonly newDocument?: Document;
  readonly viewTransition?: ViewTransition;
}

const ATTR_PAGE_TRANSITION = 'data-fx-page-transition';

let transitionsInitialized = false;
let currentTransitionToken = 0;

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isExcludedFormOrWizardPath(path: string): boolean {
  if (path === '/admin/flota/nuevo') return true;
  if (path.startsWith('/admin/flota/') && (path.endsWith('/editar') || path.endsWith('/disponibilidad'))) {
    return true;
  }
  if (path.startsWith('/alquilar')) return true;
  if (path.endsWith('/entrega')) return true;
  return false;
}

/**
 * Resuelve la posición lógica de una ruta dentro del menú de navegación activo.
 * Devuelve `null` si la ruta pertenece a flujos externos (landing, auth, wizards).
 */
export function resolveNavTabOrder(
  pathname: string,
  isDesktop: boolean = false,
): NavOrderMatch | null {
  const path = normalizePathname(pathname);
  if (isExcludedFormOrWizardPath(path)) {
    return null;
  }

  if (path === '/admin') {
    return { portal: 'admin', index: 0 };
  }
  if (path.startsWith('/admin/metricas') || path.startsWith('/admin/reportes')) {
    return { portal: 'admin', index: 1 };
  }
  if (path.startsWith('/admin/flota')) {
    return { portal: 'admin', index: isDesktop ? 3 : 2 };
  }
  if (path.startsWith('/admin/operaciones') || path.startsWith('/admin/reservas')) {
    return { portal: 'admin', index: isDesktop ? 2 : 3 };
  }
  if (path.startsWith('/admin/caja')) {
    return { portal: 'admin', index: 4 };
  }

  if (
    path.startsWith('/c/') ||
    path === '/c' ||
    path.startsWith('/catalogo') ||
    path.startsWith('/vehiculos')
  ) {
    return { portal: 'client', index: 0 };
  }
  if (path.startsWith('/reservas')) {
    return { portal: 'client', index: 1 };
  }
  if (path.startsWith('/perfil')) {
    return { portal: 'client', index: 2 };
  }

  return null;
}

/**
 * Calcula la dirección del deslizamiento horizontal entre dos rutas del mismo portal.
 */
export function resolveNavSlideDirection(
  fromPathname: string,
  toPathname: string,
  isDesktop: boolean = false,
): PageSlideDirection | null {
  const fromOrder = resolveNavTabOrder(fromPathname, isDesktop);
  const toOrder = resolveNavTabOrder(toPathname, isDesktop);

  if (!fromOrder || !toOrder) return null;
  if (fromOrder.portal !== toOrder.portal) return null;
  if (fromOrder.index === toOrder.index) return null;

  return toOrder.index > fromOrder.index ? 'slide-forward' : 'slide-back';
}

function isAstroNavigationEvent(event: Event): event is Event & AstroNavigationEventLike {
  return (
    typeof event === 'object' &&
    event !== null &&
    'from' in event &&
    'to' in event &&
    event.from instanceof URL &&
    event.to instanceof URL
  );
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setDirectionAttr(
  rootElement: HTMLElement | undefined,
  direction: PageSlideDirection | null,
): void {
  if (!rootElement) return;
  if (direction && !prefersReducedMotion()) {
    rootElement.setAttribute(ATTR_PAGE_TRANSITION, direction);
  } else {
    rootElement.removeAttribute(ATTR_PAGE_TRANSITION);
  }
}

/**
 * Registra los listeners globales de Astro ClientRouter para aplicar
 * transiciones horizontales direccionales en el contenedor principal.
 */
export function initHorizontalPageTransitions(): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (transitionsInitialized) return;
  transitionsInitialized = true;

  let activeFromPath = window.location.pathname;

  document.addEventListener('astro:before-preparation', (event) => {
    if (!isAstroNavigationEvent(event)) return;
    activeFromPath = event.from.pathname;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const direction = resolveNavSlideDirection(activeFromPath, event.to.pathname, isDesktop);
    setDirectionAttr(document.documentElement, direction);
  });

  document.addEventListener('astro:before-swap', (event) => {
    if (!isAstroNavigationEvent(event)) return;
    const isDesktop = window.matchMedia('(min-width: 768px)').matches;
    const direction = resolveNavSlideDirection(event.from.pathname, event.to.pathname, isDesktop);

    setDirectionAttr(document.documentElement, direction);
    setDirectionAttr(event.newDocument?.documentElement, direction);

    currentTransitionToken += 1;
    const token = currentTransitionToken;

    const cleanup = () => {
      if (token === currentTransitionToken) {
        document.documentElement.removeAttribute(ATTR_PAGE_TRANSITION);
      }
    };

    if (event.viewTransition && typeof event.viewTransition.finished?.finally === 'function') {
      void event.viewTransition.finished.finally(cleanup);
    } else {
      window.setTimeout(cleanup, 460);
    }
  });
}
