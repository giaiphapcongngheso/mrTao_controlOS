import { useMemo, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { Check, Lock, Shield, UserRoundPlus, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/table';
import { ScrollArea } from '../../../shared/components/scroll-area';
import { PRESET_MODULES, getModuleMeta } from '../../../constants';
import type { RolePermissionRow, StaffRole } from '../../../types/staff.types';
import { DEFAULT_ROLE_FORM, PERMISSION_FIELDS } from '../StaffPermissionsView.constants';
import type { PermissionField, RoleFormState } from '../StaffPermissionsView.types';

interface PermissionsTabContentProps {
  roles: StaffRole[];
  permissionRows: RolePermissionRow[];
  showAddRoleForm: boolean;
  roleForm: RoleFormState;
  isOwner: boolean;
  onToggleAddRoleForm: () => void;
  onSubmitCreateRole: (event: FormEvent) => void;
  onCancelAddRoleForm: () => void;
  onToggleModulePermission: (role: StaffRole, moduleCode: string, field: PermissionField) => void;
  setRoleForm: Dispatch<SetStateAction<RoleFormState>>;
}

export function PermissionsTabContent({
  roles,
  permissionRows,
  showAddRoleForm,
  roleForm,
  isOwner,
  onToggleAddRoleForm,
  onSubmitCreateRole,
  onCancelAddRoleForm,
  onToggleModulePermission,
  setRoleForm,
}: PermissionsTabContentProps) {
  const roleOptions = useMemo(() => roles.filter((role) => role.status === 'active'), [roles]);

  const moduleOptions = useMemo(() => {
    const values = new Set<string>(PRESET_MODULES);
    permissionRows.forEach((row) => values.add(row.module));
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [permissionRows]);

  const [permissionRoleId, setPermissionRoleId] = useState<string>('');

  const permissionRole = useMemo(
    () => roleOptions.find((role) => role.id === permissionRoleId) ?? null,
    [permissionRoleId, roleOptions],
  );

  const getRoleRows = (role: StaffRole) =>
    permissionRows.filter(
      (row) => row.roleId === role.id || (!row.roleId && row.roleCode === role.code),
    );

  const dialogRowsByModule = useMemo(() => {
    if (!permissionRole) {
      return new Map<string, RolePermissionRow>();
    }

    const map = new Map<string, RolePermissionRow>();
    getRoleRows(permissionRole).forEach((row) => map.set(row.module, row));
    return map;
  }, [permissionRole, permissionRows]);

  const totalEnabledByRole = (role: StaffRole) =>
    getRoleRows(role).reduce(
      (count, row) => count + PERMISSION_FIELDS.reduce((inner, field) => inner + (row[field.key] ? 1 : 0), 0),
      0,
    );

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_45px_-34px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl text-left">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-sky-700">Bảo mật vận hành</p>
            <h2 className="mt-2 text-xl font-black tracking-tight text-slate-900">Phân quyền theo vai trò</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
              Tạo vai trò xong, bấm Phân quyền trên từng vai trò để mở hộp thoại module và cấp quyền trực tiếp.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleAddRoleForm}
            disabled={!isOwner}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-4 text-xs font-black uppercase tracking-[0.2em] text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
          >
            <UserRoundPlus className="h-4 w-4" />
            {showAddRoleForm ? 'Đóng biểu mẫu vai trò' : 'Tạo vai trò'}
          </button>
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

      {showAddRoleForm && (
        <form onSubmit={onSubmitCreateRole} className="border-b border-slate-200 bg-indigo-50/60 p-4 md:p-5">
          <div className="mb-4">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-indigo-700">Tạo vai trò mới</p>
            <p className="mt-1 text-sm font-medium text-slate-500">Vai trò mới sẽ được tạo trong collection roles.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-1.5 text-left md:col-span-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Tên vai trò</span>
              <input
                type="text"
                value={roleForm.name}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Quản lý chi nhánh"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <label className="space-y-1.5 text-left">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Mã vai trò</span>
              <input
                type="text"
                value={roleForm.code}
                onChange={(event) => setRoleForm((prev) => ({ ...prev, code: event.target.value }))}
                placeholder="QUAN_LY_CHI_NHANH"
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </label>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              onClick={() => {
                setRoleForm(DEFAULT_ROLE_FORM);
                onCancelAddRoleForm();
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-indigo-700"
            >
              Lưu vai trò
            </button>
          </div>
        </form>
      )}

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
                    <p className="text-sm font-medium text-slate-500">Tạo vai trò trước để bắt đầu cấp quyền.</p>
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
                        onClick={() => setPermissionRoleId(role.id)}
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

      {permissionRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-6xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl md:p-6" role="dialog" aria-modal="true">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">Phân quyền vai trò</h3>
                  <p className="text-xs text-slate-500">
                    {permissionRole.name} ({permissionRole.code})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPermissionRoleId('')}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ScrollArea className="max-h-[70vh] w-full whitespace-nowrap">
              <Table>
                <TableHeader className="bg-sky-700">
                  <TableRow className="border-b border-sky-800/30 hover:bg-sky-700">
                    <TableHead className="h-11 text-xs font-black uppercase tracking-[0.2em] text-sky-50">Module</TableHead>
                    {PERMISSION_FIELDS.map((field) => (
                      <TableHead key={field.key} className="text-center text-xs font-black uppercase tracking-[0.2em] text-sky-50">
                        {field.label}
                      </TableHead>
                    ))}
                    <TableHead className="text-right text-xs font-black uppercase tracking-[0.2em] text-sky-50">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moduleOptions.map((moduleCode) => {
                    const row = dialogRowsByModule.get(moduleCode);
                    const meta = getModuleMeta(moduleCode);

                    return (
                      <TableRow key={`${permissionRole.id}-${moduleCode}`} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                        <TableCell className="py-3.5">
                          <div className="min-w-[260px] space-y-1 text-left">
                            <div className="text-sm font-black text-slate-900">{meta.icon} {meta.name}</div>
                            <div className="max-w-md whitespace-normal text-xs font-medium leading-5 text-slate-500">{meta.desc}</div>
                          </div>
                        </TableCell>

                        {PERMISSION_FIELDS.map((field) => (
                          <TableCell key={field.key} className="py-3.5 text-center">
                            <button
                              type="button"
                              disabled={!isOwner}
                              onClick={() => onToggleModulePermission(permissionRole, moduleCode, field.key)}
                              className={`min-w-[82px] rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] transition ${
                                row?.[field.key]
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              } disabled:cursor-not-allowed disabled:opacity-50`}
                            >
                              {row?.[field.key] ? 'Bật' : 'Tắt'}
                            </button>
                          </TableCell>
                        ))}

                        <TableCell className="py-3.5 text-right">
                          <span
                            className={`inline-flex min-w-[84px] justify-center rounded-2xl px-3 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                              row
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'border border-dashed border-slate-200 text-slate-400'
                            }`}
                          >
                            {row ? 'Đã cấp' : 'Chưa cấp'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPermissionRoleId('')}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
