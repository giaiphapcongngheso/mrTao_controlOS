import type { Table as TanStackTable } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui';

export interface TablePaginationProps<TData> {
  readonly table: TanStackTable<TData>;
  readonly pageSizeOptions: number[];
  readonly totalCount?: number;
}

export function TablePagination<TData>({
  table,
  pageSizeOptions,
  totalCount,
}: TablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const pageCount = table.getPageCount();
  const [pageInput, setPageInput] = React.useState(currentPage.toString());
  const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync input with current page when it changes externally
  React.useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Cleanup debounce timer on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const navigateToPage = React.useCallback(
    (value: string) => {
      const page = Number.parseInt(value, 10);
      if (!Number.isNaN(page) && page >= 1 && page <= pageCount) {
        table.setPageIndex(page - 1);
      } else {
        // Reset to current page if invalid
        setPageInput(currentPage.toString());
      }
    },
    [pageCount, currentPage, table],
  );

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers
    if (value === '' || /^\d+$/.test(value)) {
      setPageInput(value);

      // Clear previous timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer (500ms)
      if (value !== '') {
        debounceTimerRef.current = setTimeout(() => {
          navigateToPage(value);
        }, 500);
      }
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Clear debounce timer and navigate immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      navigateToPage(pageInput);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handlePageInputBlur = () => {
    // Clear debounce timer and navigate immediately
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    navigateToPage(pageInput);
  };

  // Display total count
  const displayTotal = totalCount ?? table.getFilteredRowModel().rows.length;

  return (
    <div className="px-3 py-2 flex items-center bg-transparent justify-between py-1">
      {/* Total count */}
      <div className="text-sm text-muted-foreground">
        Tổng: <span className="font-medium text-foreground">{displayTotal.toLocaleString()}</span>
      </div>

      <div className="flex items-center space-x-2">
        {/* Page size selector */}
        <div>
          <Select
            value={table.getState().pagination.pageSize.toString()}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="w-[140px]" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} / page
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination controls with inline page input */}
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft />
          </Button>
          <div className="flex items-center text-sm">
            <input
              type="text"
              value={pageInput}
              onChange={handlePageInputChange}
              onKeyDown={handlePageInputKeyDown}
              onBlur={handlePageInputBlur}
              className="w-10 h-7 px-1 text-sm text-center border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="mx-1">/</span>
            <span>{pageCount}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
