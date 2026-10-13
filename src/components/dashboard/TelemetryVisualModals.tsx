import { useState } from 'react';
import { navigate } from 'astro:transitions/client';
import type {
  FleetCategorySummary,
  LiveTelemetryPulse,
  WaffleUnitNode,
} from '@/lib/metricas';
import type { BentoDetailModalKind } from './TelemetryBentoGrid';

export interface TelemetryVisualModalsProps {
  readonly activeKind: BentoDetailModalKind;
  readonly category: FleetCategorySummary;
  readonly units: readonly WaffleUnitNode[];
  readonly livePulse: LiveTelemetryPulse;
  readonly initialSelectedUnitIndex?: number | undefined;
  readonly onClose: () => void;
}

const GYRO_SUBSYSTEMS = [
  {
    id: 'CHASIS',
    label: 'Carrocería 360°',
    shortLabel: 'Chasis',
    scorePct: 96,
    tiltDeg: -6,
    maxDeg: 35,
    pressureLabel: 'Óptimo • 0 alertas',
    r2Captures: 48,
    zoneHighlight: 'FRONT_REAR',
  },
  {
    id: 'MOTOR',
    label: 'Fluido & Tren Motriz',
    shortLabel: 'Motor L➔H',
    scorePct: 91,
    tiltDeg: 4,
    maxDeg: 35,
    pressureLabel: 'Presión nominal H',
    r2Captures: 32,
    zoneHighlight: 'ENGINE',
  },
  {
    id: 'LLANTAS',
    label: 'Rodamiento & Frenos',
    shortLabel: 'Llantas',
    scorePct: 88,
    tiltDeg: -10,
    maxDeg: 35,
    pressureLabel: '34 PSI parejo',
    r2Captures: 28,
    zoneHighlight: 'WHEELS',
  },
  {
    id: 'R2_DOCS',
    label: 'Sello Pericial R2',
    shortLabel: 'Fotos R2',
    scorePct: 99,
    tiltDeg: 0,
    maxDeg: 35,
    pressureLabel: 'Firma + Fotos OK',
    r2Captures: 76,
    zoneHighlight: 'ALL',
  },
] as const;

const CIRCUIT_CONTRACTS = [
  {
    id: 'CTR-01',
    plate: 'FLX-204',
    model: 'Toyota Corolla Cross',
    sector: 'Sector 2',
    lapLabel: 'Día 3 de 4',
    remainingTime: '1:36',
    progressPct: 72,
    trackCoord: { x: 218, y: 42 },
    etaLabel: '16:00',
    stageIndex: 2,
  },
  {
    id: 'CTR-02',
    plate: 'FLX-318',
    model: 'Yamaha NMAX Connected',
    sector: 'Sector 3',
    lapLabel: 'Retorno Hoy',
    remainingTime: '0:42',
    progressPct: 89,
    trackCoord: { x: 248, y: 102 },
    etaLabel: '15:10',
    stageIndex: 3,
  },
  {
    id: 'CTR-03',
    plate: 'FLX-109',
    model: 'Renault Kangoo Furgón',
    sector: 'Sector 1',
    lapLabel: 'Recién entregado',
    remainingTime: '5:20',
    progressPct: 28,
    trackCoord: { x: 76, y: 48 },
    etaLabel: '19:45',
    stageIndex: 1,
  },
  {
    id: 'CTR-04',
    plate: 'FLX-402',
    model: 'Segway Ninebot Max G2',
    sector: 'Sector 2',
    lapLabel: 'Turno Tarde',
    remainingTime: '2:15',
    progressPct: 58,
    trackCoord: { x: 148, y: 118 },
    etaLabel: '17:00',
    stageIndex: 2,
  },
] as const;

const RADIAL_DIAL_TICKS = Array.from({ length: 29 }, (_, idx) => -140 + idx * (280 / 28));

function polarSectorPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + outerR * Math.cos(toRad(startAngleDeg));
  const y1 = cy + outerR * Math.sin(toRad(startAngleDeg));
  const x2 = cx + outerR * Math.cos(toRad(endAngleDeg));
  const y2 = cy + outerR * Math.sin(toRad(endAngleDeg));
  const x3 = cx + innerR * Math.cos(toRad(endAngleDeg));
  const y3 = cy + innerR * Math.sin(toRad(endAngleDeg));
  const x4 = cx + innerR * Math.cos(toRad(startAngleDeg));
  const y4 = cy + innerR * Math.sin(toRad(startAngleDeg));
  const largeArc = endAngleDeg - startAngleDeg > 180 ? 1 : 0;

  return [
    `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export default function TelemetryVisualModals({
  activeKind,
  category,
  units,
  livePulse,
  initialSelectedUnitIndex = 0,
  onClose,
}: TelemetryVisualModalsProps) {
  // 1. State for OCCUPANCY (Ref 4 Bessonov Liquid Chambers + Tide Simulator)
  const [simulatedOccupancyPct, setSimulatedOccupancyPct] = useState<number>(category.occupancyPct);
  const [selectedChamberIdx, setSelectedChamberIdx] = useState<number>(1);

  // 2. State for WAFFLE_MATRIX (Ref 5.3 Waffle + Ref 3.1/3.2 Automotive Cluster)
  const [selectedDotIdx, setSelectedDotIdx] = useState<number>(initialSelectedUnitIndex);

  // 3. State for RADIAL_HEALTH (Ref 3.3/3.4 Gyroscope + Ref 2 4-Button Vehicle Controller)
  const [selectedSubsystemIdx, setSelectedSubsystemIdx] = useState<number>(0);
  const [selectedHourBarIdx, setSelectedHourBarIdx] = useState<number>(6);

  // 4. State for CONTRACTS (Ref 2.1 Closed Circuit Track + Route Timeline)
  const [selectedCircuitIdx, setSelectedCircuitIdx] = useState<number>(0);

  // 5. State for CASH (Ref 5.4 Polar Hatched Wheel + Ref 5.2 Mountain Needle)
  const [selectedPolarIdx, setSelectedPolarIdx] = useState<number>(0);

  const triggerHaptic = (ms: number = 8) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignorar
      }
    }
  };

  const isDarkInstrument =
    activeKind === 'OCCUPANCY' ||
    activeKind === 'RADIAL_HEALTH' ||
    activeKind === 'CONTRACTS';

  // Helper data for OCCUPANCY chambers (Ref 4: 100%, 84%, 26%, 14%)
  const liquidChambers = [
    {
      id: 'CHAMBER_PEAK',
      title: 'Capacidad Punta',
      subtitle: 'Flota asegurada R2',
      pct: 100,
      unitsLabel: `${category.totalUnits}/${category.totalUnits} unds`,
    },
    {
      id: 'CHAMBER_ACTIVE',
      title: 'Marea en Ruta',
      subtitle: 'Simulación en vivo',
      pct: simulatedOccupancyPct,
      unitsLabel: `${Math.round((simulatedOccupancyPct / 100) * category.totalUnits)}/${category.totalUnits} unds`,
    },
    {
      id: 'CHAMBER_STANDBY',
      title: 'Reserva Patio',
      subtitle: 'Listas para salida',
      pct: Math.max(12, 100 - simulatedOccupancyPct),
      unitsLabel: `${Math.max(1, category.totalUnits - Math.round((simulatedOccupancyPct / 100) * category.totalUnits))} libres`,
    },
    {
      id: 'CHAMBER_TECH',
      title: 'Drenaje Taller',
      subtitle: 'Preventivo hoy',
      pct: Math.max(6, Math.round((category.maintenanceUnits / Math.max(1, category.totalUnits)) * 100)),
      unitsLabel: `${category.maintenanceUnits} en box`,
    },
  ];

  const projectedRevenue = Math.round(13553 * (category.totalUnits / 22) * (simulatedOccupancyPct / Math.max(1, category.occupancyPct)));

  // Helper data for WAFFLE_MATRIX (20 dots)
  const waffleDots = Array.from({ length: 20 }, (_, idx) => {
    const unit = units[idx % Math.max(1, units.length)] ?? units[0]!;
    const isHatched =
      unit.status === 'MANTENIMIENTO' ||
      idx >= Math.round((category.availabilityPct / 100) * 20);
    return { idx, unit, isHatched };
  });
  const activeWaffleDot = waffleDots[selectedDotIdx % waffleDots.length] ?? waffleDots[0]!;
  const activeUnit = activeWaffleDot.unit;

  // Helper data for RADIAL_HEALTH
  const activeSub = GYRO_SUBSYSTEMS[selectedSubsystemIdx] ?? GYRO_SUBSYSTEMS[0];

  // Helper data for CONTRACTS
  const activeContract = CIRCUIT_CONTRACTS[selectedCircuitIdx] ?? CIRCUIT_CONTRACTS[0];

  // Helper data for CASH Polar Sectors
  const polarAngles = [
    { start: 0, end: 135, baseOuter: 78 },
    { start: 135, end: 255, baseOuter: 64 },
    { start: 255, end: 360, baseOuter: 54 },
  ];
  const activePolarSector =
    livePulse.polarSectors[selectedPolarIdx] ?? livePulse.polarSectors[0]!;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Instrumento interactivo de telemetría"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#111827]/70 backdrop-blur-xs p-2.5 sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`animate-fade-up w-full max-w-md rounded-[34px] p-5 shadow-2xl border space-y-4 max-h-[88vh] overflow-y-auto no-scrollbar ${
          isDarkInstrument
            ? 'bg-[#111827] text-[#EDEDED] border-white/15'
            : 'bg-white text-[#111827] border-[#9CA3AF]/45'
        }`}
      >
        {/* Top Grab Handle */}
        <div
          className={`mx-auto h-1.5 w-12 rounded-full ${
            isDarkInstrument ? 'bg-white/20' : 'bg-[#9CA3AF]/60'
          }`}
        />

        {/* Instrument Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isDarkInstrument ? 'bg-emerald-400 animate-pulse' : 'bg-[#111827]'
                }`}
              />
              <span
                className={`font-mono text-[10px] font-bold uppercase tracking-wider ${
                  isDarkInstrument ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                }`}
              >
                {activeKind === 'OCCUPANCY' && 'HIDRODINÁMICA BESSONOV • NIVEL EN VIVO'}
                {activeKind === 'WAFFLE_MATRIX' && 'MATRIZ ACHURADA + CLÚSTER C-ARC'}
                {activeKind === 'RADIAL_HEALTH' && 'GIROSCOPIO PERICIAL 360° • CLOUDFLARE R2'}
                {activeKind === 'CONTRACTS' && 'RADAR DE CIRCUITO STANDBY • TELEMETRÍA'}
                {activeKind === 'CASH' && 'RUEDA POLAR SUIZA (+62.3°) • FLUJO CAJA'}
              </span>
            </div>
            <h3 className="mt-0.5 font-display text-xl font-black tracking-tight">
              {activeKind === 'OCCUPANCY' && 'Cámaras Líquidas de Ocupación'}
              {activeKind === 'WAFFLE_MATRIX' && 'Explorador Táctil de Unidades'}
              {activeKind === 'RADIAL_HEALTH' && 'Inclinómetro & Salud de Flota'}
              {activeKind === 'CONTRACTS' && 'Circuito Activo de Alquileres'}
              {activeKind === 'CASH' && 'Geometría Polar de Recaudación'}
            </h3>
          </div>

          <button
            type="button"
            aria-label="Cerrar instrumento"
            onClick={() => {
              triggerHaptic(6);
              onClose();
            }}
            className={`ios-press-bounce flex h-10 w-10 shrink-0 items-center justify-center rounded-full cursor-pointer ${
              isDarkInstrument
                ? 'bg-[#1F2937] text-[#EDEDED] border border-white/10'
                : 'bg-[#EDEDED] text-[#111827] border border-[#9CA3AF]/30'
            }`}
          >
            ✕
          </button>
        </div>

        {/* =====================================================================
            INSTRUMENT 1: OCCUPANCY — BESSONOV 2x2 LIQUID CHAMBERS (REF 4)
           ===================================================================== */}
        {activeKind === 'OCCUPANCY' && (
          <div className="space-y-4">
            {/* 2x2 Bessonov Squircle Liquid Wave Grid (Exact Ref 4 visual language) */}
            <div className="grid grid-cols-2 gap-3">
              {liquidChambers.map((chamber, idx) => {
                const isSelected = selectedChamberIdx === idx;
                return (
                  <button
                    key={chamber.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(8);
                      setSelectedChamberIdx(idx);
                      if (idx === 0) setSimulatedOccupancyPct(100);
                      if (idx === 1) setSimulatedOccupancyPct(category.occupancyPct);
                      if (idx === 2) setSimulatedOccupancyPct(68);
                      if (idx === 3) setSimulatedOccupancyPct(45);
                    }}
                    className={`ios-press-bounce relative flex h-40 flex-col justify-between overflow-hidden rounded-[26px] bg-[#1F2937]/75 p-4 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-[#EDEDED] shadow-[0_0_25px_rgba(237,237,237,0.18)]'
                        : 'ring-1 ring-white/10 opacity-90 hover:opacity-100'
                    }`}
                  >
                    {/* Animated Liquid Fill inside each Squircle */}
                    <div
                      aria-hidden="true"
                      style={{ height: `${Math.min(96, Math.max(16, chamber.pct))}%` }}
                      className="pointer-events-none absolute inset-x-0 bottom-0 transition-all duration-500"
                    >
                      <svg
                        viewBox="0 0 400 36"
                        preserveAspectRatio="none"
                        className="animate-liquid-wave-back absolute -top-5 left-0 h-6 w-[200%]"
                      >
                        <path
                          d="M0 18 Q 50 2, 100 18 T 200 18 T 300 18 T 400 18 L 400 36 L 0 36 Z"
                          fill="#4B5563"
                          fillOpacity="0.55"
                        />
                      </svg>
                      <div className="h-full w-full bg-[#4B5563]/45 bg-hatch-diagonal-dark" />
                      <svg
                        viewBox="0 0 400 36"
                        preserveAspectRatio="none"
                        className="animate-liquid-wave-front absolute -top-3.5 left-0 h-5 w-[200%]"
                      >
                        <path
                          d="M0 16 Q 50 30, 100 16 T 200 16 T 300 16 T 400 16 L 400 36 L 0 36 Z"
                          fill="#EDEDED"
                          fillOpacity="0.22"
                        />
                      </svg>
                    </div>

                    {/* Top Bolt Badge + Units */}
                    <div className="relative z-10 flex w-full items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                        {chamber.unitsLabel}
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                          isSelected
                            ? 'bg-[#EDEDED] text-[#111827]'
                            : 'bg-[#111827]/70 text-[#EDEDED]'
                        }`}
                      >
                        ⚡
                      </span>
                    </div>

                    {/* Center Giant Percentage Pill (Ref 4 Bessonov style) */}
                    <div className="relative z-10 my-auto flex items-center justify-center">
                      <span className="rounded-2xl bg-[#111827]/85 px-3.5 py-1.5 font-display text-2xl font-black tracking-tight text-[#EDEDED] backdrop-blur-md border border-white/15 shadow-md">
                        {chamber.pct}%
                      </span>
                    </div>

                    {/* Bottom Label */}
                    <div className="relative z-10">
                      <p className="text-xs font-extrabold text-[#EDEDED] leading-tight">
                        {chamber.title}
                      </p>
                      <p className="text-[10px] text-[#9CA3AF]">{chamber.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Interactive Tide Level Scrubber (Manipulate the wave physically) */}
            <div className="rounded-[24px] bg-[#1F2937] p-4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#9CA3AF]">
                    SIMULADOR DE MAREA OPERATIVA
                  </span>
                  <p className="font-display text-sm font-bold text-[#EDEDED]">
                    Desliza para proyectar facturación por ocupación
                  </p>
                </div>
                <span className="rounded-xl bg-[#111827] px-2.5 py-1 font-mono text-sm font-black text-[#EDEDED] border border-white/10">
                  ${projectedRevenue.toLocaleString('en-US')}
                </span>
              </div>

              <input
                type="range"
                min={25}
                max={100}
                value={simulatedOccupancyPct}
                aria-label="Simular porcentaje de ocupación de flota"
                onChange={(e) => {
                  setSimulatedOccupancyPct(Number(e.target.value));
                  setSelectedChamberIdx(1);
                }}
                className="h-3 w-full accent-[#EDEDED] cursor-pointer text-base"
              />

              {/* Quick Wave Preset Pills */}
              <div className="flex items-center justify-between gap-2">
                {[50, 70, category.occupancyPct, 95, 100].map((presetVal, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      triggerHaptic(6);
                      setSimulatedOccupancyPct(presetVal);
                      setSelectedChamberIdx(1);
                    }}
                    className={`ios-press-bounce flex-1 rounded-xl py-1.5 font-mono text-xs font-bold transition-all cursor-pointer ${
                      simulatedOccupancyPct === presetVal
                        ? 'bg-[#EDEDED] text-[#111827]'
                        : 'bg-[#111827] text-[#9CA3AF] hover:text-[#EDEDED]'
                    }`}
                  >
                    {presetVal}%
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            INSTRUMENT 2: WAFFLE_MATRIX — TACTILE DOT GRID + C-ARC GAUGE (REF 5.3 + REF 3.1/3.2)
           ===================================================================== */}
        {activeKind === 'WAFFLE_MATRIX' && (
          <div className="space-y-4">
            {/* Interactive 4x5 Waffle Dot Matrix (Tapping any dot inspects that unit's gauges) */}
            <div className="rounded-[26px] bg-[#EDEDED] p-4 border border-[#9CA3AF]/45 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                    TOCA UN NODO DE LA MATRIZ (20 UNIDADES)
                  </span>
                  <p className="font-display text-sm font-extrabold text-[#111827]">
                    ● Sólido: Operativo ({category.availableUnits}) • ⊘ Achurado: Taller ({category.maintenanceUnits})
                  </p>
                </div>
                <span className="rounded-full bg-[#111827] px-2.5 py-1 font-mono text-xs font-extrabold text-[#EDEDED]">
                  #{selectedDotIdx + 1}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2.5 py-1">
                {waffleDots.map((dot) => {
                  const isSelected = dot.idx === selectedDotIdx;
                  return (
                    <button
                      key={dot.idx}
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        setSelectedDotIdx(dot.idx);
                      }}
                      aria-label={`Inspeccionar unidad ${dot.unit.plate}`}
                      className={`ios-press-bounce relative flex h-11 w-full items-center justify-center rounded-full transition-all cursor-pointer ${
                        dot.isHatched
                          ? 'bg-white bg-hatch-diagonal border-2 border-[#4B5563] text-[#111827]'
                          : 'bg-[#111827] text-[#EDEDED]'
                      } ${
                        isSelected
                          ? 'ring-3 ring-[#111827] ring-offset-2 ring-offset-[#EDEDED] scale-105 shadow-md'
                          : 'opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span className="font-mono text-[10px] font-black">
                        {dot.unit.plate.split('-')[1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Automotive Cluster Display: C-Arc Gauge (Ref 3.2) + Linear Range Bar (Ref 3.1) */}
            <div className="rounded-[28px] bg-[#111827] p-4 text-[#EDEDED] shadow-xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <span className="font-mono text-xs font-extrabold text-emerald-400">
                    {activeUnit.plate} • {activeUnit.code}
                  </span>
                  <h4 className="font-display text-base font-black text-[#EDEDED]">
                    {activeUnit.model}
                  </h4>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase ${
                    activeWaffleDot.isHatched
                      ? 'bg-[#1F2937] text-[#9CA3AF] border border-[#9CA3AF]/40'
                      : 'bg-[#EDEDED] text-[#111827]'
                  }`}
                >
                  {activeWaffleDot.isHatched ? 'En Taller' : 'Lista en Patio'}
                </span>
              </div>

              {/* Ref 3.2: C-Shaped Automotive Energy Arc (E -> F) + Ref 3.1 Linear Bar */}
              <div className="grid grid-cols-12 items-center gap-3">
                {/* Left: C-Arc Gauge E -> F (Ref 3 Top-Right) */}
                <div className="col-span-5 flex flex-col items-center justify-center rounded-2xl bg-[#1F2937]/80 p-3 border border-white/10">
                  <div className="relative h-28 w-28">
                    <svg viewBox="0 0 120 120" className="h-full w-full">
                      {/* E and F labels */}
                      <text x="26" y="104" fill="#9CA3AF" fontSize="10" fontWeight="700" fontFamily="monospace">
                        E
                      </text>
                      <text x="86" y="104" fill="#EDEDED" fontSize="10" fontWeight="700" fontFamily="monospace">
                        F
                      </text>
                      {/* Background C-Arc */}
                      <circle
                        cx="60"
                        cy="60"
                        r="42"
                        fill="none"
                        stroke="#111827"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="198 264"
                        transform="rotate(135 60 60)"
                      />
                      {/* Dynamic Energy Fill C-Arc */}
                      <circle
                        cx="60"
                        cy="60"
                        r="42"
                        fill="none"
                        stroke="#EDEDED"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${(activeUnit.energyPct / 100) * 198} 264`}
                        transform="rotate(135 60 60)"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-1">
                      <span className="font-display text-xl font-black text-[#EDEDED]">
                        {activeUnit.energyPct}%
                      </span>
                      <span className="font-mono text-[10px] font-bold text-[#9CA3AF]">
                        {activeUnit.rangeKm} km
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Ref 3.1 Linear Range Bar with Target Threshold Marker */}
                <div className="col-span-7 flex flex-col justify-between space-y-3 rounded-2xl bg-[#1F2937]/80 p-3.5 border border-white/10">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="block font-mono text-[10px] uppercase text-[#9CA3AF]">
                        AUTONOMÍA REAL
                      </span>
                      <span className="font-display text-2xl font-black text-[#EDEDED]">
                        {activeUnit.rangeKm}{' '}
                        <small className="font-mono text-xs font-semibold text-[#9CA3AF]">km</small>
                      </span>
                    </div>
                    <span className="font-mono text-sm font-extrabold text-[#EDEDED]">
                      {activeUnit.dailyRateFormatted}
                    </span>
                  </div>

                  {/* Thick Automotive Linear Bar with Vertical Marker Needle (Ref 3 Top-Left) */}
                  <div className="space-y-1.5">
                    <div className="relative h-6 w-full overflow-hidden rounded-xl bg-[#111827] p-1 border border-white/10">
                      <div
                        style={{ width: `${activeUnit.energyPct}%` }}
                        className={`h-full rounded-lg transition-all duration-500 ${
                          activeWaffleDot.isHatched
                            ? 'bg-hatch-diagonal-dark bg-[#4B5563]'
                            : 'bg-[#EDEDED]'
                        }`}
                      />
                      {/* Minimum Dispatch Threshold Marker Needle at 40% */}
                      <div
                        style={{ left: '40%' }}
                        className=" absolute inset-y-0 w-0.5 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]"
                        title="Umbral mínimo de despacho (40%)"
                      />
                    </div>
                    <div className="flex items-center justify-between font-mono text-[10px] text-[#9CA3AF]">
                      <span>0 km</span>
                      <span className="text-[#EDEDED]">Umbral 40%</span>
                      <span>420 km</span>
                    </div>
                  </div>

                  <p className="font-mono text-[10px] text-[#9CA3AF]">
                    Último peritaje: <strong className="text-[#EDEDED]">{activeUnit.lastInspectionLabel}</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            INSTRUMENT 3: RADIAL_HEALTH — 360° GYROSCOPE + L->H ARC (REF 3.3/3.4 + REF 2)
           ===================================================================== */}
        {activeKind === 'RADIAL_HEALTH' && (
          <div className="space-y-4">
            {/* Top Split: Ref 3.4 Radial Tick Inclinometer + Ref 3.3 L->H Maintenance Arc */}
            <div className="grid grid-cols-12 gap-3">
              {/* Left 7 Cols: Radial Tick Inclinometer with Tilting Vehicle Silhouette (Ref 3.4) */}
              <div className="col-span-7 flex flex-col items-center justify-between rounded-[26px] bg-[#1F2937] p-4 border border-white/10">
                <div className="flex w-full items-center justify-between font-mono text-[10px] text-[#9CA3AF]">
                  <span>INCLINÓMETRO R2</span>
                  <span className="text-[#EDEDED] font-bold">{activeSub.shortLabel}</span>
                </div>

                <div className="relative my-1 flex h-36 w-36 items-center justify-center">
                  <svg viewBox="0 0 120 120" className="h-full w-full">
                    {RADIAL_DIAL_TICKS.map((angle, idx) => {
                      const thresholdIdx = Math.round(
                        (activeSub.scorePct / 100) * RADIAL_DIAL_TICKS.length
                      );
                      const isActive = idx < thresholdIdx;
                      const isMajor = idx % 7 === 0;
                      return (
                        <line
                          key={angle}
                          x1="60"
                          y1={isMajor ? '6' : '9'}
                          x2="60"
                          y2="18"
                          stroke={isActive ? '#EDEDED' : '#4B5563'}
                          strokeWidth={isMajor ? '2.8' : '1.8'}
                          strokeLinecap="round"
                          transform={`rotate(${angle} 60 60)`}
                          className="transition-all duration-300"
                        />
                      );
                    })}
                    {/* Horizontal Horizon Reference Line (Ref 3.4) */}
                    <line
                      x1="20"
                      y1="60"
                      x2="100"
                      y2="60"
                      stroke="#4B5563"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                  </svg>

                  {/* Tilting Vehicle Rear/Front Silhouette inside Gyroscope (Ref 3.4) */}
                  <div
                    style={{ transform: `rotate(${activeSub.tiltDeg}deg)` }}
                    className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-500"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#EDEDED"
                      strokeWidth="1.9"
                      className="h-10 w-10 drop-shadow"
                    >
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <path d="M9 17h6" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                  </div>
                </div>

                {/* Ref 3.4 Bottom Readout: Roll / Score + max: 35° */}
                <div className="text-center">
                  <p className="font-display text-lg font-black text-[#EDEDED]">
                    {activeSub.scorePct}%{' '}
                    <span className="font-mono text-xs font-normal text-[#9CA3AF]">
                      ({activeSub.tiltDeg > 0 ? `+${activeSub.tiltDeg}°` : `${activeSub.tiltDeg}°`})
                    </span>
                  </p>
                  <p className="font-mono text-[10px] text-[#9CA3AF]">
                    {activeSub.pressureLabel}
                  </p>
                </div>
              </div>

              {/* Right 5 Cols: Semicircular L -> H Gauge (Ref 3.3) + 4 Circular Subsystem Buttons (Ref 2 Center) */}
              <div className="col-span-5 flex flex-col justify-between gap-2.5">
                {/* Ref 3.3 L -> H Arc Gauge */}
                <div className="flex flex-col items-center justify-between rounded-[24px] bg-[#1F2937] p-3 border border-white/10">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#9CA3AF]">
                    PRESIÓN L ➔ H
                  </span>
                  <svg viewBox="0 0 120 75" className="h-20 w-full">
                    <text x="12" y="68" fill="#9CA3AF" fontSize="11" fontWeight="700" fontFamily="monospace">
                      L
                    </text>
                    <text x="98" y="68" fill="#EDEDED" fontSize="11" fontWeight="700" fontFamily="monospace">
                      H
                    </text>
                    <path
                      d="M 20 55 A 40 40 0 0 1 100 55"
                      fill="none"
                      stroke="#111827"
                      strokeWidth="9"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 55 A 40 40 0 0 1 100 55"
                      fill="none"
                      stroke="#EDEDED"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${(activeSub.scorePct / 100) * 126} 126`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <span className="font-mono text-[10px] font-bold text-[#EDEDED]">
                    {activeSub.r2Captures} fotos R2
                  </span>
                </div>

                {/* Ref 2 Center: 4 Circular Vehicle Subsystem Controller Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  {GYRO_SUBSYSTEMS.map((sub, idx) => {
                    const isSelected = idx === selectedSubsystemIdx;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic(8);
                          setSelectedSubsystemIdx(idx);
                        }}
                        className={`ios-press-bounce flex flex-col items-center justify-center rounded-2xl p-2.5 text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EDEDED] text-[#111827] shadow-md font-extrabold'
                            : 'bg-[#1F2937] text-[#9CA3AF] border border-white/10 hover:text-[#EDEDED]'
                        }`}
                      >
                        <span className="font-mono text-xs font-black">{sub.scorePct}%</span>
                        <span className="mt-0.5 text-[10px] leading-tight">{sub.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Interactive Equalizer Waveform Strip (Ref 2 Bottom-Right — tap any bar to inspect hour) */}
            <div className="rounded-[24px] bg-[#1F2937] p-4 border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between font-mono text-[11px]">
                <span className="text-[#9CA3AF]">CADENCIA DE PERITAJES R2 (TOCA UNA HORA)</span>
                <span className="font-bold text-[#EDEDED]">
                  {7 + selectedHourBarIdx}:00h • {livePulse.cadenceBars[selectedHourBarIdx] ?? 75}% flujo
                </span>
              </div>
              <div className="flex h-14 items-end justify-between gap-1.5 pt-1">
                {livePulse.cadenceBars.map((barVal, idx) => {
                  const isBarSelected = idx === selectedHourBarIdx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Ver actividad hora ${7 + idx}:00`}
                      onClick={() => {
                        triggerHaptic(5);
                        setSelectedHourBarIdx(idx);
                      }}
                      style={{ height: `${Math.max(22, barVal)}%` }}
                      className={`flex-1 rounded-full transition-all cursor-pointer ${
                        isBarSelected
                          ? 'bg-emerald-400 scale-y-105 shadow-[0_0_10px_rgba(52,211,153,0.6)]'
                          : idx >= 4 && idx <= 9
                            ? 'bg-[#EDEDED]'
                            : 'bg-[#4B5563]'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            INSTRUMENT 4: CONTRACTS — CLOSED CIRCUIT RADAR & TIMELINE (REF 2.1 + 2.4 + 2.8)
           ===================================================================== */}
        {activeKind === 'CONTRACTS' && (
          <div className="space-y-4">
            {/* Top Widget: Closed-Circuit Track SVG (Ref 2.1 "Sector 2 / Lap 5") + Meter Remaining Ring (Ref 2.4) */}
            <div className="grid grid-cols-12 gap-3">
              {/* Closed Circuit Track SVG (8 cols) */}
              <div className="col-span-8 relative overflow-hidden rounded-[26px] bg-[#1F2937] p-4 border border-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-display text-lg font-black text-[#EDEDED] leading-none">
                      {activeContract.sector}
                    </span>
                    <span className="mt-1 block font-mono text-xs font-bold text-[#9CA3AF]">
                      {activeContract.lapLabel}
                    </span>
                  </div>
                  <span className="rounded-full bg-[#111827] px-2.5 py-1 font-mono text-[10px] font-bold text-emerald-400 border border-white/10">
                    {activeContract.plate}
                  </span>
                </div>

                {/* Grand-Prix / Urban Loop Track SVG (Ref 2 Top-Left) */}
                <svg viewBox="0 0 290 145" className="mt-2 h-32 w-full">
                  {/* Track Outer Shadow */}
                  <path
                    d="M 45 85 C 25 50, 65 22, 115 34 C 155 44, 185 18, 232 34 C 272 48, 268 106, 222 116 C 175 126, 148 96, 102 114 C 66 128, 58 108, 45 85 Z"
                    fill="none"
                    stroke="#111827"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Track Base Asphalt */}
                  <path
                    d="M 45 85 C 25 50, 65 22, 115 34 C 155 44, 185 18, 232 34 C 272 48, 268 106, 222 116 C 175 126, 148 96, 102 114 C 66 128, 58 108, 45 85 Z"
                    fill="none"
                    stroke="#4B5563"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Highlighted Active Sector Segment */}
                  <path
                    d="M 45 85 C 25 50, 65 22, 115 34 C 155 44, 185 18, 232 34 C 272 48, 268 106, 222 116 C 175 126, 148 96, 102 114 C 66 128, 58 108, 45 85 Z"
                    fill="none"
                    stroke="#EDEDED"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(activeContract.progressPct / 100) * 560} 600`}
                    className="transition-all duration-500"
                  />

                  {/* Interactive Vehicle Nodes on the Circuit */}
                  {CIRCUIT_CONTRACTS.map((ctr, idx) => {
                    const isSelected = idx === selectedCircuitIdx;
                    return (
                      <g
                        key={ctr.id}
                        onClick={() => {
                          triggerHaptic(8);
                          setSelectedCircuitIdx(idx);
                        }}
                        className="cursor-pointer"
                      >
                        {isSelected && (
                          <circle
                            cx={ctr.trackCoord.x}
                            cy={ctr.trackCoord.y}
                            r="15"
                            fill="#EDEDED"
                            fillOpacity="0.22"
                          />
                        )}
                        <circle
                          cx={ctr.trackCoord.x}
                          cy={ctr.trackCoord.y}
                          r={isSelected ? '9' : '6'}
                          fill={isSelected ? '#EDEDED' : '#111827'}
                          stroke="#EDEDED"
                          strokeWidth="2.5"
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Right 4 Cols: Ref 2.4 "Meter Remaining 1:36" Circular Countdown Widget */}
              <div className="col-span-4 flex flex-col items-center justify-between rounded-[26px] bg-[#1F2937] p-3.5 border border-white/10 text-center">
                <span className="font-mono text-[10px] font-bold uppercase text-[#9CA3AF]">
                  Tiempo Restante
                </span>

                <div className="relative my-1 flex h-24 w-24 items-center justify-center">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#111827"
                      strokeWidth="9"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      fill="none"
                      stroke="#EDEDED"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={`${(activeContract.progressPct / 100) * 238.6} 238.6`}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-lg font-black text-[#EDEDED]">
                      {activeContract.remainingTime}
                    </span>
                    <span className="font-mono text-[9px] text-[#9CA3AF]">HRS</span>
                  </div>
                </div>

                <span className="font-mono text-[10px] font-bold text-[#EDEDED]">
                  ETA {activeContract.etaLabel}
                </span>
              </div>
            </div>

            {/* Selector Pills for Active Vehicles on Circuit */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {CIRCUIT_CONTRACTS.map((ctr, idx) => {
                const isSelected = idx === selectedCircuitIdx;
                return (
                  <button
                    key={ctr.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(6);
                      setSelectedCircuitIdx(idx);
                    }}
                    className={`ios-press-bounce shrink-0 rounded-2xl px-3.5 py-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EDEDED] text-[#111827] font-bold shadow-sm'
                        : 'bg-[#1F2937] text-[#9CA3AF] border border-white/10'
                    }`}
                  >
                    <span className="block font-mono text-xs font-extrabold">{ctr.plate}</span>
                    <span className="block text-[10px] opacity-80">{ctr.sector}</span>
                  </button>
                );
              })}
            </div>

            {/* Ref 2.8: Live Route Timeline Widget ("Entrega R2 -> En Ruta -> Retorno Patio") */}
            <div className="rounded-[24px] bg-[#1F2937] p-4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display text-sm font-extrabold text-[#EDEDED]">
                    {activeContract.model}
                  </span>
                  <span className="block text-[11px] text-[#9CA3AF]">
                    Progreso lineal de contrato • Retorno estimado {activeContract.etaLabel}
                  </span>
                </div>
                <span className="font-mono text-xs font-black text-[#EDEDED]">
                  {activeContract.progressPct}%
                </span>
              </div>

              {/* Route Progress Bar with Checkpoints (Ref 2 Bottom-Left) */}
              <div className="relative pt-2 pb-1">
                <div className="h-2 w-full rounded-full bg-[#111827]" />
                <div
                  style={{ width: `${activeContract.progressPct}%` }}
                  className="absolute top-2 left-0 h-2 rounded-full bg-[#EDEDED] transition-all duration-500"
                />
                <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-[#9CA3AF]">
                  <span className="text-[#EDEDED] font-bold">● Salida R2</span>
                  <span className={activeContract.progressPct >= 50 ? 'text-[#EDEDED] font-bold' : ''}>
                    ● {activeContract.sector}
                  </span>
                  <span>🏁 Patio {activeContract.etaLabel}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            INSTRUMENT 5: CASH — POLAR HATCHED WHEEL & MOUNTAIN NEEDLE (REF 5.4 + 5.2)
           ===================================================================== */}
        {activeKind === 'CASH' && (
          <div className="space-y-4">
            {/* Top Centerpiece: Interactive Concentric Polar Rose Chart with +62.3° Hatching (Ref 5.4) */}
            <div className="grid grid-cols-12 items-center gap-3 rounded-[28px] bg-[#EDEDED] p-4 border border-[#9CA3AF]/45">
              {/* Left 7 Cols: Interactive SVG Polar Wheel */}
              <div className="col-span-7 flex items-center justify-center">
                <svg viewBox="0 0 200 200" className="h-44 w-44">
                  <defs>
                    <pattern
                      id="swissHatchModal"
                      width="7"
                      height="7"
                      patternTransform="rotate(62.3)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="7"
                        stroke="#111827"
                        strokeWidth="1.6"
                        strokeOpacity="0.55"
                      />
                    </pattern>
                  </defs>

                  {/* Outer Dashed Guide Ring (Ref 5.4) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="86"
                    fill="none"
                    stroke="#9CA3AF"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Concentric Hatched Reference Ring (Ref 5.4) */}
                  <circle
                    cx="100"
                    cy="100"
                    r="68"
                    fill="url(#swissHatchModal)"
                    stroke="#111827"
                    strokeWidth="1.2"
                  />

                  {/* Interactive Polar Rose Sectors */}
                  {livePulse.polarSectors.map((sec, idx) => {
                    const cfg = polarAngles[idx] ?? polarAngles[0]!;
                    const isSelected = idx === selectedPolarIdx;
                    const outerR = isSelected ? cfg.baseOuter + 10 : cfg.baseOuter;
                    const fillStyle =
                      idx === 0
                        ? '#111827'
                        : idx === 1
                          ? 'url(#swissHatchModal)'
                          : '#4B5563';

                    return (
                      <path
                        key={sec.id}
                        d={polarSectorPath(100, 100, 26, outerR, cfg.start, cfg.end)}
                        fill={fillStyle}
                        stroke="#FFFFFF"
                        strokeWidth="2.5"
                        onClick={() => {
                          triggerHaptic(8);
                          setSelectedPolarIdx(idx);
                        }}
                        className="cursor-pointer transition-all duration-300"
                      />
                    );
                  })}

                  {/* Inner Core Hole with Selected Share % */}
                  <circle
                    cx="100"
                    cy="100"
                    r="26"
                    fill="#FFFFFF"
                    stroke="#111827"
                    strokeWidth="2"
                  />
                  <text
                    x="100"
                    y="104"
                    textAnchor="middle"
                    fill="#111827"
                    fontSize="13"
                    fontWeight="900"
                    fontFamily="monospace"
                  >
                    {activePolarSector.sharePct}%
                  </text>
                </svg>
              </div>

              {/* Right 5 Cols: Interactive Sector Callout Switcher */}
              <div className="col-span-5 flex flex-col justify-between space-y-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                  TOCA UN SECTOR
                </span>
                {livePulse.polarSectors.map((sec, idx) => {
                  const isSelected = idx === selectedPolarIdx;
                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic(6);
                        setSelectedPolarIdx(idx);
                      }}
                      className={`ios-press-bounce rounded-2xl p-2.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#111827] text-[#EDEDED] shadow-md'
                          : 'bg-white text-[#111827] border border-[#9CA3AF]/40'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-xs font-black">
                        <span>{sec.sharePct}%</span>
                        <span>{sec.amountFormatted}</span>
                      </div>
                      <p
                        className={`mt-0.5 truncate text-[10px] font-semibold ${
                          isSelected ? 'text-[#9CA3AF]' : 'text-[#4B5563]'
                        }`}
                      >
                        {sec.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Centerpiece: Mountain Silhouette + 85% Horizontal Pill with Pin Needle (Ref 5.2) */}
            <div className="rounded-[26px] bg-white p-4 border border-[#9CA3AF]/45 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">
                    META DE LIQUIDEZ EN TURNO
                  </span>
                  <h4 className="font-display text-base font-extrabold text-[#111827]">
                    {category.cashShiftFormatted} recaudados hoy
                  </h4>
                </div>
                {/* Hatched Architectural Circle from Ref 5.2 */}
                <span className="h-8 w-8 rounded-full bg-hatch-diagonal border-2 border-[#111827]" />
              </div>

              {/* Stepped Mountain Silhouette SVG (Ref 5.2 Top-Right) */}
              <svg viewBox="0 0 320 70" className="h-16 w-full overflow-visible">
                <path
                  d="M 0 68 L 0 42 L 45 28 L 85 45 L 140 12 L 195 36 L 245 18 L 295 38 L 320 26 L 320 68 Z"
                  fill="#111827"
                />
                <path
                  d="M 60 68 L 115 32 L 165 48 L 220 22 L 275 44 L 320 34 L 320 68 Z"
                  fill="#9CA3AF"
                  fillOpacity="0.55"
                />
              </svg>

              {/* Horizontal Pill Bar with 85% + Vertical Pin Needle (Ref 5.2) */}
              <div className="relative pt-2">
                <div className="flex h-10 w-full items-center overflow-hidden rounded-full bg-[#EDEDED] border border-[#111827]/20 p-1">
                  <div
                    style={{ width: `${Math.min(94, Math.max(65, category.occupancyPct))}%` }}
                    className="flex h-full items-center rounded-full bg-[#111827] px-4 font-display text-sm font-black text-[#EDEDED] transition-all duration-500"
                  >
                    {category.occupancyPct}%
                  </div>
                </div>
                {/* Vertical Needle Pin at Target (85%) */}
                <div
                  style={{ left: '85%' }}
                  className="pointer-events-none absolute -top-1 bottom-0 flex flex-col items-center"
                >
                  <span className="h-3 w-3 rounded-full bg-[#111827] ring-2 ring-white" />
                  <span className="h-full w-0.5 bg-[#111827]" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Thumb-Zone Operational Action CTA */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={() => {
              triggerHaptic(10);
              const targetRoute =
                activeKind === 'CASH'
                  ? '/admin/caja'
                  : activeKind === 'CONTRACTS'
                    ? '/admin/reservas'
                    : activeKind === 'RADIAL_HEALTH'
                      ? '/admin/operaciones'
                      : '/admin/flota';
              onClose();
              navigate(targetRoute);
            }}
            className={`ios-press-bounce flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-extrabold shadow-md cursor-pointer ${
              isDarkInstrument
                ? 'bg-[#EDEDED] text-[#111827]'
                : 'bg-[#111827] text-[#EDEDED]'
            }`}
          >
            <span>
              {activeKind === 'OCCUPANCY' && 'Gestionar Disponibilidad en Flota'}
              {activeKind === 'WAFFLE_MATRIX' && `Abrir Ficha de ${activeUnit.plate}`}
              {activeKind === 'RADIAL_HEALTH' && 'Abrir Inspecciones Periciales R2'}
              {activeKind === 'CONTRACTS' && 'Ver Tablero de Contratos y Reservas'}
              {activeKind === 'CASH' && 'Ir a Arqueo y Liquidación de Caja'}
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-4 w-4"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
