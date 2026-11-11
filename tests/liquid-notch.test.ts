import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLiquidNotchPath,
  computeIconProximity,
  LIQUID_DOCK_GEOMETRY,
} from '../src/components/navigation/liquid-notch.ts';

describe('buildLiquidNotchPath', () => {
  test('genera trazados SVG válidos y cerrados en todas las posiciones (cliente 3 y admin 5)', () => {
    const cases: Array<{ width: number; centers: number[] }> = [
      { width: 156, centers: [28, 78, 128] },
      { width: 256, centers: [28, 78, 128, 178, 228] },
    ];

    for (const { width, centers } of cases) {
      for (const cx of centers) {
        const path = buildLiquidNotchPath(width, 56, cx);
        assert.ok(path.startsWith('M '), `Debe comenzar con M: ${path}`);
        assert.ok(path.endsWith(' Z'), `Debe cerrar con Z: ${path}`);
        assert.equal(path.includes('NaN'), false, `Sin NaN en cx=${cx}: ${path}`);
        assert.equal(path.includes('Infinity'), false, `Sin Infinity en cx=${cx}: ${path}`);
      }
    }
  });

  test('tolera desplazamientos extremos de rubber-band sin producir NaN', () => {
    for (const cx of [10, 18, 22, 134, 145]) {
      const path = buildLiquidNotchPath(156, 56, cx);
      assert.equal(path.includes('NaN'), false);
      assert.equal(path.includes('Infinity'), false);
    }
  });

  test('usa large-arc=1 en el arco cóncavo central cuando los hombros están sobre y=0', () => {
    const path = buildLiquidNotchPath(156, 56, 78);
    const notchRadius = LIQUID_DOCK_GEOMETRY.circleRadius + LIQUID_DOCK_GEOMETRY.notchGap;
    assert.ok(
      path.includes(`A ${notchRadius.toFixed(2)} ${notchRadius.toFixed(2)} 0 1 0`),
      `El arco de cuna central debe tener large-arc-flag=1: ${path}`,
    );
  });

  test('mantiene simetría especular entre primer y último elemento', () => {
    const leftPath = buildLiquidNotchPath(156, 56, 28);
    const rightPath = buildLiquidNotchPath(156, 56, 128);
    assert.notEqual(leftPath, rightPath);
    // Ambas rutas deben compartir exactamente la misma longitud estructural de comandos
    assert.equal(leftPath.split('A ').length, rightPath.split('A ').length);
  });
});

describe('computeIconProximity', () => {
  test('devuelve 1 cuando el círculo coincide con la pestaña y 0 fuera de alcance', () => {
    assert.equal(computeIconProximity(78, 78), 1);
    assert.equal(computeIconProximity(28, 128), 0);
    const mid = computeIconProximity(68, 78);
    assert.ok(mid > 0 && mid < 1);
  });
});
