import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  separarMarcaYModelo,
  unificarMarcaYModelo,
} from '@/lib/flota/marca-modelo';
import {
  formatearNumeroConMiles,
  formatearValorMiles,
} from '@/lib/flota/numero';

describe('Unificación y separación de Marca y Modelo', () => {
  it('separa correctamente marcas simples y compuestas', () => {
    assert.deepEqual(separarMarcaYModelo('Toyota Corolla'), {
      marca: 'Toyota',
      modelo: 'Corolla',
    });
    assert.deepEqual(separarMarcaYModelo('Mazda CX-5'), {
      marca: 'Mazda',
      modelo: 'CX-5',
    });
    assert.deepEqual(separarMarcaYModelo('Mercedes-Benz GLA 200'), {
      marca: 'Mercedes-Benz',
      modelo: 'GLA 200',
    });
    assert.deepEqual(separarMarcaYModelo('Royal Enfield Himalayan'), {
      marca: 'Royal Enfield',
      modelo: 'Himalayan',
    });
  });

  it('unifica marca y modelo sin duplicar la marca', () => {
    assert.equal(unificarMarcaYModelo('Toyota', 'Corolla'), 'Toyota Corolla');
    assert.equal(unificarMarcaYModelo('Toyota', 'Toyota Corolla'), 'Toyota Corolla');
    assert.equal(unificarMarcaYModelo('Toyota', ''), 'Toyota');
  });
});

describe('Automatización de formato numérico con separador de miles (.)', () => {
  it('formatea valores numéricos con puntos de miles automáticamente', () => {
    assert.equal(formatearValorMiles(200000), '200.000');
    assert.equal(formatearValorMiles(1500000), '1.500.000');
    assert.equal(formatearValorMiles(25000), '25.000');
    assert.equal(formatearValorMiles(85000000), '85.000.000');
    assert.equal(formatearValorMiles(''), '');
  });

  it('ignora puntos manuales y caracteres no numéricos devolviendo número limpio', () => {
    const res1 = formatearNumeroConMiles('200000');
    assert.equal(res1.formatted, '200.000');
    assert.equal(res1.numericValue, 200000);

    const res2 = formatearNumeroConMiles('200.000.');
    assert.equal(res2.formatted, '200.000');
    assert.equal(res2.numericValue, 200000);

    const res3 = formatearNumeroConMiles('1.500abc000');
    assert.equal(res3.formatted, '1.500.000');
    assert.equal(res3.numericValue, 1500000);
  });

  it('preserva la posición lógica del cursor al insertar o eliminar en medio', () => {
    // "20.000" -> insertar "5" después de "20" => "205.000", cursor en 3
    const insertMid = formatearNumeroConMiles('205.000', 3);
    assert.equal(insertMid.formatted, '205.000');
    assert.equal(insertMid.numericValue, 205000);
    assert.equal(insertMid.cursor, 3);

    // "1.500.000" -> borrar "5" => "1.00.000", cursor en 1 => "100.000", cursor en 1
    const deleteMid = formatearNumeroConMiles('1.00.000', 2);
    assert.equal(deleteMid.formatted, '100.000');
    assert.equal(deleteMid.numericValue, 100000);
    assert.equal(deleteMid.cursor, 1);
  });
});
