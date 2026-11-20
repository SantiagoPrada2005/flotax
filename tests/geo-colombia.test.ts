import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEPARTAMENTOS_COLOMBIA,
  formatearUbicacionOperativa,
  normalizarTextoBusqueda,
  obtenerCiudadesPorDepartamento,
  obtenerDepartamentosColombia,
} from '@/lib/geo/colombia';

describe('Catálogo Geográfico de Colombia (DANE DIVIPOLA)', () => {
  it('incluye los 32 departamentos más Bogotá D.C. (33 entidades) ordenados alfabéticamente', () => {
    const deptos = obtenerDepartamentosColombia();
    assert.equal(deptos.length, 33);
    assert.ok(deptos.some((d) => d.nombre === 'Bogotá D.C.'));
    assert.ok(deptos.some((d) => d.nombre === 'Antioquia'));
    assert.ok(deptos.some((d) => d.nombre === 'Valle del Cauca'));

    const nombres = deptos.map((d) => d.nombre);
    const ordenados = [...nombres].sort((a, b) => a.localeCompare(b, 'es'));
    assert.deepEqual(nombres, ordenados);
  });

  it('filtra ciudades exclusivamente por el departamento seleccionado', () => {
    const antioquia = obtenerCiudadesPorDepartamento('Antioquia');
    assert.ok(antioquia.includes('Medellín'));
    assert.ok(antioquia.includes('Envigado'));
    assert.ok(!antioquia.includes('Cali'));
    assert.ok(!antioquia.includes('Bogotá D.C.'));

    const bogota = obtenerCiudadesPorDepartamento('Bogotá D.C.');
    assert.deepEqual(bogota, ['Bogotá D.C.']);

    const inexistente = obtenerCiudadesPorDepartamento('Departamento Inexistente');
    assert.deepEqual(inexistente, []);
  });

  it('mantiene todos los departamentos con al menos una ciudad y sin duplicados', () => {
    for (const depto of DEPARTAMENTOS_COLOMBIA) {
      assert.ok(depto.ciudades.length > 0, `${depto.nombre} debe tener ciudades`);
      const unicas = new Set(depto.ciudades);
      assert.equal(unicas.size, depto.ciudades.length, `${depto.nombre} tiene ciudades duplicadas`);
    }
  });

  it('normaliza búsquedas sin distinguir tildes ni mayúsculas', () => {
    assert.equal(normalizarTextoBusqueda('Medellín'), 'medellin');
    assert.equal(normalizarTextoBusqueda('  Bogotá D.C. '), 'bogota d.c.');
    assert.equal(normalizarTextoBusqueda('CHOCÓ'), 'choco');
  });

  it('formatea la ubicación operativa sin duplicar Bogotá D.C.', () => {
    assert.equal(formatearUbicacionOperativa('Medellín', 'Antioquia'), 'Medellín, Antioquia');
    assert.equal(formatearUbicacionOperativa('Bogotá D.C.', 'Bogotá D.C.'), 'Bogotá D.C.');
  });
});
