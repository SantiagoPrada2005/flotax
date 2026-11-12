import test from 'node:test';
import assert from 'node:assert/strict';
import { resolverModoPortalInicial, type ModoPortal } from '../src/lib/auth/portal-modo';

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
