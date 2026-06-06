import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from 'react';
import { AlertTriangle, Check, FileCheck, Plus, X } from 'lucide-react';
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
} from '@shared/ui';
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

  const renderedCardList = useMemo(() => {
    if (filteredIssues.length === 0) {
      return (
        <div className="bg-white rounded-2xl p-16 text-center border border-slate-200/80 col-span-full">
          <FileCheck className="w-14 h-14 text-slate-200 mx-auto mb-3" />
          <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">
            Không tìm thấy tài liệu phù hợp
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
            Thử tìm kiếm với nội dung khác, hoặc chọn "Tất cả loại phiếu" bằng bộ lọc ở phía
            bên trên để xem dữ liệu đầy đủ.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pb-12">
        {paginatedIssues.map((issue) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            canUpdate={permissions.canUpdate}
            canDelete={permissions.canDelete}
            onEdit={handleEditIssue}
            onDelete={onDeleteIssue}
            onUpdateStatus={onUpdateIssueStatus}
            onConfirmRead={onConfirmIssueRead}
            isDropdownOpen={dropdownId === issue.id}
            onToggleDropdown={handleToggleDropdown}
            isHighlighted={highlightedIssueId === issue.id}
          />
        ))}
      </div>
    );
  }, [
    filteredIssues.length,
    paginatedIssues,
    permissions.canUpdate,
    permissions.canDelete,
    handleEditIssue,
    onDeleteIssue,
    onUpdateIssueStatus,
    onConfirmIssueRead,
    dropdownId,
    handleToggleDropdown,
    highlightedIssueId,
  ]);

  return (
    <div className="space-y-6 text-left antialiased font-sans h-[calc(100vh-128px)] overflow-y-auto pb-24 pr-1 scrollbar-none md:h-auto md:overflow-visible md:pb-0 md:pr-0">
      <IssuesHeader canCreate={permissions.canCreate} onOpenAddModal={handleOpenAddModal} />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
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
            <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
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
