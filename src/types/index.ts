// Process step types
export type ProcessType = "AS_IS" | "TO_BE";
export type RolloutModel = "LINEAR" | "S_CURVE" | "INSTANT";

export interface ProcessStep {
  id: string;
  calculationId: string;
  type: ProcessType;
  order: number;
  name: string;
  employee: string;
  hourlyRate: number;
  timeHours: number;
  calendarDays: number;
  executionShare: number;
  // computed (client-side)
  stepCost?: number;
  unitTime?: number;
  unitCost?: number;
}

export interface ErrorItem {
  id: string;
  calculationId: string;
  type: ProcessType;
  order: number;
  name: string;
  processStep: string;
  frequency: number;
  fixCost: number;
  fixTimeHours: number;
  // computed (client-side)
  unitErrorCost?: number;
  unitErrorTime?: number;
}

export interface RolloutConfig {
  id: string;
  calculationId: string;
  model: RolloutModel;
  rolloutMonths: number;
  targetShare: number;
  operationsPerMonth: number;
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
  processSteps: ProcessStep[];
  errorItems: ErrorItem[];
  capexItems: CapexItem[];
  opexItems: OpexItem[];
  rolloutConfig?: RolloutConfig | null;
}

// Template types (without cost fields)
export interface Template {
  id: string;
  name: string;
  description: string;
  industry: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  processSteps: TemplateProcessStep[];
  errorItems: TemplateErrorItem[];
  capexItems: TemplateCapexItem[];
  opexItems: TemplateOpexItem[];
  rolloutConfig?: TemplateRolloutConfig | null;
}

export interface TemplateProcessStep {
  id: string;
  templateId: string;
  type: ProcessType;
  order: number;
  name: string;
  employee: string;
  timeHours?: number | null;
  calendarDays?: number | null;
  executionShare?: number | null;
}

export interface TemplateErrorItem {
  id: string;
  templateId: string;
  type: ProcessType;
  order: number;
  name: string;
  processStep: string;
  frequency?: number | null;
}

export interface TemplateCapexItem {
  id: string;
  templateId: string;
  order: number;
  name: string;
  comment?: string | null;
}

export interface TemplateOpexItem {
  id: string;
  templateId: string;
  order: number;
  name: string;
  comment?: string | null;
}

export interface TemplateRolloutConfig {
  id: string;
  templateId: string;
  model: RolloutModel;
  rolloutMonths?: number | null;
  targetShare?: number | null;
}

// ROI calculation result types
export interface MonthlyData {
  month: number;
  rolloutShare: number;
  operationsWithAI: number;
  processSavings: number;
  errorSavings: number;
  totalBenefit: number;
  opexCost: number;
  netBenefit: number;
  cumulativeBenefit: number;
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
}

// API response types
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
}

// Calculation list item (for localStorage/my calculations page)
export interface CalculationListItem {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
