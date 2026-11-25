import { useState } from 'react';
import { actions } from 'astro:actions';
import {
  ZONAS_FOTOS_ALQUILER,
  type ReservaClienteItem,
} from '@/lib/flota';
import { comprimirYNormalizarImagen } from '@/lib/media/image-compression';
import type { EstadoGeneralInspeccion, ZonaEvidenciaVehiculo } from '@/db/schema';
import type { EntregaWizardData, FotoEntregaCapturada } from './types';

export interface Step3PeritajeSalidaR2Props {
  reserva: ReservaClienteItem;
  data: EntregaWizardData;
  onChange: (updates: Partial<EntregaWizardData>) => void;
}

const OPCIONES_ESTADO_GENERAL: ReadonlyArray<{
  id: EstadoGeneralInspeccion;
  label: string;
}> = [
  { id: 'IMPECABLE', label: 'Impecable' },
  { id: 'OPTIMO', label: 'Óptimo' },
  { id: 'CON_NOVEDAD', label: 'Con observación previa' },
];

const formatHoraCaptura = (iso: string): string => {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return 'Registrada';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(dt);
};

export default function Step3PeritajeSalidaR2({
  reserva,
  data,
  onChange,
}: Step3PeritajeSalidaR2Props) {
  const [subiendoZona, setSubiendoZona] = useState<ZonaEvidenciaVehiculo | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);

  const fotosCapturadasCount = ZONAS_FOTOS_ALQUILER.filter((z) =>
    data.fotosEntrega.some((f) => f.zonaEvidencia === z.id)
  ).length;

  const manejarCapturaFoto = async (
    zonaId: ZonaEvidenciaVehiculo,
    etiqueta: string,
    ordenVisual: number,
    file: File | undefined
  ) => {
    if (!file) return;
    setErrorFoto(null);
    setSubiendoZona(zonaId);

    const capturadoEnISO = new Date().toISOString();

    try {
      const comprimida = await comprimirYNormalizarImagen(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.84,
      });

      const res = await actions.reservas.registrarFotoAlquiler({
        codigo: reserva.codigo,
        etapaOperativa: 'ENTREGA_SALIDA',
        zonaEvidencia: zonaId,
        dataUrl: comprimida.base64,
        observacion: `Entrega · ${etiqueta}`,
        ordenVisual,
        capturadoEnISO,
      });

      let nuevaFoto: FotoEntregaCapturada;
      if (res.data?.ok && res.data.foto) {
        nuevaFoto = {
          id: res.data.foto.id,
          zonaEvidencia: zonaId,
          url: res.data.foto.url,
          capturadoEnISO: res.data.foto.capturadoEnISO ?? capturadoEnISO,
          subidaEnR2: true,
        };
      } else {
        // Fallback local: se enviará al confirmar la entrega si R2 no respondió en el instante
        nuevaFoto = {
          id: `tmp-ent-${Date.now()}-${zonaId}`,
          zonaEvidencia: zonaId,
          url: comprimida.base64,
          capturadoEnISO,
          subidaEnR2: false,
          dataUrlFallback: comprimida.base64,
        };
      }

      const restantes = data.fotosEntrega.filter((f) => f.zonaEvidencia !== zonaId);
      onChange({
        fotosEntrega: [...restantes, nuevaFoto],
      });
    } catch (err: unknown) {
      setErrorFoto(
        err instanceof Error
          ? err.message
          : `No se pudo procesar la fotografía de ${etiqueta}.`
      );
    } finally {
      setSubiendoZona(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 min-w-0 flex-1">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563] dark:text-[#9CA3AF] block">
            Paso 03 · Fotografías de Entrega
          </span>
          <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#111827] dark:text-[#EDEDED] leading-tight">
            Registra las fotos antes de entregar
          </h1>
          <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] font-medium">
            Captura frente, laterales, parte trasera, interior y tablero/odómetro. Se guardan con fecha y hora exacta para comparar al momento de la devolución.
          </p>
        </div>

        <span className="shrink-0 rounded-full bg-white dark:bg-[#1F2937] border border-[#9CA3AF]/45 dark:border-white/15 px-3 py-1.5 font-mono text-[11px] font-bold text-[#111827] dark:text-[#EDEDED] tabular-nums">
          {fotosCapturadasCount} / {ZONAS_FOTOS_ALQUILER.length} fotos
        </span>
      </div>

      {errorFoto && (
        <div
          role="alert"
          className="rounded-2xl bg-[#111827] text-[#EDEDED] border border-[#4B5563] px-4 py-3 text-xs flex items-center justify-between gap-2"
        >
          <span>{errorFoto}</span>
          <button
            type="button"
            onClick={() => setErrorFoto(null)}
            className="min-h-[44px] px-2 text-[11px] font-bold text-[#9CA3AF] hover:text-white cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Galería de 6 zonas fotográficas sin puntos sobre el vehículo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ZONAS_FOTOS_ALQUILER.map((zona, idx) => {
          const fotoActual = data.fotosEntrega.find(
            (f) => f.zonaEvidencia === zona.id
          );
          const cargando = subiendoZona === zona.id;

          return (
            <div
              key={zona.id}
              className="rounded-[20px] border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] overflow-hidden flex flex-col justify-between"
            >
              <div className="relative aspect-video w-full bg-[#EDEDED]/75 dark:bg-[#111827] flex items-center justify-center overflow-hidden">
                {fotoActual ? (
                  <>
                    <img
                      src={fotoActual.url}
                      alt={`Foto de entrega · ${zona.etiqueta}`}
                      className="h-full w-full object-cover object-center"
                    />
                    <span className="absolute left-2 bottom-2 rounded-full bg-[#111827]/85 border border-white/20 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[#EDEDED]">
                      {formatHoraCaptura(fotoActual.capturadoEnISO)}
                    </span>
                  </>
                ) : (
                  <div className="px-4 text-center space-y-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-6 w-6 mx-auto text-[#4B5563] dark:text-[#9CA3AF]"
                      aria-hidden="true"
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                    <p className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">
                      Sin captura aún
                    </p>
                  </div>
                )}
              </div>

              <div className="p-3 space-y-2">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-xs font-bold text-[#111827] dark:text-[#EDEDED] truncate">
                      {zona.etiqueta}
                    </h2>
                    {fotoActual && (
                      <span className="shrink-0 rounded-full bg-[#EDEDED] dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold text-[#111827] dark:text-[#EDEDED]">
                        {fotoActual.subidaEnR2 ? 'Guardada' : 'Lista'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#4B5563] dark:text-[#9CA3AF] line-clamp-1 mt-0.5">
                    {zona.descripcionCorta}
                  </p>
                </div>

                <label
                  className={`fx-press flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold cursor-pointer transition-colors ${
                    fotoActual
                      ? 'bg-[#EDEDED] dark:bg-[#111827] text-[#111827] dark:text-[#EDEDED] border-[#9CA3AF]/45 dark:border-white/15 hover:bg-[#9CA3AF]/25'
                      : 'bg-[#111827] dark:bg-[#EDEDED] text-white dark:text-[#111827] border-[#111827] dark:border-[#EDEDED] hover:bg-[#1F2937] dark:hover:bg-white'
                  } ${cargando ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <span>
                    {cargando
                      ? 'Guardando...'
                      : fotoActual
                        ? 'Cambiar foto'
                        : 'Tomar / subir foto'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={cargando}
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      void manejarCapturaFoto(zona.id, zona.etiqueta, idx, file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      {/* Estado general de entrega y observaciones */}
      <div className="rounded-[22px] border border-[#9CA3AF]/40 dark:border-white/15 bg-white dark:bg-[#1F2937] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-display text-xs font-bold text-[#111827] dark:text-[#EDEDED]">
            Estado general del vehículo al salir
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {OPCIONES_ESTADO_GENERAL.map((op) => {
              const activo = data.estadoGeneralEntrega === op.id;
              return (
                <button
                  key={op.id}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => onChange({ estadoGeneralEntrega: op.id })}
                  className={`fx-press min-h-[44px] rounded-full px-3.5 py-2 text-xs font-bold border transition-colors cursor-pointer ${
                    activo
                      ? 'bg-[#111827] text-white border-[#111827] dark:bg-[#EDEDED] dark:text-[#111827] dark:border-[#EDEDED]'
                      : 'bg-[#EDEDED]/70 dark:bg-[#111827] text-[#4B5563] dark:text-[#EDEDED] border-[#9CA3AF]/35 dark:border-white/15'
                  }`}
                >
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>

        <textarea
          rows={2}
          value={data.observacionesEntrega}
          onChange={(e) => onChange({ observacionesEntrega: e.target.value })}
          placeholder="Observaciones adicionales sobre el estado inicial del vehículo (opcional)..."
          aria-label="Observaciones adicionales de la entrega"
          className="w-full rounded-2xl bg-[#EDEDED]/60 dark:bg-[#111827] border border-[#9CA3AF]/40 dark:border-white/15 px-3.5 py-2.5 text-base text-[#111827] dark:text-[#EDEDED] placeholder:text-[#9CA3AF] focus:border-[#111827] dark:focus:border-[#EDEDED] focus:bg-white dark:focus:bg-[#111827]"
        />
      </div>
    </div>
  );
}
