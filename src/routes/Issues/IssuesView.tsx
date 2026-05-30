import React, { useState, useMemo, useCallback, useDeferredValue, useRef, useEffect } from 'react';
import { AlertTriangle, Check, FileCheck } from 'lucide-react';
import type { SOPIssue } from '../../types/issues.types';
import IssuesHeader from './components/issues-header';
import MetricBentoCards from './components/metric-bento-cards';
import SearchFilterSection from './components/search-filter-section';
import IssueCard from './components/issue-card';
import IssueModal from './components/issue-modal';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  ScrollArea,
} from '@shared/ui';
import { useAppStore } from '../../stores/app-store';

const ISSUES_PER_PAGE = 20;

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
}: IssuesViewProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    'all' | 'sop_error' | 'exception' | 'risk' | 'improvement'
  >('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingIssueId, setEditingIssueId] = useState<string | null>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [highlightedIssueId, setHighlightedIssueId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
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
  }, [selectedCategoryFilter, deferredSearchTerm]);

  useEffect(() => {
    if (notificationFocus?.sourceModule !== 'SOP' || !notificationFocus.sourceId) {
      return;
    }

    const sourceId = notificationFocus.sourceId;
    const targetIssue = issues.find((issue) => issue.id === sourceId);
    if (!targetIssue) {
      return;
    }

    const applyFocus = () => {
      const targetEl = document.getElementById(`issue-card-${sourceId}`);
      if (!targetEl) {
        return false;
      }

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedIssueId(sourceId);
      window.setTimeout(() => {
        setHighlightedIssueId((prev) => (prev === sourceId ? null : prev));
      }, 2500);
      setNotificationFocus(null);
      return true;
    };

    if (applyFocus()) {
      return;
    }

    const timer = window.setTimeout(() => {
      applyFocus();
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [issues, notificationFocus, setNotificationFocus]);

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

  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / ISSUES_PER_PAGE));

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
    return Array.from(pages)
      .filter((page) => page >= 1 && page <= totalPages)
      .sort((a, b) => a - b);
  }, [currentPage, totalPages]);

  const paginatedIssues = useMemo(() => {
    const start = (currentPage - 1) * ISSUES_PER_PAGE;
    return filteredIssues.slice(start, start + ISSUES_PER_PAGE);
  }, [currentPage, filteredIssues]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryFilter, deferredSearchTerm]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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

  const paginationControls =
    filteredIssues.length > ISSUES_PER_PAGE ? (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200/85 bg-white px-2 py-1 shadow-2xs">
        <span className="hidden lg:inline text-[11px] font-bold text-slate-400 whitespace-nowrap px-1">
          Bản ghi {(currentPage - 1) * ISSUES_PER_PAGE + 1}-
          {Math.min(filteredIssues.length, currentPage * ISSUES_PER_PAGE)}/{filteredIssues.length}
        </span>
        <Pagination className="w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-disabled={currentPage === 1}
                className={currentPage === 1 ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  handleGoToPage(currentPage - 1);
                }}
              >
                Trước
              </PaginationLink>
            </PaginationItem>

            {pageNumbers.map((pageNumber, index) => {
              const previousPage = pageNumbers[index - 1];
              return (
                <React.Fragment key={pageNumber}>
                  {previousPage && pageNumber - previousPage > 1 && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === currentPage}
                      onClick={(event) => {
                        event.preventDefault();
                        handleGoToPage(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              );
            })}

            <PaginationItem>
              <PaginationLink
                href="#"
                size="default"
                aria-disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'pointer-events-none opacity-50' : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  handleGoToPage(currentPage + 1);
                }}
              >
                Sau
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    ) : null;

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
        paginationControls={paginationControls}
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
              paginatedIssues.map((issue) => (
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
              ))
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
