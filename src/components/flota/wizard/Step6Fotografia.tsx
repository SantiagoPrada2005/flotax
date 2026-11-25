import PerspectiveGalleryEditor, { MAX_FOTOS_GALERIA } from '../PerspectiveGalleryEditor';
import type { GaleriaFotoItem, VehiculoWizardData } from './types';

export { MAX_FOTOS_GALERIA };

export interface Step6FotografiaProps {
  data: VehiculoWizardData;
  errors: Record<string, string>;
  onChange: (updates: Partial<VehiculoWizardData>) => void;
}

export default function Step6Fotografia({
  data,
  errors,
  onChange,
}: Step6FotografiaProps) {
  const handleGaleriaChange = (
    nuevaGaleria: GaleriaFotoItem[],
    imagenPrincipal: string
  ) => {
    onChange({
      galeria: nuevaGaleria,
      imagenUrl: imagenPrincipal,
    });
  };

  return (
    <div className="w-full space-y-5">
      <div className="space-y-1.5">
        <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] sm:text-xs dark:text-[#9CA3AF]">
          Paso 06 · Galería Fotográfica
        </span>
        <h1 className="font-display text-2xl leading-[1.12] font-bold tracking-tight text-[#111827] sm:text-3xl dark:text-[#EDEDED]">
          Muéstranos tu vehículo
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] dark:text-[#9CA3AF]">
          La fotografía lateral será la portada principal del vehículo. Agrega las perspectivas adicionales para que el cliente conozca su estado real.
        </p>
      </div>

      <PerspectiveGalleryEditor
        galeria={data.galeria ?? []}
        imagenUrl={data.imagenUrl}
        marcaModelo={`${data.marca || 'Vehículo'} ${data.modelo}`.trim()}
        soloLectura={false}
        permitirEliminarPrincipal={true}
        errorMsg={errors.imagenUrl}
        onChange={handleGaleriaChange}
      />
    </div>
  );
}
