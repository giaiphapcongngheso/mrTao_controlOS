import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  Check, 
  MessageSquare, 
  Plus, 
  Clock, 
  AlertTriangle, 
  Users, 
  ChevronRight, 
  CheckCircle2, 
  FileText, 
  Paperclip,
  Activity,
  AlertCircle,
  HelpCircle,
  RotateCcw
} from 'lucide-react';
import { notificationsService, subscribeNotificationsRealtime } from '../../services/notifications-service';
import type { AppNotification } from '../../types/notification.types';
import { staffPermissionService } from '../../services/admin';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import { useAppStore } from '../../stores/app-store';

interface NotificationItem {
  id: string;
  storeId?: string;
  title: string;
  type: 'khan' | 'can_duyet' | 'nhac_viec' | 'canh_bao';
  typeLabel: string;
  time?: string;
  createdAt?: string;
  requester: string;
  role: string;
  approver: string;
  target?: string;
  evidence?: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'commented' | 'task_created';
  comments?: string;
}

interface NotificationPermissions {
  canApprove: boolean;
  canComment: boolean;
  canCreateTask: boolean;
}

function formatRelativeTimeVi(iso?: string): string {
  if (!iso) {
    return 'Vừa xong';
  }

  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) {
    return 'Vừa xong';
  }
  if (diffMin < 60) {
    return `${diffMin} phút trước`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  return date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function normalizeAccessCode(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

export default function NotificationsView() {
  const currentUser = useAppStore((state) => state.currentUser);

  // Tabs: 'all' (Tất cả), 'pending' (Chờ duyệt), 'resolved' (Đã xử lý)
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'resolved'>('pending');
  // Secondary sub-filters to mimic the pill counts
  const [subFilter, setSubFilter] = useState<'all' | 'new' | 'needs_approval' | 'urgent' | 'processed'>('all');

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permissions, setPermissions] = useState<NotificationPermissions>({
    canApprove: false,
    canComment: false,
    canCreateTask: false,
  });

  // Toast message states
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'danger' | 'info' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  const triggerToast = (msg: string, type: 'success' | 'danger' | 'info' = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Feedback input state helper
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [tempCommentText, setTempCommentText] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      try {
        const allPermissions = await staffPermissionService.getAll();
        if (cancelled) {
          return;
        }

        const roleCode = normalizeAccessCode(currentUser?.roleCode || currentUser?.role);
        const sopPermission = allPermissions.find(
          (permission) =>
            normalizeAccessCode(permission.module) === MODULE_CODE.LOI_SOP &&
            normalizeAccessCode(permission.roleCode) === roleCode,
        );
        const taskPermission = allPermissions.find(
          (permission) =>
            normalizeAccessCode(permission.module) === MODULE_CODE.GIAO_VIEC &&
            normalizeAccessCode(permission.roleCode) === roleCode,
        );

        const owner = normalizeAccessCode(currentUser?.roleCode) === 'CHU_CUA_HANG' || currentUser?.username === 'admin';

        setPermissions({
          canApprove: owner || !!sopPermission?.canApprove || !!sopPermission?.canUpdate,
          canComment: owner || !!sopPermission?.canUpdate,
          canCreateTask: owner || !!taskPermission?.canCreate,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải quyền thông báo:', error);
        }
      }
    };

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.roleCode, currentUser?.role, currentUser?.username]);

  useEffect(() => {
    const unsubscribe = subscribeNotificationsRealtime(
      (items) => {
        const sorted = (items || [])
          .map((item) => ({
            ...item,
            type: (item.type === 'khan' ? 'khan' : item.type) as NotificationItem['type'],
            time: formatRelativeTimeVi(item.createdAt),
          }))
          .sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt || '';
            const timeB = b.updatedAt || b.createdAt || '';
            return timeA < timeB ? 1 : -1;
          });
        setNotifications(sorted);
      },
      (error) => {
        console.error('Không thể đồng bộ realtime Notifications:', error);
      },
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const updateNotification = async (id: string, patch: Partial<AppNotification>) => {
    await notificationsService.update(id, {
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  // Handle Approve Action
  const handleApprove = async (id: string) => {
    if (!permissions.canApprove) {
      triggerToast('Bạn không có quyền phê duyệt thông báo này.', 'danger');
      return;
    }

    const target = notifications.find((item) => item.id === id);
    try {
      await updateNotification(id, { status: 'approved' });
      triggerToast(`Đã PHÊ DUYỆT thành công: "${target?.title || 'Yêu cầu'}"`, 'success');
    } catch (error) {
      console.error('Không thể phê duyệt thông báo:', error);
      triggerToast('Không thể phê duyệt. Vui lòng thử lại.', 'danger');
    }
  };

  // Handle Reject Action
  const handleReject = async (id: string) => {
    if (!permissions.canApprove) {
      triggerToast('Bạn không có quyền từ chối thông báo này.', 'danger');
      return;
    }

    const target = notifications.find((item) => item.id === id);
    try {
      await updateNotification(id, { status: 'rejected' });
      triggerToast(`Đã TỪ CHỐI yêu cầu: "${target?.title || 'Yêu cầu'}"`, 'danger');
    } catch (error) {
      console.error('Không thể từ chối thông báo:', error);
      triggerToast('Không thể từ chối. Vui lòng thử lại.', 'danger');
    }
  };

  // Handle Comment Action (Feedback)
  const submitComment = async (id: string) => {
    if (!permissions.canComment) {
      triggerToast('Bạn không có quyền phản hồi thông báo này.', 'danger');
      return;
    }
    if (!tempCommentText.trim()) return;
    const target = notifications.find((item) => item.id === id);
    try {
      await updateNotification(id, {
        status: 'commented',
        comments: tempCommentText,
      });
      triggerToast(`Đã gửi góp ý phản hồi cho "${target?.requester || 'nhân sự gửi'}"`, 'info');
    } catch (error) {
      console.error('Không thể gửi góp ý:', error);
      triggerToast('Không thể gửi góp ý. Vui lòng thử lại.', 'danger');
      return;
    }
    setCommentingId(null);
    setTempCommentText('');
  };

  // Handle Quick Tasks Addition
  const handleCreateTask = async (id: string) => {
    if (!permissions.canCreateTask) {
      triggerToast('Bạn không có quyền tạo việc từ cảnh báo.', 'danger');
      return;
    }
    try {
      await updateNotification(id, { status: 'task_created' });
      triggerToast('Đã tạo nhiệm vụ thành công từ cảnh báo tồn kho!', 'success');
    } catch (error) {
      console.error('Không thể tạo nhiệm vụ từ thông báo:', error);
      triggerToast('Không thể tạo nhiệm vụ. Vui lòng thử lại.', 'danger');
    }
  };

  // Reload from API
  const handleReset = async () => {
    try {
      const rows = await notificationsService.getAll();
      setNotifications(
        (rows || []).map((item) => ({
          ...item,
          type: (item.type === 'khan' ? 'khan' : item.type) as NotificationItem['type'],
          time: formatRelativeTimeVi(item.createdAt),
        })),
      );
      triggerToast('Đã làm mới danh sách thông báo realtime.', 'info');
    } catch (error) {
      console.error('Không thể làm mới Notifications:', error);
      triggerToast('Không thể làm mới thông báo.', 'danger');
    }
  };

  // Real-time calculated counters
  const totalPending = notifications.filter(n => n.status === 'pending').length;
  const totalResolved = notifications.filter(n => n.status !== 'pending').length;
  
  // Custom styled live dashboard badge values based on mock initial state overrides
  const newCount = totalPending;
  const needsApprovalCount = notifications.filter(n => n.status === 'pending' && (n.type === 'can_duyet' || n.type === 'khan')).length;
  const urgentCount = notifications.filter(n => n.status === 'pending' && n.type === 'khan').length;
  const processedCount = notifications.filter(n => n.status !== 'pending').length;

  // Filter list based on main tab & sub pill selection
  const filteredNotifications = notifications.filter(notif => {
    // 1. First layer: Main Tab (Thông báo / Chờ duyệt / Đã xử lý)
    if (filterTab === 'pending' && notif.status !== 'pending') return false;
    if (filterTab === 'resolved' && notif.status === 'pending') return false;

    // 2. Second layer: Sub filters
    if (subFilter === 'urgent' && notif.type !== 'khan') return false;
    if (subFilter === 'needs_approval' && notif.type !== 'can_duyet' && notif.type !== 'khan') return false;
    if (subFilter === 'new' && notif.status !== 'pending') return false;
    if (subFilter === 'processed' && notif.status === 'pending') return false;

    return true;
  });

  return (
    <div className="max-w-4xl mx-auto w-full space-y-3.5 text-left relative focus:outline-none font-sans">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-5 left-5 z-55 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold font-sans max-w-sm transition-all animate-bounce ${
          toast.type === 'danger'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'danger' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : toast.type === 'info' ? (
            <Bell className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <p className="text-[11px] font-bold leading-relaxed">{toast.msg}</p>
        </div>
      )}

      {/* HEADER SECTION WITH RESPONSIVE COMPOSITION - MORE COMPACT NOW */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-white border border-slate-200/90 rounded-2xl p-3.5 shadow-xs">
        <div className="text-left space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-[#C21A1A] tracking-widest font-mono">Quản Trị Hệ Thống</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
            <span className="text-[10px] text-slate-400 font-bold font-mono">VẬN HÀNH RETAIL SOP</span>
          </div>
          <h1 className="text-lg font-black text-slate-800 tracking-tight font-sans">Duyệt Phiếu &amp; Ngoại Lệ Ca Trực</h1>
        </div>

        {/* Reset button to test flow again */}
        <button 
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 text-[10.5px] font-bold transition-all cursor-pointer bg-slate-50 hover:bg-slate-100"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi phục mẫu</span>
        </button>
      </div>

      {/* WEB APP MAIN INTERACTIVE PANEL */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3.5">
        
        {/* TAB LIST CONTAINER LIKE MOBILE WIREFRAME WITH COMPACT BORDER */}
        <div className="flex items-center justify-between border-b border-slate-150 pb-1.5">
          <div className="flex gap-4">
            <button
              onClick={() => { setFilterTab('all'); setSubFilter('all'); }}
              className={`pb-1.5 text-xs font-extrabold transition-all relative cursor-pointer tracking-wider ${
                filterTab === 'all'
                  ? 'text-slate-800 font-black'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Tất cả</span>
              {filterTab === 'all' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C21A1A]" />
              )}
            </button>
            <button
              onClick={() => { setFilterTab('pending'); setSubFilter('all'); }}
              className={`pb-1.5 text-xs font-extrabold transition-all relative cursor-pointer tracking-wider ${
                filterTab === 'pending'
                  ? 'text-[#C21A1A] font-black'
                  : 'text-slate-400 hover:text-[#C21A1A]/80'
              }`}
            >
              <span className="flex items-center gap-1">
                Chờ duyệt
                {totalPending > 0 && (
                  <span className="h-4 px-1.5 rounded-full bg-[#C21A1A] text-[9px] font-black text-white flex items-center justify-center">
                    {totalPending}
                  </span>
                )}
              </span>
              {filterTab === 'pending' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C21A1A]" />
              )}
            </button>
            <button
              onClick={() => { setFilterTab('resolved'); setSubFilter('all'); }}
              className={`pb-1.5 text-xs font-extrabold transition-all relative cursor-pointer tracking-wider ${
                filterTab === 'resolved'
                  ? 'text-slate-800'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Đã xử lý</span>
              {filterTab === 'resolved' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C21A1A]" />
              )}
            </button>
          </div>

          <div className="text-[9.5px] text-slate-400 font-mono font-bold tracking-wider">
            HIỂN THỊ {filteredNotifications.length} / {notifications.length} PHIẾU
          </div>
        </div>

        {/* METADATA SUMMARY BADGES (PHÂN LOẠI NHANH CHỈ SỐ) - COPIED RATIOS FROM PHONE SCREEN */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          
          {/* Pill 1: Mới */}
          <button
            onClick={() => setSubFilter(subFilter === 'new' ? 'all' : 'new')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              subFilter === 'new'
                ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/10'
                : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Mới</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-slate-800">{newCount}</span>
              <span className="text-[9px] font-semibold text-slate-400">phiếu</span>
            </div>
          </button>

          {/* Pill 2: Cần duyệt */}
          <button
            onClick={() => setSubFilter(subFilter === 'needs_approval' ? 'all' : 'needs_approval')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              subFilter === 'needs_approval'
                ? 'bg-orange-50/70 border-orange-300 ring-2 ring-orange-400/10'
                : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">Cần duyệt</span>
              <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">!</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-slate-800">{needsApprovalCount}</span>
              <span className="text-[9px] font-semibold text-slate-400">cần duyệt</span>
            </div>
          </button>

          {/* Pill 3: Khập / Khẩn */}
          <button
            onClick={() => setSubFilter(subFilter === 'urgent' ? 'all' : 'urgent')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              subFilter === 'urgent'
                ? 'bg-[#C21A1A]/5 border-red-300 ring-2 ring-red-400/10'
                : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[9.5px] font-bold text-[#C21A1A] uppercase tracking-wider">Khẩn</span>
              <span className="w-4 h-4 rounded-full bg-rose-100 text-[#C21A1A] flex items-center justify-center text-[10px] font-black">▲</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-[#C21A1A]">{urgentCount}</span>
              <span className="text-[9px] font-semibold text-rose-400">khẩn cấp</span>
            </div>
          </button>

          {/* Pill 4: Đã xử lý */}
          <button
            onClick={() => setSubFilter(subFilter === 'processed' ? 'all' : 'processed')}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
              subFilter === 'processed'
                ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/10'
                : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100/50'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-[9.5px] font-bold text-emerald-700 uppercase tracking-wider">Đã xử lý</span>
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[9px]">✔</span>
            </div>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-lg font-black font-mono text-emerald-800">{processedCount}</span>
              <span className="text-[9px] font-semibold text-emerald-400">xong</span>
            </div>
          </button>

        </div>

        {/* NOTIFICATION INTERACTIVE FEED LIST (PHIẾU PHÊ DUYỆT ĐỦ NGỮ CẢNH) - GAP-2 COMPACT */}
        <div className="space-y-2">
          
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-1.5">
              <Bell className="w-7 h-7 text-slate-300 mx-auto" />
              <h3 className="text-[11px] font-black text-slate-600 uppercase tracking-wider">Không tìm thấy thông báo nào</h3>
              <p className="text-[10px] text-slate-400">Chọn bộ lọc khác hoặc nhấn "Khôi phục mẫu" để cập nhật.</p>
            </div>
          ) : (
            filteredNotifications.map((it) => {
              
              // Styling helper based on urgency type and level
              const typeStyle = () => {
                switch (it.type) {
                  case 'khan':
                    return {
                      border: 'border-l-3 border-l-rose-500 border-slate-200',
                      badge: 'bg-rose-50 text-rose-700 border-rose-250 text-[#C21A1A]',
                      iconBg: 'bg-rose-50 text-[#C21A1A]',
                      icon: AlertTriangle
                    };
                  case 'can_duyet':
                    return {
                      border: 'border-l-3 border-l-amber-500 border-slate-200',
                      badge: 'bg-amber-50 text-amber-700 border-amber-250',
                      iconBg: 'bg-amber-50 text-amber-600',
                      icon: FileText
                    };
                  case 'nhac_viec':
                    return {
                      border: 'border-l-3 border-l-blue-500 border-slate-200',
                      badge: 'bg-blue-50 text-blue-700 border-blue-250',
                      iconBg: 'bg-blue-50 text-blue-600',
                      icon: Clock
                    };
                  case 'canh_bao':
                  default:
                    return {
                      border: 'border-l-3 border-l-slate-400 border-slate-200',
                      badge: 'bg-slate-50 text-slate-705 border-slate-250',
                      iconBg: 'bg-slate-50 text-slate-500',
                      icon: Bell
                    };
                }
              };

              const style = typeStyle();
              const IconComponent = style.icon;

              return (
                <div 
                  key={it.id}
                  className={`bg-white border rounded-xl p-3 shadow-xs transition-all hover:bg-slate-50/40 relative flex flex-col justify-between ${style.border}`}
                >
                  
                  {/* Card Main line and description */}
                  <div className="flex items-start justify-between gap-3 text-left">
                    <div className="flex items-start gap-2.5">
                      <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${style.iconBg}`}>
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <h4 className="text-[12.5px] font-black text-slate-800 tracking-tight leading-snug">{it.title}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9.5px] text-slate-400 font-bold">{it.time}</span>
                          <span className="text-slate-310 text-[9px] text-slate-300">•</span>
                          <span className={`text-[8.5px] font-extrabold uppercase tracking-widest px-1 rounded border ${style.badge}`}>
                            {it.typeLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Chevron feedback target indicator */}
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 self-center hidden sm:block" />
                  </div>

                  {/* Context Values Grid: 2 columns, extremely concise to respect gap-2 constraints */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-y-1.5 gap-x-3 my-2.5 text-left text-[11px] leading-tight font-medium bg-slate-50/50 p-2 rounded-lg border border-slate-100">
                    
                    {/* Requester */}
                    <div>
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Yêu cầu bởi</span>
                      <div className="flex items-center gap-1 mt-0.5 font-bold text-slate-700">
                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{it.requester}</span>
                        <span className="text-[8.5px] text-slate-400 truncate">({it.role})</span>
                      </div>
                    </div>

                    {/* Approver role */}
                    <div>
                      <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Nhiệm vụ kiểm duyệt</span>
                      <div className="flex items-center gap-1 mt-0.5 font-semibold text-slate-500">
                        <span className="h-1 w-1 rounded-full bg-slate-450 bg-slate-400 shrink-0" />
                        <span>{it.approver}</span>
                      </div>
                    </div>

                    {/* Evidence if any */}
                    {it.evidence ? (
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Hồ sơ đính kèm</span>
                        <div className="flex items-center gap-1 mt-0.5 font-bold text-emerald-600">
                          <Paperclip className="w-3 h-3 shrink-0" />
                          <span>Hồ sơ mở cửa đầy đủ</span>
                        </div>
                      </div>
                    ) : (
                      <div className="col-span-2 md:col-span-1">
                        <span className="text-[8.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Trạng thái phê chuẩn</span>
                        <div className="mt-0.5 font-bold">
                          {it.status === 'pending' ? (
                            <span className="text-amber-652 text-amber-600 text-[9.5px]">Đang chờ...</span>
                          ) : it.status === 'approved' ? (
                            <span className="text-emerald-600 bg-emerald-50 px-1 py-0.2 text-[9px] border border-emerald-100 rounded font-black">✓ ĐÃ PHÊ DUYỆT</span>
                          ) : it.status === 'rejected' ? (
                            <span className="text-rose-600 bg-rose-50 px-1 py-0.2 text-[9px] border border-rose-100 rounded font-black">✗ TỪ CHỐI</span>
                          ) : (
                            <span className="text-slate-500">{it.status.slice(0,10)}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Comment rendering */}
                  {it.comments && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2 mb-2 text-left text-[11px] text-amber-800">
                      <p className="font-semibold italic"><strong>Phản hồi:</strong> "{it.comments}"</p>
                    </div>
                  )}

                  {/* BOTTOM CTAS ROW - STYLED MINIMALISTICALLY COMPACT */}
                  {it.status === 'pending' && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                      
                      {/* Exception: Red/Green style buttons */}
                      {it.type === 'khan' && (
                        <>
                          <button 
                            onClick={() => handleReject(it.id)}
                            disabled={!permissions.canApprove}
                            className="bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg px-3 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all active:scale-95"
                          >
                            Từ chối
                          </button>
                          <button 
                            onClick={() => handleApprove(it.id)}
                            disabled={!permissions.canApprove}
                            className="bg-[#107c41] hover:bg-[#0e6b37] text-white rounded-lg px-3.5 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all flex items-center gap-1 shadow-xs active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Duyệt</span>
                          </button>
                        </>
                      )}

                      {/* Needs review: Orange/Green buttons */}
                      {it.type === 'can_duyet' && (
                        <>
                          {commentingId === it.id ? (
                            <div className="w-full space-y-1.5 mt-1">
                              <textarea
                                placeholder="Ghi ý kiến chỉnh sửa hoặc phản hồi lại..."
                                rows={2}
                                value={tempCommentText}
                                onChange={(e) => setTempCommentText(e.target.value)}
                                className="w-full text-[11px] font-semibold p-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C21A1A]"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button 
                                  onClick={() => setCommentingId(null)}
                                  className="px-2 py-1 border border-slate-200 hover:bg-slate-50 rounded text-slate-500 text-[10px] font-bold"
                                >
                                  Hủy
                                </button>
                                <button 
                                  onClick={() => submitComment(it.id)}
                                  className="px-2.5 py-1 bg-[#C21A1A] hover:bg-[#A31616] text-white rounded text-[10px] font-bold"
                                >
                                  Gửi lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={() => { setCommentingId(it.id); setTempCommentText(''); }}
                                disabled={!permissions.canComment}
                                className="bg-white hover:bg-amber-50 text-amber-600 hover:text-amber-705 border border-amber-200 rounded-lg px-3 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Góp ý</span>
                              </button>
                              <button 
                                onClick={() => handleApprove(it.id)}
                                disabled={!permissions.canApprove}
                                className="bg-[#107c41] hover:bg-[#0e6b37] text-white rounded-lg px-3.5 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all flex items-center gap-1 shadow-xs active:scale-95"
                              >
                                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>Duyệt</span>
                              </button>
                            </>
                          )}
                        </>
                      )}

                      {/* Reminder checklist: Details, then Green check */}
                      {it.type === 'nhac_viec' && (
                        <>
                          <button 
                            onClick={() => triggerToast('Chi tiết checklist được hoàn thành có đủ bằng chứng đính kèm ảnh chụp.', 'info')}
                            className="bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all active:scale-95"
                          >
                            Chi tiết
                          </button>
                          <button 
                            onClick={() => handleApprove(it.id)}
                            disabled={!permissions.canApprove}
                            className="bg-[#107c41] hover:bg-[#0e6b37] text-white rounded-lg px-3.5 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all flex items-center gap-1 shadow-xs active:scale-95"
                          >
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Duyệt</span>
                          </button>
                        </>
                      )}

                      {/* Alarm: Task creation simple button */}
                      {it.type === 'canh_bao' && (
                        <>
                          <button 
                            onClick={() => handleCreateTask(it.id)}
                            disabled={!permissions.canCreateTask}
                            className="bg-white hover:bg-emerald-50 text-emerald-600 hover:text-emerald-705 border border-emerald-250 rounded-lg px-3 py-1.5 font-black uppercase text-[10px] tracking-wider cursor-pointer transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Plus className="w-3.5 h-3.5 animate-pulse" />
                            <span>Tạo việc</span>
                          </button>
                        </>
                      )}

                    </div>
                  )}

                </div>
              );
            })
          )}

        </div>

      </div>

      {/* FOOTER GENERAL PRINCIPLES OF NOTIFICATIONS & APPROVAL SPEC - COMPACT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pb-6">
        
        {/* Card 1: Nguyên Tắc Thiết Kế */}
        <div className="bg-white border border-slate-200/95 rounded-xl p-3 shadow-xs text-left space-y-2">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-rose-100 text-[#C21A1A]">
            <Activity className="w-3.5 h-3.5 shrink-0" />
            <h4 className="text-[10px] font-black uppercase tracking-wider">NGUYÊN TẮC THIẾT KẾ THÔNG BÁO COOP</h4>
          </div>
          <ul className="text-[10.5px] leading-relaxed text-slate-500 font-semibold space-y-1">
            <li className="flex items-start gap-1.5">
              <span className="h-1 w-1 rounded-full bg-red-500 shrink-0 mt-1.5" />
              <span>Gom toàn bộ luồng nhắc việc, báo khẩn hay ngoại lệ về một nơi duy nhất.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="h-1 w-1 rounded-full bg-red-500 shrink-0 mt-1.5" />
              <span>Đầy đủ thông tin người gửi, lý do ngoại lệ, công cụ trực quan hóa.</span>
            </li>
          </ul>
        </div>

        {/* Card 2: Phân Loại Màu Cảnh Báo */}
        <div className="bg-white border border-slate-200/95 rounded-xl p-3 shadow-xs text-left space-y-1">
          <div className="flex items-center gap-1.5 pb-1.5 border-b border-rose-100 text-[#C21A1A]">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <h4 className="text-[10px] font-black uppercase tracking-wider font-sans">Ý NGHĨA PHÂN CẤP CẢNH BÁO</h4>
          </div>
          <div className="text-[10px] leading-relaxed font-semibold divide-y divide-slate-100">
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Đỏ (Ngoại lệ) / Vàng (Chờ duyệt)</span>
              <span className="text-[9px] font-bold text-[#C21A1A]">Phê chuẩn nhanh</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500">Xanh Dương (Checklist ca trực)</span>
              <span className="text-[9px] font-bold text-blue-500">Nhắc nhở tự động</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
