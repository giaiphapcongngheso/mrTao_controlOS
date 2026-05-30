import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { Shield, X } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../share/ui';
import { CustomTable } from '../../../../share/components/custom-table';
import { PRESET_MODULES, getModuleMeta } from '../../../constants';
import type { RolePermissionRow, StaffRole } from '../../../types/staff.types';
import { PERMISSION_FIELDS } from '../StaffPermissionsView.constants';
import type { PermissionField } from '../StaffPermissionsView.types';
import {
  rolePermissionFormSchema,
  type PermissionRowFormValues,
  type RolePermissionFormValues,
} from '../role-permission-form-schema';

// ============================================================================
// Types
// ============================================================================

interface RolePermissionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** Pass a role to edit; leave null/undefined for "create new" mode. */
  readonly editingRole?: StaffRole | null;
  /** All existing permission rows (used to pre-fill form when editing). */
  readonly existingPermissions: RolePermissionRow[];
  /** All existing role codes (used for uniqueness validation). */
  readonly existingRoleCodes: string[];
  /** Default storeId for new records. */
  readonly storeId: string;
  readonly isOwner: boolean;
  /** Called with validated data when user clicks Save. */
  readonly onSave: (
    roleData: { name: string; code: string; status: 'active' | 'inactive' },
    permissions: PermissionRowFormValues[],
  ) => Promise<void>;
}

// ============================================================================
// Helper: build initial permissions array from module list + existing data
// ============================================================================

function buildInitialPermissions(
  existingPermissions: RolePermissionRow[],
  role?: StaffRole | null,
): PermissionRowFormValues[] {
  // Collect all known module codes
  const moduleSet = new Set<string>(PRESET_MODULES);
  existingPermissions.forEach((row) => moduleSet.add(row.module));
  const allModules = Array.from(moduleSet).sort((a, b) => a.localeCompare(b, 'vi'));

  // Build lookup from existing permissions for this role
  const existingByModule = new Map<string, RolePermissionRow>();
  if (role) {
    existingPermissions
      .filter((row) => row.roleId === role.id || (!row.roleId && row.roleCode === role.code))
      .forEach((row) => existingByModule.set(row.module, row));
  }

  return allModules.map((moduleCode) => {
    const existing = existingByModule.get(moduleCode);
    return {
      module: moduleCode,
      canView: existing?.canView ?? false,
      canCreate: existing?.canCreate ?? false,
      canUpdate: existing?.canUpdate ?? false,
      canDelete: existing?.canDelete ?? false,
      canApprove: existing?.canApprove ?? false,
    };
  });
}

// ============================================================================
// Sub-component: Permission Toggle Button (memoized)
// ============================================================================

interface PermissionToggleProps {
  readonly enabled: boolean;
  readonly disabled: boolean;
  readonly onToggle: () => void;
}

const PermissionToggle = React.memo(function PermissionToggle({
  enabled,
  disabled,
  onToggle,
}: PermissionToggleProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={`min-w-[68px] rounded-2xl px-2.5 py-1.5 text-xs font-black uppercase tracking-[0.12em] transition ${
        enabled
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {enabled ? 'Bật' : 'Tắt'}
    </button>
  );
});

// ============================================================================
// Main Dialog Component
// ============================================================================

export const RolePermissionDialog = React.memo(function RolePermissionDialog({
  open,
  onOpenChange,
  editingRole,
  existingPermissions,
  existingRoleCodes,
  storeId: _storeId,
  isOwner,
  onSave,
}: RolePermissionDialogProps) {
  const isEditMode = Boolean(editingRole);

  // ---- React Hook Form ----
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RolePermissionFormValues>({
    resolver: zodResolver(rolePermissionFormSchema),
    defaultValues: {
      name: editingRole?.name ?? '',
      code: editingRole?.code ?? '',
      status: editingRole?.status ?? 'active',
      permissions: buildInitialPermissions(existingPermissions, editingRole),
    },
  });

  // Reset form when dialog opens with different role
  React.useEffect(() => {
    if (open) {
      reset({
        name: editingRole?.name ?? '',
        code: editingRole?.code ?? '',
        status: editingRole?.status ?? 'active',
        permissions: buildInitialPermissions(existingPermissions, editingRole),
      });
    }
  }, [open, editingRole, existingPermissions, reset]);

  const permissions = watch('permissions');

  // ---- Toggle handler ----
  const handleToggle = useCallback(
    (moduleIndex: number, field: PermissionField) => {
      const current = permissions[moduleIndex];
      if (!current) return;
      const updated = [...permissions];
      updated[moduleIndex] = { ...current, [field]: !current[field] };
      setValue('permissions', updated, { shouldDirty: true });
    },
    [permissions, setValue],
  );

  // ---- Table columns ----
  const columns = useMemo<ColumnDef<PermissionRowFormValues>[]>(() => {
    const cols: ColumnDef<PermissionRowFormValues>[] = [
      {
        id: 'module',
        accessorKey: 'module',
        header: 'Module',
        size: 260,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => {
          const meta = getModuleMeta(row.original.module);
          return (
            <div className="space-y-0.5 text-left py-1">
              <div className="text-sm font-bold text-slate-900">
                {meta.icon} {meta.name}
              </div>
              <div className="max-w-[240px] whitespace-normal text-[11px] leading-4 font-medium text-slate-400">
                {meta.desc}
              </div>
            </div>
          );
        },
      },
    ];

    // Permission toggle columns
    PERMISSION_FIELDS.forEach((field) => {
      cols.push({
        id: field.key,
        accessorKey: field.key,
        header: field.label,
        size: 80,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => {
          const moduleIndex = permissions.findIndex((p) => p.module === row.original.module);
          if (moduleIndex === -1) return null;
          return (
            <div className="flex justify-center">
              <PermissionToggle
                enabled={row.original[field.key]}
                disabled={!isOwner}
                onToggle={() => handleToggle(moduleIndex, field.key)}
              />
            </div>
          );
        },
      });
    });

    // Status column
    cols.push({
      id: 'permStatus',
      header: 'Trạng thái',
      size: 100,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => {
        const hasAny = PERMISSION_FIELDS.some((f) => row.original[f.key]);
        return (
          <div className="flex justify-center">
            <span
              className={`inline-flex min-w-[72px] justify-center rounded-2xl px-2.5 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] ${
                hasAny
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'border border-dashed border-slate-200 text-slate-400'
              }`}
            >
              {hasAny ? 'Đã cấp' : 'Chưa cấp'}
            </span>
          </div>
        );
      },
    });

    return cols;
  }, [permissions, isOwner, handleToggle]);

  // ---- Submit ----
  const onSubmit = useCallback(
    async (data: RolePermissionFormValues) => {
      // Check duplicate role code (only on create)
      if (!isEditMode) {
        const codeNorm = (data.code || data.name)
          .trim()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .replace(/_+/g, '_');

        if (existingRoleCodes.includes(codeNorm)) {
          // Use alert for simplicity – could use form error instead
          alert('Mã vai trò đã tồn tại. Vui lòng chọn tên khác.');
          return;
        }
      }

      await onSave(
        { name: data.name, code: data.code || '', status: data.status },
        data.permissions,
      );
    },
    [isEditMode, existingRoleCodes, onSave],
  );

  // ---- Render ----
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        showCloseButton={false}
      >
        <DialogHeader className="shrink-0 border-b border-slate-100 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Shield className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-black uppercase tracking-[0.14em] text-slate-900">
                  {isEditMode ? 'Chỉnh sửa phân quyền' : 'Tạo vai trò & Phân quyền'}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {isEditMode
                    ? `Vai trò: ${editingRole?.name} (${editingRole?.code})`
                    : 'Nhập tên vai trò rồi cấp quyền cho từng module bên dưới.'}
                </DialogDescription>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-1 flex-col min-h-0 gap-4 pt-3"
        >
          {/* ---- Role Info ---- */}
          <div className="shrink-0 grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-left sm:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Tên vai trò <span className="text-rose-500">*</span>
              </span>
              <input
                {...register('name')}
                disabled={isEditMode}
                placeholder="Quản lý chi nhánh"
                className={`h-11 w-full rounded-2xl border px-4 text-sm font-semibold text-slate-700 outline-none transition
                  ${errors.name ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}
                  ${isEditMode ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'bg-white'}`}
              />
              {errors.name && (
                <p className="text-xs font-semibold text-rose-500">{errors.name.message}</p>
              )}
            </label>

            <label className="space-y-1.5 text-left">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Mã vai trò
              </span>
              <input
                {...register('code')}
                disabled={isEditMode}
                placeholder="Tự tạo nếu trống"
                className={`h-11 w-full rounded-2xl border px-4 text-sm font-semibold text-slate-700 outline-none transition
                  ${errors.code ? 'border-rose-400 ring-2 ring-rose-100' : 'border-slate-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100'}
                  ${isEditMode ? 'bg-slate-50 cursor-not-allowed opacity-70' : 'bg-white'}`}
              />
              {errors.code && (
                <p className="text-xs font-semibold text-rose-500">{errors.code.message}</p>
              )}
            </label>
          </div>

          {/* ---- Permissions Table ---- */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Ma trận phân quyền
            </p>
            <div className="h-[calc(100%-24px)]">
              <CustomTable<PermissionRowFormValues>
                columns={columns}
                data={permissions}
                enablePagination={false}
                enableSorting={false}
                enableFiltering={false}
                enableColumnResizing={false}
                enableColumnVisibility={false}
                showFilterRow={false}
                emptyMessage="Không có module nào."
                tableMinWidth={680}
              />
            </div>
          </div>

          {/* ---- Footer ---- */}
          <DialogFooter className="shrink-0 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isOwner}
              className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Đang lưu…' : 'Lưu'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
