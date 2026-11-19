import type { CategoriaVehiculo } from './types';

const MARCAS_COMPUESTAS: readonly string[] = [
  'Mercedes-Benz',
  'BMW Motorrad',
  'Segway-Ninebot',
  'Royal Enfield',
  'Land Rover',
  'Alfa Romeo',
  'Aston Martin',
  'Great Wall',
];

export const SUGERENCIAS_VEHICULOS_POR_CATEGORIA: Record<
  CategoriaVehiculo,
  readonly string[]
> = {
  SEDAN: [
    'Toyota Corolla',
    'Chevrolet Onix',
    'Mazda 3',
    'Kia Cerato',
    'Hyundai Accent',
    'BMW Serie 3',
  ],
  SUV: [
    'Mazda CX-5',
    'Renault Duster',
    'Kia Sportage',
    'Toyota Fortuner',
    'Chevrolet Tracker',
    'Mercedes-Benz GLA',
  ],
  MOTO: [
    'Yamaha MT-03',
    'Honda CB 190R',
    'Kawasaki Z400',
    'KTM Duke 200',
    'Suzuki Gixxer 250',
    'Royal Enfield Himalayan',
  ],
  PATINETA: [
    'Xiaomi Electric Scooter 4',
    'Segway-Ninebot Max G2',
    'Dualtron Mini',
    'NIU KQi3 Pro',
  ],
  UTILITARIO: [
    'Renault Kangoo',
    'Chevrolet NHR',
    'Toyota Hilux',
    'Ford Ranger',
    'Nissan Frontier',
    'Mercedes-Benz Sprinter',
  ],
};

/**
 * Combina marca y modelo para mostrarlos en un único campo sin duplicar la marca.
 */
export function unificarMarcaYModelo(marca: string, modelo: string): string {
  const m = marca.trim();
  const mod = modelo.trim();
  if (!m) return mod;
  if (!mod) return m;
  if (mod.toLowerCase().startsWith(m.toLowerCase())) {
    return mod;
  }
  return `${m} ${mod}`;
}

/**
 * Separa una entrada unificada ("Toyota Corolla", "Mercedes-Benz GLA 200")
 * en `marca` y `modelo` para mantener compatibilidad con el esquema del backend.
 */
export function separarMarcaYModelo(valorUnificado: string): {
  marca: string;
  modelo: string;
} {
  const limpio = valorUnificado.trim().replace(/\s+/g, ' ');
  if (!limpio) {
    return { marca: '', modelo: '' };
  }

  const lower = limpio.toLowerCase();
  for (const compuesta of MARCAS_COMPUESTAS) {
    const compLower = compuesta.toLowerCase();
    if (lower === compLower) {
      return { marca: limpio, modelo: '' };
    }
    if (lower.startsWith(`${compLower} `)) {
      return {
        marca: limpio.slice(0, compuesta.length),
        modelo: limpio.slice(compuesta.length + 1).trim(),
      };
    }
  }

  const primerEspacio = limpio.indexOf(' ');
  if (primerEspacio === -1) {
    return { marca: limpio, modelo: '' };
  }

  return {
    marca: limpio.slice(0, primerEspacio),
    modelo: limpio.slice(primerEspacio + 1).trim(),
  };
}
