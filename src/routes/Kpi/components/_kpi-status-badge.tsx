import React from 'react';
import { getKpiStatus } from '../kpi-utils';

interface KpiStatusBadgeProps {
  actual: number;
  pct: number;
}

export const KpiStatusBadge = React.memo(function KpiStatusBadge({
  actual,
  pct,
}: KpiStatusBadgeProps) {
  const { text, colorClass } = getKpiStatus(actual, pct);
  return (
    <span className={`inline-block text-sm font-bold px-2 py-0.5 rounded-lg border ${colorClass}`}>
      {text}
    </span>
  );
});
