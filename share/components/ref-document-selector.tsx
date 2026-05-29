import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Info } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuthStore } from '../auth';
import type { INamedEntity } from '../hooks/use-step-assignees';
import { cn } from '../lib';
import { getSharedApi } from '../lib/api-registry';
import { buildRefDetailUrl } from '../lib/ref-url-builder';
import {
  sharedEmployeeService,
  sharedOrganizationService,
  sharedWorkItemService,
} from '../services/default-services';
import type {
  ICategoryReference,
  IFlatItem,
  IWorkItemCategory,
  IWorkItemCategoryColumn,
} from '../types';
import { Button, Combobox, Label } from '../ui';
import { RefDocumentDialog } from './ref-document-dialog';

// ── Includes for CategoryReferences query ───────────────────────────────
const CATEGORY_REF_INCLUDES = [
  'CategoryReferences',
  'CategoryReferences.RefWorkItemCategory',
  'CategoryReferences.RefWorkItemCategory.Application',
  'CategoryReferences.ColumnMappings',
  'CategoryReferences.Resource',
  'CategoryReferences.Resource.Application',
].join(',');

export interface RefTypeOption {
  label: string;
  value: string;
  permissionModule?: string;
  code?: string;
  processStepId?: string;
  resource?: ICategoryReference['resource'];
}

export interface CreatorPickerValue {
  employeeId: string;
  organizationId: string;
  employeeName?: string;
  employeeCode?: string;
  organizationName?: string;
}

export interface RefDocumentSelectorProps {
  refTypeId: string | null | undefined;
  refDocId: string | null | undefined;
  refDocNum?: string | null;
  workItemCategoryCode?: string;
  refTypeOptions?: RefTypeOption[];
  /** Callback khi WIC data đã load hoặc khi chọn refType. Trả về IWorkItemCategory object. */
  onRefTypeChange: (category: IWorkItemCategory) => void;
  onRefDocIdChange: (value: string) => void;
  onRefDocChange?: (doc: { id: string; code: string; name?: string } | null) => void;
  className?: string;
  gridClassName?: string;
  refTypeClassName?: string;
  refDocClassName?: string;

  children?: React.ReactNode;
  docOptions?: Array<{ label: string; value: string; code?: string }>;
  docLoading?: boolean;
  refTypeLabel?: string;
  refDocLabel?: string;

  // ── Creator Picker integration ──────────────────────────────────────────
  /** Callback khi admin chọn xong người lập phiếu (null = chưa chọn đủ) */
  onCreatorChange?: (value: CreatorPickerValue | null) => void;
  /** Default organization ID (nếu đã biết, bỏ qua tự resolve từ WIC columns) */
  defaultOrganizationId?: string;
  defaultEmployeeId?: string;
}

export function RefDocumentSelector({
  refTypeId,
  refDocId,
  refDocNum,
  workItemCategoryCode,
  refTypeOptions: externalRefTypeOptions,
  onRefTypeChange,
  onRefDocIdChange,
  onRefDocChange,
  className,
  gridClassName = 'grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 px-1',
  refTypeClassName,
  refDocClassName,
  children,
  docOptions,
  docLoading,
  refTypeLabel,
  refDocLabel,
  onCreatorChange,
  defaultOrganizationId,
  defaultEmployeeId,
}: Readonly<RefDocumentSelectorProps>) {
  const [reviewOpen, setReviewOpen] = useState(false);
  const [internalRefTypeId, setInternalRefTypeId] = useState<string | null>(null);

  // ── Admin detection ─────────────────────────────────────────────────────
  const isAdmin = useAuthStore((s) => !!s.user?.hasFullSystemAccess);
  const showCreatorPicker = isAdmin && !!onCreatorChange;

  // ── Creator Picker state ──────────────────────────────────────────────────
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [defaultOrgApplied, setDefaultOrgApplied] = useState(false);

  // Đồng bộ default value ở mode edit
  useEffect(() => {
    if (defaultOrganizationId) {
      setSelectedOrgId(defaultOrganizationId);
    }
  }, [defaultOrganizationId]);

  useEffect(() => {
    if (defaultEmployeeId) {
      setSelectedEmployeeId(defaultEmployeeId);
    }
  }, [defaultEmployeeId]);

  const isControlled = !!children || !!docOptions;
  const useSelfFetch = !!workItemCategoryCode && !externalRefTypeOptions;

  // ── Fetch CategoryReferences from WorkItemCategory (self-fetch mode) ───
  const categoryQuery = useQuery({
    queryKey: ['ref-selector-category', workItemCategoryCode],
    queryFn: async () => {
      const api = getSharedApi();
      const res = await api.get<{ data: IWorkItemCategory[] }>(
        '/master-data/work-item-categories',
        {
          params: {
            filters: `code==${workItemCategoryCode}`,
            includes: CATEGORY_REF_INCLUDES + ',Columns',
          },
        },
      );
      return res.data?.data?.[0] ?? null;
    },
    enabled: useSelfFetch && !!workItemCategoryCode,
    staleTime: 5 * 60 * 1000,
  });

  // Notify parent khi WIC data đã load (self-fetch mode)
  const onRefTypeChangeRef = useRef(onRefTypeChange);
  useEffect(() => {
    onRefTypeChangeRef.current = onRefTypeChange;
  });

  useEffect(() => {
    if (categoryQuery.data) {
      onRefTypeChangeRef.current(categoryQuery.data);
    }
  }, [categoryQuery.data]);

  const categoryReferences = categoryQuery.data?.categoryReferences ?? [];
  const columns: IWorkItemCategoryColumn[] | undefined = categoryQuery.data?.columns;

  // Self-fetch mode: quản lý refTypeId nội bộ
  const effectiveRefTypeId = useSelfFetch ? internalRefTypeId : refTypeId;

  // Auto-select ref type đầu tiên khi chỉ có 1 option (self-fetch mode)
  useEffect(() => {
    if (useSelfFetch && categoryReferences.length === 1 && !internalRefTypeId) {
      const singleRef = categoryReferences[0];
      setInternalRefTypeId(singleRef.refWorkItemCategoryId);
    }
  }, [useSelfFetch, categoryReferences, internalRefTypeId]);

  // Build refTypeOptions — self-fetched or external
  const selfRefTypeOptions = useMemo<RefTypeOption[]>(
    () =>
      categoryReferences.map((ref: ICategoryReference) => ({
        label: ref.refWorkItemCategory?.name || ref.refWorkItemCategory?.code || '',
        value: ref.refWorkItemCategoryId || '',
        code: ref.refWorkItemCategory?.code || '',
        processStepId: ref.processStepId,
        permissionModule: ref.resource?.code,
        resource: ref.resource,
      })),
    [categoryReferences],
  );

  const refTypeOptions = externalRefTypeOptions ?? selfRefTypeOptions;

  const docsQuery = useQuery({
    queryKey: ['ref-documents', effectiveRefTypeId],
    queryFn: async () => {
      if (!effectiveRefTypeId) return [];
      const selectedOpt = refTypeOptions.find((o) => o.value === effectiveRefTypeId);

      const params: Record<string, any> = {
        workItemCategoryId: effectiveRefTypeId,
        ignoreStatusFilter: true,
      };

      if (selectedOpt?.processStepId) {
        params.filters = `currentStepId==${selectedOpt.processStepId}`;
      }

      const res = await sharedWorkItemService.getDropdown(params);
      return res.data ?? [];
    },
    enabled: !!effectiveRefTypeId && !isControlled,
  });

  // set refdocId khi refDocNum có giá trị (code -> set id vì k lưu id)
  useEffect(() => {
    if (refDocNum && !refDocId && docsQuery.data?.length) {
      const matched = docsQuery.data.find((d: IFlatItem) => d.code === refDocNum);

      if (matched) {
        onRefDocIdChange?.(matched.id);

        onRefDocChange?.({
          id: matched.id,
          code: matched.code || '',
          name: matched.name || matched.code || '',
        });
      }
    }
  }, [refDocNum, refDocId, docsQuery.data, onRefDocIdChange, onRefDocChange]);

  const detailQuery = useQuery({
    queryKey: ['work-item-detail', refDocId],
    queryFn: async () => {
      if (!refDocId) return null;
      const res = await sharedWorkItemService.getById({
        id: refDocId,
        includes: 'WorkItemStatus,CreatedOrganization,CurrentStep.WorkItemStatus',
      });
      return res.data;
    },
    enabled: reviewOpen && !!refDocId,
    retry: false,
  });

  const selectedRefTypeOpt = refTypeOptions.find((o) => o.value === effectiveRefTypeId);

  const refDetailUrl = buildRefDetailUrl(selectedRefTypeOpt?.resource, refDocId);

  const refType = {
    id: selectedRefTypeOpt?.value ?? '',
    name: selectedRefTypeOpt?.label ?? '',
    shortName: selectedRefTypeOpt?.code,
    code: selectedRefTypeOpt?.code ?? '',
    status: 1,
    applicationId: '',
    allowIndependentCreation: false,
  } as IWorkItemCategory;

  // ── Creator Picker: fetch org dropdown ──────────────────────────────────
  const orgDropdownQuery = useQuery({
    queryKey: ['creator-picker-org-dropdown'],
    queryFn: () => sharedOrganizationService.getDropdown(),
    staleTime: 5 * 60 * 1000,
    enabled: showCreatorPicker,
  });

  const orgOptions = useMemo(
    () =>
      orgDropdownQuery.data?.data?.map((org: IFlatItem) => ({
        label: org.name,
        value: org.id,
      })) ?? [],
    [orgDropdownQuery.data],
  );

  // ── Creator Picker: resolve default org from WIC columns ────────────────
  useEffect(() => {
    if (defaultOrgApplied || !showCreatorPicker) return;

    // Ưu tiên 1: prop defaultOrganizationId
    if (defaultOrganizationId) {
      setSelectedOrgId(defaultOrganizationId);
      setDefaultOrgApplied(true);
      return;
    }

    // Ưu tiên 2: tìm từ WIC columns
    if (columns && orgDropdownQuery.data?.data) {
      const orgColumn = columns.find((col) => col.columnName === 'organization_id');
      if (orgColumn?.defaultValue) {
        const matchedOrg = orgDropdownQuery.data.data.find(
          (org: IFlatItem) => org.code === orgColumn.defaultValue,
        );
        if (matchedOrg) {
          setSelectedOrgId(matchedOrg.id);
          setDefaultOrgApplied(true);
        }
      }
    }
  }, [defaultOrganizationId, columns, orgDropdownQuery.data, showCreatorPicker, defaultOrgApplied]);

  // ── Creator Picker: fetch employees by selected org ─────────────────────
  const employeeByOrgQuery = useQuery({
    queryKey: ['creator-picker-employees', selectedOrgId],
    queryFn: () => sharedEmployeeService.getByOrganizationId(selectedOrgId),
    staleTime: 5 * 60 * 1000,
    enabled: showCreatorPicker && !!selectedOrgId,
  });

  const employeeOptions = useMemo(
    () =>
      employeeByOrgQuery.data?.map((emp: INamedEntity) => ({
        label: emp.name,
        value: emp.id,
      })) ?? [],
    [employeeByOrgQuery.data],
  );

  // ── Creator Picker: handlers ──────────────────────────────────────────────
  const handleOrgChange = useCallback(
    (orgId: string) => {
      setSelectedOrgId(orgId);
      setSelectedEmployeeId('');
      onCreatorChange?.(null);
    },
    [onCreatorChange],
  );

  const handleEmployeeChange = useCallback(
    (empId: string) => {
      setSelectedEmployeeId(empId);
      if (empId && selectedOrgId) {
        const selectedEmp = (
          employeeByOrgQuery.data as Array<INamedEntity & { code?: string }>
        )?.find((e) => e.id === empId);
        const selectedOrg = orgOptions.find((o) => o.value === selectedOrgId);

        onCreatorChange?.({
          employeeId: empId,
          organizationId: selectedOrgId,
          employeeName: selectedEmp?.name,
          employeeCode: selectedEmp?.code,
          organizationName: selectedOrg?.label,
        });
      } else {
        onCreatorChange?.(null);
      }
    },
    [selectedOrgId, onCreatorChange, employeeByOrgQuery.data, orgOptions],
  );

  // Self-fetch mode: tự ẩn khi allowIndependentCreation = true
  if (useSelfFetch && categoryQuery.data?.allowIndependentCreation) {
    return null;
  }

  // Chỉ hiển thị creator picker khi đã chọn ref type
  const showCreatorSection = showCreatorPicker && !!effectiveRefTypeId;

  // Chỉ hiển thị creator picker khi admin chưa chọn ref type
  // const showCreatorSection = showCreatorPicker;

  const comboboxOptions = useMemo(() => {
    return (docOptions ??
      (docsQuery.data ?? []).map((d: IFlatItem) => ({
        label: d.name || d.code || '',
        value: String(d.id),
        code: d.code || '',
      }))) as Array<{
      label: string;
      value: string;
      code?: string;
    }>;
  }, [docOptions, docsQuery.data]);

  return (
    <div className={cn('space-y-3', className)}>
      {/* ── Row 1: Ref Type + Ref Doc Num + Preview ─────────────────────── */}
      <div className={gridClassName}>
        {/* 1. Ref Type */}
        <div className={cn('space-y-2', refTypeClassName)}>
          <Label className="text-sm font-medium text-muted-foreground/80 tracking-tight">
            {refTypeLabel ?? 'Loại tham chiếu'}
          </Label>
          <Combobox
            options={refTypeOptions}
            value={effectiveRefTypeId ?? ''}
            onValueChange={(val) => {
              // Combobox toggle: click lại cùng value → val rỗng → bỏ qua
              if (!val) return;
              if (useSelfFetch) {
                setInternalRefTypeId(val);
              }
              // Self-fetch mode: luôn notify với parent WIC (chứa categoryReferences + columns)
              // External mode: notify với ref WIC
              if (useSelfFetch && categoryQuery.data) {
                onRefTypeChange(categoryQuery.data);
              } else {
                const matchedRef = categoryReferences.find(
                  (r: ICategoryReference) => r.refWorkItemCategoryId === val,
                );
                if (matchedRef?.refWorkItemCategory) {
                  onRefTypeChange(matchedRef.refWorkItemCategory);
                }
              }
              onRefDocIdChange(''); // Reset doc id on type change
            }}
            clearable={false}
            placeholder="Chọn Ref Type"
            buttonProps={{ className: 'w-full shadow-none h-9' }}
            showCode={false}
          />
        </div>

        {/* 2. Ref Doc Num & Preview */}
        <div className={cn('space-y-2', refDocClassName)}>
          <Label className="text-sm font-medium text-muted-foreground/80 tracking-tight">
            {refDocLabel ?? 'Phiếu tham chiếu'}
          </Label>
          <div className="flex items-center gap-1.5 w-full">
            <div className="flex-1 min-w-0">
              {children || (
                // Default or custom-options combobox
                <Combobox
                  loading={docLoading ?? docsQuery.isLoading}
                  options={comboboxOptions}
                  value={refDocId ? String(refDocId) : ''}
                  onValueChange={(val) => {
                    onRefDocIdChange(val);
                    if (onRefDocChange) {
                      if (!val) {
                        onRefDocChange(null);
                      } else {
                        const matchedDoc = (docsQuery.data ?? []).find(
                          (d: IFlatItem) => d.id === val,
                        );
                        if (matchedDoc) {
                          onRefDocChange({
                            id: val,
                            code: matchedDoc.code || matchedDoc.name || '',
                            name: matchedDoc.name || matchedDoc.code || '',
                          });
                        } else {
                          const matchedExtDoc = docOptions?.find((d) => d.value === val);
                          if (matchedExtDoc) {
                            onRefDocChange({
                              id: val,
                              code: matchedExtDoc.code || matchedExtDoc.label || '',
                              name: matchedExtDoc.label || matchedExtDoc.code || '',
                            });
                          }
                        }
                      }
                    }
                  }}
                  disabled={!refTypeId}
                  placeholder="Chọn phiếu đầu vào"
                  buttonProps={{ className: 'w-full shadow-none h-9' }}
                />
              )}
            </div>
            <Button
              variant="outline"
              title="Xem phiếu đầu vào"
              type="button"
              className={cn(
                'h-9 w-9 p-0 shrink-0 transition-all duration-200',
                refDocId ? 'hover:text-primary hover:bg-accent' : 'cursor-not-allowed opacity-50',
              )}
              onClick={() => setReviewOpen(true)}
              disabled={!refDocId}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Row 2: Creator Picker (chỉ hiện cho admin, sau khi chọn ref type) ── */}
      {showCreatorSection && (
        <div className="px-1 space-y-2">
          {/* Dòng giải thích */}
          <div className="flex items-center w-fit gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>
              Bạn đang đăng nhập bằng tài khoản <strong>Admin</strong>. Vui lòng cho biết bạn lập
              phiếu cho ai.
            </span>
          </div>

          {/* Phòng ban + Người lập phiếu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            {/* Phòng ban */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80 tracking-tight">
                Phòng ban
              </Label>
              <Combobox
                popoverClassName="w-[400px]"
                options={orgOptions}
                value={selectedOrgId}
                onValueChange={handleOrgChange}
                placeholder="Chọn phòng ban"
                loading={orgDropdownQuery.isFetching}
                buttonProps={{ className: 'w-full shadow-none h-9' }}
              />
            </div>

            {/* Người lập phiếu */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground/80 tracking-tight">
                Người lập phiếu
              </Label>
              <Combobox
                popoverClassName="w-[400px]"
                options={employeeOptions}
                value={selectedEmployeeId}
                onValueChange={handleEmployeeChange}
                placeholder="Chọn người lập phiếu"
                loading={employeeByOrgQuery.isFetching}
                disabled={!selectedOrgId}
                buttonProps={{ className: 'w-full shadow-none h-9' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview Dialog */}
      {reviewOpen && (
        <RefDocumentDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          refType={refType}
          refDoc={detailQuery.data}
          refDocNum={refDocNum ?? undefined}
          refDetailUrl={refDetailUrl}
          permissionModule={selectedRefTypeOpt?.permissionModule}
          isLoading={detailQuery.isLoading || detailQuery.isFetching}
          isError={detailQuery.isError}
        />
      )}
    </div>
  );
}

export default RefDocumentSelector;
