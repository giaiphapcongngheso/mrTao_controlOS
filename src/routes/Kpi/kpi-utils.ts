import type { KPIConfig, KPIDailyValue, StaffRank } from '../../types/kpi.types';
import type { StaffMember } from '../../types/staff.types';

// ─── Role Normalization ────────────────────────────────────────
export const normalizeRole = (r: string): string => {
  if (!r) return '';
  const norm = r.toUpperCase().replace(/_/g, '').trim();
  if (norm === 'QUAN_LY' || norm === 'QUANLY' || norm === 'MANAGER') return 'QUAN_LY';
  if (norm === 'SALES' || norm === 'BAN_HANG' || norm === 'BANHANG') return 'SALES';
  if (norm === 'KY_THUAT' || norm === 'KYTHUAT' || norm === 'TECH') return 'KỸ_THUẬT';
  if (norm === 'KHO' || norm === 'WAREHOUSE') return 'KHO';
  return norm;
};

// ─── Classification Helpers ────────────────────────────────────
export type Classification = 'excellent' | 'good' | 'pass' | 'needs_improvement';

export const translateClassification = (cls: string): string => {
  if (cls === 'excellent') return 'Xuất sắc';
  if (cls === 'good') return 'Tốt';
  if (cls === 'pass') return 'Khá';
  return 'Chưa đạt';
};

export const getClassificationBadgeClass = (cls: string): string => {
  if (cls === 'excellent') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (cls === 'good') return 'bg-blue-50 text-blue-600 border-blue-200';
  if (cls === 'pass') return 'bg-amber-50 text-amber-600 border-amber-200';
  return 'bg-rose-50 text-rose-600 border-rose-200';
};

export const getScoreClassification = (score: number): Classification => {
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 70) return 'pass';
  return 'needs_improvement';
};

// ─── KPI Status Helpers ────────────────────────────────────────
export interface KpiStatusInfo {
  text: string;
  colorClass: string;
}

export const getKpiStatus = (actual: number, pct: number): KpiStatusInfo => {
  if (actual <= 0) {
    return { text: 'Chưa nhập', colorClass: 'text-slate-400 bg-slate-50 border-slate-200' };
  }
  if (pct >= 1) {
    return { text: 'Đạt', colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  }
  return { text: 'Chưa đạt', colorClass: 'text-rose-600 bg-rose-50 border-rose-200' };
};

// ─── Date / Month Helpers ──────────────────────────────────────
export const getPreviousMonthYear = (monthYearStr: string): string => {
  const [year, month] = monthYearStr.split('-').map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  return `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
};

export const getDaysInMonthCount = (monthYearStr: string): number => {
  const [year, month] = monthYearStr.split('-').map(Number);
  return new Date(year, month, 0).getDate();
};

export const buildDaysArray = (count: number): number[] =>
  Array.from({ length: count }, (_, i) => i + 1);

export const buildMonthOptions = (year: number = 2026): { value: string; label: string }[] =>
  Array.from({ length: 12 }, (_, i) => {
    const m = (i + 1).toString().padStart(2, '0');
    return { value: `${year}-${m}`, label: `Tháng ${m}/${year}` };
  });

// ─── Period Months Calculator ──────────────────────────────────
export type RanksTimeframe = 'month' | 'quarter' | 'year';

export const calculatePeriodMonths = (
  timeframe: RanksTimeframe,
  month: string,
  quarter: number,
  year: number
): string[] => {
  if (timeframe === 'month') return [month];
  if (timeframe === 'quarter') {
    return [
      `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}`,
      `${year}-${String((quarter - 1) * 3 + 2).padStart(2, '0')}`,
      `${year}-${String((quarter - 1) * 3 + 3).padStart(2, '0')}`,
    ];
  }
  // year
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
};

// ─── Value Formatting ──────────────────────────────────────────
export const formatValue = (val: number, unit: string): string => {
  if (unit === 'VNĐ') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }
  return `${val.toLocaleString()} ${unit}`;
};

// ─── Week Helpers ──────────────────────────────────────────────
export const getWeekDays = (weekNum: number, daysInMonthCount: number): number[] => {
  const ranges: Record<number, [number, number]> = {
    1: [1, 7],
    2: [8, 14],
    3: [15, 21],
    4: [22, 28],
    5: [29, daysInMonthCount],
  };
  const [start, end] = ranges[weekNum] || [1, 7];
  const days: number[] = [];
  for (let d = start; d <= end; d++) {
    days.push(d);
  }
  return days;
};

export const getWeekActual = (
  configId: string,
  weekNum: number,
  daysInMonthCount: number,
  selectedMonthYear: string,
  staffId: string,
  kpiDailyValues: KPIDailyValue[]
): number => {
  const days = getWeekDays(weekNum, daysInMonthCount);
  let total = 0;
  days.forEach(day => {
    const dateStr = `${selectedMonthYear}-${day.toString().padStart(2, '0')}`;
    const record = kpiDailyValues.find(
      v => v.staffId === staffId && v.kpiConfigId === configId && v.date === dateStr
    );
    if (record) total += record.value;
  });
  return total;
};

export const getWeekTarget = (config: KPIConfig, weekNum: number, daysInMonthCount: number): number => {
  const days = getWeekDays(weekNum, daysInMonthCount).length;
  return config.monthlyTarget > 0 ? (config.dailyTarget * days) : days;
};

// ─── Avatar Fallback URL ───────────────────────────────────────
export const getAvatarUrl = (avatar: string | undefined, username: string): string =>
  avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${username}`;

// ─── Dynamic Rank Calculator ───────────────────────────────────
export const calculateDynamicStaffRanks = (
  staffMembers: StaffMember[],
  kpiConfigs: KPIConfig[],
  kpiDailyValues: KPIDailyValue[],
  periodMonths: string[]
): StaffRank[] => {
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

    return {
      storeId: staff.storeId,
      staffId: staff.id,
      name: staff.fullName,
      role: staff.role,
      score: finalScore,
      classification: getScoreClassification(finalScore),
      avatar: getAvatarUrl(staff.avatar, staff.username),
    };
  });

  return ranks.sort((a, b) => b.score - a.score);
};

// ─── Period KPI Detail Calculator ──────────────────────────────
export interface PeriodKpiDetail {
  id: string;
  kpiName: string;
  unit: string;
  weight: number;
  target: number;
  actual: number;
  pct: number;
  score: number;
}

export const calculatePeriodKpis = (
  staffId: string,
  staffRole: string,
  kpiConfigs: KPIConfig[],
  kpiDailyValues: KPIDailyValue[],
  periodMonths: string[]
): PeriodKpiDetail[] => {
  const roleNorm = normalizeRole(staffRole);

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
      .filter(v => v.staffId === staffId && v.kpiConfigId === config.id && v.date.startsWith(config.month || '2026-06'))
      .reduce((sum, item) => sum + item.value, 0);

    if (!groups[key]) {
      groups[key] = {
        kpiName: config.kpiName,
        unit: config.unit,
        weight: config.weight,
        totalTarget: config.monthlyTarget,
        totalActual: actual,
        count: 1,
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
      score,
    };
  });
};

// ─── Revenue Stats Calculator ──────────────────────────────────
export interface RevenueStats {
  totalTarget: number;
  totalActual: number;
  pct: number;
  hasRevenue: boolean;
}

export const calculateRevenueStats = (
  staffId: string,
  staffRole: string,
  kpiConfigs: KPIConfig[],
  kpiDailyValues: KPIDailyValue[],
  periodMonths: string[]
): RevenueStats => {
  const roleNorm = normalizeRole(staffRole);

  const vnKpis = kpiConfigs.filter(c =>
    normalizeRole(c.role) === roleNorm &&
    c.unit === 'VNĐ' &&
    periodMonths.includes(c.month || '2026-06')
  );

  const totalTarget = vnKpis.reduce((sum, c) => sum + c.monthlyTarget, 0);
  const totalActual = vnKpis.reduce((sum, c) => {
    const actual = kpiDailyValues
      .filter(v => v.staffId === staffId && v.kpiConfigId === c.id && v.date.startsWith(c.month || '2026-06'))
      .reduce((s, item) => s + item.value, 0);
    return sum + actual;
  }, 0);

  const pct = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  return { totalTarget, totalActual, pct, hasRevenue: vnKpis.length > 0 };
};

// ─── KpiView Props Interface (shared between container + tabs) ─
export interface KpiViewProps {
  roles: import('../../types/staff.types').StaffRole[];
  staffMembers: StaffMember[];
  kpiConfigs: KPIConfig[];
  kpiDailyValues: KPIDailyValue[];
  onCreateConfig: (newConfig: KPIConfig) => Promise<any>;
  onUpdateConfig: (config: KPIConfig) => Promise<any>;
  onDeleteConfig: (configId: string) => Promise<any>;
  onSaveDailyValue: (val: KPIDailyValue) => Promise<any>;
  onSetTab: (tab: any) => void;
}
