import * as React from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui';
import { cn } from '../lib/utils';
import { ClipboardPaste } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * Describes a column that can be copied between rows.
 * - `key`: the field name (e.g. `startTime`, `productionOperationId`)
 * - `label`: human-readable header label
 * - `render`: optional render function to display the current value nicely
 *   in the row summary (defaults to `String(value)`)
 */
export interface CopyableColumn {
  readonly key: string;
  readonly label: string;
  readonly render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

export interface CopyRowValuesDialogProps {
  /** Whether the dialog is open. */
  readonly open: boolean;
  /** Callback when the dialog open state changes. */
  readonly onOpenChange: (open: boolean) => void;
  /** Index of the source row (0-based). */
  readonly sourceIndex: number;
  /** All detail rows from `useFieldArray`. */
  readonly fields: Record<string, unknown>[];
  /** Columns that can be copied. */
  readonly columns: readonly CopyableColumn[];
  /**
   * Called when user confirms paste.
   * @param targetIndices — indices of rows to paste into
   * @param columnKeys — field keys to paste
   */
  readonly onPaste: (targetIndices: number[], columnKeys: string[]) => void;
  /** Label describing the row, shown as subtitle in the target list. */
  readonly getRowLabel?: (row: Record<string, unknown>, index: number) => React.ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function CopyRowValuesDialog({
  open,
  onOpenChange,
  sourceIndex,
  fields,
  columns,
  onPaste,
  getRowLabel,
}: CopyRowValuesDialogProps) {
  const [selectedColumns, setSelectedColumns] = React.useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = React.useState<Set<number>>(new Set());

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setSelectedColumns(new Set());
      setSelectedRows(new Set());
    }
  }, [open]);

  const targetRows = React.useMemo(
    () => fields.map((f, i) => ({ row: f, index: i })).filter((r) => r.index !== sourceIndex),
    [fields, sourceIndex],
  );

  // ── Column selection helpers ────────────────────────────────────────────────

  const toggleColumn = (key: string) =>
    setSelectedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const allColumnsSelected = columns.length > 0 && selectedColumns.size === columns.length;

  const toggleAllColumns = () => {
    if (allColumnsSelected) setSelectedColumns(new Set());
    else setSelectedColumns(new Set(columns.map((c) => c.key)));
  };

  // ── Row selection helpers ───────────────────────────────────────────────────

  const toggleRow = (index: number) =>
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const allRowsSelected = targetRows.length > 0 && selectedRows.size === targetRows.length;

  const toggleAllRows = () => {
    if (allRowsSelected) setSelectedRows(new Set());
    else setSelectedRows(new Set(targetRows.map((r) => r.index)));
  };

  // ── Handle paste ──────────────────────────────────────────────────────────

  const canPaste = selectedColumns.size > 0 && selectedRows.size > 0;

  const handlePaste = () => {
    onPaste(Array.from(selectedRows), Array.from(selectedColumns));
    onOpenChange(false);
  };

  // ── Source row values preview ─────────────────────────────────────────────

  const sourceRow = fields[sourceIndex] as Record<string, unknown> | undefined;

  const renderValue = (col: CopyableColumn) => {
    if (!sourceRow) return '—';
    const val = sourceRow[col.key];
    if (col.render) return col.render(val, sourceRow);
    if (val == null || val === '')
      return <span className="text-muted-foreground italic">trống</span>;
    return String(val);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Dán giá trị từ dòng {sourceIndex + 1}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-5 py-2 pr-1">
          {/* ── Section 1: Choose columns ─────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">1. Chọn cột cần dán</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={toggleAllColumns}
              >
                {allColumnsSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {columns.map((col) => {
                const checked = selectedColumns.has(col.key);
                return (
                  <label
                    key={col.key}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                      checked
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleColumn(col.key)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{col.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        Giá trị: {renderValue(col)}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* ── Section 2: Choose target rows ────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">
                2. Chọn dòng đích ({selectedRows.size}/{targetRows.length})
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={toggleAllRows}
              >
                {allRowsSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            </div>
            <div className="space-y-1.5">
              {targetRows.map(({ row, index }) => {
                const checked = selectedRows.has(index);
                const label = getRowLabel ? getRowLabel(row, index) : `Dòng ${index + 1}`;
                return (
                  <label
                    key={index}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer transition-all',
                      checked
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggleRow(index)} />
                    <div className="flex-1 min-w-0 text-sm">{label}</div>
                  </label>
                );
              })}
              {targetRows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Không có dòng nào khác để dán.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" onClick={handlePaste} disabled={!canPaste}>
            <ClipboardPaste className="h-4 w-4 mr-1" />
            Dán ({selectedRows.size} dòng)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
