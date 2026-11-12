import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolverModoPortalInicial,
  evaluarRedireccionModoPortal,
  type ModoPortal,
} from '../src/lib/auth/portal-modo';

test('resolverModoPortalInicial: usuario sin rol de patio siempre es CLIENTE', () => {
  const modo: ModoPortal = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: false }, 'ADMIN');
  assert.equal(modo, 'CLIENTE');
});

test('resolverModoPortalInicial: operador sin cookie por defecto es ADMIN', () => {
  const modo: ModoPortal = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: true }, undefined);
  assert.equal(modo, 'ADMIN');
});

test('resolverModoPortalInicial: operador con cookie CLIENTE respeta CLIENTE', () => {
  const modo: ModoPortal = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: true }, 'CLIENTE');
  assert.equal(modo, 'CLIENTE');
});

test('resolverModoPortalInicial: operador con cookie ADMIN respeta ADMIN', () => {
  const modo: ModoPortal = resolverModoPortalInicial({ esSuperAdmin: true, tieneRolPatio: false }, 'ADMIN');
  assert.equal(modo, 'ADMIN');
});

test('resolverModoPortalInicial: operador con cookie inválida por defecto es ADMIN', () => {
  const modo: ModoPortal = resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: true }, 'INVALID_MODE');
  assert.equal(modo, 'ADMIN');
});

test('resolverModoPortalInicial: usuario sin rol de patio con cookie inválida o ausente es CLIENTE', () => {
  assert.equal(resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: false }, null), 'CLIENTE');
  assert.equal(resolverModoPortalInicial({ esSuperAdmin: false, tieneRolPatio: false }, undefined), 'CLIENTE');
});

test('evaluarRedireccionModoPortal: ADMIN en /reservas redirige a /admin/reservas', () => {
  assert.equal(evaluarRedireccionModoPortal('/reservas', 'ADMIN', true), '/admin/reservas');
  assert.equal(evaluarRedireccionModoPortal('/reservas/', 'ADMIN', true), '/admin/reservas');
});

test('evaluarRedireccionModoPortal: ADMIN en /reservas/[codigo] redirige a /admin/reservas/[codigo]', () => {
  assert.equal(
    evaluarRedireccionModoPortal('/reservas/ABC-123', 'ADMIN', true),
    '/admin/reservas/ABC-123'
  );
});

test('evaluarRedireccionModoPortal: ADMIN en /reservas/[codigo]/entrega no redirige (permitido para inspección)', () => {
  assert.equal(evaluarRedireccionModoPortal('/reservas/ABC-123/entrega', 'ADMIN', true), null);
});

test('evaluarRedireccionModoPortal: CLIENTE sin rol de patio en /admin redirige a /catalogo', () => {
  assert.equal(evaluarRedireccionModoPortal('/admin', 'CLIENTE', false), '/catalogo');
  assert.equal(evaluarRedireccionModoPortal('/admin/flota', 'CLIENTE', false), '/catalogo');
});

test('evaluarRedireccionModoPortal: CLIENTE en /reservas no redirige', () => {
  assert.equal(evaluarRedireccionModoPortal('/reservas', 'CLIENTE', true), null);
  assert.equal(evaluarRedireccionModoPortal('/reservas/ABC-123', 'CLIENTE', false), null);
});
