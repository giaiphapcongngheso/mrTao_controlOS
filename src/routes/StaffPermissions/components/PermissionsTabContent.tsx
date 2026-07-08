import React, { useCallback, useMemo, useState } from 'react';
import { Shield, Trash2, Copy } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { CustomTable } from '../../../../share/components/custom-table';
import { PRESET_MODULES } from '../../../constants';
import type { RolePermissionRow, StaffRole } from '../../../types/staff.types';
import { PERMISSION_FIELDS } from '../StaffPermissionsView.constants';
import type { PermissionRowFormValues } from '../role-permission-form-schema';
import { RolePermissionDialog } from './RolePermissionDialog';
import { MobileCard } from '@/src/components/custom/mobile-card';

// ============================================================================
// Types
// ============================================================================

interface PermissionsTabContentProps {
  readonly roles: StaffRole[];
  readonly permissionRows: RolePermissionRow[];
  readonly isOwner: boolean;
  readonly storeId: string;
  readonly onSaveRoleWithPermissions: (
    roleData: { name: string; code: string; status: 'active' | 'inactive' },
    permissions: PermissionRowFormValues[],
    editingRole: StaffRole | null,
  ) => Promise<void>;
  readonly onDeleteRole?: (role: StaffRole) => void;
  /** Called externally when the header "Tạo vai trò" button is clicked. */
  readonly externalCreateOpen?: boolean;
  readonly onExternalCreateOpenChange?: (open: boolean) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PermissionsTabContent({
  roles,
  permissionRows,
  isOwner,
  storeId,
  onSaveRoleWithPermissions,
  onDeleteRole,
  externalCreateOpen = false,
  onExternalCreateOpenChange,
}: PermissionsTabContentProps) {
  const roleOptions = useMemo(() => roles.filter((role) => role.status === 'active'), [roles]);

  const moduleOptions = useMemo(() => {
    const values = new Set<string>(PRESET_MODULES);
    permissionRows.forEach((row) => values.add(row.module));
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [permissionRows]);

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<StaffRole | null>(null);
  const [cloningRole, setCloningRole] = useState<StaffRole | null>(null);

  // Sync with external open state (header button)
  const isDialogOpen = dialogOpen || externalCreateOpen || Boolean(cloningRole);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        setEditingRole(null);
        setCloningRole(null);
        onExternalCreateOpenChange?.(false);
      }
    },
    [onExternalCreateOpenChange],
  );

  const handleOpenEdit = useCallback((role: StaffRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  }, []);

  const handleOpenClone = useCallback((role: StaffRole) => {
    setCloningRole(role);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (role: StaffRole) => {
      onDeleteRole?.(role);
    },
    [onDeleteRole],
  );

  // ---- Save handler ----
  const handleSave = useCallback(
    async (
      roleData: { name: string; code: string; status: 'active' | 'inactive' },
      permissions: PermissionRowFormValues[],
    ) => {
      await onSaveRoleWithPermissions(roleData, permissions, editingRole);
      handleOpenChange(false);
    },
    [editingRole, onSaveRoleWithPermissions, handleOpenChange],
  );

  // ---- Helpers ----
  const existingRoleCodes = useMemo(
    () => roles.map((r) => r.code),
    [roles],
  );

  const getRoleRows = useCallback(
    (role: StaffRole) =>
      permissionRows.filter(
        (row) => row.roleId === role.id || (!row.roleId && row.roleCode === role.code),
      ),
    [permissionRows],
  );

  const totalEnabledByRole = useCallback(
    (role: StaffRole) =>
      getRoleRows(role).reduce(
        (count, row) =>
          count + PERMISSION_FIELDS.reduce((inner, field) => inner + (row[field.key] ? 1 : 0), 0),
        0,
      ),
    [getRoleRows],
  );

  // ---- Table Columns ----
  const columns = useMemo<ColumnDef<StaffRole>[]>(
    () => [
      {
        id: 'name',
        accessorKey: 'name',
        header: () => <div className="text-center w-full">Vai trò</div>,
        size: 220,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="text-left text-sm font-black text-slate-900">
            {row.original.name}
          </div>
        ),
      },
      {
        id: 'code',
        accessorKey: 'code',
        header: () => <div className="text-center w-full">Mã</div>,
        size: 150,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="inline-block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
            {row.original.code}
          </div>
        ),
      },
      {
        id: 'modulesCount',
        header: () => <div className="text-center w-full">Số module</div>,
        size: 120,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => {
          const rows = getRoleRows(row.original);
          return (
            <div className="text-center">
              <span className="inline-flex min-w-[84px] justify-center rounded-2xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-700">
                {rows.length}
              </span>
            </div>
          );
        },
      },
      {
        id: 'enabledCount',
        header: () => <div className="text-center w-full">Ô quyền bật</div>,
        size: 120,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => {
          const enabledCount = totalEnabledByRole(row.original);
          return (
            <div className="text-center">
              <span className="inline-flex min-w-[84px] justify-center rounded-2xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                {enabledCount}
              </span>
            </div>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-center w-full">Tác vụ</div>,
        size: 220,
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => handleOpenEdit(row.original)}
              className="inline-flex items-center gap-1 rounded-2xl border border-sky-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" /> Phân quyền
            </button>
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => handleOpenClone(row.original)}
              className="inline-flex items-center gap-1 rounded-2xl border border-emerald-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Nhân bản
            </button>
            <button
              type="button"
              disabled={!isOwner}
              onClick={() => handleDelete(row.original)}
              className="inline-flex items-center gap-1 rounded-2xl border border-red-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" /> Xoá
            </button>
          </div>
        ),
      },
    ],
    [isOwner, getRoleRows, totalEnabledByRole, handleOpenEdit, handleOpenClone, handleDelete],
  );

  return (
    <div className="space-y-4">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
        <div className="text-left">
          <h2 className="text-xl font-black tracking-tight text-slate-900 font-bold">Phân quyền theo vai trò</h2>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex h-8 items-center rounded-full border border-sky-200 bg-sky-50 px-3 text-sky-700">
            Tổng vai trò: <span className="ml-1 font-black">{roleOptions.length}</span>
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 text-emerald-700">
            Tổng module: <span className="ml-1 font-black">{moduleOptions.length}</span>
          </span>
          <span className="inline-flex h-8 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-amber-700">
            Ô quyền đang bật:{' '}
            <span className="ml-1 font-black">
              {permissionRows.reduce(
                (count, row) => count + PERMISSION_FIELDS.reduce((inner, field) => inner + (row[field.key] ? 1 : 0), 0),
                0,
              )}
            </span>
          </span>
        </div>
      </div>

      {/* On mobile: render MobileCard list view */}
      <div className="block md:hidden space-y-3 px-1 pb-4">
        {roleOptions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 font-bold text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50">
            Chưa có vai trò nào. Bấm nút Vai trò phía trên để tạo vai trò mới.
          </div>
        ) : (
          roleOptions.map((role, idx) => {
            const rows = getRoleRows(role);
            const enabledCount = totalEnabledByRole(role);
            return (
              <MobileCard
                key={role.id}
                delayIndex={idx}
                variant="bordered"
              >
                <MobileCard.Header
                  avatar={role.name.slice(0, 1)}
                  title={role.name}
                  subtitle={role.code}
                  badge={{
                    text: role.status === 'active' ? 'Đang dùng' : 'Ngưng dùng',
                    variant: role.status === 'active' ? 'success' : 'secondary'
                  }}
                />
                <MobileCard.Body className="p-3 space-y-2">
                  <MobileCard.Grid
                    cols={2}
                    items={[
                      { label: 'Số module', value: `${rows.length} modules` },
                      { label: 'Quyền bật', value: `${enabledCount} ô` },
                    ]}
                  />
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2 flex-wrap">
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleOpenEdit(role)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-sky-200 px-3 text-xs font-black uppercase tracking-wider text-sky-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition active:scale-97"
                    >
                      <Shield className="h-3.5 w-3.5" /> Phân quyền
                    </button>
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleOpenClone(role)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-200 px-3 text-xs font-black uppercase tracking-wider text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition active:scale-97"
                    >
                      <Copy className="h-3.5 w-3.5" /> Nhân bản
                    </button>
                    <button
                      type="button"
                      disabled={!isOwner}
                      onClick={() => handleDelete(role)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-red-200 px-3 text-xs font-black uppercase tracking-wider text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition active:scale-97"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Xoá
                    </button>
                  </div>
                </MobileCard.Body>
              </MobileCard>
            );
          })
        )}
      </div>

      {/* On desktop: render CustomTable */}
      <div className="hidden md:block w-full max-w-full overflow-hidden min-w-0">
        <CustomTable<StaffRole>
          columns={columns}
          data={roleOptions}
          enablePagination={false}
          enableSorting={false}
          enableFiltering={false}
          enableColumnResizing={false}
          enableColumnVisibility={false}
          showFilterRow={false}
          emptyMessage="Chưa có vai trò nào. Bấm nút Vai trò phía trên để tạo vai trò mới."
          tableMinWidth={680}
          className="w-full min-w-0 h-[calc(100vh-280px)] min-h-[350px] [&_th]:bg-emerald-50/50 [&_th]:text-emerald-800 [&_th]:border-b [&_th]:border-emerald-100/50"
        />
      </div>

      {/* ---- Unified Dialog ---- */}
      <RolePermissionDialog
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        editingRole={editingRole}
        cloningRole={cloningRole}
        existingPermissions={permissionRows}
        roles={roles}
        existingRoleCodes={existingRoleCodes}
        storeId={storeId}
        isOwner={isOwner}
        onSave={handleSave}
      />
    </div>
  );
}
