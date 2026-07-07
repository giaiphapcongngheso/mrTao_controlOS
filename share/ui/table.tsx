import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

import { cn } from '../lib/utils';

type TableHeadProps = React.ComponentProps<'th'> & {
  sticky?: 'right' | 'left';
  tooltip?: React.ReactNode;
};
type TableFilterCellProps = React.ComponentProps<'th'> & {
  sticky?: 'right' | 'left';
  tooltip?: React.ReactNode;
};
type TableCellProps = React.ComponentProps<'td'> & {
  sticky?: 'right' | 'left';
  tooltip?: React.ReactNode;
};

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="">
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead data-slot="table-header" className={cn('[&_tr]:border-b ', className)} {...props} />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('relative [&_tr:last-child]:border-0 [&_tr:last-child>td]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'group hover:bg-muted/50 data-[state=selected]:bg-muted [&[data-state=selected]>td]:!bg-muted data-[state=active]:bg-[color-mix(in_oklab,var(--color-primary)_10%,#fff)] dark:data-[state=active]:bg-[color-mix(in_oklab,var(--color-primary)_15%,var(--color-card))] [&[data-state=active]>td]:!bg-[color-mix(in_oklab,var(--color-primary)_10%,#fff)] dark:[&[data-state=active]>td]:!bg-[color-mix(in_oklab,var(--color-primary)_15%,var(--color-card))] [&>td]:transition-colors [&>td]:duration-300 border-b [&>td]:border-b [&>td]:border-border transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, sticky, tooltip, children, ...props }: TableHeadProps) {
  const content = tooltip ? (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="w-full truncate">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  ) : (
    children
  );

  return (
    <th
      data-slot="table-head"
      className={cn(
        'relative bg-slate-50 text-slate-800 h-11 px-4 text-left align-middle font-semibold whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] [&:first-child]:rounded-tl-md [&:last-child]:rounded-tr-md border-b border-slate-100',
        {
          // darker, more neutral shadow so it stands out from table shadow
          'sticky left-0 z-10 bg-slate-50 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.08)]': sticky === 'left',
          'sticky right-0 z-10 bg-slate-50 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]': sticky === 'right',
        },
        className,
      )}
      {...props}
    >
      {content}
    </th>
  );
}

function TableFilter({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-filter"
      className={cn(
        'table-filter-row',
        'bg-[#eaf5ff] dark:bg-primary/80 border-b relative',
        className,
      )}
      {...props}
    />
  );
}

function TableFilterCell({ className, sticky, tooltip, children, ...props }: TableFilterCellProps) {
  const content = tooltip ? (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="w-full truncate">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  ) : (
    children
  );

  return (
    <th
      data-slot="table-filter-cell"
      className={cn(
        'px-4 justify-start py-2 [&:has([role=checkbox])]:pr-0',
        {
          'sticky left-0 z-10 bg-[#eaf5ff] dark:bg-primary/80 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]':
            sticky === 'left',
          'sticky right-0 z-10 bg-[#eaf5ff] dark:bg-primary/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)]':
            sticky === 'right',
        },
        className,
      )}
      {...props}
    >
      {content}
    </th>
  );
}

function TableCell({ className, sticky, tooltip, children, ...props }: TableCellProps) {
  const content = tooltip ? (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="w-full truncate">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  ) : (
    children
  );

  return (
    <td
      data-slot="table-cell"
      className={cn(
        'bg-background px-4 py-2.5 align-middle whitespace-nowrap overflow-hidden [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] transition-colors duration-200',
        {
          'sticky left-0 z-10 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)] group-hover:bg-muted/50 group-data-[state=selected]:bg-muted group-data-[state=active]:bg-[color-mix(in_oklab,var(--color-primary)_10%,#fff)] dark:group-data-[state=active]:bg-[color-mix(in_oklab,var(--color-primary)_15%,var(--color-card))]': sticky === 'left',
          'sticky right-0 z-10 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.06)] group-hover:bg-muted/50 group-data-[state=selected]:bg-muted group-data-[state=active]:bg-[color-mix(in_oklab,var(--color-primary)_10%,#fff)] dark:group-data-[state=active]:bg-[color-mix(in_oklab,var(--color-primary)_15%,var(--color-card))]': sticky === 'right',
        },
        className,
      )}
      {...props}
    >
      {content}
    </td>
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableFilter,
  TableFilterCell,
  TableCell,
  TableCaption,
};
