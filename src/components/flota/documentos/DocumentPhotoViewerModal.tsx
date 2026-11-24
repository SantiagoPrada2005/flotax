import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { CaraLicenciaTransito } from '@/lib/documentos-vehiculo';

export interface DocumentPhotoViewerModalProps {
  isOpen: boolean;
  caraInicial: CaraLicenciaTransito;
  tieneFrente: boolean;
  tieneReverso: boolean;
  urlFrente: string;
  urlReverso: string;
  placa: string;
  onClose: () => void;
}

interface Punto2D {
  x: number;
  y: number;
}

const MIN_ESCALA = 1;
const MAX_ESCALA = 4;

function limitarEscala(valor: number): number {
  return Math.min(MAX_ESCALA, Math.max(MIN_ESCALA, Number(valor.toFixed(2))));
}

function distanciaEntrePuntos(a: Punto2D, b: Punto2D): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function DocumentPhotoViewerModal({
  isOpen,
  caraInicial,
  tieneFrente,
  tieneReverso,
  urlFrente,
  urlReverso,
  placa,
  onClose,
}: DocumentPhotoViewerModalProps) {
  const [caraActiva, setCaraActiva] = useState<CaraLicenciaTransito>(caraInicial);
  const [escala, setEscala] = useState<number>(1);
  const [offset, setOffset] = useState<Punto2D>({ x: 0, y: 0 });
  const [cargandoImagen, setCargandoImagen] = useState<boolean>(false);

  const pointersRef = useRef<Map<number, Punto2D>>(new Map());
  const pinchInicialRef = useRef<{ distancia: number; escala: number } | null>(null);
  const arrastreRef = useRef<{ inicioX: number; inicioY: number; offsetX: number; offsetY: number } | null>(null);
  const ultimoTapRef = useRef<number>(0);

  const resetearZoom = () => {
    setEscala(1);
    setOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    if (!isOpen) return;
    setCaraActiva(caraInicial);
    resetearZoom();
    pointersRef.current.clear();
    pinchInicialRef.current = null;
    arrastreRef.current = null;
  }, [isOpen, caraInicial]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const manejarTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && tieneFrente && caraActiva !== 'frente') {
        setCaraActiva('frente');
        resetearZoom();
      } else if (e.key === 'ArrowRight' && tieneReverso && caraActiva !== 'reverso') {
        setCaraActiva('reverso');
        resetearZoom();
      } else if (e.key === '+' || e.key === '=') {
        setEscala((prev) => limitarEscala(prev + 0.4));
      } else if (e.key === '-') {
        setEscala((prev) => {
          const siguiente = limitarEscala(prev - 0.4);
          if (siguiente === 1) setOffset({ x: 0, y: 0 });
          return siguiente;
        });
      }
    };

    window.addEventListener('keydown', manejarTeclado);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', manejarTeclado);
    };
  }, [isOpen, onClose, caraActiva, tieneFrente, tieneReverso]);

  if (!isOpen) return null;

  const urlActiva = caraActiva === 'frente' ? urlFrente : urlReverso;
  const tituloCara = caraActiva === 'frente' ? 'Parte delantera' : 'Parte trasera';

  const cambiarCara = (nuevaCara: CaraLicenciaTransito) => {
    if (nuevaCara === caraActiva) return;
    if (nuevaCara === 'frente' && !tieneFrente) return;
    if (nuevaCara === 'reverso' && !tieneReverso) return;
    setCargandoImagen(true);
    setCaraActiva(nuevaCara);
    resetearZoom();
  };

  const ajustarZoom = (delta: number) => {
    setEscala((prev) => {
      const siguiente = limitarEscala(prev + delta);
      if (siguiente <= 1) {
        setOffset({ x: 0, y: 0 });
      }
      return siguiente;
    });
  };

  const manejarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      if (pts[0] && pts[1]) {
        pinchInicialRef.current = {
          distancia: Math.max(10, distanciaEntrePuntos(pts[0], pts[1])),
          escala,
        };
        arrastreRef.current = null;
      }
      return;
    }

    if (pointersRef.current.size === 1) {
      const ahora = Date.now();
      if (ahora - ultimoTapRef.current < 280) {
        if (escala > 1.15) {
          resetearZoom();
        } else {
          setEscala(2.2);
        }
        ultimoTapRef.current = 0;
        return;
      }
      ultimoTapRef.current = ahora;

      arrastreRef.current = {
        inicioX: e.clientX,
        inicioY: e.clientY,
        offsetX: offset.x,
        offsetY: offset.y,
      };
    }
  };

  const manejarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 2 && pinchInicialRef.current) {
      const pts = Array.from(pointersRef.current.values());
      if (pts[0] && pts[1]) {
        const distActual = distanciaEntrePuntos(pts[0], pts[1]);
        const factor = distActual / pinchInicialRef.current.distancia;
        const nuevaEscala = limitarEscala(pinchInicialRef.current.escala * factor);
        setEscala(nuevaEscala);
        if (nuevaEscala <= 1) {
          setOffset({ x: 0, y: 0 });
        }
      }
      return;
    }

    if (pointersRef.current.size === 1 && arrastreRef.current && escala > 1) {
      const dx = e.clientX - arrastreRef.current.inicioX;
      const dy = e.clientY - arrastreRef.current.inicioY;
      const maxDesplazamiento = (escala - 1) * 260;
      const nx = Math.max(-maxDesplazamiento, Math.min(maxDesplazamiento, arrastreRef.current.offsetX + dx));
      const ny = Math.max(-maxDesplazamiento, Math.min(maxDesplazamiento, arrastreRef.current.offsetY + dy));
      setOffset({ x: nx, y: ny });
    }
  };

  const manejarPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchInicialRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      arrastreRef.current = null;
    }
  };

  const manejarRueda = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    ajustarZoom(delta);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de Licencia de tránsito — ${placa}`}
      className="fixed inset-0 z-50 flex flex-col bg-[#111827]/96 text-[#EDEDED] backdrop-blur-md"
    >
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 safe-top">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            Licencia de tránsito · {placa}
          </p>
          <h2 className="font-display text-base sm:text-lg font-bold text-white truncate">
            {tituloCara}
          </h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar visor"
          className="fx-press inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 px-3.5 text-xs font-bold text-white cursor-pointer"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span>Cerrar</span>
        </button>
      </header>

      {/* Lienzo principal con pinch-to-zoom y arrastre */}
      <div
        onPointerDown={manejarPointerDown}
        onPointerMove={manejarPointerMove}
        onPointerUp={manejarPointerUp}
        onPointerCancel={manejarPointerUp}
        onWheel={manejarRueda}
        style={{ touchAction: 'none' }}
        className="relative flex-1 overflow-hidden flex items-center justify-center p-3 sm:p-6 select-none cursor-grab active:cursor-grabbing"
      >
        <img
          src={urlActiva}
          alt={`Licencia de tránsito ${tituloCara} del vehículo ${placa}`}
          onLoad={() => setCargandoImagen(false)}
          onError={() => setCargandoImagen(false)}
          draggable={false}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${escala})`,
            transition: pointersRef.current.size > 0 ? 'none' : 'transform 140ms cubic-bezier(0.2, 0.8, 0.3, 1)',
          }}
          className="max-h-full max-w-full rounded-xl object-contain shadow-2xl pointer-events-none"
        />

        {cargandoImagen && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#111827]/40 pointer-events-none">
            <span className="rounded-full bg-[#1F2937] px-4 py-2 text-xs font-bold text-[#EDEDED] border border-white/15">
              Cargando imagen...
            </span>
          </div>
        )}
      </div>

      {/* Barra inferior: Cambio de cara sin cerrar + Controles de zoom */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#111827]/90 px-4 py-3 safe-bottom">
        {/* Selector Delantera / Trasera */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!tieneFrente}
            onClick={() => cambiarCara('frente')}
            className={`fx-press inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-bold border transition-colors ${
              caraActiva === 'frente'
                ? 'bg-[#EDEDED] text-[#111827] border-[#EDEDED]'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            } disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer`}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span>Delantera</span>
          </button>

          <button
            type="button"
            disabled={!tieneReverso}
            onClick={() => cambiarCara('reverso')}
            className={`fx-press inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 text-xs font-bold border transition-colors ${
              caraActiva === 'reverso'
                ? 'bg-[#EDEDED] text-[#111827] border-[#EDEDED]'
                : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
            } disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer`}
          >
            <span>Trasera</span>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Controles de zoom */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => ajustarZoom(-0.4)}
            disabled={escala <= MIN_ESCALA}
            aria-label="Alejar zoom"
            className="fx-press flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={resetearZoom}
            aria-label="Restablecer zoom"
            className="fx-press inline-flex min-h-[44px] items-center gap-1 rounded-full bg-white/10 border border-white/15 px-3 text-xs font-mono font-bold text-white hover:bg-white/20 cursor-pointer tabular-nums"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{Math.round(escala * 100)}%</span>
          </button>

          <button
            type="button"
            onClick={() => ajustarZoom(0.4)}
            disabled={escala >= MAX_ESCALA}
            aria-label="Acercar zoom"
            className="fx-press flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-white/15 text-white hover:bg-white/20 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </footer>
    </div>
  );
}
