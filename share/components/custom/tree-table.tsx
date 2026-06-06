import {
  Table,
  TableBody,
  TableCell,
  TableFilter,
  TableFilterCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../ui/table';
import { cn } from '../../lib/utils';
import {
  ColumnDef,
  ColumnFiltersState,
  Header,
  OnChangeFn,
  PaginationState,
  Table as ReactTable,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ListFilter,
  ListFilterPlus,
  RefreshCw,
  Settings,
} from 'lucide-react';
import React from 'react';
import { WorkflowLoading } from '../common/workflow-loading';
import { Button } from '../../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../../ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { BulkSelectionBar } from '..';
import { ITreeItem } from '../common/tree.type';

export type GlobalFilterElementProps = {
  label?: string;
  element: React.ReactNode;
};

export type TableTitleProps = {
  title?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

interface TreeTableProps<TData extends ITreeItem<TData>> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  enableFiltering?: boolean;
  expandAll?: boolean;
  enableColumnVisibility?: boolean;
  enableSorting?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  showFilterRow?: boolean;
  emptyMessage?: string;
  className?: string;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  pageCount?: number;
  totalCount?: number;
  pagination?: PaginationState;
  sorting?: SortingState;
  filtering?: ColumnFiltersState;
  pageSizeOptions?: number[];
  globalFilterElement?: GlobalFilterElementProps[];
  titleProps?: TableTitleProps;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;

  // Virtual scrolling options
  enableVirtualization?: boolean;
  estimateSize?: number;
  overscan?: number;
  virtualScrollHeight?: string;

  // Error handling
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  /**
   * Bulk selection actions - buttons to display when rows are selected
   * Function receives table instance to access selected rows
   */
  bulkSelectionActions?: (table: ReactTable<TData>) => React.ReactNode;
}

// Custom virtual scroll hook
function useVirtualScroll({
  itemCount,
  itemHeight,
  containerRef,
  overscan = 5,
  enabled = true,
}: {
  itemCount: number;
  itemHeight: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  overscan?: number;
  enabled?: boolean;
}) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    const observer = new ResizeObserver(() => {
      setContainerHeight(container.clientHeight);
    });

    container.addEventListener('scroll', handleScroll);
    observer.observe(container);
    setContainerHeight(container.clientHeight);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [containerRef, enabled]);

  if (!enabled) {
    return {
      visibleStart: 0,
      visibleEnd: itemCount,
      totalHeight: itemCount * itemHeight,
      offsetY: 0,
      visibleItems: itemCount,
    };
  }

  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEnd = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan,
  );

  const totalHeight = itemCount * itemHeight;
  const offsetY = visibleStart * itemHeight;

  return {
    visibleStart,
    visibleEnd,
    totalHeight,
    offsetY,
    visibleItems: visibleEnd - visibleStart,
  };
}

export function TreeTable<TData extends ITreeItem<TData>>({
  columns,
  data,
  loading = false,
  enableFiltering = true,
  enableColumnVisibility = false,
  enableSorting = true,
  enablePagination = true,
  enableRowSelection = false,
  showFilterRow = true,
  emptyMessage = 'No results.',
  className,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  expandAll = false,
  pageCount,
  totalCount,
  titleProps,
  pagination: controlledPagination,
  pageSizeOptions = [10, 20, 50, 100],
  sorting: controlledSorting,
  filtering: controlledFiltering,
  globalFilterElement,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  getRowCanExpand,
  enableVirtualization = false,
  estimateSize = 50,
  overscan = 10,
  virtualScrollHeight = '600px',
  error,
  errorMessage,
  onRetry,
  bulkSelectionActions,
}: TreeTableProps<TData>) {
  const [filterRowVisible, setFilterRowVisible] = React.useState(false);
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  const sorting = controlledSorting ?? internalSorting;
  const filtering = controlledFiltering ?? internalFilters;

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand,
    getPaginationRowModel:
      enablePagination && !enableVirtualization ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onSortingChange: enableSorting ? onSortingChange || setInternalSorting : undefined,
    onColumnFiltersChange: enableFiltering
      ? onColumnFiltersChange || setInternalFilters
      : undefined,
    onPaginationChange: onPaginationChange || setPagination,
    getSubRows: (row) => row.children ?? [],
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount,
    enableRowSelection,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? filtering : undefined,
      columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
      rowSelection: enableRowSelection ? rowSelection : undefined,
      pagination: !enableVirtualization ? controlledPagination || pagination : undefined,
    },
  });

  const rows = table.getRowModel().rows;

  const { visibleStart, visibleEnd, totalHeight, offsetY, visibleItems } = useVirtualScroll({
    itemCount: rows.length,
    itemHeight: estimateSize,
    containerRef: tableContainerRef,
    overscan,
    enabled: enableVirtualization,
  });

  const visibleRows = React.useMemo(() => {
    if (enableVirtualization) {
      return rows.slice(visibleStart, visibleEnd);
    }
    return rows;
  }, [rows, visibleStart, visibleEnd, enableVirtualization]);

  React.useEffect(() => {
    if (expandAll) {
      table.toggleAllRowsExpanded(true);
    } else {
      table.toggleAllRowsExpanded(false);
    }
  }, [expandAll, table]);

  const renderHeader = (header: Header<TData, unknown>) => {
    if (header.isPlaceholder) return null;

    const canSort = header.column.getCanSort();
    const isSorted = header.column.getIsSorted();
    const canFilter =
      header.column.getCanFilter() && header.column.columnDef.enableColumnFilter !== false;
    const isFilter = header.column.getIsFiltered();
    const headerContent = flexRender(header.column.columnDef.header, header.getContext());

    if ((!enableSorting || !canSort) && (!enableFiltering || !canFilter)) {
      return headerContent;
    }

    const btnList = [];

    if (enableSorting && canSort) {
      btnList.push(
        <Button
          key="sort-btn"
          variant="ghost"
          size="sm"
          className={cn('h-6 w-6 p-0', isSorted ? 'bg-muted' : 'bg-primary')}
          onClick={() => header.column.toggleSorting(isSorted === 'asc')}
        >
          {!isSorted ? (
            <ArrowUpDown />
          ) : isSorted === 'asc' ? (
            <ArrowDownAZ color="var(--primary)" />
          ) : (
            <ArrowUpAZ color="var(--primary)" />
          )}
        </Button>,
      );
    }

    if (enableFiltering && canFilter) {
      btnList.push(
        <Button
          key="filter-btn"
          variant="ghost"
          size="sm"
          className={cn('h-6 w-6 p-0', isFilter ? 'bg-muted' : 'bg-primary')}
          onClick={() => setFilterRowVisible(true)}
        >
          {!isFilter ? <ListFilterPlus /> : <ListFilter color="var(--primary)" />}
        </Button>,
      );
    }

    return (
      <div className="flex items-center justify-start gap-2">
        <div>{headerContent}</div>
        <div className="flex items-center justify-end gap-[2px]">{btnList?.map((btn) => btn)}</div>
      </div>
    );
  };

  const getErrorMessage = () => {
    if (errorMessage) return errorMessage;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Đã xảy ra lỗi khi tải dữ liệu';
  };

  const handleRetry = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (onRetry) {
      try {
        onRetry();
      } catch (err) {
        console.error('Error in retry:', err);
      }
    }
  };

  return (
    <div className={cn('overflow-hidden flex flex-col min-h-0', className)}>
      {/* Title & Actions */}
      <div className="flex flex-col gap-2 shrink-0">
        {(titleProps || enableColumnVisibility) && (
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4 rounded-xl border bg-white px-4 py-3 shadow-sm">
            <h3 className={cn('text-2xl font-bold w-max', titleProps?.className)}>
              {titleProps?.title ?? ''}
            </h3>
            <div className="flex justify-end items-center gap-2 flex-1">
              {titleProps?.actions}
              {enableColumnVisibility && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" key="column-visibility">
                      <Settings />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.columnDef.header?.toString() || column.id}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
        {globalFilterElement && (
          <div className="flex items-end space-x-2">
            {globalFilterElement?.map((filter) => (
              <div key={filter.label} className="flex flex-col space-y-1">
                <span className="text-sm font-medium">{filter.label}</span>
                {filter.element}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div
        ref={tableContainerRef}
        className="flex-1 overflow-y-auto overflow-x-auto relative rounded-lg border shadow-sm"
        style={enableVirtualization ? { height: virtualScrollHeight } : undefined}
      >
        <Table className="w-full">
          <TableHeader className="sticky top-0 w-full z-20">
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                <TableRow className="!border-b-0">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.column.columnDef.minSize,
                        maxWidth: header.column.columnDef.maxSize,
                      }}
                      sticky={header.column.columnDef.meta?.sticky}
                    >
                      {renderHeader(header)}
                    </TableHead>
                  ))}
                </TableRow>

                {showFilterRow && enableFiltering && filterRowVisible && (
                  <TableFilter>
                    {headerGroup.headers.map((header, index) => {
                      if (index === headerGroup.headers.length - 1) {
                        return (
                          <TableFilterCell key="btn-close-filter">
                            <Button
                              className="absolute right-2 top-1"
                              onClick={() => setFilterRowVisible(false)}
                              variant="outline"
                              size="sm"
                            >
                              Ẩn Filter
                              <ChevronUp />
                            </Button>
                          </TableFilterCell>
                        );
                      }
                      return (
                        <TableFilterCell key={header.id}>
                          {header.column.getCanFilter() &&
                          header.column.columnDef.meta?.filterElement
                            ? typeof header.column.columnDef.meta.filterElement === 'function'
                              ? header.column.columnDef.meta.filterElement(header.column)
                              : header.column.columnDef.meta.filterElement
                            : null}
                        </TableFilterCell>
                      );
                    })}
                  </TableFilter>
                )}
              </React.Fragment>
            ))}
          </TableHeader>

          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  <WorkflowLoading />
                </TableCell>
              </TableRow>
            )}
            {!loading && error && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-48">
                  <div className="flex flex-col items-center justify-center gap-4 py-8">
                    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-6 py-6 text-center min-w-[300px]">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <p className="text-base font-semibold text-destructive">
                        {getErrorMessage()}
                      </p>
                      {onRetry && (
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={handleRetry}
                          className="mt-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Thử lại
                        </Button>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
            {!loading && !error && rows.length > 0 && (
              <>
                {enableVirtualization && offsetY > 0 && (
                  <TableRow style={{ height: offsetY }}>
                    <TableCell colSpan={columns.length} className="p-0" />
                  </TableRow>
                )}
                {visibleRows.map((row) => (
                  <TreeRow<TData>
                    key={row.id}
                    row={row}
                    level={row.depth}
                    estimateSize={estimateSize}
                  />
                ))}
                {enableVirtualization && (
                  <TableRow
                    style={{
                      height: Math.max(0, totalHeight - offsetY - visibleItems * estimateSize),
                    }}
                  >
                    <TableCell colSpan={columns.length} className="p-0" />
                  </TableRow>
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination or Virtual Info */}
      {enablePagination && !enableVirtualization && (
        <div className="flex items-center justify-between py-4">
          {/* Total count */}
          <div className="text-sm text-muted-foreground">
            Tổng:{' '}
            <span className="font-medium text-foreground">
              {(totalCount !== undefined
                ? totalCount
                : table.getFilteredRowModel().rows.length
              ).toLocaleString()}
            </span>
            {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <span className="ml-2">
                (Đã chọn {table.getFilteredSelectedRowModel().rows.length})
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div>
              <Select
                value={table.getState().pagination.pageSize.toString()}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {pageSizeOptions?.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} / page
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <ChevronLeft />
              </Button>
              <span className="text-sm">
                {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
              </span>
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
      )}

      {enableVirtualization && (
        <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <div>
            Tổng:{' '}
            <span className="font-medium text-foreground">
              {(totalCount !== undefined ? totalCount : rows.length).toLocaleString()}
            </span>
            {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <span className="ml-2">
                (Đã chọn {table.getFilteredSelectedRowModel().rows.length})
              </span>
            )}
          </div>
        </div>
      )}

      {bulkSelectionActions && (
        <BulkSelectionBar table={table} actions={bulkSelectionActions(table)} />
      )}
    </div>
  );
}

function TreeRow<TData extends ITreeItem<TData>>({
  row,
  level,
  estimateSize,
}: {
  row: Row<TData>;
  level: number;
  estimateSize?: number;
}) {
  const hasSubRows = row.getCanExpand();
  const isExpanded = row.getIsExpanded();

  return (
    <TableRow
      key={row.id}
      data-state={row?.getIsSelected() && 'selected'}
      style={estimateSize ? { height: estimateSize } : undefined}
    >
      {row.getVisibleCells().map((cell, idx) => {
        return (
          <TableCell key={cell.id} sticky={cell.column.columnDef.meta?.sticky}>
            <div
              className={cn(idx === 0 && 'flex items-center', idx === 0 && 'gap-2')}
              style={{ paddingLeft: idx === 0 ? level * 24 : undefined }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
              {idx === 0 && hasSubRows && (
                <button
                  onClick={row.getToggleExpandedHandler()}
                  className="p-0 hover:bg-muted rounded inline-flex items-center justify-center w-6 h-6 cursor-pointer flex-shrink-0"
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </TableCell>
        );
      })}
    </TableRow>
  );
}
