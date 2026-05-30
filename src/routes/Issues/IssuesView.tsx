import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from 'react';
import { AlertTriangle, Check, FileCheck } from 'lucide-react';
import type { SOPIssue } from '../../types/issues.types';
import IssuesHeader from './components/issues-header';
import MetricBentoCards from './components/metric-bento-cards';
import SearchFilterSection from './components/search-filter-section';
import IssueCard from './components/issue-card';
import IssueModal from './components/issue-modal';
import { ScrollArea } from '@shared/ui';

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
  onUpdateIssueStatus: (issueId: string, status: string) => void;
  onConfirmIssueRead: (issueId: string) => void;
  errorMessage?: string | null;
  successMessage?: string | null;
  onDismissError?: () => void;
  onDismissSuccess?: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export default function IssuesView({
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
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: IssuesViewProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'all' | 'sop_error' | 'exception' | 'risk' | 'improvement'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  }, [selectedCategoryFilter, deferredSearchTerm]);

  // Compute category counts dynamically for Top Dashboard Stats (based on currently loaded issues)
  const { sopCount, exceptionCount, riskCount, improvementCount } = useMemo(() => {
    let sop = 0;
    let exception = 0;
    let risk = 0;
    let improvement = 0;
    for (const issue of issues) {
      if (issue.category === 'sop_error') {
        sop++;
      } else if (issue.category === 'exception') {
        exception++;
      } else if (issue.category === 'risk') {
        risk++;
      } else if (issue.category === 'improvement') {
        improvement++;
      }
    }
    return {
      sopCount: sop,
      exceptionCount: exception,
      riskCount: risk,
      improvementCount: improvement,
    };
  }, [issues]);

  // Filter issues based on deferred search term and category pill
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // 1. Category check
      if (selectedCategoryFilter !== 'all' && issue.category !== selectedCategoryFilter) {
        return false;
      }
      // 2. Search check
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
  }, [issues, selectedCategoryFilter, deferredSearchTerm]);

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
    (filter: 'all' | 'sop_error' | 'exception' | 'risk' | 'improvement') => {
      setSelectedCategoryFilter(filter);
    },
    []
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleToggleDropdown = useCallback((id: string | null) => {
    setDropdownId(id);
  }, []);

  return (
    <div className="space-y-6 text-left">
      <IssuesHeader canCreate={permissions.canCreate} onOpenAddModal={handleOpenAddModal} />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-rose-700">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={onDismissError}
            className="text-rose-500 hover:text-rose-700 p-0.5 rounded transition-colors cursor-pointer"
            title="Đóng thông báo lỗi"
          >
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3 animate-in slide-in-from-top-2 duration-200 shadow-2xs">
          <div className="flex items-start gap-2.5 text-emerald-700">
            <Check className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{successMessage}</p>
          </div>
          <button
            type="button"
            onClick={onDismissSuccess}
            className="text-emerald-500 hover:text-emerald-700 p-0.5 rounded transition-colors cursor-pointer"
            title="Đóng thông báo"
          >
            ✕
          </button>
        </div>
      )}

      <MetricBentoCards
        selectedFilter={selectedCategoryFilter}
        onSelectFilter={handleSelectFilter}
        sopCount={sopCount}
        exceptionCount={exceptionCount}
        riskCount={riskCount}
        improvementCount={improvementCount}
      />

      <SearchFilterSection
        selectedFilter={selectedCategoryFilter}
        onSelectFilter={handleSelectFilter}
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        totalCount={issues.length}
        sopCount={sopCount}
        exceptionCount={exceptionCount}
        riskCount={riskCount}
        improvementCount={improvementCount}
      />

      <div ref={scrollContainerRef}>
        <ScrollArea className="h-[calc(100vh-420px)]">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-12">
            {filteredIssues.length === 0 ? (
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
            ) : (
              filteredIssues.map((issue) => (
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
                />
              ))
            )}

            {/* Load More Button for Firestore Cursor Pagination */}
            {hasNextPage && (
              <div className="col-span-full flex justify-center pt-4">
                <button
                  type="button"
                  disabled={isFetchingNextPage}
                  onClick={() => fetchNextPage()}
                  className="px-6 py-2.5 rounded-xl border border-slate-200/85 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  {isFetchingNextPage ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                      Đang tải thêm...
                    </>
                  ) : (
                    'Tải thêm lỗi SOP'
                  )}
                </button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

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
}
