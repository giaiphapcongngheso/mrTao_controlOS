import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type { TabType } from '../../types/app.types';
import type { KPIStats, TimelineEvent } from '../../types/today.types';
import type { PlanTargets } from './_hook/use-plan-targets';

type TimelineVisual = {
  icon: 'check' | 'alert';
  iconClassName: string;
  descriptionClassName: string;
};

interface TodayViewProps {
  stats: KPIStats;
  timelineEvents: TimelineEvent[];
  isStatsLoading?: boolean;
  isTimelineLoading?: boolean;
  statsErrorMessage?: string | null;
  timelineErrorMessage?: string | null;
  onSetTab: (tab: TabType) => void;
  completedChecklistsCount: number;
  totalChecklistsCount: number;
  planTargets?: PlanTargets;
  isFromReport?: boolean;
}

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  caption: React.ReactNode;
  valueClassName?: string;
  captionClassName?: string;
  onClick?: () => void;
}

function inferTimelineRoute(event: TimelineEvent): TabType | null {
  const text = `${event.title} ${event.description}`.toLowerCase();

  if (text.includes('task') || text.includes('viec') || text.includes('việc') || text.includes('trễ') || text.includes('tre')) {
    return 'Tasks';
  }

  if (text.includes('sop')) {
    return 'SOP';
  }

  if (text.includes('checklist')) {
    return 'Checklist';
  }

  if (text.includes('kho') || text.includes('warehouse')) {
    return 'Warehouse';
  }

  return null;
}

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
}: MetricCardProps) {
  const className = [
    'bg-white p-4.5 rounded-2xl border border-slate-200 text-left transition-colors',
    onClick ? 'hover:border-slate-350 cursor-pointer' : '',
  ].join(' ');

  return (
    <div onClick={onClick} className={className}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-400">{title}</span>
        {icon}
      </div>
      <div className="mt-3">
        <h3 className={`text-[16px] font-bold font-sans leading-none ${valueClassName}`}>
          {value}
        </h3>
        <p className={`text-[9.5px] mt-1 pt-1 border-t border-slate-100 ${captionClassName}`}>
          {caption}
        </p>
      </div>
    </div>
  );
}

export default function TodayView({
  stats,
  timelineEvents,
  isStatsLoading = false,
  isTimelineLoading = false,
  statsErrorMessage,
  timelineErrorMessage,
  onSetTab,
  completedChecklistsCount,
  totalChecklistsCount,
  planTargets,
  isFromReport = false,
}: TodayViewProps) {
  const [currentDateString] = useState(() =>
    new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).format(new Date()),
  );

  const checklistPercent = totalChecklistsCount > 0
    ? Math.round((completedChecklistsCount / totalChecklistsCount) * 100)
    : stats.checklistCompletion;

  const checklistRatio = totalChecklistsCount > 0
    ? `${completedChecklistsCount}/${totalChecklistsCount}`
    : `${checklistPercent}/100`;

  const timelineRows = useMemo(
    () => timelineEvents.map((event) => ({
      event,
      route: inferTimelineRoute(event),
      visual: getTimelineVisual(event.status),
    })),
    [timelineEvents],
  );

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace('₫', 'đ');

  return (
    <div className="space-y-3 text-left">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#C21A1A]">TRẠNG THÁI CỬA HÀNG</span>
          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#C21A1A] rounded-full animate-ping" />
            Đang đồng bộ
          </span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-700">
                {isStatsLoading ? 'Đang tải trạng thái vận hành...' : 'Dữ liệu vận hành hôm nay đã sẵn sàng'}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                {statsErrorMessage || `Cập nhật theo dữ liệu thật cho ${currentDateString}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <MetricCard
          title="Doanh thu hôm nay"
          icon={(
            <span className="p-1 rounded-md bg-[#16C784]/10 text-[#16C784]" title="Doanh số phát sinh">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          )}
          value={isStatsLoading ? <LoadingValue /> : formatCurrency(stats.todayRevenue)}
          caption={
            stats.todayRevenue > 0
              ? (isFromReport ? 'Từ báo cáo cuối ngày' : 'Dữ liệu trực tiếp')
              : 'Chưa có dữ liệu doanh thu'
          }
          captionClassName={`font-extrabold flex items-center gap-0.5 ${
            stats.todayRevenue > 0 ? 'text-[#16C784]' : 'text-slate-400'
          }`}
        />

        <MetricCard
          title="Checklist hoàn thành"
          icon={(
            <span className="p-1 rounded-md bg-slate-100 text-[#C21A1A]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          )}
          value={`${checklistPercent}%`}
          caption={`Chỉ số ${checklistRatio} việc`}
          valueClassName="text-slate-850"
          captionClassName="font-bold text-slate-400"
          onClick={() => onSetTab('Checklist')}
        />

        <MetricCard
          title="Việc trễ"
          icon={(
            <span className="p-1 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            </span>
          )}
          value={isStatsLoading ? <LoadingValue className="bg-rose-100" /> : stats.delayedTasksCount}
          caption="việc khẩn cấp"
          valueClassName="text-rose-600"
          captionClassName="font-extrabold text-rose-600 uppercase tracking-wider"
          onClick={() => onSetTab('Tasks')}
        />

        <MetricCard
          title="Lỗi SOP"
          icon={(
            <span className="p-1 rounded-md bg-[#FFB800]/10 text-[#FFB800]">
              <AlertOctagon className="w-3.5 h-3.5" />
            </span>
          )}
          value={isStatsLoading ? <LoadingValue className="bg-amber-100" /> : stats.sopErrorsCount}
          caption="lỗi phát sinh"
          valueClassName="text-[#FFB800]"
          captionClassName="font-extrabold text-[#FFB800] uppercase tracking-wider"
          onClick={() => onSetTab('SOP')}
        />

        <MetricCard
          title="Khiếu nại"
          icon={(
            <span className="p-1 rounded-md bg-slate-100 text-slate-650">
              <Zap className="w-3.5 h-3.5" />
            </span>
          )}
          value={isStatsLoading ? <LoadingValue /> : stats.customerComplaintsCount}
          caption="mới nhận"
          captionClassName="font-bold text-emerald-600 border-[#16C784]/20"
          onClick={() => onSetTab('SOP')}
        />

        <MetricCard
          title="Nhân sự vắng / vấn đề"
          icon={(
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Users className="w-3.5 h-3.5" />
            </span>
          )}
          value="—"
          caption="Chưa phát triển"
          valueClassName="text-slate-350"
          captionClassName="font-extrabold text-slate-350 border-slate-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#C21A1A] rounded-sm inline-block" />
              TIMELINE HÔM NAY
            </h3>
            <button
              type="button"
              onClick={() => onSetTab('Checklist')}
              className="text-xs font-black text-slate-400 hover:text-[#C21A1A] transition-colors"
            >
              Xem tất cả &gt;
            </button>
          </div>

          {timelineErrorMessage && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-semibold text-amber-700">
              {timelineErrorMessage}
            </div>
          )}

          <div className="space-y-3">
            {isTimelineLoading ? (
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
              timelineRows.map(({ event, route, visual }) => {
                const content = (
                  <>
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
                    {route && <ChevronRight className="w-4 h-4 text-slate-350" />}
                  </>
                );

                const className = [
                  'w-full p-3.5 bg-slate-50 hover:bg-slate-100/55 rounded-xl border border-slate-150 flex items-center justify-between gap-4 transition-all text-left',
                  route ? 'cursor-pointer' : '',
                ].join(' ');

                return route ? (
                  <button
                    key={`${event.storeId}-${event.time}-${event.title}`}
                    type="button"
                    onClick={() => onSetTab(route)}
                    className={className}
                  >
                    {content}
                  </button>
                ) : (
                  <div key={`${event.storeId}-${event.time}-${event.title}`} className={className}>
                    {content}
                  </div>
                );
              })
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

        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#C21A1A] rounded-sm inline-block" />
              MỤC TIÊU HỆ THỐNG
            </h3>
            <button
              type="button"
              onClick={() => onSetTab('KPI')}
              className="text-xs font-black text-slate-400 hover:text-[#C21A1A] transition-colors"
            >
              Xem chi tiết &gt;
            </button>
          </div>

          {planTargets?.isLoading ? (
            <div className="space-y-4 pt-1">
              <span className="block h-4 w-full animate-pulse rounded bg-slate-100" />
              <span className="block h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
              <span className="block h-4 w-full animate-pulse rounded bg-slate-100 mt-4" />
              <span className="block h-2.5 w-full animate-pulse rounded-full bg-slate-100" />
            </div>
          ) : planTargets && planTargets.hasPlan ? (
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
