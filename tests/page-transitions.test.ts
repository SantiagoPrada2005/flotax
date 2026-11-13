import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveNavTabOrder,
  resolveNavSlideDirection,
} from '../src/lib/pwa/page-transitions.ts';

describe('resolveNavTabOrder', () => {
  test('resuelve orden lógico de cliente: Catálogo (0), Reservas (1), Perfil (2)', () => {
    assert.deepEqual(resolveNavTabOrder('/catalogo'), { portal: 'client', index: 0 });
    assert.deepEqual(resolveNavTabOrder('/c/sede-norte'), { portal: 'client', index: 0 });
    assert.deepEqual(resolveNavTabOrder('/vehiculos/123'), { portal: 'client', index: 0 });
    assert.deepEqual(resolveNavTabOrder('/reservas'), { portal: 'client', index: 1 });
    assert.deepEqual(resolveNavTabOrder('/reservas/ABC-1'), { portal: 'client', index: 1 });
    assert.deepEqual(resolveNavTabOrder('/perfil'), { portal: 'client', index: 2 });
    assert.deepEqual(resolveNavTabOrder('/perfil/verificacion'), { portal: 'client', index: 2 });
  });

  test('resuelve orden lógico de admin en móvil vs escritorio', () => {
    // Móvil: Panel (0), Métricas (1), Flota (2), Reservas (3), Caja (4)
    assert.deepEqual(resolveNavTabOrder('/admin/', false), { portal: 'admin', index: 0 });
    assert.deepEqual(resolveNavTabOrder('/admin/metricas', false), { portal: 'admin', index: 1 });
    assert.deepEqual(resolveNavTabOrder('/admin/flota', false), { portal: 'admin', index: 2 });
    assert.deepEqual(resolveNavTabOrder('/admin/reservas', false), { portal: 'admin', index: 3 });
    assert.deepEqual(resolveNavTabOrder('/admin/caja', false), { portal: 'admin', index: 4 });

    // Escritorio: Panel (0), Métricas (1), Reservas (2), Flota (3), Caja (4)
    assert.deepEqual(resolveNavTabOrder('/admin/reservas', true), { portal: 'admin', index: 2 });
    assert.deepEqual(resolveNavTabOrder('/admin/flota', true), { portal: 'admin', index: 3 });
  });

  test('excluye landing, login y formularios/wizards donde no aplica transición de tab', () => {
    assert.equal(resolveNavTabOrder('/'), null);
    assert.equal(resolveNavTabOrder('/login'), null);
    assert.equal(resolveNavTabOrder('/admin/flota/nuevo'), null);
    assert.equal(resolveNavTabOrder('/admin/flota/v1/editar'), null);
    assert.equal(resolveNavTabOrder('/alquilar/v1'), null);
    assert.equal(resolveNavTabOrder('/reservas/R-1/entrega'), null);
  });
});

describe('resolveNavSlideDirection', () => {
  test('devuelve slide-forward al avanzar hacia opciones posteriores (consecutivas y no consecutivas)', () => {
    assert.equal(resolveNavSlideDirection('/catalogo', '/reservas'), 'slide-forward');
    assert.equal(resolveNavSlideDirection('/catalogo', '/perfil'), 'slide-forward');
    assert.equal(resolveNavSlideDirection('/reservas', '/perfil'), 'slide-forward');
    assert.equal(resolveNavSlideDirection('/admin', '/admin/caja', false), 'slide-forward');
    assert.equal(resolveNavSlideDirection('/admin/flota', '/admin/reservas', false), 'slide-forward');
  });

  test('devuelve slide-back al retroceder hacia opciones anteriores', () => {
    assert.equal(resolveNavSlideDirection('/perfil', '/catalogo'), 'slide-back');
    assert.equal(resolveNavSlideDirection('/perfil', '/reservas'), 'slide-back');
    assert.equal(resolveNavSlideDirection('/reservas', '/catalogo'), 'slide-back');
    assert.equal(resolveNavSlideDirection('/admin/caja', '/admin', false), 'slide-back');
    assert.equal(resolveNavSlideDirection('/admin/reservas', '/admin/flota', false), 'slide-back');
  });

  test('devuelve null en misma opción, rutas externas o cambio entre portales', () => {
    assert.equal(resolveNavSlideDirection('/catalogo', '/catalogo'), null);
    assert.equal(resolveNavSlideDirection('/catalogo', '/vehiculos/123'), null);
    assert.equal(resolveNavSlideDirection('/catalogo', '/login'), null);
    assert.equal(resolveNavSlideDirection('/catalogo', '/admin'), null);
  });
});
