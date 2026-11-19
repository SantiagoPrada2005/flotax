import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatearPlacaVehiculo } from '@/lib/flota/placa';

describe('Automatización del formato de placa vehicular (ABC-123)', () => {
  it('convierte a mayúsculas y agrega el guion automáticamente después de la tercera letra', () => {
    assert.deepEqual(formatearPlacaVehiculo('a', ''), { value: 'A', cursor: 1 });
    assert.deepEqual(formatearPlacaVehiculo('ab', 'A'), { value: 'AB', cursor: 2 });
    assert.deepEqual(formatearPlacaVehiculo('abc', 'AB'), { value: 'ABC-', cursor: 4 });
  });

  it('permite continuar escribiendo números después del guion automático', () => {
    assert.deepEqual(formatearPlacaVehiculo('ABC-1', 'ABC-'), { value: 'ABC-1', cursor: 5 });
    assert.deepEqual(formatearPlacaVehiculo('ABC-123', 'ABC-12'), { value: 'ABC-123', cursor: 7 });
  });

  it('maneja el borrado del guion final sin atrapar el cursor', () => {
    assert.deepEqual(formatearPlacaVehiculo('ABC', 'ABC-'), { value: 'AB', cursor: 2 });
  });

  it('evita letras en la sección numérica y números en la sección de letras', () => {
    assert.deepEqual(formatearPlacaVehiculo('AB1', 'AB'), { value: 'AB', cursor: 2 });
    assert.deepEqual(formatearPlacaVehiculo('ABC-12D', 'ABC-12'), { value: 'ABC-12', cursor: 6 });
  });

  it('normaliza placas completas al pegar y evita guiones duplicados o caracteres inválidos', () => {
    assert.deepEqual(formatearPlacaVehiculo('  abc -- 123 ', ''), { value: 'ABC-123', cursor: 7 });
    assert.deepEqual(formatearPlacaVehiculo('xyz987', ''), { value: 'XYZ-987', cursor: 7 });
    assert.deepEqual(formatearPlacaVehiculo('ABC--1234', ''), { value: 'ABC-123', cursor: 7 });
  });

  it('conserva la posición del cursor al editar una letra intermedia', () => {
    const res = formatearPlacaVehiculo('AXBC-123', 'ABC-123', 2);
    assert.equal(res.value, 'AXB-123');
    assert.equal(res.cursor, 2);
  });
});
