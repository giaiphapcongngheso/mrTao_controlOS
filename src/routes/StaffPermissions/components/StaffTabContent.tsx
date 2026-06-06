import React, { Dispatch, FormEvent, SetStateAction, useMemo, useCallback } from 'react';
import { CalendarDays, Lock, Mail, Phone, Search, Trash2, UserCheck, UserX, Users, X, Shield } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { getRoleFriendlyName } from '../../../constants';
import type { StaffMember } from '../../../types/staff.types';
import { DEFAULT_STAFF_FORM } from '../StaffPermissionsView.constants';
import type { StaffFormState } from '../StaffPermissionsView.types';

import { CustomTable } from '../../../../share/components/custom-table';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { Button, Input, Label } from '../../../../share/ui';

interface StaffTabContentProps {
  readonly staffSearch: string;
  readonly staffRoleFilter: string;
  readonly roleOptions: Array<{ code: string; name: string }>;
  readonly showAddStaffForm: boolean;
  readonly staffForm: StaffFormState;
  readonly totalStaff: number;
  readonly activeStaffCount: number;
  readonly isOwner: boolean;
  readonly filteredStaff: StaffMember[];
  readonly onStaffSearchChange: (value: string) => void;
  readonly onStaffRoleFilterChange: (value: string) => void;
  readonly onSubmitCreateStaff: (event: FormEvent) => void;
  readonly onCancelAddStaffForm: () => void;
  readonly onToggleStaffStatus: (staff: StaffMember) => void;
  readonly onDeleteStaff: (staff: StaffMember) => void;
  readonly setStaffForm: Dispatch<SetStateAction<StaffFormState>>;
  readonly onEditStaff?: (staff: StaffMember) => void;
}

export function StaffTabContent({
  staffSearch,
  staffRoleFilter,
  roleOptions,
  showAddStaffForm,
  staffForm,
  totalStaff,
  activeStaffCount,
  isOwner,
  filteredStaff,
  onStaffSearchChange,
  onStaffRoleFilterChange,
  onSubmitCreateStaff,
  onCancelAddStaffForm,
  onToggleStaffStatus,
  onDeleteStaff,
  setStaffForm,
  onEditStaff,
}: StaffTabContentProps) {
  const inactiveStaffCount = Math.max(totalStaff - activeStaffCount, 0);

  const getRoleName = useCallback(
    (roleCode: string) => {
      const found = roleOptions.find((r) => r.code === roleCode);
      return found ? found.name : getRoleFriendlyName(roleCode);
    },
    [roleOptions],
  );

  // ---- Select Options with Icons ----
  const roleFilterOptions = useMemo(() => {
    const base = [
      {
        label: (
          <span className="flex items-center gap-2 font-bold text-xs text-slate-700">
            <Users className="h-4 w-4 text-slate-405 shrink-0" />
            Tất cả vai trò
          </span>
        ),
        value: 'ALL',
      },
    ];
    const mapped = roleOptions.map((role) => ({
      label: (
        <span className="flex items-center gap-2 font-bold text-xs text-slate-750">
          <Shield className="h-4 w-4 text-slate-400 shrink-0" />
          {role.name}
        </span>
      ),
      value: role.code,
    }));
    return [...base, ...mapped];
  }, [roleOptions]);

  const roleFormOptions = useMemo(() => {
    return roleOptions.map((role) => ({
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4 text-slate-400 shrink-0" />
          {role.name}
        </span>
      ),
      value: role.code,
    }));
  }, [roleOptions]);

  const statusFormOptions = [
    {
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <UserCheck className="h-4 w-4 text-emerald-500 shrink-0" />
          Đang hoạt động
        </span>
      ),
      value: 'active',
    },
    {
      label: (
        <span className="flex items-center gap-2 font-semibold">
          <UserX className="h-4 w-4 text-slate-400 shrink-0" />
          Ngừng hoạt động
        </span>
      ),
      value: 'inactive',
    },
  ];

  // ---- Table Columns ----
  const columns = useMemo<ColumnDef<StaffMember>[]>(() => [
    {
      id: 'staffInfo',
      header: () => <div className="text-center w-full">Nhân sự</div>,
      size: 280,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="flex min-w-[240px] items-center gap-3 py-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black uppercase text-slate-700">
              {staff.fullName.slice(0, 1)}
            </div>
            <div className="space-y-0.5 text-left">
              <div className="text-sm font-black text-slate-900 leading-snug">{staff.fullName}</div>
              <div className="text-xs font-semibold text-slate-500">{staff.id} · @{staff.username}</div>
            </div>
          </div>
        );
      },
    },
    {
      id: 'role',
      header: () => <div className="text-center w-full">Vai trò</div>,
      size: 180,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="min-w-[140px] inline-block rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
          {getRoleName(row.original.role)}
        </div>
      ),
    },
    {
      id: 'contact',
      header: () => <div className="text-center w-full">Liên hệ</div>,
      size: 220,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="min-w-[200px] space-y-1 text-sm text-slate-650 text-left">
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-medium truncate">{staff.phone || 'Chưa cập nhật'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-medium truncate text-xs">{staff.email || 'Chưa cập nhật'}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: 'joinedDate',
      header: () => <div className="text-center w-full">Ngày gia nhập</div>,
      size: 150,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => (
        <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          {row.original.joinedDate || 'Chưa có'}
        </div>
      ),
    },
    {
      id: 'status',
      header: () => <div className="text-center w-full">Trạng thái</div>,
      size: 140,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => {
        const isActive = row.original.status === 'active';
        return (
          <div className="text-center">
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                isActive
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {isActive ? 'Đang hoạt động' : 'Ngừng hoạt động'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: () => <div className="text-center w-full">Hành động</div>,
      size: 200,
      enableSorting: false,
      enableColumnFilter: false,
      enableResizing: false,
      cell: ({ row }) => {
        const staff = row.original;
        return (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={!isOwner}
              className="rounded-2xl border border-sky-200 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-sky-700 transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              onClick={() => onEditStaff?.(staff)}
            >
              Sửa
            </button>
            <button
              type="button"
              disabled={!isOwner}
              className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              onClick={() => onToggleStaffStatus(staff)}
            >
              {staff.status === 'active' ? 'Khóa' : 'Mở'}
            </button>
            <button
              type="button"
              disabled={!isOwner}
              className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              onClick={() => onDeleteStaff(staff)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Xóa
            </button>
          </div>
        );
      },
    },
  ], [isOwner, onToggleStaffStatus, onDeleteStaff, onEditStaff, getRoleName]);

  return (
    <div className="space-y-4">
      {/* ---- Filter & stats header ---- */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-4 md:p-5 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 min-w-0">
            <Input
              type="text"
              value={staffSearch}
              onChange={(event) => onStaffSearchChange(event.target.value)}
              placeholder="Tìm theo tên, username, mã NV hoặc số điện thoại"
              icon={<Search className="h-4 w-4 text-slate-400" />}
              position="left"
              className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-medium text-slate-700 outline-none transition focus-visible:border-emerald-400 focus-visible:ring-emerald-100"
            />
          </div>

          <div className="w-full md:w-[240px]">
            <CustomSelect
              options={roleFilterOptions}
              value={staffRoleFilter}
              onChangeValue={(val) => onStaffRoleFilterChange(String(val))}
              placeholder="Tất cả vai trò"
              clearable={false}
              className="h-11 rounded-2xl border-slate-200 text-sm font-semibold text-slate-700"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-emerald-700">
            <Users className="h-3.5 w-3.5 shrink-0" /> Tổng: <span className="font-black">{totalStaff}</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 text-sky-700">
            <UserCheck className="h-3.5 w-3.5 shrink-0" /> Hoạt động: <span className="font-black">{activeStaffCount}</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-amber-700">
            <UserX className="h-3.5 w-3.5 shrink-0" /> Tạm khóa: <span className="font-black">{inactiveStaffCount}</span>
          </span>
        </div>
      </div>

      {showAddStaffForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl md:p-6" role="dialog" aria-modal="true">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">
                    {staffForm.id ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {staffForm.id ? 'Chỉnh sửa thông tin tài khoản nhân sự hiện tại.' : 'Nhập đầy đủ thông tin tài khoản và mật khẩu đăng nhập.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffForm(DEFAULT_STAFF_FORM);
                  onCancelAddStaffForm();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmitCreateStaff} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Họ và tên</Label>
                  <Input
                    type="text"
                    value={staffForm.fullName}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="h-11 rounded-2xl border-slate-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Tên đăng nhập</Label>
                  <Input
                    type="text"
                    value={staffForm.username}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, username: event.target.value }))}
                    placeholder="nguyenvana"
                    className="h-11 rounded-2xl border-slate-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Vai trò</Label>
                  <CustomSelect
                    options={roleFormOptions}
                    value={staffForm.role}
                    onChangeValue={(val) => setStaffForm((prev) => ({ ...prev, role: String(val) }))}
                    placeholder="Chọn vai trò"
                    clearable={false}
                    className="h-11 rounded-2xl border-slate-200 text-sm font-semibold text-slate-700"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Số điện thoại</Label>
                  <Input
                    type="text"
                    value={staffForm.phone}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="09xxxxxxxx"
                    className="h-11 rounded-2xl border-slate-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Email đăng nhập</Label>
                  <Input
                    type="email"
                    value={staffForm.email}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="username@mrtaocoop.com"
                    className="h-11 rounded-2xl border-slate-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Mật khẩu</Label>
                  <Input
                    type="password"
                    value={staffForm.password || ''}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder={staffForm.id ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"}
                    icon={<Lock className="h-4 w-4 text-slate-400" />}
                    position="left"
                    className="h-11 rounded-2xl border-slate-200 focus-visible:border-emerald-400 focus-visible:ring-emerald-100 font-semibold"
                  />
                </div>

                <div className="space-y-1.5 text-left md:col-span-2 xl:col-span-1">
                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Trạng thái</Label>
                  <CustomSelect
                    options={statusFormOptions}
                    value={staffForm.status}
                    onChangeValue={(val) => setStaffForm((prev) => ({ ...prev, status: val as 'active' | 'inactive' }))}
                    placeholder="Chọn trạng thái"
                    clearable={false}
                    className="h-11 rounded-2xl border-slate-200 text-sm font-semibold text-slate-700"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
                  onClick={() => {
                    setStaffForm(DEFAULT_STAFF_FORM);
                    onCancelAddStaffForm();
                  }}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={!isOwner}
                  className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 cursor-pointer"
                >
                  {staffForm.id ? 'Cập nhật nhân sự' : 'Lưu nhân sự'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Staff list table ---- */}
      <div className="w-full max-w-full overflow-hidden min-w-0">
        <CustomTable<StaffMember>
          columns={columns}
          data={filteredStaff}
          enablePagination={false}
          enableSorting={false}
          enableFiltering={false}
          enableColumnResizing={false}
          enableColumnVisibility={false}
          showFilterRow={false}
          emptyMessage="Không có dữ liệu phù hợp. Thử đổi bộ lọc vai trò hoặc từ khóa tìm kiếm."
          tableMinWidth={880}
          className="w-full min-w-0 h-[calc(100vh-320px)] min-h-[350px] [&_th]:bg-emerald-50/50 [&_th]:text-emerald-800 [&_th]:border-b [&_th]:border-emerald-100/50"
        />
      </div>
    </div>
  );
}
