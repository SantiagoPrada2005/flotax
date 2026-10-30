import AuthBlueprintVector from './assets/AuthBlueprintVector';
import AuthSketchVector from './assets/AuthSketchVector';
import AuthCadVector from './assets/AuthCadVector';
import AuthStencilVector from './assets/AuthStencilVector';

export type AuthBackgroundVariant = 'blueprint' | 'sketch' | 'cad' | 'stencil';

interface Props {
  activeVariant?: AuthBackgroundVariant;
  className?: string;
}

/**
 * @component AuthVectorBackground
 * @description Orquestador de fondos vectoriales SVG puros con transición suave de cross-fade.
 * Sustituye definitivamente cualquier fondo de imagen raster (PNG), garantizando nitidez infinita
 * y encuadre proporcional idéntico al diseño de pen.dev.
 * @source design/logo.pen -> Lamina 07 (Sección 03)
 */
export default function AuthVectorBackground({
  activeVariant = 'blueprint',
  className = '',
}: Props) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none pointer-events-none ${className}`}
      aria-hidden="true"
    >
      {/* Retícula milimétrica sutil de ingeniería de fondo */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F2937_1px,transparent_1px),linear-gradient(to_bottom,#1F2937_1px,transparent_1px)] bg-[size:32px_32px] opacity-15" />

      {/* Capa 1: Blueprint Técnico con Cotas (Paso 1: Bienvenida Login) */}
      <div
        className={`absolute inset-0 flex items-start justify-center transition-opacity duration-700 ease-in-out ${
          activeVariant === 'blueprint' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <AuthBlueprintVector className="w-full h-full object-contain object-top" />
      </div>

      {/* Capa 2: Boceto Industrial de 3 Vistas (Paso 2: Ingreso de Correo) */}
      <div
        className={`absolute inset-0 flex items-start justify-center transition-opacity duration-700 ease-in-out ${
          activeVariant === 'sketch' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <AuthSketchVector className="w-full h-full object-contain object-top" />
      </div>

      {/* Capa 3: Malla 3D CAD Wireframe y Telemetría de Cabina (Paso 3: Verificación OTP) */}
      <div
        className={`absolute inset-0 flex items-start justify-center transition-opacity duration-700 ease-in-out ${
          activeVariant === 'cad' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <AuthCadVector className="w-full h-full object-contain object-top" />
      </div>

      {/* Capa 4: Stencil Aerodinámico GT3 RS y Código de Barras VIN (Paso 4: Registro) */}
      <div
        className={`absolute inset-0 flex items-start justify-center transition-opacity duration-700 ease-in-out ${
          activeVariant === 'stencil' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <AuthStencilVector className="w-full h-full object-contain object-top" />
      </div>

      {/* Degradado perimétrico superior suave para respiración del Top Bar */}
      <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-[#111827] via-[#111827]/60 to-transparent" />

      {/* Viñeta de transición inferior: Inicia debajo del chasis para dar contraste legible al formulario */}
      <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[#111827] via-[#111827]/80 to-transparent" />
    </div>
  );
}
