import type { Dispatch, FormEvent, SetStateAction } from 'react';
import { CalendarDays, Lock, Mail, Phone, Search, Trash2, UserCheck, UserX, Users, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/table';
import { ScrollArea } from '../../../shared/components/scroll-area';
import { getRoleFriendlyName } from '../../../constants';
import type { StaffMember } from '../../../types/staff.types';
import { DEFAULT_STAFF_FORM } from '../StaffPermissionsView.constants';
import type { StaffFormState } from '../StaffPermissionsView.types';

interface StaffTabContentProps {
  staffSearch: string;
  staffRoleFilter: string;
  roleOptions: string[];
  showAddStaffForm: boolean;
  staffForm: StaffFormState;
  totalStaff: number;
  activeStaffCount: number;
  isOwner: boolean;
  filteredStaff: StaffMember[];
  onStaffSearchChange: (value: string) => void;
  onStaffRoleFilterChange: (value: string) => void;
  onSubmitCreateStaff: (event: FormEvent) => void;
  onCancelAddStaffForm: () => void;
  onToggleStaffStatus: (staff: StaffMember) => void;
  onDeleteStaff: (staff: StaffMember) => void;
  setStaffForm: Dispatch<SetStateAction<StaffFormState>>;
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
}: StaffTabContentProps) {
  const inactiveStaffCount = Math.max(totalStaff - activeStaffCount, 0);

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_22px_45px_-34px_rgba(15,23,42,0.55)]">
      <div className="border-b border-slate-200 bg-slate-50/80 p-4 md:p-5">
        <div className="grid grid-cols-[1.6fr_1fr] gap-3">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={staffSearch}
              onChange={(event) => onStaffSearchChange(event.target.value)}
              placeholder="Tìm theo tên, username, mã NV hoặc số điện thoại"
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <select
            value={staffRoleFilter}
            onChange={(event) => onStaffRoleFilterChange(event.target.value)}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="ALL">Tất cả vai trò</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {getRoleFriendlyName(role)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-emerald-700">
            <Users className="h-3.5 w-3.5" /> Tổng: <span className="font-black">{totalStaff}</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-3 text-sky-700">
            <UserCheck className="h-3.5 w-3.5" /> Hoạt động: <span className="font-black">{activeStaffCount}</span>
          </span>
          <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 text-amber-700">
            <UserX className="h-3.5 w-3.5" /> Tạm khóa: <span className="font-black">{inactiveStaffCount}</span>
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
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-900">Thêm nhân sự</h3>
                  <p className="text-xs text-slate-500">Nhập đầy đủ thông tin tài khoản và mật khẩu đăng nhập.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffForm(DEFAULT_STAFF_FORM);
                  onCancelAddStaffForm();
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSubmitCreateStaff} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <label className="space-y-1.5 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Họ và tên</span>
                  <input
                    type="text"
                    value={staffForm.fullName}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-1.5 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Tên đăng nhập</span>
                  <input
                    type="text"
                    value={staffForm.username}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, username: event.target.value }))}
                    placeholder="nguyenvana"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-1.5 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Vai trò</span>
                  <select
                    value={staffForm.role}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, role: event.target.value }))}
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {getRoleFriendlyName(role)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Số điện thoại</span>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, phone: event.target.value }))}
                    placeholder="09xxxxxxxx"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-1.5 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Email đăng nhập</span>
                  <input
                    type="email"
                    value={staffForm.email}
                    onChange={(event) => setStaffForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="username@mrtaocoop.com"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="space-y-1.5 text-left">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Mật khẩu</span>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={staffForm.password}
                      onChange={(event) => setStaffForm((prev) => ({ ...prev, password: event.target.value }))}
                      placeholder="Tối thiểu 6 ký tự"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </label>

                <label className="space-y-1.5 text-left md:col-span-2 xl:col-span-1">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">Trạng thái</span>
                  <select
                    value={staffForm.status}
                    onChange={(event) =>
                      setStaffForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Ngừng hoạt động</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  onClick={() => {
                    setStaffForm(DEFAULT_STAFF_FORM);
                    onCancelAddStaffForm();
                  }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!isOwner}
                  className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  Lưu nhân sự
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ScrollArea className="w-full whitespace-nowrap">
        <Table>
          <TableHeader className="bg-emerald-700">
            <TableRow className="border-b border-emerald-800/30 hover:bg-emerald-700">
              <TableHead className="h-12 text-xs font-black uppercase tracking-[0.2em] text-emerald-50">Nhân sự</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-emerald-50">Vai trò</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-emerald-50">Liên hệ</TableHead>
              <TableHead className="text-xs font-black uppercase tracking-[0.2em] text-emerald-50">Ngày gia nhập</TableHead>
              <TableHead className="text-right text-xs font-black uppercase tracking-[0.2em] text-emerald-50">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStaff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-14 text-center">
                  <div className="mx-auto max-w-md space-y-2 px-4">
                    <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-400">Không có dữ liệu phù hợp</p>
                    <p className="text-sm font-medium text-slate-500">Thử đổi bộ lọc vai trò hoặc từ khóa tìm kiếm để hiển thị lại danh sách nhân sự.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStaff.map((staff) => (
                <TableRow key={staff.id} className="border-b border-slate-100 align-top hover:bg-slate-50/70">
                  <TableCell className="py-4">
                    <div className="flex min-w-[280px] items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-black uppercase text-slate-700">
                        {staff.fullName.slice(0, 1)}
                      </div>
                      <div className="space-y-1 text-left">
                        <div className="text-sm font-black text-slate-900">{staff.fullName}</div>
                        <div className="text-xs font-semibold text-slate-500">{staff.id} · @{staff.username}</div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            staff.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {staff.status === 'active' ? 'Đang hoạt động' : 'Ngừng hoạt động'}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="min-w-[180px] rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                      {getRoleFriendlyName(staff.role)}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="min-w-[220px] space-y-2 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{staff.phone || 'Chưa cập nhật số điện thoại'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{staff.email || 'Chưa cập nhật email'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      {staff.joinedDate || 'Chưa có'}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="inline-flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={!isOwner}
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => onToggleStaffStatus(staff)}
                      >
                        {staff.status === 'active' ? 'Khóa' : 'Mở lại'}
                      </button>
                      <button
                        type="button"
                        disabled={!isOwner}
                        className="inline-flex items-center gap-1 rounded-2xl border border-rose-200 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => onDeleteStaff(staff)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Xóa
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
