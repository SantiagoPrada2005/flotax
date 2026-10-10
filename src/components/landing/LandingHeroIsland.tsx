import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 77;
const FRAME_PATHS = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
  const pad = String(i + 1).padStart(3, '0');
  return `/images/landing/hero-sequence/frame-${pad}.webp`;
});

type FrameSource = ImageBitmap | HTMLImageElement;

export function LandingHeroIsland() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const posterRef = useRef<HTMLImageElement>(null);
  const exitScrimRef = useRef<HTMLDivElement>(null);
  const introContentRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const poster = posterRef.current;
    const exitScrim = exitScrimRef.current;
    const introContent = introContentRef.current;
    const scrollIndicator = scrollIndicatorRef.current;

    const card1 = card1Ref.current;
    const card2 = card2Ref.current;
    const card3 = card3Ref.current;

    if (!track || !stage || !canvas) return;

    const ctx2d = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
    if (!ctx2d) return;

    let isDisposed = false;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Frame Buffer & Concurrency Pool
    const frameBuffer: (FrameSource | null)[] = new Array(TOTAL_FRAMES).fill(null);
    const activeRequests = new Map<number, Promise<FrameSource | null>>();
    let lastRenderedIndex = -1;

    const loadFallbackImage = (index: number, src: string): Promise<FrameSource | null> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
          if (!isDisposed) frameBuffer[index] = img;
          resolve(img);
        };
        img.onerror = () => resolve(null);
      });
    };

    const loadFrameBitmap = async (index: number): Promise<FrameSource | null> => {
      if (index < 0 || index >= TOTAL_FRAMES || isDisposed) return null;
      if (frameBuffer[index]) return frameBuffer[index];
      if (activeRequests.has(index)) return activeRequests.get(index)!;

      const src = FRAME_PATHS[index];
      if (!src) return null;

      const fetchPromise = (async (): Promise<FrameSource | null> => {
        try {
          if ('createImageBitmap' in window) {
            const res = await fetch(src);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            if (isDisposed) return null;
            const bitmap = await createImageBitmap(blob, {
              premultiplyAlpha: 'default',
              colorSpaceConversion: 'default',
            });
            if (!isDisposed) frameBuffer[index] = bitmap;
            return bitmap;
          } else {
            return await loadFallbackImage(index, src);
          }
        } catch {
          return await loadFallbackImage(index, src);
        } finally {
          activeRequests.delete(index);
        }
      })();

      activeRequests.set(index, fetchPromise);
      return fetchPromise;
    };

    const getNearestLoadedFrame = (targetIndex: number): FrameSource | null => {
      if (frameBuffer[targetIndex]) return frameBuffer[targetIndex];
      for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
        const prev = targetIndex - offset;
        const next = targetIndex + offset;
        if (prev >= 0 && frameBuffer[prev]) return frameBuffer[prev];
        if (next < TOTAL_FRAMES && frameBuffer[next]) return frameBuffer[next];
      }
      return null;
    };

    const MAX_CONCURRENT_DOWNLOADS = 4;
    let preloadingQueue: number[] = [];
    let activeDownloads = 0;

    const pumpQueue = () => {
      if (isDisposed) return;
      while (activeDownloads < MAX_CONCURRENT_DOWNLOADS && preloadingQueue.length > 0) {
        const nextIdx = preloadingQueue.shift();
        if (nextIdx === undefined) break;
        if (frameBuffer[nextIdx] || activeRequests.has(nextIdx)) continue;

        activeDownloads++;
        loadFrameBitmap(nextIdx).finally(() => {
          activeDownloads--;
          pumpQueue();
        });
      }
    };

    const prioritizeAroundIndex = (targetIndex: number) => {
      const nearby: number[] = [];
      const windowRange = 8;
      for (let i = 1; i <= windowRange; i++) {
        const forward = targetIndex + i;
        const backward = targetIndex - i;
        if (forward < TOTAL_FRAMES && !frameBuffer[forward]) nearby.push(forward);
        if (backward >= 0 && !frameBuffer[backward]) nearby.push(backward);
      }

      if (nearby.length > 0) {
        preloadingQueue = [...nearby, ...preloadingQueue.filter((idx) => !nearby.includes(idx))];
        pumpQueue();
      }
    };

    const startBackgroundPreload = () => {
      const remainingFrames = Array.from({ length: TOTAL_FRAMES - 1 }, (_, i) => i + 1);
      preloadingQueue.push(...remainingFrames);
      pumpQueue();
    };

    const drawFrameOnCanvas = (frame: FrameSource, index: number) => {
      if (isDisposed) return;
      const cw = canvas.width;
      const ch = canvas.height;
      const iw = 'naturalWidth' in frame ? frame.naturalWidth : frame.width;
      const ih = 'naturalHeight' in frame ? frame.naturalHeight : frame.height;

      if (!iw || !ih) return;

      const scale = Math.max(cw / iw, ch / ih);
      const nw = iw * scale;
      const nh = ih * scale;
      const nx = (cw - nw) / 2;
      const ny = (ch - nh) / 2;

      ctx2d.clearRect(0, 0, cw, ch);
      ctx2d.drawImage(frame, nx, ny, nw, nh);
      lastRenderedIndex = index;

      if (poster && poster.style.opacity !== '0') {
        poster.style.opacity = '0';
      }
    };

    const playhead = { frame: 0 };

    const renderFrame = (index: number) => {
      if (isDisposed) return;
      const exactFrame = frameBuffer[index];
      if (exactFrame) {
        drawFrameOnCanvas(exactFrame, index);
      } else {
        const nearest = getNearestLoadedFrame(index);
        if (nearest) {
          drawFrameOnCanvas(nearest, index);
        }
        loadFrameBitmap(index).then((loaded) => {
          if (loaded && !isDisposed && Math.abs(playhead.frame - index) < 1.5) {
            drawFrameOnCanvas(loaded, index);
          }
        });
        prioritizeAroundIndex(index);
      }
    };

    const resizeCanvas = () => {
      if (isDisposed || !stage || !canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const width = stage.clientWidth;
      const height = stage.clientHeight;

      const physicalWidth = Math.round(width * dpr);
      const physicalHeight = Math.round(height * dpr);

      if (canvas.width !== physicalWidth || canvas.height !== physicalHeight) {
        canvas.width = physicalWidth;
        canvas.height = physicalHeight;
      }

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx2d.imageSmoothingEnabled = true;
      ctx2d.imageSmoothingQuality = 'high';

      if (lastRenderedIndex >= 0) {
        renderFrame(lastRenderedIndex);
      }
    };

    // Scoped GSAP Timeline with Context
    const gsapContext = gsap.context(() => {
      if (prefersReducedMotion) {
        loadFrameBitmap(0).then((frame0) => {
          if (frame0 && !isDisposed) drawFrameOnCanvas(frame0, 0);
        });
        if (card1) { card1.style.opacity = '1'; card1.style.pointerEvents = 'auto'; }
        if (card2) { card2.style.opacity = '1'; card2.style.pointerEvents = 'auto'; }
        if (card3) { card3.style.opacity = '1'; card3.style.pointerEvents = 'auto'; }
      } else {
        const heroTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: track,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        });

        heroTimeline.to(playhead, {
          frame: TOTAL_FRAMES - 1,
          ease: 'none',
          duration: 1,
          onUpdate: () => {
            const targetIndex = Math.min(
              TOTAL_FRAMES - 1,
              Math.max(0, Math.round(playhead.frame))
            );
            renderFrame(targetIndex);
          },
        }, 0);

        if (introContent) {
          heroTimeline.to(introContent, {
            opacity: 0,
            y: -50,
            ease: 'power1.out',
            duration: 0.18,
            onUpdate: function () {
              const p = this.progress();
              introContent.style.pointerEvents = p > 0.8 ? 'none' : 'auto';
            },
          }, 0);
        }

        if (scrollIndicator) {
          heroTimeline.to(scrollIndicator, {
            opacity: 0,
            ease: 'power1.out',
            duration: 0.12,
          }, 0);
        }

        if (card1) {
          heroTimeline.fromTo(card1,
            { opacity: 0, y: 16, pointerEvents: 'none' },
            { opacity: 1, y: 0, ease: 'power2.out', duration: 0.07, pointerEvents: 'auto' },
            0.15
          );
          heroTimeline.to(card1,
            { opacity: 0, y: -16, ease: 'power2.in', duration: 0.07, pointerEvents: 'none' },
            0.35
          );
        }

        if (card2) {
          heroTimeline.fromTo(card2,
            { opacity: 0, y: 16, pointerEvents: 'none' },
            { opacity: 1, y: 0, ease: 'power2.out', duration: 0.07, pointerEvents: 'auto' },
            0.39
          );
          heroTimeline.to(card2,
            { opacity: 0, y: -16, ease: 'power2.in', duration: 0.07, pointerEvents: 'none' },
            0.59
          );
        }

        if (card3) {
          heroTimeline.fromTo(card3,
            { opacity: 0, y: 16, pointerEvents: 'none' },
            { opacity: 1, y: 0, ease: 'power2.out', duration: 0.07, pointerEvents: 'auto' },
            0.63
          );
          heroTimeline.to(card3,
            { opacity: 0, y: -16, ease: 'power2.in', duration: 0.07, pointerEvents: 'none' },
            0.82
          );
        }

        if (exitScrim) {
          heroTimeline.fromTo(exitScrim,
            { opacity: 0 },
            { opacity: 1, ease: 'power1.in', duration: 0.14 },
            0.86
          );
        }
      }
    }, track);

    const onResize = () => {
      resizeCanvas();
      ScrollTrigger.refresh();
    };

    window.addEventListener('resize', onResize, { passive: true });

    resizeCanvas();
    loadFrameBitmap(0).then((frame0) => {
      if (frame0 && !isDisposed) {
        drawFrameOnCanvas(frame0, 0);
      }
      startBackgroundPreload();
    });

    return () => {
      isDisposed = true;
      window.removeEventListener('resize', onResize);
      gsapContext.revert();
      preloadingQueue = [];
      activeRequests.clear();
    };
  }, []);

  return (
    <div
      ref={trackRef}
      id="hero-scroll-track"
      className="relative w-full h-[320vh] sm:h-[350vh] -mt-14 md:-mt-20"
    >
      {/* Sticky Viewport Stage (100dvh pinned) */}
      <div
        ref={stageRef}
        id="hero-sticky-stage"
        className="sticky top-0 w-full h-[100dvh] overflow-hidden bg-[#0C1120] flex flex-col justify-between select-none"
      >
        {/* Fallback / Initial Poster Frame Image */}
        <img
          ref={posterRef}
          id="hero-poster"
          src="/images/landing/hero-sequence/frame-001.webp"
          alt="FlotaX Automoción Cinematográfica"
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none transition-opacity duration-500"
          loading="eager"
        />

        {/* Main Rendering Canvas */}
        <canvas
          ref={canvasRef}
          id="hero-sequence-canvas"
          className="absolute inset-0 w-full h-full object-cover z-0"
        />

        {/* Top & Bottom Contrast Scrims */}
        <div className="absolute top-0 inset-x-0 h-44 bg-gradient-to-b from-black/75 via-black/35 to-transparent pointer-events-none z-10" />
        <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black/90 via-black/45 to-transparent pointer-events-none z-10" />

        {/* Final Cinematic Fade-to-White Exit Overlay */}
        <div
          ref={exitScrimRef}
          id="hero-exit-scrim"
          className="absolute inset-0 bg-white pointer-events-none z-40 opacity-0 transition-opacity duration-300"
        />

        {/* Layer 1: Initial Narrative Header & Main CTA */}
        <div
          ref={introContentRef}
          id="hero-intro-content"
          className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 md:pt-32 flex flex-col items-start transition-all duration-300"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-[Manrope,system-ui,sans-serif] leading-[1.08] tracking-tight max-w-3xl drop-shadow-[0_2px_14px_rgba(255,255,255,0.45)]">
            <span className="text-[#0C1120]">Tu próximo vehículo,</span>
            <br />
            <span className="shiny-text">
              controlado al milímetro.
            </span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-black/80 font-[Inter,system-ui,sans-serif] max-w-xl mt-4 mb-7 leading-relaxed drop-shadow-sm">
            Alquila carros y motos con total transparencia. Desplaza hacia abajo para recorrer la experiencia.
          </p>

          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <a
              href="/catalogo"
              className="shiny-cta h-12 sm:h-14 text-sm sm:text-base group"
            >
              <span>
                Explorar Unidades
                <span className="w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center text-xs group-hover:translate-x-1 transition-transform ml-1">
                  →
                </span>
              </span>
            </a>
          </div>
        </div>

        {/* Scroll Hint at Bottom Center */}
        <div
          ref={scrollIndicatorRef}
          id="hero-scroll-indicator"
          className="relative z-20 w-full flex flex-col items-center justify-center pb-8 pointer-events-none transition-opacity duration-300"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white/80 text-xs font-mono uppercase tracking-widest shadow-lg">
            <span className="animate-bounce">↓</span>
            <span>Desplaza para interactuar</span>
          </div>
        </div>

        {/* HUD Card 1 */}
        <div
          ref={card1Ref}
          id="hud-card-1"
          className="hud-floating-card shiny-card absolute z-30 top-20 sm:top-28 right-3 sm:right-8 lg:right-16 max-w-[calc(100vw-1.5rem)] px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-full text-white opacity-0 pointer-events-none will-change-[transform,opacity]"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold font-[Manrope,system-ui,sans-serif] leading-tight">
                Disponible 24/7
              </span>
              <span className="text-[11px] text-[#A7C9FF]/90 leading-tight">
                Entrega pericial en &lt; 3 min
              </span>
            </div>
          </div>
        </div>

        {/* HUD Card 2 */}
        <div
          ref={card2Ref}
          id="hud-card-2"
          className="hud-floating-card shiny-card absolute z-30 bottom-24 sm:bottom-28 lg:bottom-32 left-3 sm:left-8 lg:left-16 max-w-[calc(100vw-1.5rem)] px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-full text-white opacity-0 pointer-events-none will-change-[transform,opacity]"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#2E4E8F]/50 flex items-center justify-center text-[#A7C9FF] shrink-0 border border-white/10">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold font-[Manrope,system-ui,sans-serif] leading-tight">
                Alquila tu vehículo
              </span>
              <span className="text-[11px] text-[#A7C9FF]/90 leading-tight">
                Reserva 100% digital sin papeleo
              </span>
            </div>
          </div>
        </div>

        {/* HUD Card 3 */}
        <div
          ref={card3Ref}
          id="hud-card-3"
          className="hud-floating-card shiny-card absolute z-30 top-20 sm:top-28 left-3 sm:left-8 lg:left-16 max-w-[calc(100vw-1.5rem)] px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl sm:rounded-full text-white opacity-0 pointer-events-none will-change-[transform,opacity]"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-400/20">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs sm:text-sm font-bold font-[Manrope,system-ui,sans-serif] leading-tight">
                Automóviles disponibles
              </span>
              <span className="text-[11px] text-[#A7C9FF]/90 leading-tight">
                Peritaje 360° · Garantía transparente
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
