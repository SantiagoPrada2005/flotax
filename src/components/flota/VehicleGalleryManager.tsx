import { useState } from 'react';
import { actions } from 'astro:actions';
import { Check, Loader2, Save } from 'lucide-react';
import type { VehiculoGaleriaFoto } from '@/lib/flota/types';
import PerspectiveGalleryEditor from './PerspectiveGalleryEditor';
import type { GaleriaFotoItem } from './wizard/types';

export interface VehicleGalleryManagerProps {
  vehiculoId: string;
  placa: string;
  marcaModelo: string;
  imagenUrlInicial: string;
  galeriaInicial: VehiculoGaleriaFoto[];
  puedeGestionar: boolean;
}

function inicializarGaleria(
  galeriaInicial: VehiculoGaleriaFoto[],
  imagenUrlInicial: string
): GaleriaFotoItem[] {
  if (galeriaInicial && galeriaInicial.length > 0) {
    return galeriaInicial.map((f) => ({ ...f, estado: 'listo' as const }));
  }
  if (imagenUrlInicial) {
    return [
      {
        id: 'portada-inicial',
        url: imagenUrlInicial,
        categoria: 'EXTERIOR',
        zona: 'EXTERIOR_LATERAL_IZQ',
        esPrincipal: true,
        orden: 0,
        estado: 'listo',
      },
    ];
  }
  return [];
}

export default function VehicleGalleryManager({
  vehiculoId,
  placa,
  marcaModelo,
  imagenUrlInicial,
  galeriaInicial,
  puedeGestionar,
}: VehicleGalleryManagerProps) {
  const [galeria, setGaleria] = useState<GaleriaFotoItem[]>(() =>
    inicializarGaleria(galeriaInicial, imagenUrlInicial)
  );
  const [imagenPrincipal, setImagenPrincipal] = useState<string>(imagenUrlInicial);
  const [hayCambios, setHayCambios] = useState<boolean>(false);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | undefined>(undefined);

  const handleChangeGaleria = (
    nuevaGaleria: GaleriaFotoItem[],
    nuevaPrincipal: string
  ) => {
    setGaleria(nuevaGaleria);
    setImagenPrincipal(nuevaPrincipal || imagenUrlInicial);
    setHayCambios(true);
    setMensajeOk(null);
    setErrorMsg(undefined);
  };

  const handleGuardar = async () => {
    if (!puedeGestionar || guardando) return;
    if (galeria.some((f) => f.estado === 'cargando')) {
      setErrorMsg('Espera a que terminen de optimizarse todas las fotografías.');
      return;
    }

    const fotosListas = galeria.filter((f) => Boolean(f.url));
    if (fotosListas.length === 0 || !fotosListas.some((f) => f.esPrincipal)) {
      setErrorMsg('La fotografía lateral principal es obligatoria.');
      return;
    }

    setGuardando(true);
    setErrorMsg(undefined);
    setMensajeOk(null);

    try {
      const { error, data } = await actions.flota.actualizarGaleriaVehiculo({
        vehiculoId,
        galeria: fotosListas.map((f, idx) => ({
          id: f.id,
          url: f.url,
          categoria: f.categoria,
          zona: f.zona,
          esPrincipal: f.esPrincipal,
          orden: idx,
        })),
      });

      if (error || !data?.ok) {
        setErrorMsg(error?.message || 'No fue posible guardar las fotografías.');
        return;
      }

      setGaleria(data.galeria.map((f) => ({ ...f, estado: 'listo' as const })));
      setImagenPrincipal(data.imagenUrl);
      setHayCambios(false);
      setMensajeOk('Galería fotográfica actualizada y visible en el catálogo público.');
    } catch {
      setErrorMsg('Error de conexión al guardar la galería.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section
      aria-label={`Galería fotográfica del vehículo ${placa}`}
      className="rounded-[28px] border border-[#9CA3AF]/40 bg-white dark:bg-[#1F2937] dark:border-white/10 p-4 sm:p-6 shadow-xs space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#EDEDED] dark:border-white/10 pb-4">
        <div className="space-y-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF]">
            Fotografías adicionales · {placa}
          </span>
          <h2 className="font-display text-lg sm:text-xl font-bold text-[#111827] dark:text-[#EDEDED]">
            Galería visual del vehículo
          </h2>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
            Conserva la vista lateral como imagen principal y organiza las perspectivas adicionales visibles para los clientes.
          </p>
        </div>

        {puedeGestionar && (
          <button
            type="button"
            onClick={() => void handleGuardar()}
            disabled={guardando || !hayCambios}
            className="fx-press min-h-[44px] shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#EDEDED] dark:hover:bg-white dark:text-[#111827] px-5 text-xs font-bold disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            {guardando ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{hayCambios ? 'Guardar galería' : 'Galería al día'}</span>
              </>
            )}
          </button>
        )}
      </div>

      {mensajeOk && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{mensajeOk}</span>
        </div>
      )}

      <PerspectiveGalleryEditor
        galeria={galeria}
        imagenUrl={imagenPrincipal}
        marcaModelo={marcaModelo}
        soloLectura={!puedeGestionar}
        permitirEliminarPrincipal={false}
        errorMsg={errorMsg}
        onChange={handleChangeGaleria}
      />
    </section>
  );
}
