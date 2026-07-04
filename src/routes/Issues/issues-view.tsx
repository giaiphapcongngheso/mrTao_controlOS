import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from 'react';
import { AlertTriangle, Check, Plus, X, Trash2 } from 'lucide-react';
import type { SOPIssue, SOPIssueStatus, SOPIssueStatusFilter } from '../../types/issues.types';
import IssuesHeader from './components/issues-header';
import MetricBentoCards from './components/metric-bento-cards';
import IssuesTabBar from './components/issues-tab-bar';
import type { IssueCategoryFilter } from './components/issues-tab-bar';
import IssuesOverviewTab from './components/issues-overview-tab';
import IssueModal from './components/issue-modal';
import { getIssueColumns } from './components/issues-columns';
import { Button } from '@shared/ui';
import { CustomTable } from '@shared/components';
import { cn } from '@shared/lib/utils';
import { useAppStore } from '../../stores/app-store';
import { MobileCard } from '@/src/components/custom/mobile-card';

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
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<IssueCategoryFilter>(
    'overview'
  );
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<SOPIssueStatusFilter>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedProcess, setSelectedProcess] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);


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

    pendingNotificationFocusIdRef.current = sourceId;
    setSearchTerm('');
    setSelectedCategoryFilter(targetIssue.category);
    setSelectedStatusFilter(targetIssue.status);
  }, [issues, notificationFocus, scrollToIssueCard]);

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

  // Trích xuất danh sách quy trình duy nhất từ issues để lọc
  const processOptions = useMemo(() => {
    const processes = Array.from(
      new Set(issues.map((it) => it.process).filter(Boolean))
    ) as string[];
    return [
      { label: 'Tất cả quy trình', value: 'all' },
      ...processes.map((proc) => ({ label: proc, value: proc })),
    ];
  }, [issues]);

  // Trích xuất danh sách người xử lý duy nhất từ issues để lọc
  const assigneeOptions = useMemo(() => {
    const assignees = Array.from(
      new Set(issues.map((it) => it.assignee).filter(Boolean))
    ) as string[];
    return [
      { label: 'Tất cả người xử lý', value: 'all' },
      ...assignees.map((name) => ({ label: name, value: name })),
    ];
  }, [issues]);

  // Trích xuất danh sách tháng duy nhất từ issues để lọc
  const monthOptions = useMemo(() => {
    const months = Array.from(
      new Set(
        issues
          .map((it) => {
            const dateStr = it.createdAt || it.date;
            if (!dateStr) return '';
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          })
          .filter(Boolean)
      )
    ).sort().reverse() as string[];

    return [
      { label: 'Tất cả thời gian', value: 'all' },
      ...months.map((m) => {
        const [year, month] = m.split('-');
        return { label: `Tháng ${month}/${year}`, value: m };
      }),
    ];
  }, [issues]);

  // Determine if the overview tab is active
  const isOverviewTab = selectedCategoryFilter === 'overview';

  // Filter issues based on deferred search term, category pill and status filter
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Category check (skip on overview tab — show all)
      if (selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'overview' && issue.category !== selectedCategoryFilter) {
        return false;
      }
      // 2. Status check (from Top Bento Cards)
      if (selectedStatusFilter !== 'all' && issue.status !== selectedStatusFilter) {
        return false;
      }
      // 2.1 Priority check
      if (selectedPriority !== 'all' && issue.severity !== selectedPriority) {
        return false;
      }
      // 2.2 Process check
      if (selectedProcess !== 'all' && issue.process !== selectedProcess) {
        return false;
      }
      // 2.3 Assignee check
      if (selectedAssignee !== 'all' && issue.assignee !== selectedAssignee) {
        return false;
      }
      // 2.4 Month check
      if (selectedMonth !== 'all') {
        const dateStr = issue.createdAt || issue.date;
        if (dateStr) {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            const issueMonth = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            if (issueMonth !== selectedMonth) {
              return false;
            }
          } else {
            return false;
          }
        } else {
          return false;
        }
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
  }, [
    issues,
    selectedCategoryFilter,
    selectedStatusFilter,
    selectedPriority,
    selectedProcess,
    selectedAssignee,
    selectedMonth,
    deferredSearchTerm,
  ]);





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
  }, [filteredIssues, scrollToIssueCard]);

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
    (filter: IssueCategoryFilter) => {
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

  const handlePriorityChange = useCallback((val: string) => {
    setSelectedPriority(val);
  }, []);

  const handleProcessChange = useCallback((val: string) => {
    setSelectedProcess(val);
  }, []);

  const handleAssigneeChange = useCallback((val: string) => {
    setSelectedAssignee(val);
  }, []);

  const handleMonthChange = useCallback((val: string) => {
    setSelectedMonth(val);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSelectedCategoryFilter('all');
    setSelectedStatusFilter('all');
    setSelectedPriority('all');
    setSelectedProcess('all');
    setSelectedAssignee('all');
    setSelectedMonth('all');
    setSearchTerm('');
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleToggleDropdown = useCallback((id: string | null) => {
    setDropdownId(id);
  }, []);

  const columns = useMemo(
    () =>
      getIssueColumns({
        permissions,
        onUpdateIssueStatus,
        onConfirmIssueRead,
        onEditIssue: handleEditIssue,
        onDeleteIssue,
      }),
    [permissions, onUpdateIssueStatus, onConfirmIssueRead, handleEditIssue, onDeleteIssue]
  );

  const renderedCardList = useMemo(() => {
    return (
      <CustomTable<SOPIssue>
        columns={columns}
        data={filteredIssues}
        loading={false}
        enableFiltering={true}
        showFilterRow={true}
        enablePagination={true}
        pageSizeOptions={[10, 20, 50, 100]}
        tableMinWidth={1650}
        activeRowId={highlightedIssueId || undefined}
        getRowId={(row) => row.id}
        emptyMessage="Không tìm thấy tài liệu phù hợp. Thử tìm kiếm với nội dung khác, hoặc chọn 'Tất cả loại phiếu' bằng bộ lọc ở phía bên trên để xem dữ liệu đầy đủ."
        onRowClick={(row) => handleEditIssue(row.original)}
        className="flex-1 min-h-0 bg-white rounded-xl shadow-2xs border border-slate-100"
        enableRowSelection={permissions.canDelete}
        bulkSelectionActions={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          const count = selectedRows.length;
          return (
            <Button
              variant="destructive"
              size="sm"
              className="h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold"
              onClick={async () => {
                if (window.confirm(`Bạn có chắc chắn muốn xóa ${count} phiếu đã chọn không? Hành động này không thể hoàn tác.`)) {
                  const selectedIds = selectedRows.map((r) => r.original.id);
                  await Promise.all(selectedIds.map((id) => onDeleteIssue(id)));
                  table.resetRowSelection();
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa {count} mục đã chọn</span>
            </Button>
          );
        }}
      />
    );
  }, [
    columns,
    filteredIssues,
    highlightedIssueId,
    handleEditIssue,
    permissions.canDelete,
    onDeleteIssue,
  ]);

  return (
    <div className="space-y-6 text-left antialiased font-sans h-[calc(100vh-128px)] overflow-y-auto pb-24 pr-1 scrollbar-none md:h-[calc(100vh-96px)] md:flex md:flex-col md:overflow-hidden md:pb-0 md:pr-0 min-w-0 w-full overflow-x-hidden">
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

      <IssuesTabBar
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
        selectedPriority={selectedPriority}
        onPriorityChange={handlePriorityChange}
        selectedProcess={selectedProcess}
        onProcessChange={handleProcessChange}
        selectedAssignee={selectedAssignee}
        onAssigneeChange={handleAssigneeChange}
        selectedMonth={selectedMonth}
        onMonthChange={handleMonthChange}
        processOptions={processOptions}
        assigneeOptions={assigneeOptions}
        monthOptions={monthOptions}
      />

      {isOverviewTab ? (
        <IssuesOverviewTab issues={issues} />
      ) : (
        <>
          <MetricBentoCards
            selectedStatus={selectedStatusFilter}
            onSelectStatus={handleSelectStatusFilter}
            immediateCount={immediateCount}
            pendingCount={pendingCount}
            inProgressCount={inProgressCount}
            resolvedCount={resolvedCount}
          />

          <div ref={scrollContainerRef} className="flex-1 min-h-0 flex flex-col">
            {/* On mobile: render MobileCard list view */}
            <div className="block md:hidden space-y-3 px-1 pb-4">
              {filteredIssues.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-slate-400 font-bold text-sm border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50">
                  Không tìm thấy tài liệu phù hợp.
                </div>
              ) : (
                filteredIssues.map((issue, idx) => {
                  const statusVariant = 
                    issue.status === 'Đã xử lý' ? 'success' :
                    issue.status === 'Đang triển khai' ? 'info' :
                    issue.status === 'Chờ duyệt' ? 'warning' : 'error';

                  const categoryLabels: Record<string, string> = {
                    sop_error: 'Lỗi SOP',
                    exception: 'Ngoại lệ',
                    risk: 'Rủi ro',
                    improvement: 'Sáng kiến'
                  };
                  const catLabel = categoryLabels[issue.category] || issue.category;

                  return (
                    <MobileCard
                      key={issue.id}
                      delayIndex={idx}
                      variant="bordered"
                      className={cn(highlightedIssueId === issue.id && 'border-amber-450 dark:border-amber-500 bg-amber-50/20 dark:bg-amber-950/10 shadow-md animate-pulse')}
                      id={`issue-card-${issue.id}`}
                      onClick={() => handleEditIssue(issue)}
                    >
                      <MobileCard.Header
                        title={issue.title}
                        badge={{
                          text: issue.status,
                          variant: statusVariant
                        }}
                      />
                      <MobileCard.Body className="p-3 space-y-2">
                        <MobileCard.Grid
                          cols={2}
                          items={[
                            { label: 'Phân loại', value: catLabel },
                            { label: 'Mức độ', value: issue.severity === 'High' ? 'Cao' : issue.severity === 'Medium' ? 'Trung bình' : 'Thấp' },
                            { label: 'Quy trình', value: issue.process || 'Vận hành chung' },
                            { label: 'Người xử lý', value: issue.assignee || 'Quản lý cửa hàng' },
                            { label: 'Đối tượng', value: issue.actor || 'Hệ thống ca trực' },
                            { label: 'Số lần', value: `${issue.occurrence} lần` },
                          ]}
                        />
                      </MobileCard.Body>
                    </MobileCard>
                  );
                })
              )}
            </div>
            {/* On desktop: enable flex display to allow internal table scroll */}
            <div className="hidden md:flex md:flex-col md:flex-1 md:min-h-0">
              {renderedCardList}
            </div>
          </div>


        </>
      )}

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
