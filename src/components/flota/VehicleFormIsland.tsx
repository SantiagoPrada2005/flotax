import type { VehiculoItem } from '@/lib/flota/types';
import VehicleWizardIsland from './wizard/VehicleWizardIsland';

export interface VehicleFormIslandProps {
  vehiculoInicial?: VehiculoItem | undefined;
}

/**
 * Asistente guiado paso a paso (Wizard Stepper) para alta y modificación
 * de unidades vehiculares en la flota de patio.
 * Cumple con principios de diseño Apple HIG, microinteracciones,
 * validaciones en tiempo real y persistencia resiliente de datos.
 */
export default function VehicleFormIsland({ vehiculoInicial }: VehicleFormIslandProps) {
  return <VehicleWizardIsland vehiculoInicial={vehiculoInicial} />;
}
