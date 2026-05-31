import React from 'react';
import { cn } from '../lib/utils';

export interface ModuleHeaderProps {
  badgeText?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function ModuleHeader({
  badgeText,
  title,
  description,
  children,
  className,
}: ModuleHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-xs',
        className,
      )}
    >
      <div>
        {badgeText && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-[#C21A1A] border border-red-100 rounded-lg">
            {badgeText}
          </span>
        )}
        <h1 className="text-xl font-black font-display tracking-tight text-slate-900 mt-2">
          {title}
        </h1>
        {description && (
          <p className="text-xs text-slate-400 font-medium mt-1">
            {description}
          </p>
        )}
      </div>

      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}
