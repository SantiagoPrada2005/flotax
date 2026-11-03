import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  aplicarPoliticaCacheHtml,
  resolverPoliticaCacheHtml,
  type PoliticaCacheHtml,
} from '../src/lib/pwa/cache-policy.ts';

function obtenerPolitica(ruta: string): PoliticaCacheHtml {
  const politica = resolverPoliticaCacheHtml(ruta);

  if (politica === null || politica === 'no-store') {
    throw new Error(`Se esperaba una política de caché para ${ruta}`);
  }

  return politica;
}

function crearRespuestaHtml(
  estado = 200,
  cabeceras: Record<string, string> = {}
): Response {
  return new Response('<!doctype html><html><body>FlotaX</body></html>', {
    status: estado,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      ...cabeceras,
    },
  });
}

describe('resolverPoliticaCacheHtml', () => {
  test('catálogo, locales y fichas usan 30 s', () => {
    for (const ruta of [
      '/catalogo',
      '/catalogo/',
      '/c/centro',
      '/c/centro/',
      '/vehiculos/abc-123',
    ]) {
      assert.equal(obtenerPolitica(ruta).ttlSegundos, 30, ruta);
    }
  });

  test('admin usa 5 s y cliente 10 s', () => {
    assert.equal(obtenerPolitica('/admin').ttlSegundos, 5);
    assert.equal(obtenerPolitica('/admin/flota').ttlSegundos, 5);
    assert.equal(obtenerPolitica('/reservas/abc').ttlSegundos, 10);
    assert.equal(obtenerPolitica('/perfil').ttlSegundos, 10);
    assert.equal(obtenerPolitica('/notificaciones').ttlSegundos, 10);
  });

  test('landing y offline tienen TTL explícito', () => {
    assert.equal(obtenerPolitica('/').ttlSegundos, 60);
    assert.equal(obtenerPolitica('/offline').ttlSegundos, 300);
  });

  test('login, registro, home y errores nunca se cachean', () => {
    for (const ruta of ['/login', '/registro', '/home', '/404', '/500', '/error']) {
      assert.equal(resolverPoliticaCacheHtml(ruta), 'no-store', ruta);
    }
  });

  test('assets, API y Actions se omiten', () => {
    for (const ruta of [
      '/_astro/app.js',
      '/api/auth/session',
      '/_actions/perfil/actualizar',
      '/_server-islands/foo',
      '/icons/icon-192.png',
      '/sw.js',
      '/manifest.webmanifest',
    ]) {
      assert.equal(resolverPoliticaCacheHtml(ruta), null, ruta);
    }
  });

  test('una ruta nueva recibe must-revalidate como red de seguridad', () => {
    const politica = obtenerPolitica('/ruta-nueva');

    assert.equal(politica.ttlSegundos, 0);
    assert.equal(politica.cacheControl, 'private, max-age=0, must-revalidate');
  });
});

describe('aplicarPoliticaCacheHtml', () => {
  test('aplica Cache-Control privado y Vary Cookie en producción', () => {
    const respuesta = crearRespuestaHtml();

    aplicarPoliticaCacheHtml(respuesta, '/catalogo', 'produccion');

    assert.equal(
      respuesta.headers.get('Cache-Control'),
      'private, max-age=30, stale-while-revalidate=60'
    );
    assert.equal(respuesta.headers.get('Vary'), 'Cookie');
  });

  test('respeta un Vary existente sin duplicar Cookie', () => {
    const respuesta = crearRespuestaHtml(200, { Vary: 'Accept-Encoding' });

    aplicarPoliticaCacheHtml(respuesta, '/admin', 'produccion');

    assert.equal(respuesta.headers.get('Vary'), 'Accept-Encoding, Cookie');
  });

  test('no duplica Cookie si ya está en Vary', () => {
    const respuesta = crearRespuestaHtml(200, { Vary: 'Cookie' });

    aplicarPoliticaCacheHtml(respuesta, '/admin', 'produccion');

    assert.equal(respuesta.headers.get('Vary'), 'Cookie');
  });

  test('desarrollo siempre usa no-store', () => {
    const respuesta = crearRespuestaHtml();

    aplicarPoliticaCacheHtml(respuesta, '/catalogo', 'desarrollo');

    assert.equal(respuesta.headers.get('Cache-Control'), 'no-store');
  });

  test('respuestas con Set-Cookie no se cachean', () => {
    const respuesta = crearRespuestaHtml(200, {
      'Set-Cookie': 'flotax_rev=abc; Path=/',
    });

    aplicarPoliticaCacheHtml(respuesta, '/login', 'produccion');

    assert.equal(respuesta.headers.get('Cache-Control'), 'no-store');
  });

  test('respuestas no HTML no se tocan', () => {
    const respuesta = new Response('{}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    aplicarPoliticaCacheHtml(respuesta, '/catalogo', 'produccion');

    assert.equal(respuesta.headers.get('Cache-Control'), null);
  });

  test('redirects y errores HTML usan no-store', () => {
    const redireccion = crearRespuestaHtml(302, { Location: '/login' });

    aplicarPoliticaCacheHtml(redireccion, '/admin', 'produccion');

    assert.equal(redireccion.headers.get('Cache-Control'), 'no-store');

    const error = crearRespuestaHtml(500);

    aplicarPoliticaCacheHtml(error, '/admin', 'produccion');

    assert.equal(error.headers.get('Cache-Control'), 'no-store');
  });

  test('respeta un no-store explícito de la página', () => {
    const respuesta = crearRespuestaHtml(200, { 'Cache-Control': 'no-store' });

    aplicarPoliticaCacheHtml(respuesta, '/catalogo', 'produccion');

    assert.equal(respuesta.headers.get('Cache-Control'), 'no-store');
  });
});
