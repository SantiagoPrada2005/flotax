/**
 * Utilidades cliente para Web Push. Solo usar dentro de islas React (navegador).
 * En iOS el push únicamente está disponible con la PWA instalada.
 */

export interface SuscripcionPushSerializada {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export type EstadoPermisoPush = 'no-soportado' | 'pendiente' | 'concedido' | 'denegado';

export function soportaPush(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function estadoPermisoPush(): EstadoPermisoPush {
  if (!soportaPush()) return 'no-soportado';
  if (Notification.permission === 'granted') return 'concedido';
  if (Notification.permission === 'denied') return 'denegado';
  return 'pendiente';
}

function claveVapidABytes(clave: string): Uint8Array<ArrayBuffer> {
  const base64 = clave.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(clave.length / 4) * 4, '=');
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function serializar(suscripcion: PushSubscription): SuscripcionPushSerializada | null {
  const json = suscripcion.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) return null;
  return { endpoint: json.endpoint, p256dh, auth };
}

/** Devuelve la suscripción existente del dispositivo, si la hay. */
export async function obtenerSuscripcionPush(): Promise<SuscripcionPushSerializada | null> {
  if (!soportaPush()) return null;
  const registro = await navigator.serviceWorker.ready;
  const suscripcion = await registro.pushManager.getSubscription();
  return suscripcion ? serializar(suscripcion) : null;
}

/** Pide permiso (debe invocarse desde un gesto del usuario) y suscribe el dispositivo. */
export async function suscribirDispositivoPush(
  clavePublicaVapid: string
): Promise<SuscripcionPushSerializada | null> {
  if (!soportaPush()) return null;
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') return null;

  const registro = await navigator.serviceWorker.ready;
  const existente = await registro.pushManager.getSubscription();
  const suscripcion =
    existente ??
    (await registro.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: claveVapidABytes(clavePublicaVapid),
    }));
  return serializar(suscripcion);
}
