import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../../../../share/ui/card';

interface PlanSummaryCardProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  label: string;
  value?: React.ReactNode;
  subValue?: string;
  children?: React.ReactNode;
}

/**
 * Reusable summary card used across Dashboard, Month, Week, Day views.
 * Displays icon + label + main value + optional sub-content.
 * Uses shared Card component, increased text sizes, and premium visual transitions.
 */
const PlanSummaryCard = React.memo(function PlanSummaryCard({
  icon: Icon,
  iconColor = 'text-[#C21A1A]',
  iconBg = 'bg-red-50',
  label,
  value,
  subValue,
  children,
}: PlanSummaryCardProps) {
  return (
    <Card className="border border-slate-200/50 shadow-2xs flex flex-col gap-2 min-w-0 p-0 overflow-hidden bg-white rounded-2xl py-4 transition-all duration-300 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-default">
      <CardContent className="flex flex-col gap-2 p-0 px-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 border border-slate-100/80 shadow-3xs`}>
            <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
          </div>
          <span className="text-sm font-bold text-slate-650 leading-tight truncate">{label}</span>
        </div>
        {value !== undefined && value !== null && (
          <div className="flex items-end gap-1.5 min-w-0">
            <span className="text-2xl font-black text-slate-850 leading-none tracking-tight">{value}</span>
            {subValue && (
              <span className="text-sm font-semibold text-slate-500 pb-0.5 truncate">{subValue}</span>
            )}
          </div>
        )}
        {children && <div className="mt-1">{children}</div>}
      </CardContent>
    </Card>
  );
});

export default PlanSummaryCard;
