import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Plus, Award, Info, X, Layers, User } from 'lucide-react';
import { Button, Card } from '../../../share/ui';
import { ActionConfirmDialog } from '../../../share/components/action-confirm-dialog';
import type {
  ChecklistItem,
  ChecklistCategory,
  ProcessDocument,
  ProcessStep,
  ChecklistTemplateDocument,
} from '../../types/checklist.types';

import {
  ChecklistHeader,
  ChecklistTabBar,
  ChecklistConfigBar,
  ChecklistErrorBanner,
  ChecklistCreateDialog,
} from './shared';
import RadialProgress from './shared/radial-progress';
import { TodayTab, ProcessTab, TemplateTab, HistoryTab } from './tabs';
import {
  useFilteredCategories,
  useChecklistDialog,
} from './_hook';
import { getTodayKey, toLocalDateKey, isItemLate } from './checklist-utils';
import type { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { cn } from '../../../share/lib/utils';
import { useIsMobile } from '../../shared/hooks/use-is-mobile';
import { kiotVietService } from '../../services/kiotviet-service';

interface ChecklistViewProps {
  todayCategories: ChecklistCategory[];
  templates: ChecklistTemplateDocument[];
  processes: ProcessDocument[];
  items: ChecklistItem[];
  historySnapshots?: import('../../types/checklist.types').ChecklistDocument[];
  historyLoading?: boolean;
  onFetchHistory?: (from: string, to: string, roleCode: string) => Promise<void>;
  onToggleItem: (itemId: string, dateKey?: string) => void;
  roleOptions: Array<{ code: string; name: string }>;
  defaultRoleCode: string;
  onCreateRoleChecklist: (roleCode: string, categoryId: string, checklistName: string, taskTitle: string) => void;
  onCreateTodayChecklistBatch?: (roleCode: string, categoryId: string, checklistName: string, tasksList: Array<{ title: string; timeLimit?: string }>) => Promise<void>;
  onSaveCategoryBatch?: (params: {
    id: string | null;
    title: string;
    roleCode: string;
    iconName: string;
    colorKey: string;
    tasks: Array<{ id?: string; title: string; timeLimit?: string; isRequired?: boolean; evidenceRequired?: boolean }>;
    frequency?: string;
    frequencyDetail?: string;
    shift?: string;
    autoCreateDaily?: boolean;
    status?: string;
    defaultAssignee?: string;
    inspectorId?: string;
    inspectorName?: string;
  }) => Promise<void>;
  onRequestEditCategory?: (
    categoryId: string,
  ) => Promise<{
    id: string;
    title: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    tasks: Array<{ id?: string; title: string; timeLimit?: string; isRequired?: boolean; evidenceRequired?: boolean }>;
    frequency?: string;
    frequencyDetail?: string;
    shift?: string;
    autoCreateDaily?: boolean;
    status?: string;
    defaultAssignee?: string;
    inspectorId?: string;
    inspectorName?: string;
  } | null>;
  onDeleteCategory?: (id: string) => Promise<void>;
  onDeleteChecklistItem?: (itemId: string, dateKey?: string) => Promise<void>;
  onUpdateChecklistItem?: (itemId: string, updates: Partial<ChecklistItem>, dateKey?: string) => Promise<void>;
  pendingTemplateSync?: {
    templateTitle: string;
    snapshotTitle: string;
  } | null;
  onConfirmTemplateSync?: () => Promise<void>;
  onCancelTemplateSync?: () => void;
  onCreateProcess?: (payload: {
    title: string;
    description?: string;
    roleCode: string;
    iconName?: string;
    colorKey?: string;
    steps: ProcessStep[];
  }) => Promise<void>;
  onUpdateProcess?: (id: string, updates: Partial<ProcessDocument>) => Promise<void>;
  onDeleteProcess?: (id: string) => Promise<void>;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    allowedTabs?: string[];
  };
  isLoading?: boolean;
  errorMessage?: string | null;
  onDismissError?: () => void;
  isOwner?: boolean;
  currentUser?: any;
  onRefresh?: () => Promise<void>;
}

export default function ChecklistView({
  todayCategories,
  templates,
  processes,
  items,
  historySnapshots = [],
  historyLoading = false,
  onFetchHistory,
  onToggleItem,
  roleOptions,
  defaultRoleCode,
  onCreateRoleChecklist,
  onCreateTodayChecklistBatch,
  onSaveCategoryBatch,
  onRequestEditCategory,
  onDeleteCategory,
  onDeleteChecklistItem,
  onUpdateChecklistItem,
  pendingTemplateSync,
  onConfirmTemplateSync,
  onCancelTemplateSync,
  onCreateProcess,
  onUpdateProcess,
  onDeleteProcess,
  permissions,
  isLoading = false,
  errorMessage,
  onDismissError,
  isOwner = false,
  currentUser,
  onRefresh,
}: ChecklistViewProps) {
  // ── Tab & Filter State ──
  const [subTab, setSubTab] = useState<'today' | 'checklist_template' | 'process' | 'history'>('today');
  const [searchTerm, setSearchTerm] = useState('');

  const isMobile = useIsMobile();
  const [showKpiDrawer, setShowKpiDrawer] = useState(false); // Do not auto-open
  
  // Draggable floating button positioning
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isNearDismissZone, setIsNearDismissZone] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMovedRef = useRef(false);
  const isNearDismissRef = useRef(false); // ref đồng bộ để check lúc touchend
  const DISMISS_ZONE_HEIGHT = 90; // px từ đáy màn hình

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Đặt mặc định ở góc trên 1/3 bên phải
      const btnSize = 44;
      setPosition({ x: window.innerWidth - btnSize - 10, y: Math.round(window.innerHeight / 3) });
    }
  }, []);

  // ── KiotViet Revenue State ──
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [isFetchingRevenue, setIsFetchingRevenue] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRevenue = async () => {
      try {
        setIsFetchingRevenue(true);
        // Lấy ngày hôm nay theo giờ Việt Nam (GMT+7)
        const d = new Date();
        const offset = 7 * 60; // GMT+7
        const localTime = new Date(d.getTime() + (d.getTimezoneOffset() + offset) * 60000);
        const yyyy = localTime.getFullYear();
        const mm = String(localTime.getMonth() + 1).padStart(2, '0');
        const dd = String(localTime.getDate()).padStart(2, '0');
        const todayDateStr = `${yyyy}-${mm}-${dd}`;

        let response;
        if (import.meta.env.DEV) {
          const clientId = String(import.meta.env.VITE_KIOT_CLIENT_ID || '');
          const clientSecret = String(import.meta.env.VITE_KIOT_CLIENT_SECRET || '');
          const retailer = String(import.meta.env.VITE_KIOT_RETAILER || '');
          const params = new URLSearchParams({
            clientId,
            clientSecret,
            retailer,
            fromPurchaseDate: todayDateStr,
            pageSize: '100',
          });
          const res = await fetch(`/api/kiotviet/invoices?${params.toString()}`);
          response = await res.json();
        } else {
          response = await kiotVietService.fetchApi<{ data?: any[] }>('/invoices', {
            fromPurchaseDate: todayDateStr,
            pageSize: 100
          });
        }

        if (!active) return;

        const data = response?.data || [];
        // Lọc các hóa đơn đã hoàn thành (status === 1) thuộc ngày hôm nay
        const completedInvoices = data.filter((inv: any) => {
          const isCompleted = inv.status === 1;
          const matchDate = inv.purchaseDate ? inv.purchaseDate.startsWith(todayDateStr) : false;
          return isCompleted && matchDate;
        });
        const totalRev = completedInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

        setTodayRevenue(totalRev);
      } catch (error) {
        console.error('Failed to fetch today revenue from KiotViet:', error);
      } finally {
        if (active) {
          setIsFetchingRevenue(false);
        }
      }
    };

    fetchRevenue();

    return () => {
      active = false;
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !position) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
  }, [position]);

  const snapToEdge = useCallback((rawX: number, rawY: number) => {
    const btnSize = 44;
    const margin = 10;
    const topMin = 60;
    const bottomMax = window.innerHeight - btnSize - 80;
    const clampedY = Math.max(topMin, Math.min(bottomMax, rawY));
    // Snap tới cạnh gần nhất (trái hoặc phải)
    const distLeft = rawX;
    const distRight = window.innerWidth - rawX - btnSize;
    const snappedX = distLeft < distRight ? margin : window.innerWidth - btnSize - margin;
    return { x: snappedX, y: clampedY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch || !isDragging) return;
    
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasMovedRef.current = true;
    }
    
    // Kiểm tra có đang kéo vào dismiss zone không - cập nhật ref đồng bộ
    const nearDismiss = touch.clientY > window.innerHeight - DISMISS_ZONE_HEIGHT;
    isNearDismissRef.current = nearDismiss;
    setIsNearDismissZone(nearDismiss);

    // Cho phép kéo tự do khắp màn hình
    const btnSize = 44;
    const newX = Math.max(0, Math.min(window.innerWidth - btnSize, dragStartRef.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - btnSize, dragStartRef.current.posY + dy));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, DISMISS_ZONE_HEIGHT]);

  const handleTouchEnd = useCallback((_e: React.TouchEvent) => {
    const wasDragged = hasMovedRef.current;
    const wasNearDismiss = isNearDismissRef.current;
    setIsDragging(false);
    setIsNearDismissZone(false);
    isNearDismissRef.current = false;
    if (wasDragged) {
      if (wasNearDismiss) {
        // Thả vào dismiss zone → ẩn (chỉ trong lần dùng này, quay lại trang thì hiện lại)
        setIsDismissed(true);
        return;
      }
      // Snap về viền dựa theo vị trí nút hiện tại
      setPosition(prev => prev ? snapToEdge(prev.x, prev.y) : prev);
    }
  }, [snapToEdge]);



  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!position) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - dragStartRef.current.x;
      const dy = moveEvent.clientY - dragStartRef.current.y;
      
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        hasMovedRef.current = true;
      }
      
      // Kiểm tra vùng dismiss - cập nhật ref đồng bộ
      const nearDismiss = moveEvent.clientY > window.innerHeight - DISMISS_ZONE_HEIGHT;
      isNearDismissRef.current = nearDismiss;
      setIsNearDismissZone(nearDismiss);

      // Cho phép kéo tự do khắp màn hình
      const btnSize = 44;
      const newX = Math.max(0, Math.min(window.innerWidth - btnSize, dragStartRef.current.posX + dx));
      const newY = Math.max(0, Math.min(window.innerHeight - btnSize, dragStartRef.current.posY + dy));
      
      setPosition({ x: newX, y: newY });
    };
    
    const handleMouseUp = (_upEvent: MouseEvent) => {
      const wasDragged = hasMovedRef.current;
      const wasNearDismiss = isNearDismissRef.current;
      setIsDragging(false);
      setIsNearDismissZone(false);
      isNearDismissRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      if (wasDragged && wasNearDismiss) {
        // Ẩn tạm thời (quay lại trang sẽ hiện lại)
        setIsDismissed(true);
        return;
      }
      // Snap tới viền gần nhất khi thả chuột (dựa theo vị trí nút)
      if (wasDragged) {
        setPosition(prev => prev ? snapToEdge(prev.x, prev.y) : prev);
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [position, snapToEdge]);

  const handleButtonClick = useCallback(() => {
    if (hasMovedRef.current) return;
    setShowKpiDrawer(true);
  }, []);

  // Compute KPI statistics
  const kpiStats = useMemo(() => {
    let total = 0;
    let completedCount = 0;
    let lateCount = 0;
    let onTimeCount = 0;

    items.forEach((task) => {
      total++;
      if (task.isCompleted) {
        completedCount++;
        if (isItemLate(task)) {
          lateCount++;
        } else {
          onTimeCount++;
        }
      } else {
        if (isItemLate(task)) {
          lateCount++;
        }
      }
    });

    const notCompletedCount = total - completedCount;
    const completionPercent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const onTimePercent = total > 0 ? Math.round((onTimeCount / total) * 100) : 0;
    const latePercent = total > 0 ? Math.round((lateCount / total) * 100) : 0;

    return { total, completedCount, notCompletedCount, onTimeCount, lateCount, onTimePercent, latePercent, completionPercent };
  }, [items]);

  const shouldPulse = kpiStats.notCompletedCount > 0;

  // Thống kê sidebar cho Checklist mẫu
  const templateStats = useMemo(() => {
    const total = templates.length;
    const active = templates.filter(t => (t.status || 'active') === 'active').length;
    const autoCreate = templates.filter(t => t.autoCreateDaily !== false).length;
    const hidden = total - active;
    return { total, active, autoCreate, hidden };
  }, [templates]);

  // Compute SOP summary metrics
  const sopSummary = useMemo(() => {
    const activeCount = processes.filter((p) => (p.status || 'active') === 'active').length;
    return processes.reduce((acc, process) => {
      acc.stepCount += process.steps.length;
      acc.taskCount += process.steps.reduce((stepTotal, step) => {
        const subTaskCount = (step.steps || []).reduce((subTotal, subStep) => subTotal + (subStep.tasks?.length || 0), 0);
        return stepTotal + (step.tasks?.length || 0) + subTaskCount;
      }, 0);
      return acc;
    }, {
      processCount: processes.length,
      activeCount,
      stepCount: 0,
      taskCount: 0,
    });
  }, [processes]);

  // Compute departments/roles SOP count statistics
  const departmentStats = useMemo(() => {
    const counts: Record<string, number> = {};
    processes.forEach((p) => {
      const code = (p.roleCode || '').toUpperCase();
      counts[code] = (counts[code] || 0) + 1;
    });

    return roleOptions
      .map((role) => ({
        name: role.name,
        code: role.code,
        count: counts[role.code.toUpperCase()] || 0,
      }))
      .filter((dept) => dept.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [processes, roleOptions]);

  const renderKpiSidebar = useCallback(() => {
    if (subTab === 'checklist_template') {
      return (
        <div className="space-y-4 text-left">
          {/* Card Thống kê Tổng quan */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
            <div className="h-1 bg-gradient-to-r from-red-600 to-rose-400 shrink-0" />
            <div className="p-4 pb-0 flex flex-row items-center gap-1.5 space-y-0">
              <Layers className="w-4.5 h-4.5 text-[#C21A1A] shrink-0" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Tổng quan checklist mẫu
              </h3>
            </div>
            <div className="p-4 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block leading-normal">Tổng mẫu</span>
                  <span className="mt-1 block text-lg font-black text-slate-700 tabular-nums">{templateStats.total}</span>
                </div>
                <div className="p-3 bg-emerald-50/60 border border-emerald-100/50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider block leading-normal">Đang dùng</span>
                  <span className="mt-1 block text-lg font-black text-emerald-700 tabular-nums">{templateStats.active}</span>
                </div>
                <div className="p-3 bg-blue-50/60 border border-blue-100/50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider block leading-normal">Tự động sinh</span>
                  <span className="mt-1 block text-lg font-black text-blue-700 tabular-nums">{templateStats.autoCreate}</span>
                </div>
                <div className="p-3 bg-amber-50/60 border border-amber-100/50 rounded-xl">
                  <span className="text-[9px] font-black uppercase text-amber-600 tracking-wider block leading-normal">Tạm ẩn</span>
                  <span className="mt-1 block text-lg font-black text-amber-700 tabular-nums">{templateStats.hidden}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card Nguyên tắc */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
            <div className="p-4 pb-0 flex flex-row items-center gap-1.5 space-y-0">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Nguyên tắc checklist mẫu
              </h3>
            </div>
            <div className="p-4 pt-2">
              <ul className="text-xs font-medium text-slate-500 leading-relaxed pl-3.5 list-disc space-y-2">
                <li><strong className="text-slate-700">Tạo 1 lần - dùng nhiều lần:</strong> Tạo checklist mẫu theo vai trò, hệ thống tự sinh hàng ngày.</li>
                <li><strong className="text-slate-700">Chuẩn hóa & nhất quán:</strong> Đầu việc rõ ràng, có bằng chứng hình ảnh giúp kiểm soát chất lượng showroom.</li>
                <li><strong className="text-slate-700">Dễ dàng cập nhật:</strong> Thay đổi mẫu sẽ tự động đồng bộ và áp dụng cho các checklist sinh về sau.</li>
              </ul>
            </div>
          </Card>
        </div>
      );
    }

    if (subTab === 'process') {
      return (
        <div className="space-y-3.5 text-left">
          {/* Card 1: Dashboard Thống kê */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
            <div className="h-1 bg-gradient-to-r from-red-600 via-orange-400 to-rose-500 shrink-0" />
            <div className="p-4.5 space-y-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-red-600" />
                <span>Tổng quan quy trình (SOP)</span>
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-2.5 bg-rose-50/50 border border-rose-100/40 rounded-xl text-left">
                  <span className="text-[9px] font-black uppercase text-rose-500 tracking-wider block">Tổng SOP</span>
                  <span className="mt-1 block text-base font-black text-rose-700 tabular-nums">{sopSummary.processCount}</span>
                </div>
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-100/40 rounded-xl text-left">
                  <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider block">Đang dùng</span>
                  <span className="mt-1 block text-base font-black text-emerald-700 tabular-nums">{sopSummary.activeCount}</span>
                </div>
                <div className="p-2.5 bg-blue-50/50 border border-blue-100/40 rounded-xl text-left">
                  <span className="text-[9px] font-black uppercase text-blue-500 tracking-wider block">Phòng ban</span>
                  <span className="mt-1 block text-base font-black text-blue-700 tabular-nums">{departmentStats.length}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Nhóm Nghiệp Vụ */}
          {departmentStats.length > 0 && (
            <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
              <div className="p-4.5 space-y-3">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>Theo nhóm nghiệp vụ</span>
                </h3>
                <div className="divide-y divide-slate-100/75">
                  {departmentStats.map((dept) => (
                    <div key={dept.code} className="py-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-[#C21A1A]/85 shrink-0" />
                        <span className="truncate">{dept.name}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-250/30 text-[10px] font-black text-slate-500 tabular-nums">
                        {dept.count} SOP
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Card 3: SOP Nguyên tắc */}
          <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
            <div className="p-4.5 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Info className="w-4.5 h-4.5 text-slate-400" />
                <span>Nguyên tắc SOP vận hành</span>
              </h4>
              <ul className="text-xs font-semibold text-slate-500 leading-relaxed pl-3.5 list-disc space-y-2 text-left">
                <li><strong className="text-slate-700">Đúng quy trình - Đúng chuẩn:</strong> Mở ra là làm đúng, làm nhanh, làm đồng nhất mọi showroom.</li>
                <li><strong className="text-slate-700">Dễ hiểu - Dễ nhớ - Dễ làm:</strong> Trực quan hóa các bước thực hiện, phân chia rõ ràng trách nhiệm.</li>
                <li><strong className="text-slate-700">Kiểm soát chặt chẽ:</strong> Tuân thủ tuyệt đối các điểm kiểm soát bắt buộc và biểu mẫu liên quan.</li>
              </ul>
            </div>
          </Card>
        </div>
      );
    }

    // Default: today tab
    return (
      <div className="space-y-4 text-left">
        {/* Card 1: Thống kê hôm nay */}
        <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
          <div className="p-4.5 space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-500" />
              <span>Thống kê hôm nay</span>
            </h3>

            {/* Flex row containing grid stats and radial chart */}
            <div className="flex items-center justify-between gap-4">
              {/* 2x2 Grid stats */}
              <div className="grid grid-cols-2 gap-2.5 flex-1">
                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Tổng việc</span>
                  <div className="text-lg font-black text-slate-700 mt-1 select-none tabular-nums">
                    {kpiStats.total}
                  </div>
                </div>

                <div className="p-2.5 bg-emerald-50/60 border border-emerald-100/50 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Đã xong</span>
                  <div className="text-lg font-black text-emerald-700 mt-1 select-none tabular-nums">
                    {kpiStats.completedCount}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chưa xong</span>
                  <div className="text-lg font-black text-slate-700 mt-1 select-none tabular-nums">
                    {kpiStats.notCompletedCount}
                  </div>
                </div>

                <div className="p-2.5 bg-rose-50/60 border border-rose-100/50 rounded-xl text-left">
                  <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Quá hạn</span>
                  <div className="text-lg font-black text-rose-700 mt-1 select-none tabular-nums">
                    {kpiStats.lateCount}
                  </div>
                </div>
              </div>

              {/* SVG Radial percentage progress */}
              <RadialProgress percentage={kpiStats.completionPercent} />
            </div>

            {/* Doanh thu hôm nay (KiotViet) */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span>Doanh thu KiotViet</span>
              </div>
              <div className="text-sm font-black text-blue-600 tabular-nums">
                {isFetchingRevenue ? (
                  <span className="text-slate-400 text-xs font-bold animate-pulse">Đang tải...</span>
                ) : todayRevenue !== null ? (
                  `${todayRevenue.toLocaleString('vi-VN')} đ`
                ) : (
                  '0 đ'
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Card 2: Nguyên tắc sử dụng */}
        <Card className="bg-white rounded-2xl border border-slate-200/90 text-left overflow-hidden flex flex-col gap-0 py-0 shadow-2xs">
          <div className="p-4.5 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              <span>Nguyên tắc sử dụng</span>
            </h4>
            <ul className="text-xs font-medium text-slate-500 leading-relaxed pl-4 list-disc space-y-2 text-left">
              <li>Checklist tự sinh theo vai trò và khung giờ chuẩn.</li>
              <li>Hoàn thành đúng giờ giúp nâng cao hiệu suất và trải nghiệm khách hàng showroom.</li>
              <li>Cập nhật ghi chú/bằng chứng hình ảnh đầy đủ để minh bạch và dễ đối soát chất lượng dịch vụ.</li>
            </ul>
          </div>
        </Card>
      </div>
    );
  }, [subTab, kpiStats, templateStats, sopSummary, departmentStats, todayRevenue, isFetchingRevenue]);
  const [selectedPerformer, setSelectedPerformer] = useState('all');

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Template filter state
  const [templateFilterRole, setTemplateFilterRole] = useState('all');
  const [templateFilterFrequency, setTemplateFilterFrequency] = useState('all');
  const [templateFilterStatus, setTemplateFilterStatus] = useState('all');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [isCreatingProcess, setIsCreatingProcess] = useState(false);

  // History date range
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });


  // ── Role Code Logic ──
  const defaultSelectedRoleCode = useMemo(() => {
    if (!isOwner) return defaultRoleCode;
    const normalizedDefault = defaultRoleCode.trim().toUpperCase();
    const ownerHasTemplates = templates.some(
      (t) => (t.roleCode || '').trim().toUpperCase() === normalizedDefault
    );
    if (ownerHasTemplates) return defaultRoleCode;
    if (templates.length > 0) return templates[0].roleCode.trim().toUpperCase();
    return defaultRoleCode;
  }, [defaultRoleCode, isOwner, templates]);

  const {
    isAddingItem,
    setIsAddingItem,
    dialogRoleCode,
    setDialogRoleCode,
    dialogInitialValues,
    dialogError,
    isSubmittingDialog,
    openCreateDialog,
    openEditDialog,
    dialogEditCategoryId,
    handleDialogSubmit,
  } = useChecklistDialog({
    defaultRoleCode: defaultSelectedRoleCode,
    onSaveCategoryBatch,
    onRequestEditCategory,
  });
  const selectedRoleCode = isOwner ? (dialogRoleCode || defaultSelectedRoleCode) : defaultSelectedRoleCode;

  const createRoleOptions = useMemo(() => {
    if (dialogEditCategoryId !== null) return roleOptions;
    const existingRoleCodes = new Set(templates.map((t) => t.roleCode.toUpperCase()));
    return roleOptions.filter((r) => !existingRoleCodes.has(r.code.toUpperCase()));
  }, [roleOptions, templates, dialogEditCategoryId]);

  // Fetch history when tab, date range, or selected role changes
  useEffect(() => {
    if (subTab === 'history' && dateRange?.from && dateRange?.to && onFetchHistory) {
      const fromStr = toLocalDateKey(dateRange.from);
      const toStr = toLocalDateKey(dateRange.to);
      void onFetchHistory(fromStr, toStr, selectedRoleCode);
    }
  }, [dateRange, onFetchHistory, selectedRoleCode, subTab]);

  // ── Filtered Data ──
  const {
    filteredCategories,
    filteredProcesses,
    historyDateGroups,
  } = useFilteredCategories({
    todayCategories,
    templates,
    processes,
    items,
    historySnapshots,
    subTab,
    searchTerm,
    selectedRoleCode,
    completedViewMode: 'day',
    selectedWeekDayKey: getTodayKey(),
    currentUser,
    isOwner,
  });

  // Apply extra Performer & Status filters dynamically for 'today' tab
  const filteredCategoriesWithExtraFilters = useMemo(() => {
    if (subTab !== 'today') return filteredCategories;

    return filteredCategories
      .map((cat) => {
        const tasks = cat.tasks.filter((task) => {
          if (selectedPerformer !== 'all' && task.checkedByName !== selectedPerformer) return false;
          if (selectedStatus !== 'all') {
            const isLate = isItemLate(task);
            if (selectedStatus === 'completed' && !task.isCompleted) return false;
            if (selectedStatus === 'not_completed' && (task.isCompleted || isLate)) return false;
            if (selectedStatus === 'late' && (task.isCompleted || !isLate)) return false;
            if (selectedStatus === 'in_progress' && (task.isCompleted || isLate)) return false;
          }
          return true;
        });
        return { ...cat, tasks, countTotal: tasks.length, countDone: tasks.filter((t) => t.isCompleted).length };
      })
      .filter((cat) => cat.tasks.length > 0);
  }, [filteredCategories, subTab, selectedPerformer, selectedStatus]);

  // ── Handlers ──
  const handleOpenCreateDialog = useCallback(() => {
    if (subTab === 'checklist_template') {
      setEditingTemplateId('new');
      return;
    }
    if (subTab === 'process') {
      setIsCreatingProcess(true);
      return;
    }
    openCreateDialog();
  }, [openCreateDialog, subTab]);

  const handleCloseCreatingProcess = useCallback(() => {
    setIsCreatingProcess(false);
  }, []);

  const handleOpenEditChecklistDialog = useCallback((cat: { id: string }) => {
    void openEditDialog(cat.id);
  }, [openEditDialog]);

  const handleResetFilters = useCallback(() => {
    setSubTab('today');
    setSearchTerm('');
    setSelectedPerformer('all');
    setSelectedStatus('all');
    setSelectedDate(new Date());
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
  }, []);

  const handleCloseChecklistDialog = useCallback(() => {
    setIsAddingItem(false);
  }, [setIsAddingItem]);

  const isTabVisible = useCallback((tabKey: string) => {
    if (isOwner) return true;
    const allowed = permissions.allowedTabs || [];
    if (allowed.length === 0) {
      if (tabKey === 'checklist_template' || tabKey === 'history') {
        return false;
      }
      return true;
    }
    return allowed.includes(tabKey);
  }, [isOwner, permissions.allowedTabs]);

  // Adjust subTab if the current one is not allowed
  useEffect(() => {
    if (!isOwner && permissions.allowedTabs && permissions.allowedTabs.length > 0) {
      const allowed = permissions.allowedTabs;
      if (!allowed.includes(subTab)) {
        // Find first allowed tab
        const firstAllowed = allowed[0] as 'today' | 'checklist_template' | 'process' | 'history';
        if (firstAllowed) {
          setSubTab(firstAllowed);
        }
      }
    }
  }, [isOwner, permissions.allowedTabs, subTab, setSubTab]);

  return (
    <div className="flex flex-col text-left antialiased font-sans h-[calc(100vh-144px)] md:h-[calc(100vh-112px)] w-full min-w-0 overflow-hidden pr-1 relative">
      {/* Thanh tab cố định – chỉ render navigation row */}
      <div className="shrink-0 bg-white">
        <ChecklistTabBar
          subTab={subTab}
          setSubTab={setSubTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedRoleCode={selectedRoleCode}
          setSelectedRoleCode={setDialogRoleCode}
          roleOptions={roleOptions}
          items={items}
          selectedPerformer={selectedPerformer}
          setSelectedPerformer={setSelectedPerformer}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onRefresh={onRefresh}
          showTodayTab={isTabVisible('today')}
          showTemplateTab={isTabVisible('checklist_template')}
          showProcessTab={isTabVisible('process')}
          showHistoryTab={isTabVisible('history')}
          showRoleSelect={isOwner}
          isOwner={isOwner}
          currentUser={currentUser}
          templateFilterRole={templateFilterRole}
          setTemplateFilterRole={setTemplateFilterRole}
          templateFilterFrequency={templateFilterFrequency}
          setTemplateFilterFrequency={setTemplateFilterFrequency}
          templateFilterStatus={templateFilterStatus}
          setTemplateFilterStatus={setTemplateFilterStatus}
          templateSearchTerm={templateSearchTerm}
          setTemplateSearchTerm={setTemplateSearchTerm}
          canCreate={permissions.canCreate}
          onOpenCreateTemplate={() => setEditingTemplateId('new')}
          onOpenCreateDialog={handleOpenCreateDialog}
          tabsOnly
        />
      </div>

      {/* Phần cuộn: bộ lọc + nội dung */}
      <div className="flex-1 overflow-y-auto scrollbar-none pb-12 pr-1">
        <ChecklistTabBar
          subTab={subTab}
          setSubTab={setSubTab}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedRoleCode={selectedRoleCode}
          setSelectedRoleCode={setDialogRoleCode}
          roleOptions={roleOptions}
          items={items}
          selectedPerformer={selectedPerformer}
          setSelectedPerformer={setSelectedPerformer}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onRefresh={onRefresh}
          showHistory={isOwner}
          showRoleSelect={isOwner}
          isOwner={isOwner}
          currentUser={currentUser}
          templateFilterRole={templateFilterRole}
          setTemplateFilterRole={setTemplateFilterRole}
          templateFilterFrequency={templateFilterFrequency}
          setTemplateFilterFrequency={setTemplateFilterFrequency}
          templateFilterStatus={templateFilterStatus}
          setTemplateFilterStatus={setTemplateFilterStatus}
          templateSearchTerm={templateSearchTerm}
          setTemplateSearchTerm={setTemplateSearchTerm}
          canCreate={permissions.canCreate}
          onOpenCreateTemplate={() => setEditingTemplateId('new')}
          onOpenCreateDialog={handleOpenCreateDialog}
          filtersOnly
        />
        <div className="mt-3.5 space-y-3.5">
        <ChecklistErrorBanner
          errorMessage={errorMessage}
          onDismissError={onDismissError}
        />

        {subTab === 'history' ? null : (
          <ChecklistConfigBar
            subTab={subTab}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        )}

      {/* ── Tab Content Routing ────────────────────────── */}
      {subTab === 'checklist_template' ? (
        <TemplateTab
          templates={templates}
          roleOptions={roleOptions}
          onSaveCategoryBatch={onSaveCategoryBatch!}
          onDeleteCategory={onDeleteCategory!}
          permissions={permissions}
          filterRole={templateFilterRole}
          filterFrequency={templateFilterFrequency}
          filterStatus={templateFilterStatus}
          searchTerm={templateSearchTerm}
          editingTemplateId={editingTemplateId}
          setEditingTemplateId={setEditingTemplateId}
        />
      ) : subTab === 'process' ? (
        <ProcessTab
          processes={filteredProcesses}
          permissions={permissions}
          isLoading={isLoading}
          roleOptions={roleOptions}
          defaultRoleCode={defaultRoleCode}
          dialogRoleCode={dialogRoleCode || defaultSelectedRoleCode}
          onCreateProcess={onCreateProcess}
          onUpdateProcess={onUpdateProcess}
          onDeleteProcess={onDeleteProcess}
          onResetFilters={handleResetFilters}
          isCreatingProcess={isCreatingProcess}
          onCloseCreatingProcess={handleCloseCreatingProcess}
        />
      ) : subTab === 'history' ? (
        <HistoryTab
          historySnapshots={historySnapshots}
          templates={templates}
          roleOptions={roleOptions}
          historyLoading={historyLoading}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          selectedRoleCode={selectedRoleCode}
          onRoleCodeChange={setDialogRoleCode}
        />
      ) : (
        <TodayTab
          filteredCategories={filteredCategoriesWithExtraFilters}
          historyDateGroups={historyDateGroups}
          permissions={permissions}
          isLoading={isLoading}
          historyLoading={historyLoading}
          roleOptions={roleOptions}
          selectedRoleCode={selectedRoleCode}
          subTab={subTab}
          onToggleItem={onToggleItem}
          onDeleteCategory={onDeleteCategory}
          onOpenEditCategoryDialog={handleOpenEditChecklistDialog}
          onCreateRoleChecklist={onCreateRoleChecklist}
          onCreateTodayChecklistBatch={onCreateTodayChecklistBatch}
          onDeleteChecklistItem={onDeleteChecklistItem}
          onUpdateChecklistItem={onUpdateChecklistItem}
          onResetFilters={handleResetFilters}
        />
      )}

      {/* ── Mobile FAB ──────────────────────── */}
      {permissions.canCreate && (
        <Button
          onClick={handleOpenCreateDialog}
          className="fixed bottom-24 right-5 sm:hidden w-14 h-14 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-lg cursor-pointer z-40"
          title={subTab === 'process' ? 'Thêm quy trình mới' : 'Thêm checklist mẫu mới'}
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </Button>
      )}

      {/* ── Dialogs ──────────────────────── */}
      <ChecklistCreateDialog
        isOpen={isAddingItem}
        initialValues={dialogInitialValues}
        roleOptions={createRoleOptions}
        isSubmittingDialog={isSubmittingDialog}
        dialogError={dialogError}
        onClose={handleCloseChecklistDialog}
        onSubmit={handleDialogSubmit}
        isEditMode={dialogEditCategoryId !== null}
      />

      <ActionConfirmDialog
        open={Boolean(pendingTemplateSync)}
        onOpenChange={(open) => {
          if (!open) {
            onCancelTemplateSync?.();
          }
        }}
        title="Đồng bộ thay đổi template xuống checklist hôm nay"
        description={
          pendingTemplateSync
            ? `Template "${pendingTemplateSync.templateTitle}" đã thay đổi. Bạn có muốn đồng bộ xuống checklist hôm nay không?`
            : ''
        }
        onConfirm={() => {
          void onConfirmTemplateSync?.();
        }}
        variant="confirm"
      />

      {/* Draggable floating button (Mobile only, shown on today, checklist_template, process sub-tabs when drawer is hidden) */}
      {isMobile && (subTab === 'today' || subTab === 'checklist_template' || subTab === 'process') && !showKpiDrawer && position && !isDismissed && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes floatPulse {
              0% {
                box-shadow: 0 0 0 0 rgba(194, 26, 26, 0.7);
              }
              70% {
                box-shadow: 0 0 0 10px rgba(194, 26, 26, 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(194, 26, 26, 0);
              }
            }
            .float-pulse {
              animation: floatPulse 2s infinite;
            }
          ` }} />

          {/* Dismiss zone - chỉ hiện khi đang kéo */}
          {isDragging && (
            <div
              className={cn(
                "fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center justify-center gap-1.5 transition-all duration-200",
                isNearDismissZone
                  ? "h-[90px] bg-slate-800/90 backdrop-blur-sm"
                  : "h-[90px] bg-slate-700/70 backdrop-blur-xs"
              )}
              style={{ pointerEvents: 'none' }}
            >
              <div className={cn(
                "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-200",
                isNearDismissZone
                  ? "border-red-400 bg-red-500/30 scale-125"
                  : "border-slate-400 bg-slate-500/30"
              )}>
                <X className={cn("w-4 h-4 transition-colors", isNearDismissZone ? "text-red-300" : "text-slate-300")} />
              </div>
              <span className={cn(
                "text-[10px] font-bold tracking-wide transition-colors",
                isNearDismissZone ? "text-red-300" : "text-slate-400"
              )}>
                {isNearDismissZone ? "Thả để ẩn" : "Kéo xuống để ẩn"}
              </span>
            </div>
          )}

          <button
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onClick={handleButtonClick}
            className={cn(
              "fixed z-55 rounded-full bg-[#C21A1A] hover:bg-red-755 text-white flex items-center justify-center shadow-lg border border-red-700/20 transition-all select-none cursor-grab active:cursor-grabbing",
              isDragging && "scale-105 shadow-xl",
              isNearDismissZone ? "w-9 h-9 opacity-60 scale-90" : "w-11 h-11",
              shouldPulse && !isDragging && "float-pulse"
            )}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              touchAction: 'none'
            }}
            title="Thống kê & HD"
          >
            {isNearDismissZone
              ? <X className="w-4 h-4" />
              : <Award className="w-5 h-5" />
            }
          </button>
        </>
      )}

      {/* Drawer Overlay & Panel (Mobile only) */}
      {isMobile && (subTab === 'today' || subTab === 'checklist_template' || subTab === 'process') && (
        <div
          className={cn(
            "fixed inset-0 z-50 transition-opacity duration-300 pointer-events-none",
            showKpiDrawer ? "pointer-events-auto" : ""
          )}
        >
          {/* Backdrop overlay */}
          <div
            onClick={() => setShowKpiDrawer(false)}
            className={cn(
              "absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300",
              showKpiDrawer ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          />
          
          {/* Drawer Panel */}
          <div
            className={cn(
              "absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-slate-50 border-l border-slate-200 p-4.5 shadow-2xl flex flex-col gap-4.5 transform transition-transform duration-300 ease-out z-50 overflow-y-auto text-left",
              showKpiDrawer ? "translate-x-0" : "translate-x-full"
            )}
          >
            {/* Close button & header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-[#C21A1A]" />
                <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Thống kê &amp; Hướng dẫn</span>
              </div>
              <button
                onClick={() => setShowKpiDrawer(false)}
                className="w-7 h-7 rounded-full bg-slate-200/70 text-slate-600 flex items-center justify-center font-bold hover:bg-slate-200 cursor-pointer active:scale-95 transition-all border-none outline-none"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pb-10 scrollbar-none">
              {renderKpiSidebar()}
            </div>
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
