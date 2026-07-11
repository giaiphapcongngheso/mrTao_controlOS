import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, useFieldArray, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Edit2, Layers, Info, CheckCircle2, Eye } from 'lucide-react';
import { Button, FormControl, FormField, FormItem, FormLabel, FormMessage, Input, Textarea, Card, CardHeader, CardTitle, CardContent, Sheet, SheetContent, SheetFooter } from '../../../../share/ui';
import { Switch } from '../../../../share/ui/switch';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { CustomTable } from '../../../../share/components/custom-table';
import type { ColumnDef } from '@tanstack/react-table';
import { TimeSelect } from '@/src/components/custom/time-select';
import { DeleteConfirm } from '../../../../share/components/delete-confirm';
import { staffService } from '../../../services/admin/staff-service';
import type { ChecklistTemplateDocument } from '../../../types/checklist.types';
import { cn } from '../../../../share/lib/utils';
import { getChecklistColorMeta, resolveChecklistIcon } from '../checklist-meta';
import { useIsMobile } from '../../../shared/hooks/use-is-mobile';
import { MobileCard, type CardAccentColor } from '../../../components/custom/mobile-card';

const mapCategoryColorToAccent = (colorKey?: string): CardAccentColor => {
  if (!colorKey) return 'none';
  const key = colorKey.toLowerCase();
  if (key.includes('red') || key.includes('rose') || key.includes('pink')) return 'red';
  if (key.includes('emerald') || key.includes('green')) return 'green';
  if (key.includes('teal')) return 'teal';
  if (key.includes('blue') || key.includes('indigo') || key.includes('sky')) return 'blue';
  if (key.includes('amber') || key.includes('orange') || key.includes('yellow')) return 'amber';
  if (key.includes('slate') || key.includes('gray')) return 'slate';
  return 'none';
};

// Form Schema Validation
const templateFormSchema = z.object({
  roleCode: z.string().min(1, 'Vui lòng chọn vai trò'),
  title: z.string().trim().min(1, 'Vui lòng nhập tên checklist mẫu'),
  frequency: z.string().min(1, 'Vui lòng chọn tần suất'),
  frequencyDetail: z.string().optional(),
  shift: z.string().min(1, 'Vui lòng chọn ca áp dụng'),
  autoCreateDaily: z.boolean(),
  status: z.string().min(1, 'Vui lòng chọn trạng thái'),
  defaultAssignee: z.string().min(1, 'Vui lòng chọn người thực hiện mặc định'),
  inspectorId: z.string().min(1, 'Vui lòng chọn người kiểm tra'),
  tasks: z.array(
    z.object({
      id: z.string().optional(),
      title: z.string().trim().min(1, 'Vui lòng điền nội dung công việc'),
      timeLimit: z.string().min(1, 'Vui lòng chọn giờ quy định'),
      isRequired: z.boolean(),
      evidenceRequired: z.boolean().optional(),
    })
  ).min(1, 'Vui lòng thêm ít nhất 1 đầu việc'),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface ChecklistTemplateTabContentProps {
  templates: ChecklistTemplateDocument[];
  roleOptions: Array<{ code: string; name: string }>;
  onSaveCategoryBatch: (params: any) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  // Nhận các props filter từ cha
  filterRole: string;
  filterFrequency: string;
  filterStatus: string;
  searchTerm: string;
  // Nhận state editingTemplateId từ cha
  editingTemplateId: string | null;
  setEditingTemplateId: (id: string | null) => void;
}

export default function ChecklistTemplateTabContent({
  templates,
  roleOptions,
  onSaveCategoryBatch,
  onDeleteCategory,
  permissions,
  filterRole,
  filterFrequency,
  filterStatus,
  searchTerm,
  editingTemplateId,
  setEditingTemplateId,
}: ChecklistTemplateTabContentProps) {
  const isMobile = useIsMobile();

  // Query danh sách nhân sự
  const { data: staffList = [] } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => staffService.getAll(),
  });

  // Phân trang bằng CustomTable state
  const [tablePagination, setTablePagination] = useState({
    pageIndex: 0,
    pageSize: 5,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ChecklistTemplateDocument | null>(null);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      roleCode: '',
      title: '',
      frequency: 'daily',
      frequencyDetail: '',
      shift: 'all_day',
      autoCreateDaily: true,
      status: 'active',
      defaultAssignee: 'all_staff',
      inspectorId: '',
      tasks: [{ title: '', timeLimit: '08:00', isRequired: false, evidenceRequired: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tasks',
  });

  // Watchers
  const watchFrequency = form.watch('frequency');
  const formRoleCode = form.watch('roleCode');

  // Reset defaultAssignee if the role code changes and the current assignee doesn't belong to the new role
  useEffect(() => {
    if (!formRoleCode) return;
    const currentAssignee = form.getValues('defaultAssignee');
    if (!currentAssignee || currentAssignee === 'all_staff') return;
    
    const normalizedRole = formRoleCode.trim().toUpperCase();
    const selectedRole = roleOptions.find(r => r.code.toUpperCase() === normalizedRole);
    const roleNameUpper = selectedRole ? selectedRole.name.trim().toUpperCase() : '';
    
    const matchesNewRole = staffList.some(s => {
      if (s.id !== currentAssignee || s.status !== 'active') return false;
      const staffRoleCode = (s.role || '').trim().toUpperCase();
      const staffRoleId = (s.roleId || '').trim().toUpperCase();
      return staffRoleCode === normalizedRole || 
             (roleNameUpper && staffRoleCode === roleNameUpper) ||
             staffRoleId === `ROLE-${normalizedRole}` ||
             staffRoleId === normalizedRole;
    });
    
    if (!matchesNewRole) {
      form.setValue('defaultAssignee', 'all_staff');
    }
  }, [formRoleCode, staffList, roleOptions, form]);

  const staffOptions = useMemo(() => {
    const roleCode = formRoleCode || '';
    if (!roleCode) {
      return [
        { label: 'Tất cả nhân sự', value: 'all_staff' },
      ];
    }
    const normalizedRole = roleCode.trim().toUpperCase();
    const selectedRole = roleOptions.find(r => r.code.toUpperCase() === normalizedRole);
    const roleNameUpper = selectedRole ? selectedRole.name.trim().toUpperCase() : '';

    const filtered = staffList.filter((s) => {
      if (s.status !== 'active') return false;
      const staffRoleCode = (s.role || '').trim().toUpperCase();
      const staffRoleId = (s.roleId || '').trim().toUpperCase();
      return staffRoleCode === normalizedRole || 
             (roleNameUpper && staffRoleCode === roleNameUpper) ||
             staffRoleId === `ROLE-${normalizedRole}` ||
             staffRoleId === normalizedRole;
    });

    return [
      { label: 'Tất cả nhân sự', value: 'all_staff' },
      ...filtered.map(s => ({
        label: s.fullName,
        value: s.id,
      })),
    ];
  }, [staffList, formRoleCode, roleOptions]);

  const inspectorOptions = useMemo(() => {
    return staffList.filter(s => s.status === 'active').map(s => ({
      label: s.fullName,
      value: s.id,
    }));
  }, [staffList]);

  // Synchronize editingTemplateId from parent with local form values
  useEffect(() => {
    if (editingTemplateId === 'new') {
      form.reset({
        roleCode: roleOptions[0]?.code || '',
        title: '',
        frequency: 'daily',
        frequencyDetail: '',
        shift: 'all_day',
        autoCreateDaily: true,
        status: 'active',
        defaultAssignee: 'all_staff',
        inspectorId: '',
        tasks: [{ title: '', timeLimit: '08:00', isRequired: false, evidenceRequired: false }],
      });
    } else if (editingTemplateId && editingTemplateId !== 'new') {
      const template = templates.find(t => t.id === editingTemplateId);
      if (template) {
        form.reset({
          roleCode: template.roleCode,
          title: template.title || '',
          frequency: template.frequency || 'daily',
          frequencyDetail: template.frequencyDetail || '',
          shift: template.shift || 'all_day',
          autoCreateDaily: template.autoCreateDaily !== false,
          status: template.status || 'active',
          defaultAssignee: template.defaultAssignee || 'all_staff',
          inspectorId: template.inspectorId || '',
          tasks: (template.tasks || []).map(task => ({
            id: task.id,
            title: task.title,
            timeLimit: task.timeLimit || '08:00',
            isRequired: task.isRequired === true,
            evidenceRequired: task.evidenceRequired === true,
          })),
        });
      }
    }
  }, [editingTemplateId, templates, roleOptions, form]);

  // Lọc danh sách templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      // Lọc vai trò
      if (filterRole !== 'all' && t.roleCode?.toUpperCase() !== filterRole.toUpperCase()) {
        return false;
      }
      // Lọc tần suất
      const freq = t.frequency || 'daily';
      if (filterFrequency !== 'all' && freq !== filterFrequency) {
        return false;
      }
      // Lọc trạng thái
      const stat = t.status || 'active';
      if (filterStatus !== 'all' && stat !== filterStatus) {
        return false;
      }
      // Tìm kiếm theo tiêu đề
      if (searchTerm.trim() !== '') {
        const titleMatch = (t.title || '').toLowerCase().includes(searchTerm.toLowerCase());
        const roleName = roleOptions.find((r) => r.code.toUpperCase() === t.roleCode?.toUpperCase())?.name || '';
        const roleMatch = roleName.toLowerCase().includes(searchTerm.toLowerCase());
        if (!titleMatch && !roleMatch) return false;
      }
      return true;
    });
  }, [templates, filterRole, filterFrequency, filterStatus, searchTerm, roleOptions]);

  // Thống kê sidebar
  const stats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter(t => (t.status || 'active') === 'active').length;
    const autoCreate = templates.filter(t => t.autoCreateDaily !== false).length;
    const hidden = total - active;
    return { total, active, autoCreate, hidden };
  }, [templates]);

  // Reset trang khi đổi bộ lọc
  useEffect(() => {
    setTablePagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [filterRole, filterFrequency, filterStatus, searchTerm]);

  // Chọn template để sửa hoặc bật chế độ tạo mới
  const handleStartEdit = useCallback(async (template: ChecklistTemplateDocument | 'new') => {
    form.clearErrors();
    if (template === 'new') {
      setEditingTemplateId('new');
      form.reset({
        roleCode: roleOptions[0]?.code || '',
        title: '',
        frequency: 'daily',
        frequencyDetail: '',
        shift: 'all_day',
        autoCreateDaily: true,
        status: 'active',
        defaultAssignee: 'all_staff',
        inspectorId: staffList[0]?.id || '',
        tasks: [{ title: '', timeLimit: '08:00', isRequired: false, evidenceRequired: false }],
      });
    } else {
      setEditingTemplateId(template.id);
      form.reset({
        roleCode: template.roleCode,
        title: template.title || '',
        frequency: template.frequency || 'daily',
        frequencyDetail: template.frequencyDetail || '',
        shift: template.shift || 'all_day',
        autoCreateDaily: template.autoCreateDaily !== false,
        status: template.status || 'active',
        defaultAssignee: template.defaultAssignee || 'all_staff',
        inspectorId: template.inspectorId || '',
        tasks: (template.tasks || []).map(task => ({
          id: task.id,
          title: task.title,
          timeLimit: task.timeLimit || '08:00',
          isRequired: task.isRequired === true,
          evidenceRequired: task.evidenceRequired === true,
        })),
      });
    }
  }, [form, roleOptions, staffList]);

  // Cấu hình các cột của CustomTable
  const columns = useMemo<ColumnDef<ChecklistTemplateDocument>[]>(() => [
    {
      id: 'title',
      header: 'Tên checklist mẫu',
      accessorKey: 'title',
      size: 260,
      meta: {
        sticky: 'left',
      },
      cell: ({ row }) => {
        const item = row.original;
        const colorMeta = getChecklistColorMeta(item.colorKey || 'rose');
        const ItemIcon = resolveChecklistIcon(item.iconName || 'Layers');

        return (
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
              <ItemIcon className={cn("w-3.5 h-3.5", colorMeta.iconColor)} />
            </span>
            <span className="truncate max-w-[200px]" title={item.title}>
              {item.title || 'Mẫu checklist'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: 'Vai trò',
      size: 150,
      cell: ({ row }) => {
        const item = row.original;
        const roleName = roleOptions.find((r) => r.code.toUpperCase() === item.roleCode?.toUpperCase())?.name || item.roleCode || 'N/A';
        return <span className="font-semibold text-slate-600">{roleName}</span>;
      },
    },
    {
      id: 'frequency',
      header: 'Tần suất',
      size: 160,
      cell: ({ row }) => {
        const item = row.original;
        let freqText = 'Hàng ngày';
        if (item.frequency === 'weekly') {
          const dayText = weekdayOptions.find(o => o.value === item.frequencyDetail)?.label || 'Thứ 2';
          freqText = `Hàng tuần (${dayText})`;
        } else if (item.frequency === 'monthly') {
          freqText = `Hàng tháng (Ngày ${item.frequencyDetail || 1})`;
        }
        return <span className="text-slate-600 font-semibold">{freqText}</span>;
      },
    },
    {
      id: 'tasksCount',
      header: () => <div className="text-center w-full">Đầu việc</div>,
      size: 100,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-center font-bold text-slate-700 tabular-nums">
            {item.tasks?.length || 0}
          </div>
        );
      },
    },
    {
      id: 'autoCreate',
      header: () => <div className="text-center w-full">Tự động sinh</div>,
      size: 110,
      cell: ({ row }) => {
        const item = row.original;
        return item.autoCreateDaily !== false ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
        ) : (
          <span className="text-slate-300 block text-center">-</span>
        );
      },
    },
    {
      id: 'status',
      header: 'Trạng thái',
      size: 120,
      cell: ({ row }) => {
        const item = row.original;
        return (item.status || 'active') === 'active' ? (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-600">
            Đang dùng
          </span>
        ) : (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 border border-amber-100 text-amber-600">
            Tạm ẩn
          </span>
        );
      },
    },
    {
      id: 'inspector',
      header: 'Người kiểm tra',
      size: 150,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <span className="text-slate-600 font-bold truncate block max-w-[120px]" title={item.inspectorName || 'Chưa cài đặt'}>
            {item.inspectorName || '-'}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center w-full">Thao tác</div>,
      size: 130,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {permissions.canUpdate && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(item);
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors"
                title="Chỉnh sửa"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}
            {permissions.canDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(item);
                }}
                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                title="Xóa"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      },
    },
  ], [roleOptions, permissions, handleStartEdit]);

  const taskColumns = useMemo<ColumnDef<typeof fields[number]>[]>(() => [
    {
      id: 'index',
      header: '#',
      size: 50,
      cell: ({ row }) => (
        <span className="font-bold text-slate-400 tabular-nums">
          {row.index + 1}
        </span>
      ),
    },
    {
      id: 'timeLimit',
      header: () => <div className="text-center w-full">Giờ</div>,
      size: 90,
      cell: ({ row }) => {
        const idx = row.index;
        return (
          <div className="flex items-center justify-center">
            <FormField
              control={form.control}
              name={`tasks.${idx}.timeLimit`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-center space-y-0">
                  <FormControl>
                    <TimeSelect
                      value={field.value}
                      onChangeValue={field.onChange}
                      className="h-8.5 rounded-xl border-slate-200"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        );
      },
    },
    {
      id: 'title',
      header: 'Nội dung công việc',
      size: 320,
      cell: ({ row }) => {
        const idx = row.index;
        return (
          <FormField
            control={form.control}
            name={`tasks.${idx}.title`}
            render={({ field }) => (
              <FormItem className="grid gap-0">
                <FormControl>
                  <Textarea
                    {...field}
                    rows={1}
                    placeholder="Nhập nội dung công việc..."
                    style={{ minHeight: 30 }}
                    className="font-sans w-full py-1 resize-none overflow-hidden bg-transparent border-0 focus:ring-0 focus:outline-none font-medium text-xs leading-normal placeholder:text-slate-300"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        );
      },
    },
    {
      id: 'isRequired',
      header: () => <div className="text-center w-full">Bắt buộc</div>,
      size: 80,
      cell: ({ row }) => {
        const idx = row.index;
        return (
          <div className="flex items-center justify-center">
            <FormField
              control={form.control}
              name={`tasks.${idx}.isRequired`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-center space-y-0 h-6">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="rounded border-slate-300 text-[#C21A1A] focus:ring-[#C21A1A]/30 w-4 h-4 cursor-pointer"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        );
      },
    },
    {
      id: 'evidenceRequired',
      header: () => <div className="text-center w-full">Bắt buộc ảnh</div>,
      size: 90,
      cell: ({ row }) => {
        const idx = row.index;
        return (
          <div className="flex items-center justify-center">
            <FormField
              control={form.control}
              name={`tasks.${idx}.evidenceRequired`}
              render={({ field }) => (
                <FormItem className="flex items-center justify-center space-y-0 h-6">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value === true}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="rounded border-slate-300 text-[#C21A1A] focus:ring-[#C21A1A]/30 w-4 h-4 cursor-pointer"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      size: 50,
      cell: ({ row }) => {
        const idx = row.index;
        return (
          <div className="flex items-center justify-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(idx)}
              disabled={fields.length === 1}
              className="rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      },
    },
  ], [form, fields.length, remove]);

  // Submit Form
  const onSubmitHandler = async (values: TemplateFormValues) => {
    setIsSubmitting(true);
    try {
      const selectedInspector = staffList.find(s => s.id === values.inspectorId);
      const payload = {
        id: editingTemplateId === 'new' ? null : editingTemplateId,
        title: values.title.trim(),
        roleCode: values.roleCode,
        iconName: 'Layers',
        colorKey: 'rose',
        tasks: values.tasks.map(t => ({
          id: t.id,
          title: t.title.trim(),
          timeLimit: t.timeLimit,
          isRequired: t.isRequired,
          evidenceRequired: t.evidenceRequired === true,
        })),
        frequency: values.frequency,
        frequencyDetail: values.frequencyDetail,
        shift: values.shift,
        autoCreateDaily: values.autoCreateDaily,
        status: values.status,
        defaultAssignee: values.defaultAssignee,
        inspectorId: values.inspectorId,
        inspectorName: selectedInspector?.fullName || '',
      };
      await onSaveCategoryBatch(payload);
      setEditingTemplateId(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tần suất options
  const frequencyOptions = [
    { label: 'Hàng ngày', value: 'daily' },
    { label: 'Hàng tuần', value: 'weekly' },
    { label: 'Hàng tháng', value: 'monthly' },
  ];

  // Thứ trong tuần options (1: T2 -> 7: T8/CN)
  const weekdayOptions = [
    { label: 'Thứ 2', value: '1' },
    { label: 'Thứ 3', value: '2' },
    { label: 'Thứ 4', value: '3' },
    { label: 'Thứ 5', value: '4' },
    { label: 'Thứ 6', value: '5' },
    { label: 'Thứ 7', value: '6' },
    { label: 'Chủ nhật', value: '0' },
  ];

  // Ngày trong tháng options
  const dayOfMonthOptions = useMemo(() => {
    return Array.from({ length: 31 }, (_, i) => ({
      label: `Ngày ${i + 1}`,
      value: String(i + 1),
    }));
  }, []);

  return (
    <div className="font-sans text-left space-y-4">
      {/* Container chính: 3 cột linh hoạt */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4.5 items-start">

        {/* Cột 1: Danh sách checklist mẫu */}
        <div className="w-full min-w-0 xl:col-span-9">
          {isMobile ? (
            <div className="space-y-3 text-left">
              {filteredTemplates.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-bold text-sm border border-dashed border-slate-200 rounded-xl bg-white">
                  Không có mẫu checklist nào phù hợp.
                </div>
              ) : (
                filteredTemplates.map((template, idx) => {
                  const roleName = roleOptions.find((r) => r.code.toUpperCase() === template.roleCode?.toUpperCase())?.name || template.roleCode || 'N/A';
                  let freqText = 'Hàng ngày';
                  if (template.frequency === 'weekly') {
                    const dayText = weekdayOptions.find(o => o.value === template.frequencyDetail)?.label || 'Thứ 2';
                    freqText = `Hàng tuần (${dayText})`;
                  } else if (template.frequency === 'monthly') {
                    freqText = `Hàng tháng (Ngày ${template.frequencyDetail || 1})`;
                  }
                  const colorMeta = getChecklistColorMeta(template.colorKey || 'rose');
                  const ItemIcon = resolveChecklistIcon(template.iconName || 'Layers');

                  return (
                    <MobileCard
                      key={template.id}
                      variant="bordered"
                      interactive={true}
                      delayIndex={idx}
                      onClick={() => handleStartEdit(template)}
                      accentColor={mapCategoryColorToAccent(template.colorKey)}
                    >
                      <MobileCard.Header
                        title={
                          <span className="text-slate-800 font-extrabold text-xs tracking-tight leading-normal font-sans block">
                            {template.title || 'Mẫu checklist'}
                          </span>
                        }
                        subtitle={
                          <span className="text-[10px] text-slate-400 font-bold font-sans block">
                            {roleName}
                          </span>
                        }
                        avatar={
                          <span className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border", colorMeta.iconBg)}>
                            <ItemIcon className={cn("w-4.5 h-4.5", colorMeta.iconColor)} />
                          </span>
                        }
                        badge={
                          (template.status || 'active') === 'active'
                            ? { text: 'Đang dùng', variant: 'success' }
                            : { text: 'Tạm ẩn', variant: 'secondary' }
                        }
                      />

                      <MobileCard.Grid
                        items={[
                          { label: 'Tần suất', value: freqText },
                          { label: 'Số đầu việc', value: `${template.tasks?.length || 0} đầu việc` },
                          { label: 'Tự động sinh', value: template.autoCreateDaily !== false ? 'Bật' : 'Tắt' },
                          { label: 'Người kiểm tra', value: template.inspectorName || 'Chưa cài đặt' }
                        ]}
                      />

                      <MobileCard.Footer className="!py-2 !px-3.5 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 h-7 flex items-center">
                          Bấm thẻ để chỉnh sửa
                        </span>
                        <div className="flex items-center gap-1.5">
                          {permissions.canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 cursor-pointer rounded-lg border-none"
                              onClick={(e: any) => {
                                e.stopPropagation();
                                handleStartEdit(template);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                              <span>Sửa</span>
                            </Button>
                          )}
                          {permissions.canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50/50 cursor-pointer rounded-lg border-none"
                              onClick={(e: any) => {
                                e.stopPropagation();
                                setDeleteTarget(template);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                              <span>Xóa</span>
                            </Button>
                          )}
                        </div>
                      </MobileCard.Footer>
                    </MobileCard>
                  );
                })
              )}
            </div>
          ) : (
            /* Bảng danh sách checklist mẫu sử dụng CustomTable */
            <div className="w-full max-w-full overflow-hidden min-w-0">
              <CustomTable<ChecklistTemplateDocument>
                columns={columns}
                data={filteredTemplates}
                enablePagination={true}
                pagination={tablePagination}
                onPaginationChange={setTablePagination}
                enableSorting={false}
                enableFiltering={false}
                enableColumnResizing={false}
                enableColumnVisibility={false}
                showFilterRow={false}
                emptyMessage="Không có mẫu checklist nào phù hợp."
                tableMinWidth={900}
                className="w-full min-w-0 [&_th]:!bg-slate-50 [&_th]:!text-slate-800 [&_th]:text-xs [&_th]:font-black rounded-xl border border-slate-200/90 shadow-3xs bg-white overflow-hidden"
              />
            </div>
          )}
        </div>

        <div className="hidden xl:block w-full space-y-4 text-left min-w-0 xl:col-span-3">
          {/* Card Thống kê Tổng quan */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
            <div className="h-1 bg-gradient-to-r from-red-600 to-rose-400 shrink-0" />
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-1.5 space-y-0">
              <Layers className="w-4.5 h-4.5 text-[#C21A1A] shrink-0" />
              <CardTitle className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Tổng quan checklist mẫu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block leading-normal">Tổng mẫu</span>
                  <span className="mt-1 block text-lg font-black text-slate-700 tabular-nums">{stats.total}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100/50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider block leading-normal">Đang dùng</span>
                  <span className="mt-1 block text-lg font-black text-emerald-700 tabular-nums">{stats.active}</span>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100/50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider block leading-normal">Tự động sinh</span>
                  <span className="mt-1 block text-lg font-black text-blue-700 tabular-nums">{stats.autoCreate}</span>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-100/50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider block leading-normal">Tạm ẩn</span>
                  <span className="mt-1 block text-lg font-black text-amber-700 tabular-nums">{stats.hidden}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Nguyên tắc */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
            <CardHeader className="p-4 pb-0 flex flex-row items-center gap-1.5 space-y-0">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <CardTitle className="text-xs font-black uppercase tracking-wider text-slate-400">
                Nguyên tắc checklist mẫu
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <ul className="text-xs font-medium text-slate-500 leading-relaxed pl-3.5 list-disc space-y-2">
                <li><strong className="text-slate-700">Tạo 1 lần - dùng nhiều lần:</strong> Tạo checklist mẫu theo vai trò, hệ thống tự sinh hàng ngày.</li>
                <li><strong className="text-slate-700">Chuẩn hóa & nhất quán:</strong> Đầu việc rõ ràng, có bằng chứng hình ảnh giúp kiểm soát chất lượng showroom.</li>
                <li><strong className="text-slate-700">Dễ dàng cập nhật:</strong> Thay đổi mẫu sẽ tự động đồng bộ và áp dụng cho các checklist sinh về sau.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Form chỉnh sửa checklist mẫu dạng Sheet trượt */}
      <Sheet
        open={editingTemplateId !== null}
        onOpenChange={(open) => {
          if (!open) setEditingTemplateId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-[92vw] sm:w-[55vw] sm:max-w-[55vw] p-0 font-sans border-l border-slate-200 bg-white flex flex-col h-full focus:outline-none"
        >
          {editingTemplateId !== null && (
            <div className="w-full h-full flex flex-col overflow-hidden text-left bg-white">
              {/* Header Form */}
              <div className="bg-slate-50/80 px-4 py-3.5 border-b border-slate-200 flex items-center shrink-0">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#C21A1A] text-white flex items-center justify-center shrink-0">
                    {editingTemplateId === 'new' ? <Plus className="w-4 h-4 stroke-[3]" /> : <Edit2 className="w-4 h-4" />}
                  </span>
                  <span>{editingTemplateId === 'new' ? 'Tạo checklist mẫu' : 'Chỉnh sửa checklist mẫu'}</span>
                </h3>
              </div>

              {/* Body Form */}
              <FormProvider {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmitHandler)}
                  className="flex flex-col h-full overflow-hidden"
                >
                  <div className="flex-1 overflow-y-auto p-4.5 space-y-4">
                    {/* Tên checklist mẫu */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem className="grid gap-0">
                          <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                            Tên checklist mẫu
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Nhập tên checklist mẫu..."
                              className="w-full h-9.5 text-xs font-bold border-slate-200 focus:border-slate-800 rounded-xl"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    {/* 2-column Grid: Vai trò áp dụng & Người thực hiện */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Vai trò áp dụng */}
                      <FormField
                        control={form.control}
                        name="roleCode"
                        render={({ field }) => (
                          <FormItem className="grid gap-0">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Vai trò áp dụng
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={field.onChange}
                                options={roleOptions.map(r => ({ label: r.name, value: r.code }))}
                                clearable={false}
                                disabled={false}
                                placeholder="Chọn vai trò..."
                                className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Người thực hiện mặc định */}
                      <FormField
                        control={form.control}
                        name="defaultAssignee"
                        render={({ field }) => (
                          <FormItem className="grid gap-0">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Người thực hiện
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={field.onChange}
                                options={staffOptions}
                                clearable={false}
                                placeholder="Chọn người thực hiện..."
                                className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Người kiểm tra */}
                    <FormField
                      control={form.control}
                      name="inspectorId"
                      render={({ field }) => (
                        <FormItem className="grid gap-0">
                          <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                            Người kiểm tra
                          </FormLabel>
                          <FormControl>
                            <CustomSelect
                              value={field.value}
                              onChangeValue={field.onChange}
                              options={inspectorOptions}
                              clearable={false}
                              placeholder="Chọn người kiểm tra..."
                              className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    {/* 2-column Grid: Tần suất & Ca áp dụng */}
                    <div className="grid grid-cols-2 gap-3.5">
                      {/* Tần suất */}
                      <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem className="grid gap-0">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Tần suất
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={(val) => {
                                  field.onChange(val);
                                  form.setValue('frequencyDetail', '');
                                }}
                                options={frequencyOptions}
                                clearable={false}
                                placeholder="Chọn tần suất..."
                                className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      {/* Ca áp dụng */}
                      <FormField
                        control={form.control}
                        name="shift"
                        render={({ field }) => (
                          <FormItem className="grid gap-0">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Ca áp dụng
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={field.onChange}
                                options={[
                                  { label: 'Cả ngày', value: 'all_day' },
                                  { label: 'Ca sáng', value: 'morning' },
                                  { label: 'Ca chiều', value: 'afternoon' },
                                  { label: 'Ca tối', value: 'night' }
                                ]}
                                clearable={false}
                                placeholder="Chọn ca áp dụng..."
                                className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Dropdown Chi tiết tần suất (nếu chọn hàng tuần/hàng tháng) */}
                    {watchFrequency === 'weekly' && (
                      <FormField
                        control={form.control}
                        name="frequencyDetail"
                        render={({ field }) => (
                          <FormItem className="grid gap-0 animate-in slide-in-from-top-2 duration-200">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Chọn thứ trong tuần
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={field.onChange}
                                options={weekdayOptions}
                                clearable={false}
                                placeholder="Chọn thứ trong tuần..."
                                className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchFrequency === 'monthly' && (
                      <FormField
                        control={form.control}
                        name="frequencyDetail"
                        render={({ field }) => (
                          <FormItem className="grid gap-0 animate-in slide-in-from-top-2 duration-200">
                            <FormLabel isRequired className="block text-[10px] font-black text-slate-500 mb-1.5 uppercase tracking-wider">
                              Chọn ngày trong tháng
                            </FormLabel>
                            <FormControl>
                              <CustomSelect
                                value={field.value}
                                onChangeValue={field.onChange}
                                options={dayOfMonthOptions}
                                clearable={false}
                                placeholder="Chọn ngày trong tháng..."
                                className="w-full h-9.5 text-xs font-bold rounded-xl border-slate-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Toggle switches row */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* Toggle switch: Tự động sinh hàng ngày */}
                      <div className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <FormField
                          control={form.control}
                          name="autoCreateDaily"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between gap-3 w-full space-y-0">
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-slate-700 leading-normal">Tự động sinh checklist</span>
                                <span className="text-[10px] text-slate-400 leading-normal font-medium">Hệ thống tự tạo checklist cho ca làm việc</span>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="data-[state=checked]:bg-[#C21A1A]"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Toggle: Trạng thái hoạt động */}
                      <div className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <FormField
                          control={form.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem className="flex items-center justify-between gap-3 w-full space-y-0">
                              <div className="flex flex-col text-left">
                                <span className="text-xs font-bold text-slate-700 leading-normal">Đang hoạt động</span>
                                <span className="text-[10px] text-slate-400 leading-normal font-medium">Cho phép sử dụng mẫu</span>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value === 'active'}
                                  onCheckedChange={(checked) => {
                                    field.onChange(checked ? 'active' : 'hidden');
                                  }}
                                  className="data-[state=checked]:bg-[#C21A1A]"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Danh sách đầu việc & Nút thêm đầu việc */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                          Danh sách đầu việc ({fields.length})
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => append({ title: '', timeLimit: '08:00', isRequired: false, evidenceRequired: false })}
                          className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-bold h-8 px-2.5 rounded-xl border border-slate-200"
                        >
                          <Plus className="size-3.5 stroke-[2.5]" />
                          <span>Thêm đầu việc</span>
                        </Button>
                      </div>

                      {/* Danh sách công việc dạng Table */}
                      <div className="border border-slate-200 rounded-xl bg-white max-h-80 overflow-y-auto">
                        <CustomTable<typeof fields[number]>
                          columns={taskColumns}
                          data={fields}
                          enablePagination={false}
                          enableSorting={false}
                          enableFiltering={false}
                          enableColumnResizing={false}
                          enableColumnVisibility={false}
                          showFilterRow={false}
                          emptyMessage="Chưa có đầu việc nào."
                          tableMinWidth={640}
                          enableInternalVerticalScroll={false}
                          className="w-full border-0 shadow-none bg-transparent [&_th]:!bg-slate-50 [&_th]:!text-slate-800 [&_th]:text-[10px] [&_th]:font-black"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Form */}
                  <SheetFooter className="px-4 py-3.5 border-t border-slate-200 flex flex-row gap-2.5 justify-end shrink-0 bg-slate-50/50 mt-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingTemplateId(null)}
                      className="h-9.5 px-4 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-slate-200 rounded-xl"
                    >
                      Hủy
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-9.5 px-4 text-xs font-bold text-white bg-[#C21A1A] hover:bg-[#A81515] rounded-xl shadow-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          <span>Đang lưu...</span>
                        </>
                      ) : (
                        <span>Lưu & Áp dụng</span>
                      )}
                    </Button>
                  </SheetFooter>
                </form>
              </FormProvider>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog xác nhận xóa template */}
      <DeleteConfirm
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa checklist mẫu"
        description={`Bạn có chắc chắn muốn xóa checklist mẫu của vai trò "${roleOptions.find(r => r.code.toUpperCase() === deleteTarget?.roleCode?.toUpperCase())?.name || deleteTarget?.roleCode || ''
          }"? Tất cả đầu việc bên trong cũng sẽ bị xóa vĩnh viễn và không thể phục hồi.`}
        confirmText="Xóa checklist"
        cancelText="Hủy"
        onConfirm={async () => {
          if (deleteTarget) {
            await onDeleteCategory(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
