import React, { useState } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Award, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronDown, 
  Calendar,
  Users,
  Target,
  Sparkles,
  Zap,
  Check,
  TrendingDown
} from 'lucide-react';
import { StaffRank } from '../../types/kpi.types';

interface KpiViewProps {
  staffRanks: StaffRank[];
  onSetTab: (tab: any) => void;
}

export default function KpiView({
  staffRanks,
  onSetTab
}: KpiViewProps) {
  // Filters state
  const [selectedMonth, setSelectedMonth] = useState('Tháng này (Tháng 5)');
  const [selectedPosition, setSelectedPosition] = useState('Tất cả vị trí');
  const [hoveredWeek, setHoveredWeek] = useState<number | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffRank | null>(staffRanks[0] || null);
  const [rankSearch, setRankSearch] = useState('');

  // Quick interactive states
  const [activeMetricId, setActiveMetricId] = useState<string | null>(null);

  // Constants for standard KPIs
  const cardsData = [
    {
      id: 'revenue',
      title: 'DOANH THU CHI NHÁNH',
      value: '256.000.000đ',
      target: 'Mục tiêu: 250M (102.4%)',
      subtextLeft: '🟢 Đạt tiến độ chuẩn',
      subtextRight: '+18% so với tuần trước',
      type: 'up',
      colorClass: 'text-blue-600',
      bgColor: 'bg-blue-50/60',
      borderColor: 'border-blue-200/60',
      description: 'Chỉ số đo lường doanh thu gộp của chi nhánh tích lũy từ hoạt động bán thiết bị và dịch vụ trong kỳ.'
    },
    {
      id: 'checklist',
      title: 'HIỆU SUẤT CHECKLIST',
      value: '85%',
      target: 'Mục tiêu tối thiểu: 80%',
      subtextLeft: '🟢 Hoàn thành tốt',
      subtextRight: '+6% so với tuần trước',
      type: 'up',
      colorClass: 'text-emerald-600',
      bgColor: 'bg-emerald-50/60',
      borderColor: 'border-emerald-200/60',
      description: 'Đánh giá tỷ lệ thực hiện đúng và đầy đủ các danh mục kiểm tra ở đầu ca, giữa ca và chốt ca.'
    },
    {
      id: 'sop',
      title: 'TỔNG LỖI SOP PHÁT HIỆN',
      value: '3 sự cố',
      target: 'Ngưỡng rủi ro tối đa: 5 sự cố',
      subtextLeft: '⚠️ Trực quan cảnh báo',
      subtextRight: '-23% so với tuần trước',
      type: 'down',
      colorClass: 'text-red-600',
      bgColor: 'bg-red-50/60',
      borderColor: 'border-red-200/60',
      description: 'Số vụ việc vi phạm quy trình phục vụ tiêu chuẩn được giám sát viên hoặc POS ghi nhận.'
    },
    {
      id: 'late',
      title: 'SỐ VIỆC BỊ TRỄ HẠN',
      value: '5 việc',
      target: 'Ngưỡng cho phép: 0 việc',
      subtextLeft: '❌ Cần cải thiện nhanh',
      subtextRight: '-17% so với tuần trước',
      type: 'down',
      colorClass: 'text-amber-600',
      bgColor: 'bg-amber-50/60',
      borderColor: 'border-amber-200/60',
      description: 'Các công việc trong ngày chưa được hoàn thành đúng thời hạn quy định chốt ca.'
    }
  ];

  // Weeks data for the chart "DOANH THU & KPI 4 TUẦN"
  const weeksData = [
    { week: 'Tuần 1', value: 180, label: '180M', target: 200, profit: '36M' },
    { week: 'Tuần 2', value: 205, label: '205M', target: 200, profit: '41M' },
    { week: 'Tuần 3', value: 222, label: '222M', target: 200, profit: '44M' },
    { week: 'Tuần 4', value: 256, label: '256M', target: 200, profit: '51M' }
  ];

  // Filters calculation
  const filteredStaff = staffRanks.filter(rank => {
    const matchesPosition = selectedPosition === 'Tất cả vị trí' || rank.role.toLowerCase() === selectedPosition.toLowerCase();
    const matchesSearch = rank.name.toLowerCase().includes(rankSearch.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  return (
    <div className="space-y-3.5 text-left">
      
      {/* 1. APP BAR / DASHBOARD HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-[#C21A1A] border border-red-100 rounded-lg">
            📊 HỆ THỐNG ĐO LƯỜNG CHỈ SỐ
          </span>
          <h1 className="text-xl font-black font-display tracking-tight text-slate-900 mt-2">
            Màn Hình KPI &amp; Hiệu Suất Vận Hành
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Đánh giá minh bạch dữ liệu doanh số chi nhánh, tiến độ checklist tiêu chuẩn và điểm thi đua nhân sự trực quan.
          </p>
        </div>
        
        {/* Header Controls */}
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => onSetTab('Today')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-extrabold text-[11px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            Về Trang Chủ
          </button>
          
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-[#00B050] border border-emerald-100 rounded-xl text-xs font-extrabold">
            <span className="w-2 h-2 rounded-full bg-[#00B050] animate-pulse"></span>
            Dữ liệu thời gian thực
          </span>
        </div>
      </div>

      {/* 2. TOP FILTER PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Month selective dropdown */}
          <div className="relative min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Kỳ báo cáo</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 font-extrabold text-xs pl-20 pr-8 py-2.5 rounded-xl text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer appearance-none"
            >
              <option value="Tháng này (Tháng 5)">Tháng này (Tháng 5)</option>
              <option value="Tháng trước (Tháng 4)">Tháng trước (Tháng 4)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Position standard filters */}
          <div className="relative min-w-[180px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">Bộ phận</span>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 font-extrabold text-xs pl-16 pr-8 py-2.5 rounded-xl text-slate-700 focus:ring-1 focus:ring-blue-500 focus:outline-hidden cursor-pointer appearance-none"
            >
              <option value="Tất cả vị trí">Tất cả</option>
              <option value="Sales">Bộ phận Sales</option>
              <option value="Kỹ thuật">Kỹ thuật</option>
              <option value="Kho">Bộ phận Kho</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Searching personnel inside the view */}
        <div className="relative md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input 
            type="text" 
            placeholder="Tìm kiếm nhân sự theo tên..." 
            value={rankSearch}
            onChange={(e) => setRankSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 shadow-2xs transition-all"
          />
        </div>

      </div>

      {/* 3. METRIC METERS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cardsData.map((card) => {
          const isSelected = activeMetricId === card.id;
          
          return (
            <div 
              key={card.id}
              onClick={() => setActiveMetricId(isSelected ? null : card.id)}
              className={`bg-white rounded-2xl p-5 border cursor-pointer transition-all duration-300 relative overflow-hidden select-none text-left flex flex-col justify-between h-[160px] ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md' 
                  : 'hover:shadow-xs border-slate-200 hover:border-slate-350'
              }`}
            >
              {/* Card Upper Zone */}
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    {card.title}
                  </span>
                  <h3 className="text-2xl font-black font-sans tracking-tight text-slate-900 mt-1">
                    {card.value}
                  </h3>
                </div>
                
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${card.bgColor}`}>
                  {card.id === 'revenue' && <TrendingUp className={`w-5 h-5 ${card.colorClass}`} />}
                  {card.id === 'checklist' && <CheckCircle2 className={`w-5 h-5 ${card.colorClass}`} />}
                  {card.id === 'sop' && <AlertTriangle className={`w-5 h-5 ${card.colorClass}`} />}
                  {card.id === 'late' && <Clock className={`w-5 h-5 ${card.colorClass}`} />}
                </div>
              </div>

              {/* Card Middle Zone progress goal tracking info */}
              <p className="text-[11px] font-bold text-slate-400 mt-2">
                {card.target}
              </p>

              {/* Card Footer Subtexts */}
              <div className="border-t border-slate-100 pt-3 mt-3 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-500 truncate max-w-[130px]">{card.subtextLeft}</span>
                <span className={`inline-flex items-center gap-0.5 ${
                  card.type === 'up' ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {card.type === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" /> : <ArrowDownRight className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />}
                  {card.subtextRight}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* METRIC DETAILS TOOLTIP (SHOWS WHEN CLICKED ANY KPI CARD) */}
      {activeMetricId && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-left animate-in slide-in-from-top duration-300">
          <h4 className="text-xs font-black uppercase text-blue-700 leading-none">
            💡 Chi tiết chỉ số: {cardsData.find(c => c.id === activeMetricId)?.title}
          </h4>
          <p className="text-xs font-medium text-slate-600 mt-1.5 leading-relaxed">
            {cardsData.find(c => c.id === activeMetricId)?.description}
          </p>
        </div>
      )}

      {/* 4. MAIN TWO-COLUMN DASHBOARD LAYOUT (GRID 12) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
        
        {/* LEFT COMPONENT: DOANH THU BIỂU ĐỒ 4 TUẦN (SPAN 7) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-left">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-black tracking-wider text-[#C21A1A] uppercase">
                DOANH THU &amp; KPI CHI NHÁNH 4 TUẦN GẦN NHẤT
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Đối chiếu tỷ lệ hoàn thành so với mức mục tiêu sàn (200M/tuần)</p>
            </div>

            {/* Chart Legend keys */}
            <div className="flex items-center gap-3.5 text-xs font-bold shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-blue-600"></span>
                <span className="text-slate-500">Doanh thu đạt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="border-t-2 border-dashed border-blue-500/60 w-5 inline-block"></span>
                <span className="text-slate-500">Target sàn (200M)</span>
              </div>
            </div>
          </div>

          {/* HIGH-FIDELITY CUSTOM STATS GRAPH BAR */}
          <div className="relative pt-8 pb-4 px-3">
            
            {/* Horizontal Target Line with absolute value */}
            <div className="absolute left-10 right-0 top-[40%] border-t border-dashed border-blue-500/40 z-10 flex justify-between items-start pointer-events-none">
              <span className="text-[9px] font-sans font-black text-blue-600 bg-white px-2 -mt-2.5 border border-blue-200/50 rounded-md">
                TARGET SÀN: 200M
              </span>
            </div>

            {/* Chart Y Axis & Grid area */}
            <div className="flex items-end justify-between h-48 pl-10 relative border-l border-b border-slate-200">
              
              {/* Side numbers absolute positioning */}
              <div className="absolute left-[-35px] top-0 bottom-0 flex flex-col justify-between text-[9px] font-sans font-black text-slate-400 select-none text-right">
                <span>300M</span>
                <span>200M</span>
                <span>100M</span>
                <span>0</span>
              </div>

              {/* Plot grid guides */}
              <div className="absolute left-0 right-0 top-[20%] border-t border-slate-100 pointer-events-none"></div>
              <div className="absolute left-0 right-0 top-[60%] border-t border-slate-100 pointer-events-none"></div>
              <div className="absolute left-0 right-0 top-[80%] border-t border-slate-100 pointer-events-none"></div>

              {weeksData.map((data, idx) => {
                const isHovered = hoveredWeek === idx;
                const pctHeight = Math.min(100, Math.round((data.value / 300) * 100));
                
                return (
                  <div 
                    key={idx} 
                    className="flex-1 flex flex-col items-center group relative cursor-pointer h-full justify-end"
                    onMouseEnter={() => setHoveredWeek(idx)}
                    onMouseLeave={() => setHoveredWeek(null)}
                  >
                    {/* Floating statistics directly above the column */}
                    <span className="text-xs font-sans font-black text-blue-600 mb-2 transition-transform duration-300 group-hover:scale-110">
                      {data.label}
                    </span>

                    {/* Column bar block */}
                    <div 
                      className={`w-[45%] lg:w-[32%] rounded-t-lg transition-all ease-out duration-300 relative ${
                        isHovered 
                          ? 'bg-blue-600 shadow-md scale-x-[1.05]' 
                          : 'bg-blue-500'
                      }`} 
                      style={{ height: `${pctHeight}%` }}
                    >
                      {/* Interactive popup metrics card */}
                      {isHovered && (
                        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-lg p-2 text-[10px] font-extrabold z-20 pointer-events-none shadow-lg whitespace-nowrap leading-tight text-center">
                          <p>Hệ số: {Math.round((data.value / data.target) * 100)}%</p>
                          <p className="text-emerald-400">Lợi nhuận ước tính: {data.profit}</p>
                        </div>
                      )}
                    </div>

                    {/* X axis tag naming */}
                    <span className="text-[11px] font-sans font-extrabold text-slate-400 mt-3 select-none">
                      {data.week}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>

          {/* Quick analysis summary text */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex items-start gap-3">
            <span className="text-lg shrink-0">📈</span>
            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Doanh thu lũy tiến đạt đỉnh ở <strong className="text-blue-600">Tuần 4 (256.000.000đ)</strong>, ghi nhận mốc tăng trưởng <strong className="text-slate-800">+18%</strong> nhờ hiệu quả đóng gói dịch vụ và các chương trình bán kèm phụ kiện của đội ngũ Sales chốt ca xuất sắc.
            </p>
          </div>

        </div>

        {/* RIGHT COMPONENT: LEADERBOARD & INDIVIDUAL SCORE (SPAN 5) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 text-left">
          
          <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black tracking-wider text-[#C21A1A] uppercase">
                BẢNG THI ĐUA NHÂN SỰ CHI NHÁNH
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">Bấm vào bất cứ tên nào để so sánh quy trình cá nhân</p>
            </div>
            
            <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {filteredStaff.length} người
            </span>
          </div>

          {/* Table Header Columns */}
          <div className="grid grid-cols-12 text-[9.5px] font-black text-slate-400 uppercase tracking-wider px-1">
            <span className="col-span-2 text-center">Hạng</span>
            <span className="col-span-5">Nhân viên</span>
            <span className="col-span-3 text-right">Đánh giá</span>
            <span className="col-span-2 text-right">Bậc</span>
          </div>

          {/* Row mapping list */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {filteredStaff.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-bold">
                Không tìm thấy nhân sự trùng khớp bộ lọc
              </div>
            ) : (
              filteredStaff.map((staff, relativeIndex) => {
                const isSelected = selectedStaff?.name === staff.name;
                
                return (
                  <div 
                    key={staff.name}
                    onClick={() => setSelectedStaff(staff)}
                    className={`grid grid-cols-12 items-center p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-slate-50 border-slate-350 shadow-xs' 
                        : 'bg-white border-slate-150 hover:border-slate-250'
                    }`}
                  >
                    {/* Medal Circle Badge */}
                    <div className="col-span-2 flex justify-center shrink-0">
                      {relativeIndex === 0 ? (
                        <span className="w-5 h-5 rounded-full bg-amber-400 text-white font-sans font-black text-[11px] flex items-center justify-center shadow-sm">1</span>
                      ) : relativeIndex === 1 ? (
                        <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-sans font-black text-[11px] flex items-center justify-center shadow-sm">2</span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-amber-600/60 text-white font-sans font-black text-[11px] flex items-center justify-center shadow-sm">3</span>
                      )}
                    </div>

                    {/* Employee Profile Layout info */}
                    <div className="col-span-5 flex items-center gap-2 pl-1 min-w-0">
                      <img 
                        src={staff.avatar} 
                        alt={staff.name} 
                        className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="text-left truncate">
                        <h4 className="font-extrabold text-slate-900 text-[11px] sm:text-xs truncate" title={staff.name}>
                          {staff.name}
                        </h4>
                        <p className="text-[9px] text-slate-400 font-bold -mt-0.5 uppercase tracking-wide">
                          {staff.role}
                        </p>
                      </div>
                    </div>

                    {/* Main value KPI standard number */}
                    <div className="col-span-3 text-right">
                      <span className={`text-xs font-sans font-black ${
                        staff.score >= 90 
                          ? 'text-emerald-600' 
                          : staff.score >= 80 
                            ? 'text-blue-600' 
                            : 'text-amber-600'
                      }`}>
                        {staff.score} <span className="text-[9px] font-bold text-slate-400 uppercase">điểm</span>
                      </span>
                    </div>

                    {/* Colored Classification Status badge */}
                    <div className="col-span-2 text-right">
                      <span className={`inline-block text-[9.5px] font-black px-2 py-0.5 rounded-md border ${
                        staff.score >= 90
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : staff.score >= 80
                            ? 'bg-blue-50 text-blue-600 border-blue-200'
                            : 'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {staff.classification}
                      </span>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* DYNAMIC INDIVIDUAL ACTIVITY RADARS/METADATA (EXPANDS AS SELECTING ROWS) */}
          {selectedStaff && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-sm font-semibold space-y-3.5 mt-3 animate-in fade-in duration-300">
              
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    CHI TIẾT ĐIỂM: {selectedStaff.name.toUpperCase()}
                  </span>
                </div>
                
                <span className="text-[10px] font-sans font-black bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-lg uppercase tracking-wider">
                  {selectedStaff.role}
                </span>
              </div>

              {/* Dynamic properties grid detailing the user's score attributes */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                
                <div className="bg-white p-3 border border-slate-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Doanh số cá nhân</p>
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-black text-slate-900">
                      {selectedStaff.score >= 90 ? '98%' : selectedStaff.score >= 80 ? '91%' : '79%'}
                    </span>
                    <span className="text-[9.5px] font-bold text-emerald-600">🟢 Đạt</span>
                  </div>
                </div>

                <div className="bg-white p-3 border border-slate-150 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Hoàn thành Checklist</p>
                  <div className="flex items-center justify-between">
                    <span className="font-sans font-black text-slate-900">
                      {selectedStaff.score >= 90 ? '100%' : selectedStaff.score >= 80 ? '94%' : '82%'}
                    </span>
                    <span className="text-[9.5px] font-bold text-emerald-600">🟢 Khớp</span>
                  </div>
                </div>

                <div className="bg-white p-3 border border-slate-150 rounded-xl col-span-2 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase leading-none">Chấp hành nội quy tiêu chuẩn &amp; SOP</p>
                  
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-500 font-semibold">
                      {selectedStaff.score >= 90 
                        ? 'Không ghi nhận lỗi vi phạm SOP trong chu kỳ dán tag / phục vụ.' 
                        : selectedStaff.score >= 80
                          ? 'Ghi nhận 1 vi phạm lỗi nhẹ: Không chào khách đúng kịch bản.'
                          : 'Vi phạm dán tag sai giá bán POS - Cần theo dõi kèm cặp thêm.'}
                    </p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black shrink-0 ${
                      selectedStaff.score >= 90 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {selectedStaff.score >= 90 ? 'Lý tưởng' : 'Cảnh báo'}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
