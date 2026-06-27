import React, { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '../../../../share/ui/card';
import type { PlanAlert } from '../_hooks/use-plan-metrics';

interface PlanAlertBannerProps {
  alerts: PlanAlert[];
}

/**
 * Red/amber alert banner shown when plan has warnings.
 * Matches mockup "Cảnh báo cần xử lý" section.
 * Premium design utilizing Card, animate-pulse icon and soft color styling.
 */
const PlanAlertBanner = React.memo(function PlanAlertBanner({ alerts }: PlanAlertBannerProps) {
  if (!alerts.length) return null;

  // Determine severity to apply custom color theme
  const hasCritical = useMemo(() => alerts.some((a) => a.severity === 'critical'), [alerts]);

  return (
    <Card className={`border shadow-2xs flex flex-col gap-2 min-w-0 p-0 overflow-hidden rounded-2xl py-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 ${
      hasCritical 
        ? 'border-red-100 bg-red-50/20' 
        : 'border-amber-100 bg-amber-50/20'
    }`}>
      <CardContent className="flex flex-col gap-2.5 p-0 px-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            hasCritical ? 'bg-red-50' : 'bg-amber-50'
          }`}>
            <AlertTriangle className={`w-4 h-4 ${
              hasCritical ? 'text-red-500 animate-pulse' : 'text-amber-500'
            }`} />
          </div>
          <h4 className="text-sm font-bold text-slate-700 leading-tight">Cảnh báo cần xử lý</h4>
        </div>
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex items-start gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
              <span className={`text-sm font-semibold leading-snug ${
                alert.severity === 'critical' ? 'text-red-650' : 'text-amber-650'
              }`}>
                {alert.message}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
});

export default PlanAlertBanner;
