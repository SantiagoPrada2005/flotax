import { useState, useEffect, type SyntheticEvent } from 'react';
import { navigate } from 'astro:transitions/client';
import { authClient } from '@/lib/auth/client';

export interface UserDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  autenticado?: boolean | undefined;
  usuarioNombre?: string | null | undefined;
  usuarioCorreo?: string | null | undefined;
  usuarioImagen?: string | null | undefined;
  usuarioLocalNombre?: string | null | undefined;
  onTriggerHaptic?: (() => void) | undefined;
}

export default function UserDropdownMenu({
  isOpen,
  onClose,
  autenticado = false,
  usuarioNombre,
  usuarioCorreo,
  usuarioImagen,
  onTriggerHaptic,
}: UserDropdownMenuProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isVisible, setIsVisible] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentPath, setCurrentPath] = useState(
    typeof window !== 'undefined' ? window.location.pathname : ''
  );
  const [currentHash, setCurrentHash] = useState(
    typeof window !== 'undefined' ? window.location.hash : ''
  );

  // Iniciales del usuario para avatar de respaldo
  const iniciales = (usuarioNombre || 'FX')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palabra) => palabra[0]?.toUpperCase())
    .join('');

  // Sincronización reactiva de la ruta y anclaje actual
  useEffect(() => {
    const sincronizarRuta = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname);
        setCurrentHash(window.location.hash);
      }
    };

    sincronizarRuta();
    document.addEventListener('astro:page-load', sincronizarRuta);
    window.addEventListener('popstate', sincronizarRuta);
    window.addEventListener('hashchange', sincronizarRuta);

    return () => {
      document.removeEventListener('astro:page-load', sincronizarRuta);
      window.removeEventListener('popstate', sincronizarRuta);
      window.removeEventListener('hashchange', sincronizarRuta);
    };
  }, []);

  // Animación suave de entrada y salida (montaje / desmontaje con transición fluida)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    if (isOpen) {
      setIsRendered(true);
      const frameId = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frameId);
    } else {
      setIsVisible(false);
      timeoutId = setTimeout(() => {
        setIsRendered(false);
      }, 200);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen]);

  if (!isRendered) {
    return null;
  }

  const handleNavegacion = (ruta: string) => {
    onTriggerHaptic?.();
    onClose();
    void navigate(ruta);
  };

  const handleCerrarSesion = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    onTriggerHaptic?.();

    try {
      await authClient.signOut();
      onClose();
      void navigate('/login');
    } catch {
      setIsLoggingOut(false);
      onClose();
      void navigate('/login');
    }
  };

  // Determinación de estados activos visuales
  const esPerfilActivo =
    currentPath.startsWith('/perfil') &&
    !currentHash.includes('suscripcion') &&
    !currentHash.includes('configuracion');

  const esSuscripcionActiva =
    currentPath.startsWith('/suscripcion') ||
    (currentPath.startsWith('/perfil') && currentHash.includes('suscripcion'));

  const esConfiguracionActiva =
    currentPath.startsWith('/configuracion') ||
    (currentPath.startsWith('/perfil') && currentHash.includes('configuracion'));

  const esAyudaActiva =
    currentPath.startsWith('/ayuda') ||
    (typeof window !== 'undefined' && currentHash === '#faq');

  return (
    <div
      role="menu"
      aria-label="Menú de usuario"
      className={`
        absolute right-0 top-[calc(100%+8px)] z-50
        w-[280px] sm:w-[295px] max-w-[calc(100vw-24px)]
        origin-top-right transform-gpu
        rounded-2xl border border-[#9CA3AF]/30 bg-white/96
        p-2 shadow-[0_18px_40px_-8px_rgba(17,24,39,0.2),0_4px_12px_rgba(17,24,39,0.06)]
        backdrop-blur-2xl
        transition-all duration-200 ease-out
        ${
          isVisible
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        }
      `}
    >
      {/* 1. Encabezado del usuario */}
      {autenticado ? (
        <div className="flex items-center gap-3 px-2.5 py-2">
          {/* Foto de perfil o avatar con iniciales */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#111827] text-xs font-bold text-[#EDEDED] shadow-xs ring-1 ring-[#111827]/10">
            {usuarioImagen && !avatarError ? (
              <img
                src={usuarioImagen}
                alt={usuarioNombre || 'Perfil de usuario'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{iniciales}</span>
            )}
          </div>

          {/* Nombre y Correo electrónico */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-[13px] font-bold text-[#111827] leading-snug">
              {usuarioNombre || 'Usuario FlotaX'}
            </p>
            {usuarioCorreo && (
              <p className="truncate text-[11px] font-medium text-[#4B5563] leading-tight">
                {usuarioCorreo}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-2.5 py-2">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111827] text-xs font-bold text-[#EDEDED] shadow-xs">
            <span>FX</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs sm:text-[13px] font-bold text-[#111827] leading-snug">
              Invitado
            </p>
            <p className="truncate text-[11px] font-medium text-[#4B5563] leading-tight">
              Inicia sesión en tu cuenta
            </p>
          </div>
        </div>
      )}

      {/* Separador bajo encabezado */}
      <div className="my-1.5 h-px bg-[#EDEDED] mx-1" role="separator" />

      {/* 2. Opciones principales */}
      {autenticado ? (
        <div className="space-y-0.5">
          {/* Opción 1: Perfil */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavegacion('/perfil')}
            className={`ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] transition-colors ${
              esPerfilActivo
                ? 'bg-[#111827]/8 font-bold text-[#111827]'
                : 'font-medium text-[#4B5563] hover:bg-[#EDEDED]/80 hover:text-[#111827]'
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                esPerfilActivo
                  ? 'bg-[#111827] text-[#EDEDED]'
                  : 'bg-[#EDEDED] text-[#4B5563]'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <span className="flex-1 truncate">Perfil</span>
            {esPerfilActivo && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111827]"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Opción 2: Suscripción */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavegacion('/perfil#suscripcion')}
            className={`ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] transition-colors ${
              esSuscripcionActiva
                ? 'bg-[#111827]/8 font-bold text-[#111827]'
                : 'font-medium text-[#4B5563] hover:bg-[#EDEDED]/80 hover:text-[#111827]'
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                esSuscripcionActiva
                  ? 'bg-[#111827] text-[#EDEDED]'
                  : 'bg-[#EDEDED] text-[#4B5563]'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </span>
            <span className="flex-1 truncate">Suscripción</span>
            {esSuscripcionActiva && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111827]"
                aria-hidden="true"
              />
            )}
          </button>

          {/* Opción 3: Configuración */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavegacion('/perfil#configuracion')}
            className={`ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] transition-colors ${
              esConfiguracionActiva
                ? 'bg-[#111827]/8 font-bold text-[#111827]'
                : 'font-medium text-[#4B5563] hover:bg-[#EDEDED]/80 hover:text-[#111827]'
            }`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                esConfiguracionActiva
                  ? 'bg-[#111827] text-[#EDEDED]'
                  : 'bg-[#EDEDED] text-[#4B5563]'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <span className="flex-1 truncate">Configuración</span>
            {esConfiguracionActiva && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111827]"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-0.5">
          {/* Iniciar sesión */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavegacion('/login')}
            className="ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] font-semibold text-[#111827] transition-colors hover:bg-[#EDEDED]/80"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EDEDED] text-[#111827]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" x2="3" y1="12" y2="12" />
              </svg>
            </span>
            <span className="flex-1 truncate">Iniciar sesión</span>
          </button>

          {/* Registrarse */}
          <button
            type="button"
            role="menuitem"
            onClick={() => handleNavegacion('/registro')}
            className="ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] font-semibold text-[#111827] transition-colors hover:bg-[#EDEDED]/80"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EDEDED] text-[#111827]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" x2="20" y1="8" y2="14" />
                <line x1="23" x2="17" y1="11" y2="11" />
              </svg>
            </span>
            <span className="flex-1 truncate">Crear cuenta</span>
          </button>
        </div>
      )}

      {/* 3. Separador visual */}
      <div className="my-1.5 h-px bg-[#EDEDED] mx-1" role="separator" />

      {/* 4. Opciones secundarias */}
      <div className="space-y-0.5">
        {/* Opción 4: Centro de ayuda */}
        <button
          type="button"
          role="menuitem"
          onClick={() => handleNavegacion('/#faq')}
          className={`ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] transition-colors ${
            esAyudaActiva
              ? 'bg-[#111827]/8 font-bold text-[#111827]'
              : 'font-medium text-[#4B5563] hover:bg-[#EDEDED]/80 hover:text-[#111827]'
          }`}
        >
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
              esAyudaActiva
                ? 'bg-[#111827] text-[#EDEDED]'
                : 'bg-[#EDEDED] text-[#4B5563]'
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" x2="12.01" y1="17" y2="17" />
            </svg>
          </span>
          <span className="flex-1 truncate">Centro de ayuda</span>
          {esAyudaActiva && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#111827]"
              aria-hidden="true"
            />
          )}
        </button>

        {/* Opción 5: Cerrar sesión (Solo visible cuando está autenticado) */}
        {autenticado && (
          <button
            type="button"
            role="menuitem"
            onClick={handleCerrarSesion}
            disabled={isLoggingOut}
            className="ios-press-bounce group flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left text-xs sm:text-[13px] font-medium text-[#4B5563] transition-colors hover:bg-rose-50/80 hover:text-rose-600 disabled:opacity-50"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EDEDED] text-[#4B5563] transition-colors group-hover:bg-rose-100 group-hover:text-rose-600">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
            </span>
            <span className="flex-1 truncate">
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

