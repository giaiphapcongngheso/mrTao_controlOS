import React, { useState } from 'react';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Award, 
  Plus, 
  Trash2, 
  Save, 
  Calendar,
  Users,
  Target,
  Sparkles,
  Zap,
  Check,
  X,
  Edit2,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  Eye,
  Download
} from 'lucide-react';
import type { StaffMember, StaffRole } from '../../types/staff.types';
import type { KPIConfig, KPIDailyValue, StaffRank } from '../../types/kpi.types';
import { ModuleHeader } from '../../../share/components/module-header';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../share/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../shared/components/table';
import { ScrollArea, ScrollBar } from '../../shared/components/scroll-area';
import { GroupBox } from '../../components/custom/group-box';
import { Button } from '../../shared/components/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '../../../share/ui/dialog';
import { exportKpiReportToExcel } from '../../services/admin/kpi-excel-service';

interface KpiViewProps {
  roles: StaffRole[];
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  onSaveDailyValue: (val: KPIDailyValue) => Promise<any>;
  onSetTab: (tab: any) => void;
}

// Normalize role string to map templates
const normalizeRole = (r: string) => {
  if (!r) return '';
  const norm = r.toUpperCase().replace(/_/g, '').trim();
  if (norm === 'QUAN_LY' || norm === 'QUANLY' || norm === 'MANAGER') return 'QUAN_LY';
  if (norm === 'SALES' || norm === 'BAN_HANG' || norm === 'BANHANG') return 'SALES';
  if (norm === 'KY_THUAT' || norm === 'KYTHUAT' || norm === 'TECH') return 'KỸ_THUẬT';
  if (norm === 'KHO' || norm === 'WAREHOUSE') return 'KHO';
  return norm;
};

// Translate classification key to Vietnamese
const translateClassification = (cls: string) => {
  if (cls === 'excellent') return 'Xuất sắc';
  if (cls === 'good') return 'Tốt';
  if (cls === 'pass') return 'Khá';
  return 'Chưa đạt';
};

// Classification color badge style
const getClassificationBadgeClass = (cls: string) => {
  if (cls === 'excellent') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (cls === 'good') return 'bg-blue-50 text-blue-600 border-blue-200';
  if (cls === 'pass') return 'bg-amber-50 text-amber-600 border-amber-200';
  return 'bg-rose-50 text-rose-600 border-rose-200';
};

// Get previous month/year string (YYYY-MM)
const getPreviousMonthYear = (monthYearStr: string): string => {
  const [year, month] = monthYearStr.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
};

export default function KpiView({
  roles,
  staffMembers,
  kpiConfigs,
  kpiDailyValues,
  onCreateConfig,
  onUpdateConfig,
  onDeleteConfig,
  onSaveDailyValue,
  onSetTab
}: KpiViewProps) {
  // Tabs: 'ranks' | 'entry' | 'settings'
  const [activeSubTab, setActiveSubTab] = useState<'ranks' | 'entry' | 'settings'>('ranks');
  
  // Selection states
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>('2026-06');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    staffMembers.find(s => s.status === 'active')?.id || ''
  );
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [selectedSettingRole, setSelectedSettingRole] = useState<string>('SALES');

  // Tab 1 Ranks Timeframe Selector states
  const [ranksTimeframe, setRanksTimeframe] = useState<'month' | 'quarter' | 'year'>('month');
  const [ranksQuarter, setRanksQuarter] = useState<number>(() => {
    const m = new Date().getMonth() + 1;
    return Math.ceil(m / 3);
  });
  const [ranksYear, setRanksYear] = useState<number>(2026);
  const [ranksMonth, setRanksMonth] = useState<string>('2026-06');

  // Sync ranksMonth when selectedMonthYear changes
  React.useEffect(() => {
    setRanksMonth(selectedMonthYear);
  }, [selectedMonthYear]);

  // Months in the selected period (ranks & details overview)
  const periodMonths = React.useMemo(() => {
    if (ranksTimeframe === 'month') {
      return [ranksMonth];
    } else if (ranksTimeframe === 'quarter') {
      const q = ranksQuarter;
      const y = ranksYear;
      return [
        `${y}-${String((q - 1) * 3 + 1).padStart(2, '0')}`,
        `${y}-${String((q - 1) * 3 + 2).padStart(2, '0')}`,
        `${y}-${String((q - 1) * 3 + 3).padStart(2, '0')}`
      ];
    } else {
      const y = ranksYear;
      return Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`);
    }
  }, [ranksTimeframe, ranksMonth, ranksQuarter, ranksYear]);

  // Tab 2 view states
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [selectedWeekNum, setSelectedWeekNum] = useState<number | null>(null);

  React.useEffect(() => {
    const isRoleExist = roles.some(r => r.code === selectedSettingRole);
    if (!isRoleExist && roles.length > 0) {
      setSelectedSettingRole(roles[0].code);
    }
  }, [roles, selectedSettingRole, setSelectedSettingRole]);

  // Input states for Tab 2 (Entry)
  const [entryValues, setEntryValues] = useState<Record<string, string>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Dialog & Form states for Tab 3 (Add/Edit config)
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configDialogMode, setConfigDialogMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedConfigToEdit, setSelectedConfigToEdit] = useState<KPIConfig | null>(null);

  const [formGoal, setFormGoal] = useState('');
  const [formKpi, setFormKpi] = useState('');
  const [formUnit, setFormUnit] = useState('VNĐ');
  const [formTarget, setFormTarget] = useState('');
  const [formWeight, setFormWeight] = useState('');
  const [formProof, setFormProof] = useState('');

  // Dialog state for Tab 2 (Entry) & Chart state
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [focusedKpiInputId, setFocusedKpiInputId] = useState<string | null>(null);
  const [activeChartKpiId, setActiveChartKpiId] = useState<string>('');

  // Helper to get number of days in selectedMonthYear
  const getDaysInMonthCount = (monthYearStr: string): number => {
    const [year, month] = monthYearStr.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };
  const daysInMonthCount = getDaysInMonthCount(selectedMonthYear);
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  // Helper: Get all active staff ranks dynamically calculated from Firestore over a period
  const getDynamicStaffRanks = (): StaffRank[] => {
    const activeStaff = staffMembers.filter(s => s.status === 'active');
    
    const ranks = activeStaff.map((staff): StaffRank => {
      const roleNorm = normalizeRole(staff.role);
      
      let totalScoreSum = 0;
      let monthsCount = 0;
      
      periodMonths.forEach(m => {
        const configs = kpiConfigs.filter(
          c => normalizeRole(c.role) === roleNorm && (c.month || '2026-06') === m
        );
        
        if (configs.length > 0) {
          let monthScore = 0;
          configs.forEach(config => {
            const actual = kpiDailyValues
              .filter(v => v.staffId === staff.id && v.kpiConfigId === config.id && v.date.startsWith(m))
              .reduce((sum, item) => sum + item.value, 0);
            
            const pct = config.monthlyTarget > 0 ? (actual / config.monthlyTarget) : 0;
            const score = Math.min(config.weight, config.weight * pct);
            monthScore += score;
          });
          totalScoreSum += monthScore;
          monthsCount++;
        }
      });
      
      const finalScore = monthsCount > 0 ? Math.round((totalScoreSum / monthsCount) * 100) : 0;
      let classification: 'excellent' | 'good' | 'pass' | 'needs_improvement' = 'needs_improvement';
      if (finalScore >= 90) classification = 'excellent';
      else if (finalScore >= 80) classification = 'good';
      else if (finalScore >= 70) classification = 'pass';

      return {
        storeId: staff.storeId,
        staffId: staff.id,
        name: staff.fullName,
        role: staff.role,
        score: finalScore,
        classification,
        avatar: staff.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${staff.username}`
      };
    });

    return ranks.sort((a, b) => b.score - a.score);
  };

  const dynamicRanks = React.useMemo(() => {
    return getDynamicStaffRanks();
  }, [staffMembers, kpiConfigs, kpiDailyValues, periodMonths]);

  const selectedStaff = React.useMemo(() => {
    return staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0];
  }, [staffMembers, selectedStaffId]);

  const staffConfigs = React.useMemo(() => {
    if (!selectedStaff) return [];
    return kpiConfigs.filter(c => 
      normalizeRole(c.role) === normalizeRole(selectedStaff.role) && 
      (c.month || '2026-06') === selectedMonthYear
    );
  }, [kpiConfigs, selectedStaff, selectedMonthYear]);

  // Set default active KPI for chart
  React.useEffect(() => {
    if (staffConfigs.length > 0) {
      if (!activeChartKpiId || !staffConfigs.some(c => c.id === activeChartKpiId)) {
        setActiveChartKpiId(staffConfigs[0].id);
      }
    } else {
      setActiveChartKpiId('');
    }
  }, [selectedStaffId, staffConfigs]);

  // Tính doanh thu tháng lũy kế
  const revenueStats = React.useMemo(() => {
    const vnKpis = staffConfigs.filter(c => c.unit === 'VNĐ');
    const totalTarget = vnKpis.reduce((sum, c) => sum + c.monthlyTarget, 0);
    const totalActual = vnKpis.reduce((sum, c) => {
      const actual = kpiDailyValues
        .filter(v => v.staffId === selectedStaff.id && v.kpiConfigId === c.id && v.date.startsWith(selectedMonthYear))
        .reduce((s, item) => s + item.value, 0);
      return sum + actual;
    }, 0);
    const pct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    return { totalTarget, totalActual, pct, hasRevenue: vnKpis.length > 0 };
  }, [staffConfigs, kpiDailyValues, selectedStaff, selectedMonthYear]);

  // Tính doanh thu lũy kế theo giai đoạn được chọn (Tháng/Quý/Năm)
  const periodRevenueStats = React.useMemo(() => {
    if (!selectedStaff) return { totalTarget: 0, totalActual: 0, pct: 0, hasRevenue: false };
    const roleNorm = normalizeRole(selectedStaff.role);
    
    const vnKpis = kpiConfigs.filter(c => 
      normalizeRole(c.role) === roleNorm && 
      c.unit === 'VNĐ' && 
      periodMonths.includes(c.month || '2026-06')
    );
    
    const totalTarget = vnKpis.reduce((sum, c) => sum + c.monthlyTarget, 0);
    const totalActual = vnKpis.reduce((sum, c) => {
      const actual = kpiDailyValues
        .filter(v => v.staffId === selectedStaff.id && v.kpiConfigId === c.id && v.date.startsWith(c.month || '2026-06'))
        .reduce((s, item) => s + item.value, 0);
      return sum + actual;
    }, 0);
    
    const pct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
    return { totalTarget, totalActual, pct, hasRevenue: vnKpis.length > 0 };
  }, [kpiConfigs, kpiDailyValues, selectedStaff, periodMonths]);

  // Group và tính lũy kế KPI chi tiết của nhân viên được chọn theo giai đoạn (Tháng/Quý/Năm)
  const periodKpis = React.useMemo(() => {
    if (!selectedStaff) return [];
    const roleNorm = normalizeRole(selectedStaff.role);
    
    const configsInPeriod = kpiConfigs.filter(c => 
      normalizeRole(c.role) === roleNorm && 
      periodMonths.includes(c.month || '2026-06')
    );
    
    const groups: Record<string, {
      kpiName: string;
      unit: string;
      weight: number;
      totalTarget: number;
      totalActual: number;
      count: number;
    }> = {};
    
    configsInPeriod.forEach(config => {
      const key = `${config.kpiName.trim().toLowerCase()}_${config.unit}`;
      
      const actual = kpiDailyValues
        .filter(v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date.startsWith(config.month || '2026-06'))
        .reduce((sum, item) => sum + item.value, 0);
        
      if (!groups[key]) {
        groups[key] = {
          kpiName: config.kpiName,
          unit: config.unit,
          weight: config.weight,
          totalTarget: config.monthlyTarget,
          totalActual: actual,
          count: 1
        };
      } else {
        groups[key].weight += config.weight;
        groups[key].totalTarget += config.monthlyTarget;
        groups[key].totalActual += actual;
        groups[key].count += 1;
      }
    });
    
    return Object.values(groups).map(g => {
      const avgWeight = g.weight / g.count;
      const pct = g.totalTarget > 0 ? (g.totalActual / g.totalTarget) : 0;
      const score = Math.min(avgWeight, avgWeight * pct);
      
      return {
        id: g.kpiName + '_' + g.unit,
        kpiName: g.kpiName,
        unit: g.unit,
        weight: avgWeight,
        target: g.totalTarget,
        actual: g.totalActual,
        pct,
        score
      };
    });
  }, [kpiConfigs, kpiDailyValues, selectedStaff, periodMonths]);

  // Helper: format money/number
  const formatValue = (val: number, unit: string) => {
    if (unit === 'VNĐ') {
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
    }
    return `${val.toLocaleString()} ${unit}`;
  };

  // Tab 2: Load current values when Day/Staff/Month changes
  React.useEffect(() => {
    if (!selectedStaff) return;
    const initialEntry: Record<string, string> = {};
    const dateStr = `${selectedMonthYear}-${selectedDay.toString().padStart(2, '0')}`;
    
    staffConfigs.forEach(config => {
      const record = kpiDailyValues.find(
        v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
      );
      initialEntry[config.id] = record ? record.value.toString() : '';
    });
    setEntryValues(initialEntry);
    setSaveSuccessMsg(null);
  }, [selectedStaffId, selectedDay, kpiDailyValues, kpiConfigs, selectedMonthYear, staffConfigs]);

  // Tab 2: Handle saving day values
  const handleSaveDayValues = async () => {
    if (!selectedStaff) return;
    const dateStr = `${selectedMonthYear}-${selectedDay.toString().padStart(2, '0')}`;

    try {
      for (const config of staffConfigs) {
        const valStr = entryValues[config.id] || '0';
        const numVal = parseFloat(valStr.replace(/[^0-9.-]/g, '')) || 0;
        
        const payload: KPIDailyValue = {
          id: `${selectedStaff.id}_${config.id}_${dateStr}`,
          storeId: selectedStaff.storeId,
          staffId: selectedStaff.id,
          kpiConfigId: config.id,
          date: dateStr,
          value: numVal
        };
        await onSaveDailyValue(payload);
      }
      setSaveSuccessMsg(`Đã lưu thành công số liệu ngày ${selectedDay.toString().padStart(2, '0')}/${selectedMonthYear.split('-')[1]} cho ${selectedStaff.fullName}`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Lỗi khi lưu KPI ngày:', err);
    }
  };

  // Open Dialog for Adding Config
  const handleOpenAddConfigDialog = () => {
    setSelectedConfigToEdit(null);
    setFormGoal('');
    setFormKpi('');
    setFormUnit('VNĐ');
    setFormTarget('');
    setFormWeight('');
    setFormProof('');
    setConfigDialogMode('create');
    setIsConfigDialogOpen(true);
  };

  // Open Dialog for Editing Config
  const handleOpenEditConfigDialog = (config: KPIConfig) => {
    setSelectedConfigToEdit(config);
    setFormGoal(config.goalName);
    setFormKpi(config.kpiName);
    setFormUnit(config.unit);
    setFormTarget(config.monthlyTarget.toString());
    setFormWeight((config.weight * 100).toString());
    setFormProof(config.proofSource);
    setConfigDialogMode('edit');
    setIsConfigDialogOpen(true);
  };

  // Open Dialog for Viewing Config
  const handleOpenViewConfigDialog = (config: KPIConfig) => {
    setSelectedConfigToEdit(config);
    setFormGoal(config.goalName);
    setFormKpi(config.kpiName);
    setFormUnit(config.unit);
    setFormTarget(config.monthlyTarget.toString());
    setFormWeight((config.weight * 100).toString());
    setFormProof(config.proofSource);
    setConfigDialogMode('view');
    setIsConfigDialogOpen(true);
  };

  // Handle Form Submit inside Dialog
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKpi || !formTarget || !formWeight) return;

    try {
      const numTarget = parseFloat(formTarget) || 0;
      const numWeight = (parseFloat(formWeight) || 0) / 100;
      const dailyTarget = Math.round(numTarget / daysInMonthCount);

      if (selectedConfigToEdit) {
        // Update
        await onUpdateConfig({
          ...selectedConfigToEdit,
          goalName: formGoal || 'Chưa phân loại',
          kpiName: formKpi,
          unit: formUnit,
          monthlyTarget: numTarget,
          weight: numWeight,
          dailyTarget,
          proofSource: formProof || 'Chưa thiết lập',
          month: selectedConfigToEdit.month || selectedMonthYear
        });
      } else {
        // Create
        const newId = `cfg_${selectedSettingRole.toLowerCase()}_${Date.now()}`;
        const payload: KPIConfig = {
          id: newId,
          storeId: selectedStaff?.storeId || 'store-mr-tao-q1',
          role: selectedSettingRole,
          goalName: formGoal || 'Chưa phân loại',
          kpiName: formKpi,
          unit: formUnit,
          monthlyTarget: numTarget,
          weight: numWeight,
          dailyTarget,
          proofSource: formProof || 'Chưa thiết lập',
          month: selectedMonthYear
        };
        await onCreateConfig(payload);
      }
      setIsConfigDialogOpen(false);
    } catch (err) {
      console.error('Lỗi khi lưu cấu hình KPI:', err);
    }
  };

  // Tab 3: Delete config
  const handleDeleteConfig = async (configId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa chỉ số KPI này? Việc xóa sẽ ảnh hưởng tới tính toán điểm của toàn bộ nhân viên thuộc vai trò này.')) {
      try {
        await onDeleteConfig(configId);
      } catch (err) {
        console.error('Lỗi khi xóa cấu hình KPI:', err);
      }
    }
  };

  // Copy KPIs from previous month
  const handleCopyKpiFromPreviousMonth = async () => {
    const prevMonthYear = getPreviousMonthYear(selectedMonthYear);
    const prevConfigs = kpiConfigs.filter(c => (c.month || '2026-06') === prevMonthYear);
    
    if (prevConfigs.length === 0) {
      alert(`Không tìm thấy cấu hình KPI nào của tháng trước (${prevMonthYear}) để sao chép.`);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn sao chép ${prevConfigs.length} cấu hình KPI từ tháng trước (${prevMonthYear}) sang tháng hiện tại (${selectedMonthYear})?`)) {
      try {
        for (const config of prevConfigs) {
          const newId = `cfg_${config.role.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const payload: KPIConfig = {
            ...config,
            id: newId,
            month: selectedMonthYear
          };
          await onCreateConfig(payload);
        }
        alert('Đã sao chép thành công cấu hình KPI từ tháng trước.');
      } catch (err) {
        console.error('Lỗi khi sao chép KPI:', err);
        alert('Đã có lỗi xảy ra trong quá trình sao chép.');
      }
    }
  };

  // Week helpers for view mode toggle
  const getWeekDays = (weekNum: number): number[] => {
    let startDay = 1;
    let endDay = 7;
    if (weekNum === 2) {
      startDay = 8;
      endDay = 14;
    } else if (weekNum === 3) {
      startDay = 15;
      endDay = 21;
    } else if (weekNum === 4) {
      startDay = 22;
      endDay = 28;
    } else if (weekNum === 5) {
      startDay = 29;
      endDay = daysInMonthCount;
    }

    const days: number[] = [];
    for (let d = startDay; d <= endDay; d++) {
      days.push(d);
    }
    return days;
  };

  const getWeekActual = (configId: string, weekNum: number): number => {
    const days = getWeekDays(weekNum);
    let total = 0;
    days.forEach(day => {
      const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
      const record = kpiDailyValues.find(
        v => v.staffId === selectedStaff.id && v.kpiConfigId === configId && v.date === dateStr
      );
      if (record) {
        total += record.value;
      }
    });
    return total;
  };

  const getWeekTarget = (config: KPIConfig, weekNum: number): number => {
    const days = getWeekDays(weekNum).length;
    return config.monthlyTarget > 0 ? (config.dailyTarget * days) : days;
  };

  const hasNoConfigsForCurrentMonth = kpiConfigs.filter(c => (c.month || '2026-06') === selectedMonthYear).length === 0;

  return (
    <div className="space-y-4 text-left">
      
      {/* 1. MODULE HEADER */}
      <ModuleHeader 
        title="Bảng KPI &amp; Hiệu Suất Vận Hành" 
        description="Đo lường tự động chỉ số doanh số, chăm sóc khách hàng và hiệu suất hoàn thành checklist tiêu chuẩn showroom."
        icon={<TrendingUp className="w-6 h-6 text-[#C21A1A]" />}
      >
        <div className="flex items-center gap-2">
          <select
            value={selectedMonthYear}
            onChange={(e) => {
              setSelectedMonthYear(e.target.value);
              // Reset week view states on month change
              setViewMode('month');
              setSelectedWeekNum(null);
            }}
            className="px-3 h-9 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = (i + 1).toString().padStart(2, '0');
              return (
                <option key={m} value={`2026-${m}`}>
                  Tháng {m}/2026
                </option>
              );
            })}
          </select>
          <button 
            onClick={() => onSetTab('Today')}
            className="px-4 h-9 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center whitespace-nowrap"
          >
            Về Trang Chủ
          </button>
        </div>
      </ModuleHeader>

      {/* Banner/Alert Copy KPIs when current month has no configs */}
      {hasNoConfigsForCurrentMonth && (
        <div className="bg-gradient-to-r from-red-50 to-amber-50 border border-red-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left shadow-2xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[#C21A1A] font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              Chưa có cấu hình KPI cho Tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}
            </div>
            <p className="text-xs text-slate-500 font-semibold">
              Bạn có thể sao chép nhanh toàn bộ danh mục chỉ số và mục tiêu từ tháng liền kề trước đó ({getPreviousMonthYear(selectedMonthYear)}) để tiết kiệm thời gian thiết lập.
            </p>
          </div>
          <button
            onClick={handleCopyKpiFromPreviousMonth}
            className="px-4 py-2.5 bg-[#C21A1A] hover:bg-[#A51414] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-red-500/10 hover:shadow-lg transition-all flex items-center justify-center cursor-pointer border-0 shrink-0"
          >
            <Zap className="w-4 h-4 mr-1.5" />
            Sao chép KPI từ tháng trước
          </button>
        </div>
      )}

      {/* 2. SUBTABS PANEL (Glassmorphism & Interactive) */}
      <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center gap-1.5 w-fit">
        <Button 
          variant={activeSubTab === 'ranks' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('ranks')}
          className="font-bold cursor-pointer"
        >
          <Award className="w-4 h-4 mr-1" />
          Xếp hạng & Chi tiết
        </Button>
        <Button 
          variant={activeSubTab === 'entry' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('entry')}
          className="font-bold cursor-pointer"
        >
          <Calendar className="w-4 h-4 mr-1" />
          Nhập Action Plan
        </Button>
        <Button 
          variant={activeSubTab === 'settings' ? 'default' : 'ghost'} 
          size="sm"
          onClick={() => setActiveSubTab('settings')}
          className="font-bold cursor-pointer"
        >
          <Target className="w-4 h-4 mr-1" />
          Thiết lập KPI Chung
        </Button>
      </div>

      {/* 3. TAB 1: BẢNG XẾP HẠNG & CHI TIẾT */}
      {activeSubTab === 'ranks' && (
        <div className="space-y-4">
          {/* Segmented Control & Timeframe Selectors */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit border border-slate-200/50">
              <button
                onClick={() => setRanksTimeframe('month')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  ranksTimeframe === 'month'
                    ? 'bg-white text-[#C21A1A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Theo Tháng
              </button>
              <button
                onClick={() => setRanksTimeframe('quarter')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  ranksTimeframe === 'quarter'
                    ? 'bg-white text-[#C21A1A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Theo Quý
              </button>
              <button
                onClick={() => setRanksTimeframe('year')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  ranksTimeframe === 'year'
                    ? 'bg-white text-[#C21A1A] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Theo Năm
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase">Giai đoạn:</span>
              {ranksTimeframe === 'month' && (
                <select
                  value={ranksMonth}
                  onChange={(e) => setRanksMonth(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer focus:outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = (i + 1).toString().padStart(2, '0');
                    return (
                      <option key={m} value={`2026-${m}`}>
                        Tháng {m}/2026
                      </option>
                    );
                  })}
                </select>
              )}

              {ranksTimeframe === 'quarter' && (
                <div className="flex items-center gap-2">
                  <select
                    value={ranksQuarter}
                    onChange={(e) => setRanksQuarter(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer focus:outline-none"
                  >
                    <option value={1}>Quý 1 (T01 - T03)</option>
                    <option value={2}>Quý 2 (T04 - T06)</option>
                    <option value={3}>Quý 3 (T07 - T09)</option>
                    <option value={4}>Quý 4 (T10 - T12)</option>
                  </select>
                  <select
                    value={ranksYear}
                    onChange={(e) => setRanksYear(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer focus:outline-none"
                  >
                    <option value={2025}>2025</option>
                    <option value={2026}>2026</option>
                    <option value={2027}>2027</option>
                  </select>
                </div>
              )}

              {ranksTimeframe === 'year' && (
                <select
                  value={ranksYear}
                  onChange={(e) => setRanksYear(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer focus:outline-none"
                >
                  <option value={2025}>Năm 2025</option>
                  <option value={2026}>Năm 2026</option>
                  <option value={2027}>Năm 2027</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Cột trái (Bảng xếp hạng) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h2 className="text-base font-bold text-slate-800 tracking-wider">LEADERBOARD THI ĐUA</h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Xếp hạng dựa trên kết quả đạt được</p>
                </div>
                <span className="text-xs font-bold text-[#C21A1A] bg-red-50 border border-red-100 px-2 py-0.5 rounded-md">
                  {ranksTimeframe === 'month' 
                    ? `Tháng ${ranksMonth.split('-')[1]}/${ranksMonth.split('-')[0]}`
                    : ranksTimeframe === 'quarter'
                      ? `Quý ${ranksQuarter}/${ranksYear}`
                      : `Năm ${ranksYear}`
                  }
                </span>
              </div>

              <div className="p-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-center text-xs">Hạng</TableHead>
                      <TableHead className="text-xs">Nhân viên</TableHead>
                      <TableHead className="text-right text-xs">Tổng điểm</TableHead>
                      <TableHead className="text-right text-xs">Xếp loại</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dynamicRanks.map((rank, idx) => {
                      const isSelected = selectedStaffId === rank.staffId;
                      return (
                        <TableRow 
                          key={rank.staffId}
                          onClick={() => setSelectedStaffId(rank.staffId)}
                          className={`cursor-pointer hover:bg-slate-50/70 ${isSelected ? 'bg-slate-50 font-semibold border-l-4 border-l-[#C21A1A]' : ''}`}
                        >
                          <TableCell className="text-center font-sans text-sm">
                            {idx === 0 ? (
                              <span className="w-5 h-5 rounded-full bg-amber-400 text-white font-bold text-xs flex items-center justify-center mx-auto shadow-sm">1</span>
                            ) : idx === 1 ? (
                              <span className="w-5 h-5 rounded-full bg-slate-300 text-slate-800 font-bold text-xs flex items-center justify-center mx-auto shadow-sm">2</span>
                            ) : idx === 2 ? (
                              <span className="w-5 h-5 rounded-full bg-amber-600/70 text-white font-bold text-xs flex items-center justify-center mx-auto shadow-sm">3</span>
                            ) : (
                              <span className="text-xs text-slate-400 font-bold">{idx + 1}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <img src={rank.avatar} className="w-7 h-7 rounded-full object-cover border border-slate-100 shrink-0" alt="" />
                              <div className="text-left">
                                <p className="text-sm font-bold text-slate-800 leading-tight">{rank.name}</p>
                                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{rank.role}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-sans font-bold text-slate-800 text-sm">
                            {rank.score}%
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded border ${getClassificationBadgeClass(rank.classification)}`}>
                              {translateClassification(rank.classification)}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Cột phải (Chi tiết điểm) */}
            <div className="lg:col-span-7 space-y-4">
              {selectedStaff && (
                <Card>
                  <CardHeader className="border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          <img src={selectedStaff.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${selectedStaff.username}`} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="text-left">
                          <CardTitle className="text-base font-bold text-slate-900">{selectedStaff.fullName}</CardTitle>
                          <CardDescription className="text-xs font-bold text-[#C21A1A] uppercase tracking-wider mt-0.5">
                            Vai trò: {selectedStaff.role}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center">
                        {periodRevenueStats.hasRevenue && (
                          <div className="text-right border-r border-slate-100 pr-4 hidden sm:block">
                            <p className="text-xs font-bold text-slate-400 uppercase">
                              {ranksTimeframe === 'month' ? 'DOANH THU THÁNG' : ranksTimeframe === 'quarter' ? 'DOANH THU QUÝ' : 'DOANH THU NĂM'}
                            </p>
                            <h3 className="text-sm font-bold text-slate-900 leading-none mt-1">
                              {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
                            </h3>
                            <span className="text-xs font-semibold text-emerald-600">
                              {periodRevenueStats.pct.toFixed(0)}% Đạt
                            </span>
                          </div>
                        )}

                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-400 uppercase">ĐIỂM TRUNG BÌNH KPI</p>
                          <h3 className="text-lg font-bold font-sans text-slate-900 leading-none mt-1">
                            {dynamicRanks.find(r => r.staffId === selectedStaff.id)?.score || 0}%
                          </h3>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-5 space-y-5">

                    {/* Card Thống kê Doanh thu phụ nếu có */}
                    {periodRevenueStats.hasRevenue && (
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center text-left">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400 uppercase">Doanh thu đạt được</span>
                          <h4 className="text-sm font-bold text-[#C21A1A]">
                            {formatValue(periodRevenueStats.totalActual, 'VNĐ')}
                          </h4>
                        </div>
                        <div className="text-right space-y-1">
                          <span className="text-xs font-bold text-slate-400 uppercase">
                            {ranksTimeframe === 'month' ? 'Chỉ tiêu tháng' : ranksTimeframe === 'quarter' ? 'Chỉ tiêu quý' : 'Chỉ tiêu năm'}
                          </span>
                          <p className="text-xs font-bold text-slate-700">
                            {formatValue(periodRevenueStats.totalTarget, 'VNĐ')} ({periodRevenueStats.pct.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Danh sách chỉ số */}
                    <div className="space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">CHI TIẾT CHỈ SỐ KPI ĐẠT ĐƯỢC</h4>
                      
                      {periodKpis.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                          {ranksTimeframe === 'month' 
                            ? `Chưa thiết lập chỉ số KPI nào cho vị trí này trong tháng ${ranksMonth.split('-')[1]}/${ranksMonth.split('-')[0]}`
                            : ranksTimeframe === 'quarter'
                              ? `Chưa thiết lập chỉ số KPI nào cho vị trí này trong Quý ${ranksQuarter}/${ranksYear}`
                              : `Chưa thiết lập chỉ số KPI nào cho vị trí này trong Năm ${ranksYear}`
                          }
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50/50">
                              <TableRow>
                                <TableHead className="text-xs">Chỉ số KPI</TableHead>
                                <TableHead className="text-right text-xs">
                                  {ranksTimeframe === 'month' ? 'Target tháng' : 'Target giai đoạn'}
                                </TableHead>
                                <TableHead className="text-right text-xs">Thực đạt</TableHead>
                                <TableHead className="text-right text-xs">Đạt %</TableHead>
                                <TableHead className="text-right text-xs">Điểm</TableHead>
                                <TableHead className="text-right text-xs">Trạng thái</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {periodKpis.map(kpi => {
                                const pctStr = (kpi.pct * 100).toFixed(1) + '%';
                                const scoreStr = (kpi.score * 100).toFixed(1) + '%';
                                
                                let statusText = 'Chưa nhập';
                                let statusColor = 'text-slate-400 bg-slate-50 border-slate-200';
                                if (kpi.actual > 0) {
                                    if (kpi.pct >= 1) {
                                      statusText = 'Đạt';
                                      statusColor = 'text-emerald-600 bg-emerald-50 border-emerald-200';
                                    } else {
                                      statusText = 'Chưa đạt';
                                      statusColor = 'text-rose-600 bg-rose-50 border-rose-200';
                                    }
                                }

                                return (
                                  <TableRow key={kpi.id}>
                                    <TableCell className="max-w-[150px] truncate text-left">
                                      <p className="font-bold text-slate-800 text-sm truncate" title={kpi.kpiName}>
                                        {kpi.kpiName}
                                      </p>
                                      <span className="text-xs text-slate-400 font-semibold">Trọng số: {(kpi.weight * 100)}%</span>
                                    </TableCell>
                                    <TableCell className="text-right font-sans font-bold text-sm">
                                      {formatValue(kpi.target, kpi.unit)}
                                    </TableCell>
                                    <TableCell className="text-right font-sans font-bold text-sm text-[#C21A1A]">
                                      {formatValue(kpi.actual, kpi.unit)}
                                    </TableCell>
                                    <TableCell className="text-right font-sans font-bold text-sm">
                                      {pctStr}
                                    </TableCell>
                                    <TableCell className="text-right font-sans font-bold text-sm text-blue-600">
                                      {scoreStr}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <span className={`inline-block text-xs font-bold px-1.5 py-0.5 rounded border ${statusColor}`}>
                                        {statusText}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>

                    {/* SVG mini chart (Chỉ hiển thị khi xem theo Tháng) */}
                    {ranksTimeframe === 'month' && staffConfigs.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">
                            BIỂU ĐỒ BIẾN ĐỘNG HẰNG NGÀY (THÁNG {parseInt(ranksMonth.split('-')[1])})
                          </h4>
                          
                          {/* Selector vẽ biểu đồ */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 font-medium">Chỉ số:</span>
                            <select
                              value={activeChartKpiId}
                              onChange={(e) => setActiveChartKpiId(e.target.value)}
                              className="bg-slate-50 border border-slate-200 font-bold text-xs px-2 py-1 rounded-lg text-slate-700 focus:outline-none cursor-pointer"
                            >
                              {staffConfigs.map(c => (
                                <option key={c.id} value={c.id}>{c.kpiName}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-stretch h-40 justify-between relative overflow-hidden">
                          
                          {/* Decorative background grid */}
                          <div className="absolute inset-0 flex flex-col justify-between py-6 pointer-events-none opacity-50">
                            <div className="border-b border-slate-200/50 w-full"></div>
                            <div className="border-b border-slate-200/50 w-full"></div>
                            <div className="border-b border-slate-200/50 w-full"></div>
                          </div>

                          {/* Sparkline curve */}
                          <div className="relative flex-1 w-full mt-2">
                            <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#C21A1A" stopOpacity="0.2"/>
                                  <stop offset="100%" stopColor="#C21A1A" stopOpacity="0.0"/>
                                </linearGradient>
                              </defs>
                              {(() => {
                                const targetKpi = staffConfigs.find(c => c.id === activeChartKpiId) || staffConfigs[0];
                                if (!targetKpi) return null;
                                
                                const dailyValues = Array.from({ length: daysInMonthCount }, (_, dayIdx) => {
                                  const day = dayIdx + 1;
                                  const dateStr = `${ranksMonth}-${day.toString().padStart(2, '0')}`;
                                  const record = kpiDailyValues.find(
                                    v => v.staffId === selectedStaff.id && v.kpiConfigId === targetKpi.id && v.date === dateStr
                                  );
                                  return record ? record.value : 0;
                                });

                                const maxVal = Math.max(...dailyValues, targetKpi.dailyTarget * 1.5, 1);
                                const points = dailyValues.map((val, idx) => {
                                  const x = (idx / (daysInMonthCount - 1)) * 300;
                                  const y = 80 - (val / maxVal) * 70;
                                  return `${x},${y}`;
                                });

                                const pathData = `M ${points.join(' L ')}`;
                                const fillData = `${pathData} L 300,80 L 0,80 Z`;

                                return (
                                  <>
                                    <path d={fillData} fill="url(#chartGrad)" />
                                    <path d={pathData} fill="none" stroke="#C21A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    {(() => {
                                      const targetY = 80 - (targetKpi.dailyTarget / maxVal) * 70;
                                      return (
                                        <line x1="0" y1={targetY} x2="300" y2={targetY} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3,3" />
                                      );
                                    })()}
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                          
                          {/* Legend axis */}
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mt-2 z-10">
                            <span>01/{ranksMonth.split('-')[1]}</span>
                            <span className="text-[#3b82f6]">Vạch target ngày (mốc đứt)</span>
                            <span>{daysInMonthCount.toString().padStart(2, '0')}/{ranksMonth.split('-')[1]}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                  </CardContent>
                </Card>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 4. TAB 2: NHẬP LIỆU HÀNG NGÀY (ACTION PLAN) */}
      {activeSubTab === 'entry' && selectedStaff && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <CardTitle className="text-base font-bold text-slate-800 tracking-wider">
                  NHẬP LIỆU ACTION PLAN KPI ({viewMode === 'month' ? 'THÁNG' : 'CHI TIẾT TUẦN'})
                </CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 mt-0.5">
                  Nhân viên báo cáo số thực tế đạt được hằng ngày của tháng. Click đúp vào ô thực tế trên bảng để sửa nhanh.
                </CardDescription>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* View Mode Toggle */}
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setViewMode('month');
                      setSelectedWeekNum(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${viewMode === 'month' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
                  >
                    Xem theo Tháng
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('week');
                      setSelectedWeekNum(1); // Default to Week 1
                    }}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${viewMode === 'week' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700 bg-transparent'}`}
                  >
                    Xem theo Tuần
                  </button>
                </div>

                {/* Week Selector (Only in week view mode) */}
                {viewMode === 'week' && (
                  <select
                    value={selectedWeekNum || 1}
                    onChange={(e) => setSelectedWeekNum(parseInt(e.target.value))}
                    className="bg-slate-50 border border-slate-200 font-bold text-xs px-3 py-2 rounded-xl text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value={1}>Tuần 1 (Ngày 01 - 07)</option>
                    <option value={2}>Tuần 2 (Ngày 08 - 14)</option>
                    <option value={3}>Tuần 3 (Ngày 15 - 21)</option>
                    <option value={4}>Tuần 4 (Ngày 22 - 28)</option>
                    {daysInMonthCount > 28 && (
                      <option value={5}>Tuần 5 (Ngày 29 - {daysInMonthCount})</option>
                    )}
                  </select>
                )}

                <div className="relative min-w-[180px]">
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 font-bold text-xs pl-3 pr-8 py-2.5 rounded-xl text-slate-700 focus:outline-none cursor-pointer appearance-none"
                  >
                    {staffMembers.filter(s => s.status === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.fullName} ({s.role})</option>
                    ))}
                  </select>
                </div>

                {/* Excel Export Button */}
                <Button 
                  onClick={() => {
                    if (selectedStaff) {
                      exportKpiReportToExcel(
                        selectedStaff.fullName,
                        selectedStaff.role,
                        selectedMonthYear,
                        staffConfigs,
                        kpiDailyValues.filter(v => v.staffId === selectedStaff.id)
                      );
                    }
                  }}
                  className="font-bold cursor-pointer h-[38px] rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  Xuất Excel
                </Button>

                <Button 
                  onClick={() => {
                    setIsEntryDialogOpen(true);
                    setFocusedKpiInputId(null);
                  }}
                  className="font-bold cursor-pointer h-[38px] rounded-xl text-xs"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Cập nhật số thực tế
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            
            {saveSuccessMsg && (
              <div className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-in fade-in duration-300 w-fit">
                <Check className="w-4 h-4 shrink-0" />
                {saveSuccessMsg}
              </div>
            )}

            {/* Back to month view button */}
            {viewMode === 'week' && (
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewMode('month');
                    setSelectedWeekNum(null);
                  }}
                  className="font-bold rounded-xl text-xs hover:bg-slate-50"
                >
                  ← Quay lại dạng Tháng
                </Button>
                <span className="text-xs text-slate-400 font-medium">Đang xem dữ liệu Tuần {selectedWeekNum}</span>
              </div>
            )}

            {/* Bảng tổng hợp theo Tháng / Tuần */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  BẢNG ACTION PLAN KPI CHI TIẾT ({viewMode === 'month' ? 'TÓM TẮT TUẦN' : '7 NGÀY CHI TIẾT'})
                </h4>
                {viewMode === 'month' && (
                  <span className="text-xs font-semibold text-slate-400">Click "Xem chi tiết" ở mỗi cột tuần để xem/sửa chi tiết từng ngày ➔</span>
                )}
              </div>

              {staffConfigs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-xl">
                  Nhân viên này chưa được cấu hình chỉ số KPI nào trong tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}. Hãy cấu hình ở tab Thiết lập.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <ScrollArea className="w-full">
                    <Table className="text-center font-sans text-sm">
                      {/* VIEW MODE: MONTH */}
                      {viewMode === 'month' && (
                        <>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-left w-48 sticky left-0 bg-slate-50 z-10 border-r shadow-xs text-xs">Chỉ số KPI</TableHead>
                              <TableHead className="w-20 border-r text-xs">Dòng</TableHead>
                              {[1, 2, 3, 4, 5].map(week => {
                                let dateRangeText = '';
                                if (week === 1) dateRangeText = '01-07';
                                else if (week === 2) dateRangeText = '08-14';
                                else if (week === 3) dateRangeText = '15-21';
                                else if (week === 4) dateRangeText = '22-28';
                                else if (week === 5) dateRangeText = `29-${daysInMonthCount}`;

                                return (
                                  <TableHead key={week} className="w-32 text-center border-r font-bold text-xs bg-slate-50">
                                    <div className="flex flex-col items-center gap-1.5 py-1">
                                      <span>Tuần {week} ({dateRangeText})</span>
                                      <button
                                        onClick={() => {
                                          setSelectedWeekNum(week);
                                          setViewMode('week');
                                        }}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md font-bold transition-all border-0 cursor-pointer"
                                      >
                                        Xem chi tiết
                                      </button>
                                    </div>
                                  </TableHead>
                                );
                              })}
                              <TableHead className="w-24 border-r text-right font-bold sticky right-[90px] bg-slate-50 border-l shadow-xs text-xs">Tổng</TableHead>
                              <TableHead className="w-20 border-r text-right font-bold sticky right-12 bg-slate-50 border-l shadow-xs text-xs">% Đạt</TableHead>
                              <TableHead className="w-12 text-center font-bold sticky right-0 bg-slate-50 border-l shadow-xs text-xs">Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffConfigs.map(config => {
                              const actuals = daysInMonth.map(day => {
                                const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
                                const record = kpiDailyValues.find(
                                  v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
                                );
                                return record ? record.value : 0;
                              });

                              const totalActual = actuals.reduce((sum, v) => sum + v, 0);
                              const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
                              const pctStr = (pct * 100).toFixed(0) + '%';
                              
                              let statusText = 'Chưa nhập';
                              let statusColor = 'bg-slate-50 text-slate-400 border-slate-200';
                              if (totalActual > 0) {
                                if (pct >= 1) {
                                  statusText = 'Đạt';
                                  statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                } else {
                                  statusText = 'Chưa đạt';
                                  statusColor = 'bg-rose-50 text-rose-600 border-rose-200';
                                }
                              }

                              return (
                                <React.Fragment key={config.id}>
                                  {/* Row Target */}
                                  <TableRow className="hover:bg-slate-50/20">
                                    <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r shadow-xs max-w-[192px] truncate" title={config.kpiName}>
                                      {config.kpiName}
                                    </TableCell>
                                    <TableCell className="border-r font-bold text-slate-450 bg-slate-50/30 text-xs">Mục tiêu</TableCell>
                                    {[1, 2, 3, 4, 5].map(week => {
                                      const weekTarget = getWeekTarget(config, week);
                                      return (
                                        <TableCell key={week} className="border-r text-slate-400 font-semibold text-center">
                                          {weekTarget.toLocaleString()}
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[90px] bg-white border-l shadow-xs">
                                      {config.monthlyTarget.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="border-r text-right font-bold text-slate-400 sticky right-12 bg-white border-l shadow-xs">-</TableCell>
                                    <TableCell className="sticky right-0 bg-white border-l shadow-xs font-bold text-slate-400">-</TableCell>
                                  </TableRow>
                                  
                                  {/* Row Actual */}
                                  <TableRow className="bg-amber-50/20 hover:bg-amber-50/40">
                                    <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-[#fefdfa] z-10 border-r shadow-xs max-w-[192px] truncate">
                                      <span className="text-xs text-amber-600 font-bold">↳ Thực tế</span>
                                    </TableCell>
                                    <TableCell className="border-r font-bold text-amber-700 bg-amber-50/50 text-xs">Thực tế</TableCell>
                                    {[1, 2, 3, 4, 5].map(week => {
                                      const weekAct = getWeekActual(config.id, week);
                                      return (
                                        <TableCell key={week} className={`border-r font-bold text-center ${weekAct > 0 ? 'text-amber-800' : 'text-slate-300'}`}>
                                          {weekAct > 0 ? weekAct.toLocaleString() : '-'}
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="border-r text-right font-bold text-slate-800 sticky right-[90px] bg-[#fefdfa] border-l shadow-xs">
                                      {totalActual.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="border-r text-right font-bold text-blue-600 sticky right-12 bg-[#fefdfa] border-l shadow-xs">
                                      {pctStr}
                                    </TableCell>
                                    <TableCell className="sticky right-0 bg-[#fefdfa] border-l shadow-xs">
                                      <span className={`inline-block text-xs font-bold px-1 py-0.5 rounded border ${statusColor}`}>
                                        {statusText}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </>
                      )}

                      {/* VIEW MODE: WEEK */}
                      {viewMode === 'week' && (
                        <>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead className="text-left w-48 sticky left-0 bg-slate-50 z-10 border-r shadow-xs text-xs">Chỉ số KPI</TableHead>
                              <TableHead className="w-20 border-r text-xs">Dòng</TableHead>
                              {getWeekDays(selectedWeekNum || 1).map(day => (
                                <TableHead key={day} className="w-16 min-w-[64px] text-center border-r font-bold text-xs bg-slate-50">
                                  Ngày {day.toString().padStart(2, '0')}/{selectedMonthYear.split('-')[1]}
                                </TableHead>
                              ))}
                              <TableHead className="w-24 border-r text-right font-bold sticky right-[202px] bg-slate-50 border-l shadow-xs text-xs">Tổng tuần</TableHead>
                              <TableHead className="w-24 border-r text-right font-bold sticky right-[112px] bg-slate-50 border-l shadow-xs text-xs">Tổng tháng</TableHead>
                              <TableHead className="w-18 border-r text-right font-bold sticky right-12 bg-slate-50 border-l shadow-xs text-xs">% Đạt</TableHead>
                              <TableHead className="w-12 text-center font-bold sticky right-0 bg-slate-50 border-l shadow-xs text-xs">Trạng thái</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {staffConfigs.map(config => {
                              const weekDaysList = getWeekDays(selectedWeekNum || 1);
                              const totalActual = daysInMonth.map(day => {
                                const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
                                const record = kpiDailyValues.find(
                                  v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
                                );
                                return record ? record.value : 0;
                              }).reduce((sum, v) => sum + v, 0);

                              const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
                              const pctStr = (pct * 100).toFixed(0) + '%';

                              let statusText = 'Chưa nhập';
                              let statusColor = 'bg-slate-50 text-slate-400 border-slate-200';
                              if (totalActual > 0) {
                                if (pct >= 1) {
                                  statusText = 'Đạt';
                                  statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                                } else {
                                  statusText = 'Chưa đạt';
                                  statusColor = 'bg-rose-50 text-rose-600 border-rose-200';
                                }
                              }

                              const weekTarget = getWeekTarget(config, selectedWeekNum || 1);
                              const weekAct = getWeekActual(config.id, selectedWeekNum || 1);

                              return (
                                <React.Fragment key={config.id}>
                                  {/* Row Target */}
                                  <TableRow className="hover:bg-slate-50/20">
                                    <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-white z-10 border-r shadow-xs max-w-[192px] truncate" title={config.kpiName}>
                                      {config.kpiName}
                                    </TableCell>
                                    <TableCell className="border-r font-bold text-slate-450 bg-slate-50/30 text-xs">Mục tiêu</TableCell>
                                    {weekDaysList.map(day => (
                                      <TableCell key={day} className="border-r text-slate-400 font-medium text-center">
                                        {config.monthlyTarget > 0 ? config.dailyTarget.toLocaleString() : '1'}
                                      </TableCell>
                                    ))}
                                    <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[202px] bg-white border-l shadow-xs">
                                      {weekTarget.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="border-r text-right font-bold text-slate-400 sticky right-[112px] bg-white border-l shadow-xs">
                                      {config.monthlyTarget.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="border-r text-right font-bold text-slate-400 sticky right-12 bg-white border-l shadow-xs">-</TableCell>
                                    <TableCell className="sticky right-0 bg-white border-l shadow-xs font-bold text-slate-400">-</TableCell>
                                  </TableRow>

                                  {/* Row Actual */}
                                  <TableRow className="bg-amber-50/20 hover:bg-amber-50/40">
                                    <TableCell className="text-left font-bold text-slate-700 sticky left-0 bg-[#fefdfa] z-10 border-r shadow-xs max-w-[192px] truncate">
                                      <span className="text-xs text-amber-600 font-bold">↳ Thực tế</span>
                                    </TableCell>
                                    <TableCell className="border-r font-bold text-amber-700 bg-amber-50/50 text-xs">Thực tế</TableCell>
                                    {weekDaysList.map(day => {
                                      const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
                                      const record = kpiDailyValues.find(
                                        v => v.staffId === selectedStaff.id && v.kpiConfigId === config.id && v.date === dateStr
                                      );
                                      const act = record ? record.value : 0;
                                      return (
                                        <TableCell
                                          key={day}
                                          onDoubleClick={() => {
                                            setSelectedDay(day);
                                            setIsEntryDialogOpen(true);
                                            setFocusedKpiInputId(config.id);
                                          }}
                                          className={`border-r font-bold cursor-pointer select-none hover:bg-amber-100/50 transition-colors text-center ${act > 0 ? 'text-amber-800' : 'text-slate-300'}`}
                                          title="Double-click để sửa số ngày này"
                                        >
                                          {act > 0 ? act.toLocaleString() : '-'}
                                        </TableCell>
                                      );
                                    })}
                                    <TableCell className="border-r text-right font-bold text-amber-800 sticky right-[202px] bg-[#fefdfa] border-l shadow-xs">
                                      {weekAct.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="border-r text-right font-bold text-slate-800 sticky right-[112px] bg-[#fefdfa] border-l shadow-xs">
                                      {totalActual.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="border-r text-right font-bold text-blue-600 sticky right-12 bg-[#fefdfa] border-l shadow-xs">
                                      {pctStr}
                                    </TableCell>
                                    <TableCell className="sticky right-0 bg-[#fefdfa] border-l shadow-xs">
                                      <span className={`inline-block text-xs font-bold px-1 py-0.5 rounded border ${statusColor}`}>
                                        {statusText}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                </React.Fragment>
                              );
                            })}
                          </TableBody>
                        </>
                      )}
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )}
            </div>

          </CardContent>
        </Card>
      )}

      {/* 5. TAB 3: THIẾT LẬP KPI CHUNG (ADMIN) */}
      {activeSubTab === 'settings' && (
        <Card>
          <CardHeader className="border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <CardTitle className="text-base font-bold text-slate-800 tracking-wider">CẤU HÌNH KPI THEO VAI TRÒ</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-400 mt-0.5">
                  Thiết lập các chỉ số, target tháng và trọng số áp dụng chung cho toàn bộ nhân sự theo vai trò.
                </CardDescription>
              </div>

              {/* Roles selection & Add button */}
              <div className="flex items-center gap-3">
                <div className="relative min-w-[200px]">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">Vai trò</span>
                  <select
                    value={selectedSettingRole}
                    onChange={(e) => {
                      setSelectedSettingRole(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 font-bold text-xs pl-16 pr-8 py-2.5 rounded-xl text-slate-700 focus:outline-none cursor-pointer appearance-none"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.code}>
                        {role.code} ({role.name})
                      </option>
                    ))}
                  </select>
                </div>

                <Button onClick={handleOpenAddConfigDialog} className="font-bold cursor-pointer h-[38px] rounded-xl text-xs">
                  <Plus className="w-4 h-4 mr-1" />
                  Thêm chỉ số KPI
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            
            {/* Danh sách chỉ số cấu hình */}
            <div className="space-y-3.5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-left">DANH SÁCH CHỈ SỐ ÁP DỤNG</h4>
              
              {(() => {
                const filteredConfigs = kpiConfigs.filter(
                  c => normalizeRole(c.role) === normalizeRole(selectedSettingRole) && (c.month || '2026-06') === selectedMonthYear
                );
                const totalWeight = filteredConfigs.reduce((sum, c) => sum + c.weight, 0);

                return (
                  <div className="space-y-3">
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <Table className="text-left text-sm">
                        <TableHeader className="bg-slate-50/50">
                          <TableRow>
                            <TableHead className="text-xs">Mục tiêu chung</TableHead>
                            <TableHead className="text-xs">Chỉ số KPI</TableHead>
                            <TableHead className="text-xs">Đơn vị</TableHead>
                            <TableHead className="text-right text-xs">Target tháng</TableHead>
                            <TableHead className="text-right text-xs">Target ngày (ước tính)</TableHead>
                            <TableHead className="text-right text-xs">Trọng số (%)</TableHead>
                            <TableHead className="text-xs">Nguồn đối chứng</TableHead>
                            <TableHead className="w-32 text-right text-xs">Thao tác</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredConfigs.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-6 text-slate-400 font-bold">
                                Vị trí này chưa được cấu hình chỉ số KPI nào trong tháng {selectedMonthYear.split('-')[1]}/{selectedMonthYear.split('-')[0]}
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredConfigs.map(config => (
                              <TableRow key={config.id}>
                                <TableCell className="font-semibold text-slate-500 text-sm">
                                  {config.goalName}
                                </TableCell>
                                <TableCell className="font-bold text-slate-800 text-sm">
                                  {config.kpiName}
                                </TableCell>
                                <TableCell className="text-sm">{config.unit}</TableCell>
                                <TableCell className="text-right font-sans font-bold text-sm">
                                  {formatValue(config.monthlyTarget, config.unit)}
                                </TableCell>
                                <TableCell className="text-right font-sans text-slate-400 font-semibold text-sm">
                                  {formatValue(config.dailyTarget, config.unit)}
                                </TableCell>
                                <TableCell className="text-right font-sans font-bold text-blue-600 text-sm">
                                  {`${(config.weight * 100)}%`}
                                </TableCell>
                                <TableCell className="text-slate-500 text-xs">
                                  {config.proofSource}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button variant="ghost" size="icon-xs" onClick={() => handleOpenViewConfigDialog(config)} className="cursor-pointer" title="Xem chi tiết">
                                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                                    </Button>
                                    <Button variant="ghost" size="icon-xs" onClick={() => handleOpenEditConfigDialog(config)} className="cursor-pointer" title="Chỉnh sửa">
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                    </Button>
                                    <Button variant="destructive" size="icon-xs" onClick={() => handleDeleteConfig(config.id)} className="cursor-pointer" title="Xóa">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex justify-between items-center text-xs font-bold text-slate-600">
                      <span>Tổng số chỉ số: {filteredConfigs.length}</span>
                      <span className={`flex items-center gap-1 ${totalWeight === 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        <Sparkles className="w-4 h-4 shrink-0" />
                        Tổng trọng số vị trí: {(totalWeight * 100).toFixed(0)}%
                        {totalWeight !== 1 && ' (Khuyên dùng: Đảm bảo tổng trọng số đạt 100%)'}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

          </CardContent>
        </Card>
      )}

      {/* 6. DIALOG THÊM / SỬA / XEM KPI CONFIGS */}
      <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
        <DialogContent className="sm:max-w-[550px] p-6 md:p-7 rounded-3xl border-0 shadow-xl bg-white/95 backdrop-blur-md overflow-hidden text-left">
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-base font-bold text-slate-900 tracking-wide">
              {configDialogMode === 'view' 
                ? 'Chi tiết chỉ số KPI' 
                : configDialogMode === 'edit' 
                  ? 'Chỉnh sửa chỉ số KPI' 
                  : 'Thêm chỉ số KPI mới'
              }
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-400 mt-1 leading-normal">
              {configDialogMode === 'view'
                ? `Xem cấu hình chỉ số chung cho vị trí ${selectedSettingRole}`
                : configDialogMode === 'edit'
                  ? `Cập nhật cấu hình chỉ số chung cho vị trí ${selectedSettingRole}`
                  : `Tạo chỉ số KPI mới áp dụng chung cho vị trí ${selectedSettingRole}`
              }
            </DialogDescription>
          </DialogHeader>

          {/* Form quản lý nhập liệu */}
          <form onSubmit={handleFormSubmit} className="space-y-4 pt-3 text-left">
            
            {/* Block 1: Thông tin chỉ số KPI */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <Target className="w-4 h-4 text-blue-500 shrink-0" />
                Thông tin chỉ số KPI
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Tên chỉ số KPI *</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Doanh số cá nhân đạt mục tiêu"
                  value={formKpi}
                  onChange={(e) => setFormKpi(e.target.value)}
                  disabled={configDialogMode === 'view'}
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 placeholder:text-slate-400 placeholder:font-normal text-slate-800 disabled:opacity-75 disabled:bg-slate-150"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wide">Đơn vị đo lường</label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    disabled={configDialogMode === 'view'}
                    className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 cursor-pointer text-slate-700 disabled:opacity-75 disabled:bg-slate-150"
                  >
                    <option value="VNĐ">VNĐ</option>
                    <option value="Đơn">Đơn</option>
                    <option value="Khách">Khách</option>
                    <option value="Đánh giá">Đánh giá</option>
                    <option value="Ca">Ca</option>
                    <option value="Máy">Máy</option>
                    <option value="Ngày">Ngày</option>
                    <option value="%">%</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 tracking-wide">Trọng số KPI (%) *</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 45"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    disabled={configDialogMode === 'view'}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 placeholder:text-slate-400 placeholder:font-normal text-slate-800 disabled:opacity-75 disabled:bg-slate-150"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Vai trò áp dụng</label>
                <input
                  type="text"
                  value={selectedSettingRole}
                  disabled
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold bg-slate-100 text-slate-500"
                />
              </div>
            </div>

            {/* Block 2: Chỉ tiêu & Đối chứng */}
            <div className="border border-slate-200/80 rounded-2xl p-4 bg-slate-50/30 space-y-3.5">
              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
                <Award className="w-4 h-4 text-emerald-500 shrink-0" />
                Chỉ tiêu & Đối chứng
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Tên nhóm mục tiêu</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tăng kết quả kinh doanh"
                  value={formGoal}
                  onChange={(e) => setFormGoal(e.target.value)}
                  disabled={configDialogMode === 'view'}
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 placeholder:text-slate-400 placeholder:font-normal text-slate-800 disabled:opacity-75 disabled:bg-slate-150"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Chỉ tiêu tháng *</label>
                <input
                  type="number"
                  placeholder="Ví dụ: 450000000"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  disabled={configDialogMode === 'view'}
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 placeholder:text-slate-400 placeholder:font-normal text-slate-800 disabled:opacity-75 disabled:bg-slate-150"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Nguồn đối chứng</label>
                <input
                  type="text"
                  placeholder="Ví dụ: KiotViet theo nhân viên"
                  value={formProof}
                  onChange={(e) => setFormProof(e.target.value)}
                  disabled={configDialogMode === 'view'}
                  className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:bg-white focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 placeholder:text-slate-400 placeholder:font-normal text-slate-800 disabled:opacity-75 disabled:bg-slate-150"
                />
              </div>

              {/* Nhãn tính toán Target ngày */}
              {formTarget && (
                <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 font-semibold flex items-center justify-between">
                  <span>Target ngày ước tính:</span>
                  <span className="font-bold text-sm">
                    {formatValue(Math.round((parseFloat(formTarget) || 0) / daysInMonthCount), formUnit)} / ngày
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-2.5">
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="font-bold cursor-pointer h-10 px-5 rounded-xl text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  {configDialogMode === 'view' ? 'Đóng' : 'Hủy bỏ'}
                </Button>
              </DialogClose>
              {configDialogMode !== 'view' && (
                <button 
                  type="submit" 
                  className="h-10 px-6 bg-[#C21A1A] hover:bg-[#A51414] active:scale-95 text-white font-bold rounded-xl shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center cursor-pointer border-0 text-xs"
                >
                  {configDialogMode === 'edit' ? 'Lưu thay đổi' : 'Tạo chỉ số'}
                </button>
              )}
            </div>
            
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. DIALOG NHẬP SỐ THỰC TẾ HẰNG NGÀY (Tab 2 - Option B + C) */}
      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-6 md:p-7 rounded-3xl border-0 shadow-xl bg-white/95 backdrop-blur-md overflow-hidden text-left">
          <DialogHeader className="text-left pb-2">
            <DialogTitle className="text-base font-bold text-slate-900 tracking-wide">
              Nhập số thực tế hằng ngày
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-400 mt-1 leading-normal">
              Báo cáo kết quả và số liệu thực tế đạt được của nhân sự
            </DialogDescription>
          </DialogHeader>

          {/* Form quản lý báo cáo */}
          <form onSubmit={async (e) => {
            e.preventDefault();
            await handleSaveDayValues();
            setIsEntryDialogOpen(false);
          }} className="space-y-4 pt-3 text-left">
            
            <div className="grid grid-cols-2 gap-3.5">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Nhân viên</label>
                <div className="h-10 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 flex items-center">
                  {selectedStaff?.fullName}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 tracking-wide">Ngày báo cáo</label>
                <select
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-[#C21A1A] focus:ring-2 focus:ring-red-100 transition-all bg-slate-50/50 cursor-pointer text-slate-700"
                >
                  {daysInMonth.map(day => (
                    <option key={day} value={day}>Ngày {day.toString().padStart(2, '0')}/{selectedMonthYear.split('-')[1]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1 mt-2 scrollbar-thin">
              {staffConfigs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-bold border border-dashed border-slate-200 rounded-2xl">
                  Nhân viên này chưa được cấu hình chỉ số KPI nào.
                </div>
              ) : (
                staffConfigs.map(config => (
                  <div key={config.id} className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl flex flex-col justify-between gap-3 text-left hover:bg-slate-50 transition-all">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{config.goalName}</span>
                      <h4 className="text-xs font-bold text-slate-800 leading-tight mt-0.5">{config.kpiName}</h4>
                      <p className="text-xs font-medium text-slate-400 mt-1">
                        Mục tiêu ngày: <span className="text-slate-700 font-bold">{formatValue(config.dailyTarget, config.unit)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nhập số thực tế..."
                        value={entryValues[config.id] || ''}
                        ref={(el) => {
                          if (el && focusedKpiInputId === config.id && isEntryDialogOpen) {
                            setTimeout(() => el.focus(), 150);
                            setFocusedKpiInputId(null);
                          }
                        }}
                        onChange={(e) => setEntryValues({ ...entryValues, [config.id]: e.target.value })}
                        className="flex-1 h-10 px-3.5 bg-amber-50/40 border border-amber-200 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 font-sans font-bold text-sm text-slate-800 rounded-xl outline-none transition-all shadow-xs placeholder:font-normal"
                      />
                      <span className="text-xs font-bold text-slate-400 w-10 shrink-0">{config.unit}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 flex items-center justify-end gap-2.5">
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="font-bold cursor-pointer h-10 px-5 rounded-xl text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                  Hủy bỏ
                </Button>
              </DialogClose>
              {staffConfigs.length > 0 && (
                <button 
                  type="submit" 
                  className="h-10 px-6 bg-[#C21A1A] hover:bg-[#A51414] active:scale-95 text-white font-bold rounded-xl shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center cursor-pointer border-0 text-xs"
                >
                  Lưu báo cáo
                </button>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
