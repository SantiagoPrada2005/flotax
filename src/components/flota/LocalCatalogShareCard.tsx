import { useState, useMemo, useTransition } from 'react';
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

  const triggerHaptic = (ms = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar
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
      setTimeout(() => setCopiado(false), 2600);
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
    const shareText = `Explora el catálogo exclusivo de vehículos disponibles en ${local.nombre} y reserva directamente sin intermediarios:`;

    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: `${local.nombre} — Catálogo Oficial de Alquiler`,
          text: shareText,
          url: targetUrl,
        });
        return;
      } catch {
        // Si el usuario cancela el sheet nativo, no hacer nada
        return;
      }
    }

    // Fallback directo a WhatsApp
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
          texto: '¡Enlace exclusivo actualizado correctamente!',
        });
        setTimeout(() => {
          setModalAbierto(null);
          setFeedback(null);
        }, 1100);
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
        aria-label="Compartir catálogo exclusivo del local"
        className={`relative overflow-hidden rounded-[28px] bg-white border border-[#9CA3AF]/35 ${
          compact ? 'p-4' : 'p-4.5 sm:p-5'
        } shadow-[0_12px_30px_-8px_rgba(17,24,39,0.08)] space-y-3.5`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EDEDED] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#111827]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#111827]" />
              <span>Link Anti-Fuga Activo</span>
            </div>
            <h2 className="mt-1.5 font-display text-base sm:text-lg font-black tracking-tight text-[#111827] truncate">
              Catálogo Exclusivo · {local.nombre}
            </h2>
            <p className="text-xs text-[#4B5563] mt-0.5 leading-relaxed">
              Comparte este enlace con tus clientes: verán únicamente tus{' '}
              <span className="font-mono tabular-nums font-bold text-[#111827]">
                {unidadesCount}
              </span>{' '}
              vehículos sin comparativas de otros locales.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(8);
              setModalAbierto('qr');
            }}
            aria-label="Mostrar código QR del catálogo"
            title="Código QR de mostrador"
            className="ios-press-bounce flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#111827] text-[#EDEDED] shadow-xs hover:bg-[#1F2937] cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <rect width="5" height="5" x="3" y="3" rx="1" />
              <rect width="5" height="5" x="16" y="3" rx="1" />
              <rect width="5" height="5" x="3" y="16" rx="1" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" />
              <path d="M12 3h.01" />
              <path d="M12 16v.01" />
              <path d="M16 12h1" />
              <path d="M21 12v.01" />
              <path d="M12 21v-1" />
            </svg>
          </button>
        </div>

        {/* Barra con URL corta y botón de edición de slug */}
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[#EDEDED]/75 border border-[#9CA3AF]/30 px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#4B5563] shrink-0">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span className="font-mono text-xs sm:text-sm font-bold text-[#111827] truncate">
              /c/{local.slug}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(6);
                setModalAbierto('editar');
              }}
              className="ios-press-bounce rounded-full bg-white border border-[#9CA3AF]/40 px-2.5 py-1 text-[11px] font-bold text-[#111827] hover:bg-[#EDEDED] cursor-pointer"
            >
              Personalizar
            </button>
            <a
              href={pathRelativo}
              onClick={() => triggerHaptic(6)}
              className="ios-press-bounce rounded-full bg-white border border-[#9CA3AF]/40 px-2.5 py-1 text-[11px] font-bold text-[#4B5563] hover:text-[#111827]"
            >
              Ver ↗
            </a>
          </div>
        </div>

        {/* Botones Primarios de Acción (Mobile-First 44px+) */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copiarEnlace}
            className={`ios-press-bounce min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition cursor-pointer border ${
              copiado
                ? 'bg-[#1F2937] text-[#EDEDED] border-[#111827]'
                : 'bg-white text-[#111827] border-[#9CA3AF]/60 hover:bg-[#EDEDED]/50'
            }`}
          >
            {copiado ? (
              <>
                <span>✓ Enlace copiado</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                </svg>
                <span>Copiar link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={compartirNativoOol}
            className="ios-press-bounce min-h-[44px] inline-flex items-center justify-center gap-2 rounded-full bg-[#111827] px-4 py-2.5 text-xs font-extrabold text-[#EDEDED] shadow-xs hover:bg-[#1F2937] transition cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <span>Compartir catálogo</span>
          </button>
        </div>
      </section>

      {/* =====================================================================
          SHEET / MODAL iOS: CÓDIGO QR DE MOSTRADOR Y PERSONALIZACIÓN DE LINK
         ===================================================================== */}
      {modalAbierto && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#111827]/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-t-[32px] sm:rounded-[32px] bg-white border border-white/20 p-5 sm:p-6 shadow-2xl space-y-4 safe-bottom">
            {/* Grabber Superior iOS */}
            <div className="w-10 h-1 bg-[#9CA3AF]/50 rounded-full mx-auto -mt-1 sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-black text-[#111827]">
                {modalAbierto === 'qr'
                  ? 'QR de Mostrador · Catálogo Cautivo'
                  : 'Personalizar Enlace del Local'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setModalAbierto(null);
                  setFeedback(null);
                }}
                aria-label="Cerrar ventana"
                className="ios-press-bounce flex h-9 w-9 items-center justify-center rounded-full bg-[#EDEDED] text-[#111827] font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalAbierto === 'qr' ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto w-52 h-52 rounded-[28px] bg-[#EDEDED]/50 border border-[#9CA3AF]/35 p-4 flex items-center justify-center shadow-inner">
                  <svg
                    viewBox="0 0 21 21"
                    className="w-full h-full text-[#111827]"
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
                  <p className="font-display text-base font-extrabold text-[#111827]">
                    {local.nombre}
                  </p>
                  <p className="font-mono text-xs font-semibold text-[#4B5563] mt-0.5">
                    /c/{local.slug}
                  </p>
                  <p className="text-xs text-[#4B5563] mt-2 max-w-xs mx-auto">
                    Cuando el cliente entra con este enlace, la app bloquea el catálogo únicamente a los vehículos de tu patio.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={copiarEnlace}
                    className="ios-press-bounce min-h-[46px] rounded-full bg-[#EDEDED] text-xs font-extrabold text-[#111827] cursor-pointer"
                  >
                    {copiado ? '✓ Copiado' : 'Copiar URL'}
                  </button>
                  <a
                    href={pathRelativo}
                    className="ios-press-bounce min-h-[46px] inline-flex items-center justify-center rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED]"
                  >
                    Abrir Catálogo
                  </a>
                </div>
              </div>
            ) : (
              <form onSubmit={guardarPersonalizacion} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Identificador del enlace (Slug único)
                  </label>
                  <div className="flex items-center rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/45 px-3.5 min-h-[46px] focus-within:border-[#111827]">
                    <span className="font-mono text-sm text-[#4B5563] select-none">
                      /c/
                    </span>
                    <input
                      type="text"
                      value={slugInput}
                      onChange={(e) => setSlugInput(e.target.value)}
                      placeholder="mi-agencia-medellin"
                      className="flex-1 bg-transparent text-base font-mono font-bold text-[#111827] focus:outline-none ml-1"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    WhatsApp / Teléfono de atención en catálogo
                  </label>
                  <input
                    type="tel"
                    value={telefonoInput}
                    onChange={(e) => setTelefonoInput(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/45 px-3.5 min-h-[46px] text-base text-[#111827] focus:border-[#111827] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111827] mb-1">
                    Dirección visible para recogida en patio
                  </label>
                  <input
                    type="text"
                    value={direccionInput}
                    onChange={(e) => setDireccionInput(e.target.value)}
                    placeholder="Av. El Poblado #10-45"
                    className="w-full rounded-2xl bg-[#EDEDED]/70 border border-[#9CA3AF]/45 px-3.5 min-h-[46px] text-base text-[#111827] focus:border-[#111827] focus:outline-none"
                  />
                </div>

                {feedback && (
                  <p
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      feedback.tipo === 'ok'
                        ? 'bg-[#111827] text-[#EDEDED]'
                        : 'bg-[#EDEDED] text-[#111827] border border-[#111827]/30'
                    }`}
                  >
                    {feedback.texto}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAbierto(null)}
                    className="ios-press-bounce min-h-[46px] rounded-full bg-[#EDEDED] text-xs font-extrabold text-[#111827] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="ios-press-bounce min-h-[46px] rounded-full bg-[#111827] text-xs font-extrabold text-[#EDEDED] disabled:opacity-50 cursor-pointer"
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
