import { Activity, Plus, RefreshCw, Shield, Trash2, Users, Mail } from 'lucide-react';
import type { ActiveTab } from '../StaffPermissionsView.types';

interface StaffPermissionsHeaderProps {
  activeTab: ActiveTab;
  isRefreshing: boolean;
  isOwner: boolean;
  showAddStaffForm: boolean;
  staffCount: number;
  permissionCount: number;
  logCount: number;
  onReload: () => void;
  onSetActiveTab: (tab: ActiveTab) => void;
  onOpenAddStaffDialog: () => void;
  onOpenRoleDialog?: () => void;
  onClearLogs?: () => void;
  showStaffTab?: boolean;
  showPermissionsTab?: boolean;
  showEmailTab?: boolean;
  showLogsTab?: boolean;
}

export function StaffPermissionsHeader({
  activeTab,
  isRefreshing,
  isOwner,
  showAddStaffForm,
  staffCount,
  permissionCount,
  logCount,
  onReload,
  onSetActiveTab,
  onOpenAddStaffDialog,
  onOpenRoleDialog,
  onClearLogs,
  showStaffTab = true,
  showPermissionsTab = true,
  showEmailTab = isOwner,
  showLogsTab = true,
}: StaffPermissionsHeaderProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_30px_-26px_rgba(15,23,42,0.55)]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-700">
            <Users className="h-5 w-5 stroke-[2.2]" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-slate-900 md:text-xl">Hồ sơ Nhân sự & Phân quyền</h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-slate-200 bg-white p-2 shadow-[0_14px_35px_-30px_rgba(15,23,42,0.5)]">
        <div className="flex flex-wrap gap-2">
          {showStaffTab && (
            <button
              type="button"
              onClick={() => onSetActiveTab('staff')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                activeTab === 'staff'
                  ? 'bg-emerald-600 text-white shadow-[0_12px_20px_-12px_rgba(16,124,65,0.75)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Users className="h-4 w-4" />
              Nhân sự ({staffCount})
            </button>
          )}
          {showPermissionsTab && (
            <button
              type="button"
              onClick={() => onSetActiveTab('permissions')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                activeTab === 'permissions'
                  ? 'bg-sky-600 text-white shadow-[0_12px_20px_-12px_rgba(2,132,199,0.75)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield className="h-4 w-4" />
              Phân quyền ({permissionCount})
            </button>
          )}
          {showLogsTab && (
            <button
              type="button"
              onClick={() => onSetActiveTab('logs')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                activeTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-[0_12px_20px_-12px_rgba(79,70,229,0.75)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Activity className="h-4 w-4" />
              Log ({logCount})
            </button>
          )}
          {showEmailTab && (
            <button
              type="button"
              onClick={() => onSetActiveTab('email')}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                activeTab === 'email'
                  ? 'bg-amber-600 text-white shadow-[0_12px_20px_-12px_rgba(217,119,6,0.75)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Mail className="h-4 w-4" />
              Cấu hình Email
            </button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {activeTab === 'staff' && (
            <button
              type="button"
              onClick={onOpenAddStaffDialog}
              disabled={!isOwner}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Plus className="h-3.5 w-3.5" />
              {showAddStaffForm ? 'Đang mở' : 'Thêm'}
            </button>
          )}

          {activeTab === 'permissions' && (
            <button
              type="button"
              onClick={onOpenRoleDialog}
              disabled={!isOwner}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo vai trò
            </button>
          )}

          {activeTab === 'logs' && (
            <button
              type="button"
              onClick={onClearLogs}
              disabled={!isOwner || logCount === 0}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Xóa sạch
            </button>
          )}

          <button
            type="button"
            onClick={onReload}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        </div>
      </div>
    </div>
  );
}
