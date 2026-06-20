import React, { useCallback, useMemo } from 'react';
import { Briefcase, Package, ShoppingCart, Users, Shield, ClipboardList, Zap } from 'lucide-react';
import type { TaskTemplate } from '../../../types/task-template.types';
import { cn } from '@shared/lib/utils';

interface TaskTemplatePickerProps {
  onSelect: (template: TaskTemplate) => void;
  className?: string;
}

// Built-in templates — stored locally, expandable via Firestore in the future
const BUILT_IN_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-reception',
    name: 'Đón khách',
    icon: '🤝',
    defaultTitle: 'Tiếp đón khách hàng',
    defaultDepartment: 'Showroom',
    defaultPriority: 'high',
    defaultSubtasks: [
      { title: 'Chào đón và giới thiệu' },
      { title: 'Tìm hiểu nhu cầu khách' },
      { title: 'Dẫn khách tham quan showroom' },
      { title: 'Tư vấn sản phẩm phù hợp' },
      { title: 'Ghi nhận thông tin liên hệ' },
    ],
  },
  {
    id: 'tpl-inventory',
    name: 'Kiểm kho',
    icon: '📦',
    defaultTitle: 'Kiểm tra hàng tồn kho',
    defaultDepartment: 'Kho',
    defaultPriority: 'medium',
    defaultSubtasks: [
      { title: 'Đếm số lượng thực tế' },
      { title: 'Đối chiếu với hệ thống' },
      { title: 'Ghi nhận chênh lệch' },
      { title: 'Báo cáo cho quản lý' },
    ],
  },
  {
    id: 'tpl-cleaning',
    name: 'Vệ sinh',
    icon: '🧹',
    defaultTitle: 'Vệ sinh showroom',
    defaultDepartment: 'Showroom',
    defaultPriority: 'low',
    defaultSubtasks: [
      { title: 'Lau kính trưng bày' },
      { title: 'Hút bụi sàn nhà' },
      { title: 'Sắp xếp sản phẩm ngay ngắn' },
      { title: 'Kiểm tra nhà vệ sinh' },
    ],
  },
  {
    id: 'tpl-report',
    name: 'Báo cáo cuối ngày',
    icon: '📊',
    defaultTitle: 'Báo cáo tổng kết ca trực',
    defaultDepartment: 'Quản lý',
    defaultPriority: 'high',
    defaultSubtasks: [
      { title: 'Tổng hợp doanh số' },
      { title: 'Ghi nhận khách hàng tiềm năng' },
      { title: 'Báo cáo vấn đề phát sinh' },
      { title: 'Bàn giao ca cho người tiếp theo' },
    ],
  },
  {
    id: 'tpl-delivery',
    name: 'Giao hàng',
    icon: '🚚',
    defaultTitle: 'Chuẩn bị và giao hàng cho khách',
    defaultDepartment: 'Kho',
    defaultPriority: 'high',
    defaultSubtasks: [
      { title: 'Kiểm tra đơn hàng' },
      { title: 'Đóng gói sản phẩm' },
      { title: 'Kiểm tra chất lượng lần cuối' },
      { title: 'Liên hệ khách xác nhận giao' },
      { title: 'Giao hàng và lấy chữ ký' },
    ],
  },
  {
    id: 'tpl-training',
    name: 'Đào tạo',
    icon: '📚',
    defaultTitle: 'Đào tạo nhân viên mới',
    defaultDepartment: 'Quản lý',
    defaultPriority: 'medium',
    defaultSubtasks: [
      { title: 'Giới thiệu quy trình làm việc' },
      { title: 'Hướng dẫn sử dụng phần mềm' },
      { title: 'Thực hành với sản phẩm' },
      { title: 'Kiểm tra kiến thức' },
    ],
  },
];

export const TaskTemplatePicker = React.memo(function TaskTemplatePicker({
  onSelect,
  className,
}: TaskTemplatePickerProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
        ⚡ Chọn mẫu nhanh
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {BUILT_IN_TEMPLATES.map((tpl) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => onSelect(tpl)}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#C21A1A]/30 hover:shadow-sm transition-all cursor-pointer text-left min-h-[52px] group"
          >
            <span className="text-lg shrink-0">{tpl.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 group-hover:text-[#C21A1A] transition-colors truncate">
                {tpl.name}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold">
                {tpl.defaultSubtasks.length} bước
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

export { BUILT_IN_TEMPLATES };
