import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  RefreshCw,
  RotateCcw,
  Star,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { comprimirYNormalizarImagen } from '@/lib/media/image-compression';
import {
  PERSPECTIVAS_GALERIA_VEHICULO,
  obtenerEtiquetaPerspectivaGaleria,
  type CategoriaGaleriaVehiculo,
  type ZonaEvidenciaVehiculo,
} from '@/lib/flota/types';
import type { GaleriaFotoItem } from './wizard/types';

export const MAX_FOTOS_GALERIA = 24;
const MAX_PESO_BYTES = 10 * 1024 * 1024;

const ZONAS_RANURA_FIJA: ReadonlySet<ZonaEvidenciaVehiculo> = new Set([
  'EXTERIOR_FRONTAL',
  'EXTERIOR_TRASERO',
  'INTERIOR_ASIENTOS',
  'PANTALLA_TABLERO_ODOMETRO',
]);

const PERSPECTIVA_PRINCIPAL = PERSPECTIVAS_GALERIA_VEHICULO[0]!;
const PERSPECTIVAS_SECUNDARIAS = PERSPECTIVAS_GALERIA_VEHICULO.filter(
  (p) => !p.esPrincipalPorDefecto && !p.multiple && ZONAS_RANURA_FIJA.has(p.zona)
);
const PERSPECTIVA_INTERIOR_MULTIPLE =
  PERSPECTIVAS_GALERIA_VEHICULO.find((p) => p.multiple) ??
  PERSPECTIVAS_GALERIA_VEHICULO[PERSPECTIVAS_GALERIA_VEHICULO.length - 1]!;

export interface PerspectiveGalleryEditorProps {
  galeria: GaleriaFotoItem[];
  imagenUrl: string;
  marcaModelo: string;
  soloLectura?: boolean | undefined;
  permitirEliminarPrincipal?: boolean | undefined;
  errorMsg?: string | undefined;
  onChange: (galeriaActualizada: GaleriaFotoItem[], imagenPrincipal: string) => void;
}

function normalizarYOrdenarGaleria(
  items: readonly GaleriaFotoItem[]
): { galeria: GaleriaFotoItem[]; imagenPrincipal: string } {
  const validos = items.filter((f) => f.estado !== 'error');

  // 1. Identificar la foto principal lateral (o la marcada esPrincipal)
  let fotoPrincipal =
    validos.find((f) => f.esPrincipal) ??
    validos.find((f) => f.zona === 'EXTERIOR_LATERAL_IZQ');

  if (fotoPrincipal) {
    fotoPrincipal = {
      ...fotoPrincipal,
      categoria: 'EXTERIOR',
      zona: 'EXTERIOR_LATERAL_IZQ',
      esPrincipal: true,
    };
  }

  // 2. Ranuras fijas secundarias (en orden canónico)
  const secundariasOrdenadas: GaleriaFotoItem[] = [];
  const usadas = new Set<string>(fotoPrincipal ? [fotoPrincipal.id] : []);

  for (const config of PERSPECTIVAS_SECUNDARIAS) {
    const match = validos.find(
      (f) => !usadas.has(f.id) && f.zona === config.zona
    );
    if (match) {
      usadas.add(match.id);
      secundariasOrdenadas.push({
        ...match,
        categoria: config.categoria,
        esPrincipal: false,
      });
    }
  }

  // 3. Interior adicional y otras fotos adicionales heredadas
  const adicionales = validos
    .filter((f) => !usadas.has(f.id))
    .map((f) => ({
      ...f,
      esPrincipal: false,
      zona: f.zona ?? ('INTERIOR_CABINA' as const),
    }));

  const consolidada = [
    ...(fotoPrincipal ? [fotoPrincipal] : []),
    ...secundariasOrdenadas,
    ...adicionales,
  ].map((f, idx) => ({
    ...f,
    orden: idx,
  }));

  const imagenPrincipal =
    consolidada.find((f) => f.esPrincipal && f.url)?.url ??
    consolidada.find((f) => Boolean(f.url))?.url ??
    '';

  return { galeria: consolidada, imagenPrincipal };
}

export default function PerspectiveGalleryEditor({
  galeria,
  imagenUrl,
  marcaModelo,
  soloLectura = false,
  permitirEliminarPrincipal = false,
  errorMsg,
  onChange,
}: PerspectiveGalleryEditorProps) {
  const [draggingZona, setDraggingZona] = useState<ZonaEvidenciaVehiculo | null>(null);
  const [alertaLimite, setAlertaLimite] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [archivosFallidos, setArchivosFallidos] = useState<
    Array<{
      id: string;
      file: File;
      zona: ZonaEvidenciaVehiculo;
      categoria: CategoriaGaleriaVehiculo;
      mensaje: string;
    }>
  >([]);

  const fileInputsRef = useRef<Partial<Record<ZonaEvidenciaVehiculo, HTMLInputElement | null>>>({});
  const cameraInputsRef = useRef<Partial<Record<ZonaEvidenciaVehiculo, HTMLInputElement | null>>>({});

  const galeriaNormalizada: GaleriaFotoItem[] = useMemo(() => {
    if (galeria && galeria.length > 0) {
      return galeria;
    }
    if (imagenUrl) {
      return [
        {
          id: 'portada-inicial',
          url: imagenUrl,
          categoria: 'EXTERIOR',
          zona: 'EXTERIOR_LATERAL_IZQ',
          esPrincipal: true,
          orden: 0,
          estado: 'listo',
        },
      ];
    }
    return [];
  }, [galeria, imagenUrl]);

  const { fotoPrincipal, fotosPorRanura, fotosInteriorAdicional } = useMemo(() => {
    const principal =
      galeriaNormalizada.find((f) => f.esPrincipal) ??
      galeriaNormalizada.find((f) => f.zona === 'EXTERIOR_LATERAL_IZQ');

    const usadas = new Set<string>(principal ? [principal.id] : []);
    const mapa = new Map<ZonaEvidenciaVehiculo, GaleriaFotoItem>();

    for (const config of PERSPECTIVAS_SECUNDARIAS) {
      const encontrada = galeriaNormalizada.find(
        (f) => !usadas.has(f.id) && f.zona === config.zona
      );
      if (encontrada) {
        usadas.add(encontrada.id);
        mapa.set(config.zona, encontrada);
      }
    }

    const extras = galeriaNormalizada.filter(
      (f) => !usadas.has(f.id) && !f.esPrincipal && (!f.zona || !ZONAS_RANURA_FIJA.has(f.zona) || f.zona === 'INTERIOR_CABINA')
    );

    return {
      fotoPrincipal: principal,
      fotosPorRanura: mapa,
      fotosInteriorAdicional: extras,
    };
  }, [galeriaNormalizada]);

  const emitirCambio = (listaCruda: readonly GaleriaFotoItem[]) => {
    const { galeria: consolidada, imagenPrincipal } = normalizarYOrdenarGaleria(listaCruda);
    onChange(consolidada, imagenPrincipal);
  };

  const procesarArchivosEnZona = async (
    files: FileList | File[],
    zona: ZonaEvidenciaVehiculo,
    categoria: CategoriaGaleriaVehiculo,
    esMultiple: boolean,
    esSlotPrincipal: boolean
  ) => {
    if (soloLectura) return;
    setAlertaLimite(null);

    const listaArchivos = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (listaArchivos.length === 0) return;

    let galeriaActual = [...galeriaNormalizada];

    if (!esMultiple) {
      // Ranura única: toma únicamente el primer archivo y reemplaza el existente de esta ranura
      const file = listaArchivos[0];
      if (!file) return;

      if (file.size > MAX_PESO_BYTES) {
        setArchivosFallidos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            file,
            zona,
            categoria,
            mensaje: `${file.name} supera los 10 MB permitidos.`,
          },
        ]);
        return;
      }

      const existente = esSlotPrincipal
        ? fotoPrincipal
        : galeriaActual.find((f) => !f.esPrincipal && f.zona === zona);

      if (!existente && galeriaActual.length >= MAX_FOTOS_GALERIA) {
        setAlertaLimite(`Alcanzaste el máximo de ${MAX_FOTOS_GALERIA} fotografías por vehículo.`);
        return;
      }

      const tempId = existente?.id ?? `foto-${crypto.randomUUID().slice(0, 8)}`;
      const placeholder: GaleriaFotoItem = {
        id: tempId,
        url: existente?.url ?? '',
        categoria,
        zona,
        esPrincipal: esSlotPrincipal,
        orden: existente?.orden ?? galeriaActual.length,
        nombre: file.name,
        firmaArchivo: `${file.name}:${file.size}:${file.lastModified}`,
        estado: 'cargando',
      };

      galeriaActual = existente
        ? galeriaActual.map((item) => (item.id === existente.id ? placeholder : item))
        : [...galeriaActual, placeholder];

      emitirCambio(galeriaActual);

      try {
        const comprimida = await comprimirYNormalizarImagen(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });
        galeriaActual = galeriaActual.map((item) =>
          item.id === tempId
            ? { ...item, url: comprimida.base64, estado: 'listo' as const }
            : item
        );
        emitirCambio(galeriaActual);
      } catch {
        // Restaurar si existía URL anterior; de lo contrario retirar placeholder
        if (existente?.url) {
          galeriaActual = galeriaActual.map((item) =>
            item.id === tempId ? existente : item
          );
        } else {
          galeriaActual = galeriaActual.filter((item) => item.id !== tempId);
        }
        emitirCambio(galeriaActual);
        setArchivosFallidos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            file,
            zona,
            categoria,
            mensaje: `No se pudo procesar ${file.name}.`,
          },
        ]);
      }
      return;
    }

    // Sección múltiple (Interior adicional)
    const espacioDisponible = MAX_FOTOS_GALERIA - galeriaActual.length;
    if (espacioDisponible <= 0) {
      setAlertaLimite(`Alcanzaste el máximo de ${MAX_FOTOS_GALERIA} fotografías por vehículo.`);
      return;
    }

    const archivosAProcesar = listaArchivos.slice(0, espacioDisponible);
    if (listaArchivos.length > espacioDisponible) {
      setAlertaLimite(
        `Solo se agregaron ${espacioDisponible} imágenes para respetar el límite de ${MAX_FOTOS_GALERIA} fotografías.`
      );
    }

    const nuevosPlaceholders: GaleriaFotoItem[] = [];
    const trabajos: Array<{ tempId: string; file: File }> = [];

    for (const file of archivosAProcesar) {
      const firma = `${file.name}:${file.size}:${file.lastModified}`;
      if (galeriaActual.some((f) => f.firmaArchivo === firma)) continue;

      if (file.size > MAX_PESO_BYTES) {
        setArchivosFallidos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            file,
            zona,
            categoria,
            mensaje: `${file.name} supera los 10 MB permitidos.`,
          },
        ]);
        continue;
      }

      const tempId = `foto-${crypto.randomUUID().slice(0, 8)}`;
      nuevosPlaceholders.push({
        id: tempId,
        url: '',
        categoria,
        zona,
        esPrincipal: false,
        orden: galeriaActual.length + nuevosPlaceholders.length,
        nombre: file.name,
        firmaArchivo: firma,
        estado: 'cargando',
      });
      trabajos.push({ tempId, file });
    }

    if (trabajos.length === 0) return;

    galeriaActual = [...galeriaActual, ...nuevosPlaceholders];
    emitirCambio(galeriaActual);

    for (const { tempId, file } of trabajos) {
      try {
        const comprimida = await comprimirYNormalizarImagen(file, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.85,
        });
        galeriaActual = galeriaActual.map((item) =>
          item.id === tempId
            ? { ...item, url: comprimida.base64, estado: 'listo' as const }
            : item
        );
        emitirCambio(galeriaActual);
      } catch {
        galeriaActual = galeriaActual.filter((item) => item.id !== tempId);
        emitirCambio(galeriaActual);
        setArchivosFallidos((prev) => [
          ...prev,
          {
            id: tempId,
            file,
            zona,
            categoria,
            mensaje: `No se pudo procesar ${file.name}.`,
          },
        ]);
      }
    }
  };

  const handleReintentarFallido = async (fallidoId: string) => {
    const encontrado = archivosFallidos.find((f) => f.id === fallidoId);
    if (!encontrado) return;
    setArchivosFallidos((prev) => prev.filter((f) => f.id !== fallidoId));
    await procesarArchivosEnZona(
      [encontrado.file],
      encontrado.zona,
      encontrado.categoria,
      encontrado.zona === 'INTERIOR_CABINA',
      encontrado.zona === 'EXTERIOR_LATERAL_IZQ'
    );
  };

  const handleEliminarFoto = (id: string) => {
    if (soloLectura) return;
    const objetivo = galeriaNormalizada.find((f) => f.id === id);
    if (!objetivo) return;
    if (objetivo.esPrincipal && !permitirEliminarPrincipal) return;

    const filtradas = galeriaNormalizada.filter((f) => f.id !== id);
    if (lightboxId === id) {
      setLightboxId(null);
    }
    emitirCambio(filtradas);
  };

  const handleMoverInterior = (id: string, delta: -1 | 1) => {
    if (soloLectura) return;
    const pos = fotosInteriorAdicional.findIndex((f) => f.id === id);
    const destino = pos + delta;
    if (pos < 0 || destino < 0 || destino >= fotosInteriorAdicional.length) return;
    const fotoDestino = fotosInteriorAdicional[destino];
    if (!fotoDestino) return;

    const idxA = galeriaNormalizada.findIndex((f) => f.id === id);
    const idxB = galeriaNormalizada.findIndex((f) => f.id === fotoDestino.id);
    if (idxA < 0 || idxB < 0) return;

    const copia = [...galeriaNormalizada];
    const tmp = copia[idxA]!;
    copia[idxA] = copia[idxB]!;
    copia[idxB] = tmp;
    emitirCambio(copia);
  };

  const handleDrop = (
    e: DragEvent<HTMLElement>,
    zona: ZonaEvidenciaVehiculo,
    categoria: CategoriaGaleriaVehiculo,
    esMultiple: boolean,
    esSlotPrincipal: boolean
  ) => {
    e.preventDefault();
    setDraggingZona(null);
    if (e.dataTransfer.files?.length) {
      void procesarArchivosEnZona(
        e.dataTransfer.files,
        zona,
        categoria,
        esMultiple,
        esSlotPrincipal
      );
    }
  };

  const fotosListas = useMemo(
    () => galeriaNormalizada.filter((f) => Boolean(f.url)),
    [galeriaNormalizada]
  );

  const lightboxIndex = useMemo(
    () => fotosListas.findIndex((f) => f.id === lightboxId),
    [fotosListas, lightboxId]
  );
  const lightboxFoto = lightboxIndex >= 0 ? fotosListas[lightboxIndex] : undefined;

  useEffect(() => {
    if (!lightboxFoto) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxId(null);
      } else if (e.key === 'ArrowRight' && fotosListas.length > 1) {
        const next = fotosListas[(lightboxIndex + 1) % fotosListas.length];
        if (next) setLightboxId(next.id);
      } else if (e.key === 'ArrowLeft' && fotosListas.length > 1) {
        const prev =
          fotosListas[(lightboxIndex - 1 + fotosListas.length) % fotosListas.length];
        if (prev) setLightboxId(prev.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fotosListas, lightboxFoto, lightboxIndex]);

  return (
    <div className="space-y-5">
      {/* 1. Fotografía lateral (Imagen Principal Obligatoria) */}
      <section
        onDrop={(e) =>
          handleDrop(
            e,
            PERSPECTIVA_PRINCIPAL.zona,
            PERSPECTIVA_PRINCIPAL.categoria,
            false,
            true
          )
        }
        onDragOver={(e) => {
          if (soloLectura) return;
          e.preventDefault();
          setDraggingZona(PERSPECTIVA_PRINCIPAL.zona);
        }}
        onDragLeave={() => setDraggingZona(null)}
        className={`rounded-[24px] border p-4 sm:p-5 transition-colors duration-150 ${
          draggingZona === PERSPECTIVA_PRINCIPAL.zona
            ? 'border-[#111827] bg-[#EDEDED]/70 dark:border-white/50 dark:bg-white/10'
            : 'border-[#9CA3AF]/35 bg-white dark:border-white/10 dark:bg-[#1F2937]'
        }`}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#111827] px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#EDEDED] dark:bg-[#EDEDED] dark:text-[#111827]">
                <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                <span>Imagen principal · Obligatoria</span>
              </span>
            </div>
            <h3 className="mt-1.5 font-display text-base sm:text-lg font-bold text-[#111827] dark:text-[#EDEDED]">
              {PERSPECTIVA_PRINCIPAL.etiqueta}
            </h3>
            <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
              {PERSPECTIVA_PRINCIPAL.descripcion}
            </p>
          </div>

          <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
            {fotosListas.length} / {MAX_FOTOS_GALERIA} fotos
          </span>
        </div>

        <input
          ref={(el) => {
            fileInputsRef.current[PERSPECTIVA_PRINCIPAL.zona] = el;
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void procesarArchivosEnZona(
                e.target.files,
                PERSPECTIVA_PRINCIPAL.zona,
                PERSPECTIVA_PRINCIPAL.categoria,
                false,
                true
              );
            }
            e.target.value = '';
          }}
        />
        <input
          ref={(el) => {
            cameraInputsRef.current[PERSPECTIVA_PRINCIPAL.zona] = el;
          }}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void procesarArchivosEnZona(
                e.target.files,
                PERSPECTIVA_PRINCIPAL.zona,
                PERSPECTIVA_PRINCIPAL.categoria,
                false,
                true
              );
            }
            e.target.value = '';
          }}
        />

        {fotoPrincipal && fotoPrincipal.url ? (
          <div className="relative aspect-video w-full max-w-xl overflow-hidden rounded-2xl border border-[#111827]/25 bg-[#EDEDED]/40 dark:border-white/20 dark:bg-[#111827]">
            {fotoPrincipal.estado === 'cargando' ? (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#4B5563] dark:text-[#9CA3AF]">
                <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                <span className="font-mono text-xs">Optimizando imagen principal...</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setLightboxId(fotoPrincipal.id)}
                  aria-label="Ampliar fotografía lateral principal"
                  className="block h-full w-full cursor-pointer"
                >
                  <img
                    src={fotoPrincipal.url}
                    alt={`${marcaModelo} - ${PERSPECTIVA_PRINCIPAL.etiqueta}`}
                    className="h-full w-full object-cover"
                  />
                </button>

                <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setLightboxId(fotoPrincipal.id)}
                    aria-label="Ver fotografía lateral ampliada"
                    className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-[#111827]/80 text-white backdrop-blur-xs hover:bg-[#111827] cursor-pointer"
                  >
                    <ZoomIn className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {!soloLectura && permitirEliminarPrincipal && (
                    <button
                      type="button"
                      onClick={() => handleEliminarFoto(fotoPrincipal.id)}
                      aria-label="Quitar fotografía lateral principal"
                      className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-700 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                {!soloLectura && (
                  <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputsRef.current[PERSPECTIVA_PRINCIPAL.zona]?.click()}
                      className="fx-press inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-[#111827]/85 px-3.5 py-1.5 font-mono text-[11px] font-bold text-white backdrop-blur-xs hover:bg-[#111827] cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Cambiar lateral</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputsRef.current[PERSPECTIVA_PRINCIPAL.zona]?.click()}
                      aria-label="Tomar fotografía lateral con cámara"
                      className="fx-press inline-flex min-h-[36px] items-center gap-1 rounded-full bg-[#111827]/85 px-3 py-1.5 font-mono text-[11px] font-bold text-white backdrop-blur-xs hover:bg-[#111827] sm:hidden cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="flex aspect-video w-full max-w-xl flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#9CA3AF]/60 bg-[#EDEDED]/35 p-4 dark:border-white/20 dark:bg-[#111827]/50">
            {!soloLectura ? (
              <>
                <button
                  type="button"
                  onClick={() => fileInputsRef.current[PERSPECTIVA_PRINCIPAL.zona]?.click()}
                  className="fx-press inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#111827] px-5 py-2.5 font-display text-xs font-bold text-white hover:bg-[#1F2937] dark:bg-[#EDEDED] dark:text-[#111827] cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  <span>Cargar fotografía lateral (Principal)</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputsRef.current[PERSPECTIVA_PRINCIPAL.zona]?.click()}
                  className="fx-press inline-flex min-h-[40px] items-center gap-1.5 rounded-full border border-[#9CA3AF]/45 bg-white px-4 py-1.5 font-mono text-xs font-semibold text-[#111827] sm:hidden dark:border-white/15 dark:bg-[#1F2937] dark:text-[#EDEDED]"
                >
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Usar cámara</span>
                </button>
              </>
            ) : (
              <span className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                Sin fotografía lateral cargada
              </span>
            )}
          </div>
        )}
      </section>

      {/* 2. Galería ordenada de perspectivas obligatorias/recomendadas */}
      <section className="rounded-[24px] border border-[#9CA3AF]/35 bg-white p-4 sm:p-5 dark:border-white/10 dark:bg-[#1F2937] space-y-4">
        <div>
          <h3 className="font-display text-base font-bold text-[#111827] dark:text-[#EDEDED]">
            Fotografías por perspectiva
          </h3>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
            Frontal, trasera, cojinería y asientos interiores, y tablero y condiciones.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {PERSPECTIVAS_SECUNDARIAS.map((slot) => {
            const foto = fotosPorRanura.get(slot.zona);
            const isDragging = draggingZona === slot.zona;

            return (
              <div
                key={slot.zona}
                onDrop={(e) =>
                  handleDrop(e, slot.zona, slot.categoria, false, false)
                }
                onDragOver={(e) => {
                  if (soloLectura) return;
                  e.preventDefault();
                  setDraggingZona(slot.zona);
                }}
                onDragLeave={() => setDraggingZona(null)}
                className={`rounded-2xl border p-3 flex flex-col justify-between gap-2.5 transition-colors duration-150 ${
                  isDragging
                    ? 'border-[#111827] bg-[#EDEDED]/70 dark:border-white/50 dark:bg-white/10'
                    : 'border-[#9CA3AF]/30 bg-[#EDEDED]/25 dark:border-white/12 dark:bg-[#111827]/70'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
                      {slot.etiqueta}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                        foto?.url
                          ? 'bg-[#111827] text-white dark:bg-[#EDEDED] dark:text-[#111827]'
                          : 'bg-[#9CA3AF]/20 text-[#4B5563] dark:bg-white/10 dark:text-[#9CA3AF]'
                      }`}
                    >
                      {foto?.url ? 'Cargada' : 'Opcional'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-snug text-[#4B5563] dark:text-[#9CA3AF]">
                    {slot.descripcion}
                  </p>
                </div>

                <input
                  ref={(el) => {
                    fileInputsRef.current[slot.zona] = el;
                  }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void procesarArchivosEnZona(
                        e.target.files,
                        slot.zona,
                        slot.categoria,
                        false,
                        false
                      );
                    }
                    e.target.value = '';
                  }}
                />
                <input
                  ref={(el) => {
                    cameraInputsRef.current[slot.zona] = el;
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      void procesarArchivosEnZona(
                        e.target.files,
                        slot.zona,
                        slot.categoria,
                        false,
                        false
                      );
                    }
                    e.target.value = '';
                  }}
                />

                {foto && (foto.url || foto.estado === 'cargando') ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#9CA3AF]/30 bg-[#EDEDED]/50 dark:border-white/15 dark:bg-[#111827]">
                    {foto.estado === 'cargando' || !foto.url ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#4B5563] dark:text-[#9CA3AF]">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span className="font-mono text-[10px]">Optimizando...</span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setLightboxId(foto.id)}
                          aria-label={`Ampliar ${slot.etiqueta}`}
                          className="block h-full w-full cursor-pointer"
                        >
                          <img
                            src={foto.url}
                            alt={`${marcaModelo} - ${slot.etiqueta}`}
                            className="h-full w-full object-cover"
                          />
                        </button>

                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setLightboxId(foto.id)}
                            aria-label={`Ver ${slot.etiqueta} ampliada`}
                            className="fx-press flex h-8 w-8 items-center justify-center rounded-full bg-[#111827]/80 text-white backdrop-blur-xs hover:bg-[#111827] cursor-pointer"
                          >
                            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          {!soloLectura && (
                            <button
                              type="button"
                              onClick={() => handleEliminarFoto(foto.id)}
                              aria-label={`Eliminar ${slot.etiqueta}`}
                              className="fx-press flex h-8 w-8 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-700 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          )}
                        </div>

                        {!soloLectura && (
                          <button
                            type="button"
                            onClick={() => fileInputsRef.current[slot.zona]?.click()}
                            className="fx-press absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-[#111827]/80 px-2.5 py-1 font-mono text-[10px] font-bold text-white backdrop-blur-xs hover:bg-[#111827] cursor-pointer"
                          >
                            <RefreshCw className="h-3 w-3" aria-hidden="true" />
                            <span>Cambiar</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#9CA3AF]/55 bg-white/70 p-2 dark:border-white/20 dark:bg-white/5">
                    {!soloLectura ? (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputsRef.current[slot.zona]?.click()}
                          className="fx-press flex w-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg text-[#111827] transition-colors hover:bg-[#EDEDED]/60 dark:text-[#EDEDED] dark:hover:bg-white/10"
                        >
                          <ImagePlus className="h-5 w-5" aria-hidden="true" />
                          <span className="font-mono text-[11px] font-bold">+ Subir foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => cameraInputsRef.current[slot.zona]?.click()}
                          aria-label={`Tomar ${slot.etiqueta} con cámara`}
                          className="fx-press inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#9CA3AF]/35 bg-white py-1 font-mono text-[10px] font-semibold text-[#4B5563] sm:hidden dark:border-white/12 dark:bg-[#111827] dark:text-[#9CA3AF]"
                        >
                          <Camera className="h-3 w-3" aria-hidden="true" />
                          <span>Cámara</span>
                        </button>
                      </>
                    ) : (
                      <span className="font-mono text-[10px] text-[#9CA3AF]">
                        Sin fotografía
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Fotografías adicionales del interior (Múltiples) */}
      <section
        onDrop={(e) =>
          handleDrop(
            e,
            PERSPECTIVA_INTERIOR_MULTIPLE.zona,
            PERSPECTIVA_INTERIOR_MULTIPLE.categoria,
            true,
            false
          )
        }
        onDragOver={(e) => {
          if (soloLectura) return;
          e.preventDefault();
          setDraggingZona(PERSPECTIVA_INTERIOR_MULTIPLE.zona);
        }}
        onDragLeave={() => setDraggingZona(null)}
        className={`rounded-[24px] border p-4 sm:p-5 transition-colors duration-150 ${
          draggingZona === PERSPECTIVA_INTERIOR_MULTIPLE.zona
            ? 'border-[#111827] bg-[#EDEDED]/70 dark:border-white/50 dark:bg-white/10'
            : 'border-[#9CA3AF]/35 bg-white dark:border-white/10 dark:bg-[#1F2937]'
        }`}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-bold text-[#111827] dark:text-[#EDEDED]">
              Fotografías adicionales
            </h3>
            <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
              Agrega fotografías adicionales (interior, detalles o vistas complementarias) cuando sea necesario.
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[#9CA3AF]/30 bg-[#EDEDED]/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#111827] dark:border-white/12 dark:bg-white/8 dark:text-[#EDEDED]">
            {fotosInteriorAdicional.length}
          </span>
        </div>

        <input
          ref={(el) => {
            fileInputsRef.current[PERSPECTIVA_INTERIOR_MULTIPLE.zona] = el;
          }}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void procesarArchivosEnZona(
                e.target.files,
                PERSPECTIVA_INTERIOR_MULTIPLE.zona,
                PERSPECTIVA_INTERIOR_MULTIPLE.categoria,
                true,
                false
              );
            }
            e.target.value = '';
          }}
        />
        <input
          ref={(el) => {
            cameraInputsRef.current[PERSPECTIVA_INTERIOR_MULTIPLE.zona] = el;
          }}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              void procesarArchivosEnZona(
                e.target.files,
                PERSPECTIVA_INTERIOR_MULTIPLE.zona,
                PERSPECTIVA_INTERIOR_MULTIPLE.categoria,
                true,
                false
              );
            }
            e.target.value = '';
          }}
        />

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {fotosInteriorAdicional.map((foto, idxExtra) => (
            <div
              key={foto.id}
              className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[#9CA3AF]/35 bg-[#EDEDED]/40 dark:border-white/12 dark:bg-[#111827]"
            >
              {foto.estado === 'cargando' || !foto.url ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#4B5563] dark:text-[#9CA3AF]">
                  <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  <span className="font-mono text-[10px]">Optimizando...</span>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setLightboxId(foto.id)}
                    aria-label={`Ampliar ${obtenerEtiquetaPerspectivaGaleria(foto)}`}
                    className="block h-full w-full cursor-pointer"
                  >
                    <img
                      src={foto.url}
                      alt={`${marcaModelo} - ${obtenerEtiquetaPerspectivaGaleria(foto)}`}
                      className="h-full w-full object-cover"
                    />
                  </button>

                  <span className="pointer-events-none absolute bottom-1.5 left-1.5 rounded-full bg-[#111827]/75 px-2 py-0.5 font-mono text-[9px] font-semibold text-white backdrop-blur-xs">
                    {obtenerEtiquetaPerspectivaGaleria(foto)}
                  </span>

                  <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLightboxId(foto.id)}
                      aria-label="Ver fotografía ampliada"
                      className="fx-press flex h-7 w-7 items-center justify-center rounded-full bg-[#111827]/75 text-white backdrop-blur-xs hover:bg-[#111827] cursor-pointer"
                    >
                      <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    {!soloLectura && (
                      <button
                        type="button"
                        onClick={() => handleEliminarFoto(foto.id)}
                        aria-label="Eliminar fotografía adicional"
                        className="fx-press flex h-7 w-7 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-700 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>

                  {!soloLectura && fotosInteriorAdicional.length > 1 && (
                    <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idxExtra === 0}
                        onClick={() => handleMoverInterior(foto.id, -1)}
                        aria-label="Mover a la izquierda"
                        className="fx-press flex h-6 w-6 items-center justify-center rounded-full bg-[#111827]/80 text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        disabled={idxExtra === fotosInteriorAdicional.length - 1}
                        onClick={() => handleMoverInterior(foto.id, 1)}
                        aria-label="Mover a la derecha"
                        className="fx-press flex h-6 w-6 items-center justify-center rounded-full bg-[#111827]/80 text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}

          {!soloLectura && galeriaNormalizada.length < MAX_FOTOS_GALERIA && (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#9CA3AF]/60 bg-[#EDEDED]/30 p-2 dark:border-white/20 dark:bg-white/4">
              <button
                type="button"
                onClick={() =>
                  fileInputsRef.current[PERSPECTIVA_INTERIOR_MULTIPLE.zona]?.click()
                }
                className="fx-press flex w-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[#111827] transition-colors hover:bg-white/70 dark:text-[#EDEDED] dark:hover:bg-white/10"
              >
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
                <span className="font-mono text-[11px] font-bold">+ Agregar adicional</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  cameraInputsRef.current[PERSPECTIVA_INTERIOR_MULTIPLE.zona]?.click()
                }
                aria-label="Tomar foto adicional con cámara"
                className="fx-press inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#9CA3AF]/35 bg-white/80 py-1 font-mono text-[10px] font-semibold text-[#4B5563] sm:hidden dark:border-white/12 dark:bg-[#111827]/70 dark:text-[#9CA3AF]"
              >
                <Camera className="h-3 w-3" aria-hidden="true" />
                <span>Cámara</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {archivosFallidos.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-700 dark:text-rose-300">
          {archivosFallidos.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2">
              <span>{item.mensaje}</span>
              <button
                type="button"
                onClick={() => void handleReintentarFallido(item.id)}
                className="fx-press inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1 font-mono text-[11px] font-bold hover:bg-rose-500/15"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                <span>Reintentar</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {alertaLimite && (
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
          {alertaLimite}
        </p>
      )}

      {errorMsg && (
        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
          {errorMsg}
        </p>
      )}

      {/* Lightbox de visualización ampliada */}
      {lightboxFoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vista ampliada de fotografía"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Cerrar vista ampliada"
            onClick={() => setLightboxId(null)}
            className="fixed inset-0 bg-[#090E1A]/85 backdrop-blur-xs"
          />

          <div className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] border border-white/15 bg-[#111827] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDEDED] truncate">
                {obtenerEtiquetaPerspectivaGaleria(lightboxFoto)} · {lightboxIndex + 1}/{fotosListas.length}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {!soloLectura && (!lightboxFoto.esPrincipal || permitirEliminarPrincipal) && (
                  <button
                    type="button"
                    onClick={() => handleEliminarFoto(lightboxFoto.id)}
                    aria-label="Eliminar fotografía"
                    className="fx-press inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1 font-mono text-[11px] font-bold text-white hover:bg-rose-700 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    <span>Eliminar</span>
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar vista ampliada"
                  onClick={() => setLightboxId(null)}
                  className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative flex max-h-[75vh] items-center justify-center bg-[#090D16]">
              <img
                src={lightboxFoto.url}
                alt={`${marcaModelo} - ${obtenerEtiquetaPerspectivaGaleria(lightboxFoto)}`}
                className="max-h-[75vh] w-full object-contain"
              />

              {fotosListas.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Fotografía anterior"
                    onClick={() => {
                      const prev =
                        fotosListas[
                          (lightboxIndex - 1 + fotosListas.length) % fotosListas.length
                        ];
                      if (prev) setLightboxId(prev.id);
                    }}
                    className="fx-press absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/15 hover:bg-[#111827] cursor-pointer"
                  >
                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente fotografía"
                    onClick={() => {
                      const next =
                        fotosListas[(lightboxIndex + 1) % fotosListas.length];
                      if (next) setLightboxId(next.id);
                    }}
                    className="fx-press absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/15 hover:bg-[#111827] cursor-pointer"
                  >
                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
