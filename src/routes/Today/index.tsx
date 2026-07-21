import React, { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  TrendingUp,
  Users,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import type { TabType } from '../../types/app.types';
import type { TimelineEvent } from '../../types/today.types';
import { TAB_ROUTE_MAP, useAppShellState } from '../app-shell-state';
import { useTodayDashboard } from './_hook/use-today-dashboard';
import { usePlanTargets } from './_hook/use-plan-targets';
import { useTodayTimelineQuery } from './_hook/use-today';
import { CustomSelect } from '../../../share/components/custom/custom-select';
import { staffService } from '../../services/admin/staff-service';
import { useAppStore } from '../../stores/app-store';
import { isOwnerUser } from '../../shared/hooks/use-module-permissions';

import { Card, CardHeader, CardTitle, CardAction, CardContent } from '../../../share/ui/card';
import { cn } from '../../../share/lib/utils';

// ─── Sub-types & Interfaces ───────────────────────────────────────────────────

type TimelineVisual = {
  icon: 'check' | 'alert';
  iconClassName: string;
  descriptionClassName: string;
};

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  caption: React.ReactNode;
  valueClassName?: string;
  captionClassName?: string;
  onClick?: () => void;
  accentColor?: 'green' | 'red' | 'amber' | 'blue' | 'rose' | 'slate' | 'violet';
  illustration?: React.ReactNode;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function getTimelineVisual(status: TimelineEvent['status']): TimelineVisual {
  if (status === 'done') {
    return {
      icon: 'check',
      iconClassName: 'bg-emerald-50 border-emerald-150 text-[#16C784]',
      descriptionClassName: 'text-emerald-600',
    };
  }

  if (status === 'current') {
    return {
      icon: 'alert',
      iconClassName: 'bg-amber-50 border-amber-150 text-[#FFB800]',
      descriptionClassName: 'text-[#FFB800]',
    };
  }

  return {
    icon: 'alert',
    iconClassName: 'bg-rose-50 border-rose-150 text-rose-600',
    descriptionClassName: 'text-rose-600',
  };
}

function LoadingValue({ className = 'bg-slate-100' }: { className?: string }) {
  return <span className={`block h-4 w-16 animate-pulse rounded ${className}`} />;
}

function MetricCard({
  title,
  icon,
  value,
  caption,
  valueClassName = 'text-slate-800',
  captionClassName = 'text-slate-400',
  onClick,
  accentColor = 'slate',
  illustration,
}: MetricCardProps) {
  // Theme styling configurations
  const themeClasses = {
    green: {
      border: 'border-l-[4px] border-l-emerald-500 hover:border-emerald-400',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(16,185,129,0.15)]',
      bg: 'bg-white/80 hover:bg-emerald-50/10',
    },
    red: {
      border: 'border-l-[4px] border-l-rose-500 hover:border-rose-400',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(244,63,94,0.15)]',
      bg: 'bg-white/80 hover:bg-rose-50/10',
    },
    rose: {
      border: 'border-l-[4px] border-l-rose-500 hover:border-rose-400',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(244,63,94,0.15)]',
      bg: 'bg-white/80 hover:bg-rose-50/10',
    },
    amber: {
      border: 'border-l-[4px] border-l-amber-500 hover:border-amber-400',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(245,158,11,0.15)]',
      bg: 'bg-white/80 hover:bg-amber-50/10',
    },
    blue: {
      border: 'border-l-[4px] border-l-blue-500 hover:border-blue-400',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(59,130,246,0.15)]',
      bg: 'bg-white/80 hover:bg-blue-50/10',
    },
    violet: {
      border: 'border-l-[4px] border-l-violet-500 hover:border-violet-400',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(139,92,246,0.15)]',
      bg: 'bg-white/80 hover:bg-violet-50/10',
    },
    slate: {
      border: 'border-l-[4px] border-l-slate-400 hover:border-slate-350',
      shadow: 'hover:shadow-[0_12px_30px_-5px_rgba(100,116,139,0.1)]',
      bg: 'bg-white/80 hover:bg-slate-50/20',
    },
  }[accentColor];

  return (
    <Card
      onClick={onClick}
      className={cn(
        'p-0 gap-0 cursor-default select-none border-slate-200 text-left transition-all duration-300 ease-out py-3.5 shadow-xs relative overflow-hidden backdrop-blur-md group',
        themeClasses.bg,
        themeClasses.border,
        themeClasses.shadow,
        onClick && 'cursor-pointer hover:border-y-slate-300 hover:border-r-slate-300 hover:-translate-y-1',
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-0 px-4.5 pb-0.5 space-y-0 w-full min-h-0 relative z-10">
        <CardTitle className="text-[13px] font-extrabold text-slate-500 leading-none tracking-wide">
          {title}
        </CardTitle>
        <CardAction className="relative col-auto row-auto self-auto justify-self-auto m-0 shrink-0">
          {icon}
        </CardAction>
      </CardHeader>
      <CardContent className="p-0 px-4.5 w-full mt-2 flex-1 flex flex-col justify-between relative z-10">
        <h3 className={`text-[21px] font-black font-sans leading-none tracking-tight ${valueClassName}`}>
          {value}
        </h3>
        <div className={`text-[11px] mt-2.5 pt-1.5 border-t border-slate-100 font-semibold ${captionClassName}`}>
          {caption}
        </div>
      </CardContent>
      {/* Decorative illustration */}
      {illustration && (
        <div className="absolute -bottom-1 -right-1 pointer-events-none opacity-[0.22] group-hover:opacity-[0.38] transition-all duration-300 z-0 transform translate-y-1 translate-x-1 group-hover:scale-110">
          {illustration}
        </div>
      )}
    </Card>
  );
}

// ─── Main Route Component ──────────────────────────────────────────────────────

export default function TodayRoute() {
  const navigate = useNavigate();
  const { activeStoreId, tasks: appShellTasks } = useAppShellState();
  const currentUser = useAppStore((state) => state.currentUser);
  const isOwner = useMemo(() => isOwnerUser(currentUser), [currentUser]);

  // Load real data from Firestore / Reports
  const dashboard = useTodayDashboard(activeStoreId);

  // Targets from Plans
  const planTargets = usePlanTargets(
    activeStoreId,
    dashboard.stats.checklistCompletion,
    dashboard.stats.delayedTasksCount,
    dashboard.stats.sopErrorsCount,
    appShellTasks.length,
  );

  // Performer filter for Timeline
  const [selectedPerformer, setSelectedPerformer] = useState<string>('all');

  const { data: staffList = [] } = useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: () => staffService.getAll(),
  });

  const performerOptions = useMemo(() => {
    const activeStaff = staffList.filter((s) => s.status === 'active');
    return [
      { label: 'Tất cả nhân sự', value: 'all' },
      ...activeStaff.map((s) => ({ label: s.fullName, value: s.id })),
    ];
  }, [staffList]);

  // Non-owner staff can ONLY see their own timeline!
  const effectivePerformer = useMemo(() => {
    if (isOwner) {
      return selectedPerformer;
    }
    const currentStaff = staffList.find(
      (s) =>
        s.id === currentUser?.id ||
        s.username === currentUser?.username ||
        (currentUser?.fullName && s.fullName === currentUser.fullName),
    );
    return currentStaff?.id || currentUser?.id || currentUser?.fullName || currentUser?.username || 'all';
  }, [isOwner, selectedPerformer, staffList, currentUser]);

  // Timeline with direct checklist subscription
  const timelineQuery = useTodayTimelineQuery(activeStoreId, effectivePerformer);

  // local states & formatting helpers
  const [currentDateString] = useState(() =>
    new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).format(new Date()),
  );

  const completedChecklistsCount = useMemo(() => {
    return dashboard.todayChecklistItems.filter((item) => item.isCompleted).length;
  }, [dashboard.todayChecklistItems]);

  const totalChecklistsCount = dashboard.todayChecklistItems.length;

  const checklistPercent = totalChecklistsCount > 0
    ? Math.round((completedChecklistsCount / totalChecklistsCount) * 100)
    : dashboard.stats.checklistCompletion;

  const checklistRatio = totalChecklistsCount > 0
    ? `${completedChecklistsCount}/${totalChecklistsCount}`
    : `${checklistPercent}/100`;

  const timelineRows = useMemo(
    () => (timelineQuery.data ?? []).map((event) => ({
      event,
      visual: getTimelineVisual(event.status),
    })),
    [timelineQuery.data],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace('₫', 'đ');

  const storeStatus = dashboard.stats.status || 'green';

  const statusMeta = useMemo(() => {
    switch (storeStatus) {
      case 'red':
        return {
          bgColor: 'bg-rose-50/50 border border-rose-200/80 shadow-[0_2px_12px_rgba(244,63,94,0.04)]',
          textColor: 'text-rose-600',
          titleColor: 'text-rose-800',
          descColor: 'text-rose-600',
          indicatorColor: 'bg-rose-500',
          title: 'VẬN HÀNH RỦI RO / CÓ SỰ CỐ',
          desc: 'Phát hiện sự cố nghiêm trọng hoặc tỷ lệ hoàn thành checklist thấp.',
          iconBg: 'bg-rose-100/80 border border-rose-200/50 text-rose-600',
          icon: <AlertOctagon className="w-4.5 h-4.5 animate-pulse" />,
        };
      case 'yellow':
        return {
          bgColor: 'bg-amber-50/50 border border-amber-200/80 shadow-[0_2px_12px_rgba(245,158,11,0.04)]',
          textColor: 'text-amber-600',
          titleColor: 'text-amber-800',
          descColor: 'text-amber-600',
          indicatorColor: 'bg-amber-500',
          title: 'CẦN CHÚ Ý VẬN HÀNH',
          desc: 'Có công việc trễ hạn hoặc lỗi SOP nhẹ chưa được xử lý.',
          iconBg: 'bg-amber-100/80 border border-amber-200/50 text-amber-600',
          icon: <AlertTriangle className="w-4.5 h-4.5" />,
        };
      case 'green':
      default:
        return {
          bgColor: 'bg-emerald-50/50 border border-emerald-200/80 shadow-[0_2px_12px_rgba(16,185,129,0.04)]',
          textColor: 'text-emerald-600',
          titleColor: 'text-emerald-800',
          descColor: 'text-emerald-600',
          indicatorColor: 'bg-emerald-500',
          title: 'VẬN HÀNH TIÊU CHUẨN',
          desc: 'Mọi hoạt động và checklist đang được duy trì ổn định.',
          iconBg: 'bg-emerald-100/80 border border-emerald-200/50 text-emerald-600',
          icon: <Check className="w-4.5 h-4.5 stroke-[3px]" />,
        };
    }
  }, [storeStatus]);

  const handleSetTab = (tab: TabType) => {
    void navigate({ to: TAB_ROUTE_MAP[tab] });
  };

  return (
    <div className="space-y-3 text-left">
      {/* TRẠNG THÁI CỬA HÀNG */}
      <div className="bg-white/80 backdrop-blur-md p-4.5 rounded-2xl border border-slate-200/60 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-black text-slate-800 tracking-wider">TRẠNG THÁI CỬA HÀNG</span>
          <span className="text-[10.5px] text-slate-500 font-bold flex items-center gap-1.5 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            Đang đồng bộ
          </span>
        </div>

        <div className={`p-4 ${statusMeta.bgColor} rounded-xl flex items-center justify-between gap-3 transition-all duration-500`}>
          <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-xl ${statusMeta.iconBg} flex items-center justify-center shrink-0 shadow-inner`}>
              {dashboard.isLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                React.cloneElement(statusMeta.icon as any, { className: 'w-5 h-5' })
              )}
            </div>
            <div>
              <h3 className={`font-black text-[14px] tracking-wide ${statusMeta.titleColor}`}>
                {dashboard.isLoading ? 'Đang tải trạng thái vận hành...' : statusMeta.title}
              </h3>
              <p className={`text-[11.5px] ${statusMeta.descColor} mt-1 font-bold opacity-95 leading-normal`}>
                {dashboard.errorMessage || (dashboard.isLoading ? `Đang tính toán dữ liệu cho ${currentDateString}` : statusMeta.desc)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <MetricCard
          title="Doanh thu hôm nay"
          accentColor="green"
          icon={(
            <span className="p-1.5 rounded-md bg-[#16C784]/10 text-[#16C784]" title="Doanh số phát sinh">
              <TrendingUp className="w-5 h-5" />
            </span>
          )}
          value={dashboard.isLoading ? <LoadingValue /> : formatCurrency(dashboard.stats.todayRevenue)}
          caption={
            dashboard.stats.todayRevenue > 0
              ? (dashboard.isFromReport ? 'Từ báo cáo cuối ngày' : 'Dữ liệu trực tiếp')
              : 'Chưa có dữ liệu doanh thu'
          }
          captionClassName={`font-extrabold flex items-center gap-0.5 ${
            dashboard.stats.todayRevenue > 0 ? 'text-[#16C784]' : 'text-slate-400'
          }`}
          illustration={
            <svg className="w-20 h-16 text-emerald-500" viewBox="0 0 100 50" fill="none">
              <path d="M0,45 C20,40 40,20 60,25 C80,10 90,5 100,2" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M0,45 C20,40 40,20 60,25 C80,10 90,5 100,2 L100,50 L0,50 Z" fill="currentColor" opacity="0.15" />
            </svg>
          }
        />

        <MetricCard
          title="Checklist hoàn thành"
          accentColor={checklistPercent >= 90 ? 'green' : 'red'}
          icon={(
            <span className={`p-1.5 rounded-md ${checklistPercent >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <CheckCircle2 className="w-5 h-5" />
            </span>
          )}
          value={`${checklistPercent}%`}
          caption={`Chỉ số ${checklistRatio} việc`}
          valueClassName="text-slate-850"
          captionClassName="font-bold text-slate-400"
          onClick={() => handleSetTab('Checklist')}
          illustration={
            checklistPercent >= 90 ? (
              <svg className="w-16 h-16 text-emerald-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                <circle cx="50" cy="50" r="40" strokeWidth="7" strokeDasharray="6 4" />
                <circle cx="50" cy="50" r="30" strokeWidth="3" />
                <path d="M38,50 L46,58 L62,42" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-16 h-16 text-rose-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
                <circle cx="50" cy="50" r="40" strokeWidth="7" strokeDasharray="6 4" />
                <circle cx="50" cy="50" r="30" strokeWidth="3" />
                <path d="M38,38 L62,62 M62,38 L38,62" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )
          }
        />

        <MetricCard
          title="Việc trễ"
          accentColor="rose"
          icon={(
            <span className="p-1.5 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </span>
          )}
          value={dashboard.isLoading ? <LoadingValue className="bg-rose-100" /> : dashboard.stats.delayedTasksCount}
          caption="việc khẩn cấp"
          valueClassName="text-rose-600"
          captionClassName="font-extrabold text-rose-600 uppercase tracking-wider"
          onClick={() => handleSetTab('Tasks')}
          illustration={
            <svg className="w-16 h-16 text-rose-500 animate-pulse" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M25,85 L25,15 L75,35 L25,55" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="65" cy="65" r="20" strokeWidth="5" fill="white" />
              <path d="M65,55 L65,65 L72,69" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
          }
        />

        <MetricCard
          title="Lỗi SOP"
          accentColor="amber"
          icon={(
            <span className="p-1.5 rounded-md bg-[#FFB800]/10 text-[#FFB800]">
              <AlertOctagon className="w-5 h-5" />
            </span>
          )}
          value={dashboard.isLoading ? <LoadingValue className="bg-amber-100" /> : dashboard.stats.sopErrorsCount}
          caption="lỗi phát sinh"
          valueClassName="text-[#FFB800]"
          captionClassName="font-extrabold text-[#FFB800] uppercase tracking-wider"
          onClick={() => handleSetTab('SOP')}
          illustration={
            <svg className="w-16 h-16 text-amber-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <circle cx="38" cy="38" r="16" strokeWidth="5" />
              <path d="M38,15 L38,22 M38,54 L38,61 M15,38 L22,38 M54,38 L61,38" strokeWidth="5" />
              <circle cx="65" cy="65" r="12" strokeWidth="5" />
              <path d="M65,48 L65,53 M65,77 L65,82 M48,65 L53,65 M77,65 L82,65" strokeWidth="4" />
            </svg>
          }
        />

        <MetricCard
          title="Khiếu nại"
          accentColor="violet"
          icon={(
            <span className="p-1.5 rounded-md bg-violet-50 text-violet-600">
              <Zap className="w-5 h-5" />
            </span>
          )}
          value={dashboard.isLoading ? <LoadingValue /> : dashboard.stats.customerComplaintsCount}
          caption="mới nhận"
          captionClassName="font-bold text-violet-600 border-violet-100"
          onClick={() => handleSetTab('SOP')}
          illustration={
            <svg className="w-16 h-16 text-violet-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <path d="M15,25 L35,25 L45,35 L85,35 L85,75 L15,75 Z" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M53,43 L43,55 L51,55 L47,67 L57,55 L49,55 Z" fill="currentColor" stroke="none" />
            </svg>
          }
        />

        <MetricCard
          title="Nhân sự vắng / vấn đề"
          accentColor="slate"
          icon={(
            <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
              <Users className="w-5 h-5" />
            </span>
          )}
          value="—"
          caption={
            <div className="flex flex-col text-slate-350">
              <span>Tính năng chưa kích hoạt</span>
              <span className="font-extrabold">Đang phát triển</span>
            </div>
          }
          valueClassName="text-slate-350"
          captionClassName="border-slate-100 mt-1 pt-1"
          illustration={
            <svg className="w-16 h-16 text-blue-500" viewBox="0 0 100 100" fill="none" stroke="currentColor">
              <circle cx="50" cy="35" r="14" strokeWidth="6" />
              <path d="M20,75 C20,55 35,55 50,55 C65,55 80,55 80,75" strokeWidth="6" strokeLinecap="round" />
              <circle cx="20" cy="30" r="10" strokeWidth="4" />
              <circle cx="80" cy="30" r="10" strokeWidth="4" />
            </svg>
          }
        />
      </div>

      {/* TIMELINE & SYSTEM GOALS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* TIMELINE SECTION */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4 gap-2 flex-wrap sm:flex-nowrap">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 shrink-0">
              <span className="w-1.5 h-3.5 bg-[#C21A1A] rounded-sm inline-block" />
              TIMELINE HÔM NAY
            </h3>
            <div className="flex items-center gap-2.5 shrink-0 min-w-0">
              {isOwner ? (
                <div className="w-40">
                  <CustomSelect
                    value={selectedPerformer}
                    onChangeValue={(val) => setSelectedPerformer(String(val))}
                    options={performerOptions}
                    clearable={false}
                    placeholder="Chọn nhân sự..."
                    className="h-8 text-xs font-bold rounded-xl border border-slate-200 hover:border-slate-300 bg-white"
                  />
                </div>
              ) : (
                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  {currentUser?.fullName || 'Cá nhân'}
                </span>
              )}
              <button
                type="button"
                onClick={() => handleSetTab('Checklist')}
                className="text-xs font-black text-slate-400 hover:text-[#C21A1A] transition-colors whitespace-nowrap"
              >
                Xem tất cả &gt;
              </button>
            </div>
          </div>

          {timelineQuery.error && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
              Không thể tải timeline hôm nay.
            </div>
          )}

          <div className="space-y-3">
            {timelineQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-150 flex items-center gap-3.5"
                >
                  <span className="h-4 w-10 animate-pulse rounded bg-slate-200" />
                  <span className="h-7 w-7 animate-pulse rounded-lg bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <span className="block h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                    <span className="block h-2.5 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))
            ) : timelineRows.length > 0 ? (
              timelineRows.map(({ event, visual }) => (
                <div
                  key={`${event.storeId}-${event.time}-${event.title}`}
                  className="w-full p-3.5 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between gap-4 text-left"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <span className="font-sans text-xs font-black text-slate-500 shrink-0 w-10">
                      {event.time}
                    </span>
                    <span className={`p-1.5 rounded-lg border shrink-0 ${visual.iconClassName}`}>
                      {visual.icon === 'check' ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-slate-800 text-xs truncate">{event.title}</h4>
                      <p className={`text-[10px] font-semibold mt-0.5 ${visual.descriptionClassName}`}>
                        {event.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
                <p className="text-xs font-bold text-slate-500">Chưa có sự kiện timeline hôm nay.</p>
                <p className="mt-1 text-[10px] font-medium text-slate-400">
                  Dữ liệu sẽ hiển thị khi API `/today/timeline` có bản ghi cho cửa hàng hiện tại.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SYSTEM GOALS SECTION */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#C21A1A] rounded-sm inline-block" />
              MỤC TIÊU HỆ THỐNG
            </h3>
            <button
              type="button"
              onClick={() => handleSetTab('KPI')}
              className="text-xs font-black text-slate-400 hover:text-[#C21A1A] transition-colors"
            >
              Xem chi tiết &gt;
            </button>
          </div>

          {planTargets.isLoading ? (
            <div className="space-y-4 pt-1">
              <span className="block h-4 w-full animate-pulse rounded bg-slate-100" />
              <span className="block h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
              <span className="block h-4 w-full animate-pulse rounded bg-slate-100 mt-4" />
              <span className="block h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
            </div>
          ) : planTargets.hasPlan ? (
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Doanh thu {planTargets.monthLabel}</span>
                  <span className="font-sans text-[11px] text-slate-500">
                    <span className="font-bold text-[#16C784]">
                      {planTargets.monthlyRevenueCurrent >= 1_000_000
                        ? `${(planTargets.monthlyRevenueCurrent / 1_000_000).toFixed(1)}M`
                        : planTargets.monthlyRevenueCurrent.toLocaleString('vi-VN')}
                    </span>{' / '}
                    {planTargets.monthlyRevenueTarget >= 1_000_000
                      ? `${(planTargets.monthlyRevenueTarget / 1_000_000).toFixed(0)}M`
                      : planTargets.monthlyRevenueTarget.toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#16C784] h-full rounded-full transition-all duration-500" style={{ width: `${planTargets.monthlyRevenuePercent}%` }} />
                </div>
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                  <span>Đạt ngân khoản:</span>
                  <span className="font-black text-[#16C784]">{planTargets.monthlyRevenuePercent}%</span>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700">Điểm vận hành trung bình</span>
                  <span className="font-sans text-[11px] text-slate-500">
                    <span className="font-bold text-[#FFB800]">{planTargets.operatingScore}</span> / 100
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-[#FFB800] h-full rounded-full transition-all duration-500" style={{ width: `${planTargets.operatingScore}%` }} />
                </div>
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                  <span>Chỉ số SOP trung bình:</span>
                  <span className="font-black text-[#FFB800]">{planTargets.operatingScore}%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center mt-2">
              <p className="text-xs font-bold text-slate-500">Chưa có kế hoạch tháng này.</p>
              <p className="mt-1 text-[10px] font-medium text-slate-400">
                Tạo kế hoạch tháng trong tab Kế hoạch để hiển thị mục tiêu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER GENERAL RULES */}
      <div className="border-t border-slate-250/70 pt-4 mt-3">
        <div className="mb-3 text-left">
          <h2 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C21A1A]" />
            Hồ sơ Vận hành chi nhánh &amp; Quy định SOP
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Hệ thống đồng bộ dữ liệu thời gian thực cho chuỗi cơ sở MR. TÁO CONTROL OS.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left">
            <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 mb-2 border-b border-light-100 pb-2">
              CHU TRÌNH BIỂU PHÁT CA HẰNG NGÀY
            </h4>
            <div className="space-y-3 pt-1 text-xs">
              <div className="flex gap-2.5">
                <span className="font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Cơ sở 1</span>
                <p className="text-slate-600 font-medium"><b>07:30</b> - Mở cửa, kiểm đếm tồn và hạch toán số dư két sắt.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">Cơ sở 2</span>
                <p className="text-slate-600 font-medium"><b>12:00</b> - Bàn giao đổi ca nhân sự bán hàng và chuyển ngân quỹ.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Cơ sở 3</span>
                <p className="text-slate-600 font-medium"><b>21:30</b> - Chốt ca bán hàng, kết xuất báo cáo doanh thu G-Sheet.</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left">
            <h4 className="font-black text-[11px] uppercase tracking-wider text-rose-800 mb-2 border-b border-light-100 pb-2">
              NGUYÊN TẮC VẬN HÀNH 5 KHÔNG
            </h4>
            <ul className="space-y-2 pt-1 text-xs text-slate-600 font-medium list-disc list-inside">
              <li>Không trễ hạn xử lý khiếu nại CSAT quá 15 phút.</li>
              <li>Không sai sót tiền mặt hạch toán bàn giao két.</li>
              <li>Không mở cửa showroom trễ giờ quy chuẩn (07:30).</li>
              <li>Không bỏ qua bước chụp ảnh minh chứng checklist.</li>
              <li>Không vắng mặt nhân viên bàn giao chốt quầy.</li>
            </ul>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left">
            <h4 className="font-black text-[11px] uppercase tracking-wider text-slate-800 mb-2 border-b border-light-100 pb-2">
              KẾT NỐI DATA GOOGLE SHEETS
            </h4>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
              <span className="text-[10px] font-black text-[#C21A1A] uppercase tracking-wider block">ID Bảng tính liên kết</span>
              <p className="text-[10.5px] font-sans text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                1mr-tao-control-os-2026-production-sheet-v1
              </p>
              <p className="text-[9.5px] text-slate-400 font-medium pt-1">
                Trạng thái: Hoạt động đồng bộ 2 chiều tức thời
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
