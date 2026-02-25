// Position (job title with hourly rate) for autocomplete
export interface Position {
  id: string;
  userId: string;
  name: string;
  hourlyRate: number;
  order: number;
}

// Process step types
export type ProcessType = "AS_IS" | "TO_BE";
export type RolloutModel = "LINEAR" | "S_CURVE" | "INSTANT";
export type GrowthType = "COMPOUND" | "LINEAR_ABS";
export type TimeUnit = "hours" | "minutes";
export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProcessStep {
  id: string;
  calculationId: string;
  type: ProcessType;
  order: number;
  name: string;
  employee: string;
  hourlyRate: number;
  timeHours: number;
  timeUnit: TimeUnit;
  calendarDays: number;
  executionShare: number;
  extraCost: number;
  // computed (client-side)
  stepCost?: number;
  unitTime?: number;
  unitCost?: number;
  unitCalendarDays?: number;
}

export interface ErrorItem {
  id: string;
  calculationId: string;
  type: ProcessType;
  order: number;
  name: string;
  employee: string;
  hourlyRate: number;
  timeHours: number;
  timeUnit: TimeUnit;
  calendarDays: number;
  extraCost: number;
  frequency: number;
  // computed (client-side)
  riskCost?: number;
  unitErrorCost?: number;
  unitErrorTime?: number;
  unitCalendarDays?: number;
}

export interface RolloutConfig {
  id: string;
  calculationId: string;
  model: RolloutModel;
  rolloutMonths: number;
  targetShare: number;
  operationsPerMonth: number;
  growthEnabled: boolean;
  growthType: GrowthType;
  growthRate: number;
  growthCeiling: number | null;
}

export interface CapexItem {
  id: string;
  calculationId: string;
  order: number;
  name: string;
  amount: number;
  comment?: string | null;
}

export interface OpexItem {
  id: string;
  calculationId: string;
  order: number;
  name: string;
  monthlyAmount: number;
  comment?: string | null;
}

export interface Calculation {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  templateId?: string | null;
  userId?: string | null;
  isTemplate?: boolean;
  description?: string;
  industry?: string;
  isPublished?: boolean;
  processSteps: ProcessStep[];
  errorItems: ErrorItem[];
  capexItems: CapexItem[];
  opexItems: OpexItem[];
  rolloutConfig?: RolloutConfig | null;
}

// Template is now a Calculation with isTemplate = true
export type Template = Calculation;

// ROI calculation result types
export interface MonthlyData {
  month: number;
  rolloutShare: number;
  operationsThisMonth: number;
  operationsWithAI: number;
  processSavings: number;
  errorSavings: number;
  totalBenefit: number;
  opexCost: number;
  netBenefit: number;
  cumulativeBenefit: number;
  cumulativeGrossBenefit: number;
  cumulativeCosts: number;
  roi: number;
}

export interface RoiResult {
  monthlyData: MonthlyData[];
  breakEvenMonth: number | null;
  totalCapex: number;
  totalOpexPerMonth: number;
  processSavingsPerOperation: number;
  errorSavingsPerOperation: number;
  totalSavingsPerOperation: number;
  timeSavingsPerOperation: number;
  roi12months: number;
  roi24months: number;
  annualSavings: number;
  // Scale metrics: benefit at full rollout (steady-state month)
  operationsAtFullRollout: number;
  monthlyBenefitAtFullRollout: number;
  // Productivity multipliers (AS-IS / TO-BE ratios)
  timeMultiplier: number | null;
  costMultiplier: number | null;
  calendarMultiplier: number | null;
  asisUnitTime: number;
  tobeUnitTime: number;
  asisUnitCost: number;
  tobeUnitCost: number;
  asisCalendarDays: number;
  tobeCalendarDays: number;
  // Calendar days for risks (expected delay = calendarDays × frequency)
  asisErrorCalendarDays: number;
  tobeErrorCalendarDays: number;
  // Total cycle days (process + risk delays)
  asisTotalCycleDays: number;
  tobeTotalCycleDays: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

// Calculation list item (for my calculations page)
export interface CalculationListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Admin calculations list item
export interface CalculationAdminListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
  userEmail?: string | null;
}
