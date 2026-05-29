import type { Table as TanStackTable } from '@tanstack/react-table';
import { X, MoreHorizontal } from 'lucide-react';
import * as React from 'react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui';

interface BulkSelectionBarProps<TData> {
  readonly table: TanStackTable<TData>;
  readonly actions?: React.ReactNode;
}

export function BulkSelectionBar<TData>({ table, actions }: BulkSelectionBarProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().flatRows.length;
  const totalCount = table.getRowModel().rows.length;

  if (selectedCount === 0) return null;

  const handleClearSelection = () => {
    table.toggleAllRowsSelected(false);
  };

  const allActions = React.useMemo(() => {
    if (!actions) return [];

    const flattenChildren = (children: React.ReactNode): React.ReactElement[] => {
      const result: React.ReactElement[] = [];
      React.Children.forEach(children, (child) => {
        if (child === null || child === undefined || typeof child === 'boolean') {
          return;
        }
        if (React.isValidElement(child)) {
          if (child.type === React.Fragment) {
            const fragmentProps = child.props as { children?: React.ReactNode };
            result.push(...flattenChildren(fragmentProps.children));
          } else {
            result.push(child);
          }
        } else if (Array.isArray(child)) {
          result.push(...flattenChildren(child));
        }
      });
      return result;
    };

    return flattenChildren(actions);
  }, [actions]);

  const hasMoreActions = allActions.length > 3;
  const visibleActions = hasMoreActions ? allActions.slice(0, 3) : allActions;
  const hiddenActions = hasMoreActions ? allActions.slice(3) : [];

  return (
    <div className="sticky bottom-0 left-0 right-0 z-50 flex justify-center mt-auto pb-4">
      <div className="bg-white border border-gray-300 rounded-lg shadow-lg">
        <div className="px-4 py-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-6 w-6 p-0 hover:bg-gray-200"
              >
                <X className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                {selectedCount} of {totalCount} selected
              </span>
            </div>

            {actions && <div className="h-6 w-px bg-gray-300" />}

            {actions && allActions.length > 0 && (
              <div className="flex items-center gap-2">
                {hasMoreActions ? (
                  <>
                    {visibleActions}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {hiddenActions.map((action, index) => {
                          const actionElement = React.isValidElement(action) ? action : null;
                          const props = actionElement?.props as
                            | { onClick?: () => void; children?: React.ReactNode }
                            | undefined;

                          return (
                            <DropdownMenuItem
                              key={index}
                              onSelect={(e) => {
                                e.preventDefault();
                                if (props?.onClick) {
                                  props.onClick();
                                }
                              }}
                              className="cursor-pointer"
                            >
                              {props?.children || action}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                ) : (
                  visibleActions
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
