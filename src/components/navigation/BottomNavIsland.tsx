import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useId,
  type ReactNode,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { navigate } from 'astro:transitions/client';
import { DICCIONARIOS, obtenerIdiomaActual, type Idioma } from '@/lib/i18n';
import { resolverVarianteDock, type ModoPortal } from '@/lib/auth/portal-modo';
import {
  LIQUID_DOCK_GEOMETRY,
  buildLiquidNotchPath,
  computeIconProximity,
} from './liquid-notch';

export interface BottomNavIslandProps {
  currentPath: string;
  activeTab?: ('home' | 'metrics' | 'search' | 'fleet' | 'wallet' | 'profile') | undefined;
  variant?: ('admin' | 'client') | undefined;
  modoPortal?: ModoPortal | undefined;
  className?: string | undefined;
}

interface NavItem {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  icon: (active: boolean) => ReactNode;
}

const FALLBACK_STEP = 50; // 44px (w-11) + 6px (gap-1.5)
const FALLBACK_FIRST_CENTER = 28; // 6px padding + 22px half-tab
const FALLBACK_HEIGHT = 56; // 6px + 44px + 6px
const SPRING_OMEGA = 14.5;
const SPRING_ZETA = 0.92;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function resolveTabIndexForPath(path: string, list: NavItem[]): number {
  return list.findIndex((item) => {
    if (item.href === '/admin') {
      return path === '/admin' || path === '/admin/';
    }
    if (item.href === '/catalogo') {
      return (
        path === '/' ||
        path.startsWith('/c/') ||
        path.startsWith('/catalogo') ||
        path.startsWith('/vehiculos')
      );
    }
    return path.startsWith(item.href);
  });
}

export default function BottomNavIsland({
  currentPath,
  activeTab,
  variant = 'client',
  modoPortal,
  className = '',
}: BottomNavIslandProps) {
  const [livePath, setLivePath] = useState(currentPath);
  const [liveModoPortal, setLiveModoPortal] = useState<string | undefined>(modoPortal);
  const [idioma, setIdioma] = useState<Idioma>('es');

  const rawUid = useId();
  const uid = rawUid.replace(/:/g, '');
  const shadowLightFilterId = `flotax-dock-shadow-light-${uid}`;
  const shadowDarkFilterId = `flotax-dock-shadow-dark-${uid}`;
  const innerRimClipId = `flotax-dock-inner-clip-${uid}`;

  useEffect(() => {
    setIdioma(obtenerIdiomaActual());
    const handleI18nChange = (e: Event) => {
      const custom = e as CustomEvent<{ idioma: Idioma }>;
      if (custom.detail?.idioma) {
        setIdioma(custom.detail.idioma);
      }
    };
    window.addEventListener('flotax:i18n-change', handleI18nChange);
    return () => window.removeEventListener('flotax:i18n-change', handleI18nChange);
  }, []);

  const t = DICCIONARIOS[idioma];

  const isInitialPath = livePath === currentPath;
  const effectiveTab = isInitialPath ? activeTab : undefined;
  const isAdmin =
    resolverVarianteDock(
      livePath,
      liveModoPortal,
      isInitialPath ? variant : undefined
    ) === 'admin';

  const isAdminHome =
    effectiveTab === 'home' || livePath === '/admin' || livePath === '/admin/';
  const isAdminMetrics =
    effectiveTab === 'metrics' ||
    livePath.startsWith('/admin/metricas') ||
    livePath.startsWith('/admin/reportes');
  const isAdminFleet =
    effectiveTab === 'fleet' || livePath.startsWith('/admin/flota');
  const isAdminOps =
    effectiveTab === 'search' ||
    livePath.startsWith('/admin/operaciones') ||
    livePath.startsWith('/admin/reservas');
  const isAdminCash =
    effectiveTab === 'wallet' || livePath.startsWith('/admin/caja');

  const isClientCatalog =
    effectiveTab === 'home' ||
    livePath === '/' ||
    livePath.startsWith('/c/') ||
    livePath.startsWith('/catalogo') ||
    livePath.startsWith('/vehiculos');
  const isClientBookings =
    effectiveTab === 'search' ||
    livePath.startsWith('/reservas') ||
    livePath.startsWith('/alquilar');
  const isClientProfile =
    effectiveTab === 'profile' || livePath.startsWith('/perfil');

  const adminItems: NavItem[] = [
    {
      key: 'home',
      label: t.nav.panelPatio,
      href: '/admin',
      isActive: isAdminHome,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
    },
    {
      key: 'metrics',
      label: t.nav.metricas,
      href: '/admin/metricas',
      isActive: isAdminMetrics,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.4 : 1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <line x1="18" x2="18" y1="20" y2="10" />
          <line x1="12" x2="12" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="14" />
        </svg>
      ),
    },
    {
      key: 'fleet',
      label: t.nav.flota,
      href: '/admin/flota',
      isActive: isAdminFleet,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
          <circle cx="7" cy="17" r="2" />
          <path d="M9 17h6" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      ),
    },
    {
      key: 'ops',
      label: t.nav.reservas,
      href: '/admin/reservas',
      isActive: isAdminOps,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      key: 'cash',
      label: t.nav.caja,
      href: '/admin/caja',
      isActive: isAdminCash,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        </svg>
      ),
    },
  ];

  const clientItems: NavItem[] = [
    {
      key: 'catalog',
      label: t.nav.catalogo,
      href: '/catalogo',
      isActive: isClientCatalog,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    {
      key: 'bookings',
      label: t.nav.reservas,
      href: '/reservas',
      isActive: isClientBookings,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
    {
      key: 'profile',
      label: t.nav.perfil,
      href: '/perfil',
      isActive: isClientProfile,
      icon: (active) => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={active ? 2.3 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  const items = isAdmin ? adminItems : clientItems;
  const initialActiveIndex = Math.max(0, items.findIndex((i) => i.isActive));

  const [selectedIndex, setSelectedIndex] = useState(initialActiveIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(initialActiveIndex);
  const [dockDims, setDockDims] = useState<{ width: number; height: number }>(() => ({
    width: items.length * FALLBACK_STEP + 6,
    height: FALLBACK_HEIGHT,
  }));

  // DOM & layout measurement refs
  const dockRef = useRef<HTMLDivElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<HTMLDivElement>(null);
  const shadowLightPathRef = useRef<SVGPathElement>(null);
  const shadowDarkPathRef = useRef<SVGPathElement>(null);
  const borderOuterPathRef = useRef<SVGPathElement>(null);
  const borderInnerPathRef = useRef<SVGPathElement>(null);
  const clipPathNodeRef = useRef<SVGPathElement>(null);
  const tabRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const iconRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const dimsRef = useRef<{ width: number; height: number }>({
    width: items.length * FALLBACK_STEP + 6,
    height: FALLBACK_HEIGHT,
  });
  const tabCentersRef = useRef<number[]>(
    items.map((_, i) => FALLBACK_FIRST_CENTER + i * FALLBACK_STEP),
  );
  const prevItemCountRef = useRef<number>(items.length);

  // Spring & gesture tracking refs (zero-re-render 60/120fps updates)
  const initialCx = FALLBACK_FIRST_CENTER + initialActiveIndex * FALLBACK_STEP;
  const currentCxRef = useRef<number>(initialCx);
  const targetCxRef = useRef<number>(initialCx);
  const targetIndexRef = useRef<number>(initialActiveIndex);
  const velocityRef = useRef<number>(0);
  const tabLiftRef = useRef<number[]>(
    items.map((_, i) => (i === initialActiveIndex ? 1 : 0)),
  );
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const isDraggingRef = useRef<boolean>(false);
  const pointerStartX = useRef<number>(0);
  const initialDragCx = useRef<number>(initialCx);
  const isPointerDown = useRef<boolean>(false);
  const hasMovedSignificantly = useRef<boolean>(false);
  const hoverIndexRef = useRef<number>(initialActiveIndex);

  const triggerHaptic = (ms: number = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar si el navegador bloquea vibración
      }
    }
  };

  const getTabCenter = useCallback((index: number): number => {
    const measured = tabCentersRef.current[index];
    if (measured !== undefined) return measured;
    return FALLBACK_FIRST_CENTER + index * FALLBACK_STEP;
  }, []);

  const findClosestTabIndex = useCallback((cx: number): number => {
    const centers = tabCentersRef.current;
    if (centers.length === 0) return 0;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < centers.length; i += 1) {
      const center = centers[i];
      if (center === undefined) continue;
      const dist = Math.abs(cx - center);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    return bestIdx;
  }, []);

  const applyVisualFrame = useCallback((cx: number) => {
    const { width, height } = dimsRef.current;
    const notchPath = buildLiquidNotchPath(width, height, cx);
    const clipValue = `path('${notchPath}')`;

    if (glassRef.current) {
      glassRef.current.style.clipPath = clipValue;
      glassRef.current.style.setProperty('-webkit-clip-path', clipValue);
    }
    if (shadowLightPathRef.current) {
      shadowLightPathRef.current.setAttribute('d', notchPath);
    }
    if (shadowDarkPathRef.current) {
      shadowDarkPathRef.current.setAttribute('d', notchPath);
    }
    if (borderOuterPathRef.current) {
      borderOuterPathRef.current.setAttribute('d', notchPath);
    }
    if (borderInnerPathRef.current) {
      borderInnerPathRef.current.setAttribute('d', notchPath);
    }
    if (clipPathNodeRef.current) {
      clipPathNodeRef.current.setAttribute('d', notchPath);
    }

    if (circleRef.current) {
      const r = LIQUID_DOCK_GEOMETRY.circleRadius;
      const circleX = cx - r;
      const circleY = LIQUID_DOCK_GEOMETRY.circleCenterY - r;
      circleRef.current.style.transform = `translate3d(${circleX.toFixed(2)}px, ${circleY.toFixed(2)}px, 0)`;
    }

    const iconLiftY = LIQUID_DOCK_GEOMETRY.circleCenterY - height / 2;
    const count = tabCentersRef.current.length;
    for (let i = 0; i < count; i += 1) {
      const span = iconRefs.current[i];
      const tabX = tabCentersRef.current[i];
      if (!span || tabX === undefined) continue;
      const overlap = computeIconProximity(cx, tabX);
      const lift = tabLiftRef.current[i] ?? 0;
      span.style.transform = `translate3d(0, ${(lift * iconLiftY).toFixed(2)}px, 0)`;
      span.style.color = overlap > 0.45 ? '#ffffff' : '';
    }
  }, []);

  const stopAnimationLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }, []);

  const stepAnimation = useCallback(
    (timestamp: number) => {
      const prevTime = lastFrameTimeRef.current;
      const rawDt = prevTime === null ? 1 / 60 : (timestamp - prevTime) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, rawDt));
      lastFrameTimeRef.current = timestamp;

      const target = targetCxRef.current;
      let cx = currentCxRef.current;
      let v = velocityRef.current;

      // Sub-stepping 4x para estabilidad numérica en tasas de refresco variables
      const subSteps = 4;
      const h = dt / subSteps;
      for (let s = 0; s < subSteps; s += 1) {
        const accel = -SPRING_OMEGA * SPRING_OMEGA * (cx - target) - 2 * SPRING_ZETA * SPRING_OMEGA * v;
        v += accel * h;
        cx += v * h;
      }

      const activeVisualIdx = isDraggingRef.current
        ? hoverIndexRef.current
        : targetIndexRef.current;

      const count = tabCentersRef.current.length;
      let liftsSettled = true;
      for (let i = 0; i < count; i += 1) {
        const tabX = tabCentersRef.current[i];
        if (tabX === undefined) continue;
        const overlap = computeIconProximity(cx, tabX);
        const currentLift = tabLiftRef.current[i] ?? 0;
        const desiredLift = i === activeVisualIdx ? overlap : 0;
        const nextLift =
          i === activeVisualIdx
            ? desiredLift
            : currentLift + (0 - currentLift) * (1 - Math.exp(-18 * dt));
        tabLiftRef.current[i] = Math.abs(nextLift - desiredLift) < 0.005 ? desiredLift : nextLift;
        if (Math.abs((tabLiftRef.current[i] ?? 0) - (i === activeVisualIdx ? 1 : 0)) > 0.005) {
          liftsSettled = false;
        }
      }

      const posSettled = Math.abs(cx - target) < 0.15 && Math.abs(v) < 1.5;
      if (posSettled && liftsSettled) {
        currentCxRef.current = target;
        velocityRef.current = 0;
        for (let i = 0; i < count; i += 1) {
          tabLiftRef.current[i] = i === activeVisualIdx ? 1 : 0;
        }
        applyVisualFrame(target);
        stopAnimationLoop();
        return;
      }

      currentCxRef.current = cx;
      velocityRef.current = v;
      applyVisualFrame(cx);
      rafIdRef.current = requestAnimationFrame(stepAnimation);
    },
    [applyVisualFrame, stopAnimationLoop],
  );

  const startAnimationLoop = useCallback(() => {
    if (rafIdRef.current !== null) return;
    lastFrameTimeRef.current = null;
    rafIdRef.current = requestAnimationFrame(stepAnimation);
  }, [stepAnimation]);

  const moveIndicatorToTab = useCallback(
    (index: number, immediate: boolean = false) => {
      const nextCx = getTabCenter(index);
      targetIndexRef.current = index;
      targetCxRef.current = nextCx;

      if (immediate || prefersReducedMotion()) {
        stopAnimationLoop();
        currentCxRef.current = nextCx;
        velocityRef.current = 0;
        tabLiftRef.current = tabCentersRef.current.map((_, i) => (i === index ? 1 : 0));
        applyVisualFrame(nextCx);
        return;
      }

      startAnimationLoop();
    },
    [applyVisualFrame, getTabCenter, startAnimationLoop, stopAnimationLoop],
  );

  // Medición dinámica real del ancho de la barra y centro de cada opción
  const measureDockLayout = useCallback(() => {
    const dockEl = dockRef.current;
    if (!dockEl) return;

    const width = dockEl.clientWidth;
    const height = dockEl.clientHeight;
    if (width <= 0 || height <= 0) return;

    const centers: number[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const tabEl = tabRefs.current[i];
      if (tabEl) {
        centers.push(tabEl.offsetLeft + tabEl.offsetWidth / 2);
      } else {
        centers.push(FALLBACK_FIRST_CENTER + i * FALLBACK_STEP);
      }
    }

    tabCentersRef.current = centers;
    const prevDims = dimsRef.current;
    if (prevDims.width !== width || prevDims.height !== height) {
      dimsRef.current = { width, height };
      setDockDims({ width, height });
    }

    const portalChanged = prevItemCountRef.current !== items.length;
    prevItemCountRef.current = items.length;

    const activeCenter = centers[targetIndexRef.current] ?? FALLBACK_FIRST_CENTER;
    targetCxRef.current = activeCenter;

    if (portalChanged || rafIdRef.current === null) {
      currentCxRef.current = activeCenter;
      velocityRef.current = 0;
      tabLiftRef.current = centers.map((_, i) => (i === targetIndexRef.current ? 1 : 0));
      applyVisualFrame(activeCenter);
    }
  }, [applyVisualFrame, items.length]);

  const isFormPage =
    livePath.startsWith('/admin/flota/nuevo') ||
    (livePath.startsWith('/admin/flota/') && livePath.includes('/editar')) ||
    livePath.startsWith('/alquilar') ||
    livePath.includes('/entrega');

  useLayoutEffect(() => {
    if (isFormPage) return;
    measureDockLayout();

    const dockEl = dockRef.current;
    if (!dockEl || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      measureDockLayout();
    });
    observer.observe(dockEl);
    return () => observer.disconnect();
  }, [isFormPage, items.length, idioma, measureDockLayout]);

  useEffect(() => {
    return () => stopAnimationLoop();
  }, [stopAnimationLoop]);

  // Sincronización con navegación SPA (ClientRouter) y botón Atrás/Adelante
  useEffect(() => {
    const updateTabFromPath = () => {
      const path = window.location.pathname;
      const datasetModo = document.documentElement.dataset.portalModo;
      setLivePath(path);
      setLiveModoPortal(datasetModo);

      const nextIsAdmin =
        resolverVarianteDock(path, datasetModo, variant) === 'admin';
      const nextItems = nextIsAdmin ? adminItems : clientItems;
      const idx = resolveTabIndexForPath(path, nextItems);
      const portalSwitched = nextItems.length !== prevItemCountRef.current;

      if (idx !== -1) {
        if (portalSwitched || idx !== targetIndexRef.current) {
          setSelectedIndex(idx);
          setHoverIndex(idx);
          hoverIndexRef.current = idx;
          moveIndicatorToTab(idx, portalSwitched);
        }
      } else if (portalSwitched || targetIndexRef.current >= nextItems.length) {
        setSelectedIndex(0);
        setHoverIndex(0);
        hoverIndexRef.current = 0;
        moveIndicatorToTab(0, true);
      }
    };

    updateTabFromPath();
    document.addEventListener('astro:page-load', updateTabFromPath);
    window.addEventListener('popstate', updateTabFromPath);

    return () => {
      document.removeEventListener('astro:page-load', updateTabFromPath);
      window.removeEventListener('popstate', updateTabFromPath);
    };
  }, [currentPath, variant, moveIndicatorToTab]);

  // Seguimiento de gestos táctiles/puntero a nivel de ventana
  useEffect(() => {
    const handleWindowPointerMove = (e: globalThis.PointerEvent) => {
      if (!isPointerDown.current) return;

      const deltaX = e.clientX - pointerStartX.current;
      if (!hasMovedSignificantly.current && Math.abs(deltaX) > 4) {
        hasMovedSignificantly.current = true;
        isDraggingRef.current = true;
        setIsDragging(true);
        stopAnimationLoop();
        velocityRef.current = 0;
        triggerHaptic(6);
      }

      if (hasMovedSignificantly.current) {
        const centers = tabCentersRef.current;
        const minCx = centers[0] ?? FALLBACK_FIRST_CENTER;
        const maxCx = centers[centers.length - 1] ?? minCx;
        let nextCx = initialDragCx.current + deltaX;

        // Resistencia elástica Apple en extremos
        if (nextCx < minCx) {
          nextCx = minCx + (nextCx - minCx) * 0.25;
        } else if (nextCx > maxCx) {
          nextCx = maxCx + (nextCx - maxCx) * 0.25;
        }

        currentCxRef.current = nextCx;
        const currentHover = findClosestTabIndex(nextCx);
        if (currentHover !== hoverIndexRef.current) {
          hoverIndexRef.current = currentHover;
          setHoverIndex(currentHover);
          triggerHaptic(4);
        }

        for (let i = 0; i < centers.length; i += 1) {
          const tabX = centers[i];
          if (tabX === undefined) continue;
          const overlap = computeIconProximity(nextCx, tabX);
          tabLiftRef.current[i] = i === currentHover ? overlap : 0;
        }

        applyVisualFrame(nextCx);
      }
    };

    const handleWindowPointerUp = () => {
      if (!isPointerDown.current) return;
      isPointerDown.current = false;

      if (hasMovedSignificantly.current) {
        isDraggingRef.current = false;
        setIsDragging(false);

        const targetIndex = findClosestTabIndex(currentCxRef.current);
        setSelectedIndex(targetIndex);
        setHoverIndex(targetIndex);
        hoverIndexRef.current = targetIndex;
        triggerHaptic(10);
        moveIndicatorToTab(targetIndex);

        const targetItem = items[targetIndex];
        if (targetItem && targetItem.href !== window.location.pathname) {
          setLivePath(targetItem.href);
          navigate(targetItem.href);
        }
      } else {
        isDraggingRef.current = false;
        setIsDragging(false);
        setHoverIndex(selectedIndex);
        hoverIndexRef.current = selectedIndex;
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);

    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
    };
  }, [
    applyVisualFrame,
    findClosestTabIndex,
    items,
    moveIndicatorToTab,
    selectedIndex,
    stopAnimationLoop,
  ]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerStartX.current = e.clientX;
    isPointerDown.current = true;
    hasMovedSignificantly.current = false;

    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const touchX = e.clientX - rect.left;
      const distToCurrent = Math.abs(touchX - currentCxRef.current);
      if (distToCurrent < 30) {
        initialDragCx.current = currentCxRef.current;
      } else {
        const touchedIdx = findClosestTabIndex(touchX);
        initialDragCx.current = getTabCenter(touchedIdx);
      }
    } else {
      initialDragCx.current = currentCxRef.current;
    }
  };

  const handleTabClick = (e: MouseEvent<HTMLAnchorElement>, index: number, href: string) => {
    e.preventDefault();
    if (hasMovedSignificantly.current) return;

    if (index !== selectedIndex || targetIndexRef.current !== index) {
      setSelectedIndex(index);
      setHoverIndex(index);
      hoverIndexRef.current = index;
      triggerHaptic(10);
      moveIndicatorToTab(index);
      if (href !== window.location.pathname) {
        setLivePath(href);
        navigate(href);
      }
    }
  };

  if (isFormPage) {
    return null;
  }

  const activeVisualIndex = isDragging ? hoverIndex : selectedIndex;
  const renderCx = getTabCenter(activeVisualIndex);
  const initialNotchPath = buildLiquidNotchPath(dockDims.width, dockDims.height, renderCx);
  const initialCircleX = renderCx - LIQUID_DOCK_GEOMETRY.circleRadius;
  const initialCircleY =
    LIQUID_DOCK_GEOMETRY.circleCenterY - LIQUID_DOCK_GEOMETRY.circleRadius;
  const initialIconLiftY = LIQUID_DOCK_GEOMETRY.circleCenterY - dockDims.height / 2;

  return (
    <nav
      aria-label={t.nav.inicio}
      style={{ viewTransitionName: 'flotax-bottom-nav' }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden pointer-events-auto select-none ${className}`}
    >
      {/* Contenedor principal del dock: conserva dimensiones, distribución y touch targets exactos */}
      <div
        ref={dockRef}
        role="tablist"
        aria-orientation="horizontal"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
        className="relative flex items-center gap-1.5 rounded-full p-1.5 border border-transparent select-none cursor-grab active:cursor-grabbing"
      >
        {/* Capa 1: Sombra exterior que sigue fielmente la muesca cóncava sin bloquear backdrop-filter */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${dockDims.width} ${dockDims.height}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <filter id={shadowLightFilterId} x="-35%" y="-50%" width="170%" height="240%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="11" result="blur" />
              <feOffset in="blur" dx="0" dy="10" result="offsetBlur" />
              <feFlood floodColor="#111827" floodOpacity="0.22" result="flood" />
              <feComposite in="flood" in2="offsetBlur" operator="in" result="shadow" />
              <feComposite in="shadow" in2="SourceAlpha" operator="out" />
            </filter>
            <filter id={shadowDarkFilterId} x="-35%" y="-50%" width="170%" height="240%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="12" result="blur" />
              <feOffset in="blur" dx="0" dy="10" result="offsetBlur" />
              <feFlood floodColor="#000000" floodOpacity="0.58" result="flood" />
              <feComposite in="flood" in2="offsetBlur" operator="in" result="shadow" />
              <feComposite in="shadow" in2="SourceAlpha" operator="out" />
            </filter>
          </defs>
          <path
            ref={shadowLightPathRef}
            d={initialNotchPath}
            fill="#111827"
            filter={`url(#${shadowLightFilterId})`}
            className="dark:hidden"
          />
          <path
            ref={shadowDarkPathRef}
            d={initialNotchPath}
            fill="#000000"
            filter={`url(#${shadowDarkFilterId})`}
            className="hidden dark:block"
          />
        </svg>

        {/* Capa 2: Superficie translúcida recortada dinámicamente con la muesca cóncava real */}
        <div
          ref={glassRef}
          aria-hidden="true"
          className="flotax-liquid-dock-glass pointer-events-none absolute inset-0"
          style={{
            clipPath: `path('${initialNotchPath}')`,
            WebkitClipPath: `path('${initialNotchPath}')`,
          }}
        />

        {/* Capa 3: Borde continuo y reflejo especular adaptados al trazado de la muesca */}
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${dockDims.width} ${dockDims.height}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        >
          <defs>
            <clipPath id={innerRimClipId}>
              <path ref={clipPathNodeRef} d={initialNotchPath} />
            </clipPath>
          </defs>
          <path
            ref={borderInnerPathRef}
            d={initialNotchPath}
            fill="none"
            strokeWidth={2}
            clipPath={`url(#${innerRimClipId})`}
            className="stroke-white/75 dark:stroke-white/10"
          />
          <path
            ref={borderOuterPathRef}
            d={initialNotchPath}
            fill="none"
            strokeWidth={1}
            className="stroke-[#111827]/12 dark:stroke-white/12"
          />
        </svg>

        {/* Capa 4: Indicador circular activo perfectamente redondo sincronizado con la muesca */}
        <div
          ref={circleRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 z-10 h-10 w-10 rounded-full bg-[#111827] dark:bg-[#4B5563] shadow-[0_6px_18px_-2px_rgba(17,24,39,0.38)] dark:shadow-[0_6px_18px_-2px_rgba(0,0,0,0.48)] ring-1 ring-white/20 will-change-transform"
          style={{
            transform: `translate3d(${initialCircleX.toFixed(2)}px, ${initialCircleY.toFixed(2)}px, 0)`,
          }}
        />

        {/* Capa 5: Opciones de navegación e iconos */}
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const isCurrentVisual = index === activeVisualIndex;

          return (
            <a
              key={item.key}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              href={item.href}
              role="tab"
              aria-label={item.label}
              aria-selected={isSelected}
              aria-current={isSelected ? 'page' : undefined}
              draggable={false}
              data-astro-prefetch="tap"
              onClick={(e) => handleTabClick(e, index, item.href)}
              style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              className={`fx-pressable relative z-20 flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${
                isCurrentVisual
                  ? 'text-[#4B5563] dark:text-[#E5E7EB]'
                  : 'text-[#4B5563] dark:text-[#E5E7EB] hover:text-[#111827] dark:hover:text-white hover:bg-[#EDEDED]/60 dark:hover:bg-white/10'
              }`}
            >
              <span
                ref={(el) => {
                  iconRefs.current[index] = el;
                }}
                className="flotax-liquid-dock-icon pointer-events-none flex items-center justify-center"
                style={{
                  transform: isCurrentVisual
                    ? `translate3d(0, ${initialIconLiftY.toFixed(2)}px, 0)`
                    : 'translate3d(0, 0, 0)',
                  color: isCurrentVisual ? '#ffffff' : undefined,
                }}
              >
                {item.icon(isCurrentVisual)}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
