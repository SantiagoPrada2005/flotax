import { useState, useRef, useEffect, type FC, type ChangeEvent } from 'react';
import { comprimirYNormalizarImagen } from '../../lib/media/image-compression';

export interface VerificacionCameraModalProps {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  tipoGuia: 'DOCUMENTO_FRENTE' | 'DOCUMENTO_DORSO' | 'LICENCIA_FRENTE' | 'LICENCIA_DORSO';
  onFotoAceptada: (base64: string) => void;
  onCerrar: () => void;
}

export const VerificacionCameraModal: FC<VerificacionCameraModalProps> = ({
  abierto,
  titulo,
  subtitulo = 'Alinea los bordes del documento dentro de las esquinas.',
  tipoGuia,
  onFotoAceptada,
  onCerrar,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [iniciandoCamara, setIniciandoCamara] = useState(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [fotoCapturada, setFotoCapturada] = useState<string | null>(null);
  const [procesandoDisparo, setProcesandoDisparo] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Iniciar o reiniciar stream de video
  useEffect(() => {
    if (!abierto) {
      detenerCamara();
      setFotoCapturada(null);
      setErrorCamara(null);
      return;
    }

    let isMounted = true;

    const iniciarStream = async () => {
      setIniciandoCamara(true);
      setErrorCamara(null);
      detenerCamara();

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Tu navegador o dispositivo no soporta captura de cámara en vivo.');
        }

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }
        setIniciandoCamara(false);
      } catch (err) {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara.';
        setErrorCamara(
          msg.includes('Permission') || msg.includes('NotAllowedError')
            ? 'Permiso de cámara no concedido. Puedes habilitarlo en ajustes o seleccionar una imagen desde tus archivos.'
            : msg
        );
        setIniciandoCamara(false);
      }
    };

    iniciarStream();

    return () => {
      isMounted = false;
      detenerCamara();
    };
  }, [abierto, facingMode]);

  const detenerCamara = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Alternar entre cámara trasera y delantera
  const alternarCamara = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Disparo de la cámara con compresión inmediata en Canvas
  const capturarDisparo = async () => {
    if (!videoRef.current || procesandoDisparo) return;

    setProcesandoDisparo(true);
    try {
      const res = await comprimirYNormalizarImagen(videoRef.current, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
      });

      setFotoCapturada(res.base64);
    } catch {
      setErrorCamara('Error al procesar el fotograma de la cámara.');
    } finally {
      setProcesandoDisparo(false);
    }
  };

  // Carga alternativa desde archivo o galería (también comprimida automáticamente)
  const handleSeleccionarArchivo = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcesandoDisparo(true);
    try {
      const res = await comprimirYNormalizarImagen(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.85,
      });
      setFotoCapturada(res.base64);
    } catch {
      setErrorCamara('No se pudo procesar el archivo seleccionado.');
    } finally {
      setProcesandoDisparo(false);
    }
  };

  const handleAceptarFoto = () => {
    if (fotoCapturada) {
      detenerCamara();
      onFotoAceptada(fotoCapturada);
      onCerrar();
    }
  };

  const handleRepetir = () => {
    setFotoCapturada(null);
  };

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none">
      {/* 1. BARRA SUPERIOR (HEADER) */}
      <header className="relative z-30 w-full px-4 pt-4 pb-2 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button
          type="button"
          onClick={() => {
            detenerCamara();
            onCerrar();
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-md"
          aria-label="Cerrar visor"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="text-center">
          <h2 className="text-sm font-bold text-white tracking-wide truncate max-w-[220px]">
            {titulo}
          </h2>
          <p className="text-[11px] text-gray-400 font-mono">
            Proporción ID-1 • ISO 7810
          </p>
        </div>

        <button
          type="button"
          onClick={alternarCamara}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 backdrop-blur-md"
          aria-label="Girar cámara"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </header>

      {/* 2. ÁREA CENTRAL DEL VISOR / STREAM CON GUÍAS DE ENCUADRE */}
      <main className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden">
        {/* Stream de Video en Vivo */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            fotoCapturada ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        />

        {/* Imagen Congelada para Revisión */}
        {fotoCapturada && (
          <img
            src={fotoCapturada}
            alt="Captura congelada"
            className="absolute inset-0 w-full h-full object-cover z-10"
          />
        )}

        {/* Máscara de Viñeta Oscura con Ventana Central ID-1 */}
        <div className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center">
          {/* Sombras perimetrales tipo máscara */}
          <div className="w-full flex-1 bg-black/60 backdrop-blur-[1px]" />
          
          <div className="w-full flex items-center justify-center">
            <div className="flex-1 bg-black/60 h-[215px] sm:h-[240px]" />

            {/* Ventana de Encuadre ID-1 (Proporción 1.58:1 de Tarjeta) */}
            <div className="relative w-[320px] sm:w-[360px] h-[215px] sm:h-[240px] rounded-3xl border-2 border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden">
              {/* Esquinas Lectoras Ligeramente Iluminadas (Apple Scanner Corners) */}
              <div className="absolute top-2 left-2 w-7 h-7 border-t-3 border-l-3 border-white rounded-tl-xl shadow-sm" />
              <div className="absolute top-2 right-2 w-7 h-7 border-t-3 border-r-3 border-white rounded-tr-xl shadow-sm" />
              <div className="absolute bottom-2 left-2 w-7 h-7 border-b-3 border-l-3 border-white rounded-bl-xl shadow-sm" />
              <div className="absolute bottom-2 right-2 w-7 h-7 border-b-3 border-r-3 border-white rounded-br-xl shadow-sm" />

              {/* Retícula / Siluetas Guía según el Lado a Capturar */}
              {!fotoCapturada && (
                <div className="opacity-25 pointer-events-none flex flex-col items-center justify-center p-6 w-full h-full">
                  {(tipoGuia === 'DOCUMENTO_FRENTE' || tipoGuia === 'LICENCIA_FRENTE') ? (
                    <div className="w-full flex items-center gap-4">
                      {/* Silueta de Foto a la izquierda */}
                      <div className="w-16 h-20 rounded-lg border-2 border-dashed border-white flex items-center justify-center">
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                      {/* Líneas de datos a la derecha */}
                      <div className="flex-1 space-y-2">
                        <div className="w-3/4 h-2 rounded bg-white" />
                        <div className="w-full h-2 rounded bg-white" />
                        <div className="w-1/2 h-2 rounded bg-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col justify-between py-2">
                      {/* Banda magnética superior */}
                      <div className="w-full h-5 bg-white/50 rounded-sm" />
                      {/* Líneas de código MRZ inferior */}
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-white rounded" />
                        <div className="w-full h-1.5 bg-white rounded" />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Micro-animación de Escaneo en Vivo */}
              {!fotoCapturada && !errorCamara && !iniciandoCamara && (
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-white/80 to-transparent animate-pulse top-1/2 -translate-y-1/2" />
              )}
            </div>

            <div className="flex-1 bg-black/60 h-[215px] sm:h-[240px]" />
          </div>

          <div className="w-full flex-1 bg-black/60 backdrop-blur-[1px]" />
        </div>

        {/* Indicador Flotante con Consejo de Alineación */}
        <div className="absolute top-20 z-30 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs text-white flex items-center gap-2 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium">{subtitulo}</span>
        </div>

        {/* Pantalla de Carga de Cámara */}
        {iniciandoCamara && (
          <div className="absolute inset-0 z-25 bg-black flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full border-3 border-white border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-gray-300">Inicializando sensor de cámara...</p>
          </div>
        )}

        {/* Manejo de Error o Permiso Denegado con Fallback a Archivo */}
        {errorCamara && (
          <div className="absolute inset-0 z-35 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="text-base font-bold text-white">No se pudo activar la cámara</h3>
              <p className="text-xs text-gray-300">{errorCamara}</p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-2xl bg-white text-black font-bold text-sm shadow-xl active:scale-95 transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Seleccionar desde Galería o Archivos</span>
            </button>
          </div>
        )}
      </main>

      {/* Input Oculto para Fallback / Carga desde Archivos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSeleccionarArchivo}
        className="hidden"
      />

      {/* 3. BARRA INFERIOR DE CONTROLES (FOOTER) */}
      <footer className="relative z-30 w-full px-6 py-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center gap-4">
        {fotoCapturada ? (
          /* Controles de Revisión: Repetir o Aceptar */
          <div className="w-full max-w-sm flex items-center gap-3">
            <button
              type="button"
              onClick={handleRepetir}
              className="flex-1 min-h-[50px] rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-sm transition-all border border-white/20 flex items-center justify-center gap-2 backdrop-blur-md cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Repetir</span>
            </button>

            <button
              type="button"
              onClick={handleAceptarFoto}
              className="flex-1 min-h-[50px] rounded-2xl bg-white hover:bg-gray-100 active:scale-95 text-[#111827] font-bold text-sm transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
              <span>Usar Fotografía</span>
            </button>
          </div>
        ) : (
          /* Disparador Estilo Apple Camera */
          <div className="w-full max-w-sm flex items-center justify-between px-4">
            {/* Botón de Galería en la esquina izquierda */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 flex items-center justify-center text-white transition-all backdrop-blur-md"
              title="Cargar imagen existente"
              aria-label="Cargar desde galería"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Disparador Circular Apple */}
            <button
              type="button"
              onClick={capturarDisparo}
              disabled={procesandoDisparo || iniciandoCamara || !!errorCamara}
              className="relative w-18 h-18 rounded-full border-4 border-white flex items-center justify-center p-1 group active:scale-90 transition-transform cursor-pointer disabled:opacity-40"
              aria-label="Tomar fotografía"
            >
              <div className="w-full h-full rounded-full bg-white group-active:scale-95 transition-transform" />
            </button>

            {/* Espaciador simétrico */}
            <div className="w-12 h-12" />
          </div>
        )}
      </footer>
    </div>
  );
};

export default VerificacionCameraModal;
