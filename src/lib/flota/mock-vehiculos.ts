import type { VehiculoItem, FiltrosBusquedaVehiculo } from './types';

export const FLOTA_CANONICA: VehiculoItem[] = [
  {
    id: 'veh-mercedes-eqb',
    marca: 'Mercedes-Benz',
    modelo: 'EQB 350 4MATIC Luxury',
    anio: 2024,
    categoria: 'SUV',
    categoriaEtiqueta: 'SUV Eléctrica',
    placa: 'FLX-801',
    estado: 'DISPONIBLE',
    precioDia: 280000,
    depositoGarantia: 750000,
    transmision: 'Automática',
    combustible: 'Eléctrico',
    capacidadPasajeros: 7,
    autonomiaKm: 420,
    kilometraje: 9400,
    imagenUrl: '/images/vehiculos/white-suv.jpg',
    destacado: true,
    aceleracion: '3.8 s',
    velocidadMaxima: '210 km/h',
    rating: 4.8,
    autonomiaOdo: '420 km',
    tipoPropulsionIcon: 'electric',
    descripcion: 'SUV eléctrica familiar de 7 plazas con tracción integral 4MATIC, techo panorámico y asistente de conducción inteligente MBUX.',
  },
  {
    id: 'veh-bmw-m2-coupe',
    marca: 'BMW',
    modelo: 'M2 Competition Coupe',
    anio: 2024,
    categoria: 'SEDAN',
    categoriaEtiqueta: 'Coupe Deportivo',
    placa: 'BMW-240',
    estado: 'DISPONIBLE',
    precioDia: 260000,
    depositoGarantia: 900000,
    transmision: 'Automática',
    combustible: 'Gasolina',
    capacidadPasajeros: 4,
    kilometraje: 14200,
    imagenUrl: '/images/vehiculos/dark-coupe.jpg',
    destacado: true,
    aceleracion: '4.2 s',
    velocidadMaxima: '250 km/h',
    rating: 4.9,
    autonomiaOdo: '14.200 km',
    tipoPropulsionIcon: 'gas',
    descripcion: 'Coupe deportivo de alto rendimiento con motor M TwinPower Turbo de 460 CV, diferencial M activo y chasís adaptativo.',
  },
  {
    id: 'veh-mazda-cx30',
    marca: 'Mazda',
    modelo: 'CX-30 Grand Touring Soul',
    anio: 2024,
    categoria: 'SUV',
    categoriaEtiqueta: 'SUV Urbana',
    placa: 'MOV-304',
    estado: 'DISPONIBLE',
    precioDia: 195000,
    depositoGarantia: 500000,
    transmision: 'Automática',
    combustible: 'Gasolina',
    capacidadPasajeros: 5,
    kilometraje: 21500,
    imagenUrl: '/images/vehiculos/mazda-cx30.png',
    destacado: true,
    aceleracion: '7.8 s',
    velocidadMaxima: '198 km/h',
    rating: 4.9,
    autonomiaOdo: '21.500 km',
    tipoPropulsionIcon: 'gas',
    descripcion: 'Diseño Kodo en Rojo Soul Crystal con sistema de sonido envolvente Bose, tracción i-Activ AWD y máximo confort ejecutivo.',
  },
  {
    id: 'veh-quantum-sedan',
    marca: 'Quantum',
    modelo: 'Premier EV Long Range',
    anio: 2024,
    categoria: 'SEDAN',
    categoriaEtiqueta: 'Sedán Eléctrico',
    placa: 'QNT-090',
    estado: 'DISPONIBLE',
    precioDia: 160000,
    depositoGarantia: 450000,
    transmision: 'Automática',
    combustible: 'Eléctrico',
    capacidadPasajeros: 5,
    autonomiaKm: 520,
    kilometraje: 11000,
    imagenUrl: '/images/vehiculos/sedan-premier.png',
    destacado: false,
    aceleracion: '6.5 s',
    velocidadMaxima: '190 km/h',
    rating: 4.7,
    autonomiaOdo: '520 km',
    tipoPropulsionIcon: 'electric',
    descripcion: 'Sedán aerodinámico de cero emisiones con batería blade de 520 km de autonomía y carga ultrarrápida del 20% al 80% en 25 minutos.',
  },
  {
    id: 'veh-yamaha-mt03',
    marca: 'Yamaha',
    modelo: 'MT-03 ABS Hyper Naked',
    anio: 2024,
    categoria: 'MOTO',
    categoriaEtiqueta: 'Motocicleta Urbana',
    placa: 'YMH-99A',
    estado: 'DISPONIBLE',
    precioDia: 95000,
    depositoGarantia: 300000,
    transmision: 'Manual',
    combustible: 'Gasolina',
    capacidadPasajeros: 2,
    kilometraje: 8600,
    imagenUrl: '/images/vehiculos/yamaha-mt03.png',
    destacado: true,
    aceleracion: '5.1 s',
    velocidadMaxima: '175 km/h',
    rating: 4.8,
    autonomiaOdo: '8.600 km',
    tipoPropulsionIcon: 'gas',
    descripcion: 'Bicilíndrica ligera de 321cc con postura erguida, iluminación full LED y frenos ABS de doble canal para máxima agilidad en el tráfico.',
  },
  {
    id: 'veh-volt-scooter',
    marca: 'Volt Striker',
    modelo: 'Striker X Dual Motor',
    anio: 2024,
    categoria: 'PATINETA',
    categoriaEtiqueta: 'Monopatín Eléctrico',
    placa: 'VLT-012',
    estado: 'DISPONIBLE',
    precioDia: 42000,
    depositoGarantia: 150000,
    transmision: 'Eléctrica',
    combustible: 'Eléctrico',
    capacidadPasajeros: 1,
    autonomiaKm: 65,
    kilometraje: 520,
    imagenUrl: '/images/vehiculos/scooter-pro.png',
    destacado: false,
    aceleracion: '3.2 s',
    velocidadMaxima: '45 km/h',
    rating: 4.6,
    autonomiaOdo: '65 km',
    tipoPropulsionIcon: 'electric',
    descripcion: 'Micromovilidad de doble motor de alta gama con suspensión hidráulica delantera/trasera y frenos de disco ventilados.',
  },
];

export function buscarVehiculos(filtros: FiltrosBusquedaVehiculo): VehiculoItem[] {
  const query = (filtros.query || '').trim().toLowerCase();
  const categoria = filtros.categoria || 'TODOS';
  const soloDisponibles = filtros.soloDisponibles ?? false;

  return FLOTA_CANONICA.filter((vehiculo) => {
    if (categoria !== 'TODOS' && vehiculo.categoria !== categoria) {
      return false;
    }

    if (soloDisponibles && vehiculo.estado !== 'DISPONIBLE') {
      return false;
    }

    if (!query) {
      return true;
    }

    const terminos = query.split(/\s+/).filter(Boolean);
    const camposTexto = [
      vehiculo.marca,
      vehiculo.modelo,
      vehiculo.placa,
      vehiculo.categoriaEtiqueta,
      vehiculo.transmision,
      vehiculo.combustible,
      String(vehiculo.anio),
    ]
      .join(' ')
      .toLowerCase();

    return terminos.every((termino) => camposTexto.includes(termino));
  });
}

export function obtenerVehiculoPorId(id: string): VehiculoItem | undefined {
  return FLOTA_CANONICA.find((v) => v.id === id);
}
