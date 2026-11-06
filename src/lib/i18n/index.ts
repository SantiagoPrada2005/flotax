/**
 * Sistema Canónico de Internacionalización (i18n) y Formatos Regionales - FlotaX
 */

export type Idioma = 'es' | 'en';
export type Region = 'CO';

export interface Traducciones {
  nav: {
    inicio: string;
    catalogo: string;
    reservas: string;
    perfil: string;
    suscripcion: string;
    configuracion: string;
    ayuda: string;
    cerrarSesion: string;
    iniciarSesion: string;
    crearCuenta: string;
    panelAdmin: string;
    panelPatio: string;
    metricas: string;
    flota: string;
    caja: string;
    nuevaReserva: string;
    volver: string;
  };
  configuracion: {
    titulo: string;
    subtitulo: string;
    categorias: {
      general: string;
      cuenta: string;
    };
    opciones: {
      apariencia: string;
      lenguajeRegion: string;
    };
    apariencia: {
      titulo: string;
      descripcion: string;
      modoClaro: string;
      modoClaroDesc: string;
      modoOscuro: string;
      modoOscuroDesc: string;
      sistema: string;
      sistemaDesc: string;
      seleccionado: string;
      vistaPrevia: string;
    };
    lenguajeRegion: {
      titulo: string;
      descripcion: string;
      idiomaTitulo: string;
      idiomaDesc: string;
      regionTitulo: string;
      regionDesc: string;
      espanol: string;
      ingles: string;
      colombia: string;
      estadosUnidos: string;
      previsualizacionTitulo: string;
      fechaEjemplo: string;
      horaEjemplo: string;
      numeroEjemplo: string;
      monedaEjemplo: string;
      guardadoExitoso: string;
    };
  };
  estadosVehiculo: {
    disponible: string;
    reservado: string;
    mantenimiento: string;
    fueraServicio: string;
  };
  comunes: {
    guardar: string;
    cancelar: string;
    continuar: string;
    cargando: string;
    activo: string;
    exito: string;
    error: string;
  };
}

export const DICCIONARIOS: Record<Idioma, Traducciones> = {
  es: {
    nav: {
      inicio: 'Inicio',
      catalogo: 'Catálogo',
      reservas: 'Mis Reservas',
      perfil: 'Perfil',
      suscripcion: 'Suscripción',
      configuracion: 'Configuración',
      ayuda: 'Centro de ayuda',
      cerrarSesion: 'Cerrar sesión',
      iniciarSesion: 'Iniciar sesión',
      crearCuenta: 'Crear cuenta',
      panelAdmin: 'Panel operativo',
      panelPatio: 'Panel de Patio',
      metricas: 'Métricas & Telemetría',
      flota: 'Control de Flota',
      caja: 'Caja & Finanzas',
      nuevaReserva: 'Nueva Reserva',
      volver: 'Volver',
    },
    configuracion: {
      titulo: 'Configuración',
      subtitulo: 'Personaliza tu experiencia, preferencias de visualización y formatos regionales.',
      categorias: {
        general: 'General',
        cuenta: 'Cuenta',
      },
      opciones: {
        apariencia: 'Apariencia',
        lenguajeRegion: 'Lenguaje y región',
      },
      apariencia: {
        titulo: 'Temas',
        descripcion: 'Elige cómo quieres ver Flotax.',
        modoClaro: 'Modo claro',
        modoClaroDesc: 'Superficie clara optimizada para iluminación diurna.',
        modoOscuro: 'Modo oscuro',
        modoOscuroDesc: 'Superficie oscura de alto contraste para entornos de baja luz.',
        sistema: 'Preferencia del sistema',
        sistemaDesc: 'Se sincroniza automáticamente con el tema de tu dispositivo.',
        seleccionado: 'Activo',
        vistaPrevia: 'Vista previa',
      },
      lenguajeRegion: {
        titulo: 'Lenguaje y región',
        descripcion: 'Personaliza el idioma y los formatos que utiliza Flotax.',
        idiomaTitulo: 'Idioma de la interfaz',
        idiomaDesc: 'Selecciona el idioma principal de navegación y contenido.',
        regionTitulo: 'Región y formatos numéricos',
        regionDesc: 'Ajusta la presentación de fechas, horas y separadores de millares.',
        espanol: 'Español',
        ingles: 'English',
        colombia: 'Colombia (CO)',
        estadosUnidos: 'Estados Unidos (US)',
        previsualizacionTitulo: 'Previsualización de formatos en vivo',
        fechaEjemplo: 'Fecha',
        horaEjemplo: 'Hora',
        numeroEjemplo: 'Separadores',
        monedaEjemplo: 'Formato monetario',
        guardadoExitoso: 'Preferencias actualizadas correctamente',
      },
    },
    estadosVehiculo: {
      disponible: 'Disponible',
      reservado: 'Reservado',
      mantenimiento: 'En Mantenimiento',
      fueraServicio: 'Fuera de Servicio',
    },
    comunes: {
      guardar: 'Guardar',
      cancelar: 'Cancelar',
      continuar: 'Continuar',
      cargando: 'Cargando...',
      activo: 'Activo',
      exito: 'Operación exitosa',
      error: 'Ha ocurrido un error',
    },
  },
  en: {
    nav: {
      inicio: 'Home',
      catalogo: 'Catalog',
      reservas: 'My Bookings',
      perfil: 'Profile',
      suscripcion: 'Subscription',
      configuracion: 'Settings',
      ayuda: 'Help Center',
      cerrarSesion: 'Sign out',
      iniciarSesion: 'Sign in',
      crearCuenta: 'Sign up',
      panelAdmin: 'Operations Hub',
      panelPatio: 'Fleet Yard Hub',
      metricas: 'Metrics & Telemetry',
      flota: 'Fleet Control',
      caja: 'Cash & Finance',
      nuevaReserva: 'New Booking',
      volver: 'Back',
    },
    configuracion: {
      titulo: 'Settings',
      subtitulo: 'Customize your experience, visual appearance, and regional preferences.',
      categorias: {
        general: 'General',
        cuenta: 'Account',
      },
      opciones: {
        apariencia: 'Appearance',
        lenguajeRegion: 'Language & region',
      },
      apariencia: {
        titulo: 'Themes',
        descripcion: 'Choose how you want to see FlotaX.',
        modoClaro: 'Light mode',
        modoClaroDesc: 'Clean bright surface optimized for daylight clarity.',
        modoOscuro: 'Dark mode',
        modoOscuroDesc: 'High-contrast dark surface for low-light environments.',
        sistema: 'System preference',
        sistemaDesc: 'Automatically matches your device operating system theme.',
        seleccionado: 'Active',
        vistaPrevia: 'Preview',
      },
      lenguajeRegion: {
        titulo: 'Language & region',
        descripcion: 'Customize the language and formats used by FlotaX.',
        idiomaTitulo: 'Interface Language',
        idiomaDesc: 'Select primary language for navigation and platform copy.',
        regionTitulo: 'Region & Numerical Formats',
        regionDesc: 'Adjust display formatting for dates, times, and decimal separators.',
        espanol: 'Español',
        ingles: 'English',
        colombia: 'Colombia (CO)',
        estadosUnidos: 'United States (US)',
        previsualizacionTitulo: 'Live regional format preview',
        fechaEjemplo: 'Date',
        horaEjemplo: 'Time',
        numeroEjemplo: 'Separators',
        monedaEjemplo: 'Currency format',
        guardadoExitoso: 'Preferences updated successfully',
      },
    },
    estadosVehiculo: {
      disponible: 'Available',
      reservado: 'Booked',
      mantenimiento: 'In Maintenance',
      fueraServicio: 'Out of Service',
    },
    comunes: {
      guardar: 'Save',
      cancelar: 'Cancel',
      continuar: 'Continue',
      cargando: 'Loading...',
      activo: 'Active',
      exito: 'Success',
      error: 'An error occurred',
    },
  },
};

export const STORAGE_KEY_IDIOMA = 'flotax_lang';
export const STORAGE_KEY_REGION = 'flotax_region';

/**
 * Obtiene el idioma actualmente persistido o predeterminado ('es').
 */
export function obtenerIdiomaActual(): Idioma {
  if (typeof window === 'undefined') return 'es';
  try {
    const guardado = localStorage.getItem(STORAGE_KEY_IDIOMA);
    if (guardado === 'es' || guardado === 'en') return guardado;
  } catch {
    // Modo privado o storage restringido
  }
  return 'es';
}

/**
 * Obtiene la región actualmente persistida o predeterminada ('CO').
 */
export function obtenerRegionActual(): Region {
  return 'CO';
}

/**
 * Actualiza y persiste el idioma seleccionado, sincronizando cookies y eventos globales.
 */
export function cambiarIdioma(nuevoIdioma: Idioma): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_IDIOMA, nuevoIdioma);
    document.cookie = `${STORAGE_KEY_IDIOMA}=${nuevoIdioma}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = nuevoIdioma;
  } catch {
    // Ignorar si storage está bloqueado
  }

  window.dispatchEvent(
    new CustomEvent('flotax:i18n-change', {
      detail: {
        idioma: nuevoIdioma,
        region: obtenerRegionActual(),
      },
    })
  );
}

/**
 * Actualiza y persiste la región seleccionada, sincronizando cookies y eventos globales.
 */
export function cambiarRegion(nuevaRegion: Region = 'CO'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_REGION, nuevaRegion);
    document.cookie = `${STORAGE_KEY_REGION}=${nuevaRegion}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // Ignorar si storage está bloqueado
  }

  window.dispatchEvent(
    new CustomEvent('flotax:i18n-change', {
      detail: {
        idioma: obtenerIdiomaActual(),
        region: nuevaRegion,
      },
    })
  );
}

/**
 * Formateo regional de fecha respetando la región e idioma del usuario.
 */
export function formatearFecha(
  fecha: Date = new Date(),
  region: Region = obtenerRegionActual(),
  idioma: Idioma = obtenerIdiomaActual()
): string {
  const locale = region === 'CO'
    ? (idioma === 'en' ? 'en-CO' : 'es-CO')
    : 'es-CO';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(fecha);
}

/**
 * Formateo regional de hora respetando la convención de la región (formato 24h en Colombia).
 */
export function formatearHora(
  fecha: Date = new Date(),
  region: Region = obtenerRegionActual()
): string {
  const locale = region === 'CO' ? 'es-CO' : 'es-CO';
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).format(fecha);
}

/**
 * Formateo de separadores numéricos y decimales según la región.
 */
export function formatearNumero(
  valor: number,
  region: Region = obtenerRegionActual()
): string {
  const locale = region === 'CO' ? 'es-CO' : 'es-CO';
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Formateo de moneda respetando el valor y la moneda original del contrato,
 * pero aplicando la máscara regional adecuada.
 */
export function formatearMonedaRegional(
  monto: number,
  moneda: string = 'COP',
  region: Region = obtenerRegionActual()
): string {
  const locale = region === 'CO' ? 'es-CO' : 'es-CO';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: moneda === 'COP' ? 0 : 2,
  }).format(monto);
}

