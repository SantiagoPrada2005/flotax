import { useState, useTransition, type SyntheticEvent } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import { authClient } from '@/lib/auth/client';
import type { MembresiaLocalResumen } from '@/lib/auth/session';

export interface PerfilUsuarioData {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  esSuperAdmin: boolean;
  imagen?: string | null;
}

export interface PerfilEditorCardProps {
  usuario: PerfilUsuarioData;
  membresias?: MembresiaLocalResumen[];
  localActivoNombre?: string | undefined;
  estadoVerificacion?: string | undefined;
}

export default function PerfilEditorCard({
  usuario,
  membresias = [],
  localActivoNombre,
  estadoVerificacion = 'PENDIENTE',
}: PerfilEditorCardProps) {
  // Datos guardados
  const [datosGuardados, setDatosGuardados] = useState({
    nombre: usuario.nombre ?? '',
    telefono: usuario.telefono ?? '',
    tipoDocumento: usuario.tipoDocumento ?? 'CC',
    numeroDocumento: usuario.numeroDocumento ?? '',
  });

  const [avatarError, setAvatarError] = useState(false);

  // Modal de edición de información
  const [showEditModal, setShowEditModal] = useState(false);
  const [nombre, setNombre] = useState(datosGuardados.nombre);
  const [telefono, setTelefono] = useState(datosGuardados.telefono);
  const [tipoDocumento, setTipoDocumento] = useState(datosGuardados.tipoDocumento);
  const [numeroDocumento, setNumeroDocumento] = useState(datosGuardados.numeroDocumento);

  // Estados de retroalimentación
  const [isPending, startTransition] = useTransition();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Iniciales para avatar de respaldo
  const iniciales = (datosGuardados.nombre || 'FX')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  const hayAccesoOperativo = usuario.esSuperAdmin || membresias.length > 0;

  // Abrir modal de edición
  const handleAbrirEdicion = () => {
    setNombre(datosGuardados.nombre);
    setTelefono(datosGuardados.telefono);
    setTipoDocumento(datosGuardados.tipoDocumento);
    setNumeroDocumento(datosGuardados.numeroDocumento);
    setErrorMsg(null);
    setShowEditModal(true);
  };

  // Guardar edición
  const handleGuardarEdicion = (e: SyntheticEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (nombre.trim().length < 2) {
      setErrorMsg('El nombre debe tener al menos 2 caracteres.');
      return;
    }

    startTransition(async () => {
      try {
        const result = await actions.perfil.actualizar({
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          tipoDocumento: (tipoDocumento as 'CC' | 'CE' | 'PASAPORTE' | 'NIT') || null,
          numeroDocumento: numeroDocumento.trim() || null,
        });

        if (result.error) {
          setErrorMsg(result.error.message || 'No se pudo guardar la información.');
          return;
        }

        const nuevosDatos = {
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          tipoDocumento,
          numeroDocumento: numeroDocumento.trim(),
        };

        setDatosGuardados(nuevosDatos);
        setShowEditModal(false);
        setSuccessMsg('Perfil actualizado correctamente.');

        setTimeout(() => {
          setSuccessMsg(null);
        }, 4000);
      } catch {
        setErrorMsg('Ocurrió un error inesperado al conectar con el servidor.');
      }
    });
  };

  // Conmutar a modo operador de patio
  const handleConmutarPatio = async () => {
    window.dispatchEvent(
      new CustomEvent('flotax:loading', {
        detail: {
          visible: true,
          label: 'INICIALIZANDO ENTORNO OPERATIVO',
          variant: 'cad',
        },
      })
    );

    try {
      const result = await actions.portal.cambiarModoPortal({ modo: 'ADMIN' });
      if (result.error) {
        window.dispatchEvent(new CustomEvent('flotax:loading', { detail: { visible: false } }));
        setErrorMsg(result.error.message || 'No fue posible cambiar al modo operador.');
        return;
      }
      if (result.data?.rutaDestino) {
        navigate(result.data.rutaDestino);
      }
    } catch {
      window.dispatchEvent(new CustomEvent('flotax:loading', { detail: { visible: false } }));
      setErrorMsg('Error al conectar con el servidor.');
    }
  };

  // Cerrar sesión
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      setShowLogoutModal(false);
      navigate('/login');
    } catch {
      setIsLoggingOut(false);
      setErrorMsg('No fue posible cerrar la sesión.');
    }
  };

  return (
    <div className="space-y-6">


      {/* 2. Avatar Central Prominente con Halo y Botón de Lápiz Flotante */}
      <div className="flex flex-col items-center justify-center pt-2 pb-1">
        <div className="relative">
          {/* Halo difuminado suave detrás del avatar (Glow Apple Style) */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-gray-300 via-gray-200 to-gray-100 blur-xl opacity-70 transform scale-110" />

          {/* Círculo del Avatar */}
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-[#1F2937] to-[#111827] text-white font-bold text-2xl shadow-xl ring-4 ring-white overflow-hidden">
            {usuario.imagen && !avatarError ? (
              <img
                src={usuario.imagen}
                alt={datosGuardados.nombre || 'Perfil'}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{iniciales}</span>
            )}
          </div>

          {/* Botón Flotante de Lápiz (Edit) */}
          <button
            type="button"
            onClick={handleAbrirEdicion}
            className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#111827] shadow-md ring-2 ring-white hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="Editar información de perfil"
            title="Editar información"
          >
            <svg className="h-4 w-4 text-[#111827]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        {/* Nombre Centrado */}
        <h2 className="mt-4 font-display text-xl font-bold tracking-tight text-[#111827]">
          {datosGuardados.nombre || 'Cliente FlotaX'}
        </h2>
        {usuario.esSuperAdmin && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/60">
            ★ Administrador de Flota
          </span>
        )}
      </div>

      {/* Alertas de Éxito / Error */}
      {successMsg && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-medium text-emerald-800 animate-fade-in flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700 animate-fade-in flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Sección de Información Personal (Card Inset Grouped con Íconos y Chevrons) */}
      <div className="rounded-3xl bg-white p-2 shadow-xs border border-gray-200/70 overflow-hidden divide-y divide-gray-100">
        {/* Teléfono */}
        <button
          type="button"
          onClick={handleAbrirEdicion}
          className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50/80 active:bg-gray-100/60 rounded-2xl transition-all text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100/80 text-[#4B5563]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#9CA3AF]">Teléfono</p>
              <p className="text-sm font-mono tabular-nums font-semibold text-[#111827] truncate">
                {datosGuardados.telefono || 'Sin registrar'}
              </p>
            </div>
          </div>
          <svg className="h-4 w-4 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Email */}
        <div className="w-full flex items-center justify-between p-3.5 rounded-2xl text-left">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100/80 text-[#4B5563]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#9CA3AF]">Correo Electrónico</p>
              <p className="text-sm font-semibold text-[#111827] truncate">
                {usuario.correo}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-md">
            Verificado
          </span>
        </div>

        {/* Documento Principal */}
        <button
          type="button"
          onClick={handleAbrirEdicion}
          className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50/80 active:bg-gray-100/60 rounded-2xl transition-all text-left"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100/80 text-[#4B5563]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-[#9CA3AF]">
                Documento ({datosGuardados.tipoDocumento})
              </p>
              <p className="text-sm font-mono tabular-nums font-semibold text-[#111827] truncate">
                {datosGuardados.numeroDocumento || 'Sin registrar'}
              </p>
            </div>
          </div>
          <svg className="h-4 w-4 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 4. Sección "Mis Documentos" (Horizontal Cards Carousel) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-display text-sm font-bold text-[#111827]">
            Mis Documentos
          </h3>
          <button
            type="button"
            onClick={() => navigate('/perfil/verificacion')}
            className="text-xs font-semibold text-[#4B5563] hover:text-[#111827] flex items-center gap-1 active:scale-95 transition-all"
          >
            <span>
              {estadoVerificacion === 'APROBADO'
                ? 'Verificado'
                : estadoVerificacion === 'EN_REVISION'
                ? 'En revisión'
                : 'Verificar ahora'}
            </span>
            <svg className="h-3.5 w-3.5 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Tarjeta 1: Cédula / Identificación */}
          <button
            type="button"
            onClick={() => navigate('/perfil/verificacion')}
            className="rounded-2xl bg-white p-3.5 border border-gray-200/70 shadow-xs flex flex-col justify-between h-28 text-left hover:border-gray-400 active:scale-98 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[#4B5563]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#111827] truncate">
                {datosGuardados.tipoDocumento}
              </p>
              <p className="text-[10px] font-mono tabular-nums text-[#9CA3AF] truncate">
                {datosGuardados.numeroDocumento || 'Pendiente'}
              </p>
            </div>
          </button>

          {/* Tarjeta 2: Licencia de Conducción */}
          <button
            type="button"
            onClick={() => navigate('/perfil/verificacion')}
            className="rounded-2xl bg-white p-3.5 border border-gray-200/70 shadow-xs flex flex-col justify-between h-28 text-left hover:border-gray-400 active:scale-98 transition-all"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[#4B5563]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#111827] truncate">
                Licencia
              </p>
              <p
                className={`text-[10px] font-semibold truncate ${
                  estadoVerificacion === 'APROBADO'
                    ? 'text-emerald-600'
                    : estadoVerificacion === 'EN_REVISION'
                    ? 'text-blue-600'
                    : 'text-amber-600'
                }`}
              >
                {estadoVerificacion === 'APROBADO'
                  ? 'Aprobada'
                  : estadoVerificacion === 'EN_REVISION'
                  ? 'En revisión'
                  : 'Por validar'}
              </p>
            </div>
          </button>

          {/* Tarjeta 3: Contrato & Garantía */}
          <div className="rounded-2xl bg-white p-3.5 border border-gray-200/70 shadow-xs flex flex-col justify-between h-28">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-100 text-[#4B5563]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold text-[#111827] truncate">
                Garantía
              </p>
              <p className="text-[10px] text-emerald-600 font-semibold truncate">
                Activa
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Sección de Gestión y Acciones (Patio Operativo y Cerrar Sesión) */}
      <div className="space-y-3">
        <h3 className="font-display text-sm font-bold text-[#111827] px-1">
          Gestión de Cuenta
        </h3>

        {/* Tarjeta destacada para usuarios comunes: Crea tu negocio o alquiler de vehículos */}
        {!hayAccesoOperativo && (
          <div className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#111827] to-[#1F2937] p-5 text-white shadow-md border border-white/10">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide text-white backdrop-blur-sm">
                <span>🚗</span>
                <span>Oportunidad de Negocio</span>
              </div>

              <h4 className="font-display text-lg sm:text-xl font-black text-white leading-tight">
                Crea tu alquiler de vehículos
              </h4>

              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Convierte tus vehículos o flota en ingresos. Administra disponibilidades, depósitos de garantía y peritajes fotográficos desde tu teléfono.
              </p>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => navigate('/admin/onboarding?modo=crear')}
                  className="ios-press-bounce w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs sm:text-sm font-bold text-[#111827] shadow-sm hover:bg-[#EDEDED] active:scale-98 transition-all cursor-pointer"
                >
                  <span>Crear mi patio de alquiler</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-3xl bg-white p-2 shadow-xs border border-gray-200/70 overflow-hidden divide-y divide-gray-100">
          {/* Conmutador a Patio Operativo si el usuario tiene membresía */}
          {hayAccesoOperativo && (
            <>
              <button
                type="button"
                onClick={handleConmutarPatio}
                className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50/80 active:bg-gray-100/60 rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-white">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111827] truncate">
                      Modo Operador de Patio
                    </p>
                    <p className="text-[11px] text-[#4B5563] truncate">
                      {localActivoNombre ?? 'Administración y check-in'}
                    </p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => navigate('/admin/onboarding?modo=crear')}
                className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50/80 active:bg-gray-100/60 rounded-2xl transition-all text-left"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gray-100 text-[#111827]">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#111827] truncate">
                      Registrar otro patio o sede
                    </p>
                    <p className="text-[11px] text-[#4B5563] truncate">
                      Crea un nuevo local para administrar más vehículos
                    </p>
                  </div>
                </div>
                <svg className="h-4 w-4 text-[#9CA3AF] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Cerrar Sesión */}
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/60 active:bg-rose-100/40 rounded-2xl transition-all text-left group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-100 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-rose-600 truncate">
                  Cerrar Sesión
                </p>
                <p className="text-[11px] text-[#4B5563] truncate">
                  Finalizar la sesión en este dispositivo
                </p>
              </div>
            </div>
            <svg className="h-4 w-4 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* 6. MODAL / BOTTOM SHEET DE EDICIÓN (Apple Modal HIG) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 shadow-2xl border border-gray-200/80 animate-zoom-in space-y-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            {/* Grabber pill superior para móviles */}
            <div className="sm:hidden flex justify-center -mt-2 mb-2">
              <div className="h-1.5 w-10 rounded-full bg-gray-300" />
            </div>

            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <h3 id="edit-profile-title" className="font-display text-lg font-bold text-[#111827]">
                Editar Información
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-[#4B5563] hover:text-[#111827] active:scale-95"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700 flex items-center gap-2">
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleGuardarEdicion} className="space-y-4">
              <div className="space-y-3">
                {/* Nombre */}
                <div>
                  <label htmlFor="modal-nombre" className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                    Nombre Completo
                  </label>
                  <input
                    id="modal-nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-base text-[#111827] outline-none focus:border-[#111827] focus:bg-white transition-all min-h-[44px]"
                    required
                  />
                </div>

                {/* Tipo de Documento */}
                <div>
                  <label htmlFor="modal-tipo-doc" className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                    Tipo de Documento
                  </label>
                  <select
                    id="modal-tipo-doc"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-base text-[#111827] outline-none focus:border-[#111827] focus:bg-white transition-all min-h-[44px]"
                  >
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="NIT">NIT</option>
                  </select>
                </div>

                {/* Número de Documento */}
                <div>
                  <label htmlFor="modal-num-doc" className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                    Número de Identificación
                  </label>
                  <input
                    id="modal-num-doc"
                    type="text"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Ej. 1020304050"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-base font-mono tabular-nums text-[#111827] outline-none focus:border-[#111827] focus:bg-white transition-all min-h-[44px]"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label htmlFor="modal-tel" className="block text-xs font-semibold uppercase tracking-wider text-[#4B5563] mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    id="modal-tel"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. +57 300 123 4567"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-base font-mono tabular-nums text-[#111827] outline-none focus:border-[#111827] focus:bg-white transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isPending}
                  className="min-h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 text-[#111827] font-semibold text-xs active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="min-h-[44px] rounded-xl bg-[#111827] hover:bg-[#1F2937] text-white font-semibold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? (
                    <span>Guardando...</span>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. DIÁLOGO MODAL DE CONFIRMACIÓN DE LOGOUT (Apple HIG) */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-xs sm:max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-white/40 text-center animate-zoom-in space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </div>

            <div className="space-y-1">
              <h3 id="logout-title" className="font-display text-base font-bold text-[#111827]">
                ¿Cerrar sesión en FlotaX?
              </h3>
              <p className="text-xs text-[#4B5563]">
                Tendrás que volver a ingresar con tu correo para recibir un nuevo código de acceso.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                disabled={isLoggingOut}
                className="min-h-[44px] rounded-xl bg-gray-100 hover:bg-gray-200 text-[#111827] font-semibold text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <span>Cerrando...</span>
                ) : (
                  <span>Sí, cerrar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
