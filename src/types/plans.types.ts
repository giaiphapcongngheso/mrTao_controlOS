import type { BaseEntity } from './base.types';

// ─── Plan Level & Status Enums ───────────────────────────────────────────────

export type PlanLevel = 'quarter' | 'month' | 'week' | 'day';

export type PlanStatus = 'draft' | 'active' | 'completed' | 'archived';

export type PriorityStatus = 'not_started' | 'in_progress' | 'warning' | 'completed';

export type ReviewFrequency = 'daily' | 'weekly' | 'monthly';

export type DeviationAction = 'adjust_plan' | 'escalate' | 'custom';

export type DaySlotStatus = 'not_started' | 'in_progress' | 'completed' | 'pending_review';

// ─── Plan Priority ───────────────────────────────────────────────────────────

export interface PlanPriority {
  id: string;
  order: number;
  title: string;
  expectedResult: string;
  deadline: string;
  ownerId: string;
  ownerName: string;
  progress: number; // 0-100
  status: PriorityStatus;
  linkedTaskIds?: string[];
}

// ─── Custom Target ───────────────────────────────────────────────────────────

export interface PlanCustomTarget {
  label: string;
  value: string;
}

// ─── Linked Modules Config ───────────────────────────────────────────────────

export interface PlanLinkedModules {
  checklist: boolean;
  tasks: boolean;
  kpi: boolean;
  reports: boolean;
}

// ─── Main Plan Document ──────────────────────────────────────────────────────

export interface PlanDocument extends BaseEntity {
  storeId: string;

  // General info (Step 1)
  name: string;
  level: PlanLevel;
  department?: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date

  // Target results (Step 2)
  description?: string;
  revenueTarget?: number;        // VND
  profitMarginTarget?: number;   // %
  customTargets?: PlanCustomTarget[];

  // Priorities (Step 3)
  priorities: PlanPriority[];

  // Review setup (Step 4)
  reviewFrequency: ReviewFrequency;
  reviewerId: string;
  reviewerName: string;
  alertThreshold: number;        // % target to trigger warning (e.g. 80)
  deviationAction: DeviationAction;

  // Module links (Step 5)
  linkedModules: PlanLinkedModules;

  // Computed / status
  status: PlanStatus;
  progress: number;              // 0-100, auto-calculated from priorities

  // Hierarchy
  parentPlanId?: string;         // Quarter → Month → Week → Day chain

  // Quarter-specific fields
  quarterLabel?: string;         // "Q3/2026"
  leveragePoints?: string[];     // 3 đòn bẩy 20/80
  battleTargets?: string[];      // 3 trận đánh Q
}

// ─── Request Type for CRUD ───────────────────────────────────────────────────

export type PlanRequestType = Partial<Omit<PlanDocument, 'id' | 'createdAt'>>;

// ─── Day Schedule (Kế hoạch ngày theo khung giờ) ─────────────────────────────

export interface PlanTimeSlot {
  id: string;
  time: string;                  // "08:00", "09:30"
  task: string;
  assigneeId: string;
  assigneeName: string;
  expectedResult: string;
  status: DaySlotStatus;
  linkedModules?: string[];      // ["KPI", "Công việc"]
}

export interface PlanMITTask {
  id: string;
  order: number;
  title: string;
  description: string;
}

export interface PlanDaySchedule extends BaseEntity {
  storeId: string;
  planId: string;                // Linked to week plan
  date: string;                  // YYYY-MM-DD
  timeSlots: PlanTimeSlot[];
  mitTasks: PlanMITTask[];
  quickNotes?: string[];
}

export type PlanDayScheduleRequest = Partial<Omit<PlanDaySchedule, 'id' | 'createdAt'>>;

// ─── Live Indicators (Chỉ số sống) ──────────────────────────────────────────

export type IndicatorStatus = 'above_target' | 'near_target' | 'below_target';

export interface PlanLiveIndicator extends BaseEntity {
  storeId: string;
  planId: string;
  name: string;                  // "Doanh thu ngày"
  icon?: string;                 // lucide icon name
  targetValue: number;
  currentValue: number;
  unit: string;                  // "triệu", "%", "lead"
  status: IndicatorStatus;
  ownerId: string;
  ownerName: string;
}

export type PlanLiveIndicatorRequest = Partial<Omit<PlanLiveIndicator, 'id' | 'createdAt'>>;

// ─── Week Review Status ──────────────────────────────────────────────────────

export interface WeekReviewEntry {
  weekNumber: number;            // 1, 2, 3, 4
  dateRange: string;             // "01/07 - 05/07"
  label: string;                 // "Đúng tiến độ", "Cần chú ý"
  status: 'on_track' | 'attention' | 'behind' | 'not_reviewed';
  notes?: string;
}
