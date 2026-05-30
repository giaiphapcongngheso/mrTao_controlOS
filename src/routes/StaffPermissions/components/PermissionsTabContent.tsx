import { useCallback, useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/table';
import { ScrollArea } from '../../../shared/components/scroll-area';
import { PRESET_MODULES } from '../../../constants';
import type { RolePermissionRow, StaffRole } from '../../../types/staff.types';
import { PERMISSION_FIELDS } from '../StaffPermissionsView.constants';
import type { PermissionRowFormValues } from '../role-permission-form-schema';
import { RolePermissionDialog } from './RolePermissionDialog';

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

  // Sync with external open state (header button)
  const isDialogOpen = dialogOpen || externalCreateOpen;

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setDialogOpen(open);
      if (!open) {
        setEditingRole(null);
        onExternalCreateOpenChange?.(false);
      }
    },
    [onExternalCreateOpenChange],
  );

  const handleOpenCreate = useCallback(() => {
    setEditingRole(null);
    setDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((role: StaffRole) => {
    setEditingRole(role);
    setDialogOpen(true);
  }, []);

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

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_45px_-34px_rgba(15,23,42,0.55)]">
      {/* ---- Header ---- */}
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 md:p-5">
        <div className="text-left">
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">Bảo mật vận hành</p>
          <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Phân quyền theo vai trò</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
            Bấm <strong>Tạo vai trò</strong> hoặc <strong>Phân quyền</strong> trên từng dòng để mở hộp thoại cấu hình.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
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

      {/* ---- Roles Table ---- */}
      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader className="bg-sky-700">
            <TableRow className="border-b border-sky-800/30 hover:bg-sky-700">
              <TableHead className="h-12 text-xs font-black uppercase tracking-[0.2em] text-sky-50">Vai trò</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-sky-50">Mã</TableHead>
              <TableHead className="text-center text-xs font-black uppercase tracking-[0.2em] text-sky-50">Số module</TableHead>
              <TableHead className="text-center text-xs font-black uppercase tracking-[0.2em] text-sky-50">Ô quyền bật</TableHead>
              <TableHead className="text-right text-xs font-black uppercase tracking-[0.2em] text-sky-50">Tác vụ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleOptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <div className="mx-auto max-w-md space-y-2 px-4">
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">Chưa có vai trò</p>
                    <p className="text-sm font-medium text-slate-500">
                      Bấm nút <strong>Vai trò</strong> phía trên để tạo vai trò mới.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              roleOptions.map((role) => {
                const rows = getRoleRows(role);
                const enabledCount = totalEnabledByRole(role);

                return (
                  <TableRow key={role.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                    <TableCell className="py-4">
                      <div className="min-w-[220px] text-left text-sm font-black text-slate-900">{role.name}</div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-600">
                        {role.code}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="inline-flex min-w-[84px] justify-center rounded-2xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-700">
                        {rows.length}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <span className="inline-flex min-w-[84px] justify-center rounded-2xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700">
                        {enabledCount}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      <button
                        type="button"
                        disabled={!isOwner}
                        onClick={() => handleOpenEdit(role)}
                        className="inline-flex items-center gap-1 rounded-2xl border border-sky-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Shield className="h-3.5 w-3.5" /> Phân quyền
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      {/* ---- Unified Dialog ---- */}
      <RolePermissionDialog
        open={isDialogOpen}
        onOpenChange={handleOpenChange}
        editingRole={editingRole}
        existingPermissions={permissionRows}
        existingRoleCodes={existingRoleCodes}
        storeId={storeId}
        isOwner={isOwner}
        onSave={handleSave}
      />
    </div>
  );
}
