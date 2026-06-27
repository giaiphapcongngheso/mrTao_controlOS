import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { PlanAlert } from '../_hooks/use-plan-metrics';

interface PlanAlertBannerProps {
  alerts: PlanAlert[];
}

/**
 * Red/amber alert banner shown when plan has warnings.
 * Matches mockup "Cảnh báo cần xử lý" section.
 */
const PlanAlertBanner = React.memo(function PlanAlertBanner({ alerts }: PlanAlertBannerProps) {
  if (!alerts.length) return null;

  return (
    <div className="bg-white rounded-2xl border border-red-100 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-500" />
        </div>
        <h4 className="text-[12px] font-black text-slate-700">Cảnh báo cần xử lý</h4>
      </div>
      <ul className="space-y-1.5">
        {alerts.map((alert) => (
          <li key={alert.id} className="flex items-start gap-2">
            <span
              className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                alert.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'
              }`}
            />
            <span className={`text-[12px] font-semibold leading-relaxed ${
              alert.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
            }`}>
              {alert.message}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
});

export default PlanAlertBanner;
