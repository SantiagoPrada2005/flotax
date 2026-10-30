export {
  isStandalonePwa,
  isSpaInterceptableUrl,
  registerPwaServiceWorker,
} from './standalone';

export {
  type BeforeInstallPromptEvent,
  type BeforeInstallPromptUserChoice,
  type PwaInstallPlatform,
  detectInstallPlatform,
  isInstallPromptDismissed,
  dismissInstallPromptForDays,
  markAppInstalled,
  isAppMarkedInstalled,
  openInstallPromptModal,
} from './install';

export {
  type EstadoPermisoPush,
  type SuscripcionPushSerializada,
  soportaPush,
  estadoPermisoPush,
  obtenerSuscripcionPush,
  suscribirDispositivoPush,
} from './push';

export {
  prefetchHtml,
  prefetchRutasCalientes,
  rutasCalientes,
} from './navigation-cache';
