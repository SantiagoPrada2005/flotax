import { useState, useEffect } from 'react';
import {
  obtenerIdiomaActual,
  cambiarIdioma,
  obtenerRegionActual,
  cambiarRegion,
  formatearFecha,
  formatearHora,
  formatearNumero,
  formatearMonedaRegional,
  DICCIONARIOS,
  type Idioma,
  type Region,
} from '@/lib/i18n';
import {
  obtenerTemaActual,
  aplicarTema,
  registrarEscuchadorTemaSistema,
  type TipoTema,
} from '@/lib/theme';

export default function ConfiguracionIsland() {
  const [idioma, setIdioma] = useState<Idioma>('es');
  const [region, setRegion] = useState<Region>('CO');
  const [tema, setTema] = useState<TipoTema>('sistema');

  // Navegación de secciones
  const [categoriaActiva, setCategoriaActiva] = useState<'general' | 'cuenta'>('general');
  const [opcionActiva, setOpcionActiva] = useState<'apariencia' | 'lenguajeRegion'>('apariencia');

  // En móvil: vista de lista de categorías vs vista de detalle de la opción
  const [vistaMovilDetalle, setVistaMovilDetalle] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Fecha fija de referencia para previsualización consistente de formatos
  const fechaEjemplo = new Date();

  useEffect(() => {
    setIdioma(obtenerIdiomaActual());
    setRegion(obtenerRegionActual());
    setTema(obtenerTemaActual());

    // Escuchar cambios de preferencia del sistema operativo
    const limpiarEscuchador = registrarEscuchadorTemaSistema();

    // Sincronización con eventos globales
    const handleI18nChange = (e: Event) => {
      const custom = e as CustomEvent<{ idioma: Idioma; region: Region }>;
      if (custom.detail) {
        setIdioma(custom.detail.idioma);
        setRegion(custom.detail.region);
      }
    };

    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<{ tema: TipoTema }>;
      if (custom.detail?.tema) {
        setTema(custom.detail.tema);
      }
    };

    window.addEventListener('flotax:i18n-change', handleI18nChange);
    window.addEventListener('flotax:theme-change', handleThemeChange);

    return () => {
      limpiarEscuchador();
      window.removeEventListener('flotax:i18n-change', handleI18nChange);
      window.removeEventListener('flotax:theme-change', handleThemeChange);
    };
  }, []);

  const t = DICCIONARIOS[idioma];

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(8);
      } catch {
        // Ignorar si no está soportado
      }
    }
  };

  const handleSeleccionarTema = (nuevoTema: TipoTema) => {
    triggerHaptic();
    setTema(nuevoTema);
    aplicarTema(nuevoTema);
    mostrarFeedback(t.configuracion.lenguajeRegion.guardadoExitoso);
  };

  const handleSeleccionarIdioma = (nuevoIdioma: Idioma) => {
    triggerHaptic();
    setIdioma(nuevoIdioma);
    cambiarIdioma(nuevoIdioma);
    mostrarFeedback(DICCIONARIOS[nuevoIdioma].configuracion.lenguajeRegion.guardadoExitoso);
  };

  const handleSeleccionarRegion = (nuevaRegion: Region) => {
    triggerHaptic();
    setRegion(nuevaRegion);
    cambiarRegion(nuevaRegion);
    mostrarFeedback(t.configuracion.lenguajeRegion.guardadoExitoso);
  };

  const mostrarFeedback = (mensaje: string) => {
    setMensajeExito(mensaje);
    setTimeout(() => {
      setMensajeExito(null);
    }, 2800);
  };

  const seleccionarOpcionMovil = (opcion: 'apariencia' | 'lenguajeRegion') => {
    triggerHaptic();
    setOpcionActiva(opcion);
    setVistaMovilDetalle(true);
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-3 sm:px-6 py-4 sm:py-6">
      {/* Encabezado Principal */}
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] dark:text-[#EDEDED]">
          {t.configuracion.titulo}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#4B5563] dark:text-[#D1D5DB]">
          {t.configuracion.subtitulo}
        </p>
      </div>

      {/* Alerta flotante sutil de éxito */}
      {mensajeExito && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-[#111827] px-4 py-3 text-xs sm:text-sm font-semibold text-[#EDEDED] shadow-xl border border-white/10 animate-fade-in"
        >
          <svg className="h-4 w-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* Grid de 2 Columnas para Escritorio / Vista Mobile First */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* =========================================================================
            COLUMNA IZQUIERDA: Navegación de Categorías (Visible en desktop o lista móvil)
           ========================================================================= */}
        <aside
          className={`md:col-span-4 lg:col-span-3 space-y-4 ${
            vistaMovilDetalle ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Categoría: General */}
          <div className="rounded-3xl bg-white dark:bg-[#1F2937] p-2.5 shadow-xs border border-gray-200/70 dark:border-white/10 overflow-hidden">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              {t.configuracion.categorias.general}
            </div>

            <nav className="space-y-1" aria-label="Opciones generales">
              {/* Opción 1: Apariencia */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setCategoriaActiva('general');
                  setOpcionActiva('apariencia');
                  seleccionarOpcionMovil('apariencia');
                }}
                className={`ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs sm:text-[13px] transition-all ${
                  categoriaActiva === 'general' && opcionActiva === 'apariencia'
                    ? 'bg-[#111827] dark:bg-white/15 text-[#EDEDED] font-bold shadow-xs'
                    : 'text-[#4B5563] dark:text-[#E5E7EB] font-medium hover:bg-[#EDEDED]/70 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="truncate">{t.configuracion.opciones.apariencia}</span>
                </div>
                <span className="md:hidden text-[#9CA3AF]">→</span>
              </button>

              {/* Opción 2: Lenguaje y región */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setCategoriaActiva('general');
                  setOpcionActiva('lenguajeRegion');
                  seleccionarOpcionMovil('lenguajeRegion');
                }}
                className={`ios-press-bounce flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-xs sm:text-[13px] transition-all ${
                  categoriaActiva === 'general' && opcionActiva === 'lenguajeRegion'
                    ? 'bg-[#111827] dark:bg-white/15 text-[#EDEDED] font-bold shadow-xs'
                    : 'text-[#4B5563] dark:text-[#E5E7EB] font-medium hover:bg-[#EDEDED]/70 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" x2="22" y1="12" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span className="truncate">{t.configuracion.opciones.lenguajeRegion}</span>
                </div>
                <span className="md:hidden text-[#9CA3AF]">→</span>
              </button>
            </nav>
          </div>

          {/* Categoría: Cuenta (Estructura lista para el futuro sin opciones deshabilitadas) */}
          <div className="rounded-3xl bg-white/70 dark:bg-[#1F2937]/70 p-3 shadow-2xs border border-gray-200/50 dark:border-white/10">
            <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
              {t.configuracion.categorias.cuenta}
            </div>
            <a
              href="/perfil"
              className="ios-press-bounce flex min-h-[42px] w-full cursor-pointer items-center justify-between rounded-2xl px-3.5 py-2 text-left text-xs font-semibold text-[#4B5563] dark:text-[#E5E7EB] hover:bg-[#EDEDED]/70 dark:hover:bg-white/10 hover:text-[#111827] dark:hover:text-white"
            >
              <div className="flex items-center gap-2.5 truncate">
                <svg className="h-4 w-4 shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="truncate">{t.nav.perfil}</span>
              </div>
              <span className="text-[11px] text-[#9CA3AF]">→</span>
            </a>
          </div>
        </aside>

        {/* =========================================================================
            COLUMNA DERECHA: Área de Contenido Detallado
           ========================================================================= */}
        <main
          className={`md:col-span-8 lg:col-span-9 space-y-6 ${
            !vistaMovilDetalle ? 'hidden md:block' : 'block'
          }`}
        >
          {/* Botón Móvil para Volver a Categorías */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setVistaMovilDetalle(false);
              }}
              className="ios-press-bounce inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-white dark:bg-[#1F2937] px-4 py-2 text-xs font-bold text-[#111827] dark:text-[#EDEDED] shadow-xs border border-gray-200/70 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/10"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>{t.nav.volver}</span>
            </button>
          </div>

          {/* =======================================================================
              SECCIÓN 1: GENERAL -> APARIENCIA (TEMAS)
             ======================================================================= */}
          {opcionActiva === 'apariencia' && (
            <div className="rounded-3xl bg-white dark:bg-[#1F2937] p-5 sm:p-7 shadow-xs border border-gray-200/70 dark:border-white/10 space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED]">
                  {t.configuracion.apariencia.titulo}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#4B5563] dark:text-[#D1D5DB]">
                  {t.configuracion.apariencia.descripcion}
                </p>
              </div>

              {/* Grid de 3 Tarjetas de Selección de Tema */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" role="radiogroup" aria-label="Seleccionar tema">
                {/* 1. MODO CLARO */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={tema === 'claro'}
                  onClick={() => handleSeleccionarTema('claro')}
                  className={`ios-press-bounce group relative flex flex-col justify-between rounded-2xl p-4 text-left border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-white ${
                    tema === 'claro'
                      ? 'border-[#111827] dark:border-white ring-2 ring-[#111827] dark:ring-white/40 bg-[#EDEDED]/20 dark:bg-white/10 shadow-sm'
                      : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#1F2937] hover:border-[#9CA3AF] dark:hover:border-gray-500 hover:shadow-xs'
                  }`}
                >
                  {/* Vista previa visual interactiva protegida con data-preserve-theme */}
                  <div data-preserve-theme="light" className="w-full h-24 rounded-xl bg-[#EDEDED] p-2 flex flex-col justify-between border border-black/5 shadow-inner select-none mb-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-black/10">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-[#111827]" />
                        <div className="h-1.5 w-10 rounded bg-[#111827]" />
                      </div>
                      <div className="h-1.5 w-3 rounded bg-[#4B5563]" />
                    </div>
                    <div className="rounded-lg bg-white p-2 shadow-2xs space-y-1 border border-black/5">
                      <div className="h-2 w-14 rounded bg-[#111827]" />
                      <div className="h-1.5 w-full rounded bg-[#9CA3AF]/60" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#111827] dark:text-[#EDEDED]">
                        {t.configuracion.apariencia.modoClaro}
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                          tema === 'claro'
                            ? 'border-[#111827] dark:border-white bg-[#111827] dark:bg-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        aria-hidden="true"
                      >
                        {tema === 'claro' && <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-[#111827]" />}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#4B5563] dark:text-[#D1D5DB] leading-snug">
                      {t.configuracion.apariencia.modoClaroDesc}
                    </p>
                  </div>
                </button>

                {/* 2. MODO OSCURO */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={tema === 'oscuro'}
                  onClick={() => handleSeleccionarTema('oscuro')}
                  className={`ios-press-bounce group relative flex flex-col justify-between rounded-2xl p-4 text-left border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-white ${
                    tema === 'oscuro'
                      ? 'border-[#111827] dark:border-white ring-2 ring-[#111827] dark:ring-white/40 bg-[#EDEDED]/20 dark:bg-white/10 shadow-sm'
                      : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#1F2937] hover:border-[#9CA3AF] dark:hover:border-gray-500 hover:shadow-xs'
                  }`}
                >
                  {/* Vista previa visual de modo oscuro protegida */}
                  <div data-preserve-theme="dark" className="w-full h-24 rounded-xl bg-[#111827] p-2 flex flex-col justify-between border border-white/10 shadow-inner select-none mb-3">
                    <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
                      <div className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-full bg-[#EDEDED]" />
                        <div className="h-1.5 w-10 rounded bg-[#EDEDED]" />
                      </div>
                      <div className="h-1.5 w-3 rounded bg-[#9CA3AF]" />
                    </div>
                    <div className="rounded-lg bg-[#1F2937] p-2 shadow-2xs space-y-1 border border-white/10">
                      <div className="h-2 w-14 rounded bg-[#EDEDED]" />
                      <div className="h-1.5 w-full rounded bg-[#9CA3AF]/40" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#111827] dark:text-[#EDEDED]">
                        {t.configuracion.apariencia.modoOscuro}
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                          tema === 'oscuro'
                            ? 'border-[#111827] dark:border-white bg-[#111827] dark:bg-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        aria-hidden="true"
                      >
                        {tema === 'oscuro' && <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-[#111827]" />}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#4B5563] dark:text-[#D1D5DB] leading-snug">
                      {t.configuracion.apariencia.modoOscuroDesc}
                    </p>
                  </div>
                </button>

                {/* 3. PREFERENCIA DEL SISTEMA */}
                <button
                  type="button"
                  role="radio"
                  aria-checked={tema === 'sistema'}
                  onClick={() => handleSeleccionarTema('sistema')}
                  className={`ios-press-bounce group relative flex flex-col justify-between rounded-2xl p-4 text-left border transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111827] dark:focus-visible:ring-white ${
                    tema === 'sistema'
                      ? 'border-[#111827] dark:border-white ring-2 ring-[#111827] dark:ring-white/40 bg-[#EDEDED]/20 dark:bg-white/10 shadow-sm'
                      : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#1F2937] hover:border-[#9CA3AF] dark:hover:border-gray-500 hover:shadow-xs'
                  }`}
                >
                  {/* Vista previa dividida (Split Claro / Oscuro) protegida */}
                  <div data-preserve-theme="split" className="w-full h-24 rounded-xl overflow-hidden flex border border-black/10 shadow-inner select-none mb-3">
                    {/* Mitad Claro */}
                    <div className="w-1/2 bg-[#EDEDED] p-2 flex flex-col justify-between border-r border-black/10">
                      <div className="flex items-center gap-1">
                        <div className="h-2.5 w-2.5 rounded-full bg-[#111827]" />
                        <div className="h-1 w-6 rounded bg-[#111827]" />
                      </div>
                      <div className="rounded bg-white p-1.5 space-y-1">
                        <div className="h-1.5 w-8 rounded bg-[#111827]" />
                      </div>
                    </div>
                    {/* Mitad Oscuro */}
                    <div className="w-1/2 bg-[#111827] p-2 flex flex-col justify-between">
                      <div className="flex items-center justify-end gap-1">
                        <div className="h-1 w-6 rounded bg-[#EDEDED]" />
                        <div className="h-2.5 w-2.5 rounded-full bg-[#EDEDED]" />
                      </div>
                      <div className="rounded bg-[#1F2937] p-1.5 space-y-1">
                        <div className="h-1.5 w-8 rounded bg-[#EDEDED]" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-[#111827] dark:text-[#EDEDED]">
                        {t.configuracion.apariencia.sistema}
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${
                          tema === 'sistema'
                            ? 'border-[#111827] dark:border-white bg-[#111827] dark:bg-white'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                        aria-hidden="true"
                      >
                        {tema === 'sistema' && <span className="h-1.5 w-1.5 rounded-full bg-white dark:bg-[#111827]" />}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[#4B5563] dark:text-[#D1D5DB] leading-snug">
                      {t.configuracion.apariencia.sistemaDesc}
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* =======================================================================
              SECCIÓN 2: GENERAL -> LENGUAJE Y REGIÓN
             ======================================================================= */}
          {opcionActiva === 'lenguajeRegion' && (
            <div className="rounded-3xl bg-white dark:bg-[#1F2937] p-5 sm:p-7 shadow-xs border border-gray-200/70 dark:border-white/10 space-y-7 animate-fade-in">
              <div>
                <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED]">
                  {t.configuracion.lenguajeRegion.titulo}
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-[#4B5563] dark:text-[#D1D5DB]">
                  {t.configuracion.lenguajeRegion.descripcion}
                </p>
              </div>

              {/* Selector de Idioma */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                    {t.configuracion.lenguajeRegion.idiomaTitulo}
                  </h3>
                  <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
                    {t.configuracion.lenguajeRegion.idiomaDesc}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Seleccionar idioma">
                  {/* Español */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={idioma === 'es'}
                    onClick={() => handleSeleccionarIdioma('es')}
                    className={`ios-press-bounce flex min-h-[50px] cursor-pointer items-center justify-between rounded-2xl px-4 py-3 border text-left transition-all ${
                      idioma === 'es'
                        ? 'border-[#111827] dark:border-white ring-2 ring-[#111827] dark:ring-white/40 bg-[#EDEDED]/30 dark:bg-white/10'
                        : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#1F2937] hover:border-[#9CA3AF] dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🇪🇸</span>
                      <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                        {t.configuracion.lenguajeRegion.espanol}
                      </span>
                    </div>
                    {idioma === 'es' && (
                      <span className="h-2 w-2 rounded-full bg-[#111827] dark:bg-white" aria-hidden="true" />
                    )}
                  </button>

                  {/* English */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={idioma === 'en'}
                    onClick={() => handleSeleccionarIdioma('en')}
                    className={`ios-press-bounce flex min-h-[50px] cursor-pointer items-center justify-between rounded-2xl px-4 py-3 border text-left transition-all ${
                      idioma === 'en'
                        ? 'border-[#111827] dark:border-white ring-2 ring-[#111827] dark:ring-white/40 bg-[#EDEDED]/30 dark:bg-white/10'
                        : 'border-gray-200/80 dark:border-gray-700 bg-white dark:bg-[#1F2937] hover:border-[#9CA3AF] dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🇺🇸</span>
                      <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                        {t.configuracion.lenguajeRegion.ingles}
                      </span>
                    </div>
                    {idioma === 'en' && (
                      <span className="h-2 w-2 rounded-full bg-[#111827] dark:bg-white" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              {/* Selector de Región (Solo Colombia) */}
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                    {t.configuracion.lenguajeRegion.regionTitulo}
                  </h3>
                  <p className="text-[11px] text-[#4B5563] dark:text-[#D1D5DB]">
                    {t.configuracion.lenguajeRegion.regionDesc}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Seleccionar región">
                  {/* Colombia */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={true}
                    onClick={() => handleSeleccionarRegion('CO')}
                    className="ios-press-bounce flex min-h-[50px] cursor-pointer items-center justify-between rounded-2xl px-4 py-3 border text-left transition-all border-[#111827] dark:border-white ring-2 ring-[#111827] dark:ring-white/40 bg-[#EDEDED]/30 dark:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base">🇨🇴</span>
                      <span className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                        {t.configuracion.lenguajeRegion.colombia}
                      </span>
                    </div>
                    <span className="h-2 w-2 rounded-full bg-[#111827] dark:bg-white" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* Tarjeta de Previsualización en Vivo de Formatos */}
              <div className="rounded-2xl bg-[#EDEDED]/40 dark:bg-white/5 p-4 border border-gray-200/70 dark:border-gray-700 space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-[#4B5563] dark:text-[#D1D5DB]">
                  {t.configuracion.lenguajeRegion.previsualizacionTitulo}
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {/* Fecha */}
                  <div className="rounded-xl bg-white dark:bg-[#111827] p-2.5 border border-gray-200/60 dark:border-gray-700">
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-bold">
                      {t.configuracion.lenguajeRegion.fechaEjemplo}
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-[#111827] dark:text-[#EDEDED] mt-0.5">
                      {formatearFecha(fechaEjemplo, region, idioma)}
                    </span>
                  </div>

                  {/* Hora */}
                  <div className="rounded-xl bg-white dark:bg-[#111827] p-2.5 border border-gray-200/60 dark:border-gray-700">
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-bold">
                      {t.configuracion.lenguajeRegion.horaEjemplo}
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold text-[#111827] dark:text-[#EDEDED] mt-0.5">
                      {formatearHora(fechaEjemplo, region)}
                    </span>
                  </div>

                  {/* Separadores */}
                  <div className="rounded-xl bg-white dark:bg-[#111827] p-2.5 border border-gray-200/60 dark:border-gray-700">
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-bold">
                      {t.configuracion.lenguajeRegion.numeroEjemplo}
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold font-mono text-[#111827] dark:text-[#EDEDED] mt-0.5">
                      {formatearNumero(1250000.5, region)}
                    </span>
                  </div>

                  {/* Moneda */}
                  <div className="rounded-xl bg-white dark:bg-[#111827] p-2.5 border border-gray-200/60 dark:border-gray-700">
                    <span className="block text-[10px] text-[#9CA3AF] uppercase font-bold">
                      {t.configuracion.lenguajeRegion.monedaEjemplo}
                    </span>
                    <span className="block text-xs sm:text-[13px] font-semibold font-mono text-[#111827] dark:text-[#EDEDED] mt-0.5">
                      {formatearMonedaRegional(320000, 'COP', region)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

