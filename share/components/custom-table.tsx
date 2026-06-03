import {
  type Cell,
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Header,
  type OnChangeFn,
  type PaginationState,
  Row,
  type SortingState,
  type Table as TanStackTable,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Filter, RefreshCw, Settings } from 'lucide-react';
import * as React from 'react';
import { useMinimumLoading } from '../hooks/use-minimum-loading';
import { cn } from '../lib';
import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  Separator,
  Table,
  TableBody,
  TableCell,
  TableFilter,
  TableFilterCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  ScrollArea,
} from '../ui';
import { BulkSelectionBar } from './bulk-selection-bar';
import { TablePagination } from './table-pagination';

// ============================================================================
// Types
// ============================================================================

export type GlobalFilterElementProps = {
  label?: string;
  element: React.ReactNode;
};

export type TableTitleProps = {
  title?: string | React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
};

export interface CustomTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  loading?: boolean;
  tableId?: string;
  /** @default true */
  enableFiltering?: boolean;
  /** @default true */
  enableColumnVisibility?: boolean;
  /** @default true */
  enableSorting?: boolean;
  /** @default true */
  enablePagination?: boolean;
  /** @default false */
  enableInfiniteScroll?: boolean;
  onLoadMore?: () => void | Promise<void>;
  /** @default true */
  hasMore?: boolean;
  /** @default false */
  infiniteScrollLoading?: boolean;
  /** @default false */
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  /** @default true */
  enableColumnResizing?: boolean;
  /** @default true */
  showFilterRow?: boolean;
  /** @default false */
  hideHeaderFilterButtons?: boolean;
  emptyMessage?: string;
  className?: string;
  manualPagination?: boolean;
  manualSorting?: boolean;
  manualFiltering?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  sorting?: SortingState;
  filtering?: ColumnFiltersState;
  pageSizeOptions?: number[];
  globalFilterElement?: GlobalFilterElementProps[];
  titleProps?: TableTitleProps;
  minimumLoadingDuration?: number;
  onPaginationChange?: OnChangeFn<PaginationState>;
  onSortingChange?: OnChangeFn<SortingState>;
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  getRowCanExpand?: (row: Row<TData>) => boolean;
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;
  onRowClick?: (row: Row<TData>) => void;
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  bulkSelectionActions?: (table: TanStackTable<TData>) => React.ReactNode;
  totalCount?: number;
  columnVisibility?: VisibilityState;
  onColumnVisibilityChange?: (
    updater: VisibilityState | ((prev: VisibilityState) => VisibilityState),
  ) => void;
  tableMinWidth?: number;
  activeRowId?: string;
  getRowId?: (original: TData) => string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_EMPTY_MESSAGE = 'No results.';
const MIN_SKELETON_DURATION = 0;

// ============================================================================
// Helper Functions
// ============================================================================

function parseWidth(width?: number | string): string | undefined {
  if (width === undefined) return undefined;
  if (typeof width === 'number') return `${width}px`;
  if (typeof width === 'string' && width.endsWith('%')) return width;
  return `${width}px`;
}

function parseNumericSize(value?: number | string): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

type ColumnMetaExtra = {
  wrap?: boolean;
};

function getTextContent(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (React.isValidElement(node)) {
    const props = node.props as { children?: React.ReactNode };
    if (props?.children) {
      return getTextContent(props.children);
    }
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join('');
  }
  return '';
}

// ============================================================================
// Hooks
// ============================================================================

function useTableState({
  controlledPagination,
  controlledSorting,
  controlledFiltering,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
}: {
  readonly controlledPagination?: PaginationState;
  readonly controlledSorting?: SortingState;
  readonly controlledFiltering?: ColumnFiltersState;
  readonly onPaginationChange?: OnChangeFn<PaginationState>;
  readonly onSortingChange?: OnChangeFn<SortingState>;
  readonly onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
}) {
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = React.useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const sorting = controlledSorting ?? internalSorting;
  const filtering = controlledFiltering ?? internalFilters;
  const paginationState = controlledPagination ?? pagination;

  return {
    sorting,
    filtering,
    paginationState,
    setInternalSorting,
    setInternalFilters,
    setPagination,
    onPaginationChange: onPaginationChange ?? setPagination,
    onSortingChange: onSortingChange ?? setInternalSorting,
    onColumnFiltersChange: onColumnFiltersChange ?? setInternalFilters,
  };
}

function useColumnResize<TData>(
  setColumnSizing: React.Dispatch<React.SetStateAction<Record<string, number>>>,
) {
  const [resizeLine, setResizeLine] = React.useState<{ visible: boolean; left: number }>({
    visible: false,
    left: 0,
  });

  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent<HTMLElement>, header: Header<TData, unknown>) => {
      e.preventDefault();
      e.stopPropagation();

      const columnId = header.column.id;
      if (columnId === 'select' || columnId === 'expander') return;

      const table = e.currentTarget.closest('table');
      const tableRect = table?.getBoundingClientRect();
      if (!tableRect) return;

      const startLeft = e.clientX - tableRect.left;
      const startClientX = e.clientX;
      const startSize = header.getSize() || 0;
      const minSizeFromMeta = parseNumericSize(header.column.columnDef.meta?.minWidth);
      const maxSizeFromMeta = parseNumericSize(header.column.columnDef.meta?.maxWidth);
      const minSize =
        typeof header.column.columnDef.minSize === 'number'
          ? header.column.columnDef.minSize
          : (minSizeFromMeta ?? 40);
      const maxSize =
        typeof header.column.columnDef.maxSize === 'number'
          ? header.column.columnDef.maxSize
          : (maxSizeFromMeta ?? Number.MAX_SAFE_INTEGER);
      const tableWidth = (table as HTMLElement)?.offsetWidth ?? 0;
      const scaleFactor = tableRect.width > 0 && tableWidth > 0 ? tableRect.width / tableWidth : 1;
      const toLogicalPx = (value: number) => (scaleFactor === 0 ? value : value / scaleFactor);

      setResizeLine({ visible: true, left: toLogicalPx(startLeft) });

      const onMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();
        const moveLeft = moveEvent.clientX - (tableRect?.left ?? 0);
        setResizeLine({ visible: true, left: toLogicalPx(moveLeft) });

        const delta = scaleFactor === 0 ? 0 : (moveEvent.clientX - startClientX) / scaleFactor;
        const nextSize = Math.min(maxSize, Math.max(minSize, Math.round(startSize + delta)));

        setColumnSizing((prev) => {
          if (prev[columnId] === nextSize) return prev;
          return {
            ...prev,
            [columnId]: nextSize,
          };
        });
      };

      const onMouseUp = () => {
        setResizeLine({ visible: false, left: 0 });
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [setColumnSizing],
  );

  return { resizeLine, handleResizeStart };
}

// ============================================================================
// Sub-components
// ============================================================================

interface TableHeaderCellProps<TData> {
  readonly header: Header<TData, unknown>;
  readonly enableSorting: boolean;
  readonly enableFiltering: boolean;
  readonly enableColumnResizing: boolean;
  readonly onFilterClick: () => void;
  readonly hideHeaderFilterButtons: boolean;
  readonly isLastColumn: boolean;
  readonly onResizeStart?: (e: React.MouseEvent<HTMLElement>) => void;
  readonly onAutoSize?: (header: Header<TData, unknown>) => void;
  readonly stickyOffset?: number;
}

function TableHeaderCell<TData>({
  header,
  enableSorting,
  enableFiltering,
  enableColumnResizing,
  onFilterClick,
  hideHeaderFilterButtons,
  isLastColumn,
  onResizeStart,
  onAutoSize,
  stickyOffset,
}: TableHeaderCellProps<TData>) {
  if (header.isPlaceholder) return null;

  const canSort = header.column.getCanSort();
  const isSorted = header.column.getIsSorted();
  const canFilter =
    header.column.getCanFilter() && header.column.columnDef.enableColumnFilter !== false;
  const isFilter = header.column.getIsFiltered();

  const headerContent = flexRender(header.column.columnDef.header, header.getContext());

  const showActions =
    (enableSorting && canSort) || (!hideHeaderFilterButtons && enableFiltering && canFilter);

  const metaWidth = header.column.columnDef.meta?.width;
  const columnId = header.column.id;
  const isSelectOrExpander = columnId === 'select' || columnId === 'expander';

  const currentSize = isSelectOrExpander ? 40 : header.getSize();
  let widthStyle: string | undefined;

  if (isSelectOrExpander) {
    widthStyle = '40px';
  } else {
    if (currentSize > 0) {
      widthStyle = `${currentSize}px`;
    } else if (metaWidth !== undefined && metaWidth !== null) {
      widthStyle = parseWidth(metaWidth);
    }
  }

  const minWidthStyle =
    isSelectOrExpander && widthStyle
      ? widthStyle
      : widthStyle
        ? undefined
        : header.column.columnDef.minSize;
  const maxWidthStyle =
    isSelectOrExpander && widthStyle ? widthStyle : header.column.columnDef.maxSize;

  const sticky = header.column.columnDef.meta?.sticky;
  const baseStyle = isSelectOrExpander
    ? {
        width: '40px',
        minWidth: '40px',
        maxWidth: '40px',
        paddingLeft: '8px',
        paddingRight: '8px',
        boxSizing: 'border-box' as const,
      }
    : {
        width: widthStyle,
        minWidth: minWidthStyle,
        maxWidth: maxWidthStyle,
      };

  const finalStyle: React.CSSProperties = {
    ...baseStyle,
    ...(sticky === 'left' && { left: `${stickyOffset ?? 0}px` }),
    ...(sticky === 'right' && { right: `${stickyOffset ?? 0}px` }),
  };

  return (
    <TableHead
      style={finalStyle}
      className={cn(
        isSelectOrExpander && '!w-[40px] !min-w-[40px] !max-w-[40px] !px-2',
        sticky && 'bg-inherit z-20',
        sticky === 'left' && 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]',
        sticky === 'right' && 'shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)]',
      )}
      sticky={sticky}
    >
      <div className={cn('h-full flex items-center justify-between relative')}>
        {showActions ? (
          <div className="w-full flex items-center justify-between py-1">
            <div
              className={cn(
                'flex-1 flex  items-center gap-1 break-words whitespace-normal rounded-md py-1 px-1 -mx-1 transition-colors',
                isSelectOrExpander && 'justify-center',
                enableSorting && canSort && 'cursor-pointer hover:bg-white/15',
                enableSorting && canSort && isSorted && 'bg-white/15',
              )}
              onClick={
                enableSorting && canSort
                  ? () => {
                      if (!isSorted) {
                        header.column.toggleSorting(false);
                      } else if (isSorted === 'asc') {
                        header.column.toggleSorting(true);
                      } else {
                        header.column.clearSorting();
                      }
                    }
                  : undefined
              }
            >
              {headerContent}
              {enableSorting && canSort && isSorted && (
                <span className="shrink-0 inline-flex items-center justify-center h-4 w-4 text-white/70">
                  {isSorted === 'asc' ? (
                    <ChevronDown className="h-4 w-4 text-white" />
                  ) : (
                    <ChevronUp className="h-4 w-4 text-white" />
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center justify-end gap-[2px] mr-1">
              {!hideHeaderFilterButtons && enableFiltering && canFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 w-6 p-0 text-white hover:bg-white/20',
                    isFilter && 'bg-white/20',
                  )}
                  onClick={onFilterClick}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex-1 break-words whitespace-normal',
              isSelectOrExpander && 'flex items-center justify-center',
            )}
          >
            {headerContent}
          </div>
        )}
      </div>

      {!isLastColumn && header.column.id !== 'select' && header.column.id !== 'expander' && (
        <>
          <Separator
            orientation="vertical"
            className="absolute right-0 top-1/2 -translate-y-1/2  w-1 bg-[#fff]/50 pointer-events-none"
            style={{ height: '35%' }}
          />
          {enableColumnResizing &&
            !isSelectOrExpander &&
            header.column.columnDef.enableResizing !== false &&
            header.column.getCanResize() &&
            onResizeStart && (
              <div
                onMouseDown={onResizeStart}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onAutoSize?.(header);
                }}
                className="absolute top-0 h-full cursor-col-resize select-none touch-none z-10 hover:bg-primary/10"
                style={{
                  right: '-4px',
                  width: '10px',
                }}
              />
            )}
        </>
      )}
    </TableHead>
  );
}

interface TableFilterRowProps<TData> {
  readonly headers: Header<TData, unknown>[];
  readonly table: TanStackTable<TData>;
  readonly onClose: () => void;
  readonly stickyOffsets?: Record<string, number>;
}

function TableFilterRow<TData>({
  headers,
  table,
  onClose,
  stickyOffsets,
}: TableFilterRowProps<TData>) {
  const lastIndex = headers.length - 1;
  const hasRows = table.getRowModel().rows?.length > 0;

  const getStickyStyle = (header: Header<TData, unknown>): React.CSSProperties | undefined => {
    const sticky = header.column.columnDef.meta?.sticky;
    if (!sticky) return undefined;
    const offset = stickyOffsets?.[header.column.id] ?? 0;
    return { [sticky]: `${offset}px` };
  };

  const getStickyClass = (header: Header<TData, unknown>) => {
    const sticky = header.column.columnDef.meta?.sticky;
    return cn(
      sticky && 'bg-inherit z-10',
      sticky === 'left' && 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]',
      sticky === 'right' && 'shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)]',
    );
  };

  return (
    <TableFilter>
      {headers.map((header, index) => {
        if (index === lastIndex) {
          const sticky = header.column.columnDef.meta?.sticky;
          return (
            <TableFilterCell
              key={hasRows ? 'btn-close-filter' : header.id}
              sticky={sticky}
              style={getStickyStyle(header)}
              className={getStickyClass(header)}
            >
              {hasRows && (
                <Button
                  className="absolute right-2 top-1"
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                >
                  <ChevronUp />
                </Button>
              )}
              {header.column.getCanFilter() &&
                header.column.columnDef.meta?.filterElement &&
                (typeof header.column.columnDef.meta.filterElement === 'function'
                  ? header.column.columnDef.meta.filterElement(header.column)
                  : header.column.columnDef.meta.filterElement)}
            </TableFilterCell>
          );
        }

        const filterElement = header.column.columnDef.meta?.filterElement;
        const canFilter = header.column.getCanFilter() && filterElement;
        const sticky = header.column.columnDef.meta?.sticky;

        return (
          <TableFilterCell
            key={header.id}
            sticky={sticky}
            style={getStickyStyle(header)}
            className={getStickyClass(header)}
          >
            {canFilter &&
              (typeof filterElement === 'function' ? filterElement(header.column) : filterElement)}
          </TableFilterCell>
        );
      })}
    </TableFilter>
  );
}

interface TableCellWithTooltipProps<TData> {
  readonly cell: Cell<TData, unknown>;
  readonly children: React.ReactNode;
  readonly stickyOffset?: number;
}

function TableCellWithTooltip<TData>({
  cell,
  children,
  stickyOffset,
}: TableCellWithTooltipProps<TData>) {
  const metaWidth = cell.column.columnDef.meta?.width;
  const columnId = cell.column.id;
  const isSelectOrExpander = columnId === 'select' || columnId === 'expander';

  const wrapText = (cell.column.columnDef.meta as ColumnMetaExtra | undefined)?.wrap ?? true;
  const enableEllipsis = !wrapText;

  const currentSize = isSelectOrExpander ? 40 : cell.column.getSize();
  let widthStyle: string | undefined;

  if (isSelectOrExpander) {
    widthStyle = '40px';
  } else {
    if (currentSize > 0) {
      widthStyle = `${currentSize}px`;
    } else if (metaWidth !== undefined && metaWidth !== null) {
      widthStyle = parseWidth(metaWidth);
    }
  }

  const cellContent = children;
  const textContent = getTextContent(cellContent);

  const sticky = cell.column.columnDef.meta?.sticky;
  const baseCellStyle: React.CSSProperties = isSelectOrExpander
    ? {
        width: '40px',
        minWidth: '40px',
        maxWidth: '40px',
        paddingLeft: '8px',
        paddingRight: '8px',
        boxSizing: 'border-box' as const,
      }
    : { width: widthStyle };

  const finalCellStyle: React.CSSProperties = {
    ...baseCellStyle,
    ...(sticky === 'left' && { left: `${stickyOffset ?? 0}px` }),
    ...(sticky === 'right' && { right: `${stickyOffset ?? 0}px` }),
  };

  const cellElement = (
    <TableCell
      key={cell.id}
      style={finalCellStyle}
      sticky={sticky}
      className={cn(
        wrapText ? 'whitespace-pre-wrap break-words' : 'truncate',
        isSelectOrExpander && '!w-[40px] !min-w-[40px] !max-w-[40px] !px-2',
        sticky && 'bg-background group-hover:bg-muted group-data-[state=selected]:bg-muted z-10',
        sticky === 'left' && 'shadow-[4px_0_8px_-2px_rgba(0,0,0,0.1)]',
        sticky === 'right' && 'shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.1)]',
      )}
      title={textContent}
    >
      {isSelectOrExpander ? (
        <div className="flex items-center justify-center h-full">{cellContent}</div>
      ) : (
        cellContent
      )}
    </TableCell>
  );

  if (enableEllipsis && textContent && textContent.trim().length > 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cellElement}</TooltipTrigger>
        <TooltipContent>
          <p className="max-w-md break-words whitespace-pre-wrap" title={textContent}>
            {textContent}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cellElement;
}

interface TableTitleSectionProps<TData> {
  readonly titleProps?: TableTitleProps;
  readonly enableColumnVisibility: boolean;
  readonly table: TanStackTable<TData>;
  readonly globalFilterElement?: GlobalFilterElementProps[];
}

function TableTitleSection<TData>({
  titleProps,
  enableColumnVisibility,
  table,
  globalFilterElement,
}: TableTitleSectionProps<TData>) {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  if (!titleProps && !globalFilterElement) return null;

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {titleProps && (
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className={cn('text-2xl font-bold w-max', titleProps.className)}>
            {titleProps.title ?? ''}
          </h3>
          <div className="flex justify-end items-center gap-2 flex-1">
            {titleProps.actions}
            {enableColumnVisibility && (
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen} modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Settings />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onInteractOutside={() => {
                    setDropdownOpen(false);
                  }}
                  onFocusOutside={() => {
                    setDropdownOpen(false);
                  }}
                >
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => {
                          column.toggleVisibility(!!value);
                        }}
                        onSelect={(e) => {
                          e.preventDefault();
                        }}
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
          {globalFilterElement.map((filter) => (
            <div key={filter.label} className="flex flex-col space-y-1">
              {filter.label && <span className="text-sm font-medium">{filter.label}</span>}
              {filter.element}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CustomTable<TData>({
  columns,
  data,
  loading = false,
  tableId,
  enableFiltering = true,
  enableColumnVisibility = false,
  enableSorting = true,
  enablePagination = true,
  enableInfiniteScroll = false,
  onLoadMore,
  hasMore = true,
  infiniteScrollLoading = false,
  enableRowSelection = false,
  enableColumnResizing = true,
  showFilterRow = true,
  hideHeaderFilterButtons = false,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  className,
  manualPagination = false,
  manualSorting = false,
  manualFiltering = false,
  pageCount,
  titleProps,
  pagination: controlledPagination,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  sorting: controlledSorting,
  filtering: controlledFiltering,
  globalFilterElement,
  minimumLoadingDuration = MIN_SKELETON_DURATION,
  onPaginationChange,
  onSortingChange,
  onColumnFiltersChange,
  getRowCanExpand,
  renderSubComponent,
  onRowClick,
  error,
  errorMessage,
  onRetry,
  bulkSelectionActions,
  totalCount,
  columnVisibility: columnVisibilityProp,
  onColumnVisibilityChange: onColumnVisibilityChangeProp,
  tableMinWidth,
  activeRowId,
  getRowId,
}: CustomTableProps<TData>) {
  const [filterRowVisible, setFilterRowVisible] = React.useState(false);
  const [internalActiveRowId, setInternalActiveRowId] = React.useState<string | undefined>();
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = React.useRef(false);

  const uniqueTableId = React.useMemo(() => {
    if (tableId) return tableId;
    const columnIds = columns
      .map((col) => col.id || (col as { accessorKey?: string }).accessorKey || '')
      .filter(Boolean)
      .sort()
      .join('-');
    return `table-${columnIds}`;
  }, [tableId, columns]);

  const [columnVisibilityInternal, setColumnVisibilityInternal] = React.useState<VisibilityState>(
    () => {
      if (columnVisibilityProp !== undefined || !enableColumnVisibility) return {};

      try {
        const computedId = tableId
          ? tableId
          : `table-${columns
              .map((col) => col.id || (col as { accessorKey?: string }).accessorKey || '')
              .filter(Boolean)
              .sort()
              .join('-')}`;
        const storageKey = `table-column-visibility-${computedId || 'default'}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch {
        // Ignore localStorage errors
      }
      return {};
    },
  );

  const isControlled = columnVisibilityProp !== undefined;
  const columnVisibility = isControlled ? columnVisibilityProp : columnVisibilityInternal;
  const setColumnVisibility = React.useCallback(
    (updater: VisibilityState | ((prev: VisibilityState) => VisibilityState)) => {
      if (isControlled && onColumnVisibilityChangeProp) {
        onColumnVisibilityChangeProp(updater);
      } else {
        setColumnVisibilityInternal(updater as VisibilityState);
      }
    },
    [isControlled, onColumnVisibilityChangeProp],
  );

  React.useEffect(() => {
    if (!enableColumnVisibility) return;

    try {
      const storageKey = `table-column-visibility-${uniqueTableId}`;
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch {
      // Ignore localStorage errors
    }
  }, [columnVisibility, enableColumnVisibility, uniqueTableId]);

  const [rowSelection, setRowSelection] = React.useState({});

  const {
    sorting,
    filtering,
    paginationState,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
  } = useTableState({
    controlledPagination,
    controlledSorting,
    controlledFiltering,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
  });

  const [columnSizing, setColumnSizing] = React.useState<Record<string, number>>({});

  const { resizeLine, handleResizeStart } = useColumnResize<TData>(setColumnSizing);

  React.useEffect(() => {
    setColumnSizing((prev) => {
      const newSizing = { ...prev };
      let hasChanges = false;

      columns.forEach((col) => {
        const metaWidth = col.meta?.width;
        const colId = col.id || (col as { accessorKey?: string }).accessorKey || '';

        if (!colId) return;

        const isSelectOrExpander = colId === 'select' || colId === 'expander';

        if (isSelectOrExpander) {
          return { ...newSizing, [colId]: 40 };
        } else {
          if (newSizing[colId]) return;

          if (metaWidth && typeof metaWidth === 'number') {
            newSizing[colId] = metaWidth;
            hasChanges = true;
          } else if (col.size && typeof col.size === 'number') {
            newSizing[colId] = col.size;
            hasChanges = true;
          }
        }
      });

      return hasChanges ? newSizing : prev;
    });
  }, [columns]);

  const isUpdatingRef = React.useRef(false);
  React.useEffect(() => {
    if (isUpdatingRef.current) return;

    let needsUpdate = false;
    const checkSizing: Record<string, number> = {};

    columns.forEach((col) => {
      const colId = col.id || (col as { accessorKey?: string }).accessorKey || '';
      if (colId === 'select' || colId === 'expander') {
        checkSizing[colId] = 40;
        if (columnSizing[colId] !== 40) {
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      isUpdatingRef.current = true;
      setColumnSizing((prev) => {
        isUpdatingRef.current = false;
        return {
          ...prev,
          ...checkSizing,
        };
      });
    }
  }, [columnSizing, columns]);

  const shouldEnablePagination = enablePagination && !enableInfiniteScroll;

  const table = useReactTable<TData>({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: shouldEnablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: enableColumnVisibility ? setColumnVisibility : undefined,
    onRowSelectionChange: enableRowSelection ? setRowSelection : undefined,
    onSortingChange: enableSorting ? handleSortingChange : undefined,
    onColumnFiltersChange: enableFiltering ? handleColumnFiltersChange : undefined,
    onPaginationChange: handlePaginationChange,
    onColumnSizingChange: (updater) => {
      setColumnSizing((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const protectedSizing = { ...next };
        columns.forEach((col) => {
          const colId = col.id || (col as { accessorKey?: string }).accessorKey || '';
          if (colId === 'select' || colId === 'expander') {
            protectedSizing[colId] = 40;
          }
        });
        return protectedSizing;
      });
    },
    columnResizeMode: 'onEnd',
    enableColumnResizing,
    manualPagination,
    manualSorting,
    manualFiltering,
    pageCount,
    enableRowSelection,
    state: {
      sorting: enableSorting ? sorting : undefined,
      columnFilters: enableFiltering ? filtering : undefined,
      columnVisibility: enableColumnVisibility || isControlled ? columnVisibility : undefined,
      rowSelection: enableRowSelection ? rowSelection : undefined,
      pagination: paginationState,
      columnSizing,
    },
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand,
  });

  const finalActiveRowId = activeRowId !== undefined ? activeRowId : internalActiveRowId;

  const handleRowClick = React.useCallback(
    (row: Row<TData>) => {
      if (row.getCanExpand()) {
        row.toggleExpanded();
      }
      const rowId = getRowId
        ? getRowId(row.original)
        : ((row.original as Record<string, unknown>)?.id as string | undefined) || row.id;
      setInternalActiveRowId(rowId);
      onRowClick?.(row);
    },
    [onRowClick, getRowId],
  );

  const visibleColumnCount = table.getVisibleFlatColumns().length || columns.length || 1;
  const displayLoading = useMinimumLoading(loading, minimumLoadingDuration);
  const skeletonRowCount =
    data.length > 0
      ? Math.min(data.length, paginationState.pageSize)
      : Math.min(10, pageSizeOptions?.[0] ?? DEFAULT_PAGE_SIZE);
  const showTableSkeleton = displayLoading && !error;
  const selectedCount = enableRowSelection ? table.getFilteredSelectedRowModel().rows.length : 0;
  const showBulkSelection = enableRowSelection && selectedCount > 0 && bulkSelectionActions;

  const getErrorMessage = (): string => {
    if (errorMessage) return errorMessage;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Đã xảy ra lỗi khi tải dữ liệu';
  };

  React.useEffect(() => {
    if (!enableInfiniteScroll || !onLoadMore || !hasMore || infiniteScrollLoading) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      const scrollBottom = scrollHeight - scrollTop - clientHeight;

      if (scrollBottom < 100 && !isLoadingMoreRef.current && hasMore) {
        isLoadingMoreRef.current = true;
        Promise.resolve(onLoadMore()).finally(() => {
          setTimeout(() => {
            isLoadingMoreRef.current = false;
          }, 300);
        });
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll);
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [enableInfiniteScroll, onLoadMore, hasMore, infiniteScrollLoading]);

  const handleAutoSize = React.useCallback(
    (header: Header<TData, unknown>) => {
      const column = header.column;
      const columnId = column.id;

      const cells = table
        .getRowModel()
        .rows.flatMap((row) => row.getVisibleCells().filter((cell) => cell.column.id === columnId));

      const measureElement = document.createElement('div');
      measureElement.style.position = 'absolute';
      measureElement.style.visibility = 'hidden';
      measureElement.style.height = 'auto';
      measureElement.style.width = 'auto';
      measureElement.style.whiteSpace = 'nowrap';
      measureElement.style.padding = '0';
      const tableElement = document.querySelector('table');
      if (tableElement) {
        const headerCell = tableElement.querySelector('th');
        if (headerCell) {
          const computedStyle = window.getComputedStyle(headerCell);
          measureElement.style.font = computedStyle.font;
          measureElement.style.fontSize = computedStyle.fontSize;
          measureElement.style.fontFamily = computedStyle.fontFamily;
          measureElement.style.fontWeight = computedStyle.fontWeight;
        }
      }
      document.body.appendChild(measureElement);

      let maxWidth = 0;

      const headerContent = flexRender(column.columnDef.header, header.getContext());
      if (typeof headerContent === 'string' || typeof headerContent === 'number') {
        measureElement.textContent = String(headerContent);
        maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
      } else if (headerContent) {
        const textContent = getTextContent(headerContent);
        if (textContent) {
          measureElement.textContent = textContent;
          maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
        }
      }

      cells.forEach((cell) => {
        const cellContent = flexRender(cell.column.columnDef.cell, cell.getContext());
        if (typeof cellContent === 'string' || typeof cellContent === 'number') {
          measureElement.textContent = String(cellContent);
          maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
        } else if (cellContent) {
          const textContent = getTextContent(cellContent);
          if (textContent) {
            measureElement.textContent = textContent;
            maxWidth = Math.max(maxWidth, measureElement.offsetWidth);
          }
        }
      });

      document.body.removeChild(measureElement);

      const padding = 16;
      const minWidth = column.columnDef.minSize || 50;
      const finalWidth = Math.max(minWidth, maxWidth + padding);

      setColumnSizing((prev) => ({
        ...prev,
        [columnId]: finalWidth,
      }));
    },
    [table],
  );

  const stickyOffsets = React.useMemo(() => {
    const headers = table.getHeaderGroups()[0]?.headers;
    if (!headers) return {};
    const offsets: Record<string, number> = {};
    let leftAcc = 0;
    for (const h of headers) {
      const s = h.column.columnDef.meta?.sticky;
      if (s === 'left') {
        offsets[h.column.id] = leftAcc;
        const id = h.column.id;
        const isFixed = id === 'select' || id === 'expander';
        const w = isFixed
          ? 40
          : h.getSize() > 0
            ? h.getSize()
            : (parseNumericSize(h.column.columnDef.meta?.width) ?? 100);
        leftAcc += w;
      }
    }
    let rightAcc = 0;
    for (let i = headers.length - 1; i >= 0; i--) {
      const h = headers[i];
      const s = h.column.columnDef.meta?.sticky;
      if (s === 'right') {
        offsets[h.column.id] = rightAcc;
        const id = h.column.id;
        const isFixed = id === 'select' || id === 'expander';
        const w = isFixed
          ? 40
          : h.getSize() > 0
            ? h.getSize()
            : (parseNumericSize(h.column.columnDef.meta?.width) ?? 100);
        rightAcc += w;
      }
    }
    return offsets;
  }, [table, columnSizing]);

  return (
    <div className={cn('overflow-hidden flex flex-col min-h-0 min-w-0', className)}>
      <TableTitleSection
        titleProps={titleProps}
        enableColumnVisibility={enableColumnVisibility}
        table={table}
        globalFilterElement={globalFilterElement}
      />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <ScrollArea
          ref={scrollContainerRef}
          className="flex-1 relative rounded-lg border shadow-sm bg-white min-h-0"
          viewportClassName="overflow-y-auto overflow-x-auto h-full"
        >
          <Table
            className="bg-white"
            style={{
              tableLayout: 'fixed',
              width: tableMinWidth ? `max(100%, ${tableMinWidth}px)` : '100%',
            }}
          >
            <colgroup>
              {table.getHeaderGroups()[0]?.headers.map((header) => {
                const columnId = header.column.id;
                const isSelectOrExpander = columnId === 'select' || columnId === 'expander';
                const width = isSelectOrExpander
                  ? '40px'
                  : header.getSize() > 0
                    ? `${header.getSize()}px`
                    : header.column.columnDef.meta?.width
                      ? typeof header.column.columnDef.meta.width === 'number'
                        ? `${header.column.columnDef.meta.width}px`
                        : header.column.columnDef.meta.width
                      : undefined;
                const finalWidth = isSelectOrExpander ? '40px' : width || 'auto';

                return (
                  <col
                    key={header.id}
                    style={{
                      width: finalWidth,
                      minWidth: isSelectOrExpander ? '40px' : undefined,
                      maxWidth: isSelectOrExpander ? '40px' : undefined,
                    }}
                  />
                );
              })}
            </colgroup>
            <TableHeader className="sticky top-0 w-full z-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <React.Fragment key={headerGroup.id}>
                  <TableRow className="!border-b-0">
                    {headerGroup.headers.map((header, index) => {
                      const isLastColumn = index === headerGroup.headers.length - 1;
                      return (
                        <TableHeaderCell
                          key={header.id}
                          header={header}
                          enableSorting={enableSorting}
                          enableFiltering={enableFiltering}
                          enableColumnResizing={enableColumnResizing}
                          onFilterClick={() => setFilterRowVisible((prev) => !prev)}
                          hideHeaderFilterButtons={hideHeaderFilterButtons}
                          isLastColumn={isLastColumn}
                          onResizeStart={
                            header.column.getCanResize()
                              ? (e) => handleResizeStart(e, header)
                              : undefined
                          }
                          onAutoSize={handleAutoSize}
                          stickyOffset={stickyOffsets[header.column.id]}
                        />
                      );
                    })}
                  </TableRow>

                  {showFilterRow && enableFiltering && filterRowVisible && (
                    <TableFilterRow
                      headers={headerGroup.headers}
                      table={table}
                      onClose={() => setFilterRowVisible(false)}
                      stickyOffsets={stickyOffsets}
                    />
                  )}
                </React.Fragment>
              ))}
            </TableHeader>

            <TableBody>
              {showTableSkeleton ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0">
                    <div className="p-6">
                      <TableSkeleton
                        columns={visibleColumnCount}
                        rows={skeletonRowCount}
                        showToolbar={false}
                        showHeader={false}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ) : error && !loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-48">
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                      <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-6 py-6 text-center min-w-[300px]">
                        <p className="text-base font-semibold text-destructive">
                          {getErrorMessage()}
                        </p>
                        {onRetry && (
                          <Button
                            type="button"
                            variant="outline"
                            size="default"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (e.nativeEvent) {
                                e.nativeEvent.stopImmediatePropagation();
                              }
                              onRetry();
                            }}
                            className="mt-1"
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Thử lại
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel()?.rows?.length > 0 ? (
                <>
                  {table.getRowModel()?.rows?.map((row, rowIndex) => (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={
                          finalActiveRowId &&
                          (getRowId
                            ? getRowId(row.original) === finalActiveRowId
                            : (row.original as Record<string, unknown>)?.id === finalActiveRowId ||
                              row.id === finalActiveRowId)
                            ? 'active'
                            : enableRowSelection && row?.getIsSelected()
                              ? 'selected'
                              : undefined
                        }
                        onClick={() => handleRowClick(row)}
                        className={cn(
                          (row.getCanExpand() || onRowClick) && 'cursor-pointer hover:bg-muted/50',
                        )}
                        style={{
                          animation: `row-appear 0.4s ease-out ${Math.min(rowIndex * 30, 300)}ms both`,
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCellWithTooltip
                            key={cell.id}
                            cell={cell}
                            stickyOffset={stickyOffsets[cell.column.id]}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCellWithTooltip>
                        ))}
                      </TableRow>

                      {row.getIsExpanded() && renderSubComponent && (
                        <TableRow>
                          <TableCell colSpan={row.getVisibleCells().length} className="bg-muted/30">
                            {renderSubComponent({ row })}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  {enableInfiniteScroll && (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className={cn('text-center', infiniteScrollLoading ? 'p-0' : 'h-8')}
                      >
                        {infiniteScrollLoading ? (
                          <div className="p-4">
                            <TableSkeleton
                              columns={visibleColumnCount}
                              rows={Math.max(1, Math.min(3, skeletonRowCount))}
                              showToolbar={false}
                              showHeader={false}
                              className="mb-0"
                            />
                          </div>
                        ) : !hasMore && table.getRowModel()?.rows?.length > 0 ? (
                          <span className="text-muted-foreground text-sm">Đã hiển thị tất cả</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center bg-white">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {resizeLine.visible && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-primary/70 z-50 pointer-events-none"
              style={{ left: resizeLine.left }}
            />
          )}
        </ScrollArea>

        {shouldEnablePagination && (
          <TablePagination
            table={table}
            pageSizeOptions={pageSizeOptions}
            totalCount={totalCount}
          />
        )}

        {showBulkSelection && bulkSelectionActions && (
          <BulkSelectionBar table={table} actions={bulkSelectionActions(table)} />
        )}
      </div>
    </div>
  );
}
