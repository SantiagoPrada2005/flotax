import { useState } from 'react';
import { navigate } from 'astro:transitions/client';
import FlotaxLoadingScreen, {
  type FlotaxLoaderVariant,
} from './FlotaxLoadingScreen';

const ANIMATION_VARIANTS: ReadonlyArray<{
  id: FlotaxLoaderVariant;
  badge: string;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'orbital',
    badge: 'ANIMACIÓN 01',
    title: 'Ensamblaje Orbital',
    subtitle: 'Noche Táctica · #111827',
  },
  {
    id: 'cad',
    badge: 'ANIMACIÓN 02',
    title: 'Escáner Pericial CAD',
    subtitle: 'Túnel Aerodinámico · #EDEDED',
  },
];

const OPERATIONAL_STATES = [
  {
    id: 'telemetria',
    label: '01 · Telemetría',
    status: 'SINCRONIZANDO FLOTA Y TELEMETRÍA PERIMETRAL',
  },
  {
    id: 'pericial',
    label: '02 · Fotogrametría R2',
    status: 'INSPECCIÓN PERICIAL Y FOTOGRAMETRÍA R2',
  },
  {
    id: 'disponibilidad',
    label: '03 · Patio y Llaves',
    status: 'VERIFICANDO CREDENCIALES Y DISPONIBILIDAD DE PATIO',
  },
  {
    id: 'liquidacion',
    label: '04 · Liquidación',
    status: 'LIQUIDACIÓN DE TARIFAS Y CAJA OPERATIVA',
  },
] as const;

/**
 * Isla React 19 para visualización e inspección interactiva
 * de las dos animaciones de carga full-screen de FlotaX:
 * - Animación 01: Ensamblaje Cinético & Telemetría Orbital (#111827)
 * - Animación 02: Escáner Pericial CAD & Túnel Aerodinámico (#EDEDED / #111827)
 */
export default function FlotaxLoaderPreviewIsland() {
  const [activeVariant, setActiveVariant] = useState<FlotaxLoaderVariant>('cad');
  const [selectedStateIndex, setSelectedStateIndex] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const currentState =
    OPERATIONAL_STATES[selectedStateIndex] ?? OPERATIONAL_STATES[0];

  const handleReturn = () => {
    void navigate('/');
  };

  return (
    <div className="relative min-h-dvh w-screen overflow-hidden bg-[#111827] text-[#EDEDED]">
      {/* Componente Canónico de Carga a Pantalla Completa */}
      <FlotaxLoadingScreen
        isVisible={true}
        variant={activeVariant}
        statusLabel={currentState.status}
      />

      {/* Botón Flotante Superior para Conmutar Animación Rápida y Modo Inmersivo */}
      <div className="fixed top-6 right-6 z-110 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() =>
            setActiveVariant((prev) => (prev === 'orbital' ? 'cad' : 'orbital'))
          }
          className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[#4B5563] bg-[#111827]/90 px-4 py-2 text-xs font-mono font-bold tracking-wider text-[#EDEDED] shadow-lg backdrop-blur-md transition-colors hover:border-[#EDEDED] cursor-pointer"
        >
          {activeVariant === 'orbital'
            ? 'VER ANIMACIÓN 02 (CAD)'
            : 'VER ANIMACIÓN 01 (ORBITAL)'}
        </button>

        <button
          type="button"
          onClick={() => setShowControls((prev) => !prev)}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-[#4B5563]/80 bg-[#1F2937]/90 px-4 py-2 text-xs font-mono font-semibold tracking-wider text-[#EDEDED] shadow-lg backdrop-blur-md transition-colors hover:border-[#9CA3AF] hover:bg-[#1F2937] cursor-pointer"
          aria-label={
            showControls
              ? 'Ocultar controles de prueba'
              : 'Mostrar controles de prueba'
          }
        >
          {showControls ? 'MODO INMERSIVO' : 'CONTROLES'}
        </button>
      </div>

      {/* Consola de Control y Conmutador de Animaciones (HUD Inferior) */}
      {showControls && (
        <aside
          aria-label="Controles de simulación de carga"
          className="fixed bottom-6 inset-x-4 z-110 mx-auto max-w-2xl rounded-2xl border border-[#4B5563]/80 bg-[#111827]/95 p-4 text-[#EDEDED] shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:w-full"
        >
          <div className="flex flex-col gap-3.5">
            {/* Cabecera del HUD */}
            <div className="flex items-center justify-between border-b border-[#4B5563]/40 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="inline-block h-2 w-2 rounded-full bg-[#EDEDED] animate-pulse" />
                <span className="text-xs font-mono font-semibold tracking-wider text-[#EDEDED]">
                  LABORATORIO DE ANIMACIÓN FULL-SCREEN · FLOTAX
                </span>
              </div>
              <button
                type="button"
                onClick={handleReturn}
                className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-[#9CA3AF] transition-colors hover:text-[#EDEDED] cursor-pointer"
              >
                <span>←</span>
                <span>VOLVER AL INICIO</span>
              </button>
            </div>

            {/* Selector de Variante de Animación (01 vs 02) */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ANIMATION_VARIANTS.map((v) => {
                const isSelected = v.id === activeVariant;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setActiveVariant(v.id)}
                    className={`flex min-h-[52px] items-center justify-between rounded-xl px-4 py-2.5 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#EDEDED] bg-[#EDEDED] text-[#111827] shadow-sm'
                        : 'border border-[#4B5563]/60 bg-[#1F2937]/80 text-[#EDEDED] hover:border-[#9CA3AF]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`font-mono text-[10px] font-bold tracking-widest ${
                          isSelected ? 'text-[#4B5563]' : 'text-[#9CA3AF]'
                        }`}
                      >
                        {v.badge}
                      </span>
                      <span className="font-display text-sm font-bold">
                        {v.title}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-[10px] font-semibold ${
                        isSelected ? 'text-[#1F2937]' : 'text-[#9CA3AF]'
                      }`}
                    >
                      {v.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selector de Fases Operativas de Telemetría */}
            <div className="flex flex-wrap gap-2">
              {OPERATIONAL_STATES.map((item, index) => {
                const isActive = index === selectedStateIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedStateIndex(index)}
                    className={`inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-xs font-mono transition-all cursor-pointer ${
                      isActive
                        ? 'border border-[#9CA3AF] bg-[#1F2937] font-bold text-[#EDEDED]'
                        : 'border border-[#4B5563]/40 bg-[#111827] text-[#9CA3AF] hover:border-[#4B5563] hover:text-[#EDEDED]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
