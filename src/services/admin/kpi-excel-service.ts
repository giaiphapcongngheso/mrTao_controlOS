import * as XLSX from 'xlsx';
import type { KPIConfig, KPIDailyValue } from '../../types/kpi.types';

/**
 * Parses the monthYear string (e.g. "YYYY-MM", "MM/YYYY", "MM-YYYY") and returns the year, month, and number of days.
 * @param monthYear String representing month and year
 */
export function parseMonthYear(monthYear: string): { year: number; month: number; daysInMonth: number } {
  let year = new Date().getFullYear();
  let month = new Date().getMonth() + 1;

  if (monthYear.includes('-')) {
    const parts = monthYear.split('-');
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    } else {
      month = parseInt(parts[0], 10);
      year = parseInt(parts[1], 10);
    }
  } else if (monthYear.includes('/')) {
    const parts = monthYear.split('/');
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
    } else {
      month = parseInt(parts[0], 10);
      year = parseInt(parts[1], 10);
    }
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  return { year, month, daysInMonth };
}

/**
 * Exports KPI values of a staff member in a month to Excel.
 * 
 * @param staffName Name of the staff member
 * @param role Role/Position of the staff member
 * @param monthYear Month and year (e.g. "06/2026", "2026-06")
 * @param configs List of KPI configs applicable to the staff role
 * @param dailyValues Daily values recorded for the staff member
 */
export function exportKpiReportToExcel(
  staffName: string,
  role: string,
  monthYear: string,
  configs: KPIConfig[],
  dailyValues: KPIDailyValue[]
): void {
  const { year, month, daysInMonth } = parseMonthYear(monthYear);
  const mmStr = String(month).padStart(2, '0');

  // 1. Create workbook and worksheet
  const data: any[][] = [];

  // Row 1: Header title
  data.push([`BẢNG TIẾN ĐỘ KPI NHÂN VIÊN - THÁNG ${monthYear}`]);

  // Row 2: Staff info
  data.push([`Nhân viên: ${staffName} - Vai trò: ${role}`]);

  // Row 3: Table headers
  const dayHeaders: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders.push(`${String(d).padStart(2, '0')}/${mmStr}`);
  }

  const headers = [
    'Chỉ số KPI',
    'Trọng số',
    'Loại',
    ...dayHeaders,
    'Tổng cộng',
    'Đạt %'
  ];
  data.push(headers);

  // 4. Populate rows for each configuration
  configs.forEach(config => {
    // Target Row
    const targetDailyValues: number[] = Array.from({ length: daysInMonth }, () => config.dailyTarget);
    const targetRow = [
      config.kpiName,
      `${(config.weight * 100).toFixed(0)}%`,
      'Mục tiêu',
      ...targetDailyValues,
      config.monthlyTarget,
      '-'
    ];
    data.push(targetRow);

    // Actual Row
    const actualDailyValues: number[] = [];
    let totalActual = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${mmStr}-${String(d).padStart(2, '0')}`;
      const dayValue = dailyValues
        .filter(v => v.kpiConfigId === config.id && v.date === dayStr)
        .reduce((sum, item) => sum + item.value, 0);

      actualDailyValues.push(dayValue);
      totalActual += dayValue;
    }

    const pctReached = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) * 100 : 0;
    const actualRow = [
      config.kpiName,
      `${(config.weight * 100).toFixed(0)}%`,
      'Thực tế',
      ...actualDailyValues,
      totalActual,
      `${pctReached.toFixed(1)}%`
    ];
    data.push(actualRow);
  });

  // Convert to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // 5. Calculate column widths dynamically just like in LogsTabContent.tsx
  const colWidths = headers.map((header, colIdx) => {
    let maxLength = header.length;
    // Skip title and info rows (indices 0 and 1)
    for (let rowIdx = 2; rowIdx < data.length; rowIdx++) {
      const cellValue = String(data[rowIdx][colIdx] ?? '');
      if (cellValue.length > maxLength) {
        maxLength = cellValue.length;
      }
    }
    return { wch: Math.min(Math.max(maxLength + 3, 10), 60) };
  });

  worksheet['!cols'] = colWidths;

  // 6. Create workbook and save
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Report');

  const fileName = `kpi_report_${staffName}_${monthYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
