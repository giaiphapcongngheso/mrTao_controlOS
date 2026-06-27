import React from 'react';
import type { PriorityStatus, PlanStatus, DaySlotStatus } from '../../../types/plans.types';
import { PRIORITY_STATUS_CONFIG, PLAN_STATUS_CONFIG, DAY_SLOT_STATUS_CONFIG } from '../constants/plan-constants';

interface PlanStatusBadgeProps {
  status: PlanStatus;
  size?: 'sm' | 'md';
}

/**
 * Badge for plan document status (draft, active, completed, archived).
 */
const PlanStatusBadge = React.memo(function PlanStatusBadge({ status, size = 'sm' }: PlanStatusBadgeProps) {
  const config = PLAN_STATUS_CONFIG[status];
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center font-bold rounded-lg ${config.bgColor} ${config.color} ${sizeClasses}`}>
      {config.label}
    </span>
  );
});

interface PriorityStatusBadgeProps {
  status: PriorityStatus;
  size?: 'sm' | 'md';
}

/**
 * Badge for priority item status with colored dot indicator.
 */
const PriorityStatusBadge = React.memo(function PriorityStatusBadge({ status, size = 'sm' }: PriorityStatusBadgeProps) {
  const config = PRIORITY_STATUS_CONFIG[status];
  const sizeClasses = size === 'sm'
    ? 'text-[10px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 font-bold rounded-lg ${config.bgColor} ${config.color} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      {config.label}
    </span>
  );
});

interface DaySlotStatusBadgeProps {
  status: DaySlotStatus;
}

/**
 * Badge for day schedule slot status.
 */
const DaySlotStatusBadge = React.memo(function DaySlotStatusBadge({ status }: DaySlotStatusBadgeProps) {
  const config = DAY_SLOT_STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-lg ${config.bgColor} ${config.color}`}>
      {config.label}
    </span>
  );
});

export { PlanStatusBadge, PriorityStatusBadge, DaySlotStatusBadge };
