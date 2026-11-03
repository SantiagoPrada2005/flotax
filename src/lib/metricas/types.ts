export type DailyMovementKind = 'INGRESO' | 'EGRESO';

export type DailyMovementFilter = 'TODOS' | 'INGRESO' | 'EGRESO';

export type DailyCurveSeriesFilter = 'AMBAS' | 'SOLO_INGRESOS' | 'SOLO_EGRESOS';

export type MetricsFocusView =
  | 'OVERVIEW'
  | 'EARNINGS_FLEET'
  | 'MONTHLY_OCCUPANCY'
  | 'DAILY_MOVEMENTS';

export type ProgressiveSectionId =
  | 'DAILY_EARNINGS'
  | 'RENTED_AUTOS'
  | 'MONTHLY_OCCUPANCY'
  | 'DAILY_MOVEMENTS';

export interface VehicleEarningsCategorySlice {
  readonly id: string;
  readonly label: string;
  readonly rentedCount: number;
  readonly amount: number;
  readonly amountFormatted: string;
  readonly sharePct: number;
}

export interface HourlyEarningsSlot {
  readonly id: string;
  readonly hourLabel: string;
  readonly amount: number;
  readonly amountFormatted: string;
  readonly compactFormatted: string;
  readonly heightPct: number;
  readonly operationsCount: number;
}

export interface DailyVehicleEarningsSummary {
  readonly todayEarnings: number;
  readonly todayEarningsFormatted: string;
  readonly todayEarningsCompactFormatted: string;
  readonly dailyAverage: number;
  readonly dailyAverageFormatted: string;
  readonly variationPct: number;
  readonly variationLabel: string;
  readonly contributingVehiclesCount: number;
  readonly averagePerVehicleFormatted: string;
  readonly byCategory: readonly VehicleEarningsCategorySlice[];
  readonly hourlySlots: readonly HourlyEarningsSlot[];
}

export interface MonthlyOccupancyPoint {
  readonly id: string;
  readonly monthShort: string;
  readonly monthFull: string;
  readonly isCurrentMonth: boolean;
  readonly reservationsCount: number;
  readonly occupancyPct: number;
  readonly earnings: number;
  readonly earningsFormatted: string;
  readonly earningsCompactFormatted: string;
  readonly avgReservationFormatted: string;
}

export interface MonthlyFleetOccupancySummary {
  readonly currentMonthLabel: string;
  readonly currentOccupancyPct: number;
  readonly targetOccupancyPct: number;
  readonly currentMonthReservations: number;
  readonly currentMonthEarnings: number;
  readonly currentMonthEarningsFormatted: string;
  readonly sixMonthTotalReservations: number;
  readonly sixMonthTotalEarningsFormatted: string;
  readonly bestMonthLabel: string;
  readonly months: readonly MonthlyOccupancyPoint[];
}

export interface RentedAutomobileItem {
  readonly id: string;
  readonly plate: string;
  readonly brandModel: string;
  readonly categoryLabel: string;
  readonly transmissionLabel: string;
  readonly fuelLabel: string;
  readonly dailyRate: number;
  readonly dailyRateFormatted: string;
  readonly clientName: string;
  readonly returnLabel: string;
  readonly contractCode: string;
  readonly daysActive: number;
}

export interface RentedFleetComplement {
  readonly rentedAutomobilesCount: number;
  readonly totalAutomobilesCount: number;
  readonly automobilesOccupancyPct: number;
  readonly availableAutomobilesCount: number;
  readonly maintenanceAutomobilesCount: number;
  readonly otherRentedUnitsCount: number;
  readonly totalFleetCount: number;
  readonly activeDailyRunRateFormatted: string;
  readonly rentedAutomobiles: readonly RentedAutomobileItem[];
}

export interface DailyCompanyMovementItem {
  readonly id: string;
  readonly kind: DailyMovementKind;
  readonly title: string;
  readonly categoryLabel: string;
  readonly timeLabel: string;
  readonly amount: number;
  readonly amountFormatted: string;
  readonly vehiclePlate: string | null;
  readonly paymentMethodLabel: string;
  readonly referenceCode: string | null;
  readonly notes: string;
}

export interface DailyMovementCurvePoint {
  readonly id: string;
  readonly dateKey: string;
  readonly label: string;
  readonly isToday: boolean;
  readonly income: number;
  readonly incomeFormatted: string;
  readonly incomeCompactFormatted: string;
  readonly expense: number;
  readonly expenseFormatted: string;
  readonly expenseCompactFormatted: string;
  readonly netBalance: number;
  readonly netBalanceFormatted: string;
}

export interface DailyMovementsSummary {
  readonly dateLabel: string;
  readonly totalIncome: number;
  readonly totalIncomeFormatted: string;
  readonly totalIncomeCompactFormatted: string;
  readonly totalExpense: number;
  readonly totalExpenseFormatted: string;
  readonly totalExpenseCompactFormatted: string;
  readonly netDailyBalance: number;
  readonly netDailyBalanceFormatted: string;
  readonly netDailyBalanceCompactFormatted: string;
  readonly incomeSharePct: number;
  readonly incomeCount: number;
  readonly expenseCount: number;
  readonly curvePoints: readonly DailyMovementCurvePoint[];
  readonly items: readonly DailyCompanyMovementItem[];
}

export interface YardMetricsSnapshot {
  readonly yardName: string;
  readonly cityLabel: string;
  readonly operatorName: string;
  readonly timezone: string;
  readonly dateLabel: string;
  readonly dailyEarnings: DailyVehicleEarningsSummary;
  readonly monthlyOccupancy: MonthlyFleetOccupancySummary;
  readonly rentedFleet: RentedFleetComplement;
  readonly dailyMovements: DailyMovementsSummary;
}
