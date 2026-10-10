import { useState, useTransition } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import type { MembresiaLocalResumen } from '@/lib/auth/session';

export interface PortalSwitchCardProps {
  membresias: MembresiaLocalResumen[];
  esSuperAdmin: boolean;
  localActivoNombre?: string | undefined;
}

export default function PortalSwitchCard({
  membresias,
  esSuperAdmin,
  localActivoNombre,
}: PortalSwitchCardProps) {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const tieneAccesoOperativo = esSuperAdmin || membresias.length > 0;
  const sedePrincipal = membresias[0];
  const nombreSede = localActivoNombre ?? sedePrincipal?.nombreLocal ?? 'Patio Operativo';
  const rolSede = sedePrincipal?.rol ?? (esSuperAdmin ? 'SUPER_ADMIN' : 'PERSONAL');

  const handleToggle = () => {
    if (!tieneAccesoOperativo || isPending) return;
    setErrorMsg(null);

    startTransition(async () => {
      try {
        const result = await actions.portal.cambiarModoPortal({ modo: 'ADMIN' });
        if (result.error) {
          setErrorMsg(result.error.message || 'No fue posible cambiar al modo operador.');
          return;
        }

        if (result.data?.rutaDestino) {
          navigate(result.data.rutaDestino);
        }
      } catch (err) {
        setErrorMsg('Ocurrió un error inesperado al conectar con el servidor.');
      }
    });
  };

  if (!tieneAccesoOperativo) {
    return (
      <div className="rounded-[28px] bg-gradient-to-br from-[#111827] to-[#1F2937] p-6 text-white shadow-lg border border-[#4B5563]/40">
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
              className="ios-press-bounce inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#111827] shadow-md hover:bg-[#EDEDED] transition-colors"
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
    <div className="rounded-[28px] bg-white p-6 border border-[#9CA3AF]/30 shadow-md transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#111827]/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#111827]">
              Modo Operativo
            </span>
            {membresias.length > 1 && (
              <span className="text-[10px] font-medium text-[#4B5563]">
                ({membresias.length} sedes)
              </span>
            )}
          </div>
          <h3 className="font-display text-base font-bold text-[#111827]">
            Entorno de Patio y Vehículos
          </h3>
          <p className="text-xs text-[#4B5563]">
            📍 {nombreSede} · <span className="font-medium">{rolSede}</span>
          </p>
        </div>

        {/* Switch Canónico FlotaX */}
        <button
          type="button"
          role="switch"
          aria-checked={false}
          aria-label="Cambiar a Modo Operador"
          disabled={isPending}
          onClick={handleToggle}
          className="group relative flex shrink-0 cursor-pointer items-center p-1 focus:outline-hidden disabled:opacity-60"
        >
          <div
            className={`h-[28px] w-[50px] rounded-[14px] transition-colors duration-200 relative ${
              isPending ? 'bg-[#4B5563]' : 'bg-[#E5E4DF] group-hover:bg-[#D8D6D0]'
            }`}
          >
            <div
              className={`absolute top-[4px] left-[4px] h-[20px] w-[20px] rounded-full bg-white shadow-xs transition-transform duration-200 flex items-center justify-center ${
                isPending ? 'translate-x-[22px]' : 'translate-x-0'
              }`}
            >
              {isPending && (
                <span className="h-2 w-2 rounded-full border-2 border-[#111827] border-t-transparent animate-spin" />
              )}
            </div>
          </div>
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-[#9CA3AF]/15 flex items-center justify-between text-[11px] text-[#4B5563]">
        <span>Acceso a entregas, peritajes R2 y flota</span>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          className="font-bold text-[#111827] hover:underline disabled:opacity-50"
        >
          {isPending ? 'Conectando...' : 'Entrar a patio →'}
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
