import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolverModoPortalInicial,
  evaluarRedireccionModoPortal,
  resolverVarianteDock,
  esUsuarioPersonal,
  sanitizarRetornoEntrega,
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

test('resolverVarianteDock: en /perfil o /configuracion con datasetModo ADMIN resuelve admin', () => {
  assert.equal(resolverVarianteDock('/perfil', 'ADMIN', 'client'), 'admin');
  assert.equal(resolverVarianteDock('/configuracion', 'ADMIN', 'client'), 'admin');
  assert.equal(resolverVarianteDock('/notificaciones', 'ADMIN'), 'admin');
});

test('resolverVarianteDock: con datasetModo CLIENTE resuelve client', () => {
  assert.equal(resolverVarianteDock('/perfil', 'CLIENTE', 'admin'), 'client');
  assert.equal(resolverVarianteDock('/catalogo', 'CLIENTE', 'client'), 'client');
});

test('resolverVarianteDock: sin datasetModo usa pathname /admin o propVariant admin como fallback', () => {
  assert.equal(resolverVarianteDock('/admin', undefined, 'client'), 'admin');
  assert.equal(resolverVarianteDock('/admin/flota', undefined, undefined), 'admin');
  assert.equal(resolverVarianteDock('/perfil', undefined, 'admin'), 'admin');
  assert.equal(resolverVarianteDock('/perfil', undefined, 'client'), 'client');
  assert.equal(resolverVarianteDock('/catalogo', 'INVALIDO', 'client'), 'client');
});

test('esUsuarioPersonal: identifica SuperAdmin, roles de patio y excluye USUARIO o nulos', () => {
  assert.equal(esUsuarioPersonal(null), false);
  assert.equal(esUsuarioPersonal(undefined), false);
  assert.equal(esUsuarioPersonal({ esSuperAdmin: false, localActivo: null }), false);
  assert.equal(esUsuarioPersonal({ esSuperAdmin: false, localActivo: { rol: 'USUARIO' } }), false);
  assert.equal(esUsuarioPersonal({ esSuperAdmin: true, localActivo: null }), true);
  assert.equal(esUsuarioPersonal({ esSuperAdmin: true, localActivo: { rol: 'USUARIO' } }), true);
  assert.equal(esUsuarioPersonal({ esSuperAdmin: false, localActivo: { rol: 'DUENO' } }), true);
  assert.equal(esUsuarioPersonal({ esSuperAdmin: false, localActivo: { rol: 'OPERADOR' } }), true);
});

test('sanitizarRetornoEntrega: permite rutas /admin y /reservas y bloquea open-redirects o backslashes', () => {
  assert.equal(sanitizarRetornoEntrega('/admin/reservas/ABC-123'), '/admin/reservas/ABC-123');
  assert.equal(sanitizarRetornoEntrega('/reservas/ABC-123'), '/reservas/ABC-123');
  assert.equal(sanitizarRetornoEntrega('/admin'), '/admin');
  assert.equal(sanitizarRetornoEntrega(null), undefined);
  assert.equal(sanitizarRetornoEntrega(undefined), undefined);
  assert.equal(sanitizarRetornoEntrega(''), undefined);
  assert.equal(sanitizarRetornoEntrega('https://evil.com'), undefined);
  assert.equal(sanitizarRetornoEntrega('//evil.com/admin'), undefined);
  assert.equal(sanitizarRetornoEntrega('/admin\\evil.com'), undefined);
  assert.equal(sanitizarRetornoEntrega('/\\evil.com'), undefined);
  assert.equal(sanitizarRetornoEntrega('/catalogo'), undefined);
  assert.equal(sanitizarRetornoEntrega('/perfil'), undefined);
});
