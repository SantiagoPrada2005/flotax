export type MetricTimeRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1A';

export type MetricDrilldownPeriod = 'main' | 'weekly' | 'monthly' | 'yearly';

export type MetricDrilldownSubDay = '2D' | '4D' | '5D' | '6D' | '7D';

export type FleetCategoryFilter = 'ALL' | 'AUTOS' | 'MOTOS' | 'SCOOTERS' | 'UTILITARIOS';

export type PrimaryMetricMode = 'REVENUE' | 'OCCUPANCY';

export type ActiveLensMode = 'BENTO' | 'MOVEMENTS';

export interface SplineDataPoint {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly normalizedY: number; // 0..100
  readonly amountFormatted: string;
  readonly badgeLabel: string;
  readonly contractsCount: number;
  readonly occupancyPct: number;
  readonly r2Inspections: number;
}

export interface FleetCategorySummary {
  readonly id: FleetCategoryFilter;
  readonly label: string;
  readonly shortBadge: string;
  readonly subtitle: string;
  readonly totalUnits: number;
  readonly activeUnits: number;
  readonly availableUnits: number;
  readonly maintenanceUnits: number;
  readonly occupancyPct: number;
  readonly availabilityPct: number;
  readonly totalBalanceFormatted: string;
  readonly activeContractsFormatted: string;
  readonly cashShiftFormatted: string;
  readonly trendFormatted: string;
  readonly bonusEfficiencyFormatted: string;
}

export interface WaffleUnitNode {
  readonly id: string;
  readonly code: string;
  readonly plate: string;
  readonly model: string;
  readonly category: Exclude<FleetCategoryFilter, 'ALL'>;
  readonly status: 'EN_ALQUILER' | 'DISPONIBLE' | 'MANTENIMIENTO';
  readonly energyPct: number;
  readonly rangeKm: number;
  readonly dailyRateFormatted: string;
  readonly lastInspectionLabel: string;
}

export interface ShiftMovementItem {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly unitPlate: string;
  readonly category: Exclude<FleetCategoryFilter, 'ALL'>;
  readonly kind: 'INGRESO' | 'GASTO' | 'GARANTIA';
  readonly amountFormatted: string;
  readonly timeLabel: string;
  readonly dayBucket: 'HOY' | 'SEMANA' | 'MES';
  readonly r2EvidenceCount: number;
  readonly contractCode: string;
}

export interface LiveTelemetryPulse {
  readonly inspectionCompliancePct: number;
  readonly r2PhotosToday: number;
  readonly avgCheckinMinutes: number;
  readonly nextReturnEtaLabel: string;
  readonly nextReturnPlate: string;
  readonly cadenceBars: readonly number[];
  readonly polarSectors: readonly {
    readonly id: string;
    readonly label: string;
    readonly sharePct: number;
    readonly amountFormatted: string;
    readonly hatched: boolean;
  }[];
}

export interface YardMetricsSnapshot {
  readonly yardName: string;
  readonly cityLabel: string;
  readonly operatorName: string;
  readonly operatorRole: string;
  readonly timezone: string;
  readonly dateLabel: string;
  readonly categories: readonly FleetCategorySummary[];
  readonly seriesByRange: Readonly<Record<MetricTimeRange, readonly SplineDataPoint[]>>;
  readonly unitsMatrix: readonly WaffleUnitNode[];
  readonly movements: readonly ShiftMovementItem[];
  readonly livePulse: LiveTelemetryPulse;
}
