import { Checkbox } from '@shared/ui';
import { Button } from '@shared/ui';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui';
import type { ColumnDef, VisibilityState } from '@tanstack/react-table';
import { Settings } from 'lucide-react';
import React from 'react';

export interface ColumnVisibilityPopoverProps<TData> {
  readonly columns: ColumnDef<TData>[];
  readonly visibility: VisibilityState;
  readonly onVisibilityChange: (
    updater: VisibilityState | ((prev: VisibilityState) => VisibilityState),
  ) => void;
  readonly triggerSize?: 'icon' | 'default' | 'sm' | 'lg';
  readonly label?: string;
}

export function ColumnVisibilityPopover<TData>({
  columns,
  visibility,
  onVisibilityChange,
  triggerSize = 'icon',
  label = 'Cột hiển thị',
}: ColumnVisibilityPopoverProps<TData>) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size={triggerSize}>
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-3 space-y-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="space-y-1">
          {columns
            .filter((col) => col.enableHiding !== false)
            .map((col) => {
              const colId = col.id || (col as { accessorKey?: string }).accessorKey || '';
              if (!colId) return null;
              const isVisible = visibility[colId] !== false;
              const header = col.header;
              let textLabel: string;
              if (typeof header === 'string') {
                textLabel = header;
              } else if (typeof header === 'function') {
                textLabel = colId;
              } else if (header != null) {
                textLabel = header;
              } else {
                textLabel = colId;
              }

              return (
                <label key={colId} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={isVisible}
                    onCheckedChange={(value) => {
                      onVisibilityChange((prev) => {
                        const next = { ...prev };
                        if (value) {
                          delete next[colId];
                        } else {
                          next[colId] = false;
                        }
                        return next;
                      });
                    }}
                  />
                  <span>{textLabel}</span>
                </label>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
