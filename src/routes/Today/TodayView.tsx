import React, { useState } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  XOctagon, 
  Calendar, 
  Clock, 
  Users, 
  Check, 
  Bookmark, 
  FileSpreadsheet, 
  UsersRound, 
  Zap, 
  ChevronRight 
} from 'lucide-react';
import { 
  KPIStats, 
  TimelineEvent 
} from '../../types/today.types';
import { ScrollArea } from '../../shared/components/scroll-area';

interface TodayViewProps {
  stats: KPIStats;
  onSetTab: (tab: any) => void;
  completedChecklistsCount: number;
  totalChecklistsCount: number;
}

export default function TodayView({ 
  stats, 
  onSetTab,
  completedChecklistsCount,
  totalChecklistsCount 
}: TodayViewProps) {
  const [currentDateString] = useState(() => {
    const d = new Date('2026-05-27T05:34:34Z');
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[d.getDay()]}, Ngày ${d.getDate()} Tháng ${d.getMonth() + 1} Năm ${d.getFullYear()}`;
  });

  // Calculate dynamic checklist checklist completion
  const checklistPercent = totalChecklistsCount > 0 
    ? Math.round((completedChecklistsCount / totalChecklistsCount) * 100) 
    : stats.checklistCompletion;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
      .format(amount)
      .replace('₫', 'đ');
  };

  return (
    <div className="space-y-3 text-left">

      {/* 2. TRẠNG THÁI CỬA HÀNG (LABEL 1 IN SCREENSHOT) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#C21A1A]">TRẠNG THÁI CỬA HÀNG</span>
          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-[#C21A1A] rounded-full animate-ping"></span>
            Đang đồng bộ
          </span>
        </div>

        {/* Highlight Main Status Card - Loading state */}
        <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
            <div>
              <h3 className="font-bold text-xs text-slate-700">
                Đang tải trạng thái vận hành...
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                Hệ thống đang kết xuất dữ liệu thời gian thực từ Google Sheets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. KPI NHANH GRID (LABEL 2 IN SCREENSHOT) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">

        {/* Doanh thu hôm nay */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Doanh thu hôm nay</span>
            <span className="p-1 rounded-md bg-[#16C784]/10 text-[#16C784]" title="Doanh số phát sinh">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-[16px] font-bold text-slate-800 font-sans leading-none">
              28,450,000đ
            </h3>
            <p className="text-[9.5px] font-extrabold text-[#16C784] mt-1 pt-1 border-t border-slate-100 flex items-center gap-0.5">
              vs hôm qua <span className="font-sans">↑ 18.6%</span>
            </p>
          </div>
        </div>

        {/* Checklist hoàn hoàn */}
        <div onClick={() => onSetTab('Checklist')} className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-350 cursor-pointer transition-colors text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Checklist hoàn thành</span>
            <span className="p-1 rounded-md bg-slate-55 bg-slate-100 text-[#C21A1A]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-[16px] font-bold text-slate-850 font-sans leading-none">
              {checklistPercent}%
            </h3>
            <p className="text-[9.5px] font-bold text-slate-400 mt-1 pt-1 border-t border-slate-100">
              Chỉ số {completedChecklistsCount || 26}/{totalChecklistsCount || 28} việc
            </p>
          </div>
        </div>

        {/* Việc trễ */}
        <div onClick={() => onSetTab('Tasks')} className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-350 cursor-pointer transition-colors text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Việc trễ</span>
            <span className="p-1 rounded-md bg-rose-50 text-rose-600">
              <AlertTriangle className="w-3.5 h-3.5 animate-pulse" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-[16px] font-bold text-rose-600 font-sans leading-none">
              7
            </h3>
            <p className="text-[9.5px] font-extrabold text-rose-600 mt-1 pt-1 border-t border-slate-100 uppercase tracking-wider">
              việc khẩn cấp
            </p>
          </div>
        </div>

        {/* Lỗi SOP */}
        <div onClick={() => onSetTab('SOP')} className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-350 cursor-pointer transition-colors text-left font-sans">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Lỗi SOP</span>
            <span className="p-1 rounded-md bg-[#FFB800]/10 text-[#FFB800]">
              <AlertOctagon className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-[16px] font-bold text-[#FFB800] font-sans leading-none">
              2
            </h3>
            <p className="text-[9.5px] font-extrabold text-[#FFB800] mt-1 pt-1 border-t border-slate-100 uppercase tracking-wider">
              LỖI phát sinh
            </p>
          </div>
        </div>

        {/* Khiếu nại */}
        <div onClick={() => onSetTab('SOP')} className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-350 cursor-pointer transition-colors text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Khiếu nại</span>
            <span className="p-1 rounded-md bg-slate-100 text-slate-650">
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-[16px] font-bold text-slate-800 font-sans leading-none">
              3
            </h3>
            <p className="text-[9.5px] font-bold text-emerald-600 mt-1 pt-1 border-t border-[#16C784]/20">
              mới nhận
            </p>
          </div>
        </div>

        {/* Nhân sự vắng / vấn đề */}
        <div onClick={() => onSetTab('Today')} className="bg-white p-4.5 rounded-2xl border border-slate-200 hover:border-slate-350 cursor-pointer transition-colors text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Nhân sự vắng / vấn đề</span>
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <Users className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="mt-3">
            <h3 className="text-[16px] font-bold text-blue-600 font-sans leading-none">
              4
            </h3>
            <p className="text-[9.5px] font-extrabold text-blue-500 mt-1 pt-1 border-t border-blue-100">
              người can thiệp
            </p>
          </div>
        </div>
      </div>

      {/* 4. TIMELINE HÔM NAY (LABEL 3) & MỤC TIÊU HỆ THỐNG (LABEL 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* Left Section (Spans 7): Timeline Hôm nay */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#C21A1A] rounded-sm inline-block"></span>
              TIMELINE HÔM NAY
            </h3>
            <button 
              onClick={() => onSetTab('Checklist')}
              className="text-xs font-black text-slate-400 hover:text-[#C21A1A] transition-colors"
            >
              Xem tất cả &gt;
            </button>
          </div>

          {/* Timeline listing matching structure exactly */}
          <div className="space-y-3">
            {/* Row 1 */}
            <div 
              onClick={() => onSetTab('Tasks')}
              className="p-3.5 bg-slate-50 hover:bg-slate-100/55 rounded-xl border border-slate-150 flex items-center justify-between gap-4 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="font-sans text-xs font-black text-slate-500 shrink-0 w-10">
                  09:15
                </span>
                <span className="p-1.5 rounded-lg bg-rose-50 border border-rose-150 text-rose-600 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate">2 việc trễ hạn quá 24h</h4>
                  <p className="text-[10px] text-rose-600 font-semibold mt-0.5">Cần xử lý ngay</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350" />
            </div>

            {/* Row 2 */}
            <div 
              onClick={() => onSetTab('Tasks')}
              className="p-3.5 bg-slate-50 hover:bg-slate-100/55 rounded-xl border border-slate-150 flex items-center justify-between gap-4 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="font-sans text-xs font-black text-slate-500 shrink-0 w-10">
                  08:40
                </span>
                <span className="p-1.5 rounded-lg bg-amber-50 border border-amber-150 text-[#FFB800] shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate">Kho A sắp hết 3 mặt hàng</h4>
                  <p className="text-[10px] text-[#FFB800] font-semibold mt-0.5">Cần đặt hàng bổ sung</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350" />
            </div>

            {/* Row 3 */}
            <div 
              onClick={() => onSetTab('Checklist')}
              className="p-3.5 bg-slate-50 hover:bg-slate-100/55 rounded-xl border border-slate-150 flex items-center justify-between gap-4 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <span className="font-sans text-xs font-black text-slate-500 shrink-0 w-10">
                  07:30
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-150 text-[#16C784] shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-extrabold text-slate-800 text-xs truncate">1 lỗi SOP – Quy trình mở cửa</h4>
                  <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Đã xác nhận đã khắc phục</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-350" />
            </div>
          </div>
        </div>

        {/* Right Section (Spans 5): Mục tiêu hệ thống (Label 4) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs text-left">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <span className="w-1.5 h-3.5 bg-[#C21A1A] rounded-sm inline-block"></span>
              MỤC TIÊU HỆ THỐNG
            </h3>
            <button 
              onClick={() => onSetTab('KPI')}
              className="text-xs font-black text-slate-400 hover:text-[#C21A1A] transition-colors"
            >
              Xem chi tiết &gt;
            </button>
          </div>

          <div className="space-y-4 pt-1">
            {/* Metric 1: Doanh thu tháng 5 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Doanh thu tháng 5</span>
                <span className="font-sans text-[11px] text-slate-500">
                  <span className="font-bold text-[#16C784]">235.6M</span> / 300M
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-[#16C784] h-full rounded-full transition-all duration-500" 
                  style={{ width: '78%' }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                <span>Đạt ngân khoán:</span>
                <span className="font-black text-[#16C784]">78%</span>
              </div>
            </div>

            {/* Metric 2: Điểm vận hành trung bình */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Điểm vận hành trung bình</span>
                <span className="font-sans text-[11px] text-slate-500">
                  <span className="font-bold text-[#FFB800]">86</span> / 100
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className="bg-[#FFB800] h-full rounded-full transition-all duration-500" 
                  style={{ width: '86%' }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-semibold text-slate-400">
                <span>Chỉ số SOP trung bình:</span>
                <span className="font-black text-[#FFB800]">86%</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 5. METADATA SHOWROOM REFERENCE SYSTEMS (DESKTOP DETAIL BLOCK) */}
      <div className="border-t border-slate-250/70 pt-4 mt-3">
        <div className="mb-3 text-left">
          <h2 className="text-[16px] font-bold text-slate-800 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C21A1A]"></span>
            Hồ sơ Vận hành chi nhánh &amp; Quy định SOP
          </h2>
          <p className="text-xs text-slate-500 mt-1">Hệ thống đồng bộ dữ liệu thời gian thực cho chuỗi cơ sở MR. TÁO CONTROL OS.</p>
        </div>

        {/* Outer Grid for instructions blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Box 1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left">
            <h4 className="font-black text-[11px] text-slate-850 uppercase tracking-wider text-slate-800 mb-2 border-b border-light-100 pb-2">
              📅 CHU TRÌNH BIỂU PHÁT CA Hằng Ngày
            </h4>
            <div className="space-y-3 pt-1 text-xs">
              <div className="flex gap-2.5">
                <span className="font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded text-[10px]">Cơ sở 1</span>
                <p className="text-slate-600 font-medium"><b>07:30</b> – Mở cửa, kiểm đếm tồn và hạch toán số dư két sắt.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">Cơ sở 2</span>
                <p className="text-slate-600 font-medium"><b>12:00</b> – Bàn giao đổi ca nhân sự bán hàng &amp; chuyển ngân quỹ.</p>
              </div>
              <div className="flex gap-2.5">
                <span className="font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">Cơ sở 3</span>
                <p className="text-slate-600 font-medium"><b>21:30</b> – Chốt ca bán hàng, kết xuất báo cáo doanh thu G-Sheet.</p>
              </div>
            </div>
          </div>

          {/* Box 2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left">
            <h4 className="font-black text-[11px] text-slate-850 uppercase tracking-wider text-rose-750 text-rose-800 mb-2 border-b border-light-100 pb-2">
              🚨 NGUYÊN TẮC VẬN HÀNH 5 KHÔNG
            </h4>
            <ul className="space-y-2 pt-1 text-xs text-slate-600 font-medium list-disc list-inside">
              <li>Không trễ hạn xử lý khiếu nại CSAT quá 15 phút.</li>
              <li>Không sai sót tiền mặt hạch toán bàn giao két.</li>
              <li>Không mở cửa showroom trễ giờ quy chuẩn (07:30).</li>
              <li>Không bỏ qua bước chụp ảnh minh chứng checklist.</li>
              <li>Không vắng mặt nhân viên bàn giao chốt quầy.</li>
            </ul>
          </div>

          {/* Box 3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 text-left">
            <h4 className="font-black text-[11px] text-slate-850 uppercase tracking-wider text-slate-800 mb-2 border-b border-light-100 pb-2">
              📊 KẾT NỐI DATA GOOGLE SHEETS
            </h4>
            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-1">
              <span className="text-[10px] font-black text-[#C21A1A] uppercase tracking-wider block">ID Bảng tính liên kết</span>
              <p className="text-[10.5px] font-sans text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">
                1mr-tao-control-os-2026-production-sheet-v1
              </p>
              <p className="text-[9.5px] text-slate-400 font-medium pt-1">Trạng thái: Hoạt động đồng bộ 2 chiều tức thời</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
