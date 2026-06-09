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

  // Helper functions for cell formatting
  const createNumberCell = (val: number, unit: string) => {
    if (unit === 'VNĐ') {
      return { v: val, t: 'n', z: '#,##0" đ"' };
    }
    if (unit === '%') {
      return { v: val / 100, t: 'n', z: '0.0%' };
    }
    return { v: val, t: 'n', z: `#,##0" ${unit}"` };
  };

  const createPercentCell = (val: number) => {
    return { v: val / 100, t: 'n', z: '0.0%' };
  };

  const createWeightCell = (val: number) => {
    return { v: val, t: 'n', z: '0%' };
  };

  // 1. Create workbook and data array
  const data: any[][] = [];

  // Row 1: Header title
  data.push([`BẢNG TIẾN ĐỘ KPI NHÂN VIÊN - THÁNG ${monthYear}`]);

  // Row 2: Staff info
  data.push([`Nhân viên: ${staffName}   |   Vai trò: ${role}   |   Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`]);

  // Row 3: Empty spacer row for better UI breathing space
  data.push([]);

  // Row 4: Table headers
  const dayHeaders: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dayHeaders.push(`${String(d).padStart(2, '0')}/${mmStr}`);
  }

  const headers = [
    'Chỉ số KPI',
    'Trọng số',
    'Phân loại',
    ...dayHeaders,
    'Tổng cộng',
    'Đạt %'
  ];
  data.push(headers);

  // 4. Populate rows for each configuration
  configs.forEach(config => {
    // Target Row
    const targetDailyCells = Array.from({ length: daysInMonth }, () => createNumberCell(config.dailyTarget, config.unit));
    const targetRow = [
      { v: config.kpiName, t: 's' },
      createWeightCell(config.weight),
      { v: 'Mục tiêu', t: 's' },
      ...targetDailyCells,
      createNumberCell(config.monthlyTarget, config.unit),
      { v: '-', t: 's' }
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

    const actualDailyCells = actualDailyValues.map(v => createNumberCell(v, config.unit));
    const pctReached = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) * 100 : 0;
    const actualRow = [
      { v: config.kpiName, t: 's' },
      createWeightCell(config.weight),
      { v: 'Thực tế', t: 's' },
      ...actualDailyCells,
      createNumberCell(totalActual, config.unit),
      createPercentCell(pctReached)
    ];
    data.push(actualRow);
  });

  // Calculate total KPI Score for the summary row
  let totalWeight = 0;
  let totalScore = 0;
  configs.forEach(config => {
    totalWeight += config.weight;
    
    let totalActual = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = `${year}-${mmStr}-${String(d).padStart(2, '0')}`;
      const dayValue = dailyValues
        .filter(v => v.kpiConfigId === config.id && v.date === dayStr)
        .reduce((sum, item) => sum + item.value, 0);
      totalActual += dayValue;
    }
    const pct = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) : 0;
    const score = Math.min(config.weight, config.weight * pct);
    totalScore += score;
  });

  // Empty separator row
  data.push([]);

  // Summary Row
  const summaryRow = [
    { v: 'ĐIỂM HIỆU SUẤT KPI TỔNG HỢP', t: 's' },
    createWeightCell(totalWeight),
    { v: 'Đạt lũy kế', t: 's' },
    ...Array.from({ length: daysInMonth }, () => ({ v: '', t: 's' })),
    { v: '', t: 's' },
    createPercentCell(totalScore * 100)
  ];
  data.push(summaryRow);

  // Convert to worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Define merges (Title & Info block)
  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }
  ];

  // Helper to calculate estimated string length for columns auto-fit
  const getCellValueString = (cell: any): string => {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'object' && cell !== null) {
      if (cell.v !== null && cell.v !== undefined) {
        if (cell.t === 'n' && typeof cell.v === 'number') {
          if (cell.z && cell.z.includes('đ')) {
            return cell.v.toLocaleString('vi-VN') + ' đ';
          }
          if (cell.z && cell.z.includes('%')) {
            return (cell.v * 100).toFixed(1) + '%';
          }
          return cell.v.toLocaleString();
        }
        return String(cell.v);
      }
      return '';
    }
    return String(cell);
  };

  // 5. Calculate column widths dynamically
  const colWidths = headers.map((header, colIdx) => {
    let maxLength = header.length;
    // Skip title, info, and spacer rows (indices 0, 1, 2)
    for (let rowIdx = 3; rowIdx < data.length; rowIdx++) {
      const cellStr = getCellValueString(data[rowIdx][colIdx]);
      if (cellStr.length > maxLength) {
        maxLength = cellStr.length;
      }
    }
    return { wch: Math.min(Math.max(maxLength + 3, 8), 50) };
  });
  worksheet['!cols'] = colWidths;

  // 6. Set custom row heights for breathing space
  worksheet['!rows'] = data.map((row, idx) => {
    if (idx === 0) return { hpx: 32 }; // Title
    if (idx === 1) return { hpx: 22 }; // Info
    if (idx === 2) return { hpx: 12 }; // Spacer
    if (idx === 3) return { hpx: 28 }; // Headers
    if (idx === data.length - 1) return { hpx: 26 }; // Summary Row
    if (idx === data.length - 2) return { hpx: 12 }; // Summary Spacer
    return { hpx: 20 }; // Normal rows
  });

  // 7. Create workbook and save
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Report');

  const fileName = `kpi_report_${staffName}_${monthYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
