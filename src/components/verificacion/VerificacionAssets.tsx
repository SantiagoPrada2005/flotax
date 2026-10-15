import { useState, type FC, type SVGProps } from 'react';

// ==========================================
// 1. EMBLEMA GEOMÉTRICO FLOTAX (Estilo Ornn)
// ==========================================
export const FlotaXEmblemSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-8 h-8', ...props }) => (
  <svg
    viewBox="0 0 100 100"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    {...props}
  >
    {/* Esfera geométrica seccionada en franjas horizontales paralelas de alta precisión */}
    <rect x="26" y="16" width="48" height="6" rx="3" />
    <rect x="18" y="26" width="64" height="6" rx="3" />
    <rect x="12" y="36" width="76" height="6" rx="3" />
    <rect x="10" y="47" width="80" height="6" rx="3" />
    <rect x="12" y="58" width="76" height="6" rx="3" />
    <rect x="18" y="68" width="64" height="6" rx="3" />
    <rect x="26" y="78" width="48" height="6" rx="3" />
  </svg>
);

// ==========================================
// 2. VECTOR ILUSTRATIVO: ANVERSO DOCUMENTO (Frente)
// ==========================================
export const DocFrontSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-full h-full', ...props }) => (
  <svg
    viewBox="0 0 320 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Tarjeta base con esquinas squircle */}
    <rect x="2" y="2" width="316" height="196" rx="16" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
    
    {/* Micro-patrón guilloche de fondo */}
    <path
      d="M20 40 Q 80 15, 160 40 T 300 40 M20 60 Q 80 35, 160 60 T 300 60"
      stroke="#F3F4F6"
      strokeWidth="1.5"
      fill="none"
    />
    
    {/* Encabezado institucional */}
    <rect x="20" y="18" width="100" height="6" rx="3" fill="#111827" />
    <rect x="20" y="28" width="60" height="4" rx="2" fill="#9CA3AF" />
    
    {/* Chip EMV pericial */}
    <rect x="20" y="44" width="36" height="28" rx="6" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
    <path d="M20 58 H 56 M38 44 V 72 M28 44 V 72 M48 44 V 72" stroke="#D1D5DB" strokeWidth="1" />

    {/* Foto del titular con marco */}
    <g transform="translate(20, 84)">
      <rect width="72" height="92" rx="10" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1.5" />
      {/* Silueta de retrato */}
      <circle cx="36" cy="38" r="18" fill="#D1D5DB" />
      <path
        d="M14 80 C 14 62, 58 62, 58 80"
        fill="#9CA3AF"
      />
    </g>

    {/* Bloques de datos del titular */}
    <g transform="translate(110, 56)">
      <rect x="0" y="0" width="45" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="10" width="140" height="9" rx="4" fill="#111827" />

      <rect x="0" y="32" width="55" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="42" width="120" height="9" rx="4" fill="#111827" />

      <rect x="0" y="64" width="40" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="74" width="90" height="8" rx="4" fill="#4B5563" />

      <rect x="0" y="96" width="60" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="106" width="105" height="8" rx="4" fill="#4B5563" />
    </g>

    {/* Holograma de autenticidad */}
    <circle cx="280" cy="145" r="16" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5" />
    <path d="M272 145 L 280 137 L 288 145 L 280 153 Z" fill="#9CA3AF" opacity="0.6" />
  </svg>
);

// ==========================================
// 3. VECTOR ILUSTRATIVO: REVERSO DOCUMENTO (Dorso)
// ==========================================
export const DocBackSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-full h-full', ...props }) => (
  <svg
    viewBox="0 0 320 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Tarjeta base con esquinas squircle */}
    <rect x="2" y="2" width="316" height="196" rx="16" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
    
    {/* Banda magnética superior en negro mate */}
    <rect x="2" y="22" width="316" height="34" fill="#111827" />

    {/* Franja de firma y código de barras */}
    <rect x="20" y="68" width="160" height="26" rx="4" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
    <path d="M30 84 Q 50 74, 70 82 T 110 78 T 150 82" stroke="#9CA3AF" strokeWidth="1.5" fill="none" />

    {/* Huella dactilar pericial */}
    <g transform="translate(230, 68)">
      <rect width="65" height="50" rx="8" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
      <path
        d="M25 40 C 25 22, 40 22, 40 40 M20 40 C 20 16, 45 16, 45 40 M15 40 C 15 10, 50 10, 50 40"
        stroke="#9CA3AF"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </g>

    {/* Zona MRZ (Machine Readable Zone - 3 líneas de caracteres ópticos) */}
    <g transform="translate(20, 134)">
      <rect x="0" y="0" width="280" height="48" rx="6" fill="#F3F4F6" />
      <text x="12" y="18" fill="#4B5563" fontFamily="monospace" fontSize="9" letterSpacing="2">
        IDCOL10204859208&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
      </text>
      <text x="12" y="32" fill="#4B5563" fontFamily="monospace" fontSize="9" letterSpacing="2">
        9005124M3012318COL&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;4
      </text>
      <text x="12" y="44" fill="#4B5563" fontFamily="monospace" fontSize="9" letterSpacing="2">
        RODRIGUEZ&lt;&lt;SANTIAGO&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
      </text>
    </g>
  </svg>
);

// ==========================================
// 4. VECTOR ILUSTRATIVO: LICENCIA DE CONDUCIR
// ==========================================
export const LicenseGraphicSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-full h-full', ...props }) => (
  <svg
    viewBox="0 0 320 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    <rect x="2" y="2" width="316" height="196" rx="16" fill="#FFFFFF" stroke="#E5E7EB" strokeWidth="2" />
    
    {/* Franja superior temática automotriz */}
    <rect x="2" y="2" width="316" height="24" rx="16" fill="#111827" />
    <rect x="2" y="16" width="316" height="10" fill="#111827" />
    <text x="20" y="18" fill="#FFFFFF" fontFamily="system-ui" fontSize="9" fontWeight="700" letterSpacing="1">
      REPÚBLICA • LICENCIA NACIONAL DE CONDUCCIÓN
    </text>

    {/* Volante de conducción */}
    <g transform="translate(260, 42)">
      <circle cx="20" cy="20" r="18" stroke="#E5E7EB" strokeWidth="2.5" fill="none" />
      <circle cx="20" cy="20" r="7" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1.5" />
      <path d="M20 27 V 38 M2 20 H 13 M27 20 H 38" stroke="#D1D5DB" strokeWidth="2" />
    </g>

    {/* Retrato */}
    <g transform="translate(20, 42)">
      <rect width="68" height="84" rx="10" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1.5" />
      <circle cx="34" cy="34" r="16" fill="#D1D5DB" />
      <path d="M12 74 C 12 56, 56 56, 56 74" fill="#9CA3AF" />
    </g>

    {/* Campos de texto */}
    <g transform="translate(100, 46)">
      <rect x="0" y="0" width="50" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="9" width="130" height="8" rx="4" fill="#111827" />

      <rect x="0" y="27" width="60" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="36" width="110" height="8" rx="4" fill="#111827" />

      <rect x="0" y="54" width="70" height="5" rx="2.5" fill="#9CA3AF" />
      <rect x="0" y="63" width="95" height="8" rx="4" fill="#4B5563" />
    </g>

    {/* Matriz de categorías habilitadas */}
    <g transform="translate(20, 138)">
      <rect width="280" height="46" rx="8" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
      <g transform="translate(16, 12)">
        <rect x="0" y="0" width="42" height="22" rx="6" fill="#111827" />
        <text x="12" y="15" fill="#FFFFFF" fontFamily="system-ui" fontSize="11" fontWeight="800">A2</text>

        <rect x="52" y="0" width="42" height="22" rx="6" fill="#111827" />
        <text x="64" y="15" fill="#FFFFFF" fontFamily="system-ui" fontSize="11" fontWeight="800">B1</text>

        <rect x="104" y="0" width="42" height="22" rx="6" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
        <text x="116" y="15" fill="#9CA3AF" fontFamily="system-ui" fontSize="11" fontWeight="700">C1</text>

        <rect x="156" y="0" width="42" height="22" rx="6" fill="#F3F4F6" stroke="#D1D5DB" strokeWidth="1" />
        <text x="168" y="15" fill="#9CA3AF" fontFamily="system-ui" fontSize="11" fontWeight="700">C2</text>
      </g>
    </g>
  </svg>
);

// ==========================================
// 5. ASSET HERO: CREDENCIAL CON LANYARD (Fiel a Imagen 1)
// ==========================================
interface LanyardBadgeProps {
  nombre: string;
  documento: string;
  tipo: string;
  fotoUrl?: string | null;
  className?: string;
}

export const LanyardBadgeHero: FC<LanyardBadgeProps> = ({
  nombre,
  documento,
  tipo,
  fotoUrl,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 1. Correa / Cinta de cuello (Lanyard Strap) */}
      <div className="relative w-12 h-20 bg-gradient-to-b from-[#0A0D14] via-[#111827] to-[#1F2937] shadow-xl flex items-center justify-between px-1.5 border-x border-white/10">
        {/* Pespunte / Costura lateral */}
        <div className="w-[1.5px] h-full bg-white/15 border-dashed border-white/20" />
        {/* Remache metálico plateado */}
        <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-gray-400 via-gray-200 to-white shadow-inner flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
        </div>
        <div className="w-[1.5px] h-full bg-white/15 border-dashed border-white/20" />
      </div>

      {/* 2. Gancho y Mosquetón Metálico (Swivel Lobster Clasp) */}
      <div className="relative -mt-1 flex flex-col items-center z-20">
        {/* Argolla ovalada metálica */}
        <div className="w-10 h-4 rounded-full border-[3px] border-gray-300 bg-transparent shadow-md" />
        
        {/* Cuerpo del mosquetón con palanca de resorte */}
        <div className="relative w-4 h-9 bg-gradient-to-r from-gray-300 via-white to-gray-400 rounded-b-md shadow-lg flex flex-col items-center">
          {/* Pivote giratorio */}
          <div className="w-5 h-1.5 bg-gray-400 rounded-sm mt-0.5" />
          {/* Seguro / Gatillo */}
          <div className="w-1.5 h-4 bg-gray-500 rounded-full mt-1 -mr-1" />
          {/* Punta del gancho que entra a la ranura */}
          <div className="absolute -bottom-2 w-3.5 h-4 border-b-[3px] border-l-[3px] border-gray-300 rounded-bl-full" />
        </div>
      </div>

      {/* 3. Conjunto de Credenciales (Tarjeta Negra Inclinada + Tarjeta Blanca Frontal) */}
      <div className="relative -mt-2 w-[240px] sm:w-[260px] flex items-center justify-center">
        {/* Tarjeta Posterior Negra Inclinada (Lifem... / FlotaX style) */}
        <div
          className="absolute w-[220px] sm:w-[240px] h-[330px] sm:h-[350px] rounded-[28px] bg-[#0A0D14] border border-white/10 shadow-2xl flex flex-col justify-between p-6 transform -rotate-12 translate-y-3 -translate-x-4 transition-transform duration-500"
          style={{ willChange: 'transform' }}
        >
          {/* Ranura superior para el gancho */}
          <div className="w-8 h-2 rounded-full bg-white/10 mx-auto" />

          {/* Emblema FlotaX lateral estilizado tipo editorial */}
          <div className="my-auto transform -rotate-90 origin-center text-left">
            <div className="flex items-center gap-3">
              <FlotaXEmblemSvg className="w-8 h-8 text-white opacity-90" />
              <span className="text-xl font-bold tracking-widest text-white uppercase font-display">
                FLOTAX
              </span>
            </div>
            <p className="text-[10px] tracking-widest text-gray-500 font-mono mt-1">
              OPERATIONAL ID SYSTEM
            </p>
          </div>

          <div className="text-[9px] font-mono text-gray-600 tracking-wider">
            SECURE PASS 2026
          </div>
        </div>

        {/* Tarjeta Frontal Blanca Inmaculada (Constance Kelly Style) */}
        <div className="relative w-[220px] sm:w-[240px] h-[330px] sm:h-[350px] rounded-[28px] bg-white text-[#111827] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] border border-gray-100 flex flex-col overflow-hidden z-10 transition-all duration-300 hover:shadow-white/10">
          
          {/* Ranura perforada superior donde entra el mosquetón */}
          <div className="pt-3 pb-1 flex justify-center">
            <div className="w-7 h-2 rounded-full bg-gray-200/90 border border-gray-300 shadow-inner" />
          </div>

          {/* Área de Fotografía / Retrato con curva orgánica suave (Wave Cutout) */}
          <div className="relative mx-3.5 mt-1 h-[180px] sm:h-[190px] rounded-2xl bg-gradient-to-b from-gray-100 to-gray-200 overflow-hidden border border-gray-100 flex items-center justify-center">
            {fotoUrl && !imgError ? (
              <img
                src={fotoUrl}
                alt={nombre || 'Titular'}
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="relative w-full h-full flex flex-col items-center justify-center bg-[#E5E7EB]/60">
                {/* Silueta de retrato profesional limpio */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 flex items-center justify-center shadow-inner">
                  <svg className="w-12 h-12 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                {/* Chip EMV o Badge sutil */}
                <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold text-gray-700">KYC</span>
                </div>
              </div>
            )}

            {/* Recorte curvo orgánico blanco inferior característico del diseño de referencia */}
            <div className="absolute -bottom-1 left-0 right-0 h-9 bg-white [clip-path:polygon(0_100%,100%_100%,100%_40%,55%_40%,35%_0%,0_0%)]" />
          </div>

          {/* Información del Titular (Pristine Typography) */}
          <div className="px-5 pt-1.5 pb-4 flex-1 flex flex-col justify-between">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider text-gray-400 font-semibold">
                Titular Verificado
              </p>
              <h3 className="text-base sm:text-lg font-bold text-[#111827] leading-tight tracking-tight truncate font-display">
                {nombre || 'Constance Kelly'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                Conductor Habilitado
              </p>
            </div>

            {/* Fila Inferior con Tipo, Número y Código de Barra */}
            <div className="pt-2 border-t border-gray-100 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-mono uppercase text-gray-400">
                  {tipo || 'CÉDULA'}
                </p>
                <p className="text-xs font-mono font-bold text-[#111827] tracking-wider tabular-nums">
                  {documento ? `${tipo} ${documento}` : 'ID 11000761'}
                </p>
              </div>

              {/* Micro-código de barras estilizado */}
              <div className="flex items-end gap-[1.5px] h-4">
                <div className="w-[1.5px] h-3.5 bg-gray-900" />
                <div className="w-[2px] h-4 bg-gray-900" />
                <div className="w-[1px] h-2.5 bg-gray-900" />
                <div className="w-[2.5px] h-4 bg-gray-900" />
                <div className="w-[1.5px] h-3 bg-gray-900" />
                <div className="w-[1px] h-4 bg-gray-900" />
                <div className="w-[2px] h-2.5 bg-gray-900" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. ICONOGRAFÍA DE APOYO EN SVG VECTORIAL LIMPIO
// ==========================================
export const CameraIconSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

export const CheckCircleSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const ShieldLockSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-5 h-5', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <circle cx="12" cy="11" r="1.5" fill="currentColor" />
    <path d="M12 12.5v3" />
  </svg>
);

export const RefreshIconSvg: FC<SVGProps<SVGSVGElement>> = ({ className = 'w-4 h-4', ...props }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);
