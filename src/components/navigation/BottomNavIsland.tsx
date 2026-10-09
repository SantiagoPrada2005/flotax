import { useState, useEffect, useRef, type ReactNode, type MouseEvent, type PointerEvent } from 'react';
import { navigate } from 'astro:transitions/client';

export interface BottomNavIslandProps {
  currentPath: string;
  activeTab?: ('home' | 'search' | 'fleet' | 'wallet' | 'profile') | undefined;
  variant?: ('admin' | 'client') | undefined;
  className?: string | undefined;
}

interface NavItem {
  key: string;
  label: string;
  href: string;
  isActive: boolean;
  icon: (active: boolean) => ReactNode;
}

const ITEM_STEP = 50; // 44px (w-11) + 6px (gap-1.5)

export default function BottomNavIsland({
  currentPath,
  activeTab,
  variant = 'client',
  className = '',
}: BottomNavIslandProps) {
  const isAdmin = variant === 'admin' || currentPath.startsWith('/admin');

  // Compute active states
  const isAdminHome = activeTab === 'home' || currentPath === '/admin' || currentPath === '/admin/';
  const isAdminFleet = activeTab === 'fleet' || currentPath.startsWith('/admin/flota');
  const isAdminOps =
    activeTab === 'search' ||
    currentPath.startsWith('/admin/operaciones') ||
    currentPath.startsWith('/admin/reservas');
  const isAdminCash = activeTab === 'wallet' || currentPath.startsWith('/admin/caja');

  const isClientCatalog =
    activeTab === 'home' ||
    currentPath === '/' ||
    currentPath.startsWith('/catalogo') ||
    currentPath.startsWith('/vehiculos');
  const isClientBookings =
    activeTab === 'search' ||
    currentPath.startsWith('/reservas') ||
    currentPath.startsWith('/alquilar');
  const isClientProfile = activeTab === 'profile' || currentPath.startsWith('/perfil');

  const adminItems: NavItem[] = [
    {
      key: 'home',
      label: 'Panel de Patio',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        </svg>
      ),
    },
    {
      key: 'fleet',
      label: 'Control de Flota',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
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
      label: 'Operaciones y Peritaje',
      href: '/admin/operaciones',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
        >
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      ),
    },
    {
      key: 'cash',
      label: 'Caja y Finanzas',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
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
      label: 'Catálogo',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      ),
    },
    {
      key: 'bookings',
      label: 'Mis Reservas',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
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
      label: 'Mi Perfil',
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
          className={`h-5 w-5 transition-transform duration-300 ${active ? 'scale-105' : 'group-hover:scale-110'}`}
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
  const [dragOffset, setDragOffset] = useState(initialActiveIndex * ITEM_STEP);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(initialActiveIndex);

  // Gesture tracking refs
  const dockRef = useRef<HTMLDivElement>(null);
  const pointerStartX = useRef<number>(0);
  const initialPillOffset = useRef<number>(initialActiveIndex * ITEM_STEP);
  const currentOffsetRef = useRef<number>(initialActiveIndex * ITEM_STEP);
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

  // Sync tab with route updates and popstate
  useEffect(() => {
    const updateTabFromPath = () => {
      const path = window.location.pathname;
      const idx = items.findIndex((i) => {
        if (i.href === '/admin') {
          return path === '/admin' || path === '/admin/';
        }
        if (i.href === '/catalogo') {
          return path === '/' || path.startsWith('/catalogo') || path.startsWith('/vehiculos');
        }
        return path.startsWith(i.href);
      });
      if (idx !== -1) {
        setSelectedIndex(idx);
        setDragOffset(idx * ITEM_STEP);
        currentOffsetRef.current = idx * ITEM_STEP;
        setHoverIndex(idx);
        hoverIndexRef.current = idx;
      }
    };

    updateTabFromPath();
    document.addEventListener('astro:page-load', updateTabFromPath);
    window.addEventListener('popstate', updateTabFromPath);

    return () => {
      document.removeEventListener('astro:page-load', updateTabFromPath);
      window.removeEventListener('popstate', updateTabFromPath);
    };
  }, [items, currentPath]);

  // Window-level move and up handlers to ensure 100% uninterrupted tracking
  useEffect(() => {
    const handleWindowPointerMove = (e: globalThis.PointerEvent) => {
      if (!isPointerDown.current) return;

      const deltaX = e.clientX - pointerStartX.current;
      if (!hasMovedSignificantly.current && Math.abs(deltaX) > 3) {
        hasMovedSignificantly.current = true;
        setIsDragging(true);
        triggerHaptic(6);
      }

      if (hasMovedSignificantly.current) {
        const maxOffset = (items.length - 1) * ITEM_STEP;
        let newOffset = initialPillOffset.current + deltaX;

        // Apple rubber-band resistance
        if (newOffset < 0) {
          newOffset = newOffset * 0.25;
        } else if (newOffset > maxOffset) {
          newOffset = maxOffset + (newOffset - maxOffset) * 0.25;
        }

        currentOffsetRef.current = newOffset;
        setDragOffset(newOffset);

        // Real-time hover detection for micro haptic ticks
        const currentHover = Math.max(0, Math.min(items.length - 1, Math.round(newOffset / ITEM_STEP)));
        if (currentHover !== hoverIndexRef.current) {
          hoverIndexRef.current = currentHover;
          setHoverIndex(currentHover);
          triggerHaptic(4);
        }
      }
    };

    const handleWindowPointerUp = () => {
      if (!isPointerDown.current) return;
      isPointerDown.current = false;

      if (hasMovedSignificantly.current) {
        setIsDragging(false);
        const maxOffset = (items.length - 1) * ITEM_STEP;
        const clampedOffset = Math.max(0, Math.min(maxOffset, currentOffsetRef.current));
        const targetIndex = Math.max(0, Math.min(items.length - 1, Math.round(clampedOffset / ITEM_STEP)));

        setSelectedIndex(targetIndex);
        setDragOffset(targetIndex * ITEM_STEP);
        currentOffsetRef.current = targetIndex * ITEM_STEP;
        setHoverIndex(targetIndex);
        hoverIndexRef.current = targetIndex;
        triggerHaptic(10);

        const targetItem = items[targetIndex];
        if (targetItem && targetItem.href !== window.location.pathname) {
          navigate(targetItem.href);
        }
      } else {
        setIsDragging(false);
        setDragOffset(selectedIndex * ITEM_STEP);
        currentOffsetRef.current = selectedIndex * ITEM_STEP;
        setHoverIndex(selectedIndex);
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
  }, [items, selectedIndex]);

  // Gestures: Pointer Down on Dock Track
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointerStartX.current = e.clientX;
    isPointerDown.current = true;
    hasMovedSignificantly.current = false;

    // Determine if touched another tab to start dragging from there
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      const touchX = e.clientX - rect.left - 28;
      const touchedIndex = Math.max(0, Math.min(items.length - 1, Math.round(touchX / ITEM_STEP)));
      const distToActive = Math.abs(touchX - selectedIndex * ITEM_STEP);

      // If finger is close to active pill, drag active pill; else start from touched tab
      if (distToActive < 30) {
        initialPillOffset.current = selectedIndex * ITEM_STEP;
      } else {
        initialPillOffset.current = touchedIndex * ITEM_STEP;
      }
    } else {
      initialPillOffset.current = selectedIndex * ITEM_STEP;
    }

    currentOffsetRef.current = initialPillOffset.current;
  };

  // Direct Click on Tab Item (when not dragging)
  const handleTabClick = (e: MouseEvent<HTMLAnchorElement>, index: number, href: string) => {
    e.preventDefault();
    if (hasMovedSignificantly.current) return;

    if (index !== selectedIndex) {
      setSelectedIndex(index);
      setDragOffset(index * ITEM_STEP);
      currentOffsetRef.current = index * ITEM_STEP;
      setHoverIndex(index);
      hoverIndexRef.current = index;
      triggerHaptic(10);
      navigate(href);
    }
  };

  const activePosition = isDragging ? dragOffset : selectedIndex * ITEM_STEP;

  return (
    <nav
      aria-label="Navegación principal móvil"
      style={{ viewTransitionName: 'flotax-bottom-nav' }}
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-40 md:hidden pointer-events-auto select-none ${className}`}
    >
      {/* Floating Island Dock Capsule with Free Touch Slider */}
      <div
        ref={dockRef}
        role="tablist"
        aria-orientation="horizontal"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
        className="ios-dock-capsule relative flex items-center gap-1.5 rounded-full p-1.5 border border-white/60 ring-1 ring-[#111827]/10 select-none cursor-grab active:cursor-grabbing"
      >
        {/* Sliding Fluid Indicator Capsule with Non-Linear Spring Physics */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 top-1.5 h-11 w-11 rounded-full bg-[#111827] shadow-[0_6px_18px_-2px_rgba(17,24,39,0.38)] ring-1 ring-white/20 will-change-transform"
          style={{
            transform: `translate3d(${activePosition}px, 0, 0) ${isDragging ? 'scale(0.96) scaleX(1.12)' : 'scale(1) scaleX(1)'
              }`,
            transition: isDragging
              ? 'none'
              : 'transform 400ms var(--ease-spring-ios), box-shadow 300ms ease',
          }}
        >
          <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-white animate-pulse" />
        </div>

        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          const isHovered = isDragging && index === hoverIndex;
          const isCurrentVisual = isHovered || isSelected;

          return (
            <a
              key={item.key}
              href={item.href}
              role="tab"
              aria-label={item.label}
              aria-selected={isSelected}
              aria-current={isSelected ? 'page' : undefined}
              draggable={false}
              onClick={(e) => handleTabClick(e, index, item.href)}
              style={{ touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              className={`ios-press-bounce group relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 ${isCurrentVisual
                ? 'text-white'
                : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#EDEDED]/60'
                }`}
            >
              {item.icon(isCurrentVisual)}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
