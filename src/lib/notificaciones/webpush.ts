/**
 * Cliente Web Push mínimo para Cloudflare Workers (WebCrypto, sin dependencias de Node).
 * Implementa VAPID (RFC 8292) y cifrado de contenido aes128gcm (RFC 8291 / RFC 8188).
 */

export interface ClavesVapid {
  publicKey: string; // punto P-256 sin comprimir (65 bytes) en base64url
  privateKey: string; // escalar privado (32 bytes) en base64url
  subject: string; // mailto: o https: de contacto
}

export interface DestinoPush {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface ResultadoPush {
  ok: boolean;
  status: number;
  /** El servicio push indica que la suscripción ya no existe (404/410). */
  expirada: boolean;
}

const encoder = new TextEncoder();

function desdeBase64Url(valor: string): Uint8Array<ArrayBuffer> {
  const base64 = valor.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(valor.length / 4) * 4, '=');
  const binario = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binario.length));
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

function haciaBase64Url(datos: ArrayBuffer | Uint8Array): string {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concatenar(...partes: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = partes.reduce((suma, p) => suma + p.length, 0);
  const salida = new Uint8Array(new ArrayBuffer(total));
  let desplazamiento = 0;
  for (const parte of partes) {
    salida.set(parte, desplazamiento);
    desplazamiento += parte.length;
  }
  return salida;
}

async function firmarVapid(endpoint: string, claves: ClavesVapid): Promise<string> {
  const publica = desdeBase64Url(claves.publicKey);
  const llave = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: claves.privateKey,
      x: haciaBase64Url(publica.slice(1, 33)),
      y: haciaBase64Url(publica.slice(33, 65)),
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const cabecera = haciaBase64Url(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const reclamos = haciaBase64Url(
    encoder.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: claves.subject,
      })
    )
  );
  const mensaje = `${cabecera}.${reclamos}`;
  const firma = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    llave,
    encoder.encode(mensaje)
  );
  return `${mensaje}.${haciaBase64Url(firma)}`;
}

async function hkdf(
  secreto: Uint8Array<ArrayBuffer>,
  sal: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  bits: number
): Promise<Uint8Array<ArrayBuffer>> {
  const base = await crypto.subtle.importKey('raw', secreto, 'HKDF', false, ['deriveBits']);
  const derivado = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info }, base, bits);
  return new Uint8Array(derivado);
}

async function cifrarContenido(destino: DestinoPush, texto: string): Promise<Uint8Array<ArrayBuffer>> {
  const clavePublicaCliente = desdeBase64Url(destino.p256dh);
  const secretoAuth = desdeBase64Url(destino.auth);

  const parEfimero = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const publicaEfimera = new Uint8Array(await crypto.subtle.exportKey('raw', parEfimero.publicKey));

  const llaveCliente = await crypto.subtle.importKey(
    'raw',
    clavePublicaCliente,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  const secretoCompartido = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: llaveCliente }, parEfimero.privateKey, 256)
  );

  const infoClave = concatenar(encoder.encode('WebPush: info\0'), clavePublicaCliente, publicaEfimera);
  const ikm = await hkdf(secretoCompartido, secretoAuth, infoClave, 256);

  const sal = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  const cek = await hkdf(ikm, sal, encoder.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(ikm, sal, encoder.encode('Content-Encoding: nonce\0'), 96);

  // Un único registro: contenido + delimitador 0x02 (último registro).
  const claro = concatenar(encoder.encode(texto), new Uint8Array([2]));
  const llaveAes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, llaveAes, claro));

  const tamanoRegistro = new Uint8Array(new ArrayBuffer(4));
  new DataView(tamanoRegistro.buffer).setUint32(0, 4096);
  return concatenar(sal, tamanoRegistro, new Uint8Array([publicaEfimera.length]), publicaEfimera, cifrado);
}

export async function enviarWebPush(
  destino: DestinoPush,
  contenido: unknown,
  claves: ClavesVapid
): Promise<ResultadoPush> {
  const [jwt, cuerpo] = await Promise.all([
    firmarVapid(destino.endpoint, claves),
    cifrarContenido(destino, JSON.stringify(contenido)),
  ]);

  const respuesta = await fetch(destino.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${claves.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(60 * 60 * 24),
      Urgency: 'normal',
    },
    body: cuerpo,
  });

  return {
    ok: respuesta.ok,
    status: respuesta.status,
    expirada: respuesta.status === 404 || respuesta.status === 410,
  };
}
