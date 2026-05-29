import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getSharedApi } from '../../lib/api-registry';
import type { ApiResponse, IFlatItem } from '../../types';
import type {
  IDynamicFormInstance,
  ITechSpecTemplate,
  ITechSpecValues,
} from '../../types/tech-spec.types';
import { mapFieldValuesToState, mapValuesToPayload } from '../../types/tech-spec.types';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../ui';
import { TechSpecValueEntry } from './tech-spec-value-entry';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type TechSpecValueSheetProps = Readonly<{
  /** Sheet mở hay đóng */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** ID mẫu — nếu truyền sẵn sẽ dùng luôn, không hiện chọn mẫu */
  dynamicFormId?: string;

  /** ID instance đã lưu — nếu có sẽ load giá trị cũ để edit */
  instanceId?: string;

  /** Chế độ chỉ xem */
  readOnly?: boolean;

  /** Callback sau khi lưu thành công, trả về instanceId mới tạo/cập nhật */
  onSaved?: (instanceId: string) => void;
}>;

// ---------------------------------------------------------------------------
// API helpers — dùng shared api
// ---------------------------------------------------------------------------

const FORM_CTRL = '/master-data/dynamic-forms';
const INSTANCE_CTRL = '/master-data/dynamic-form-instances';

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

async function fetchTemplateDropdown(): Promise<IFlatItem[]> {
  const api = getSharedApi();
  const res = await api.get<ApiResponse<IFlatItem[]>>(`${FORM_CTRL}/dropdown`, {
    params: { filters: 'status==1' },
  });
  return res.data?.data ?? [];
}

// ---------------------------------------------------------------------------
// Mapping backend DTO → frontend ITechSpecTemplate
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TechSpecValueSheet({
  open,
  onOpenChange,
  dynamicFormId,
  instanceId: instanceIdProp,
  readOnly = false,
  onSaved,
}: TechSpecValueSheetProps) {
  const queryClient = useQueryClient();
  const [selectedFormId, setSelectedFormId] = useState<string>(dynamicFormId ?? '');
  const [values, setValues] = useState<ITechSpecValues>({ templateId: '', tableRows: {} });
  const [currentInstanceId, setCurrentInstanceId] = useState<string | null>(instanceIdProp ?? null);

  // Sync props → state
  useEffect(() => {
    if (dynamicFormId) setSelectedFormId(dynamicFormId);
  }, [dynamicFormId]);

  useEffect(() => {
    if (instanceIdProp) setCurrentInstanceId(instanceIdProp);
  }, [instanceIdProp]);

  // --- Query: dropdown mẫu (chỉ khi không truyền sẵn formId) ---
  const templateListQuery = useQuery({
    queryKey: ['dynamic-forms-dropdown'],
    queryFn: fetchTemplateDropdown,
    enabled: open && !dynamicFormId,
  });

  // --- Query: template chi tiết ---
  const templateQuery = useQuery({
    queryKey: ['dynamic-form-detail', selectedFormId],
    queryFn: () => fetchTemplate(selectedFormId),
    enabled: open && !!selectedFormId,
  });

  const template = templateQuery.data;

  // --- Query: instance đã lưu (nếu truyền instanceId) ---
  const instanceQuery = useQuery({
    queryKey: ['dynamic-form-instance', currentInstanceId],
    queryFn: () => fetchInstance(currentInstanceId!),
    enabled: open && !!currentInstanceId,
    retry: false,
  });

  // Khi load xong instance → map values vào state
  useEffect(() => {
    if (instanceQuery.data) {
      const inst = instanceQuery.data;
      setCurrentInstanceId(inst.id);
      if (inst.dynamicFormId) setSelectedFormId(inst.dynamicFormId);
      const mapped = mapFieldValuesToState(inst.dynamicFormId, inst.values ?? []);
      setValues(mapped);
    }
  }, [instanceQuery.data]);

  // Reset khi đóng sheet
  useEffect(() => {
    if (!open) {
      setValues({ templateId: '', tableRows: {} });
      if (!instanceIdProp) setCurrentInstanceId(null);
      if (!dynamicFormId) setSelectedFormId('');
    }
  }, [open, dynamicFormId, instanceIdProp]);

  // --- Mutation: lưu ---
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!template) throw new Error('Chưa chọn mẫu');
      const payload = mapValuesToPayload(template, values);
      const api = getSharedApi();

      if (currentInstanceId) {
        await api.put(`${INSTANCE_CTRL}/${currentInstanceId}`, payload);
        return currentInstanceId;
      } else {
        const res = await api.post<ApiResponse<IDynamicFormInstance>>(INSTANCE_CTRL, payload);
        const newId = res.data?.data?.id ?? '';
        if (newId) setCurrentInstanceId(newId);
        return newId;
      }
    },
    onSuccess: (savedId: string) => {
      toast.success('Lưu mô tả kỹ thuật thành công!');
      queryClient.invalidateQueries({
        queryKey: ['dynamic-form-instance', savedId],
      });
      onSaved?.(savedId);
    },
    onError: (error) => {
      console.error('Save tech spec error:', error);
      toast.error('Lỗi khi lưu mô tả kỹ thuật.');
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  const isLoading = templateQuery.isLoading || (!!currentInstanceId && instanceQuery.isLoading);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-[1400px] max-w-[90vw] flex-col sm:max-w-[1400px]">
        <SheetHeader>
          <SheetTitle>Mô tả kỹ thuật</SheetTitle>
          <SheetDescription>
            {template ? `Mẫu: ${template.name} (v${template.version})` : 'Đang tải mẫu...'}
          </SheetDescription>
        </SheetHeader>

        {/* Chọn mẫu nếu không truyền sẵn */}
        {!dynamicFormId && !currentInstanceId && (
          <div className="px-1 pb-3">
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Chọn mẫu mô tả
            </label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="h-9 w-full rounded-md border bg-white px-3 text-sm"
              disabled={readOnly}
            >
              <option value="">-- Chọn mẫu --</option>
              {(templateListQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Form nhập giá trị */}
        <div className="flex-1 overflow-y-auto px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Đang tải...</span>
            </div>
          ) : template ? (
            <TechSpecValueEntry
              template={template}
              values={values}
              onChange={setValues}
              readOnly={readOnly}
              className="p-4"
            />
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-sm text-muted-foreground">Vui lòng chọn mẫu mô tả kỹ thuật</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {!readOnly && (
          <div className="flex w-full items-center justify-end border-t p-3 gap-4">
            <Button
              className="w-[200px]"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saveMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              className="w-[200px]"
              onClick={handleSave}
              disabled={!template || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-4 w-4" />
                  Lưu
                </>
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
