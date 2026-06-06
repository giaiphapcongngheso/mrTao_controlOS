import React, { createContext, useState, useContext, useEffect } from 'react';
import { LOCAL_STORAGE_KEYS } from './constants';

export type Language = 'vi' | 'en';

type TranslationDictionary = {
  [key in Language]: {
    [key: string]: any;
  };
};

const translations: TranslationDictionary = {
  vi: {
    common: {
      appName: 'HỆ THỐNG QUẢN TRỊ MR. TÁO COOP',
      today: 'Tổng quan',
      checklist: 'Quy trình',
      tasks: 'Công việc',
      kpi: 'KPI chỉ số',
      sop: 'Cải tiến',
      reports: 'Báo cáo ca',
      handbook: 'Sổ tay',
      staff: 'Nhân sự',
      notifications: 'Phê duyệt',
      logOut: 'Đăng xuất',
      userSession: 'Phiên vận hành',
      status: 'Trạng thái',
      all: 'Tất cả',
      confirm: 'Xác nhận',
      cancel: 'Hủy',
      edit: 'Chỉnh sửa',
      delete: 'Xóa',
      actions: 'Thao tác',
      search: 'Tìm kiếm...',
      save: 'Lưu',
      add: 'Thêm mới',
      noData: 'Không có dữ liệu hiển thị',
      loading: 'Đang tải dữ liệu...',
      priorityHigh: 'Cao',
      priorityMedium: 'Trung bình',
      priorityLow: 'Thấp',
      active: 'Đang làm việc',
      inactive: 'Ngừng làm việc',
      lines: 'dòng',
      page: 'Trang',
      of: 'trên',
      itemsPerPage: 'Hiển thị',
      prev: 'Trước',
      next: 'Tiếp'
    },
    login: {
      title: 'ĐĂNG NHẬP VẬN HÀNH ERP',
      subtitle: 'Sử dụng Tên đăng nhập & mã PIN hoặc Mật khẩu được cấp trong ca trực để kích hoạt phiên làm việc.',
      username: 'Tên đăng nhập',
      password: 'Mật khẩu bảo mật',
      pin: 'Mã PIN điểm danh (6 số)',
      hasPin: 'Đăng nhập nhanh bằng PIN Điểm danh',
      hasPass: 'Đăng nhập bằng Mật khẩu hệ thống',
      submit: 'Đăng nhập hệ thống',
      loginFail: 'Tài khoản hoặc thông tin bảo mật không hợp lệ. Vui lòng thử lại!',
      placeholderUsername: 'Nhập tên đăng nhập...',
      placeholderPassword: 'Nhập mật khẩu...',
      placeholderPin: 'Nhập mã PIN...'
    },
    header: {
      helpBtn: 'Trợ giúp & HD SOP',
      os: 'MR.TÁO OS',
      titleToday: 'Tổng quan',
      titleChecklist: 'Hồ sơ Quy trình ca trực',
      titleTasks: 'Công việc',
      titleKPI: 'Chỉ số hiệu kỳ (KPI)',
      titleSOP: 'Cải tiến',
      titleReports: 'Báo cáo tổng kết ca',
      titleHandbook: 'Sổ tay',
      titleStaff: 'Nhân sự',
      titleNotifications: 'Thông báo Phê duyệt'
    },
    today: {
      welcome: 'Xin chào, phiên làm việc của bạn đã được đối soát!',
      shiftStatus: 'TRANG THÁI CA TRỰC',
      revenue: 'DOANH SỐ HÔM NAY',
      checklistComp: 'HOÀN THÀNH CHECKLIST',
      pendingTasks: 'CÔNG VIỆC TRỄ HẠN',
      sopIssues: 'LỖI QUY TRÌNH SOP',
      timelineTitle: 'LỘ TRÌNH VẬN HÀNH CA CHUẨN',
      timelineSubtitle: 'Danh sách mốc thời gian chốt và bàn giao SOP tối thiểu của ca trực showroom Mr. Táo',
      checklistTitle: 'DANH MỤC CHECKLIST ĐANG VẬN HÀNH',
      checklistSubtitle: 'Cập nhật tiến độ hoàn thành các đầu việc SOP cốt lõi hôm nay',
      kpiTitle: 'BẢNG XẾP HẠNG HIỆU QUẢ NHÂN SỰ',
      kpiSubtitle: 'Đánh giá điểm thi đua và phân loại năng lực vận hành thực tế',
      activeExTitle: 'PHÊ DUYỆT NGOẠI LỆ ĐANG PHÁT SINH',
      activeExSubtitle: 'Yêu cầu vượt tuyến cần Chủ cửa hàng / Quản lý ký duyệt đột xuất'
    },
    checklist: {
      title: 'Hồ sơ Checklist Vận hành ca trực',
      subtitle: 'Báo cáo tuân thủ SOP trong ngày - Cần hoàn thành 100% trước khi thực hiện chốt ca giao quỹ.',
      addDuty: 'Khai báo trách nhiệm / Công việc mới',
      dutyName: 'Tên đầu việc vận hành',
      selectCat: 'Chọn danh mục SOP liên quan',
      customCat: 'Danh mục khác (tự nhập)...',
      confirmAdd: 'Bổ sung đầu việc vào Checklist',
      notSelected: 'Vui lòng chọn hoặc nhập danh mục hợp lệ',
      category: 'Danh mục',
      noCategory: 'Thư mục chung',
      completed: 'Hoàn tất',
      incomplete: 'Chưa xong',
      searchHolder: 'Tìm kiếm đầu việc kiểm tra...',
      statSummary: 'Tiến độ tổng quát ca hôm nay:'
    },
    tasks: {
      title: 'Bảng Giao việc & Điều phối Sprint',
      subtitle: 'Phân công nhiệm vụ, giám sát tiến độ hoàn thành và phân tuyến xử lý sự vụ showroom.',
      addTask: 'Giao việc mới cho nhân viên',
      taskTitle: 'Tên nhiệm vụ / Công việc cần giao',
      assignee: 'Nhân sư chịu trách nhiệm',
      department: 'Bộ phận hỗ trợ',
      priority: 'Mức độ ưu tiên',
      deadline: 'Hạn hoàn thành',
      notes: 'Ghi chú chi tiết nghiệp vụ',
      submitBtn: 'Ban hành & Giao việc',
      allTasks: 'Danh sách việc vận hành showroom',
      statusNotStarted: 'Chưa bắt đầu',
      statusInProgress: 'Đang xử lý',
      statusWaiting: 'Chờ phản hồi',
      statusCompleted: 'Đã hoàn thành'
    },
    kpi: {
      title: 'Chỉ số Hiệu suất & Điểm Vận hành',
      subtitle: 'Cập nhật thời gian thực điểm thi đua của cá nhân dựa trên tỷ lệ tích lũy lỗi SOP và CSAT.',
      scorecard: 'BẢNG ĐIỂM CHI TIẾT',
      rank: 'HẠNG',
      fullName: 'HỌ VÀ TÊN',
      department: 'PHÂN HỆ NGHIỆP VỤ',
      score: 'ĐIỂM SỐ',
      classification: 'XẾP LOẠI',
      kpiTarget: 'MỤC TIÊU KPI THÁNG',
      targetSales: 'Doanh số bán hàng đạt 100%',
      targetSOP: 'Tích lũy lỗi SOP dưới 2 lỗi/tháng',
      targetCSAT: 'CSAT (Khách hài lòng) đạt trên 95%'
    },
    sop: {
      title: 'Quản lý Sự cố & Ngoại lệ Quy trình SOP',
      subtitle: 'Ghi nhận và báo cáo các lỗi vận hành ngoài danh mục, xử lý rủi ro showroom tức thời.',
      reportIssue: 'Báo cáo sự vụ / Vi phạm quy trình',
      issueName: 'Tên lỗi / Sự vụ phát sinh',
      severity: 'Mức độ nghiêm trọng',
      category: 'Phân loại lỗi',
      process: 'Quy trình chịu ảnh hưởng',
      reporter: 'Người phát hiện / Báo cáo',
      description: 'Mô tả chi tiết bối cảnh & cách xử lý tạm thời',
      submitIssue: 'Khai báo sự vụ bảo mật',
      listIssues: 'Nhật ký lỗi SOP & Ngoại lệ trong ca',
      severityHigh: 'Nghiêm trọng',
      severityMedium: 'Cảnh cáo',
      severityLow: 'Nhắc nhở nhẹ',
      actionNeeded: 'Xử lý ngay',
      resolving: 'Đang xử lý',
      resolved: 'Đã khắc phục'
    },
    reports: {
      title: 'Báo cáo kết toán & Bàn giao tài chính',
      subtitle: 'Thực hiện kết sổ doanh số, đối chiếu tiền mặt két sắt với hóa đơn điện tử POS trước khi kết thúc ca.',
      revenueInput: 'Doanh thu tiền mặt / Thẻ POS (VNĐ)',
      billCount: 'Số lượng hóa đơn đã xuất',
      profitEst: 'Lợi nhuận gộp ước tính (VNĐ)',
      newCust: 'Khách hàng mới phát sinh',
      retCust: 'Khách hàng cũ quay lại',
      bestseller: 'Mặt hàng hot nhất bán chạy',
      submitReport: 'Khóa sổ & Gửi báo cáo bàn giao',
      reportSuccess: 'Đã khóa sổ ca trực và kết chuyển tài liệu lên hệ thống ERP thành công!',
      historyReports: 'NHẬT KÝ KẾT TOÁN CÁC CA TRƯỚC'
    },
    handbook: {
      title: 'Sổ tay Quy trình vận hành chuẩn (SOP)',
      subtitle: 'Cẩm nang chỉ dẫn thao tác nghiệp vụ, quy tắc xử lý vấn đề chuẩn hóa tại Mr. Táo.',
      searchPlace: 'Tìm kiếm quy trình, chỉ dẫn thao tác nhanh...',
      stepNum: 'Bước'
    },
    staff: {
      title: 'Hồ Sơ Nhân Sự & Phân Quyền',
      subtitle: 'Kho lưu trữ kết nối thành viên showroom với bảng chính sách đặc quyền bảo mật Mr. Táo',
      tabHR: 'Quản Lý Nhân Sự',
      tabMatrix: 'Ma Trận Phân Quyền',
      tabLogs: 'Ghi log hệ thống',
      addNewStaff: 'Thêm nhân sự mới',
      fullName: 'Họ và Tên',
      role: 'Chức danh / Vai trò',
      username: 'Tên đăng nhập',
      phone: 'Số điện thoại',
      joinedDate: 'Gia nhập',
      status: 'Trạng thái ca',
      addRoleRule: 'Thêm dòng phân quyền',
      matrixTitle: 'QUY TẮC PHÂN QUYỀN TRUY CẬP',
      matrixSubtitle: 'Khai báo chính sách phân hệ nghiệp vụ tối ưu',
      colCode: 'Mã số',
      colRole: 'VaiTro (Role Field)',
      colSubsystem: 'Phân hệ tối ưu',
      colView: 'Xem',
      colCreate: 'Thêm',
      colUpdate: 'Sửa',
      colDelete: 'Xóa',
      colApprove: 'Duyệt',
      logTime: 'Thời gian',
      logActor: 'Người thực hiện',
      logTarget: 'Đối tượng',
      logType: 'Hành động',
      closeForm: 'Lớp đóng Form',
      closeAdd: 'Đóng chế độ thêm',
      clearLogs: 'Xóa sạch nhật ký'
    },
    notifications: {
      title: 'Trung tâm Phê duyệt Ngoại lệ ca',
      subtitle: 'Tiếp nhận các chỉ đạo phê duyệt giảm giá, sửa lỗi hóa đơn vượt cấp cần ý kiến chủ showroom.',
      colTime: 'Thời gian yêu cầu',
      colUser: 'Nhân viên yêu cầu',
      colContent: 'Yêu cầu nghiệp vụ',
      colMatrix: 'Phê duyệt',
      badgeWaiting: 'Đang đợi phê duyệt',
      badgeApproved: 'Đã phê duyệt',
      badgeRejected: 'Từ chối duyệt',
      btnApprove: 'Chấp thuận',
      btnReject: 'Từ chối'
    }
  },
  en: {
    common: {
      appName: 'MR. TÁO COOP ERP SYSTEM',
      today: 'Today',
      checklist: 'SOP Checklist',
      tasks: 'Tasks',
      kpi: 'KPI Goals',
      sop: 'SOP Issues / Exceptions',
      reports: 'Shift Reports',
      handbook: 'SOP Handbook',
      staff: 'Staff & Perms',
      notifications: 'Approvals',
      logOut: 'Logout',
      userSession: 'Active Shift',
      status: 'Status',
      all: 'All',
      confirm: 'Confirm',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      actions: 'Actions',
      search: 'Search...',
      save: 'Save',
      add: 'Add New',
      noData: 'No data to display',
      loading: 'Loading data...',
      priorityHigh: 'High',
      priorityMedium: 'Medium',
      priorityLow: 'Low',
      active: 'Working',
      inactive: 'Off Shift',
      lines: 'lines',
      page: 'Page',
      of: 'of',
      itemsPerPage: 'View',
      prev: 'Prev',
      next: 'Next'
    },
    login: {
      title: 'ERP OPERATIONAL LOGIN',
      subtitle: 'Use your Username & assigned PIN or Password during the shift to active your operating session.',
      username: 'Username',
      password: 'Security Password',
      pin: 'Attendance PIN (6 digits)',
      hasPin: 'Quick Login via Attendance PIN',
      hasPass: 'Login via System Password',
      submit: 'Login to System',
      loginFail: 'Invalid credentials. Please attempt login again!',
      placeholderUsername: 'Enter username...',
      placeholderPassword: 'Enter password...',
      placeholderPin: 'Enter PIN...'
    },
    header: {
      helpBtn: 'Help & SOP Guides',
      os: 'MR.TÁO OS',
      titleToday: 'Today Overview',
      titleChecklist: 'Shift Checklist Ledger',
      titleTasks: 'Operational Tasks',
      titleKPI: 'Key Performance Indicators (KPI)',
      titleSOP: 'Exceptions & SOP Issues',
      titleReports: 'End of Shift Reports',
      titleHandbook: 'SOP Standard Handbook',
      titleStaff: 'Collaborator Roles & Permissions',
      titleNotifications: 'Approval Notifications'
    },
    today: {
      welcome: 'Hello, your working session is reconciled and active!',
      shiftStatus: 'SHIFT OPERATIONAL STATUS',
      revenue: 'REVENUE TODAY',
      checklistComp: 'CHECKLIST COMPLETION',
      pendingTasks: 'DELAYED SPRINT TASKS',
      sopIssues: 'SOP COMPLIANCE ERRORS',
      timelineTitle: 'STANDARD SHIFT TIMELINE',
      timelineSubtitle: 'Minimum shift checkpoints and balance reconciliation steps at Mr. Tao showroom',
      checklistTitle: 'RUNNING OPERATIONS CHECKLIST',
      checklistSubtitle: 'Reconcile target completion across core SOP duties today',
      kpiTitle: 'STAFF LEADERBOARD',
      kpiSubtitle: 'Real-time performance evaluation and operational grading',
      activeExTitle: 'ACTIVE UNUSUAL EXCEPTIONS',
      activeExSubtitle: 'Out-of-bound requests needing Store Owner / Manager emergency approval'
    },
    checklist: {
      title: 'Shift Checklist Compliance Ledger',
      subtitle: 'Daily SOP compliance report - Must reach 100% completion before close-out and cash handoff.',
      addDuty: 'Declare New SOP Duty / Task',
      dutyName: 'Duty Title',
      selectCat: 'Select Relevant SOP Segment',
      customCat: 'Other Category (custom)...',
      confirmAdd: 'Append Duty to Checklist',
      notSelected: 'Select or input a valid category',
      category: 'Category',
      noCategory: 'General Module',
      completed: 'Completed',
      incomplete: 'Pending',
      searchHolder: 'Search duties ledger...',
      statSummary: 'Today\'s overall compliance progression:'
    },
    tasks: {
      title: 'Task Delegator & Sprint Board',
      subtitle: 'Delegate staff responsibilities, monitor progress, and route shift operational challenges.',
      addTask: 'Assign New Task to Staff member',
      taskTitle: 'Task Name / Core Action',
      assignee: 'Responsible Staff Member',
      department: 'Supporting Department',
      priority: 'Task Priority Level',
      deadline: 'Reconciliation Deadline',
      notes: 'Operational instructions / guidelines',
      submitBtn: 'Assign & Dispatch',
      allTasks: 'Active Showroom Tasks List',
      statusNotStarted: 'Not Started',
      statusInProgress: 'In Progress',
      statusWaiting: 'Stalled / Waiting',
      statusCompleted: 'Completed'
    },
    kpi: {
      title: 'Performance Scorecard & Reconciled Metrics',
      subtitle: 'Real-time tracking of staff campaign scores based on SOP violation count & customer CSAT ratings.',
      scorecard: 'DETAILED SCOREBOARD',
      rank: 'RANK',
      fullName: 'FULL NAME',
      department: 'CORE DEPARTMENT',
      score: 'SCORE',
      classification: 'GRADE',
      kpiTarget: 'KPI CAMPAIGN TARGETS',
      targetSales: 'Achieve 100% of target campaign revenue',
      targetSOP: 'Maintain under 2 SOP incidents per month',
      targetCSAT: 'Maintain average customer satisfaction survey above 95%'
    },
    sop: {
      title: 'Showroom SOP Incidents & Service Exceptions',
      subtitle: 'Log and review anomalies or custom operations exceptions to secure showroom workflow.',
      reportIssue: 'Report SOP Violation / Operational Incident',
      issueName: 'Incident or Issue Name',
      severity: 'Severity Level',
      category: 'Anomalies Classification',
      process: 'Affected SOP Workflow',
      reporter: 'Discovered By / Reporter',
      description: 'Detailed context & diagnostic bypass rules',
      submitIssue: 'Declare Security Incident',
      listIssues: 'Shift SOP Incident Logs & Reconciled Exceptions',
      severityHigh: 'Emergency Escalation',
      severityMedium: 'Warning Alert',
      severityLow: 'Minor Warning',
      actionNeeded: 'Urgent Action',
      resolving: 'Remediating',
      resolved: 'Resolved / Fixed'
    },
    reports: {
      title: 'Shift End Reconciliation & Balance Handover',
      subtitle: 'Reconcile shift revenues, cross-reference cash reserves with digital POS sales registry.',
      revenueInput: 'Declared Shift Sales Ledger (VNĐ)',
      billCount: 'Total Digital Invoices Issued',
      profitEst: 'Estimated Gross Profit (VNĐ)',
      newCust: 'New Registered Customer Accs',
      retCust: 'Returning Customers Ratio',
      bestseller: 'Campaign Highest Grossing Item',
      submitReport: 'Lock Reconciliation & Deliver Handover',
      reportSuccess: 'Shift successfully closed and handover report synced to ERP Cloud database!',
      historyReports: 'PAST HISTORIC SHIFT BALANCES RECONCILIATIONS'
    },
    handbook: {
      title: 'SOP Operational Standards Codebook',
      subtitle: 'Comprehensive manual outlining policies, safety, checkout and greeting guides.',
      searchPlace: 'Search instructions and guidelines...',
      stepNum: 'Step'
    },
    staff: {
      title: 'Staff Directory & Access Privileges Model',
      subtitle: 'Comprehensive database anchoring staff members with administrative policy protocols.',
      tabHR: 'Staff Registry',
      tabMatrix: 'Access Matrix Table',
      tabLogs: 'Security Audit logs',
      addNewStaff: 'Register New Staff Member',
      fullName: 'Full Name',
      role: 'Staff Role Designation',
      username: 'System Username',
      phone: 'Contact Number',
      joinedDate: 'Joined Date',
      status: 'Current Status',
      addRoleRule: 'Add Policy Assignment',
      matrixTitle: 'ACCESS PERMISSIONS GRID',
      matrixSubtitle: 'Fine-tune systems segment access policies instantly',
      colCode: 'Code ID',
      colRole: 'Role Designation (Field)',
      colSubsystem: 'Target Subsystem',
      colView: 'View',
      colCreate: 'Create',
      colUpdate: 'Update',
      colDelete: 'Delete',
      colApprove: 'Authorize',
      logTime: 'Logged At',
      logActor: 'Actor',
      logTarget: 'Target Object',
      logType: 'Operation Action',
      closeForm: 'Collapse Panel',
      closeAdd: 'Cancel Addition',
      clearLogs: 'Clear Audit Logs'
    },
    notifications: {
      title: 'Exceptions Emergency Approval Desk',
      subtitle: 'Approve custom discounts, transaction line voids, or custom operations requiring immediate clearance.',
      colTime: 'Requested Time',
      colUser: 'Requested By',
      colContent: 'Request Particulars & Delta',
      colMatrix: 'Action State',
      badgeWaiting: 'Awaiting Authorization',
      badgeApproved: 'Authorized Approved',
      badgeRejected: 'Declined Authorization',
      btnApprove: 'Authorize',
      btnReject: 'Decline'
    }
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (keyPath: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.LOCALE);
    return (saved as Language) || 'vi';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LOCALE, lang);
  };

  const t = (keyPath: string): string => {
    const parts = keyPath.split('.');
    let result: any = translations[language];
    
    for (const part of parts) {
      if (result && part in result) {
        result = result[part];
      } else {
        // Fallback to Vietnamese translation keys
        let fallbackResult: any = translations['vi'];
        for (const fPart of parts) {
          if (fallbackResult && fPart in fallbackResult) {
            fallbackResult = fallbackResult[fPart];
          } else {
            fallbackResult = null;
            break;
          }
        }
        return fallbackResult !== null && typeof fallbackResult === 'string' 
          ? fallbackResult 
          : keyPath;
      }
    }
    
    return typeof result === 'string' ? result : keyPath;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
