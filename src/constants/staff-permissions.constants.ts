/**
 * Staff & Permissions domain constants.
 *
 * Centralizes role codes, module codes, module metadata, display helpers,
 * avatar presets, and default form values that were previously scattered
 * across StaffPermissionsView.tsx as magic values.
 */

// ---------------------------------------------------------------------------
// Role Codes
// ---------------------------------------------------------------------------

export const ROLE_CODE = {
  CHU_CUA_HANG: 'CHU_CUA_HANG',
  QUAN_LY: 'QUAN_LY',
  SALES: 'SALES',
  KHO: 'KHO',
  CSKH: 'CSKH',
  QUAN_TRI_VIEN: 'QUAN_TRI_VIEN',
} as const;

export type RoleCode = (typeof ROLE_CODE)[keyof typeof ROLE_CODE];

/** Preset roles displayed in permission matrix & staff forms. */
export const PRESET_VAI_TRO: RoleCode[] = Object.values(ROLE_CODE);

// ---------------------------------------------------------------------------
// Module Codes
// ---------------------------------------------------------------------------

export const MODULE_CODE = {
  HOM_NAY: 'HOM_NAY',
  CHECKLIST: 'CHECKLIST',
  GIAO_VIEC: 'GIAO_VIEC',
  KPI: 'KPI',
  LOI_SOP: 'LOI_SOP',
  BAO_CAO: 'BAO_CAO',
  SO_TAY: 'SO_TAY',
  MARKETING: 'MARKETING',
  KHO_HANG: 'KHO_HANG',
} as const;

export type ModuleCode = (typeof MODULE_CODE)[keyof typeof MODULE_CODE];

/** Preset modules displayed in permission matrix. */
export const PRESET_MODULES: ModuleCode[] = Object.values(MODULE_CODE);

// ---------------------------------------------------------------------------
// Module Metadata (display names, icons, descriptions)
// ---------------------------------------------------------------------------

export interface ModuleMetadata {
  key: string;
  name: string;
  icon: string;
  desc: string;
}

export const MODULE_METADATA: Record<string, ModuleMetadata> = {
  [MODULE_CODE.HOM_NAY]: { key: 'HOM_NAY', name: 'Trang chủ & Hôm nay', icon: '🏠', desc: 'Thẩm quyền xem tổng hợp vận hành ngày, chu kỳ làm việc, 5 điều cấm kỵ.' },
  [MODULE_CODE.CHECKLIST]: { key: 'CHECKLIST', name: 'Checklist vận hành', icon: '✅', desc: 'Kiểm soát ca trực mở cửa, dọn dẹp, kiểm kho và chốt két an toàn.' },
  [MODULE_CODE.GIAO_VIEC]: { key: 'GIAO_VIEC', name: 'Giao việc showroom', icon: '📋', desc: 'Tạo việc, phân công nhiệm vụ, cập nhật trạng thái tiến độ trực quan ca.' },
  [MODULE_CODE.KPI]: { key: 'KPI', name: 'Đo lường & Doanh số (KPI)', icon: '📈', desc: 'Xem thống kê doanh số cá nhân, bảng xếp hạng nhân viên, chấm điểm dịch vụ.' },
  [MODULE_CODE.LOI_SOP]: { key: 'LOI_SOP', name: 'Báo lỗi SOP & Rủi ro', icon: '⚠️', desc: 'Ghi nhận lỗi quy trình, ngoại lệ, bất ngờ phát sinh hoặc kiểm tra ca trực.' },
  [MODULE_CODE.BAO_CAO]: { key: 'BAO_CAO', name: 'Báo cáo tổng quan', icon: '📊', desc: 'Xuất thống kê doanh số showroom, ước lượng lãi lỗ kinh doanh.' },
  [MODULE_CODE.SO_TAY]: { key: 'SO_TAY', name: 'Sổ tay & Tài liệu (SOP)', icon: '📔', desc: 'Mục lục tra cứu nhanh quy trình thẩm định 18 bước, cẩm nang đào tạo.' },
  [MODULE_CODE.MARKETING]: { key: 'MARKETING', name: 'Marketing & Truyền thông', icon: '📣', desc: 'Quản lý chiến dịch marketing, khuyến mãi, truyền thông thương hiệu.' },
  [MODULE_CODE.KHO_HANG]: { key: 'KHO_HANG', name: 'Quản lý Kho hàng', icon: '📦', desc: 'Quản lý tồn kho, nhập xuất hàng, kiểm kê và theo dõi hàng hóa.' },
};

/** Fallback metadata for custom/unknown modules. */
export function getModuleMeta(mKey: string): ModuleMetadata {
  return MODULE_METADATA[mKey] ?? {
    key: mKey,
    name: `Tính năng: ${mKey.replace(/_/g, ' ')}`,
    icon: '⚙️',
    desc: 'Phân hệ nghiệp vụ phụ trợ đăng ký chính thức của hệ thống.',
  };
}

// ---------------------------------------------------------------------------
// Role Display Helper
// ---------------------------------------------------------------------------

const ROLE_DISPLAY_MAP: Record<string, string> = {
  [ROLE_CODE.CHU_CUA_HANG]: '👑 Chủ cửa hàng',
  [ROLE_CODE.QUAN_LY]: '👔 Quản lý showroom',
  [ROLE_CODE.SALES]: '👥 Tư vấn bán hàng (Sales)',
  [ROLE_CODE.KHO]: '📦 Thủ kho chuyên trách',
  [ROLE_CODE.CSKH]: '💬 Chăm sóc khách hàng',
  [ROLE_CODE.QUAN_TRI_VIEN]: '⚙️ Quản trị viên hệ thống',
};

export function getRoleFriendlyName(roleStr: string): string {
  return ROLE_DISPLAY_MAP[roleStr] ?? `⚡ ${roleStr}`;
}

// ---------------------------------------------------------------------------
// Filter Sentinel
// ---------------------------------------------------------------------------

/** Used as the "show all" option in role / status / module / log filters. */
export const FILTER_ALL = 'ALL' as const;

// ---------------------------------------------------------------------------
// Default Staff Account Values
// ---------------------------------------------------------------------------

/**
 * Default credentials assigned to new staff accounts when the user leaves
 * the password/pin fields empty. Kept in one place so they can be audited
 * or removed easily without scanning UI code.
 */
export const DEFAULT_STAFF_ACCOUNT = {
  password: '123456@',
  pin: '1234',
} as const;

// ---------------------------------------------------------------------------
// Role → Department / Position Mapping
// ---------------------------------------------------------------------------

export const ROLE_DEPARTMENT_MAP: Record<string, string> = {
  [ROLE_CODE.CHU_CUA_HANG]: 'Ban Điều Hành',
  [ROLE_CODE.QUAN_LY]: 'Ban Quản Lý',
  [ROLE_CODE.KHO]: 'Ban Kỹ Thuật',
};

export const DEFAULT_DEPARTMENT = 'Phòng Kinh Doanh';

export const ROLE_POSITION_MAP: Record<string, string> = {
  [ROLE_CODE.CHU_CUA_HANG]: 'Quầy Trưởng Showroom',
  [ROLE_CODE.QUAN_LY]: 'Phòng Làm Việc',
  [ROLE_CODE.KHO]: 'Quầy Kho & Kỹ thuật',
};

export const DEFAULT_POSITION = 'Quầy Bán Lẻ Hàng Hóa';

export function getDepartmentForRole(role: string): string {
  return ROLE_DEPARTMENT_MAP[role] ?? DEFAULT_DEPARTMENT;
}

export function getPositionForRole(role: string): string {
  return ROLE_POSITION_MAP[role] ?? DEFAULT_POSITION;
}

// ---------------------------------------------------------------------------
// Avatar Presets
// ---------------------------------------------------------------------------

export const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
] as const;

/** Fallback avatar when staff has no avatar set. */
export const DEFAULT_AVATAR = AVATAR_PRESETS[1];

// ---------------------------------------------------------------------------
// Default Staff Form (for add/edit form reset)
// ---------------------------------------------------------------------------

export const DEFAULT_STAFF_FORM = {
  fullName: '',
  role: ROLE_CODE.SALES as string,
  username: '',
  phone: '',
  status: 'active' as 'active' | 'inactive',
  joinedDate: '',
  email: '',
  password: '',
  pin: '',
  department: '',
  position: '',
  employeeCode: '',
  avatar: '',
} as const;
