import { useState, useTransition } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  activarFlotaxLoading,
  desactivarFlotaxLoading,
  resolverVarianteTransicionPortal,
} from '@/lib/pwa';
import type { MembresiaLocalResumen } from '@/lib/auth/session';

export interface PortalSwitchCardProps {
  membresias: MembresiaLocalResumen[];
  esSuperAdmin: boolean;
  localActivoNombre?: string | undefined;
  modoActual?: 'ADMIN' | 'CLIENTE' | undefined;
}

export default function PortalSwitchCard({
  membresias,
  esSuperAdmin,
  localActivoNombre,
  modoActual = 'CLIENTE',
}: PortalSwitchCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const esModoAdmin = modoActual === 'ADMIN';
  const tieneAccesoOperativo = esSuperAdmin || membresias.length > 0;
  const sedePrincipal = membresias[0];
  const nombreSede = localActivoNombre ?? sedePrincipal?.nombreLocal ?? 'Patio Operativo';
  const rolSede = sedePrincipal?.rol ?? (esSuperAdmin ? 'SUPER_ADMIN' : 'PERSONAL');

  const handleToggle = () => {
    if (!tieneAccesoOperativo || isPending) return;
    setErrorMsg(null);
    const modoDestino: 'ADMIN' | 'CLIENTE' = esModoAdmin ? 'CLIENTE' : 'ADMIN';
    const variante = resolverVarianteTransicionPortal(
      modoDestino === 'ADMIN' ? 'PERSONAL_A_DUEÑO' : 'DUEÑO_A_PERSONAL'
    );
    const mensajeCarga =
      modoDestino === 'ADMIN'
        ? 'INICIALIZANDO ENTORNO OPERATIVO DE PATIO'
        : 'CONMUTANDO A PORTAL DE CLIENTE';

    activarFlotaxLoading(mensajeCarga, variante);

    startTransition(async () => {
      try {
        const result = await actions.portal.cambiarModoPortal({ modo: modoDestino });
        if (result.error) {
          desactivarFlotaxLoading();
          setErrorMsg(
            result.error.message ||
              (modoDestino === 'ADMIN'
                ? 'No fue posible cambiar al modo operador.'
                : 'No fue posible cambiar al modo personal.')
          );
          return;
        }

        if (result.data?.rutaDestino) {
          navigate(result.data.rutaDestino);
        } else {
          navigate(modoDestino === 'ADMIN' ? '/admin' : '/catalogo');
        }
      } catch {
        desactivarFlotaxLoading();
        setErrorMsg('Ocurrió un error inesperado al conectar con el servidor.');
      }
    });
  };

  if (!tieneAccesoOperativo) {
    return (
      <div className="[--fx-border-focus:#EDEDED] rounded-[28px] bg-gradient-to-br from-[#111827] to-[#1F2937] p-6 text-white shadow-lg border border-[#4B5563]/40">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-white">
            <span>✨</span>
            <span>Oportunidad de Negocio</span>
          </div>

          <h3 className="font-display text-xl font-black text-white sm:text-2xl leading-tight">
            Alquila vehículos a otros usuarios
          </h3>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Pon tu vehículo o flota en servicio. Gestiona disponibilidad, depósitos en garantía y peritajes de entrega fotográficos desde tu teléfono.
          </p>

          <div className="pt-2">
            <a
              href="/admin/onboarding?modo=crear"
              className="fx-press inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#111827] shadow-md hover:bg-[#EDEDED]"
            >
              <span>Comenzar a alquilar</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] bg-white dark:bg-[#1F2937] p-6 border border-[#9CA3AF]/30 dark:border-white/10 shadow-md">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#111827]/5 dark:bg-white/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#EDEDED]">
              {esModoAdmin ? 'Modo Operador Activo' : 'Modo Operativo Disponible'}
            </span>
            {membresias.length > 1 && (
              <span className="text-[10px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                ({membresias.length} sedes)
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-bold text-[#111827] dark:text-[#EDEDED]">
            Entorno de Patio y Vehículos
          </h3>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
            📍 {nombreSede} · <span className="font-medium">{rolSede}</span>
          </p>
        </div>

        {/* Switch Canónico FlotaX */}
        <button
          type="button"
          role="switch"
          aria-checked={esModoAdmin}
          aria-label={esModoAdmin ? 'Cambiar a Modo Personal (Alquilar)' : 'Cambiar a Modo Operador'}
          aria-busy={isPending}
          disabled={isPending}
          onClick={handleToggle}
          className="group relative flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center px-1 py-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <div
            className={`h-[28px] w-[50px] rounded-[14px] transition-colors duration-200 relative ${
              isPending
                ? 'bg-[#4B5563]'
                : esModoAdmin
                  ? 'bg-[#111827] dark:bg-[#EDEDED]'
                  : 'bg-[#9CA3AF]/40 dark:bg-white/20 group-hover:bg-[#9CA3AF]/60 dark:group-hover:bg-white/30'
            }`}
          >
            <div
              className={`absolute top-[4px] left-[4px] h-[20px] w-[20px] rounded-full shadow-xs transition-transform duration-200 flex items-center justify-center ${
                esModoAdmin ? 'bg-white dark:bg-[#111827]' : 'bg-white'
              } ${
                esModoAdmin || isPending ? 'translate-x-[22px]' : 'translate-x-0'
              }`}
            >
              {isPending && (
                <span className="h-2 w-2 rounded-full border-2 border-[#111827] border-t-transparent animate-spin" />
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-[#9CA3AF]/15 dark:border-white/10 flex items-center justify-between text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
        <span>Acceso a entregas, peritajes R2 y flota</span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="inline-flex min-h-[44px] items-center font-bold text-[#111827] dark:text-[#EDEDED] hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isPending
            ? 'Conectando...'
            : esModoAdmin
              ? 'Cambiar a Modo Personal (Alquilar)'
              : 'Entrar a patio →'}
        </button>
      </div>

      {errorMsg && (
        <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs font-medium text-red-700 border border-red-200">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
