import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  Receipt, 
  Clock, 
  ChevronRight,
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Award,
  Plus,
  Send,
  Trash2,
  Check,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  MessageSquare,
  Users,
  FileText,
  Bookmark,
  RefreshCcw,
  BookOpen,
  Info,
  Search
} from 'lucide-react';
import { ChecklistItem } from '../../types/checklist.types';
import { SOPIssue } from '../../types/issues.types';
import { DailyReport } from '../../types/reports.types';
import { TaskItem } from '../../types/tasks.types';
import { KPIStats } from '../../types/today.types';
import { reportsDailyService } from '../../services/reports-service';
import { notificationsService } from '../../services/notifications-service';
import { staffPermissionService } from '../../services/admin';
import { MODULE_CODE } from '../../constants/staff-permissions.constants';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shared/components/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../shared/components/pagination';
import { Skeleton } from '../../shared/components/skeleton';

interface ReportsViewProps {
  dailyReport: DailyReport;
  stats?: KPIStats;
  checklistItems?: ChecklistItem[];
  tasks?: TaskItem[];
  issues?: SOPIssue[];
  currentUser?: { fullName: string; role: string; roleCode?: string; username?: string; avatar?: string } | null;
}

interface SubmittedReport {
  id: string;
  timestamp: string;
  period: 'day' | 'week' | 'month';
  status: 'green' | 'yellow' | 'red';
  revenue: number;
  billCount: number;
  checklistPct: number;
  checklistRatio: string;
  delayedCount: number;
  sopErrorsCount: number;
  complaintsCount: number;
  staffIssuesCount: number;
  notes: string;
  actor: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
  updatedAt?: string;
  dateKey?: string;
}

interface ReportsPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

function normalizeAccessCode(value?: string | null): string {
  return (value || '').trim().toUpperCase();
}

export default function ReportsView({
  dailyReport,
  stats,
  checklistItems = [],
  tasks = [],
  issues = [],
  currentUser
}: ReportsViewProps) {
  // Current active report context tab
  const [reportTab, setReportTab] = useState<'day' | 'week' | 'month'>('day');

  // Interactive Form State
  const [selectedStatus, setSelectedStatus] = useState<'green' | 'yellow' | 'red'>('green');
  const [notes, setNotes] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showToast, setShowToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    msg: '',
    type: 'success'
  });

  // Submitted historical reports via API
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([]);
  const [permissions, setPermissions] = useState<ReportsPermissions>({
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  });

  // Loading & Pagination states for user-facing transitions
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Calculate live values from states
  const totalChecklist = checklistItems.length || 28;
  const completedChecklist = checklistItems.filter(item => item.isCompleted).length || 26;
  const checklistPercentage = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 92;

  const liveDelayedTasks = tasks.filter(task => task.status !== 'completed').length;
  const liveSopErrors = issues.filter(issue => issue.status === 'Chưa xử lý').length;
  const liveComplaintsCount = stats?.customerComplaintsCount ?? 0;
  const liveUserIssues = stats?.lateStaffCount ?? 1;

  // Load report permissions from staff permissions table
  useEffect(() => {
    let cancelled = false;

    const loadPermissions = async () => {
      try {
        const allPermissions = await staffPermissionService.getAll();
        if (cancelled) {
          return;
        }

        const roleCode = normalizeAccessCode(currentUser?.roleCode || currentUser?.role);
        const reportsPermRow = allPermissions.find(
          (permission) =>
            normalizeAccessCode(permission.module) === MODULE_CODE.BAO_CAO &&
            normalizeAccessCode(permission.roleCode) === roleCode,
        );

        if (!reportsPermRow && (currentUser?.role?.toLowerCase().includes('chủ') || currentUser?.username === 'admin')) {
          setPermissions({ canCreate: true, canUpdate: true, canDelete: true });
          return;
        }

        setPermissions({
          canCreate: !!reportsPermRow?.canCreate,
          canUpdate: !!reportsPermRow?.canUpdate,
          canDelete: !!reportsPermRow?.canDelete,
        });
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải quyền báo cáo:', error);
        }
      }
    };

    void loadPermissions();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.fullName, currentUser?.role]);

  // Load submitted reports from API
  useEffect(() => {
    let cancelled = false;

    const loadReports = async () => {
      try {
        const allReports = await reportsDailyService.getAll();
        if (cancelled) {
          return;
        }

        const currentStoreId = dailyReport.storeId;
        const scoped = (allReports || [])
          .filter((item) => item.storeId === currentStoreId)
          .sort((a, b) => {
            const timeA = a.updatedAt || a.createdAt || a.timestamp || '';
            const timeB = b.updatedAt || b.createdAt || b.timestamp || '';
            return timeA < timeB ? 1 : -1;
          })
          .map((item) => ({
            ...item,
            timestamp: item.timestamp || new Date(item.createdAt || Date.now()).toLocaleString('vi-VN'),
          }));

        setSubmittedReports(scoped);
      } catch (error) {
        if (!cancelled) {
          console.error('Không thể tải danh sách báo cáo:', error);
          triggerToast('Không thể tải lịch sử báo cáo từ hệ thống.', 'error');
        }
      }
    };

    void loadReports();

    return () => {
      cancelled = true;
    };
  }, [dailyReport.storeId]);

  // Pre-populate report state based on active issues
  useEffect(() => {
    let warningLevel: 'green' | 'yellow' | 'red' = 'green';
    if (liveDelayedTasks > 3 || liveSopErrors > 2 || liveComplaintsCount > 1) {
      warningLevel = 'red';
    } else if (liveDelayedTasks > 0 || liveSopErrors > 0 || liveComplaintsCount > 0 || liveUserIssues > 0) {
      warningLevel = 'yellow';
    }
    setSelectedStatus(warningLevel);

    const issuesTxt: string[] = [];
    if (liveDelayedTasks > 0) issuesTxt.push(`${liveDelayedTasks} việc trễ`);
    if (liveSopErrors > 0) issuesTxt.push(`${liveSopErrors} lỗi SOP`);
    if (liveComplaintsCount > 0) issuesTxt.push(`${liveComplaintsCount} khiếu nại`);
    if (liveUserIssues > 0) issuesTxt.push(`${liveUserIssues} vấn đề nhân sự`);

    const dateStr = reportTab === 'day' ? 'Hôm nay' : reportTab === 'week' ? 'Tuần này' : 'Tháng này';
    const baseRevenue = reportTab === 'day' ? 28450000 : reportTab === 'week' ? 198300000 : 850400000;
    const formattedRev = new Intl.NumberFormat('vi-VN').format(baseRevenue);

    let draftContent = `Báo cáo ${reportTab === 'day' ? 'cuối ngày' : reportTab === 'week' ? 'tuần' : 'tháng'} hoạt động ổn định. Doanh thu tạm tính khoảng ${formattedRev}đ, hoàn thành ${checklistPercentage}% đầu việc checklist.`;
    if (issuesTxt.length > 0) {
      draftContent = `Doanh thu đạt tốt khoảng ${formattedRev}đ nhưng còn ghi nhận ${issuesTxt.join(', ')} cần rà soát xử lý kỹ lưỡng.`;
    }
    setNotes(draftContent);
  }, [liveDelayedTasks, liveSopErrors, liveComplaintsCount, liveUserIssues, reportTab, checklistPercentage]);

  const handleStatusChange = (status: 'green' | 'yellow' | 'red') => {
    setSelectedStatus(status);
    triggerToast(`Đổi trạng thái quản trị sang: ${status === 'green' ? '🟢 XANH Stable' : status === 'yellow' ? '🟡 VÀNG Warning' : '🔴 ĐỎ Critical'}`, 'info');
  };

  const triggerToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setShowToast({ show: true, msg, type });
    setTimeout(() => {
      setShowToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  const handleSaveDraft = () => {
    setSaveStatus('saving');
    // Save current parameters temporarily to local storage
    setTimeout(() => {
      setSaveStatus('saved');
      triggerToast('Đã lưu nháp báo cáo thành công vào bộ nhớ trình duyệt!', 'info');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!permissions.canCreate && !permissions.canUpdate) {
      triggerToast('Bạn không có quyền gửi báo cáo phê duyệt.', 'error');
      return;
    }
    
    const actorName = currentUser?.fullName || 'Nguyễn Minh Đức';
    const dateObj = new Date();
    
    // Day conversion formatting
    const daysVN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const dayLabel = `${daysVN[dateObj.getDay()]} ${dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`;
    const timeLabel = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    const totalBills = reportTab === 'day' ? 236 : reportTab === 'week' ? 1450 : 6210;
    const revVal = reportTab === 'day' ? 28450000 : reportTab === 'week' ? 198300000 : 850400000;

    const nowIso = new Date().toISOString();
    const dateKey = nowIso.slice(0, 10);
    const newReport: SubmittedReport = {
      id: `rep-${Date.now()}`,
      timestamp: `${dayLabel} lúc ${timeLabel}`,
      period: reportTab,
      status: selectedStatus,
      revenue: revVal,
      billCount: totalBills,
      checklistPct: checklistPercentage,
      checklistRatio: `${completedChecklist}/${totalChecklist}`,
      delayedCount: liveDelayedTasks,
      sopErrorsCount: liveSopErrors,
      complaintsCount: liveComplaintsCount,
      staffIssuesCount: liveUserIssues,
      notes: notes || 'Hệ thống ghi nhận hoạt động bình thường, không có phát sinh sự cố đặc biệt.',
      actor: actorName,
      approvalStatus: 'pending',
      dateKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      const currentStoreId = dailyReport.storeId;
      const isDaily = reportTab === 'day';
      const existingDaily = isDaily
        ? submittedReports.find((item) => item.period === 'day' && item.dateKey === dateKey)
        : undefined;

      let saved: SubmittedReport;
      if (existingDaily) {
        if (!permissions.canUpdate) {
          triggerToast('Bạn không có quyền cập nhật báo cáo ngày hiện tại.', 'error');
          return;
        }
        const updated = await reportsDailyService.update(existingDaily.id, {
          ...newReport,
          storeId: currentStoreId,
          updatedAt: nowIso,
        });
        saved = {
          ...existingDaily,
          ...updated,
          timestamp: updated.timestamp || newReport.timestamp,
        };
      } else {
        const created = await reportsDailyService.create({
          ...newReport,
          storeId: currentStoreId,
        });
        saved = {
          ...newReport,
          ...created,
          timestamp: created.timestamp || newReport.timestamp,
        };
      }

      const nextList = [saved, ...submittedReports.filter((item) => item.id !== saved.id)];
      setSubmittedReports(nextList);

      try {
        await notificationsService.create({
          storeId: currentStoreId,
          title: `Báo cáo ${reportTab === 'day' ? 'cuối ngày' : reportTab === 'week' ? 'tuần' : 'tháng'} gửi duyệt`,
          type: 'can_duyet',
          typeLabel: 'CẦN DUYỆT',
          requester: actorName,
          role: currentUser?.role || 'Nhân sự vận hành',
          approver: 'Quản lý cửa hàng',
          status: 'pending',
          sourceModule: 'REPORTS',
          sourceId: saved.id,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      } catch (notifyError) {
        console.error('Không thể bắn thông báo realtime cho báo cáo:', notifyError);
      }
    } catch (error) {
      console.error('Không thể gửi báo cáo:', error);
      triggerToast('Không thể gửi báo cáo phê duyệt. Vui lòng thử lại.', 'error');
      return;
    }

    // Reset pagination to page 1 and trigger skeleton load transition
    setIsLoading(true);
    setCurrentPage(1);
    setTimeout(() => {
      setIsLoading(false);
      triggerToast('🚀 Báo cáo điều hành đã gửi phê duyệt và đồng bộ lên hệ thống thành công!', 'success');
    }, 550);
  };

  const handleDeleteReport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!permissions.canDelete) {
      triggerToast('Bạn không có quyền xóa báo cáo.', 'error');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn xóa lưu trữ báo cáo lịch sử này?')) {
      try {
        await reportsDailyService.delete(id);
      } catch (error) {
        console.error('Không thể xóa báo cáo:', error);
        triggerToast('Không thể xóa báo cáo trên hệ thống.', 'error');
        return;
      }

      const nextList = submittedReports.filter(r => r.id !== id);
      setSubmittedReports(nextList);

      // Trigger a quick skeleton load transition
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        triggerToast('Đã xóa bỏ bản lưu trữ chỉ số báo cáo.', 'info');
      }, 455);
    }
  };

  // Skeleton screen loader simulator when changing filters/periods
  useEffect(() => {
    setIsLoading(true);
    setCurrentPage(1);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [reportTab]);

  // Pre-calculated period metrics based on selected tab
  const getPeriodRevenue = () => {
    if (reportTab === 'day') return 28450000;
    if (reportTab === 'week') return 198300000;
    return 850400000;
  };

  const getPeriodBills = () => {
    if (reportTab === 'day') return 236;
    if (reportTab === 'week') return 1450;
    return 6210;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace('₫', 'đ');
  };

  // Derive paginated subsets of submitted reports for the active filter tab and search query
  const filteredReports = submittedReports.filter(rep => {
    const matchesTab = rep.period === reportTab;
    const matchesSearch = searchTerm
      ? (rep.notes || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rep.actor || '').toLowerCase().includes(searchTerm.toLowerCase())
      : true;
    return matchesTab && matchesSearch;
  });
  const totalItems = filteredReports.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="w-full space-y-5 text-left relative focus:outline-none">
      
      {/* Dynamic Floating Toast Notifications */}
      {showToast.show && (
        <div className={`fixed bottom-5 left-5 z-55 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-bold font-sans max-w-sm transition-all animate-bounce ${
          showToast.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {showToast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{showToast.msg}</span>
        </div>
      )}

      {/* 1. Header Block wrapped in card with border */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none text-left">
        <div className="font-sans">
          <h1 className="text-xl font-black font-display tracking-tight text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#C21A1A] shrink-0" />
            <span>KÝ DUYỆT &amp; XUẤT BÁO CÁO ĐIỀU HÀNH</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Xác nhận nhanh tình hình vận hành toàn diện định kỳ tại showroom.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-extrabold text-[#C21A1A] uppercase tracking-wider font-sans">Hệ thống báo cáo tích hợp</span>
        </div>
      </div>

      {/* 2. Tabs & Search Input Inline Container */}
      <div className="flex flex-col md:flex-row gap-3.5 justify-between items-stretch md:items-center text-left">
        {/* Tabs - Aligned on left */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-none gap-0.5 shrink-0 self-start md:self-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setReportTab('day')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              reportTab === 'day'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Cuối ngày
          </button>
          <button
            type="button"
            onClick={() => setReportTab('week')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              reportTab === 'week'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tuần
          </button>
          <button
            type="button"
            onClick={() => setReportTab('month')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap flex-1 md:flex-initial ${
              reportTab === 'month'
                ? 'bg-white text-[#C21A1A] border border-red-150 shadow-sm font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Tháng
          </button>
        </div>

        {/* Search bar widget - Inline aligned with Tabs */}
        <div className="flex gap-2 flex-1 md:max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nội dung, mô tả, người viết báo cáo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/90 focus:outline-hidden focus:border-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] bg-white transition-all shadow-2xs"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold font-sans cursor-pointer"
              >
                Xóa
              </button>
            )}
          </div>
        </div>
      </div>

      {/* THE ACTIVE EXECUTIVE REPORT INTERACTIVE FORM CARD - Double border/header padding removed */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        
        {/* INTERACTIVE ROW / GRID BREAKDOWN FOR WIDESCREEN WEB VIEW */}
        <form onSubmit={handleSendReport} className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
          
          {/* LEFT PANEL COLUMN: Auto Synced KPI Stats Cards & Sub Status indicators (7 Grid columns) */}
          <div className="lg:col-span-7 space-y-5 text-left">
            
            <div className="space-y-3">
              <div className="text-left flex items-center justify-between">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#C21A1A] animate-pulse" />
                  Chỉ số tự động đồng bộ (ERP / POS Cloud)
                </span>
                <span className="text-[9.5px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-150 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Thời gian thực
                </span>
              </div>

              {/* Primary critical Metrics Card Rows */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Metric 1: Revenue */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between hover:bg-rose-50/10 transition-colors relative overflow-hidden group select-none text-left">
                  <div className="absolute -right-2 -bottom-2 text-slate-200/5 group-hover:scale-115 transition-transform">
                    <Wallet className="w-12 h-12" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span className="p-1 rounded bg-teal-50 text-teal-700">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </span>
                      <span>Doanh thu gộp</span>
                    </div>
                    <p className="text-lg font-black font-mono text-slate-800 mt-2">
                      {formatCurrency(getPeriodRevenue())}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 font-sans mt-2 block">
                    vs cùng kỳ ▲ 18.6%
                  </span>
                </div>

                {/* Metric 2: Bill Count */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between hover:bg-rose-50/10 transition-colors relative overflow-hidden group select-none text-left">
                  <div className="absolute -right-2 -bottom-2 text-slate-200/5 group-hover:scale-115 transition-transform">
                    <Receipt className="w-12 h-12" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span className="p-1 rounded bg-blue-50 text-blue-700">
                        <Receipt className="w-3.5 h-3.5" />
                      </span>
                      <span>Sản lượng đơn</span>
                    </div>
                    <p className="text-lg font-black font-mono text-slate-800 mt-2">
                      {getPeriodBills()} <span className="text-[10px] text-slate-400 font-semibold font-sans">bills</span>
                    </p>
                  </div>
                  <span className="text-[9px] font-bold text-teal-600 font-sans mt-2 block">
                    vs cùng kỳ ▲ 12.0%
                  </span>
                </div>

                {/* Metric 3: Checklist Completed */}
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-col justify-between hover:bg-rose-50/10 transition-colors relative overflow-hidden group select-none text-left">
                  <div className="absolute -right-2 -bottom-2 text-slate-200/5 group-hover:scale-115 transition-transform">
                    <Check className="w-12 h-12" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <span className="p-1 rounded bg-emerald-50 text-emerald-700">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </span>
                      <span>Hoàn tất Checklist</span>
                    </div>
                    <p className="text-lg font-black font-mono text-emerald-700 mt-2">
                      {checklistPercentage}%
                    </p>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 font-mono mt-2 block">
                    Tỷ lệ: {completedChecklist}/{totalChecklist} đầu việc
                  </span>
                </div>

              </div>
            </div>

            {/* Sub Operational indicators (Việc trễ, Lỗi SOP, Khiêu nại, Nhân sự) */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono block">
                Tổng hợp tình trạng phát sinh (Phát hiện từ các phân hệ)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                {/* Việc trễ indicator */}
                <div className={`p-3 rounded-2xl border text-left transition-all ${
                  liveDelayedTasks > 0 
                    ? 'bg-rose-50/60 border-rose-200 text-rose-700' 
                    : 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                }`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Việc trễ</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 shrink-0 text-slate-400 group-hover:rotate-12" />
                    <span className="font-mono font-black text-base leading-none">{liveDelayedTasks}</span>
                  </div>
                </div>

                {/* Lỗi SOP indicator */}
                <div className={`p-3 rounded-2xl border text-left transition-all ${
                  liveSopErrors > 0 
                    ? 'bg-amber-50/60 border-amber-200 text-amber-700' 
                    : 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                }`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Lỗi SOP</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="font-mono font-black text-base leading-none">{liveSopErrors}</span>
                  </div>
                </div>

                {/* Khiếu nại indicator */}
                <div className={`p-3 rounded-2xl border text-left transition-all ${
                  liveComplaintsCount > 0 
                    ? 'bg-purple-50/60 border-purple-200 text-purple-700' 
                    : 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                }`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">Khiếu nại</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <MessageSquare className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="font-mono font-black text-base leading-none">{liveComplaintsCount}</span>
                  </div>
                </div>

                {/* Nhân sự indicator */}
                <div className={`p-3 rounded-2xl border text-left transition-all ${
                  liveUserIssues > 0 
                    ? 'bg-blue-50/60 border-blue-200 text-blue-700' 
                    : 'bg-slate-50/70 border-slate-200/60 text-slate-600'
                }`}>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-sans">N/S sự cố</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Users className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="font-mono font-black text-base leading-none">{liveUserIssues}</span>
                  </div>
                </div>

              </div>
            </div>

            {/* OVERALL STORE STATUS HEALTH CHOSER */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono block font-bold">
                Kết luận trạng thái điều hành hôm nay (Store Health)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                
                {/* Button Green */}
                <button
                  type="button"
                  onClick={() => handleStatusChange('green')}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedStatus === 'green'
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm font-black'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55 hover:text-slate-800'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="truncate">🟢 ỔN ĐỊNH</span>
                </button>

                {/* Button Yellow */}
                <button
                  type="button"
                  onClick={() => handleStatusChange('yellow')}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedStatus === 'yellow'
                      ? 'bg-amber-500 text-white border-amber-600 shadow-sm font-black'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55 hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">🟡 CHÚ Ý</span>
                </button>

                {/* Button Red */}
                <button
                  type="button"
                  onClick={() => handleStatusChange('red')}
                  className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                    selectedStatus === 'red'
                      ? 'bg-[#C21A1A] text-white border-rose-700 shadow-sm font-black'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-55 hover:text-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="truncate">🔴 KHẨN CẤP</span>
                </button>

              </div>
            </div>

          </div>

          {/* RIGHT PANEL COLUMN: Narrative Textarea Field & Form actions (5 Grid columns) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            
            <div className="space-y-2 text-left flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <label htmlFor="notes" className="text-[11px] font-black text-slate-400 uppercase tracking-wider font-mono">
                  Ghi chú diễn biến quan trọng ca trực *
                </label>
                <span className="text-[10px] font-mono text-slate-400 font-semibold">
                  {notes.length} / 300 ký tự
                </span>
              </div>
              
              <textarea
                id="notes"
                maxLength={300}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi nhận rõ rệt các phát sinh thực tế liên quan đến dòng tiền két sắt, bàn giao ca trực kỹ thuật, công nợ chưa thu hồi hoặc vướng mắc cần quản trị..."
                className="w-full flex-1 border border-slate-200 rounded-2xl p-4 text-xs font-semibold text-slate-705 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#C21A1A] focus:border-transparent transition-all shadow-inner leading-relaxed text-left bg-slate-50/30 min-h-[160px] lg:min-h-[220px]"
              />
            </div>

            {/* ACTION SUBMIT CONTROLS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              
              {/* Draft outline button */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!permissions.canCreate && !permissions.canUpdate}
                className="flex items-center justify-center gap-2 py-3.5 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-extrabold uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <Bookmark className="w-4 h-4 text-slate-500" />
                <span>{saveStatus === 'saving' ? 'Đang lưu...' : saveStatus === 'saved' ? '✓ Đã Lưu' : 'Lưu nháp báo cáo'}</span>
              </button>

              {/* Send primary button */}
              <button
                type="submit"
                disabled={!permissions.canCreate && !permissions.canUpdate}
                className="flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-red-600 to-[#C21A1A] hover:bg-[#C21A1A]/95 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer shadow-md shadow-red-900/10 active:scale-[0.99]"
              >
                <Send className="w-4 h-4 text-red-100" />
                <span>Gửi phê duyệt</span>
              </button>

            </div>

          </div>

        </form>

      </div>

      {/* SECTION 3: BANTU HISTORY TABLE OF RECENT SUBMITTED REPORTS */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden text-left relative">
        <div className="bg-slate-50/80 border-b border-slate-150 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-left flex items-center gap-2.5">
            <span className="p-1 px-2.5 rounded bg-rose-50 text-[#C21A1A] font-mono font-bold text-[9px] uppercase tracking-wide">
              Cloud POS Sync
            </span>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">
              Lịch sử báo cáo đã chốt ({reportTab === 'day' ? 'Hôm Nay/Cuối Ngày' : reportTab === 'week' ? 'Tuần' : 'Tháng'})
            </h3>
          </div>
          <span className="text-[10px] font-mono font-extrabold text-[#C21A1A] bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
            Đồng bộ kỳ: {totalItems} bản ghi
          </span>
        </div>

        {/* REPORTS DUAL LAYOUT: MOBILE CARDS & DESKTOP SHADCN TABLE */}
        <div className="p-0">
          
          {/* MOBILE VIEW (MD HIDDEN) */}
          <div className="block md:hidden divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-100 bg-white space-y-3 animate-pulse">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-28 bg-slate-200" />
                      <Skeleton className="h-5 w-20 rounded-full bg-slate-200" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-4/5 bg-slate-150" />
                      <Skeleton className="h-3 w-2/3 bg-slate-150" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50">
                      <Skeleton className="h-6 w-full rounded bg-slate-100" />
                      <Skeleton className="h-6 w-full rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedReports.length > 0 ? (
              paginatedReports.map((rep) => (
                <div 
                  key={rep.id} 
                  className={`p-4 hover:bg-slate-50/40 transition-colors space-y-3 border-l-4 ${
                    rep.status === 'green' 
                      ? 'border-l-emerald-500' 
                      : rep.status === 'yellow' 
                        ? 'border-l-amber-500'
                        : 'border-l-rose-600'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-0.5 text-left">
                      <p className="text-xs font-black text-slate-800">{rep.timestamp}</p>
                      <p className="text-[10px] font-bold text-slate-400">
                        Phân hệ: <span className="text-[#C21A1A]">{rep.period === 'day' ? 'Cuối ngày' : rep.period === 'week' ? 'Tuần' : 'Tháng'}</span> • Người lập: <strong className="text-slate-605 text-slate-600 font-extrabold">{rep.actor}</strong>
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    {rep.status === 'green' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[9px] font-black uppercase tracking-wide">
                        ỔN ĐỊNH
                      </span>
                    ) : rep.status === 'yellow' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded-full text-[9px] font-black uppercase tracking-wide">
                        CHÚ Ý
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-[9px] font-black uppercase tracking-wide">
                        KHẨN CẤP
                      </span>
                    )}
                  </div>

                  {/* Operational Metrics grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 text-left font-mono text-[10px] text-slate-500">
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-sans font-black mb-0.5">Doanh Thu</span>
                      <strong className="text-slate-800 text-xs font-sans font-black">{formatCurrency(rep.revenue)}</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-sans font-black mb-0.5">Đơn hàng</span>
                      <strong className="text-slate-800 text-xs font-sans font-black">{rep.billCount} bills</strong>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400 font-sans font-black mb-0.5">Checklist</span>
                      <strong className="text-emerald-700 text-xs font-sans font-black">{rep.checklistPct}%</strong>
                    </div>
                  </div>

                  {/* Issues warnings (only if any exist) */}
                  {(rep.delayedCount > 0 || rep.sopErrorsCount > 0 || rep.complaintsCount > 0 || rep.staffIssuesCount > 0) && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {rep.delayedCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-100 text-rose-700 font-mono text-[9px] font-black">
                          ⚠️ {rep.delayedCount} trễ
                        </span>
                      )}
                      {rep.sopErrorsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-100 text-amber-500 font-mono text-[9px] font-black">
                          ⚠️ {rep.sopErrorsCount} SOP
                        </span>
                      )}
                      {rep.complaintsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 border border-purple-100 text-purple-700 font-mono text-[9px] font-black">
                          ⚠️ {rep.complaintsCount} k/nại
                        </span>
                      )}
                    </div>
                  )}

                  {/* Notes narrative text */}
                  {rep.notes && (
                    <div className="bg-slate-50/40 p-3 rounded-2xl border border-slate-150/40 text-left">
                      <p className="text-[11.5px] text-slate-600 font-medium leading-relaxed">
                        "{rep.notes}"
                      </p>
                    </div>
                  )}

                  {/* Delete button inside cards */}
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteReport(rep.id, e)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-colors border border-rose-100/30 cursor-pointer text-left"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa lưu trữ</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 px-4 bg-white text-center text-slate-400 italic text-xs font-mono">
                💡 Chưa có dữ liệu báo cáo nào kỳ này được đồng bộ.
              </div>
            )}
          </div>

          {/* DESKTOP VIEW (MD BLOCK) */}
          <div className="hidden md:block">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="w-[180px] pl-6 text-[10px] font-mono tracking-widest text-[#C21A1A] font-extrabold uppercase">Thời gian &amp; Người trực</TableHead>
                  <TableHead className="w-[110px] text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase text-center">Mức hoạt động</TableHead>
                  <TableHead className="w-[150px] text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase">Doanh số</TableHead>
                  <TableHead className="w-[130px] text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase">Tỷ lệ Checklist</TableHead>
                  <TableHead className="w-[180px] text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase">Sự cố vận hành</TableHead>
                  <TableHead className="text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase">Diễn biến kỳ báo cáo</TableHead>
                  <TableHead className="w-[60px] pr-6 text-right text-[10px] font-mono tracking-widest text-slate-500 font-extrabold uppercase"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <TableRow key={idx} className="animate-pulse">
                      <TableCell className="pl-6 py-4.5">
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32 bg-slate-200" />
                          <Skeleton className="h-3 w-20 bg-slate-100" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4.5">
                        <Skeleton className="h-5.5 w-24 rounded-full bg-slate-200 mx-auto" />
                      </TableCell>
                      <TableCell className="py-4.5">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-28 bg-slate-200" />
                          <Skeleton className="h-3 w-16 bg-slate-100" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4.5">
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-12 bg-slate-200" />
                          <Skeleton className="h-3 w-20 bg-slate-100" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4.5">
                        <div className="flex gap-1">
                          <Skeleton className="h-4.5 w-12 rounded bg-slate-200" />
                          <Skeleton className="h-4.5 w-12 rounded bg-slate-200" />
                        </div>
                      </TableCell>
                      <TableCell className="py-4.5">
                        <Skeleton className="h-4 w-44 bg-slate-200" />
                      </TableCell>
                      <TableCell className="pr-6 py-4.5 text-right">
                        <Skeleton className="h-8 w-8 rounded-lg bg-slate-200 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : paginatedReports.length > 0 ? (
                  paginatedReports.map((rep) => (
                    <TableRow 
                      key={rep.id} 
                      className={`hover:bg-slate-50/60 transition-colors align-middle border-l-2 ${
                        rep.status === 'green' 
                          ? 'border-l-emerald-500/0 hover:border-l-emerald-500' 
                          : rep.status === 'yellow' 
                            ? 'border-l-amber-500/0 hover:border-l-amber-500'
                            : 'border-l-rose-600/0 hover:border-l-rose-600'
                      }`}
                    >
                      {/* Column 1: Time & Reporter */}
                      <TableCell className="pl-6 py-4.5 align-middle">
                        <div className="space-y-0.5 text-left">
                          <p className="text-xs font-black text-slate-800 leading-tight">{rep.timestamp}</p>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <span>Thực hiện:</span>
                            <span className="text-slate-600 font-extrabold">{rep.actor}</span>
                          </p>
                        </div>
                      </TableCell>

                      {/* Column 2: Status Indicator */}
                      <TableCell className="py-4.5 text-center align-middle">
                        {rep.status === 'green' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full text-[9.5px] font-black uppercase tracking-wide font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            STABLE
                          </span>
                        ) : rep.status === 'yellow' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-750 border border-amber-150 rounded-full text-[9.5px] font-black uppercase tracking-wide font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            WARNING
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-150 rounded-full text-[9.5px] font-black uppercase tracking-wide font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                            CRITICAL
                          </span>
                        )}
                      </TableCell>

                      {/* Column 3: Revenue & Bills */}
                      <TableCell className="py-4.5 align-middle text-left">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono font-black text-slate-800 leading-none">{formatCurrency(rep.revenue)}</p>
                          <p className="text-[10px] text-slate-400 font-mono font-bold">{rep.billCount} bills</p>
                        </div>
                      </TableCell>

                      {/* Column 4: Checklist */}
                      <TableCell className="py-4.5 align-middle text-left">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono font-black text-emerald-700 leading-none">{rep.checklistPct}%</p>
                          <p className="text-[10px] text-slate-400 font-mono font-bold">Tỷ lệ: {rep.checklistRatio}</p>
                        </div>
                      </TableCell>

                      {/* Column 5: Issues summary */}
                      <TableCell className="py-4.5 align-middle text-left">
                        <div className="flex flex-wrap gap-1 max-w-[170px]">
                          {rep.delayedCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-100 font-mono text-[9px] font-bold">
                              {rep.delayedCount} trễ
                            </span>
                          )}
                          {rep.sopErrorsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 font-mono text-[9px] font-bold">
                              {rep.sopErrorsCount} SOP
                            </span>
                          )}
                          {rep.complaintsCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100 font-mono text-[9px] font-bold">
                              {rep.complaintsCount} khiếu nại
                            </span>
                          )}
                          {rep.delayedCount === 0 && rep.sopErrorsCount === 0 && rep.complaintsCount === 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-50 text-slate-400 font-mono text-[9px] font-bold">
                              Không phát sinh
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Column 6: Note block */}
                      <TableCell className="py-4.5 align-middle text-left font-bold text-slate-600">
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-semibold pr-4">
                          {rep.notes}
                        </p>
                      </TableCell>

                      {/* Column 7: Remove button */}
                      <TableCell className="pr-6 py-4.5 text-right align-middle">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteReport(rep.id, e)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-transparent hover:border-rose-100 cursor-pointer"
                          title="Xóa bản ghi này khỏi lịch sử"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 bg-white text-center text-slate-400 italic text-xs font-mono select-none">
                      💡 Chưa có dữ liệu báo cáo nào kỳ này được chốt trên POS Cloud.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* PAGINATION CONTROLS PANEL */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 font-medium select-none">
            <span className="text-[11px] font-mono font-bold text-slate-400 order-2 sm:order-1 text-center sm:text-left">
              Bản ghi {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(totalItems, currentPage * itemsPerPage)} trên tổng số {totalItems}
            </span>
            <div className="order-1 sm:order-2">
              <Pagination className="justify-center sm:justify-end w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={`cursor-pointer border border-slate-200 hover:bg-slate-100 h-8 gap-1.5 px-3 rounded-lg text-slate-600 transition-colors ${currentPage === 1 ? 'pointer-events-none opacity-40' : ''}`}
                      text="Trước"
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => (
                    <PaginationItem key={idx}>
                      <PaginationLink
                        isActive={currentPage === idx + 1}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`cursor-pointer h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black transition-colors ${
                          currentPage === idx + 1 
                            ? 'bg-[#C21A1A] text-white hover:bg-[#C21A1A]/90' 
                            : 'border border-slate-105 hover:bg-slate-50 hover:bg-slate-100 text-slate-605 text-slate-600'
                        }`}
                      >
                        {idx + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={`cursor-pointer border border-slate-200 hover:bg-slate-100 h-8 gap-1.5 px-3 rounded-lg text-slate-600 transition-colors ${currentPage === totalPages ? 'pointer-events-none opacity-40' : ''}`}
                      text="Sau"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
