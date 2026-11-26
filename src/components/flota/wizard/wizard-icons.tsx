import {
  BatteryCharging,
  CalendarCheck,
  Car,
  CarFront,
  CircleCheck,
  Droplet,
  Fuel,
  Motorbike,
  Scooter,
  Van,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { CategoriaVehiculo, CombustibleVehiculo } from '@/lib/flota/types';

/** Grosor de trazo unificado para toda la iconografía del wizard de vehículos. */
export const WIZARD_ICON_STROKE = 1.75;

/** Mapa canónico de categorías de flota hacia iconos Lucide limpios y reconocibles. */
export const VEHICLE_CATEGORY_ICONS: Record<CategoriaVehiculo, LucideIcon> = {
  SEDAN: Car,
  SUV: CarFront,
  MOTO: Motorbike,
  PATINETA: Scooter,
  UTILITARIO: Van,
};

export interface VehicleCategoryIconProps {
  categoria: CategoriaVehiculo;
  className?: string | undefined;
  strokeWidth?: number | undefined;
}

/**
 * Renderiza el icono Lucide correspondiente a la categoría operativa del vehículo,
 * heredando siempre `currentColor` para respetar la paleta neutra en modo claro y oscuro.
 */
export function VehicleCategoryIcon({
  categoria,
  className = 'h-5 w-5',
  strokeWidth = WIZARD_ICON_STROKE,
}: VehicleCategoryIconProps) {
  const Icon = VEHICLE_CATEGORY_ICONS[categoria];
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}

/** Mapa canónico de opciones de combustible / propulsión. */
export const FUEL_TYPE_ICONS: Record<CombustibleVehiculo, LucideIcon> = {
  Gasolina: Fuel,
  Diésel: Droplet,
  Eléctrico: Zap,
  Híbrido: BatteryCharging,
};

/** Mapa canónico de estados operativos iniciales disponibles en el paso 7. */
export const VEHICLE_STATUS_ICONS: Record<
  'DISPONIBLE' | 'RESERVADO' | 'MANTENIMIENTO',
  LucideIcon
> = {
  DISPONIBLE: CircleCheck,
  RESERVADO: CalendarCheck,
  MANTENIMIENTO: Wrench,
};
