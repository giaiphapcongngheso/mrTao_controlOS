import * as XLSX from 'xlsx-js-style';
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
 * Exports KPI values of a staff member in a month to Excel with custom styling.
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

  // --- BRAND STYLING DEFINITIONS (mrTao Red theme) ---
  const FONT_FAMILY = 'Segoe UI';

  const titleStyle = {
    font: { name: FONT_FAMILY, sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: 'C21A1A' } }, // mrTao primary red
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  const infoStyle = {
    font: { name: FONT_FAMILY, sz: 10, italic: true, color: { rgb: '475569' } },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  // Header styles
  const headerStyle = {
    font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'E2E8F0' } }, // slate-200 background
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '94A3B8' } },
      bottom: { style: 'medium', color: { rgb: '475569' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } }
    }
  };

  const headerLeftStyle = {
    ...headerStyle,
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true }
  };

  // Target Row (Mục tiêu) styles
  const targetBorder = {
    top: { style: 'thin', color: { rgb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
    left: { style: 'thin', color: { rgb: 'E2E8F0' } },
    right: { style: 'thin', color: { rgb: 'E2E8F0' } }
  };

  const targetTextStyle = {
    font: { name: FONT_FAMILY, sz: 9.5, italic: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: 'F8FAFC' } }, // slate-50 background
    alignment: { horizontal: 'left', vertical: 'center' },
    border: targetBorder
  };

  const targetValueStyle = {
    font: { name: FONT_FAMILY, sz: 9.5, italic: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: targetBorder
  };

  const targetCenterStyle = {
    font: { name: FONT_FAMILY, sz: 9.5, italic: true, color: { rgb: '475569' } },
    fill: { fgColor: { rgb: 'F8FAFC' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: targetBorder
  };

  // Actual Row (Thực tế) styles
  const actualBorder = {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { rgb: '94A3B8' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } }
  };

  const actualTextStyle = {
    font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: actualBorder
  };

  const actualValueStyle = {
    font: { name: FONT_FAMILY, sz: 10, bold: true, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: actualBorder
  };

  const actualCenterStyle = {
    font: { name: FONT_FAMILY, sz: 10, color: { rgb: '0F172A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: actualBorder
  };

  // Summary Row styles (Tổng hợp)
  const summaryTextStyle = {
    font: { name: FONT_FAMILY, sz: 11, bold: true, color: { rgb: '991B1B' } },
    fill: { fgColor: { rgb: 'FEE2E2' } }, // red-100 background
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: 'FCA5A5' } },
      bottom: { style: 'double', color: { rgb: 'B91C1C' } },
      left: { style: 'thin', color: { rgb: 'FCA5A5' } },
      right: { style: 'thin', color: { rgb: 'FCA5A5' } }
    }
  };

  const summaryValueStyle = {
    font: { name: FONT_FAMILY, sz: 11, bold: true, color: { rgb: '991B1B' } },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: 'FCA5A5' } },
      bottom: { style: 'double', color: { rgb: 'B91C1C' } },
      left: { style: 'thin', color: { rgb: 'FCA5A5' } },
      right: { style: 'thin', color: { rgb: 'FCA5A5' } }
    }
  };

  const summaryCenterStyle = {
    font: { name: FONT_FAMILY, sz: 11, color: { rgb: '991B1B' } },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: 'FCA5A5' } },
      bottom: { style: 'double', color: { rgb: 'B91C1C' } },
      left: { style: 'thin', color: { rgb: 'FCA5A5' } },
      right: { style: 'thin', color: { rgb: 'FCA5A5' } }
    }
  };

  // Helper functions for cell formatting with style mapping
  const createNumberCell = (val: number, unit: string, isActual: boolean) => {
    const style = isActual ? actualValueStyle : targetValueStyle;
    if (unit === 'VNĐ') {
      return { v: val, t: 'n', z: '#,##0" đ"', s: style };
    }
    if (unit === '%') {
      return { v: val / 100, t: 'n', z: '0.0%', s: style };
    }
    return { v: val, t: 'n', z: `#,##0" ${unit}"`, s: style };
  };

  const createPercentCell = (val: number, isActual: boolean) => {
    return { v: val / 100, t: 'n', z: '0.0%', s: isActual ? actualValueStyle : targetValueStyle };
  };

  const createWeightCell = (val: number, isActual: boolean) => {
    return { v: val, t: 'n', z: '0%', s: isActual ? actualValueStyle : targetValueStyle };
  };

  // 1. Initialize data array
  const data: any[][] = [];

  // Row 1: Header title (merged later)
  data.push([
    { v: `BẢNG TIẾN ĐỘ KPI NHÂN VIÊN - THÁNG ${monthYear}`, t: 's', s: titleStyle }
  ]);

  // Row 2: Staff info (merged later)
  data.push([
    { v: `Nhân viên: ${staffName}   |   Vai trò: ${role}   |   Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, t: 's', s: infoStyle }
  ]);

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

  const headerRow = headers.map((h, idx) => {
    const isFirst = idx === 0;
    return {
      v: h,
      t: 's',
      s: isFirst ? headerLeftStyle : headerStyle
    };
  });
  data.push(headerRow);

  // 4. Populate rows for each configuration
  configs.forEach(config => {
    // Target Row
    const targetDailyCells = Array.from({ length: daysInMonth }, () => 
      createNumberCell(config.dailyTarget, config.unit, false)
    );
    const targetRow = [
      { v: config.kpiName, t: 's', s: targetTextStyle },
      createWeightCell(config.weight, false),
      { v: 'Mục tiêu', t: 's', s: targetCenterStyle },
      ...targetDailyCells,
      createNumberCell(config.monthlyTarget, config.unit, false),
      { v: '-', t: 's', s: targetCenterStyle }
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

    const actualDailyCells = actualDailyValues.map(v => 
      createNumberCell(v, config.unit, true)
    );
    const pctReached = config.monthlyTarget > 0 ? (totalActual / config.monthlyTarget) * 100 : 0;
    const actualRow = [
      { v: config.kpiName, t: 's', s: actualTextStyle },
      createWeightCell(config.weight, true),
      { v: 'Thực tế', t: 's', s: actualCenterStyle },
      ...actualDailyCells,
      createNumberCell(totalActual, config.unit, true),
      createPercentCell(pctReached, true)
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
    { v: 'ĐIỂM HIỆU SUẤT KPI TỔNG HỢP', t: 's', s: summaryTextStyle },
    { v: totalWeight, t: 'n', z: '0%', s: summaryValueStyle },
    { v: 'Đạt lũy kế', t: 's', s: summaryCenterStyle },
    ...Array.from({ length: daysInMonth }, () => ({ v: '', t: 's', s: summaryCenterStyle })),
    { v: '', t: 's', s: summaryCenterStyle },
    { v: totalScore, t: 'n', z: '0.0%', s: summaryValueStyle }
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
      const cell = data[rowIdx][colIdx];
      if (cell) {
        const cellStr = getCellValueString(cell);
        if (cellStr.length > maxLength) {
          maxLength = cellStr.length;
        }
      }
    }
    return { wch: Math.min(Math.max(maxLength + 3, 8), 50) };
  });
  worksheet['!cols'] = colWidths;

  // 6. Set custom row heights for breathing space
  worksheet['!rows'] = data.map((row, idx) => {
    if (idx === 0) return { hpx: 40 }; // Title
    if (idx === 1) return { hpx: 24 }; // Info
    if (idx === 2) return { hpx: 12 }; // Spacer
    if (idx === 3) return { hpx: 30 }; // Headers
    if (idx === data.length - 1) return { hpx: 30 }; // Summary Row
    if (idx === data.length - 2) return { hpx: 12 }; // Summary Spacer
    return { hpx: 22 }; // Normal rows (Target, Actual)
  });

  // 7. Create workbook and save
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KPI Report');

  const fileName = `kpi_report_${staffName}_${monthYear}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}
