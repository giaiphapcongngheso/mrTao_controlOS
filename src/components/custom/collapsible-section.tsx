import { ChevronDown } from 'lucide-react';
import React, { useState } from 'react';

export function CollapsibleSection({
  icon,
  title,
  defaultOpen = true,
  headerRight,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly defaultOpen?: boolean;
  readonly headerRight?: React.ReactNode;
  readonly children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold text-slate-900 leading-none">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {headerRight && (
            <span
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
              }}
            >
              {headerRight}
            </span>
          )}
          <ChevronDown
            className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-in-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
