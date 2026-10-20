import type { CategoriaVehiculo, EstadoVehiculo } from '@/lib/flota/types';

export type WizardStepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface WizardStepInfo {
  id: WizardStepId;
  titulo: string;
  subtitulo: string;
  etiquetaCorta: string;
}

export interface VehiculoWizardData {
  id?: string | undefined;
  marca: string;
  modelo: string;
  anio: number;
  categoria: CategoriaVehiculo;
  categoriaEtiqueta: string;
  placa: string;
  estado: EstadoVehiculo;
  precioDia: number | '';
  depositoGarantia: number | '';
  transmision: 'Automática' | 'Manual' | 'Eléctrica';
  combustible: 'Gasolina' | 'Diésel' | 'Eléctrico' | 'Híbrido';
  capacidadPasajeros: number;
  autonomiaKm: number | '';
  kilometraje: number | '';
  imagenUrl: string;
  destacado: boolean;
  descripcion: string;
  aceleracion: string;
  velocidadMaxima: string;
  rating: number;
  autonomiaOdo: string;
  // Checklist de cumplimiento pericial y legal
  soatVigente: boolean;
  tarjetaPropiedad: boolean;
  tecnicoMecanica: boolean;
  kitCarretera: boolean;
}

export interface PresetImagen {
  nombre: string;
  url: string;
  categoria: CategoriaVehiculo;
  etiqueta: string;
}
