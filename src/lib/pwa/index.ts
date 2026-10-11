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
