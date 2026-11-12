import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PERMISOS } from '../src/lib/auth/permisos.ts';
import { obtenerPermisosBasePorRol } from '../src/lib/auth/rbac.ts';
import {
  estadosVehiculo,
  estadosReserva,
  estadosContratoAlquiler,
  categoriasEgreso,
} from '../src/db/schema/index.ts';

describe('RBAC y Enums del Ciclo de Alquiler', () => {
  it('ADMIN posee CONTRATOS_ANULAR y CONTRATOS_PAUSAR; ASESOR no posee privilegios de pausa, ajuste, sobrecosto ni reembolso', () => {
    const permisosAdmin = obtenerPermisosBasePorRol('ADMIN');
    const permisosAsesor = obtenerPermisosBasePorRol('ASESOR');
    assert.equal(permisosAdmin.includes(PERMISOS.CONTRATOS_ANULAR), true);
    assert.equal(permisosAdmin.includes((PERMISOS as Record<string, string>).CONTRATOS_PAUSAR), true);

    assert.equal(permisosAsesor.includes((PERMISOS as Record<string, string>).CONTRATOS_PAUSAR), false);
    assert.equal(permisosAsesor.includes(PERMISOS.CONTRATOS_MODIFICAR_TARIFA), false);
    assert.equal(permisosAsesor.includes(PERMISOS.NOVEDADES_CARGOS_APROBAR), false);
    assert.equal(permisosAsesor.includes(PERMISOS.CONTRATOS_ANULAR), false);
    assert.equal(permisosAsesor.includes(PERMISOS.CAJA_GASTOS_REGISTRAR), false);
  });

  it('El esquema D1 expone NO_DISPONIBLE, PAUSADA, PAUSADO y REEMBOLSO_ALQUILER', () => {
    assert.ok(estadosVehiculo.includes('NO_DISPONIBLE' as never));
    assert.ok(estadosReserva.includes('PAUSADA' as never));
    assert.ok(estadosContratoAlquiler.includes('PAUSADO' as never));
    assert.ok(categoriasEgreso.includes('REEMBOLSO_ALQUILER' as never));
  });
});
