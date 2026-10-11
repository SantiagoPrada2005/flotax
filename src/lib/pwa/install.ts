/**
 * Utilidades de dominio para la experiencia de instalación nativa de FlotaX
 * en Android/Desktop (beforeinstallprompt) e iOS/iPadOS (Safari y Chrome).
 */

export interface BeforeInstallPromptUserChoice {
  readonly outcome: 'accepted' | 'dismissed';
  readonly platform: string;
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<BeforeInstallPromptUserChoice>;
  prompt(): Promise<void>;
}

export type PwaInstallPlatform =
  | 'chromium-native'
  | 'ios-safari'
  | 'ios-other'
  | 'other';

const DISMISS_STORAGE_KEY = 'flotax_pwa_install_dismissed_until';
const INSTALLED_STORAGE_KEY = 'flotax_pwa_installed_flag';

/**
 * Detecta la plataforma de instalación del dispositivo para decidir entre:
 * - Invocación directa de 1 clic (chromium-native)
 * - Guía espacial apuntando abajo al centro para iPhone Safari (ios-safari)
 * - Guía espacial apuntando arriba a la derecha para Chrome en iOS o iPad (ios-other)
 */
export function detectInstallPlatform(hasDeferredPrompt: boolean): PwaInstallPlatform {
  if (hasDeferredPrompt) {
    return 'chromium-native';
  }

  if (typeof window === 'undefined') {
    return 'other';
  }

  const ua = window.navigator.userAgent || '';
  const isTouchMac = /Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1;
  const isIpad = /iPad/.test(ua) || isTouchMac;
  const isIphoneOrIpod = /iPhone|iPod/.test(ua);

  if (isIphoneOrIpod || isIpad) {
    const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
    // En iPad o en Chrome/Edge de iPhone, el botón Compartir está en la esquina superior derecha
    if (isOtherIosBrowser || isIpad) {
      return 'ios-other';
    }
    return 'ios-safari';
  }

  return 'other';
}

/**
 * Verifica si el usuario pospuso recientemente el banner automático de instalación.
 */
export function isInstallPromptDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const rawUntil = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!rawUntil) {
      return false;
    }
    const untilTimestamp = Number(rawUntil);
    if (Number.isNaN(untilTimestamp)) {
      return false;
    }
    return Date.now() < untilTimestamp;
  } catch {
    return false;
  }
}

/**
 * Pospone la aparición automática del banner de instalación durante el número de días indicado.
 */
export function dismissInstallPromptForDays(days: number = 7): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const untilTimestamp = Date.now() + days * 24 * 60 * 60 * 1000;
    window.localStorage.setItem(DISMISS_STORAGE_KEY, String(untilTimestamp));
  } catch {
    // Ignorar si el almacenamiento local está restringido
  }
}

/**
 * Registra en el navegador que la aplicación ya fue instalada exitosamente.
 */
export function markAppInstalled(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(INSTALLED_STORAGE_KEY, 'true');
  } catch {
    // Ignorar si el almacenamiento local está restringido
  }
}

/**
 * Consulta si la aplicación ya fue marcada como instalada previamente en este navegador.
 */
export function isAppMarkedInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Dispara el evento global para abrir bajo demanda el instalador de la aplicación.
 */
export function openInstallPromptModal(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent('flotax:open-install'));
}
