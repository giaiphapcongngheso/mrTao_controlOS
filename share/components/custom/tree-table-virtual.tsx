import { cn } from '../../lib/utils';
import { ITreeItem } from '@/types/common/tree.type';
import {
  ColumnDef,
  ColumnFiltersState,
  Header,
  OnChangeFn,
  PaginationState,
  Row,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  AlertCircle,
  ArrowDownAZ,
  ArrowUpAZ,
  ArrowUpDown,
  ChevronDown,
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
  enableVirtualization?: boolean;
  virtualRowHeight?: number;
  enableRowSelection?: boolean;
  showFilterRow?: boolean;
  emptyMessage?: string;
  className?: string;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  sorting?: SortingState;
  filtering?: ColumnFiltersState;
  globalFilterElement?: GlobalFilterElementProps[];
  titleProps?: TableTitleProps;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  getRowCanExpand?: (row: Row<TData>) => boolean;

  // Error handling
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
}

export function TreeTableVirtual<TData extends ITreeItem<TData>>({
  columns,
  data,
  loading = false,
  enableFiltering = true,
  enableColumnVisibility = false,
  enableSorting = true,
  enableVirtualization = true,
  virtualRowHeight = 40,
  enableRowSelection = false,
  showFilterRow = true,
  emptyMessage = 'No results.',
  className,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  expandAll = false,
  pageCount,
  titleProps,
  pagination: controlledPagination,
  sorting: controlledSorting,
  filtering: controlledFiltering,
  globalFilterElement,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  getRowCanExpand,
  error,
  errorMessage,
  onRetry,
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
    getRowId: (row, index) => row.id?.toString() ?? index.toString(),
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount,
    enableRowSelection,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? filtering : undefined,
      columnVisibility: enableColumnVisibility ? columnVisibility : undefined,
      rowSelection: rowSelection,
      pagination: controlledPagination || pagination,
    },
  });

  React.useEffect(() => {
    if (expandAll) {
      table.toggleAllRowsExpanded(true);
    } else {
      table.toggleAllRowsExpanded(false);
    }
  }, [expandAll, table]);

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => virtualRowHeight,
    overscan: 10,
  });

  const virtualRows = enableVirtualization ? rowVirtualizer.getVirtualItems() : null;
  const totalSize = enableVirtualization ? rowVirtualizer.getTotalSize() : undefined;

  const paddingTop = virtualRows && virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows && virtualRows.length > 0
      ? totalSize! - (virtualRows[virtualRows.length - 1]?.end || 0)
      : 0;

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
    <div className={cn('grid grid-rows-[auto_1fr] h-full min-h-0', className)}>
      {/* Title & Actions */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
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

      {/* Table with Virtualization */}
      <div
        ref={tableContainerRef}
        className="relative overflow-auto rounded-lg border shadow-sm bg-white"
        style={{ height: '600px' }}
      >
        <div style={{ position: 'relative' }}>
          {/* Header */}
          <div
            className="bg-primary text-primary-foreground sticky top-0 z-20"
            style={{
              display: 'grid',
              gridTemplateColumns: table
                .getHeaderGroups()[0]
                ?.headers.map((h) => `${h.getSize()}px`)
                .join(' '),
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <React.Fragment key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <div
                    key={header.id}
                    className="h-10 px-2 text-left align-middle font-medium flex items-center border-b border-r border-primary-foreground/20"
                    style={{
                      width: header.getSize(),
                    }}
                  >
                    {renderHeader(header)}
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>

          {/* Filter Row */}
          {showFilterRow && enableFiltering && filterRowVisible && (
            <div
              className="bg-[#eaf5ff] dark:bg-primary/80 sticky top-10 z-10"
              style={{
                display: 'grid',
                gridTemplateColumns: table
                  .getHeaderGroups()[0]
                  ?.headers.map((h) => `${h.getSize()}px`)
                  .join(' '),
              }}
            >
              {table.getHeaderGroups()[0]?.headers.map((header, index) => (
                <div
                  key={header.id}
                  className="px-2 py-1 border-b border-r"
                  style={{ width: header.getSize() }}
                >
                  {index === table.getHeaderGroups()[0].headers.length - 1 ? (
                    <Button onClick={() => setFilterRowVisible(false)} variant="outline" size="sm">
                      <ChevronUp />
                      Ẩn Filter
                    </Button>
                  ) : header.column.getCanFilter() &&
                    header.column.columnDef.meta?.filterElement ? (
                    typeof header.column.columnDef.meta.filterElement === 'function' ? (
                      header.column.columnDef.meta.filterElement(header.column)
                    ) : (
                      header.column.columnDef.meta.filterElement
                    )
                  ) : null}
                </div>
              ))}
            </div>
          )}

          {/* Body */}
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <WorkflowLoading />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-4 py-8 h-48">
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-6 py-6 text-center min-w-[300px]">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-base font-semibold text-destructive">{getErrorMessage()}</p>
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
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div style={{ height: `${totalSize}px`, position: 'relative' }}>
              {paddingTop > 0 && <div style={{ height: `${paddingTop}px` }} />}
              {(virtualRows || rows.map((_, index) => ({ index }))).map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={row.id}
                    className={cn(
                      'hover:bg-muted/50 border-b transition-colors',
                      enableRowSelection && row.getIsSelected() && 'bg-muted',
                    )}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: row
                        .getVisibleCells()
                        .map((cell) => `${cell.column.getSize()}px`)
                        .join(' '),
                      height: `${virtualRowHeight}px`,
                    }}
                  >
                    {row.getVisibleCells().map((cell, idx) => {
                      const hasSubRows = row.getCanExpand();
                      const isExpanded = row.getIsExpanded();
                      const level = row.depth;

                      return (
                        <div
                          key={cell.id}
                          className="px-2 py-[6px] align-middle whitespace-nowrap flex items-center border-r"
                          style={{
                            width: cell.column.getSize(),
                            paddingLeft: idx === 0 ? level * 24 + 8 : undefined,
                          }}
                        >
                          {idx === 0 && hasSubRows && (
                            <button
                              onClick={row.getToggleExpandedHandler()}
                              className="p-0 mr-2 hover:bg-muted rounded inline-flex items-center justify-center w-6 h-6 cursor-pointer"
                              aria-label={isExpanded ? 'Collapse' : 'Expand'}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {paddingBottom > 0 && <div style={{ height: `${paddingBottom}px` }} />}
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        {enableRowSelection && table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="text-muted-foreground flex-1 text-sm">
            Đã chọn {table.getFilteredSelectedRowModel().rows.length}/
            {table.getFilteredRowModel().rows.length}
          </div>
        )}
      </div>
    </div>
  );
}
