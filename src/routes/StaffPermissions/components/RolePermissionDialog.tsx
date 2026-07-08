import React, { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCheck, Shield, X } from 'lucide-react';
import { cn } from '../../../../share/lib/utils';

import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
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
  /** Pass a role to clone permissions from. */
  readonly cloningRole?: StaffRole | null;
  /** All existing permission rows (used to pre-fill form when editing). */
  readonly existingPermissions: RolePermissionRow[];
  /** All existing roles (used for selecting copy/clone source). */
  readonly roles: StaffRole[];
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
      canExport: existing?.canExport ?? false,
    };
  });
}



// ============================================================================
// Main Dialog Component
// ============================================================================

export const RolePermissionDialog = React.memo(function RolePermissionDialog({
  open,
  onOpenChange,
  editingRole,
  cloningRole,
  existingPermissions,
  roles,
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
      name: editingRole ? editingRole.name : (cloningRole ? `Sao chép từ ${cloningRole.name}` : ''),
      code: editingRole ? editingRole.code : (cloningRole ? `${cloningRole.code}_COPY` : ''),
      status: editingRole?.status ?? 'active',
      permissions: buildInitialPermissions(existingPermissions, editingRole || cloningRole),
    },
  });

  // Reset form when dialog opens with different role or cloning role
  React.useEffect(() => {
    if (open) {
      reset({
        name: editingRole ? editingRole.name : (cloningRole ? `Sao chép từ ${cloningRole.name}` : ''),
        code: editingRole ? editingRole.code : (cloningRole ? `${cloningRole.code}_COPY` : ''),
        status: editingRole?.status ?? 'active',
        permissions: buildInitialPermissions(existingPermissions, editingRole || cloningRole),
      });
    }
  }, [open, editingRole, cloningRole, existingPermissions, reset]);

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

  // ---- Set all permissions handler ----
  const handleSetAll = useCallback(
    (moduleIndex: number, value: boolean) => {
      const current = permissions[moduleIndex];
      if (!current) return;
      const updated = [...permissions];
      updated[moduleIndex] = {
        ...current,
        canView: value,
        canCreate: value,
        canUpdate: value,
        canDelete: value,
        canApprove: value,
        canExport: value,
      };
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
        header: () => <div className="text-center w-full">Module</div>,
        size: 260,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => {
          const meta = getModuleMeta(row.original.module);
          return (
            <div className="text-left py-1">
              <div className="text-sm font-bold text-slate-900">
                {meta.icon} {meta.name}
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
        header: () => <div className="text-center w-full">{field.label}</div>,
        size: 80,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => {
          const moduleIndex = permissions.findIndex((p) => p.module === row.original.module);
          if (moduleIndex === -1) return null;
          return (
            <div className="flex justify-center">
              <Checkbox
                checked={row.original[field.key]}
                disabled={!isOwner}
                onCheckedChange={() => handleToggle(moduleIndex, field.key)}
              />
            </div>
          );
        },
      });
    });

    // Quick assign column
    cols.push({
      id: 'quickAssign',
      header: () => <div className="text-center w-full">Nhanh</div>,
      size: 100,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => {
        const moduleIndex = permissions.findIndex((p) => p.module === row.original.module);
        if (moduleIndex === -1) return null;
        return (
          <div className="flex justify-center gap-2">
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => handleSetAll(moduleIndex, true)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Bật tất cả quyền"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => handleSetAll(moduleIndex, false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-500 dark:hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Tắt tất cả quyền"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      },
    });

    return cols;
  }, [permissions, isOwner, handleToggle, handleSetAll]);

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
            <div className={`space-y-1.5 text-left ${isEditMode ? 'sm:col-span-2' : 'sm:col-span-1'}`}>
              <Label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Tên vai trò <span className="text-rose-500">*</span>
              </Label>
              <Input
                {...register('name')}
                placeholder="Quản lý chi nhánh"
                size="lg"
                className={errors.name ? 'border-rose-400 ring-2 ring-rose-100 rounded-2xl font-semibold' : 'border-slate-200 focus-visible:border-sky-400 focus-visible:ring-sky-100 rounded-2xl font-semibold'}
              />
              {errors.name && (
                <p className="text-xs font-semibold text-rose-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5 text-left">
              <Label className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                Mã vai trò
              </Label>
              <Input
                {...register('code')}
                disabled={isEditMode}
                placeholder="Tự tạo nếu trống"
                size="lg"
                className={errors.code ? 'border-rose-400 ring-2 ring-rose-100 rounded-2xl font-semibold' : 'border-slate-200 focus-visible:border-sky-400 focus-visible:ring-sky-100 rounded-2xl font-semibold'}
              />
              {errors.code && (
                <p className="text-xs font-semibold text-rose-500">{errors.code.message}</p>
              )}
            </div>

            {!isEditMode && (
              <div className="space-y-1.5 text-left">
                <Label className="text-[11px] font-black uppercase tracking-[0.18em] text-sky-700 font-bold">
                  Sao chép quyền từ vai trò
                </Label>
                <select
                  className="w-full h-[46px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-400 focus-visible:border-sky-400 focus-visible:ring-sky-100 cursor-pointer"
                  defaultValue=""
                  onChange={(e) => {
                    const sourceRoleCode = e.target.value;
                    if (!sourceRoleCode) return;
                    const sourceRole = roles.find((r) => r.code === sourceRoleCode);
                    if (sourceRole) {
                      const sourcePerms = buildInitialPermissions(existingPermissions, sourceRole);
                      setValue('permissions', sourcePerms, { shouldDirty: true });
                    }
                  }}
                >
                  <option value="">-- Chọn vai trò nguồn --</option>
                  {roles
                    .filter((r) => r.status === 'active')
                    .map((r) => (
                      <option key={r.id} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          {/* ---- Permissions Table (Desktop) & Accordion (Mobile) ---- */}
          <div className="flex-1 min-h-0 flex flex-col max-h-[45vh] md:max-h-[50vh]">
            <p className="mb-2 shrink-0 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              Ma trận phân quyền
            </p>
            
            {/* Desktop Table View */}
            <div className="hidden md:block flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-200">
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
                enableInternalVerticalScroll={false}
                className="[&_th]:bg-emerald-50/50 [&_th]:text-emerald-800 [&_th]:border-b [&_th]:border-emerald-100/50"
              />
            </div>

            {/* Mobile Accordion View */}
            <div className="block md:hidden flex-1 overflow-y-auto space-y-2 pr-1 select-none">
              {permissions.map((row, moduleIndex) => {
                const meta = getModuleMeta(row.module);
                return (
                  <div key={row.module} className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-900/20">
                    <details className="group">
                      <summary className="flex items-center justify-between p-3.5 cursor-pointer font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-all list-none [&::-webkit-details-marker]:hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <span className="text-xs font-black uppercase tracking-wider">{meta.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 font-extrabold px-2 py-0.5 rounded-full">
                            {PERMISSION_FIELDS.filter(f => row[f.key]).length} / 6
                          </span>
                          <span className="text-slate-400 group-open:rotate-180 transition-transform duration-200 text-xs">▼</span>
                        </div>
                      </summary>
                      
                      <div className="p-3.5 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950/40 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cấp quyền nhanh:</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={!isOwner}
                              onClick={() => handleSetAll(moduleIndex, true)}
                              className="text-[10.5px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 dark:text-emerald-400 px-3 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/30 cursor-pointer active:scale-95 transition-all"
                            >
                              Bật tất cả
                            </button>
                            <button
                              type="button"
                              disabled={!isOwner}
                              onClick={() => handleSetAll(moduleIndex, false)}
                              className="text-[10.5px] font-black uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-900 dark:text-slate-400 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer active:scale-95 transition-all"
                            >
                              Tắt tất cả
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {PERMISSION_FIELDS.map((field) => (
                            <label
                              key={field.key}
                              className={cn(
                                "flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer transition-all active:scale-98 select-none",
                                row[field.key]
                                  ? "bg-sky-50/40 border-sky-200/80 text-sky-800 dark:bg-sky-950/20 dark:border-sky-900 dark:text-sky-400"
                                  : "border-slate-100 hover:bg-slate-50/50 dark:border-slate-850 dark:hover:bg-slate-900/30 text-slate-600 dark:text-slate-400"
                              )}
                            >
                              <Checkbox
                                checked={row[field.key]}
                                disabled={!isOwner}
                                onCheckedChange={() => handleToggle(moduleIndex, field.key)}
                                className="h-5 w-5 rounded-md"
                              />
                              <span className="text-xs font-bold">{field.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </details>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ---- Footer ---- */}
          <DialogFooter className="shrink-0 border-t border-slate-100 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-2xl border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isOwner}
              className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-black text-white hover:bg-sky-700"
            >
              {isSubmitting ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});
