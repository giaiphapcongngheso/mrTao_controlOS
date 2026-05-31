import React from 'react';
import { cn } from '../lib/utils';

export interface ModuleHeaderProps {
  badgeText?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  shortName?: string;
  icon?: React.ReactNode;
}

const getInitials = (text: string) => {
  if (!text) return 'SYS';
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  const firstLetter = words[0]?.[0] || '';
  const secondLetter = words[1]?.[0] || '';
  return (firstLetter + secondLetter).toUpperCase();
};

export function ModuleHeader({
  title,
  description,
  children,
  className,
  shortName,
  icon,
}: ModuleHeaderProps) {
  const initials = shortName || getInitials(title);

  return (
    <div
      className={cn(
        'bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden',
        className,
      )}
    >
      {/* Decorative ambient background accent */}
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-slate-200/40 rounded-full blur-xl pointer-events-none"></div>

      <div className="relative z-10 flex gap-3 items-start text-left flex-1 min-w-0">
        <span className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 font-black text-sm sm:text-lg shrink-0 select-none flex items-center justify-center">
          {icon || initials}
        </span>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 leading-tight break-words">
            {title}
          </h1>
          {description && (
            <p className="hidden sm:block text-xs sm:text-sm md:text-base text-slate-400 font-bold mt-1 max-w-none leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="relative z-10 flex w-full shrink-0 items-center gap-2 self-start sm:w-auto sm:self-auto">
          {children}
        </div>
      )}
    </div>
  );
}
