import { cn } from '../../lib/utils';
import { Button, Combobox, Input, Switch } from '../../ui';
import { NumericInput } from '../../ui/numeric-input';
import { ResizableWrapTable, type ResizableWrapTableColumn } from '../resizable-wrap-table';
import { ActionStack } from '../custom/action-stack';
import { CopyRowValuesDialog, type CopyableColumn } from '../copy-row-values-dialog';
import { ChevronRight, ClipboardPaste, Copy, Pin, Plus, Trash2, X } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ITechSpecColumn,
  ITechSpecSection,
  ITechSpecTable,
  ITechSpecTemplate,
  ITechSpecValues,
} from '../../types/tech-spec.types';
import { ETechSpecDataType, ETechSpecDataSourceType } from '../../types/tech-spec.types';
import { useMasterTableDropdown } from '../../hooks/use-master-table-dropdown';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TechSpecValueEntryProps = Readonly<{
  /** Template cấu trúc — định nghĩa section/table/column */
  template: ITechSpecTemplate;
  /** Dữ liệu giá trị hiện tại (EAV) */
  values: ITechSpecValues;
  /** Callback khi giá trị thay đổi */
  onChange: (values: ITechSpecValues) => void;
  /** Chế độ chỉ xem */
  readOnly?: boolean;
  /** Class bổ sung */
  className?: string;
}>;

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TechSpecValueEntry({
  template,
  values,
  onChange,
  readOnly = false,
  className,
}: TechSpecValueEntryProps) {
  const sortedSections = useMemo(
    () => [...(template.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [template.sections],
  );

  // Pinned sections
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(new Set());
  const togglePin = useCallback((sectionId: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const pinnedSections = useMemo(
    () => sortedSections.filter((s) => pinnedIds.has(s.id)),
    [sortedSections, pinnedIds],
  );

  // Ref giữ giá trị mới nhất → callback không cần recreate khi values thay đổi
  const valuesRef = useRef(values);
  valuesRef.current = values;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const updateCellValue = useCallback(
    (tableId: string, rowIndex: number, columnId: string, value: string) => {
      const v = valuesRef.current;
      const currentRows = v.tableRows[tableId] ?? [];
      const rows = [...currentRows];
      while (rows.length <= rowIndex) {
        rows.push({});
      }
      rows[rowIndex] = { ...rows[rowIndex], [columnId]: value };
      onChangeRef.current({
        ...v,
        tableRows: { ...v.tableRows, [tableId]: rows },
      });
    },
    [],
  );

  const addRow = useCallback((tableId: string) => {
    const v = valuesRef.current;
    const currentRows = v.tableRows[tableId] ?? [];
    onChangeRef.current({
      ...v,
      tableRows: { ...v.tableRows, [tableId]: [...currentRows, {}] },
    });
  }, []);

  const removeRow = useCallback((tableId: string, rowIndex: number) => {
    const v = valuesRef.current;
    const currentRows = v.tableRows[tableId] ?? [];
    onChangeRef.current({
      ...v,
      tableRows: {
        ...v.tableRows,
        [tableId]: currentRows.filter((_, i) => i !== rowIndex),
      },
    });
  }, []);

  const duplicateRow = useCallback((tableId: string, rowIndex: number) => {
    const v = valuesRef.current;
    const currentRows = v.tableRows[tableId] ?? [];
    const source = currentRows[rowIndex];
    if (!source) return;
    const newRows = [...currentRows];
    newRows.splice(rowIndex + 1, 0, { ...source });
    onChangeRef.current({
      ...v,
      tableRows: { ...v.tableRows, [tableId]: newRows },
    });
  }, []);

  const pasteRowValues = useCallback(
    (tableId: string, sourceIndex: number, targetIndices: number[], columnKeys: string[]) => {
      const v = valuesRef.current;
      const currentRows = [...(v.tableRows[tableId] ?? [])];
      const source = currentRows[sourceIndex];
      if (!source) return;
      const targetSet = new Set(targetIndices);
      for (let i = 0; i < currentRows.length; i++) {
        if (targetSet.has(i)) {
          const updated = { ...currentRows[i] };
          for (const key of columnKeys) {
            updated[key] = source[key] ?? '';
          }
          currentRows[i] = updated;
        }
      }
      onChangeRef.current({
        ...v,
        tableRows: { ...v.tableRows, [tableId]: currentRows },
      });
    },
    [],
  );

  const hasPinned = pinnedSections.length > 0;

  return (
    <div className={cn('flex gap-4 h-[calc(100vh-200px)]', className)}>
      {/* Pinned sidebar */}
      {hasPinned && <PinnedSidebar sections={pinnedSections} values={values} onUnpin={togglePin} />}

      {/* Main sections — cuộn riêng */}
      <div className={cn('space-y-6 min-w-0 overflow-y-auto', hasPinned ? 'flex-1' : 'w-full')}>
        {sortedSections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            values={values}
            updateCellValue={updateCellValue}
            addRow={addRow}
            removeRow={removeRow}
            duplicateRow={duplicateRow}
            pasteRowValues={pasteRowValues}
            readOnly={readOnly}
            isPinned={pinnedIds.has(section.id)}
            onTogglePin={togglePin}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pinned Sidebar — thanh dọc bên trái hiện dữ liệu đã ghim (chỉ xem)
// ---------------------------------------------------------------------------

function PinnedSidebar({
  sections,
  values,
  onUnpin,
}: {
  sections: ITechSpecSection[];
  values: ITechSpecValues;
  onUnpin: (sectionId: string) => void;
}) {
  return (
    <div className="w-[260px] shrink-0 space-y-3 rounded-lg border bg-muted/30 p-3 overflow-y-auto max-h-[calc(100vh-200px)]">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Pin className="h-3 w-3" />
        Đã ghim
      </div>
      {sections.map((section) => (
        <div key={section.id} className="rounded-md bg-background ">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">{section.name}</span>
            <button
              type="button"
              onClick={() => onUnpin(section.id)}
              className="rounded p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Bỏ ghim"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          {(section.tables ?? []).map((table) => {
            const rows = values.tableRows[table.id] ?? [];
            if (rows.length === 0) return null;
            return (
              <div key={table.id} className="mb-2 last:mb-0">
                {table.name && (
                  <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {table.name}
                  </div>
                )}
                {rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="space-y-0.5 mb-1.5 last:mb-0">
                    {rowIdx > 0 && <div className="border-t border-dashed my-1" />}
                    {(table.columns ?? [])
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((col) => {
                        const cellVal = row[col.id];
                        if (!cellVal) return null;
                        return (
                          <div key={col.id} className="flex gap-1 text-[11px] leading-tight">
                            <span className="text-muted-foreground shrink-0">{col.name}:</span>
                            <span className="text-foreground font-medium break-all">{cellVal}</span>
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section Block
// ---------------------------------------------------------------------------

function SectionBlock({
  section,
  values,
  updateCellValue,
  addRow,
  removeRow,
  duplicateRow,
  pasteRowValues,
  readOnly,
  isPinned,
  onTogglePin,
}: {
  section: ITechSpecSection;
  values: ITechSpecValues;
  updateCellValue: (tableId: string, rowIndex: number, columnId: string, value: string) => void;
  addRow: (tableId: string) => void;
  removeRow: (tableId: string, rowIndex: number) => void;
  duplicateRow: (tableId: string, rowIndex: number) => void;
  pasteRowValues: (
    tableId: string,
    sourceIndex: number,
    targetIndices: number[],
    columnKeys: string[],
  ) => void;
  readOnly: boolean;
  isPinned: boolean;
  onTogglePin: (sectionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const sortedTables = useMemo(
    () => [...(section.tables ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [section.tables],
  );

  return (
    <div className="rounded-lg  overflow-hidden">
      {/* Section header — click to toggle */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-fit min-w-[200px] rounded-lg cursor-pointer items-center gap-2.5 bg-primary px-4 py-2.5 text-left transition-colors hover:bg-primary/90"
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 shrink-0 text-white transition-transform duration-200',
              expanded && 'rotate-90',
            )}
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-white">{section.name}</h3>
            {section.description && <p className="text-xs text-white">{section.description}</p>}
          </div>
          <span className="text-[10px] font-medium text-white">{sortedTables.length} bảng</span>
        </button>
        {/* Pin button */}
        <button
          type="button"
          onClick={() => onTogglePin(section.id)}
          className={cn(
            'rounded-lg p-2.5 transition-colors',
            isPinned
              ? 'bg-primary text-white hover:bg-primary/90'
              : 'bg-muted text-muted-foreground hover:bg-muted/70 hover:text-primary',
          )}
          title={isPinned ? 'Bỏ ghim' : 'Ghim section'}
        >
          <Pin className={cn('h-4 w-4', isPinned && 'fill-current')} />
        </button>
      </div>

      {/* Tables — collapsible */}
      {expanded && (
        <div className="space-y-4 bg-white p-4">
          {sortedTables.map((table) => (
            <TableBlock
              key={table.id}
              table={table}
              rows={values.tableRows[table.id] ?? [{}]}
              updateCellValue={updateCellValue}
              addRow={addRow}
              removeRow={removeRow}
              duplicateRow={duplicateRow}
              pasteRowValues={pasteRowValues}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Block — sử dụng ResizableWrapTable
// ---------------------------------------------------------------------------

/** Kiểu dữ liệu dòng cho ResizableWrapTable */
interface TechSpecRow {
  _rowIndex: number;
  [columnId: string]: string | number;
}

function TableBlock({
  table,
  rows,
  updateCellValue,
  addRow,
  removeRow,
  duplicateRow,
  pasteRowValues,
  readOnly,
}: {
  table: ITechSpecTable;
  rows: Record<string, string>[];
  updateCellValue: (tableId: string, rowIndex: number, columnId: string, value: string) => void;
  addRow: (tableId: string) => void;
  removeRow: (tableId: string, rowIndex: number) => void;
  duplicateRow: (tableId: string, rowIndex: number) => void;
  pasteRowValues: (
    tableId: string,
    sourceIndex: number,
    targetIndices: number[],
    columnKeys: string[],
  ) => void;
  readOnly: boolean;
}) {
  const sortedColumns = useMemo(
    () => [...(table.columns ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [table.columns],
  );

  // Ensure at least 1 row
  const displayRows = rows.length > 0 ? rows : [{}];

  // ── Copy dialog state ───────────────────────────────────────────────────────────────────
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceIndex, setCopySourceIndex] = useState(0);

  const openCopyDialog = useCallback((rowIndex: number) => {
    setCopySourceIndex(rowIndex);
    setCopyDialogOpen(true);
  }, []);

  const copyableColumns = useMemo(
    (): CopyableColumn[] => sortedColumns.map((col) => ({ key: col.id, label: col.name })),
    [sortedColumns],
  );

  const handlePaste = useCallback(
    (targetIndices: number[], columnKeys: string[]) => {
      pasteRowValues(table.id, copySourceIndex, targetIndices, columnKeys);
    },
    [pasteRowValues, table.id, copySourceIndex],
  );

  // Build ResizableWrapTable columns
  const tableColumns = useMemo((): ResizableWrapTableColumn<TechSpecRow>[] => {
    const cols: ResizableWrapTableColumn<TechSpecRow>[] = [
      {
        id: '_stt',
        header: '#',
        defaultWidth: 50,
        minWidth: 40,
        maxWidth: 60,
        headerAlign: 'center',
        cell: (_row, index) => <span className="text-xs text-muted-foreground">{index + 1}</span>,
        cellClassName: 'text-center',
      },
      ...sortedColumns.map(
        (col): ResizableWrapTableColumn<TechSpecRow> => ({
          id: col.id,
          header: (
            <>
              {col.name}
              {col.isRequired && <span className="ml-0.5 text-destructive">*</span>}
            </>
          ),
          headerAlign: 'left',
          defaultWidth: 180,
          minWidth: 120,
          maxWidth: 400,
          cell: (row) => (
            <CellEditor
              column={col}
              value={(row[col.id] as string) ?? ''}
              onChange={(val) => updateCellValue(table.id, row._rowIndex, col.id, val)}
              readOnly={readOnly}
            />
          ),
        }),
      ),
    ];

    if (!readOnly) {
      cols.push({
        id: '_actions',
        header: '',
        defaultWidth: 110,
        minWidth: 90,
        maxWidth: 130,
        sticky: 'right',
        cell: (row) => (
          <ActionStack
            actions={[
              {
                key: 'copy',
                icon: <ClipboardPaste className="h-3.5 w-3.5" />,
                variant: 'ghost',
                tooltip: 'Dán sang dòng khác',
                disabled: displayRows.length <= 1,
                onClick: () => openCopyDialog(row._rowIndex),
              },
              {
                key: 'duplicate',
                icon: <Copy className="h-3.5 w-3.5" />,
                variant: 'ghost',
                tooltip: 'Nhân bản dòng',
                onClick: () => duplicateRow(table.id, row._rowIndex),
              },
              {
                key: 'delete',
                icon: <Trash2 className="h-3.5 w-3.5" />,
                variant: 'ghost',
                tooltip: 'Xóa dòng',
                disabled: displayRows.length <= 1,
                onClick: () => removeRow(table.id, row._rowIndex),
              },
            ]}
            size="icon"
            iconOnly
          />
        ),
        cellClassName: 'text-center',
      });
    }

    return cols;
  }, [
    sortedColumns,
    readOnly,
    table.id,
    displayRows.length,
    updateCellValue,
    removeRow,
    duplicateRow,
    openCopyDialog,
  ]);

  // Build data rows
  const data = useMemo(
    (): TechSpecRow[] => displayRows.map((row, idx) => ({ ...row, _rowIndex: idx })),
    [displayRows],
  );

  return (
    <div className="rounded-lg shadow-sm  overflow-hidden">
      {/* Table name header — chỉ hiện khi có tên hoặc không readOnly */}
      {(table.name || !readOnly) && (
        <div className="flex items-center justify-between bg-muted/50 px-4 py-2 border-b">
          {table.name ? (
            <span className="text-sm font-medium text-foreground">{table.name}</span>
          ) : (
            <span />
          )}
          {!readOnly && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => addRow(table.id)}
              className="gap-1 h-7 text-xs"
            >
              <Plus className="h-3 w-3" />
              Thêm dòng
            </Button>
          )}
        </div>
      )}
      <ResizableWrapTable<TechSpecRow>
        columns={tableColumns}
        data={data}
        layoutMode="fit"
        emptyMessage="Chưa có dữ liệu"
        className="[&_thead_th]:text-muted-foreground [&_thead_th]:bg-white"
      />

      {/* Copy row values dialog */}
      {!readOnly && (
        <CopyRowValuesDialog
          open={copyDialogOpen}
          onOpenChange={setCopyDialogOpen}
          sourceIndex={copySourceIndex}
          fields={displayRows as Record<string, unknown>[]}
          columns={copyableColumns}
          onPaste={handlePaste}
          getRowLabel={(_, index) => `Dòng ${index + 1}`}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cell Editor — render input theo data type
// Dùng local state cho text/number để tránh lag khi gõ (đặc biệt IME tiếng Việt)
// ---------------------------------------------------------------------------

const CellEditor = React.memo(function CellEditor({
  column,
  value,
  onChange,
  readOnly,
}: {
  column: ITechSpecColumn;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}) {
  const [localValue, setLocalValue] = useState(value);

  // Sync khi giá trị từ bên ngoài thay đổi (load data, reset)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalValue(e.target.value);
      onChange(e.target.value);
    },
    [onChange],
  );

  switch (column.dataType) {
    case ETechSpecDataType.Text:
      return (
        <Input
          value={localValue}
          onChange={handleTextChange}
          disabled={readOnly}
          placeholder={column.description ?? ''}
          size="sm"
          className="h-8"
        />
      );

    case ETechSpecDataType.Number:
      return (
        <NumericInput
          value={localValue ? parseFloat(localValue) : undefined}
          onValueChange={(val) => {
            const str = val?.toString() ?? '';
            setLocalValue(str);
            onChange(str);
          }}
          disabled={readOnly}
          placeholder={column.description ?? ''}
          size="sm"
          className="h-8"
        />
      );

    case ETechSpecDataType.Date:
      return (
        <Input
          type="date"
          value={localValue ? localValue.slice(0, 10) : ''}
          onChange={(e) => {
            const iso = e.target.value ? new Date(e.target.value).toISOString() : '';
            setLocalValue(iso);
            onChange(iso);
          }}
          disabled={readOnly}
          size="sm"
          className="h-8"
        />
      );

    case ETechSpecDataType.Boolean:
      return (
        <div className="flex items-center">
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
            disabled={readOnly}
          />
        </div>
      );

    case ETechSpecDataType.Dropdown:
      return <DropdownCell column={column} value={value} onChange={onChange} readOnly={readOnly} />;

    default:
      return (
        <Input
          value={localValue}
          onChange={handleTextChange}
          disabled={readOnly}
          size="sm"
          className="h-8"
        />
      );
  }
});

// ---------------------------------------------------------------------------
// Dropdown Cell — tự gọi API dropdown theo dataSourceTable
// ---------------------------------------------------------------------------

function DropdownCell({
  column,
  value,
  onChange,
  readOnly,
}: {
  column: ITechSpecColumn;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}) {
  // Khi dataSourceType = MasterTable, dùng hook tự gọi API dropdown
  const isMasterTable =
    column.dataSourceType === ETechSpecDataSourceType.MasterTable && !!column.dataSourceTable;

  const { options: masterOptions, isLoading: isMasterLoading } = useMasterTableDropdown(
    isMasterTable ? column.dataSourceTable : undefined,
    isMasterTable,
  );

  const options = useMemo(() => {
    if (column.dataSourceType === ETechSpecDataSourceType.Custom) {
      return (column.options ?? [])
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((opt) => ({ value: opt.value, label: opt.label }));
    }
    if (isMasterTable) {
      return masterOptions;
    }
    return [];
  }, [column, isMasterTable, masterOptions]);

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={onChange}
      disabled={readOnly}
      loading={isMasterLoading}
      placeholder="Chọn..."
      className="h-8"
      buttonProps={{ className: 'w-full' }}
    />
  );
}
