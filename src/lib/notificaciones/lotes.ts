/** Divide una lista en lotes (D1 limita a 100 parámetros por consulta). */
export function enLotes<T>(elementos: readonly T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) {
    lotes.push(elementos.slice(i, i + tamano));
  }
  return lotes;
}
