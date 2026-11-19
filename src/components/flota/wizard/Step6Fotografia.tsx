import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { comprimirYNormalizarImagen } from '@/lib/media/image-compression';
import type {
  CategoriaGaleriaVehiculo,
  GaleriaFotoItem,
  VehiculoWizardData,
} from './types';

export const MAX_FOTOS_GALERIA = 24;
const MAX_PESO_BYTES = 10 * 1024 * 1024;

interface CategoriaConfig {
  id: CategoriaGaleriaVehiculo;
  titulo: string;
  descripcion: string;
}

const CATEGORIAS_GALERIA: readonly CategoriaConfig[] = [
  {
    id: 'EXTERIOR',
    titulo: 'Exterior',
    descripcion: 'Vista frontal, trasera, laterales y detalles exteriores.',
  },
  {
    id: 'INTERIOR',
    titulo: 'Interior',
    descripcion: 'Tablero, consola, asientos, baúl y detalles de cabina.',
  },
  {
    id: 'ESTADO',
    titulo: 'Estado y condiciones',
    descripcion: 'Llantas, motor, parte inferior o detalles existentes.',
  },
] as const;

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
  const [draggingCat, setDraggingCat] = useState<CategoriaGaleriaVehiculo | null>(null);
  const [alertaLimite, setAlertaLimite] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [archivosFallidos, setArchivosFallidos] = useState<
    Array<{ id: string; file: File; categoria: CategoriaGaleriaVehiculo; mensaje: string }>
  >([]);

  const fileInputsRef = useRef<Record<CategoriaGaleriaVehiculo, HTMLInputElement | null>>({
    EXTERIOR: null,
    INTERIOR: null,
    ESTADO: null,
  });
  const cameraInputsRef = useRef<Record<CategoriaGaleriaVehiculo, HTMLInputElement | null>>({
    EXTERIOR: null,
    INTERIOR: null,
    ESTADO: null,
  });

  // Mantener compatibilidad si solo existía `imagenUrl` heredada
  const galeriaNormalizada: GaleriaFotoItem[] = useMemo(() => {
    if (data.galeria && data.galeria.length > 0) {
      return data.galeria;
    }
    if (data.imagenUrl) {
      return [
        {
          id: 'portada-inicial',
          url: data.imagenUrl,
          categoria: 'EXTERIOR',
          esPrincipal: true,
          orden: 0,
          estado: 'listo',
        },
      ];
    }
    return [];
  }, [data.galeria, data.imagenUrl]);

  const sincronizarGaleria = (nuevaGaleria: GaleriaFotoItem[]) => {
    const listas = nuevaGaleria.filter((f) => f.estado !== 'error');
    const tienePrincipal = listas.some((f) => f.esPrincipal && f.url);
    const conPrincipal = listas.map((f, idx) => ({
      ...f,
      orden: idx,
      esPrincipal: tienePrincipal ? f.esPrincipal : idx === 0 && Boolean(f.url),
    }));

    const principal =
      conPrincipal.find((f) => f.esPrincipal && f.url)?.url ??
      conPrincipal.find((f) => Boolean(f.url))?.url ??
      '';

    onChange({
      galeria: conPrincipal,
      imagenUrl: principal,
    });
  };

  const procesarArchivos = async (
    files: FileList | File[],
    categoria: CategoriaGaleriaVehiculo
  ) => {
    setAlertaLimite(null);
    const listaArchivos = Array.from(files).filter((f) =>
      f.type.startsWith('image/')
    );
    if (listaArchivos.length === 0) return;

    let galeriaActual = [...galeriaNormalizada];
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
    const trabajos: Array<{ tempId: string; file: File; firma: string }> = [];

    for (const file of archivosAProcesar) {
      const firma = `${file.name}:${file.size}:${file.lastModified}`;
      const duplicado = galeriaActual.some((f) => f.firmaArchivo === firma);
      if (duplicado) continue;

      if (file.size > MAX_PESO_BYTES) {
        setArchivosFallidos((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            file,
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
        esPrincipal: galeriaActual.length === 0 && nuevosPlaceholders.length === 0,
        orden: galeriaActual.length + nuevosPlaceholders.length,
        nombre: file.name,
        firmaArchivo: firma,
        estado: 'cargando',
      });
      trabajos.push({ tempId, file, firma });
    }

    if (trabajos.length === 0) return;

    galeriaActual = [...galeriaActual, ...nuevosPlaceholders];
    sincronizarGaleria(galeriaActual);

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
        sincronizarGaleria(galeriaActual);
      } catch {
        galeriaActual = galeriaActual.filter((item) => item.id !== tempId);
        sincronizarGaleria(galeriaActual);
        setArchivosFallidos((prev) => [
          ...prev,
          {
            id: tempId,
            file,
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
    await procesarArchivos([encontrado.file], encontrado.categoria);
  };

  const handleEliminarFoto = (id: string) => {
    const filtradas = galeriaNormalizada.filter((f) => f.id !== id);
    if (lightboxId === id) {
      setLightboxId(null);
    }
    sincronizarGaleria(filtradas);
  };

  const handleEstablecerPrincipal = (id: string) => {
    const actualizadas = galeriaNormalizada.map((f) => ({
      ...f,
      esPrincipal: f.id === id,
    }));
    sincronizarGaleria(actualizadas);
  };

  const handleDrop = (
    e: DragEvent<HTMLElement>,
    categoria: CategoriaGaleriaVehiculo
  ) => {
    e.preventDefault();
    setDraggingCat(null);
    if (e.dataTransfer.files?.length) {
      void procesarArchivos(e.dataTransfer.files, categoria);
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
    <div className="w-full space-y-5">
      {/* Encabezado */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="block font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] sm:text-xs dark:text-[#9CA3AF]">
            Paso 06 · Galería Fotográfica
          </span>
          <span className="font-mono text-[11px] font-semibold text-[#4B5563] dark:text-[#9CA3AF]">
            {fotosListas.length} / {MAX_FOTOS_GALERIA} fotos
          </span>
        </div>
        <h1 className="font-display text-2xl leading-[1.12] font-bold tracking-tight text-[#111827] sm:text-3xl dark:text-[#EDEDED]">
          Muéstranos tu vehículo
        </h1>
      </div>

      {/* Categorías de galería */}
      <div className="space-y-4">
        {CATEGORIAS_GALERIA.map((cat) => {
          const fotosCat = galeriaNormalizada.filter((f) => f.categoria === cat.id);
          const isDragging = draggingCat === cat.id;

          return (
            <section
              key={cat.id}
              onDrop={(e) => handleDrop(e, cat.id)}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingCat(cat.id);
              }}
              onDragLeave={() => setDraggingCat(null)}
              className={`rounded-[24px] border p-4 transition-colors duration-150 sm:p-5 ${isDragging
                  ? 'border-[#111827] bg-[#EDEDED]/60 dark:border-white/50 dark:bg-white/10'
                  : 'border-[#9CA3AF]/35 bg-white dark:border-white/10 dark:bg-[#1F2937]'
                }`}
            >
              {/* Encabezado de categoría */}
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#111827] dark:text-[#EDEDED]">
                    {cat.titulo}
                  </h2>
                  <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF]">
                    {cat.descripcion}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-[#9CA3AF]/30 bg-[#EDEDED]/60 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#111827] dark:border-white/12 dark:bg-white/8 dark:text-[#EDEDED]">
                  {fotosCat.length}
                </span>
              </div>

              {/* Inputs ocultos de archivos (múltiple) y cámara */}
              <input
                ref={(el) => {
                  fileInputsRef.current[cat.id] = el;
                }}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void procesarArchivos(e.target.files, cat.id);
                  }
                  e.target.value = '';
                }}
              />
              <input
                ref={(el) => {
                  cameraInputsRef.current[cat.id] = el;
                }}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) {
                    void procesarArchivos(e.target.files, cat.id);
                  }
                  e.target.value = '';
                }}
              />

              {/* Cuadrícula de miniaturas + botón integrado */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {fotosCat.map((foto) => (
                  <div
                    key={foto.id}
                    className={`group relative aspect-[4/3] overflow-hidden rounded-2xl border bg-[#EDEDED]/40 dark:bg-[#111827] ${foto.esPrincipal
                        ? 'border-[#111827] ring-2 ring-[#111827]/20 dark:border-[#EDEDED] dark:ring-white/25'
                        : 'border-[#9CA3AF]/35 dark:border-white/12'
                      }`}
                  >
                    {foto.estado === 'cargando' || !foto.url ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[var(--fx-text-muted)]">
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                        <span className="font-mono text-[10px]">Optimizando...</span>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setLightboxId(foto.id)}
                          aria-label={`Ampliar fotografía de ${cat.titulo}`}
                          className="h-full w-full cursor-pointer overflow-hidden"
                        >
                          <img
                            src={foto.url}
                            alt={`${data.marca || 'Vehículo'} ${data.modelo} - ${cat.titulo}`}
                            className="h-full w-full object-cover"
                          />
                        </button>

                        {/* Badge o acción Principal */}
                        {foto.esPrincipal ? (
                          <span className="pointer-events-none absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[#111827] px-2 py-0.5 font-mono text-[10px] font-bold text-[#EDEDED] shadow-xs dark:bg-[#EDEDED] dark:text-[#111827]">
                            <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                            <span>Principal</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleEstablecerPrincipal(foto.id)}
                            aria-label="Establecer como fotografía principal"
                            className="fx-press absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[#111827]/75 px-2 py-0.5 font-mono text-[10px] font-semibold text-white backdrop-blur-xs hover:bg-[#111827]"
                          >
                            <Star className="h-2.5 w-2.5" aria-hidden="true" />
                            <span>Portada</span>
                          </button>
                        )}

                        {/* Botones eliminar y ampliar */}
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setLightboxId(foto.id)}
                            aria-label="Ver fotografía ampliada"
                            className="fx-press flex h-7 w-7 items-center justify-center rounded-full bg-[#111827]/75 text-white backdrop-blur-xs hover:bg-[#111827]"
                          >
                            <ZoomIn className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEliminarFoto(foto.id)}
                            aria-label="Eliminar fotografía"
                            className="fx-press flex h-7 w-7 items-center justify-center rounded-full bg-rose-600/90 text-white hover:bg-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {/* Celda integrada + Agregar */}
                {galeriaNormalizada.length < MAX_FOTOS_GALERIA && (
                  <div className="flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#9CA3AF]/60 bg-[#EDEDED]/30 p-2 dark:border-white/20 dark:bg-white/4">
                    <button
                      type="button"
                      onClick={() => fileInputsRef.current[cat.id]?.click()}
                      className="fx-press flex w-full flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl text-[#111827] transition-colors hover:bg-white/70 dark:text-[#EDEDED] dark:hover:bg-white/10"
                    >
                      <ImagePlus className="h-5 w-5" aria-hidden="true" />
                      <span className="font-mono text-[11px] font-bold">+ Agregar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => cameraInputsRef.current[cat.id]?.click()}
                      aria-label={`Tomar foto con cámara para ${cat.titulo}`}
                      className="fx-press inline-flex w-full items-center justify-center gap-1 rounded-lg border border-[#9CA3AF]/35 bg-white/80 py-1 font-mono text-[10px] font-semibold text-[#4B5563] hover:text-[#111827] sm:hidden dark:border-white/12 dark:bg-[#111827]/70 dark:text-[#9CA3AF] dark:hover:text-[#EDEDED]"
                    >
                      <Camera className="h-3 w-3" aria-hidden="true" />
                      <span>Cámara</span>
                    </button>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* Errores de archivo con opción de reintento */}
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

      {errors.imagenUrl && (
        <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
          {errors.imagenUrl}
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
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#EDEDED]">
                {CATEGORIAS_GALERIA.find((c) => c.id === lightboxFoto.categoria)?.titulo ??
                  'Galería'}
              </span>
              <div className="flex items-center gap-2">
                {lightboxFoto.esPrincipal ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-mono text-[11px] font-bold text-[#111827]">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    <span>Principal</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleEstablecerPrincipal(lightboxFoto.id)}
                    className="fx-press inline-flex items-center gap-1 rounded-full border border-white/25 px-3 py-1 font-mono text-[11px] font-bold text-[#EDEDED] hover:bg-white/10"
                  >
                    <Star className="h-3 w-3" aria-hidden="true" />
                    <span>Establecer como principal</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleEliminarFoto(lightboxFoto.id)}
                  aria-label="Eliminar fotografía"
                  className="fx-press inline-flex items-center gap-1 rounded-full bg-rose-600/90 px-3 py-1 font-mono text-[11px] font-bold text-white hover:bg-rose-700"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Eliminar</span>
                </button>
                <button
                  type="button"
                  aria-label="Cerrar vista ampliada"
                  onClick={() => setLightboxId(null)}
                  className="fx-press flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="relative flex max-h-[70vh] items-center justify-center bg-[#090D16]">
              <img
                src={lightboxFoto.url}
                alt={`${data.marca || 'Vehículo'} ${data.modelo}`}
                className="max-h-[70vh] w-full object-contain"
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
                    className="fx-press absolute left-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/15 hover:bg-[#111827]"
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
                    className="fx-press absolute right-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#111827]/80 text-white border border-white/15 hover:bg-[#111827]"
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
