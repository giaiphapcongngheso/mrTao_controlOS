import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  Check,
  FileCheck,
  Plus,
  X,
  Pencil,
  Trash2,
  AlertOctagon,
  HelpCircle,
  Clock,
  CheckCircle,
  BookOpen,
  ChevronDown,
} from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  SOPIssue,
  SOPIssueCategory,
  SOPIssueStatus,
  SOPIssueStatusFilter,
} from '../../types/issues.types';
import IssuesHeader from './components/issues-header';
import MetricBentoCards from './components/metric-bento-cards';
import SearchFilterSection from './components/search-filter-section';
import IssueCard from './components/issue-card';
import IssueModal from './components/issue-modal';
import {
  ScrollArea,
  Button,
  PaginationBar,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@shared/ui';
import { CustomTable } from '@shared/components';
import { cn } from '@shared/lib/utils';
import { useAppStore } from '../../stores/app-store';

interface IssuesViewProps {
  issues: SOPIssue[];
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  };
  onAddIssue: (issue: Omit<SOPIssue, 'id' | 'storeId'>) => void;
  onUpdateIssue: (issueId: string, updates: Partial<SOPIssue>) => void;
  onDeleteIssue: (issueId: string) => void;
  onUpdateIssueStatus: (issueId: string, status: SOPIssueStatus) => void;
  onConfirmIssueRead: (issueId: string) => void;
  errorMessage?: string | null;
  successMessage?: string | null;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
}

const IssuesView = React.memo(function IssuesView({
  issues,
  permissions,
  onAddIssue,
  onUpdateIssue,
  onDeleteIssue,
  onUpdateIssueStatus,
  onConfirmIssueRead,
  errorMessage,
  successMessage,
  onDismissError,
  onDismissSuccess,
}: IssuesViewProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | SOPIssueCategory>(
    'all'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<SOPIssueStatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [issuesPerPage, setIssuesPerPage] = useState(20);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingNotificationFocusIdRef = useRef<string | null>(null);
  const notificationFocus = useAppStore((state) => state.notificationFocus);
  const setNotificationFocus = useAppStore((state) => state.setNotificationFocus);



  // Use React 19 deferred value for built-in performant debouncing
  const deferredSearchTerm = useDeferredValue(searchTerm);

  // Reset scroll position to top when filter or search changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      const viewport = scrollContainerRef.current.querySelector(
        '[data-slot="scroll-area-viewport"]'
      );
      if (viewport) {
        viewport.scrollTop = 0;
      }
    }
  }, [selectedCategoryFilter, selectedStatusFilter, deferredSearchTerm]);

  const scrollToIssueCard = useCallback(
    (issueId: string) => {
      const targetEl = document.getElementById(`issue-card-${issueId}`);
      if (!targetEl) {
        return false;
      }

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedIssueId(issueId);
      window.setTimeout(() => {
        setHighlightedIssueId((prev) => (prev === issueId ? null : prev));
      }, 2500);
      setNotificationFocus(null);
      return true;
    },
    [setNotificationFocus]
  );

  useEffect(() => {
    if (notificationFocus?.sourceModule !== 'SOP' || !notificationFocus.sourceId) {
      return;
    }

    const sourceId = notificationFocus.sourceId;
    const targetIssue = issues.find((issue) => issue.id === sourceId);
    if (!targetIssue) {
      return;
    }

    if (scrollToIssueCard(sourceId)) {
      return;
    }

    const filteredByTarget = issues.filter(
      (issue) => issue.category === targetIssue.category && issue.status === targetIssue.status
    );
    const targetIndex = filteredByTarget.findIndex((issue) => issue.id === sourceId);
    const nextPage = targetIndex >= 0 ? Math.floor(targetIndex / issuesPerPage) + 1 : 1;

    pendingNotificationFocusIdRef.current = sourceId;
    setSearchTerm('');
    setSelectedCategoryFilter(targetIssue.category);
    setSelectedStatusFilter(targetIssue.status);
    setCurrentPage(nextPage);
  }, [issues, issuesPerPage, notificationFocus, scrollToIssueCard]);

  // Compute category and status counts dynamically based on all loaded issues
  const { 
    sopCount, 
    exceptionCount, 
    riskCount, 
    improvementCount,
    immediateCount,
    pendingCount,
    inProgressCount,
    resolvedCount
  } = useMemo(() => {
    let sop = 0;
    let exception = 0;
    let risk = 0;
    let improvement = 0;
    let immediate = 0;
    let pending = 0;
    let inProgress = 0;
    let resolved = 0;

    for (const issue of issues) {
      // Count by category
      if (issue.category === 'sop_error') sop++;
      else if (issue.category === 'exception') exception++;
      else if (issue.category === 'risk') risk++;
      else if (issue.category === 'improvement') improvement++;

      // Count by status
      if (issue.status === 'Xử lý ngay') immediate++;
      else if (issue.status === 'Chờ duyệt') pending++;
      else if (issue.status === 'Đang triển khai') inProgress++;
      else if (issue.status === 'Đã xử lý') resolved++;
    }

    return {
      sopCount: sop,
      exceptionCount: exception,
      riskCount: risk,
      improvementCount: improvement,
      immediateCount: immediate,
      pendingCount: pending,
      inProgressCount: inProgress,
      resolvedCount: resolved,
    };
  }, [issues]);

  // Filter issues based on deferred search term, category pill and status filter
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Category check
      if (selectedCategoryFilter !== 'all' && issue.category !== selectedCategoryFilter) {
        return false;
      }
      // 2. Status check (from Top Bento Cards)
      if (selectedStatusFilter !== 'all' && issue.status !== selectedStatusFilter) {
        return false;
      }
      // 3. Search check
      const rawSearch = deferredSearchTerm.toLowerCase();
      if (!rawSearch) {
        return true;
      }

      const titleMatch = issue.title.toLowerCase().includes(rawSearch);
      const actorMatch = issue.actor.toLowerCase().includes(rawSearch);
      const descMatch = issue.description?.toLowerCase().includes(rawSearch) || false;
      const procMatch = issue.process?.toLowerCase().includes(rawSearch) || false;
      const assigneeMatch = issue.assignee?.toLowerCase().includes(rawSearch) || false;

      return titleMatch || actorMatch || descMatch || procMatch || assigneeMatch;
    });
  }, [issues, selectedCategoryFilter, selectedStatusFilter, deferredSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / issuesPerPage));

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * issuesPerPage;
    return filteredIssues.slice(start, start + issuesPerPage);
  }, [currentPage, filteredIssues, issuesPerPage]);

  useEffect(() => {
    if (pendingNotificationFocusIdRef.current) {
      return;
    }
    setCurrentPage(1);
  }, [selectedCategoryFilter, selectedStatusFilter, deferredSearchTerm, issuesPerPage]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    const pendingIssueId = pendingNotificationFocusIdRef.current;
    if (!pendingIssueId) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (scrollToIssueCard(pendingIssueId)) {
        pendingNotificationFocusIdRef.current = null;
      }
    }, 80);

    return () => {
      window.clearTimeout(timer);
    };
  }, [currentPage, paginatedIssues, scrollToIssueCard]);

  // Find initial data for modal edit mode
  const editingIssue = useMemo(() => {
    if (!editingIssueId) {
      return undefined;
    }
    return issues.find((i) => i.id === editingIssueId);
  }, [issues, editingIssueId]);

  // Callbacks for Modal actions
  const handleOpenAddModal = useCallback(() => {
    setEditingIssueId(null);
    setIsAdding(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAdding(false);
    setEditingIssueId(null);
  }, []);

  const handleEditIssue = useCallback((issue: SOPIssue) => {
    setEditingIssueId(issue.id);
    setIsAdding(true);
  }, []);

  const handleModalSubmit = useCallback(
    (formData: Omit<SOPIssue, 'id' | 'storeId' | 'date'>) => {
      if (editingIssueId) {
        onUpdateIssue(editingIssueId, formData as Partial<SOPIssue>);
      } else {
        onAddIssue({
          ...formData,
          date: new Date().toISOString().split('T')[0],
        });
      }
      setIsAdding(false);
      setEditingIssueId(null);
    },
    [editingIssueId, onAddIssue, onUpdateIssue]
  );

  // Other callbacks wrapped in useCallback for React performance standards
  const handleSelectFilter = useCallback(
    (filter: 'all' | SOPIssueCategory) => {
      setSelectedCategoryFilter(filter);
    },
    []
  );

  const handleSelectStatusFilter = useCallback(
    (status: SOPIssueStatusFilter) => {
      setSelectedStatusFilter(status);
    },
    []
  );

  const handleClearAllFilters = useCallback(() => {
    setSelectedCategoryFilter('all');
    setSelectedStatusFilter('all');
    setSearchTerm('');
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleGoToPage = useCallback(
    (page: number) => {
      const nextPage = Math.min(Math.max(page, 1), totalPages);
      setCurrentPage(nextPage);

      if (scrollContainerRef.current) {
        const viewport = scrollContainerRef.current.querySelector(
          '[data-slot="scroll-area-viewport"]'
        );
        if (viewport) {
          viewport.scrollTop = 0;
        }
      }
    },
    [totalPages]
  );

  const handleToggleDropdown = useCallback((id: string | null) => {
    setDropdownId(id);
  }, []);

  const handlePageSizeChange = useCallback((pageSize: number) => {
    setIssuesPerPage(pageSize);
    setCurrentPage(1);
  }, []);

  const columns = useMemo<ColumnDef<SOPIssue>[]>(
    () => [
      {
        accessorKey: 'category',
        header: 'Phân loại',
        size: 130,
        cell: ({ row }) => {
          const category = row.original.category;
          const badgeStyles = {
            exception: 'bg-amber-50 border-amber-100 text-amber-700',
            risk: 'bg-purple-50 border-purple-100 text-purple-700',
            improvement: 'bg-emerald-50 border-emerald-100 text-emerald-700',
            sop_error: 'bg-rose-50 border-rose-100 text-[#C21A1A]',
          };
          const badgeTexts = {
            exception: '📋 Ngoại lệ',
            risk: '🛡️ Rủi ro',
            improvement: '📈 Cải tiến',
            sop_error: '⚠️ Lỗi SOP',
          };
          return (
            <span className={cn("inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-0.5 rounded-md border tracking-normal w-fit whitespace-nowrap", badgeStyles[category] || badgeStyles.sop_error)}>
              {badgeTexts[category] || '⚠️ Lỗi SOP'}
            </span>
          );
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
              >
                <option value="all">Tất cả</option>
                <option value="sop_error">Lỗi SOP</option>
                <option value="exception">Ngoại lệ</option>
                <option value="risk">Rủi ro</option>
                <option value="improvement">Cải tiến</option>
              </select>
            );
          },
        },
      },
      {
        accessorKey: 'severity',
        header: 'Độ nghiêm trọng',
        size: 130,
        cell: ({ row }) => {
          const sev = row.original.severity;
          switch (sev) {
            case 'High':
              return (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-md border border-rose-100 bg-rose-50/70 text-rose-600 px-2.5 py-0.5 shrink-0 w-fit whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  Cao
                </span>
              );
            case 'Medium':
              return (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-md border border-amber-100 bg-amber-50/70 text-amber-600 px-2.5 py-0.5 shrink-0 w-fit whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  Trung bình
                </span>
              );
            case 'Low':
              return (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold rounded-md border border-slate-200 bg-slate-50/80 text-slate-500 px-2.5 py-0.5 shrink-0 w-fit whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                  Thấp
                </span>
              );
            default:
              return null;
          }
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
              >
                <option value="all">Tất cả</option>
                <option value="High">Cao</option>
                <option value="Medium">Trung bình</option>
                <option value="Low">Thấp</option>
              </select>
            );
          },
        },
      },
      {
        accessorKey: 'title',
        header: 'Tên phiếu',
        size: 200,
        cell: ({ row }) => (
          <div id={`issue-card-${row.original.id}`} className="font-normal text-slate-900 text-left text-sm leading-snug break-words">
            {row.original.title}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc tên..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'description',
        header: 'Diễn biến / Mô tả',
        size: 240,
        cell: ({ row }) => {
          const desc = row.original.description;
          const cleanText = desc ? desc.replace(/<\/?[^>]+(>|$)/g, "") : '';
          const isImg = desc && desc.includes('<img');
          return (
            <div className="text-slate-700 font-normal text-sm text-left line-clamp-2 break-words max-w-sm whitespace-pre-line leading-relaxed font-sans">
              {cleanText || <span className="text-slate-400 italic">Không có mô tả...</span>}
              {isImg && (
                <span className="inline-flex items-center gap-1 ml-1 text-sm font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 shrink-0">
                  🖼️ Ảnh
                </span>
              )}
            </div>
          );
        },
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc mô tả..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'actor',
        header: 'Bên liên quan',
        size: 150,
        cell: ({ row }) => (
          <div className="text-slate-800 font-normal text-sm truncate text-left">
            {row.original.actor || 'Hệ thống ca trực'}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc bên liên quan..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'process',
        header: 'Quy trình',
        size: 150,
        cell: ({ row }) => (
          <div className="text-slate-800 font-normal text-sm truncate text-left">
            {row.original.process || 'Quy trình vận hành'}
          </div>
        ),
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc quy trình..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'assignee',
        header: 'Người xử lý',
        size: 160,
        cell: ({ row }) => {
          const assignee = row.original.assignee;
          return (
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded-full bg-slate-100 text-sm flex items-center justify-center font-medium text-slate-600 border border-slate-200/50 uppercase shadow-3xs shrink-0">
                {assignee?.charAt(0) || 'U'}
              </div>
              <span className="text-slate-800 font-normal truncate text-sm">{assignee || 'Quản lý cửa hàng'}</span>
            </div>
          );
        },
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc người xử lý..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'date',
        header: 'Lần xảy ra / Ngày',
        size: 160,
        cell: ({ row }) => {
          const issue = row.original;
          return (
            <div className="flex items-center gap-2 text-slate-800 font-normal text-sm">
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#C21A1A] bg-rose-50/70 border border-rose-100 px-2 py-0.5 rounded-md shrink-0">
                {issue.occurrence || 1} lần
              </span>
              <span className="text-slate-300 font-normal">|</span>
              <span className="text-slate-750 font-normal text-sm shrink-0">{issue.date}</span>
            </div>
          );
        },
        meta: {
          filterElement: (column) => (
            <input
              type="text"
              placeholder="Lọc ngày..."
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(e) => column.setFilterValue(e.target.value || undefined)}
              className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
            />
          ),
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 160,
        cell: ({ row }) => {
          const issue = row.original;
          const canUpdate = permissions.canUpdate;
          
          const badgeStyles = {
            'Xử lý ngay': 'text-[#C21A1A] border-red-200 hover:bg-red-50/60',
            'Chờ duyệt': 'text-amber-600 border-amber-200 hover:bg-amber-50/50',
            'Đang triển khai': 'text-emerald-600 border-emerald-200 hover:bg-emerald-50/40',
            'Đã xử lý': 'text-slate-650 border-slate-200 hover:bg-slate-50',
          };
          const badgeStyle = badgeStyles[issue.status] || badgeStyles['Chờ duyệt'];

          const statusConfigs = [
            { status: 'Xử lý ngay', label: 'Xử lý ngay', colorClass: 'text-[#C21A1A]', icon: AlertOctagon },
            { status: 'Chờ duyệt', label: 'Chờ duyệt', colorClass: 'text-amber-600', icon: HelpCircle },
            { status: 'Đang triển khai', label: 'Đang triển khai', colorClass: 'text-emerald-600', icon: Clock },
            { status: 'Đã xử lý', label: 'Đã xử lý', colorClass: 'text-slate-600', icon: CheckCircle },
          ] as const;

          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    disabled={!canUpdate}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "font-semibold rounded-md border shadow-none px-2.5 py-0.5 h-7 text-sm flex items-center gap-1.5 w-fit whitespace-nowrap transition-all",
                      canUpdate 
                        ? badgeStyle 
                        : 'opacity-50 border border-slate-200 text-slate-400 bg-slate-50'
                    )}
                  >
                    <span>{issue.status}</span>
                    <ChevronDown className="size-2.5 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border border-slate-200/80 rounded-xl shadow-lg p-1.5 z-40 text-slate-800">
                  <DropdownMenuLabel className="px-2.5 py-1.5 font-bold text-slate-400 text-sm uppercase tracking-wider border-b border-slate-50 mb-1">
                    Cập nhật xử lý
                  </DropdownMenuLabel>
                  {statusConfigs.map((cfg) => {
                    const Icon = cfg.icon;
                    return (
                      <DropdownMenuItem
                        key={cfg.status}
                        onClick={() => onUpdateIssueStatus(issue.id, cfg.status)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md flex items-center justify-between font-bold text-sm cursor-pointer hover:bg-slate-50",
                          cfg.colorClass
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="size-3.5" />
                          <span>{cfg.label}</span>
                        </div>
                        {issue.status === cfg.status && <Check className="size-3.5 stroke-[2.5]" />}
                      </DropdownMenuItem>
                    );
                  })}
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  <DropdownMenuItem
                    onClick={() => onConfirmIssueRead(issue.id)}
                    className="px-2.5 py-1.5 hover:bg-emerald-50 rounded-md flex items-center justify-between text-emerald-600 font-bold text-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="size-3.5" />
                      <span>Xác nhận đã đọc</span>
                    </div>
                    {issue.readConfirmedAt && <Check className="size-3.5 text-emerald-600 stroke-[2.5]" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        meta: {
          filterElement: (column) => {
            const val = (column.getFilterValue() as string) ?? 'all';
            return (
              <select
                value={val}
                onChange={(e) => column.setFilterValue(e.target.value === 'all' ? undefined : e.target.value)}
                className="w-full h-8 text-sm px-2 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-[#C21A1A] font-medium"
              >
                <option value="all">Tất cả</option>
                <option value="Xử lý ngay">Xử lý ngay</option>
                <option value="Chờ duyệt">Chờ duyệt</option>
                <option value="Đang triển khai">Đang triển khai</option>
                <option value="Đã xử lý">Đã xử lý</option>
              </select>
            );
          },
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        size: 130,
        cell: ({ row }) => {
          const issue = row.original;
          return (
            <div className="flex items-center gap-1.5 justify-center" onClick={(e) => e.stopPropagation()}>
              {permissions.canUpdate && (
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  className="h-7 text-sm px-2 rounded-lg font-medium hover:bg-slate-50 border-slate-200 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                  onClick={() => handleEditIssue(issue)}
                >
                  <Pencil className="w-3 h-3 text-slate-500" />
                  Sửa
                </Button>
              )}
              {permissions.canDelete && (
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  className="h-7 text-sm px-2 rounded-lg font-medium text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all active:scale-97 cursor-pointer flex items-center gap-1"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu "${issue.title}"?`)) {
                      onDeleteIssue(issue.id);
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa
                </Button>
              )}
            </div>
          );
        },
      },
    ],
    [permissions, onUpdateIssueStatus, onConfirmIssueRead, handleEditIssue, onDeleteIssue]
  );

  const renderedCardList = useMemo(() => {
    return (
      <CustomTable<SOPIssue>
        columns={columns}
        data={paginatedIssues}
        loading={false}
        enableFiltering={true}
        showFilterRow={true}
        enablePagination={false}
        activeRowId={highlightedIssueId || undefined}
        getRowId={(row) => row.id}
        emptyMessage="Không tìm thấy tài liệu phù hợp. Thử tìm kiếm với nội dung khác, hoặc chọn 'Tất cả loại phiếu' bằng bộ lọc ở phía bên trên để xem dữ liệu đầy đủ."
        onRowClick={(row) => handleEditIssue(row.original)}
        className="bg-white rounded-xl shadow-2xs border border-slate-100"
      />
    );
  }, [
    columns,
    paginatedIssues,
    highlightedIssueId,
    handleEditIssue,
  ]);

  return (
    <div className="space-y-6 text-left antialiased font-sans h-[calc(100vh-128px)] overflow-y-auto pb-24 pr-1 scrollbar-none md:h-auto md:overflow-visible md:pb-0 md:pr-0">
      <IssuesHeader canCreate={permissions.canCreate} onOpenAddModal={handleOpenAddModal} />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm font-bold leading-relaxed">{errorMessage}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDismissError}
            className="text-rose-500 hover:text-rose-700 hover:bg-rose-100/50 h-6 w-6 rounded-md transition-colors cursor-pointer shrink-0 border-none"
            title="Đóng thông báo lỗi"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-emerald-700">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm font-bold leading-relaxed">{successMessage}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onDismissSuccess}
            className="text-emerald-550 hover:text-emerald-700 hover:bg-emerald-100/50 h-6 w-6 rounded-md transition-colors cursor-pointer shrink-0 border-none"
            title="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      <MetricBentoCards
        selectedStatus={selectedStatusFilter}
        onSelectStatus={handleSelectStatusFilter}
        immediateCount={immediateCount}
        pendingCount={pendingCount}
        inProgressCount={inProgressCount}
        resolvedCount={resolvedCount}
      />

      <SearchFilterSection
        selectedFilter={selectedCategoryFilter}
        onSelectFilter={handleSelectFilter}
        selectedStatus={selectedStatusFilter}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        totalCount={issues.length}
        filteredCount={filteredIssues.length}
        sopCount={sopCount}
        exceptionCount={exceptionCount}
        riskCount={riskCount}
        improvementCount={improvementCount}
        onClearFilters={handleClearAllFilters}
      />

      <div ref={scrollContainerRef}>
        {/* On mobile: render grid directly to avoid Base UI ScrollArea touch conflicts. On desktop: wrap in ScrollArea for independent scroll */}
        <div className="block md:hidden">
          {renderedCardList}
        </div>
        <div className="hidden md:block">
          <ScrollArea className="md:h-[calc(100vh-420px)]" viewportClassName="md:h-full">
            {renderedCardList}
          </ScrollArea>
        </div>
      </div>

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={issuesPerPage}
        onPageChange={handleGoToPage}
        onPageSizeChange={handlePageSizeChange}
        totalCount={issues.length}
        filteredCount={filteredIssues.length}
      />

      {permissions.canCreate && (
        <Button
          type="button"
          aria-label="Ghi nhận phiếu phát sinh"
          onClick={handleOpenAddModal}
          className={cn(
            'fixed bottom-20 right-4 z-40 sm:hidden',
            'h-14 w-14 rounded-full border-none bg-[#C21A1A] p-0 text-white shadow-xl shadow-red-950/20',
            'hover:bg-[#A31414] focus-visible:ring-4 focus-visible:ring-red-200 active:scale-95'
          )}
        >
          <Plus className="h-6 w-6 stroke-[3]" />
        </Button>
      )}

      <IssueModal
        isOpen={isAdding}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        initialData={editingIssue}
        canCreate={permissions.canCreate}
        canUpdate={permissions.canUpdate}
      />
    </div>
  );
});

export default IssuesView;
