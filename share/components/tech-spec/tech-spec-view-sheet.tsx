import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, Pencil, Pin, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSharedApi } from '../../lib/api-registry';
import { cn } from '../../lib/utils';
import type { ApiResponse } from '../../types';
import type {
  IDynamicFormInstance,
  ITechSpecSection,
  ITechSpecTable,
  ITechSpecTemplate,
  ITechSpecValues,
} from '../../types/tech-spec.types';
import { mapFieldValuesToState } from '../../types/tech-spec.types';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui';
import { TechSpecValueSheet } from './tech-spec-value-sheet';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TechSpecViewSheetProps = Readonly<{
  /** Sheet mở hay đóng */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** ID mẫu dynamic form */
  dynamicFormId?: string;

  /** ID instance đã lưu */
  instanceId?: string;

  /** Cho phép sửa — hiện nút "Sửa" */
  allowEdit?: boolean;

  /** Callback khi lưu xong từ edit sheet */
  onSaved?: (instanceId: string) => void;
}>;

// ---------------------------------------------------------------------------
// API helpers — reuse logic từ value-sheet
// ---------------------------------------------------------------------------

const FORM_CTRL = '/master-data/dynamic-forms';
const INSTANCE_CTRL = '/master-data/dynamic-form-instances';

interface FieldDto {
  id: string;
  name: string;
  label: string;
  fieldType: number;
  defaultValue: string;
  allowedValues: string;
  isRequired: boolean;
  order: number;
}

interface TableDto {
  id: string;
  name: string;
  order: number;
  fields: FieldDto[];
}

interface SectionDto {
  id: string;
  title: string;
  order: number;
  tables: TableDto[];
}

interface FormDto {
  id: string;
  code: string;
  name: string;
  description: string;
  version: number;
  releaseDate: string;
  sections: SectionDto[];
}

function parseFieldMeta(field: FieldDto) {
  try {
    const meta = JSON.parse(field.allowedValues || '{}');
    return {
      dataType: meta.dataType ?? 'text',
      dataSourceType: meta.dataSourceType ?? 'none',
      dataSourceTable: meta.dataSourceTable,
      options: meta.options ?? [],
    };
  } catch {
    return { dataType: 'text' as const, dataSourceType: 'none' as const, options: [] };
  }
}

function mapDtoToTemplate(dto: FormDto): ITechSpecTemplate {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    description: dto.description,
    version: dto.version || 1,
    releaseDate: dto.releaseDate,
    sections: (dto.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        name: section.title,
        sortOrder: section.order,
        tables: (section.tables ?? [])
          .sort((a, b) => a.order - b.order)
          .map((table) => ({
            id: table.id,
            name: table.name,
            sortOrder: table.order,
            columns: (table.fields ?? [])
              .sort((a, b) => a.order - b.order)
              .map((field) => {
                const meta = parseFieldMeta(field);
                return {
                  id: field.id,
                  name: field.name,
                  description: field.label !== field.name ? field.label : undefined,
                  dataType: meta.dataType,
                  dataSourceType: meta.dataSourceType,
                  dataSourceTable: meta.dataSourceTable,
                  isRequired: field.isRequired,
                  sortOrder: field.order,
                  defaultValue: field.defaultValue || undefined,
                  options: meta.options,
                };
              }),
          })),
      })),
  } as ITechSpecTemplate;
}

async function fetchTemplate(id: string): Promise<ITechSpecTemplate> {
  const api = getSharedApi();
  const res = await api.get<ApiResponse<Record<string, unknown>>>(`${FORM_CTRL}/${id}`, {
    params: { includes: 'Sections.Tables.Fields' },
  });
  const dto = res.data?.data;
  if (!dto) throw new Error('Template not found');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return mapDtoToTemplate(dto as any);
}

async function fetchInstance(id: string): Promise<IDynamicFormInstance | null> {
  try {
    const api = getSharedApi();
    const res = await api.get<ApiResponse<IDynamicFormInstance>>(`${INSTANCE_CTRL}/${id}`, {
      params: { includes: 'Values' },
    });
    return res.data?.data ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function TechSpecViewSheet({
  open,
  onOpenChange,
  dynamicFormId,
  instanceId,
  allowEdit = true,
  onSaved,
}: TechSpecViewSheetProps) {
  const [selectedFormId, setSelectedFormId] = useState<string>(dynamicFormId ?? '');
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // Sync props → state
  useEffect(() => {
    if (dynamicFormId) setSelectedFormId(dynamicFormId);
  }, [dynamicFormId]);

  // --- Query: template chi tiết ---
  const templateQuery = useQuery({
    queryKey: ['dynamic-form-detail', selectedFormId],
    queryFn: () => fetchTemplate(selectedFormId),
    enabled: open && !!selectedFormId,
  });

  const template = templateQuery.data;

  // --- Query: instance đã lưu ---
  const instanceQuery = useQuery({
    queryKey: ['dynamic-form-instance', instanceId],
    queryFn: () => fetchInstance(instanceId!),
    enabled: open && !!instanceId,
    retry: false,
  });

  // Map values
  const values = useMemo((): ITechSpecValues => {
    if (instanceQuery.data) {
      const inst = instanceQuery.data;
      if (inst.dynamicFormId && inst.dynamicFormId !== selectedFormId) {
        setSelectedFormId(inst.dynamicFormId);
      }
      return mapFieldValuesToState(inst.dynamicFormId, inst.values ?? []);
    }
    return { templateId: '', tableRows: {} };
  }, [instanceQuery.data, selectedFormId]);

  const isLoading = templateQuery.isLoading || (!!instanceId && instanceQuery.isLoading);

  const handleEditSaved = useCallback(
    (savedId: string) => {
      setEditSheetOpen(false);
      onSaved?.(savedId);
    },
    [onSaved],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex w-[1400px] max-w-[90vw] flex-col sm:max-w-[1400px]">
          <SheetHeader>
            <SheetTitle>Mô tả kỹ thuật</SheetTitle>
            <SheetDescription>
              {template ? `Mẫu: ${template.name} (v${template.version})` : 'Đang tải mẫu...'}
            </SheetDescription>
          </SheetHeader>

          {/* Nội dung chỉ xem */}
          <div className="flex-1 overflow-y-auto px-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
              </div>
            ) : template ? (
              <TechSpecReadonlyView template={template} values={values} className="p-4" />
            ) : (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu mô tả kỹ thuật</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex w-full items-center justify-end border-t p-3 gap-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
            {allowEdit && (
              <Button onClick={() => setEditSheetOpen(true)} disabled={!template}>
                <Pencil className="mr-1.5 h-4 w-4" />
                Sửa
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit sheet — mở chồng lên */}
      {allowEdit && (
        <TechSpecValueSheet
          open={editSheetOpen}
          onOpenChange={setEditSheetOpen}
          dynamicFormId={selectedFormId || undefined}
          instanceId={instanceId}
          onSaved={handleEditSaved}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Readonly View — hiển thị dữ liệu dạng bảng, giữ chức năng ghim
// ---------------------------------------------------------------------------

function TechSpecReadonlyView({
  template,
  values,
  className,
}: {
  template: ITechSpecTemplate;
  values: ITechSpecValues;
  className?: string;
}) {
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

  const hasPinned = pinnedSections.length > 0;

  return (
    <div className={cn('flex gap-4 h-[calc(100vh-200px)]', className)}>
      {/* Pinned sidebar */}
      {hasPinned && <PinnedSidebar sections={pinnedSections} values={values} onUnpin={togglePin} />}

      {/* Main sections — cuộn riêng */}
      <div className={cn('space-y-6 min-w-0 overflow-y-auto', hasPinned ? 'flex-1' : 'w-full')}>
        {sortedSections.map((section) => (
          <ReadonlySectionBlock
            key={section.id}
            section={section}
            values={values}
            isPinned={pinnedIds.has(section.id)}
            onTogglePin={togglePin}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pinned Sidebar — giống value-entry, hiện tóm tắt dữ liệu đã ghim
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
        <div key={section.id} className="rounded-md bg-background">
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
// Section Block — readonly
// ---------------------------------------------------------------------------

function ReadonlySectionBlock({
  section,
  values,
  isPinned,
  onTogglePin,
}: {
  section: ITechSpecSection;
  values: ITechSpecValues;
  isPinned: boolean;
  onTogglePin: (sectionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const sortedTables = useMemo(
    () => [...(section.tables ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [section.tables],
  );

  return (
    <div className="rounded-lg overflow-hidden">
      {/* Section header */}
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
            <ReadonlyTableBlock
              key={table.id}
              table={table}
              rows={values.tableRows[table.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Table Block — readonly, hiện dữ liệu dạng bảng HTML
// ---------------------------------------------------------------------------

function ReadonlyTableBlock({
  table,
  rows,
}: {
  table: ITechSpecTable;
  rows: Record<string, string>[];
}) {
  const sortedColumns = useMemo(
    () => [...(table.columns ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [table.columns],
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-lg shadow-sm overflow-hidden">
        {table.name && (
          <div className="bg-muted/50 px-4 py-2 border-b">
            <span className="text-sm font-medium text-foreground">{table.name}</span>
          </div>
        )}
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Chưa có dữ liệu
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg shadow-sm overflow-hidden border">
      {table.name && (
        <div className="bg-muted/50 px-4 py-2 border-b">
          <span className="text-sm font-medium text-foreground">{table.name}</span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-10">
                #
              </th>
              {sortedColumns.map((col) => (
                <th
                  key={col.id}
                  className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground"
                >
                  {col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  'border-t transition-colors hover:bg-muted/20',
                  rowIdx % 2 === 0 ? 'bg-white' : 'bg-muted/10',
                )}
              >
                <td className="px-3 py-2 text-xs text-muted-foreground">{rowIdx + 1}</td>
                {sortedColumns.map((col) => (
                  <td key={col.id} className="px-3 py-2 text-sm text-foreground">
                    {row[col.id] || <span className="text-muted-foreground/50 italic">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
