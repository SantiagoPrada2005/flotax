import { useRef, useState } from 'react';
import { Eye, RefreshCw, ShieldAlert, Trash2, Upload } from 'lucide-react';
import type { CaraLicenciaTransito, EstadoLicenciaTransito } from '@/lib/documentos-vehiculo';
import { comprimirYNormalizarImagen } from '@/lib/media/image-compression';

export interface TransitLicenseCardProps {
  vehiculoId: string;
  placa: string;
  estado: EstadoLicenciaTransito;
  puedeGestionar: boolean;
  versiones: Record<CaraLicenciaTransito, number>;
  onFotoActualizada: (cara: CaraLicenciaTransito, tieneFoto: boolean, version: number) => void;
  onAbrirVisor: (cara: CaraLicenciaTransito) => void;
}

interface RespuestaFotoApi {
  ok?: boolean;
  error?: string;
  version?: number;
}

export default function TransitLicenseCard({
  vehiculoId,
  placa,
  estado,
  puedeGestionar,
  versiones,
  onFotoActualizada,
  onAbrirVisor,
}: TransitLicenseCardProps) {
  const [subiendoCara, setSubiendoCara] = useState<CaraLicenciaTransito | null>(null);
  const [eliminandoCara, setEliminandoCara] = useState<CaraLicenciaTransito | null>(null);
  const [confirmandoEliminar, setConfirmandoEliminar] = useState<CaraLicenciaTransito | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputFrenteRef = useRef<HTMLInputElement | null>(null);
  const inputReversoRef = useRef<HTMLInputElement | null>(null);

  const caras: ReadonlyArray<{
    cara: CaraLicenciaTransito;
    titulo: string;
    subtitulo: string;
    tieneFoto: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }> = [
    {
      cara: 'frente',
      titulo: 'Parte delantera',
      subtitulo: 'Datos del vehículo y placa',
      tieneFoto: estado.tieneFrente,
      inputRef: inputFrenteRef,
    },
    {
      cara: 'reverso',
      titulo: 'Parte trasera',
      subtitulo: 'Datos técnicos y propietario',
      tieneFoto: estado.tieneReverso,
      inputRef: inputReversoRef,
    },
  ];

  const manejarSeleccionArchivo = async (
    cara: CaraLicenciaTransito,
    file: File | undefined
  ) => {
    if (!file) return;
    setErrorMsg(null);
    setConfirmandoEliminar(null);
    setSubiendoCara(cara);

    try {
      const comprimida = await comprimirYNormalizarImagen(file, {
        maxWidth: 2048,
        maxHeight: 2048,
        quality: 0.88,
      });

      const formData = new FormData();
      formData.append(
        'archivo',
        new File([comprimida.blob], `licencia-${cara}.jpg`, { type: 'image/jpeg' })
      );

      const res = await fetch(
        `/api/admin/flota/${encodeURIComponent(vehiculoId)}/documentos/licencia/${cara}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const data: RespuestaFotoApi = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'No fue posible subir la fotografía.');
        return;
      }

      onFotoActualizada(cara, true, data.version ?? Date.now());
    } catch {
      setErrorMsg('Error al procesar o subir la fotografía. Intenta nuevamente.');
    } finally {
      setSubiendoCara(null);
    }
  };

  const manejarEliminar = async (cara: CaraLicenciaTransito) => {
    setErrorMsg(null);
    setEliminandoCara(cara);
    setConfirmandoEliminar(null);

    try {
      const res = await fetch(
        `/api/admin/flota/${encodeURIComponent(vehiculoId)}/documentos/licencia/${cara}`,
        { method: 'DELETE' }
      );
      const data: RespuestaFotoApi = await res.json();
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? 'No fue posible eliminar la fotografía.');
        return;
      }

      onFotoActualizada(cara, false, Date.now());
    } catch {
      setErrorMsg('Error de red al eliminar la fotografía.');
    } finally {
      setEliminandoCara(null);
    }
  };

  return (
    <article className="rounded-[24px] border border-[#9CA3AF]/40 bg-white dark:bg-[#1F2937] dark:border-white/10 p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base sm:text-lg font-bold text-[#111827] dark:text-[#EDEDED]">
              Licencia de tránsito
            </h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                estado.completa
                  ? 'bg-[var(--fx-status-emerald-bg)] text-[var(--fx-status-emerald-text)] border-[var(--fx-status-emerald-border)]'
                  : 'bg-[#EDEDED] text-[#4B5563] border-[#9CA3AF]/40 dark:bg-[#111827] dark:text-[#D1D5DB] dark:border-white/15'
              }`}
            >
              {estado.completa
                ? 'Completa (2/2)'
                : estado.tieneFrente || estado.tieneReverso
                  ? 'Parcial (1/2)'
                  : 'Sin fotos'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#4B5563] dark:text-[#D1D5DB]">
            Acceso privado restringido a operadores autorizados. Toca la miniatura para abrir en visor con zoom.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-status-danger/40 bg-status-danger/10 px-3.5 py-2.5 text-xs font-semibold text-status-danger"
        >
          <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {caras.map((item) => {
          const estaSubiendo = subiendoCara === item.cara;
          const estaEliminando = eliminandoCara === item.cara;
          const urlFoto = `/api/admin/flota/${encodeURIComponent(vehiculoId)}/documentos/licencia/${item.cara}?v=${versiones[item.cara]}`;

          return (
            <div
              key={item.cara}
              className="rounded-[20px] border border-[#9CA3AF]/35 bg-[#EDEDED]/45 dark:bg-[#111827]/70 dark:border-white/10 p-3.5 space-y-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="font-display text-sm font-bold text-[#111827] dark:text-[#EDEDED]">
                    {item.titulo}
                  </h4>
                  <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF]">
                    {item.subtitulo}
                  </p>
                </div>
              </div>

              <input
                ref={item.inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  void manejarSeleccionArchivo(item.cara, file);
                }}
              />

              {item.tieneFoto ? (
                <div className="space-y-3">
                  {/* Miniatura de acceso exclusivo al visor */}
                  <button
                    type="button"
                    onClick={() => onAbrirVisor(item.cara)}
                    aria-label={`Ampliar ${item.titulo} de Licencia de tránsito (${placa})`}
                    className="group relative block w-full aspect-[16/10] overflow-hidden rounded-2xl border border-[#9CA3AF]/40 bg-[#111827] cursor-zoom-in"
                  >
                    <img
                      src={urlFoto}
                      alt={`${item.titulo} de Licencia de tránsito (${placa})`}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-[#111827]/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Ampliar</span>
                    </span>
                  </button>

                  {/* Acciones de ver, reemplazar y eliminar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onAbrirVisor(item.cara)}
                      className="fx-press flex-1 min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111827] text-white hover:bg-[#1F2937] dark:bg-[#EDEDED] dark:text-[#111827] dark:hover:bg-white px-3.5 text-xs font-bold cursor-pointer"
                    >
                      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Ver</span>
                    </button>

                    {puedeGestionar && (
                      <>
                        <button
                          type="button"
                          disabled={estaSubiendo || estaEliminando}
                          onClick={() => item.inputRef.current?.click()}
                          className="fx-press min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full border border-[#9CA3AF]/45 bg-white hover:bg-[#EDEDED] text-[#111827] dark:bg-white/10 dark:border-white/15 dark:text-[#EDEDED] dark:hover:bg-white/20 px-3.5 text-xs font-bold disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw
                            className={`h-3.5 w-3.5 shrink-0 ${estaSubiendo ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                          />
                          <span>{estaSubiendo ? 'Subiendo...' : 'Reemplazar'}</span>
                        </button>

                        {confirmandoEliminar === item.cara ? (
                          <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-status-danger/40 bg-status-danger/10 p-2">
                            <span className="text-[11px] font-bold text-status-danger px-1">
                              ¿Eliminar foto?
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setConfirmandoEliminar(null)}
                                className="min-h-[36px] rounded-full px-3 text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/40 cursor-pointer"
                              >
                                No
                              </button>
                              <button
                                type="button"
                                disabled={estaEliminando}
                                onClick={() => void manejarEliminar(item.cara)}
                                className="min-h-[36px] rounded-full px-3 text-[11px] font-bold text-white bg-status-danger cursor-pointer"
                              >
                                {estaEliminando ? 'Eliminando...' : 'Sí, eliminar'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={estaSubiendo || estaEliminando}
                            aria-label={`Eliminar foto ${item.titulo}`}
                            onClick={() => setConfirmandoEliminar(item.cara)}
                            className="fx-press flex h-11 w-11 items-center justify-center rounded-full border border-[#9CA3AF]/40 bg-white hover:border-status-danger hover:text-status-danger text-[#4B5563] dark:bg-white/10 dark:border-white/15 dark:text-[#D1D5DB] disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[#9CA3AF]/60 bg-white/75 dark:bg-[#1F2937]/60 dark:border-white/15 p-5 text-center aspect-[16/10]">
                  <p className="text-xs font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                    Sin fotografía cargada
                  </p>
                  {puedeGestionar && (
                    <button
                      type="button"
                      disabled={estaSubiendo}
                      onClick={() => item.inputRef.current?.click()}
                      className="fx-press min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111827] hover:bg-[#1F2937] text-white dark:bg-[#EDEDED] dark:text-[#111827] dark:hover:bg-white px-4 text-xs font-bold disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{estaSubiendo ? 'Subiendo...' : `Subir ${item.titulo.toLowerCase()}`}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}
