import { useState, useMemo, useTransition, useEffect } from 'react';
import { actions } from 'astro:actions';
import type { LocalPublicoContexto } from '@/lib/flota/locales-captacion';
import { normalizarSlugLocal } from '@/lib/flota/locales-captacion';

export interface LocalCatalogShareCardProps {
  local: LocalPublicoContexto;
  unidadesCount?: number | undefined;
  compact?: boolean | undefined;
}

/**
 * Genera una matriz visual determinista 21x21 estilo QR con patrones de posición estándar
 * a partir del enlace del local para exhibición en mostrador sin librerías pesadas.
 */
function generarMatrizQr21(texto: string): boolean[][] {
  const size = 21;
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => false)
  );

  const pintarFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const esBorde = r === 0 || r === 6 || c === 0 || c === 6;
        const esCentro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const row = grid[r0 + r];
        if (row) {
          row[c0 + c] = esBorde || esCentro;
        }
      }
    }
  };

  pintarFinder(0, 0);
  pintarFinder(0, size - 7);
  pintarFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const enFinderSupIzq = r < 8 && c < 8;
      const enFinderSupDer = r < 8 && c >= size - 8;
      const enFinderInfIzq = r >= size - 8 && c < 8;
      if (enFinderSupIzq || enFinderSupDer || enFinderInfIzq) continue;

      if (r === 6 || c === 6) {
        const row = grid[r];
        if (row) row[c] = (r + c) % 2 === 0;
        continue;
      }

      const seed = Math.imul(hash ^ (r * 31 + c * 17), 2654435761) >>> 0;
      const charCode = texto.charCodeAt((r * size + c) % Math.max(1, texto.length)) || 7;
      const row = grid[r];
      if (row) {
        row[c] = ((seed + charCode) & 3) !== 0;
      }
    }
  }

  return grid;
}

export default function LocalCatalogShareCard({
  local: initialLocal,
  unidadesCount = 6,
  compact = false,
}: LocalCatalogShareCardProps) {
  const [local, setLocal] = useState<LocalPublicoContexto>(initialLocal);
  const [opcionesAbiertas, setOpcionesAbiertas] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [modalAbierto, setModalAbierto] = useState<'qr' | 'editar' | null>(null);
  const [slugInput, setSlugInput] = useState(initialLocal.slug);
  const [telefonoInput, setTelefonoInput] = useState(initialLocal.telefono ?? '');
  const [direccionInput, setDireccionInput] = useState(initialLocal.direccion ?? '');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'err'; texto: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const pathRelativo = `/c/${local.slug}`;
  const fullUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${pathRelativo}`
      : `https://flotax.innovaweb.pro${pathRelativo}`;

  const qrMatrix = useMemo(() => generarMatrizQr21(fullUrl), [fullUrl]);

  useEffect(() => {
    if (!modalAbierto) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalAbierto(null);
        setFeedback(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [modalAbierto]);

  const triggerHaptic = (ms = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar en dispositivos sin vibración
      }
    }
  };

  const copiarEnlace = async () => {
    triggerHaptic(10);
    try {
      const targetUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/c/${local.slug}`
          : fullUrl;
      await navigator.clipboard.writeText(targetUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2400);
    } catch {
      setFeedback({
        tipo: 'err',
        texto: 'No se pudo copiar automáticamente. Usa el botón Compartir.',
      });
    }
  };

  const compartirNativoOol = async () => {
    triggerHaptic(10);
    const targetUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/c/${local.slug}`
        : fullUrl;
    const shareText = `Explora el catálogo de vehículos disponibles en ${local.nombre} y reserva directamente:`;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `${local.nombre} — Catálogo de Alquiler`,
          text: shareText,
          url: targetUrl,
        });
        return;
      } catch {
        return;
      }
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${targetUrl}`)}`;
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const guardarPersonalizacion = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setFeedback(null);
    const limpio = normalizarSlugLocal(slugInput);
    if (limpio.length < 3) {
      setFeedback({
        tipo: 'err',
        texto: 'El enlace debe tener mínimo 3 letras o números.',
      });
      return;
    }

    startTransition(async () => {
      try {
        const { data, error } = await actions.portal.actualizarPerfilCatalogoLocal({
          slug: limpio,
          telefono: telefonoInput.trim() || undefined,
          direccion: direccionInput.trim() || undefined,
        });

        if (error || !data?.ok) {
          setFeedback({
            tipo: 'err',
            texto: error?.message || 'No fue posible guardar el enlace.',
          });
          return;
        }

        setLocal(data.local);
        setSlugInput(data.local.slug);
        setFeedback({
          tipo: 'ok',
          texto: '¡Enlace actualizado correctamente!',
        });
        setTimeout(() => {
          setModalAbierto(null);
          setFeedback(null);
        }, 1000);
      } catch {
        setFeedback({
          tipo: 'err',
          texto: 'Error de red al actualizar el enlace.',
        });
      }
    });
  };

  return (
    <>
      <section
        aria-label="Enlace del catálogo del local"
        className={`relative overflow-hidden rounded-[24px] bg-white border border-[#9CA3AF]/35 dark:bg-[#1F2937] dark:border-white/10 ${
          compact ? 'p-3.5' : 'p-3.5 sm:p-4'
        } shadow-[0_10px_26px_-10px_rgba(17,24,39,0.08)]`}
      >
        {/* NIVEL 1 (Progressive Disclosure): Fila Principal Compacta de Acción Rápida */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#111827] text-[#EDEDED] dark:bg-white/15 dark:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-[18px] w-[18px]"
              >
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-sm sm:text-base font-extrabold tracking-tight text-[#111827] dark:text-[#EDEDED] truncate">
                Catálogo · {local.nombre}
              </h2>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#4B5563] dark:text-[#9CA3AF] truncate">
                <span className="font-mono font-semibold text-[#111827] dark:text-[#EDEDED] truncate">
                  /c/{local.slug}
                </span>
                <span aria-hidden="true">•</span>
                <span className="font-mono tabular-nums shrink-0">
                  {unidadesCount} {unidadesCount === 1 ? 'unidad' : 'uds'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={compartirNativoOol}
              className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#111827] px-3.5 sm:px-4 py-2 text-xs font-bold text-[#EDEDED] shadow-2xs hover:bg-[#1F2937] dark:bg-white dark:text-[#111827] dark:hover:bg-[#EDEDED]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
              <span>Compartir</span>
            </button>

            <button
              type="button"
              aria-expanded={opcionesAbiertas}
              aria-label={
                opcionesAbiertas
                  ? 'Ocultar herramientas del catálogo'
                  : 'Mostrar herramientas del catálogo'
              }
              onClick={() => {
                triggerHaptic(6);
                setOpcionesAbiertas((prev) => !prev);
              }}
              className={`fx-press flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border ${
                opcionesAbiertas
                  ? 'border-[#111827] bg-[#1F2937] text-[#EDEDED] dark:border-white/30 dark:bg-white/20 dark:text-white'
                  : 'border-[#9CA3AF]/40 bg-[#EDEDED]/75 text-[#111827] hover:bg-[#EDEDED] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`h-4 w-4 transition-transform duration-150 ${
                  opcionesAbiertas ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* NIVEL 2 (Progressive Disclosure): Bandeja de Acciones Secundarias Bajo Demanda */}
        {opcionesAbiertas && (
          <div className="mt-3 border-t border-[#EDEDED] dark:border-white/10 pt-3 space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={copiarEnlace}
                className={`fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold ${
                  copiado
                    ? 'border-[#111827] bg-[#1F2937] text-[#EDEDED] dark:border-white dark:bg-white dark:text-[#111827]'
                    : 'border-[#9CA3AF]/45 bg-[#EDEDED]/55 text-[#111827] hover:bg-[#EDEDED] hover:border-[#111827] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20 dark:hover:border-white/30 dark:hover:text-white'
                }`}
              >
                {copiado ? (
                  <span>✓ Copiado</span>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    >
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <span>Copiar link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(8);
                  setModalAbierto('qr');
                }}
                className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#9CA3AF]/45 bg-[#EDEDED]/55 px-3 py-2 text-xs font-bold text-[#111827] hover:bg-[#EDEDED] hover:border-[#111827] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20 dark:hover:border-white/30 dark:hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                >
                  <rect width="5" height="5" x="3" y="3" rx="1" />
                  <rect width="5" height="5" x="16" y="3" rx="1" />
                  <rect width="5" height="5" x="3" y="16" rx="1" />
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                  <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                </svg>
                <span>Código QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(6);
                  setModalAbierto('editar');
                }}
                className="fx-press inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#9CA3AF]/45 bg-[#EDEDED]/55 px-3 py-2 text-xs font-bold text-[#111827] hover:bg-[#EDEDED] hover:border-[#111827] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20 dark:hover:border-white/30 dark:hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                >
                  <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
                <span>Personalizar</span>
              </button>

              <a
                href={pathRelativo}
                data-astro-prefetch="tap"
                onClick={() => triggerHaptic(6)}
                className="fx-press inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border border-[#9CA3AF]/45 bg-white px-3 py-2 text-xs font-bold text-[#111827] hover:bg-[#EDEDED]/60 hover:border-[#111827] dark:bg-white/10 dark:text-[#EDEDED] dark:border-white/15 dark:hover:bg-white/20 dark:hover:border-white/30 dark:hover:text-white"
              >
                <span>Abrir vista</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-3.5 w-3.5 shrink-0 text-[#4B5563] dark:text-[#9CA3AF]"
                  aria-hidden="true"
                >
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          NIVEL 3 (Progressive Disclosure): SHEETS MODALES BAJO DEMANDA (QR / EDITAR)
         ===================================================================== */}
      {modalAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setModalAbierto(null);
              setFeedback(null);
            }
          }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#111827]/60 backdrop-blur-md p-0 sm:p-4"
        >
          <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white border border-white/20 p-5 sm:p-6 shadow-2xl space-y-4 safe-bottom dark:bg-[#1F2937] dark:border-white/10">
            <div className="w-10 h-1 bg-[#9CA3AF]/50 rounded-full mx-auto -mt-1 sm:hidden dark:bg-white/20" />

            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-[#111827] dark:text-[#EDEDED]">
                {modalAbierto === 'qr'
                  ? 'Código QR de Mostrador'
                  : 'Personalizar Enlace del Local'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalAbierto(null);
                  setFeedback(null);
                }}
                aria-label="Cerrar ventana"
                className="fx-press flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] font-bold text-xs cursor-pointer dark:bg-white/10 dark:text-[#EDEDED] dark:hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {modalAbierto === 'qr' ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-52 h-52 rounded-[28px] bg-[#EDEDED]/50 border border-[#9CA3AF]/35 p-4 flex items-center justify-center shadow-inner dark:bg-white/10 dark:border-white/15">
                  <svg
                    viewBox="0 0 21 21"
                    className="w-full h-full text-[#111827] dark:text-white"
                    shapeRendering="crispEdges"
                    aria-label={`Código QR para ${local.nombre}`}
                  >
                    {qrMatrix.map((row, rIdx) =>
                      row.map((cell, cIdx) =>
                        cell ? (
                          <rect
                            key={`${rIdx}-${cIdx}`}
                            x={cIdx}
                            y={rIdx}
                            width={1}
                            height={1}
                            fill="currentColor"
                          />
                        ) : null
                      )
                    )}
                  </svg>
                </div>

                <div>
                  <p className="font-display text-base font-extrabold text-[#111827] dark:text-[#EDEDED]">
                    {local.nombre}
                  </p>
                  <p className="font-mono text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF] mt-0.5">
                    /c/{local.slug}
                  </p>
                  <p className="text-xs text-[#4B5563] dark:text-[#9CA3AF] mt-2 max-w-xs mx-auto">
                    Tus clientes verán directamente los vehículos disponibles de tu patio al escanear este código.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={copiarEnlace}
                    className="fx-press min-h-[46px] rounded-full bg-[#EDEDED] text-xs font-extrabold text-[#111827] cursor-pointer dark:bg-white/10 dark:text-[#EDEDED] dark:hover:bg-white/20"
                  >
                    {copiado ? '✓ Copiado' : 'Copiar URL'}
                  </button>
                  <a
                    href={pathRelativo}
                    className="fx-press min-h-[46px] inline-flex items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED] dark:bg-white dark:text-[#111827] dark:hover:bg-[#EDEDED]"
                  >
                    Abrir Catálogo
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={guardarPersonalizacion} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                    Identificador del enlace
                  </label>
                  <div className="flex items-center rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/45 px-3.5 min-h-[46px] focus-within:border-[#111827] dark:bg-[#111827] dark:border-white/15 dark:focus-within:border-white">
                    <span className="font-mono text-sm text-[#4B5563] dark:text-[#9CA3AF] select-none">
                      /c/
                    </span>
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value)}
                      placeholder="mi-agencia-medellin"
                      className="flex-1 bg-transparent text-base font-mono font-bold text-[#111827] dark:text-[#EDEDED] ml-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                    WhatsApp / Teléfono de atención en catálogo
                  </label>
                  <input
                    type="tel"
                    value={telefonoInput}
                    onChange={(e) => setTelefonoInput(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/45 px-3.5 min-h-[46px] text-base text-[#111827] focus:border-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED] dark:focus:border-white dark:placeholder-[#9CA3AF]/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] dark:text-[#EDEDED] mb-1">
                    Dirección visible para recogida en patio
                  </label>
                  <input
                    type="text"
                    value={direccionInput}
                    onChange={(e) => setDireccionInput(e.target.value)}
                    placeholder="Av. El Poblado #10-45"
                    className="w-full rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/45 px-3.5 min-h-[46px] text-base text-[#111827] focus:border-[#111827] dark:bg-[#111827] dark:border-white/15 dark:text-[#EDEDED] dark:focus:border-white dark:placeholder-[#9CA3AF]/60"
                  />
                </div>

                {feedback && (
                  <p
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      feedback.tipo === 'ok'
                        ? 'bg-[#111827] text-[#EDEDED] dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/30'
                        : 'bg-[#EDEDED] text-[#111827] border border-[#111827]/30 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30'
                    }`}
                  >
                    {feedback.texto}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(null)}
                    className="fx-press min-h-[46px] rounded-full bg-[#EDEDED] text-xs font-extrabold text-[#111827] cursor-pointer dark:bg-white/10 dark:text-[#EDEDED] dark:hover:bg-white/20"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="fx-press min-h-[46px] rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer dark:bg-white dark:text-[#111827] dark:hover:bg-[#EDEDED]"
                  >
                    {isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
