import type { PlanDocument, PlanRequestType, PlanDaySchedule, PlanDayScheduleRequest, PlanLiveIndicator, PlanLiveIndicatorRequest } from '../types/plans.types';
import { createBaseService } from '../shared/services/create-base-service';
import { RESOURCE_PATH } from '../constants/resource-paths';
import { dataClient } from './data-client';

/**
 * Main plans service — maps to Firestore 'plans' collection.
 * Each document = one plan (quarter / month / week / day).
 */
export const plansService = createBaseService<PlanDocument, PlanRequestType>({
  client: dataClient,
  resource: RESOURCE_PATH.PLANS,
  autoLog: { target: 'Kế hoạch' },
});

/**
 * Day schedule service — maps to Firestore 'plan_day_schedules' collection.
 * Each document = one day's schedule (time slots + MIT tasks).
 */
export const planDayScheduleService = createBaseService<PlanDaySchedule, PlanDayScheduleRequest>({
  client: dataClient,
  resource: RESOURCE_PATH.PLAN_DAY_SCHEDULES,
  autoLog: { target: 'Lịch kế hoạch ngày' },
});

/**
 * Live indicators service — maps to Firestore 'plan_live_indicators' collection.
 * Real-time metrics displayed on dashboard (revenue, lead count, etc.).
 */
export const planLiveIndicatorService = createBaseService<PlanLiveIndicator, PlanLiveIndicatorRequest>({
  client: dataClient,
  resource: RESOURCE_PATH.PLAN_LIVE_INDICATORS,
  autoLog: { target: 'Chỉ số sống kế hoạch' },
});
