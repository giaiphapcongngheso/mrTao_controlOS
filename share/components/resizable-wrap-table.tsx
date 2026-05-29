import {
  type ColumnDef,
  type PaginationState,
  type SortingState,
  Updater,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, Filter, Search } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib';
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui';

import { TablePagination } from './table-pagination';

// ─── Constants ────────────────────────────────────────────────────────────────

const WRAP_CLASS = 'whitespace-normal break-words align-middle';
const DEFAULT_MIN_WIDTH = 50;
const DEFAULT_MAX_WIDTH = 800;

export interface ResizableWrapTableToolbarProps {
  readonly searchPlaceholder?: string;
  readonly searchValue?: string;
  readonly onSearchChange?: (value: string) => void;
  /** Debounce delay (ms) for the search input. Default 0 (no debounce). */
  readonly searchDebounce?: number;
  readonly filterLabel?: React.ReactNode;
  readonly filterPopoverTitle?: React.ReactNode;
  readonly renderFilterContent?: (close: () => void) => React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly rightActions?: React.ReactNode;
  /** Tổng số item (toàn bộ). */
  readonly totalCount?: number;
  /** Số item đang hiển thị (sau filter). Khi khác totalCount sẽ hiện "đang xem X / Y". */
  readonly filteredCount?: number;
  /** Số lượng bộ lọc đang được áp dụng. */
  readonly filterCount?: number;
}

// Keep filter config for type compatibility; UI filter row is removed.
export interface ResizableWrapTableFilterConfig {
  readonly type: 'text' | 'select';
  readonly placeholder?: string;
  readonly options?: ReadonlyArray<{ label: string; value: string }>;
  readonly accessorKey?: string;
}
export interface ResizableWrapTableColumn<T> {
  readonly id: string;
  readonly header: React.ReactNode;
  /** Optional tooltip shown when hovering the column header. */
  readonly headerTooltip?: React.ReactNode;
  /** Cell render function. Receives the original data row. */
  readonly cell: (row: T, index: number) => React.ReactNode;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly defaultWidth?: number;
  /**
   * Optional: if provided, column becomes sortable.
   */
  readonly sortable?: boolean;
  /**
   * Optional: data field key for sorting. Defaults to `id`.
   * Use when `id` doesn't match a real property in the data object.
   */
  readonly accessorKey?: string;
  /**
   * Optional: if provided, column gets a filter input in the filter row.
   */
  readonly filter?: ResizableWrapTableFilterConfig;
  /**
   * Pin column to the left or right edge of the table.
   * Pinned columns stay visible while scrolling horizontally.
   */
  readonly sticky?: 'left' | 'right';
  /** Optional tooltip for the cell, can be a function of the row data. */
  readonly tooltip?: (row: T) => React.ReactNode;
  /** Extra class(es) applied to the <TableHead> of this column. */
  readonly headerClassName?: string;
  /** Extra class(es) applied to each <TableCell> of this column. */
  readonly cellClassName?: string | ((row: T) => string);
  /**
   * Text alignment for the column header.
   * - 'left': left-aligned
   * - 'center': centered (default for non-sortable columns)
   * - 'right': right-aligned
   * Sortable columns default to 'left'.
   */
  readonly headerAlign?: 'left' | 'center' | 'right';
}

// ─── Column Group ─────────────────────────────────────────────────────────────

/**
 * Defines a grouped header that spans multiple consecutive columns.
 *
 * Example:
 * { label: 'Kích thước', columnIds: ['dimensionL', 'dimensionW', 'dimensionH'] }
 */
export interface ResizableWrapTableColumnGroup {
  readonly label: React.ReactNode;
  readonly columnIds: readonly string[];
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ResizableWrapTableProps<T> {
  readonly columns: readonly ResizableWrapTableColumn<T>[];
  readonly data: readonly T[];
  readonly getRowId?: (row: T) => string | number;
  readonly emptyMessage?: React.ReactNode;
  readonly className?: string;
  /**
   * Optional: grouped column headers → 2-row thead.
   * Columns not listed in any group are rendered with rowSpan=2.
   * Backward-compatible: omit = original 1-row header.
   */
  readonly columnGroups?: readonly ResizableWrapTableColumnGroup[];
  /**
   * Optional: show pagination row below the table.
   * Default: false. Sorting is handled by TanStack Table, filtering is expected
   * to be done at the caller level (e.g. via `toolbarProps`).
   */
  readonly showPagination?: boolean;
  readonly manualPagination?: boolean;
  readonly pageCount?: number;
  readonly pagination?: PaginationState;
  readonly onPaginationChange?: (updater: Updater<PaginationState>) => void;
  readonly pageSizeOptions?: readonly number[];
  readonly defaultPageSize?: number;
  readonly toolbarProps?: ResizableWrapTableToolbarProps;
  /**
   * Minimum table width in pixels. When the container is narrower,
   * a horizontal scrollbar appears instead of compressing columns.
   */
  readonly tableMinWidth?: number;
  /**
   * Max height for the scrollable table body area.
   * Accepts any CSS value, e.g. `500`, `"calc(100vh - 300px)"`.
   * When set, the body scrolls vertically and the header stays sticky.
   */
  readonly maxBodyHeight?: number | string;
  /**
   * Layout mode for columns:
   * - 'fixed': Columns use fixed pixel widths (original behavior).
   * - 'fit': Columns use percentage widths to fit the container.
   * Default: 'fixed'
   */
  readonly layoutMode?: 'fixed' | 'fit';
  /**
   * Optional: return a CSS class string for each row, e.g. for pending-state highlighting.
   */
  readonly getRowClassName?: (row: T) => string | undefined;
  /**
   * Optional: render an expandable sub-row beneath each data row.
   * Return `null`/`undefined` to skip. Content will span all columns.
   */
  readonly renderSubRow?: (row: T, index: number) => React.ReactNode;
  /**
   * Optional: handle click on the entire row.
   */
  readonly onRowClick?: (row: T, index: number) => void;
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────

function SortIcon({ sorted }: { readonly sorted: false | 'asc' | 'desc' }) {
  if (!sorted) return null;
  if (sorted === 'asc') return <ChevronDown className="h-4 w-4 text-white" />;
  return <ChevronUp className="h-4 w-4 text-white" />;
}

// ─── Debounced Search Input ────────────────────────────────────────────────────

function DebouncedSearchInput({
  value,
  onChange,
  debounce,
  placeholder,
}: Readonly<{
  value: string;
  onChange?: (value: string) => void;
  debounce: number;
  placeholder: string;
}>) {
  const [localValue, setLocalValue] = React.useState(value);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>(null);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;

  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      setLocalValue(v);
      if (debounce <= 0) {
        onChangeRef.current?.(v);
        return;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onChangeRef.current?.(v), debounce);
    },
    [debounce],
  );

  return (
    <Input
      size="sm"
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      icon={<Search className="h-4 w-4" />}
      position="left"
      containerClassName="w-100"
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResizableWrapTable<T extends object>({
  columns,
  data,
  getRowId,
  emptyMessage = 'Không có dữ liệu',
  className,
  columnGroups,
  showPagination = false,
  manualPagination = false,
  pageCount,
  pagination: controlledPagination,
  onPaginationChange: controlledOnPaginationChange,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  toolbarProps,
  tableMinWidth,
  maxBodyHeight,
  layoutMode = 'fixed',
  getRowClassName,
  renderSubRow,
  onRowClick,
}: ResizableWrapTableProps<T>) {
  const colCount = columns.length;
  const hasSortable = React.useMemo(() => columns.some((c) => c.sortable), [columns]);
  const needsTanstack = hasSortable || showPagination;

  // ── Resize state ────────────────────────────────────────────────────────────

  const [sizing, setSizing] = React.useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    columns.forEach((col) => {
      if (col.defaultWidth != null) initial[col.id] = col.defaultWidth;
    });
    return initial;
  });

  const getWidth = React.useCallback(
    (col: ResizableWrapTableColumn<T>) => {
      const minW = col.minWidth ?? DEFAULT_MIN_WIDTH;
      const maxW = col.maxWidth ?? DEFAULT_MAX_WIDTH;
      const w = sizing[col.id] ?? col.defaultWidth;
      if (w == null) return undefined;
      return Math.min(maxW, Math.max(minW, w));
    },
    [sizing],
  );

  const totalWeight = React.useMemo(
    () =>
      columns.reduce(
        (sum, col) => sum + (getWidth(col) ?? col.defaultWidth ?? DEFAULT_MIN_WIDTH),
        0,
      ),
    [columns, getWidth],
  );

  const getWidthPercent = React.useCallback(
    (col: ResizableWrapTableColumn<T>) => {
      const w = getWidth(col) ?? col.defaultWidth ?? DEFAULT_MIN_WIDTH;
      if (totalWeight <= 0) return '0%';
      return `${(w / totalWeight) * 100}%`;
    },
    [getWidth, totalWeight],
  );

  const stickyOffsets = React.useMemo(() => {
    const offsets: Record<string, number> = {};
    let leftAcc = 0;
    for (const col of columns) {
      if (col.sticky === 'left') {
        offsets[col.id] = leftAcc;
        leftAcc += getWidth(col) ?? col.defaultWidth ?? DEFAULT_MIN_WIDTH;
      }
    }
    let rightAcc = 0;
    for (let i = columns.length - 1; i >= 0; i--) {
      const col = columns[i];
      if (col.sticky === 'right') {
        offsets[col.id] = rightAcc;
        rightAcc += getWidth(col) ?? col.defaultWidth ?? DEFAULT_MIN_WIDTH;
      }
    }
    return offsets;
  }, [columns, getWidth]);

  // ── Resize drag ─────────────────────────────────────────────────────────────

  const resizeRef = React.useRef<{
    columnId: string;
    startX: number;
    startWidth: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);

  const handleResizeStart = React.useCallback(
    (e: React.MouseEvent, col: ResizableWrapTableColumn<T>) => {
      e.preventDefault();
      e.stopPropagation();
      const w = getWidth(col);
      if (w == null) return;
      resizeRef.current = {
        columnId: col.id,
        startX: e.clientX,
        startWidth: w,
        minWidth: col.minWidth ?? DEFAULT_MIN_WIDTH,
        maxWidth: col.maxWidth ?? DEFAULT_MAX_WIDTH,
      };

      const onMove = (moveEvent: MouseEvent) => {
        // Snapshot ref immediately — onUp may null it before setSizing callback runs
        const ref = resizeRef.current;
        if (!ref) return;
        const delta = moveEvent.clientX - ref.startX;
        const next = Math.round(
          Math.min(ref.maxWidth, Math.max(ref.minWidth, ref.startWidth + delta)),
        );
        setSizing((prev) => ({ ...prev, [ref.columnId]: next }));
      };
      const onUp = () => {
        resizeRef.current = null;
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [getWidth],
  );

  // ── TanStack Table (filter / sort / pagination) ─────────────────────────────

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [internalPagination, setInternalPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const finalPagination = controlledPagination ?? internalPagination;
  const onPaginationChange = controlledOnPaginationChange ?? setInternalPagination;

  // Build TanStack column defs from our column definitions
  const tanstackCols = React.useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        accessorKey: col.accessorKey ?? col.id,
        enableSorting: col.sortable ?? false,
      })),
    [columns],
  );

  const tanTable = useReactTable({
    data: data as T[],
    columns: tanstackCols,
    state: needsTanstack ? { sorting, pagination: finalPagination } : {},
    onSortingChange: needsTanstack ? setSorting : undefined,
    onPaginationChange: needsTanstack ? onPaginationChange : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: needsTanstack && !manualPagination ? getSortedRowModel() : undefined,
    getPaginationRowModel: needsTanstack && !manualPagination ? getPaginationRowModel() : undefined,
    manualPagination,
    pageCount,
  });

  // Rows to display (filtered + sorted + paginated if tanstack is active)
  const displayRows = needsTanstack
    ? tanTable.getRowModel().rows
    : data.map((d, i) => ({
        id: `${i}`,
        index: i,
        original: d,
      }));

  // ── Grouped header computation ──────────────────────────────────────────────

  const groupedHeader = React.useMemo(() => {
    if (!columnGroups || columnGroups.length === 0) return null;

    const groupedColIds = new Set<string>();
    columnGroups.forEach((g) => g.columnIds.forEach((id) => groupedColIds.add(id)));

    type Row1Slot =
      | { type: 'standalone'; col: ResizableWrapTableColumn<T>; colIdx: number }
      | { type: 'group'; group: ResizableWrapTableColumnGroup; groupIdx: number; span: number };

    const row1Slots: Row1Slot[] = [];
    let i = 0;
    while (i < columns.length) {
      const col = columns[i];
      const grpIdx = columnGroups.findIndex((g) => g.columnIds[0] === col.id);
      if (grpIdx !== -1) {
        const grp = columnGroups[grpIdx];
        row1Slots.push({ type: 'group', group: grp, groupIdx: grpIdx, span: grp.columnIds.length });
        i += grp.columnIds.length;
      } else if (!groupedColIds.has(col.id)) {
        row1Slots.push({ type: 'standalone', col, colIdx: i });
        i++;
      } else {
        i++;
      }
    }

    return { row1Slots, groupedColIds };
  }, [columnGroups, columns]);

  // ── Header cell renderer ────────────────────────────────────────────────────

  const renderHeadCell = (
    col: ResizableWrapTableColumn<T>,
    index: number,
    extraProps?: React.ThHTMLAttributes<HTMLTableCellElement>,
  ) => {
    const w = getWidth(col) ?? col.defaultWidth ?? DEFAULT_MIN_WIDTH;
    const widthStyle = layoutMode === 'fit' ? getWidthPercent(col) : `${w}px`;
    const isLast = index === columns.length - 1;
    const tanCol = needsTanstack ? tanTable.getColumn(col.id) : null;
    const sorted = tanCol?.getIsSorted();

    const stickyStyle: React.CSSProperties | undefined = col.sticky
      ? { [col.sticky]: `${stickyOffsets[col.id] ?? 0}px` }
      : undefined;

    return (
      <TableHead
        key={col.id}
        sticky={col.sticky}
        tooltip={col.headerTooltip}
        className={cn(
          WRAP_CLASS,
          'py-0 px-2 text-sm first:rounded-tl-lg last:rounded-tr-lg',
          col.headerClassName,
        )}
        style={{
          width: widthStyle,
          boxSizing: 'border-box',
          ...stickyStyle,
          ...extraProps?.style,
        }}
        {...extraProps}
      >
        <div
          className={cn(
            'flex items-center gap-1 rounded-md py-1 px-1 transition-colors',
            col.sortable && 'cursor-pointer hover:bg-white/15',
            col.sortable && sorted && 'bg-white/15',
            col.headerAlign === 'left'
              ? 'justify-start'
              : col.headerAlign === 'right'
                ? 'justify-end'
                : col.headerAlign === 'center'
                  ? 'justify-center'
                  : !col.sortable
                    ? 'justify-center'
                    : 'justify-start',
          )}
          onClick={
            col.sortable && tanCol
              ? () => {
                  if (!sorted) {
                    tanCol.toggleSorting(false);
                  } else if (sorted === 'asc') {
                    tanCol.toggleSorting(true);
                  } else {
                    tanCol.clearSorting();
                  }
                }
              : undefined
          }
        >
          <span className="whitespace-normal break-words">{col.header}</span>
          {col.sortable && (
            <span className="shrink-0 inline-flex items-center justify-center h-4 w-4 text-white/70">
              <SortIcon sorted={sorted || false} />
            </span>
          )}
        </div>
        {/* Separator + Resize handle */}
        {!isLast && (
          <>
            <span
              className="absolute right-0 top-1/2 -translate-y-1/2 w-px bg-foreground/15 pointer-events-none"
              style={{ height: '35%' }}
            />
            <div
              onMouseDown={(e) => handleResizeStart(e, col)}
              className="absolute top-0 h-full cursor-col-resize select-none touch-none z-10 hover:bg-foreground/5"
              style={{ right: '-2px', width: '5px' }}
            />
          </>
        )}
      </TableHead>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasSearch = !!toolbarProps?.onSearchChange;
  const hasFilterPopover = !!toolbarProps?.renderFilterContent;
  const hasActions = !!toolbarProps?.actions;
  const hasRightActions = !!toolbarProps?.rightActions;
  const hasCountSummary = toolbarProps?.totalCount != null;
  const showFilteredCount =
    hasCountSummary &&
    toolbarProps?.filteredCount != null &&
    toolbarProps.filteredCount !== toolbarProps.totalCount;
  const showToolbar =
    !!toolbarProps &&
    (hasSearch || hasFilterPopover || hasActions || hasRightActions || hasCountSummary);
  const [filterOpen, setFilterOpen] = React.useState(false);
  const resolvedMaxBodyHeight =
    maxBodyHeight == null
      ? undefined
      : typeof maxBodyHeight === 'number'
        ? `${maxBodyHeight}px`
        : maxBodyHeight;

  return (
    <div
      className={cn(
        'rounded-lg bg-background min-w-0 flex flex-col min-h-0',
        maxBodyHeight ? 'h-auto' : 'h-full',
        className,
      )}
    >
      {showToolbar && (
        <div className="shrink-0 flex flex-wrap items-center justify-start gap-2 border-b bg-muted/40 px-3 py-2">
          <div className="min-w-0 items-center gap-2">
            {hasSearch && (
              <DebouncedSearchInput
                placeholder={toolbarProps?.searchPlaceholder ?? 'Tìm kiếm...'}
                value={toolbarProps?.searchValue ?? ''}
                onChange={toolbarProps?.onSearchChange}
                debounce={toolbarProps?.searchDebounce ?? 0}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasFilterPopover && (
              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="relative gap-1.5">
                    <Filter className="h-4 w-4" />
                    <span>{toolbarProps?.filterLabel ?? 'Lọc'}</span>
                    {!!toolbarProps?.filterCount && toolbarProps.filterCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                        {toolbarProps.filterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-fit max-w-[95vw] p-3 space-y-2">
                  {toolbarProps?.filterPopoverTitle && (
                    <div className="text-sm font-medium">{toolbarProps.filterPopoverTitle}</div>
                  )}
                  {toolbarProps?.renderFilterContent?.(() => setFilterOpen(false))}
                </PopoverContent>
              </Popover>
            )}
            {toolbarProps?.actions}
          </div>
          {(hasRightActions || hasCountSummary) && (
            <div className="ml-auto flex items-center gap-3">
              {hasCountSummary && toolbarProps && (
                <div className="text-sm text-muted-foreground">
                  {showFilteredCount ? (
                    <span>
                      Đang xem {toolbarProps.filteredCount} / {toolbarProps.totalCount}
                    </span>
                  ) : (
                    <span>Tổng: {toolbarProps.totalCount}</span>
                  )}
                </div>
              )}
              {toolbarProps?.rightActions}
            </div>
          )}
        </div>
      )}
      <div
        className="min-h-0 rounded-b-lg flex-1 overflow-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]"
        style={resolvedMaxBodyHeight ? { maxHeight: resolvedMaxBodyHeight } : undefined}
      >
        <Table
          style={{ tableLayout: 'fixed', width: `max(100%, ${tableMinWidth ?? totalWeight}px)` }}
        >
          <colgroup>
            {columns.map((col) => {
              const w = getWidth(col) ?? col.defaultWidth ?? DEFAULT_MIN_WIDTH;
              const widthStyle = layoutMode === 'fit' ? getWidthPercent(col) : `${w}px`;
              return <col key={col.id} style={{ width: widthStyle }} />;
            })}
          </colgroup>

          <TableHeader className="sticky top-0 z-40">
            {/* ── Case 1: no column groups → 1-row header ── */}
            {!groupedHeader ? (
              <TableRow>{columns.map((col, index) => renderHeadCell(col, index))}</TableRow>
            ) : (
              <>
                {/* ── Case 2: 2-row header with column groups ── */}
                <TableRow>
                  {groupedHeader.row1Slots.map((slot) => {
                    if (slot.type === 'group') {
                      return (
                        <TableHead
                          key={`group-${slot.groupIdx}`}
                          colSpan={slot.span}
                          className={cn(
                            'sticky z-40 py-2 px-3 text-center text-sm font-semibold border-b border-white/30 tracking-wide !rounded-none first:!rounded-none last:!rounded-none',
                          )}
                          style={{ top: 0 }}
                        >
                          {slot.group.label}
                        </TableHead>
                      );
                    }
                    return renderHeadCell(slot.col, slot.colIdx, {
                      rowSpan: 2,
                    });
                  })}
                </TableRow>
                <TableRow>
                  {columns
                    .filter((col) => groupedHeader.groupedColIds.has(col.id))
                    .map((col, idx, arr) => {
                      const isLastGrouped = idx === arr.length - 1;
                      const globalIdx = columns.findIndex((c) => c.id === col.id);
                      return renderHeadCell(col, isLastGrouped ? columns.length - 1 : globalIdx);
                    })}
                </TableRow>
              </>
            )}
          </TableHeader>

          <TableBody>
            {displayRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-center p-8 text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              displayRows.map((row, rowIndex) => {
                const rowKey = getRowId ? getRowId(row.original) : (row.id ?? rowIndex);
                return (
                  <React.Fragment key={rowKey}>
                    <TableRow
                      style={{
                        animation: `row-appear 0.4s ease-out ${Math.min(rowIndex * 30, 300)}ms both`,
                      }}
                      className={cn(
                        getRowClassName?.(row.original),
                        onRowClick && 'cursor-pointer',
                      )}
                      onClick={() => onRowClick?.(row.original as T, rowIndex)}
                    >
                      {columns.map((col) => (
                        <TableCell
                          key={col.id}
                          sticky={col.sticky}
                          tooltip={col.tooltip?.(row.original)}
                          className={cn(
                            WRAP_CLASS,
                            'text-sm',
                            typeof col.cellClassName === 'function'
                              ? col.cellClassName(row.original)
                              : col.cellClassName,
                          )}
                          style={
                            col.sticky
                              ? { [col.sticky]: `${stickyOffsets[col.id] ?? 0}px` }
                              : undefined
                          }
                        >
                          {col.cell(row.original as T, rowIndex)}
                        </TableCell>
                      ))}
                    </TableRow>
                    {(() => {
                      const subContent = renderSubRow?.(row.original as T, rowIndex);
                      if (!subContent) return null;
                      return (
                        <TableRow>
                          <TableCell colSpan={colCount} className="p-0">
                            {subContent}
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="mt-4 border-t border-muted">
          <TablePagination
            table={tanTable}
            pageSizeOptions={[...pageSizeOptions]}
            totalCount={toolbarProps?.totalCount}
          />
        </div>
      )}
    </div>
  );
}
