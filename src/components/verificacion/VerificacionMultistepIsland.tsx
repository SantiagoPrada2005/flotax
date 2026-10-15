import { useState, useTransition, useRef, type ChangeEvent, type FC } from 'react';
import { actions } from 'astro:actions';
import { navigate } from 'astro:transitions/client';
import {
  FlotaXEmblemSvg,
  DocFrontSvg,
  DocBackSvg,
  LicenseGraphicSvg,
  LanyardBadgeHero,
  CameraIconSvg,
  CheckCircleSvg,
  ShieldLockSvg,
  RefreshIconSvg,
} from './VerificacionAssets';
import { VerificacionCameraModal } from './VerificacionCameraModal';
import { comprimirYNormalizarImagen } from '../../lib/media/image-compression';

export interface VerificacionPrevia {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  documentoFrenteKey?: string | null;
  documentoDorsoKey?: string | null;
  licenciaNumero?: string | null;
  licenciaCategoria?: string | null;
  licenciaVencimiento?: string | null;
  licenciaFrenteKey?: string | null;
  licenciaDorsoKey?: string | null;
  estado: string;
}

export interface VerificacionMultistepProps {
  usuarioNombre: string;
  usuarioCorreo: string;
  usuarioImagen?: string | null | undefined;
  verificacionPrevia?: VerificacionPrevia | null;
}

type PasoVerificacion = 1 | 2 | 3 | 4;

export const VerificacionMultistepIsland: FC<VerificacionMultistepProps> = ({
  usuarioNombre,
  usuarioCorreo,
  usuarioImagen,
  verificacionPrevia,
}) => {
  const [paso, setPaso] = useState<PasoVerificacion>(1);

  // Paso 1: Tipo y Número de Documento
  const [tipoDocumento, setTipoDocumento] = useState<'CC' | 'CE' | 'PASAPORTE' | 'NIT'>(
    (verificacionPrevia?.tipoDocumento as 'CC' | 'CE' | 'PASAPORTE' | 'NIT') || 'CC'
  );
  const [numeroDocumento, setNumeroDocumento] = useState(
    verificacionPrevia?.numeroDocumento || ''
  );

  // Paso 2: Fotos del Documento
  const [documentoFrenteKey, setDocumentoFrenteKey] = useState<string>(
    verificacionPrevia?.documentoFrenteKey || ''
  );
  const [documentoDorsoKey, setDocumentoDorsoKey] = useState<string>(
    verificacionPrevia?.documentoDorsoKey || ''
  );
  const [ladoDocumentoActivo, setLadoDocumentoActivo] = useState<'FRENTE' | 'DORSO'>('FRENTE');
  const [previewDocFrente, setPreviewDocFrente] = useState<string | null>(
    verificacionPrevia?.documentoFrenteKey ? `/api/multimedia/${verificacionPrevia.documentoFrenteKey}` : null
  );
  const [previewDocDorso, setPreviewDocDorso] = useState<string | null>(
    verificacionPrevia?.documentoDorsoKey ? `/api/multimedia/${verificacionPrevia.documentoDorsoKey}` : null
  );

  // Paso 3: Licencia de Conducir
  const [licenciaNumero, setLicenciaNumero] = useState(
    verificacionPrevia?.licenciaNumero || ''
  );
  const [licenciaCategoria, setLicenciaCategoria] = useState(
    verificacionPrevia?.licenciaCategoria || 'B1'
  );
  const [licenciaVencimiento, setLicenciaVencimiento] = useState(
    verificacionPrevia?.licenciaVencimiento || ''
  );
  const [licenciaFrenteKey, setLicenciaFrenteKey] = useState<string>(
    verificacionPrevia?.licenciaFrenteKey || ''
  );
  const [licenciaDorsoKey, setLicenciaDorsoKey] = useState<string>(
    verificacionPrevia?.licenciaDorsoKey || ''
  );
  const [ladoLicenciaActivo, setLadoLicenciaActivo] = useState<'FRENTE' | 'DORSO'>('FRENTE');
  const [previewLicFrente, setPreviewLicFrente] = useState<string | null>(
    verificacionPrevia?.licenciaFrenteKey ? `/api/multimedia/${verificacionPrevia.licenciaFrenteKey}` : null
  );
  const [previewLicDorso, setPreviewLicDorso] = useState<string | null>(
    verificacionPrevia?.licenciaDorsoKey ? `/api/multimedia/${verificacionPrevia.licenciaDorsoKey}` : null
  );

  // Estados de carga y retroalimentación
  const [subiendoR2, setSubiendoR2] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completadoExitoso, setCompletadoExitoso] = useState(false);

  // Estado del modal de cámara en vivo con guías visuales
  const [modalCamaraAbierto, setModalCamaraAbierto] = useState(false);
  const [modalCamaraConfig, setModalCamaraConfig] = useState<{
    titulo: string;
    subtitulo: string;
    tipoGuia: 'DOCUMENTO_FRENTE' | 'DOCUMENTO_DORSO' | 'LICENCIA_FRENTE' | 'LICENCIA_DORSO';
  }>({
    titulo: 'Cédula de Identidad',
    subtitulo: 'Alinea los bordes del documento dentro de las esquinas.',
    tipoGuia: 'DOCUMENTO_FRENTE',
  });

  // Referencias a inputs de archivos para fallback
  const inputDocRef = useRef<HTMLInputElement>(null);
  const inputLicRef = useRef<HTMLInputElement>(null);

  // Apertura de cámara en vivo con guías contextuales
  const abrirCamaraDocumento = (lado: 'FRENTE' | 'DORSO') => {
    setLadoDocumentoActivo(lado);
    setModalCamaraConfig({
      titulo: `${tipoDocumento} — ${lado === 'FRENTE' ? 'Frente (Anverso)' : 'Dorso (Reverso)'}`,
      subtitulo: lado === 'FRENTE'
        ? 'Alinea el anverso con la foto y datos personales visibles.'
        : 'Alinea el reverso con la banda magnética o código de barras.',
      tipoGuia: lado === 'FRENTE' ? 'DOCUMENTO_FRENTE' : 'DOCUMENTO_DORSO',
    });
    setModalCamaraAbierto(true);
  };

  const abrirCamaraLicencia = (lado: 'FRENTE' | 'DORSO') => {
    setLadoLicenciaActivo(lado);
    setModalCamaraConfig({
      titulo: `Licencia Cat. ${licenciaCategoria} — ${lado === 'FRENTE' ? 'Frente' : 'Dorso'}`,
      subtitulo: lado === 'FRENTE'
        ? 'Alinea la cara frontal con la categoría y vigencia.'
        : 'Alinea el reverso de la licencia.',
      tipoGuia: lado === 'FRENTE' ? 'LICENCIA_FRENTE' : 'LICENCIA_DORSO',
    });
    setModalCamaraAbierto(true);
  };

  // Subida a Cloudflare R2 con Base64 previamente normalizado y comprimido
  const subirFotoBase64Directa = async (
    base64Data: string,
    tipo: 'DOCUMENTO_FRENTE' | 'DOCUMENTO_DORSO' | 'LICENCIA_FRENTE' | 'LICENCIA_DORSO'
  ) => {
    setErrorMsg(null);
    setSubiendoR2(true);

    try {
      const result = await actions.verificacion.subirFoto({
        documentoTipo: tipo,
        imagenBase64: base64Data,
        mimeType: 'image/jpeg',
      });

      if (result.error) {
        setErrorMsg(result.error.message || 'No fue posible subir la imagen a R2.');
        setSubiendoR2(false);
        return;
      }

      const key = result.data.key;
      const url = result.data.url;

      if (tipo === 'DOCUMENTO_FRENTE') {
        setDocumentoFrenteKey(key);
        setPreviewDocFrente(url);
        setLadoDocumentoActivo('DORSO');
      } else if (tipo === 'DOCUMENTO_DORSO') {
        setDocumentoDorsoKey(key);
        setPreviewDocDorso(url);
      } else if (tipo === 'LICENCIA_FRENTE') {
        setLicenciaFrenteKey(key);
        setPreviewLicFrente(url);
        setLadoLicenciaActivo('DORSO');
      } else if (tipo === 'LICENCIA_DORSO') {
        setLicenciaDorsoKey(key);
        setPreviewLicDorso(url);
      }

      setSubiendoR2(false);
    } catch {
      setErrorMsg('Error durante el envío de la evidencia a Cloudflare R2.');
      setSubiendoR2(false);
    }
  };

  // Manejadores para carga alternativa de archivo (también comprimidos automáticamente)
  const handleInputDocChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipo = ladoDocumentoActivo === 'FRENTE' ? 'DOCUMENTO_FRENTE' : 'DOCUMENTO_DORSO';
    try {
      setSubiendoR2(true);
      const res = await comprimirYNormalizarImagen(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
      await subirFotoBase64Directa(res.base64, tipo);
    } catch {
      setErrorMsg('Error al procesar la imagen seleccionada.');
      setSubiendoR2(false);
    }
  };

  const handleInputLicChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipo = ladoLicenciaActivo === 'FRENTE' ? 'LICENCIA_FRENTE' : 'LICENCIA_DORSO';
    try {
      setSubiendoR2(true);
      const res = await comprimirYNormalizarImagen(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
      await subirFotoBase64Directa(res.base64, tipo);
    } catch {
      setErrorMsg('Error al procesar la imagen seleccionada.');
      setSubiendoR2(false);
    }
  };

  // Validaciones antes de avanzar
  const avanzarPaso1 = () => {
    setErrorMsg(null);
    if (numeroDocumento.trim().length < 4) {
      setErrorMsg('Ingresa un número de documento válido.');
      return;
    }
    setPaso(2);
  };

  const puedeAvanzarPaso2 = Boolean(documentoFrenteKey && documentoDorsoKey);

  const avanzarPaso2 = () => {
    setErrorMsg(null);
    if (!documentoFrenteKey || !documentoDorsoKey) {
      setErrorMsg('Debes capturar ambas fotografías del documento (frente y dorso) para continuar.');
      return;
    }
    setPaso(3);
  };

  const puedeAvanzarPaso3 = Boolean(
    licenciaNumero.trim().length >= 4 &&
    licenciaVencimiento.trim() &&
    licenciaFrenteKey &&
    licenciaDorsoKey
  );

  const avanzarPaso3 = () => {
    setErrorMsg(null);
    if (licenciaNumero.trim().length < 4) {
      setErrorMsg('Ingresa el número de tu licencia de conducir.');
      return;
    }
    if (!licenciaVencimiento.trim()) {
      setErrorMsg('Selecciona la fecha de vencimiento de tu licencia.');
      return;
    }
    if (!licenciaFrenteKey || !licenciaDorsoKey) {
      setErrorMsg('Debes capturar ambas fotografías de tu licencia (frente y dorso) para continuar.');
      return;
    }
    setPaso(4);
  };

  // Finalizar Verificación y consolidar en D1
  const handleFinalizarVerificacion = () => {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const result = await actions.verificacion.finalizar({
          tipoDocumento,
          numeroDocumento: numeroDocumento.trim(),
          documentoFrenteKey,
          documentoDorsoKey: documentoDorsoKey || null,
          licenciaNumero: licenciaNumero.trim(),
          licenciaCategoria,
          licenciaVencimiento: licenciaVencimiento.trim(),
          licenciaFrenteKey,
          licenciaDorsoKey: licenciaDorsoKey || null,
        });

        if (result.error) {
          setErrorMsg(result.error.message || 'No fue posible registrar la verificación.');
          return;
        }

        setCompletadoExitoso(true);
      } catch {
        setErrorMsg('Error al conectar con los servidores de validación.');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B0F17] text-white flex flex-col justify-between overflow-y-auto min-h-[100dvh]">
      {/* Sutil textura ambiental de fondo inspirada en acanalado arquitectónico (Imagen 2) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(90deg,#fff,#fff_2px,transparent_2px,transparent_24px)]" />
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />

      {/* HEADER SUPERIOR FINTECH */}
      <header className="relative z-10 w-full max-w-xl mx-auto px-4 pt-4 pb-2">
        {/* Barra de progreso de 4 segmentos en blanco limpio */}
        <div className="flex items-center gap-1.5 mb-3">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                stepNumber < paso
                  ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                  : stepNumber === paso
                  ? 'bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]'
                  : 'bg-white/15'
              }`}
            />
          ))}
        </div>

        {/* Barra de navegación superior con retroceso y distintivo de seguridad */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (paso > 1) {
                setPaso((prev) => (prev - 1) as PasoVerificacion);
              } else {
                navigate('/perfil');
              }
            }}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/10 shadow-sm"
            aria-label="Volver"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 shadow-inner">
            <FlotaXEmblemSvg className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-mono font-semibold tracking-wider text-white">
              Paso {paso} de 4
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10">
            <ShieldLockSvg className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-mono font-bold tracking-tight text-emerald-400">
              R2 CIFRADO
            </span>
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL POR PASOS */}
      <main className="relative z-10 flex-1 w-full max-w-xl mx-auto px-4 py-4 flex flex-col justify-center">
        {/* Banner de error amigable */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="M12 8v4m0 4h.01" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================
            PASO 1: DATOS DE IDENTIDAD & HERO CREDENCIAL LANYARD
           ======================================================== */}
        {paso === 1 && (
          <div className="space-y-6">
            {/* Asset Hero Credencial con Lanyard (Inspirado en Imagen 1) */}
            <div className="py-2">
              <LanyardBadgeHero
                nombre={usuarioNombre}
                documento={numeroDocumento}
                tipo={tipoDocumento}
                fotoUrl={usuarioImagen || previewDocFrente}
              />
            </div>

            {/* Tarjeta de Entrada de Datos en Blanco Inmaculado */}
            <div className="rounded-[32px] bg-white text-[#111827] p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5">
              <div className="text-center space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#111827]">
                  Documento de Identidad
                </h1>
                <p className="text-xs text-gray-500 max-w-xs mx-auto">
                  Ingresa tu documento oficial para habilitar la entrega y seguro de vehículos en patio.
                </p>
              </div>

              {/* Selector de Tipo de Documento */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                  Tipo de Identificación
                </label>
                <div className="grid grid-cols-4 gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200/80">
                  {(['CC', 'CE', 'PASAPORTE', 'NIT'] as const).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setTipoDocumento(tipo)}
                      className={`min-h-[44px] py-2 px-1 text-xs font-bold rounded-xl transition-all duration-200 ${
                        tipoDocumento === tipo
                          ? 'bg-white text-[#111827] shadow-md border border-gray-200/80 scale-[1.02]'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campo para Número de Documento */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                  Número de Documento
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value.replace(/[^0-9A-Za-z-]/g, ''))}
                    placeholder="Ej. 1020485920"
                    className="w-full min-h-[52px] text-base px-4 rounded-xl bg-gray-50 border border-gray-300 text-[#111827] placeholder:text-gray-400 font-mono tracking-wider focus:bg-white focus:outline-none focus:border-[#111827] focus:ring-4 focus:ring-black/5 transition-all"
                  />
                  {numeroDocumento.length > 4 && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <CheckCircleSvg className="w-5 h-5 text-emerald-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Botón de Continuar */}
              <button
                type="button"
                onClick={avanzarPaso1}
                className="w-full min-h-[52px] rounded-2xl bg-[#111827] text-white font-bold text-base hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
              >
                <span>Continuar a Fotos del Documento</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            PASO 2: CAPTURA FOTOGRÁFICA DE CÉDULA (FRENTE Y DORSO)
           ======================================================== */}
        {paso === 2 && (
          <div className="rounded-[32px] bg-white text-[#111827] p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#111827]">
                Captura de {tipoDocumento}
              </h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Toma una fotografía nítida de ambas caras del documento físico para almacenarlas cifradas en R2.
              </p>
            </div>

            {/* Pestañas de Conmutación: Frente vs Dorso */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setLadoDocumentoActivo('FRENTE')}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  ladoDocumentoActivo === 'FRENTE'
                    ? 'bg-white text-[#111827] shadow-md border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Frente (Anverso)</span>
                {documentoFrenteKey ? (
                  <CheckCircleSvg className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setLadoDocumentoActivo('DORSO')}
                className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  ladoDocumentoActivo === 'DORSO'
                    ? 'bg-white text-[#111827] shadow-md border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Dorso (Reverso)</span>
                {documentoDorsoKey ? (
                  <CheckCircleSvg className="w-4 h-4 text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                )}
              </button>
            </div>

            {/* Visor de Captura / Ilustración Vectorial */}
            <div className="relative rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 p-4 min-h-[220px] flex items-center justify-center overflow-hidden">
              {ladoDocumentoActivo === 'FRENTE' ? (
                previewDocFrente ? (
                  <div className="relative w-full h-[220px] rounded-xl overflow-hidden shadow-inner">
                    <img
                      src={previewDocFrente}
                      alt="Frente del documento"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                      <CheckCircleSvg className="w-3.5 h-3.5 text-white" />
                      <span>Frente Guardado en R2</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-[280px] space-y-3 text-center">
                    <DocFrontSvg className="w-full h-36 mx-auto drop-shadow-sm" />
                    <p className="text-xs text-gray-500 font-medium">
                      Enfoca la parte frontal con la fotografía del titular visible.
                    </p>
                  </div>
                )
              ) : previewDocDorso ? (
                <div className="relative w-full h-[220px] rounded-xl overflow-hidden shadow-inner">
                  <img
                    src={previewDocDorso}
                    alt="Dorso del documento"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                    <CheckCircleSvg className="w-3.5 h-3.5 text-white" />
                    <span>Dorso Guardado en R2</span>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[280px] space-y-3 text-center">
                  <DocBackSvg className="w-full h-36 mx-auto drop-shadow-sm" />
                  <p className="text-xs text-gray-500 font-medium">
                    Enfoca la parte trasera con la banda magnética y huella dactilar.
                  </p>
                </div>
              )}

              {/* Indicador de subida activa a Cloudflare R2 */}
              {subiendoR2 && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                  <div className="w-8 h-8 rounded-full border-3 border-[#111827] border-t-transparent animate-spin" />
                  <span className="text-xs font-mono font-bold text-[#111827]">
                    Cifrando y subiendo a R2...
                  </span>
                </div>
              )}
            </div>

            {/* Input nativo oculto para la cámara */}
            <input
              ref={inputDocRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputDocChange}
              className="hidden"
            />

            {/* Botones de acción para captura */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => abrirCamaraDocumento(ladoDocumentoActivo)}
                disabled={subiendoR2}
                className="w-full min-h-[50px] rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-[#111827] font-bold text-sm transition-all flex items-center justify-center gap-2 border border-gray-200 cursor-pointer"
              >
                {((ladoDocumentoActivo === 'FRENTE' && previewDocFrente) ||
                  (ladoDocumentoActivo === 'DORSO' && previewDocDorso)) ? (
                  <>
                    <RefreshIconSvg className="w-4 h-4 text-[#111827]" />
                    <span>Tomar foto de nuevo con Guías ({ladoDocumentoActivo === 'FRENTE' ? 'Frente' : 'Dorso'})</span>
                  </>
                ) : (
                  <>
                    <CameraIconSvg className="w-5 h-5 text-[#111827]" />
                    <span>Abrir Cámara con Guías ({ladoDocumentoActivo === 'FRENTE' ? 'Frente' : 'Dorso'})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={avanzarPaso2}
                disabled={!puedeAvanzarPaso2}
                className={`w-full min-h-[52px] rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl ${
                  puedeAvanzarPaso2
                    ? 'bg-[#111827] text-white hover:bg-black active:scale-[0.98] cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>
                  {puedeAvanzarPaso2
                    ? 'Continuar a Licencia de Conducir'
                    : !documentoFrenteKey
                    ? 'Captura el Frente para Continuar'
                    : 'Captura el Dorso para Continuar'}
                </span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            PASO 3: LICENCIA DE CONDUCIR (CATEGORÍA & CAPTURA)
           ======================================================== */}
        {paso === 3 && (
          <div className="rounded-[32px] bg-white text-[#111827] p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#111827]">
                Licencia de Conducir
              </h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Registra los datos de tu licencia de tránsito y su fotografía para validar las unidades que puedes conducir.
              </p>
            </div>

            {/* Ilustración de Licencia */}
            <div className="w-full max-w-[280px] mx-auto">
              <LicenseGraphicSvg className="w-full h-32 mx-auto drop-shadow-sm" />
            </div>

            {/* Selector de Categoría de Licencia */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                Categoría Autorizada
              </label>
              <div className="grid grid-cols-4 gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                {(['A2', 'B1', 'B2', 'C1'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLicenciaCategoria(cat)}
                    className={`min-h-[44px] py-2 px-1 text-xs font-bold rounded-xl transition-all ${
                      licenciaCategoria === cat
                        ? 'bg-white text-[#111827] shadow-md border border-gray-200 scale-[1.02]'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span className="block font-display">{cat}</span>
                    <span className="text-[9px] font-normal text-gray-400 block truncate">
                      {cat === 'A2' ? 'Moto' : cat === 'B1' ? 'Auto' : cat === 'B2' ? 'Camión' : 'Público'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fila de Número de Licencia y Vencimiento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                  Número de Licencia
                </label>
                <input
                  type="text"
                  value={licenciaNumero}
                  onChange={(e) => setLicenciaNumero(e.target.value)}
                  placeholder="Ej. Q0492819"
                  className="w-full min-h-[50px] text-base px-3.5 rounded-xl bg-gray-50 border border-gray-300 text-[#111827] font-mono tracking-wider focus:bg-white focus:outline-none focus:border-[#111827] focus:ring-4 focus:ring-black/5"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider font-mono">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={licenciaVencimiento}
                  onChange={(e) => setLicenciaVencimiento(e.target.value)}
                  className="w-full min-h-[50px] text-base px-3.5 rounded-xl bg-gray-50 border border-gray-300 text-[#111827] font-mono focus:bg-white focus:outline-none focus:border-[#111827] focus:ring-4 focus:ring-black/5"
                />
              </div>
            </div>

            {/* Selector de Lado de la Licencia */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-2xl border border-gray-200">
              <button
                type="button"
                onClick={() => setLadoLicenciaActivo('FRENTE')}
                className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  ladoLicenciaActivo === 'FRENTE'
                    ? 'bg-white text-[#111827] shadow-md border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Frente Licencia</span>
                {licenciaFrenteKey && <CheckCircleSvg className="w-3.5 h-3.5 text-emerald-600" />}
              </button>

              <button
                type="button"
                onClick={() => setLadoLicenciaActivo('DORSO')}
                className={`min-h-[42px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  ladoLicenciaActivo === 'DORSO'
                    ? 'bg-white text-[#111827] shadow-md border border-gray-200'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <span>Dorso Licencia</span>
                {licenciaDorsoKey && <CheckCircleSvg className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            </div>

            {/* Visor de Foto de la Licencia */}
            <div className="relative rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 p-4 min-h-[160px] flex items-center justify-center overflow-hidden">
              {ladoLicenciaActivo === 'FRENTE' ? (
                previewLicFrente ? (
                  <div className="relative w-full h-[160px] rounded-xl overflow-hidden shadow-inner">
                    <img
                      src={previewLicFrente}
                      alt="Frente de la licencia"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                      <CheckCircleSvg className="w-3.5 h-3.5 text-white" />
                      <span>Frente Guardado</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 text-center font-medium">
                    Toma la fotografía frontal de tu licencia donde figure tu nombre y la categoría {licenciaCategoria}.
                  </p>
                )
              ) : previewLicDorso ? (
                <div className="relative w-full h-[160px] rounded-xl overflow-hidden shadow-inner">
                  <img
                    src={previewLicDorso}
                    alt="Dorso de la licencia"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2.5 right-2.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                    <CheckCircleSvg className="w-3.5 h-3.5 text-white" />
                    <span>Dorso Guardado</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center font-medium">
                  Toma la fotografía del reverso con las restricciones médicas o códigos QR.
                </p>
              )}

              {subiendoR2 && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-20">
                  <div className="w-8 h-8 rounded-full border-3 border-[#111827] border-t-transparent animate-spin" />
                  <span className="text-xs font-mono font-bold text-[#111827]">
                    Subiendo a Cloudflare R2...
                  </span>
                </div>
              )}
            </div>

            <input
              ref={inputLicRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleInputLicChange}
              className="hidden"
            />

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => abrirCamaraLicencia(ladoLicenciaActivo)}
                disabled={subiendoR2}
                className="w-full min-h-[48px] rounded-2xl bg-gray-100 hover:bg-gray-200 active:scale-[0.98] text-[#111827] font-bold text-sm transition-all flex items-center justify-center gap-2 border border-gray-200 cursor-pointer"
              >
                <CameraIconSvg className="w-4 h-4 text-[#111827]" />
                <span>Abrir Cámara con Guías ({ladoLicenciaActivo === 'FRENTE' ? 'Frente' : 'Dorso'})</span>
              </button>

              <button
                type="button"
                onClick={avanzarPaso3}
                disabled={!puedeAvanzarPaso3}
                className={`w-full min-h-[52px] rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-xl ${
                  puedeAvanzarPaso3
                    ? 'bg-[#111827] text-white hover:bg-black active:scale-[0.98] cursor-pointer'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>
                  {puedeAvanzarPaso3
                    ? 'Continuar a Revisión y Firma'
                    : !licenciaNumero.trim() || !licenciaVencimiento.trim()
                    ? 'Completa los Datos de la Licencia'
                    : !licenciaFrenteKey
                    ? 'Captura el Frente de la Licencia'
                    : 'Captura el Dorso de la Licencia'}
                </span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            PASO 4: AUDITORÍA DE SEGURIDAD Y CONFIRMACIÓN FINTECH
           ======================================================== */}
        {paso === 4 && (
          <div className="rounded-[32px] bg-white text-[#111827] p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-6">
            {!completadoExitoso ? (
              <>
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                    <ShieldLockSvg className="w-7 h-7" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#111827]">
                    Revisión de Seguridad y Cifrado
                  </h2>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    Tus evidencias han sido preparadas para su tokenización y resguardo institucional en Cloudflare R2.
                  </p>
                </div>

                {/* Checklist de Verificación Institucional */}
                <div className="space-y-3 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
                  <div className="flex items-center gap-3">
                    <CheckCircleSvg className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-[#111827]">
                        {tipoDocumento} {numeroDocumento}
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        Fotografía frontal y reverso capturados
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <CheckCircleSvg className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-[#111827]">
                        Licencia Cat. {licenciaCategoria} • Nº {licenciaNumero}
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        Vigencia hasta {licenciaVencimiento}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <CheckCircleSvg className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-[#111827]">
                        Cifrado AES-256 en Cloudflare R2
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        Custodia pericial con cero egreso de datos no autorizados
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botón de Envío Final */}
                <button
                  type="button"
                  onClick={handleFinalizarVerificacion}
                  disabled={isPending}
                  className="w-full min-h-[54px] rounded-2xl bg-[#111827] text-white font-bold text-base hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>Registrando expediente en D1...</span>
                    </>
                  ) : (
                    <>
                      <ShieldLockSvg className="w-5 h-5 text-emerald-400" />
                      <span>Completar y Enviar para Revisión</span>
                    </>
                  )}
                </button>
              </>
            ) : (
              /* Modal de éxito y resumen */
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircleSvg className="w-9 h-9" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-bold font-display text-[#111827]">
                    ¡Verificación Enviada!
                  </h3>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto">
                    Tu expediente ha sido registrado satisfactoriamente y las evidencias están bajo custodia pericial.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 max-w-sm mx-auto text-left space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Titular:</span>
                    <span className="font-semibold text-[#111827]">{usuarioNombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Correo:</span>
                    <span className="font-mono text-[#111827] truncate max-w-[200px]">{usuarioCorreo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Documento:</span>
                    <span className="font-mono text-[#111827]">{tipoDocumento} {numeroDocumento}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Licencia:</span>
                    <span className="font-mono text-[#111827]">Cat. {licenciaCategoria} ({licenciaNumero})</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-200">
                    <span className="text-gray-500">Estado:</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-600">
                      ● En Revisión Pericial
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/perfil')}
                  className="w-full max-w-sm mx-auto min-h-[50px] rounded-2xl bg-[#111827] text-white font-bold text-sm shadow-xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Volver a Mi Perfil</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER INFERIOR MINIMALISTA */}
      <footer className="relative z-10 w-full max-w-xl mx-auto px-4 py-3 text-center">
        <p className="text-[11px] font-mono text-gray-500">
          FlotaX Perimetral Identity • Custodia Cloudflare R2 • Cifrado AES-256
        </p>
      </footer>

      {/* MODAL DE CÁMARA CON GUÍAS EN VIVO Y COMPRESIÓN AUTOMÁTICA */}
      <VerificacionCameraModal
        abierto={modalCamaraAbierto}
        titulo={modalCamaraConfig.titulo}
        subtitulo={modalCamaraConfig.subtitulo}
        tipoGuia={modalCamaraConfig.tipoGuia}
        onFotoAceptada={(base64) => {
          subirFotoBase64Directa(base64, modalCamaraConfig.tipoGuia);
        }}
        onCerrar={() => setModalCamaraAbierto(false)}
      />
    </div>
  );
};

export default VerificacionMultistepIsland;
