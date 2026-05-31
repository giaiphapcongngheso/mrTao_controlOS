import React, { useMemo } from 'react';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './index';
import { cn } from '@shared/lib/utils';

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  totalCount: number;
  filteredCount: number;
  pageSizeOptions?: number[];
  className?: string;
}

interface PageNumberLinkProps {
  pageNumber: number;
  isActive: boolean;
  onPageChange: (page: number) => void;
}

const PageNumberLink = React.memo(function PageNumberLink({
  pageNumber,
  isActive,
  onPageChange,
}: PageNumberLinkProps) {
  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onPageChange(pageNumber);
    },
    [onPageChange, pageNumber]
  );

  return (
    <PaginationLink
      href="#"
      isActive={isActive}
      className={cn(
        "h-8 w-8 text-xs font-bold rounded-lg cursor-pointer border transition-all flex items-center justify-center",
        isActive
          ? "bg-white text-[#C21A1A] border-slate-200/60 shadow-2xs hover:bg-white"
          : "border-transparent text-slate-500 hover:text-slate-850 hover:bg-slate-50"
      )}
      onClick={handleClick}
    >
      {pageNumber}
    </PaginationLink>
  );
});

export const PaginationBar = React.memo(function PaginationBar({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  totalCount,
  filteredCount,
  pageSizeOptions = [10, 20, 50, 100],
  className,
}: PaginationBarProps) {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const handlePageSizeValueChange = React.useCallback(
    (value: string) => {
      onPageSizeChange(Number(value));
    },
    [onPageSizeChange]
  );

  const handlePreviousPage = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onPageChange(currentPage - 1);
    },
    [currentPage, onPageChange]
  );

  const handleNextPage = React.useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      onPageChange(currentPage + 1);
    },
    [currentPage, onPageChange]
  );

  if (totalCount === 0) return null;

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-8 border-t border-slate-100 mt-2 select-none w-full", className)}>
      {/* Left side: Page Size Selector & Records count info */}
      <div className="flex items-center gap-2.5 text-[11px] sm:text-xs text-slate-500 font-semibold">
        <span>Hiển thị</span>
        <Select 
          value={pageSize.toString()} 
          onValueChange={handlePageSizeValueChange}
        >
          <SelectTrigger size="sm" className="h-8 min-w-[65px] px-2 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50/50 rounded-lg shadow-2xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-slate-200 rounded-lg min-w-[65px] p-1 z-50">
            {pageSizeOptions.map((opt) => (
              <SelectItem key={opt} value={opt.toString()} className="text-xs font-bold cursor-pointer hover:bg-slate-50">
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="hidden sm:inline">bản ghi / trang</span>
        <span className="inline sm:hidden">dòng/trang</span>
        <span className="text-slate-250 font-normal">|</span>
        <span className="font-bold text-slate-400">
          Tổng {filteredCount} kết quả
        </span>
      </div>

      {/* Right side: Page navigation buttons */}
      {totalPages > 1 && (
        <Pagination className="w-auto mx-0">
          <PaginationContent className="gap-1">
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-disabled={currentPage === 1}
                className={cn(
                  "h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200/85 hover:bg-slate-50 shadow-2xs rounded-lg cursor-pointer transition-all",
                  currentPage === 1 ? 'pointer-events-none opacity-50' : undefined
                )}
                onClick={handlePreviousPage}
              >
                Trước
              </PaginationLink>
            </PaginationItem>

            {pageNumbers.map((pageNumber, index) => {
              const previousPage = pageNumbers[index - 1];
              return (
                <React.Fragment key={pageNumber}>
                  {previousPage && pageNumber - previousPage > 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PageNumberLink
                      pageNumber={pageNumber}
                      isActive={pageNumber === currentPage}
                      onPageChange={onPageChange}
                    />
                  </PaginationItem>
                </React.Fragment>
              );
            })}

            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-disabled={currentPage === totalPages}
                className={cn(
                  "h-8 px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200/85 hover:bg-slate-50 shadow-2xs rounded-lg cursor-pointer transition-all",
                  currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined
                )}
                onClick={handleNextPage}
              >
                Sau
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
});
