import React, { Dispatch, FormEvent, SetStateAction, useMemo, useCallback, useState } from 'react';
import { CalendarDays, Lock, Mail, Phone, Search, Trash2, UserCheck, UserX, Users, X, Shield, User, UserPlus, Check, Eye, EyeOff } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';

import { getRoleFriendlyName } from '../../../constants';
import type { StaffMember } from '../../../types/staff.types';
import { DEFAULT_STAFF_FORM } from '../StaffPermissionsView.constants';
import type { StaffFormState } from '../StaffPermissionsView.types';

import { CustomTable } from '../../../../share/components/custom-table';
import { CustomSelect } from '../../../../share/components/custom/custom-select';
import { Button, Input, Label } from '../../../../share/ui';
import { MobileCard } from '@/src/components/custom/mobile-card';
import { cn } from '@shared/lib/utils';

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
  readonly isSaving?: boolean;
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
  isSaving = false,
}: StaffTabContentProps) {
  const inactiveStaffCount = Math.max(totalStaff - activeStaffCount, 0);
  const [showPassword, setShowPassword] = useState(false);


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
              {staff.internalNotes && (
                <div className="mt-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100/50 inline-block truncate max-w-[220px]" title={staff.internalNotes}>
                  📝 {staff.internalNotes}
                </div>
              )}
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
              disabled={!isOwner || staff.role?.toLowerCase() === 'admin' || staff.username?.toLowerCase() === 'admin'}
              className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              onClick={() => onToggleStaffStatus(staff)}
            >
              {staff.status === 'active' ? 'Khóa' : 'Mở'}
            </button>
            <button
              type="button"
              disabled={!isOwner || staff.role?.toLowerCase() === 'admin' || staff.username?.toLowerCase() === 'admin'}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-4xl rounded-[32px] border border-slate-100 bg-white shadow-[0_24px_70px_-10px_rgba(15,23,42,0.18)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200" role="dialog" aria-modal="true">
            
            {/* Header */}
            <div className="relative overflow-hidden bg-slate-50/50 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {staffForm.id ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự mới'}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    {staffForm.id ? 'Cập nhật thông tin tài khoản và vai trò vận hành của nhân sự.' : 'Thiết lập tài khoản đăng nhập và chọn vai trò hoạt động.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffForm(DEFAULT_STAFF_FORM);
                  onCancelAddStaffForm();
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition duration-200 cursor-pointer shadow-xs active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={onSubmitCreateStaff} className="flex flex-col">
              <div className="p-6 grid gap-6 md:grid-cols-2 bg-white max-h-[calc(100vh-220px)] overflow-y-auto">
                
                {/* Cột 1: Thông tin cá nhân */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Thông tin cơ bản</h4>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Họ và tên nhân sự</Label>
                    <Input
                      type="text"
                      value={staffForm.fullName}
                      onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))}
                      placeholder="Ví dụ: Nguyễn Văn A"
                      icon={<User className="h-4 w-4 text-slate-400" />}
                      position="left"
                      className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 transition duration-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10 focus-visible:ring-4"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Số điện thoại liên hệ</Label>
                    <Input
                      type="text"
                      value={staffForm.phone}
                      onChange={(event) => setStaffForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Ví dụ: 0912345678"
                      icon={<Phone className="h-4 w-4 text-slate-400" />}
                      position="left"
                      className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 transition duration-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10 focus-visible:ring-4"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Phân vai trò (Role)</Label>
                    <CustomSelect
                      options={roleFormOptions}
                      value={staffForm.role}
                      onChangeValue={(val) => setStaffForm((prev) => ({ ...prev, role: String(val) }))}
                      placeholder="Chọn vai trò cho nhân sự"
                      clearable={false}
                      className="h-11 rounded-2xl border-slate-200 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Trạng thái vận hành</Label>
                    <CustomSelect
                      options={statusFormOptions}
                      value={staffForm.status}
                      onChangeValue={(val) => setStaffForm((prev) => ({ ...prev, status: val as 'active' | 'inactive' }))}
                      placeholder="Chọn trạng thái"
                      clearable={false}
                      className="h-11 rounded-2xl border-slate-200 text-sm font-semibold text-slate-700 transition duration-200 hover:border-slate-300"
                    />
                  </div>
                </div>

                {/* Cột 2: Thông tin tài khoản */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Tài khoản & Bảo mật</h4>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tên đăng nhập (Username)</Label>
                    <Input
                      type="text"
                      value={staffForm.username}
                      onChange={(event) => setStaffForm((prev) => ({ ...prev, username: event.target.value }))}
                      placeholder="Ví dụ: nguyenvana (viết liền, không dấu)"
                      icon={<UserCheck className="h-4 w-4 text-slate-400" />}
                      position="left"
                      className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 transition duration-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10 focus-visible:ring-4"
                    />
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Email đăng nhập hệ thống</Label>
                    <Input
                      type="email"
                      value={staffForm.email}
                      disabled={Boolean(staffForm.id)}
                      onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="nguyenvana@mrtaocoop.com"
                      icon={<Mail className="h-4 w-4 text-slate-400" />}
                      position="left"
                      className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 transition duration-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10 focus-visible:ring-4"
                    />
                    {staffForm.id && (
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                        * Email đăng nhập được liên kết cố định với tài khoản Firebase và không thể sửa đổi.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Mật khẩu tài khoản</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={staffForm.password || ''}
                        onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                        placeholder={staffForm.id ? "Để trống nếu không đổi" : "Tối thiểu 6 ký tự"}
                        icon={<Lock className="h-4 w-4 text-slate-400" />}
                        position="left"
                        clearable={false}
                        className="h-11 rounded-2xl border-slate-200 bg-white text-sm font-semibold text-slate-700 transition duration-200 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/10 focus-visible:ring-4 pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 transition cursor-pointer p-1.5 rounded-lg hover:bg-slate-100/80 flex items-center justify-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                      {staffForm.id
                        ? "Chỉ nhập nếu bạn muốn cập nhật mật khẩu mới cho nhân sự này. Yêu cầu: Tối thiểu 6 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số."
                        : "Mật khẩu dùng để đăng nhập vào Mr Tao OS. Yêu cầu: Tối thiểu 6 ký tự, gồm ít nhất 1 chữ cái và 1 chữ số."}
                    </p>
                  </div>
                </div>

                {/* Trường Ghi chú nội bộ */}
                <div className="space-y-1.5 text-left md:col-span-2 border-t border-slate-100 pt-4">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ghi chú nội bộ (Chỉ quản trị hiển thị)</Label>
                  <textarea
                    value={staffForm.internalNotes || ''}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, internalNotes: event.target.value }))}
                    placeholder="Nhập ghi chú hoặc thông tin nội bộ của nhân sự này..."
                    className="w-full min-h-[80px] max-h-[160px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition duration-200 focus:outline-none focus:border-emerald-500 focus:ring-emerald-500/10 focus:ring-4 placeholder:text-slate-350"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50/80 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-2.5 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  className="h-10 rounded-2xl border border-slate-200/80 bg-white px-4 text-xs font-extrabold text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition duration-200 cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                  onClick={() => {
                    setStaffForm(DEFAULT_STAFF_FORM);
                    onCancelAddStaffForm();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  disabled={!isOwner || isSaving}
                  className="h-10 rounded-2xl bg-emerald-600 px-5 text-xs font-black text-white hover:bg-emerald-700 transition duration-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-95 flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                  ) : staffForm.id ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? 'Đang lưu...' : staffForm.id ? 'Cập nhật tài khoản' : 'Lưu nhân sự'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Staff list table ---- */}
      {/* On mobile: render MobileCard list view */}
      <div className="block md:hidden space-y-3 px-1 pb-4">
        {filteredStaff.length === 0 ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 font-bold text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50">
            Không có dữ liệu phù hợp. Thử đổi bộ lọc vai trò hoặc từ khóa tìm kiếm.
          </div>
        ) : (
          filteredStaff.map((staff, idx) => {
            const isActive = staff.status === 'active';
            return (
              <MobileCard
                key={staff.id}
                delayIndex={idx}
                variant="bordered"
              >
                <MobileCard.Header
                  avatar={staff.fullName.slice(0, 1)}
                  title={staff.fullName}
                  subtitle={`${staff.id} · @${staff.username}`}
                  badge={{
                    text: isActive ? 'Hoạt động' : 'Tạm khóa',
                    variant: isActive ? 'success' : 'secondary'
                  }}
                />
                <MobileCard.Body className="p-3 space-y-2">
                  <MobileCard.Grid
                    cols={2}
                    items={[
                      { label: 'Vai trò', value: getRoleName(staff.role) },
                      { label: 'Ngày gia nhập', value: staff.joinedDate || 'Chưa có' },
                      { label: 'Điện thoại', value: staff.phone || 'Chưa có' },
                      { label: 'Email', value: staff.email || 'Chưa có', fullWidth: true, valueClassName: 'text-xs' },
                    ]}
                  />
                  {staff.internalNotes && (
                    <div className="text-[11px] font-semibold text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-2 py-1 rounded-lg border border-amber-100/50 dark:border-amber-900/30 text-left">
                      📝 Ghi chú: {staff.internalNotes}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <Button
                      type="button"
                      disabled={!isOwner}
                      variant="outline"
                      className="h-8 text-xs px-3 rounded-lg font-bold transition active:scale-97 cursor-pointer"
                      onClick={() => onEditStaff?.(staff)}
                    >
                      Sửa
                    </Button>
                    <Button
                      type="button"
                      disabled={!isOwner || staff.role?.toLowerCase() === 'admin' || staff.username?.toLowerCase() === 'admin'}
                      variant="outline"
                      className="h-8 text-xs px-3 rounded-lg font-bold transition active:scale-97 cursor-pointer"
                      onClick={() => onToggleStaffStatus(staff)}
                    >
                      {staff.status === 'active' ? 'Khóa' : 'Mở'}
                    </Button>
                    <Button
                      type="button"
                      disabled={!isOwner || staff.role?.toLowerCase() === 'admin' || staff.username?.toLowerCase() === 'admin'}
                      variant="ghost"
                      className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition active:scale-97 cursor-pointer flex items-center justify-center"
                      onClick={() => onDeleteStaff(staff)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </MobileCard.Body>
              </MobileCard>
            );
          })
        )}
      </div>

      {/* On desktop: render CustomTable */}
      <div className="hidden md:block w-full max-w-full overflow-hidden min-w-0">
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
          className="w-full min-w-0 h-[calc(100vh-340px)] min-h-[350px] [&_th]:bg-emerald-50/50 [&_th]:text-emerald-800 [&_th]:border-b [&_th]:border-emerald-100/50"
        />
      </div>
    </div>
  );
}
