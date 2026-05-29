import { useLocation, useNavigate } from '@tanstack/react-router';
import { format } from 'date-fns';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { cn } from '../lib';
import { IWorkItem, WorkItemStatusEn } from '../types';
import { Button } from '../ui/button';
import { RefDocumentDialog } from './ref-document-dialog';
import { WorkItemStatusBadge } from './work-item-status-badge';

import { useWorkItem } from '../hooks/use-work-item';
import { sharedWorkItemService } from '../services/default-services';

// ── Context to share workItem with child components (e.g. ProcessTimeline) ───
const WorkItemDetailContext = createContext<IWorkItem | undefined>(undefined);

/** Hook to access the workItem fetched by WorkItemDetailLayout */
export function useWorkItemDetailContext(): IWorkItem | undefined {
  return useContext(WorkItemDetailContext);
}

export interface WorkItemDetailTab {
  path: string;
  label: string;
  route: string;
}

/** Default includes khi fetch workItem cho layout — single source of truth */
const LAYOUT_WORK_ITEM_INCLUDES = [
  'WorkItemProcess',
  'WorkItemProcess.Steps',
  'WorkItemProcess.Steps.AssignmentRules',
  'CurrentStep.Actions',
  'CurrentStep.AssignmentRules',
  'CurrentStep.Transitions',
  'WorkItemStatus',
  'WorkItemCategory',
  'RefType',
  'RefDoc.WorkItemCategory',
  'RefDoc.WorkItemStatus',
  'RefDoc.CurrentStep.WorkItemStatus',
  'Histories.StepStatus',
];

export interface WorkItemDetailLayoutProps {
  readonly children?: React.ReactNode;
  readonly actions?: React.ReactNode[];
  readonly tabs?: WorkItemDetailTab[];
  readonly title?: React.ReactNode;
  readonly status?: React.ReactNode;
  /** Pass workItemId to let the layout fetch its own data */
  readonly workItemId: string;
  readonly refDetailUrl?: string;
  readonly permissionModule?: string;
  readonly stepTimeline?: React.ReactNode;
  readonly sidebarExtra?: React.ReactNode;
  readonly onBack?: () => void;
}

const DEFAULT_LEFT_PERCENT = 80;
const MIN_LEFT_PERCENT = 20;
const MAX_LEFT_PERCENT = 90;
const RESIZER_HIT_WIDTH = 16;
const RESIZER_LINE_WIDTH = 2;

export function WorkItemDetailLayout({
  children,
  actions,
  tabs,
  title,
  status,
  workItemId,
  refDetailUrl,
  permissionModule,
  stepTimeline,
  sidebarExtra,
  onBack,
}: WorkItemDetailLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [leftPercent, setLeftPercent] = useState(DEFAULT_LEFT_PERCENT);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, percent: 0 });
  const [isRefDialogOpen, setIsRefDialogOpen] = useState(false);

  // Fetch workItem internally when workItemId is provided
  const { getByIdQuery } = useWorkItem({
    id: workItemId,
    service: sharedWorkItemService,
    queryParam: {
      getById: {
        isEnable: !!workItemId,
        includes: LAYOUT_WORK_ITEM_INCLUDES,
      },
    },
  });

  const workItem = getByIdQuery.data?.data;

  const refType = workItem?.refType;
  const refDoc = workItem?.refDoc;

  const isTabActive = (tabPath: string) => location.pathname.includes(tabPath);

  const handleResizerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startRef.current = { x: e.clientX, percent: leftPercent };
      setIsResizing(true);
    },
    [leftPercent],
  );

  React.useEffect(() => {
    if (!isResizing) return;
    const onMove = (e: MouseEvent) => {
      const el = bodyRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const delta = e.clientX - startRef.current.x;
      const deltaPercent = (delta / rect.width) * 100;
      const next = Math.min(
        MAX_LEFT_PERCENT,
        Math.max(MIN_LEFT_PERCENT, startRef.current.percent + deltaPercent),
      );
      setLeftPercent(next);
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  return (
    <WorkItemDetailContext.Provider value={workItem}>
      <div className="h-full">
        {/* Header */}
        <div className="bg-white shadow border-b-2 border-primary rounded-t-md p-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-1 text-primary"
              onClick={() => (onBack ? onBack() : window.history.back())}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col gap-[2px]">
              {refType && refDoc && (
                <div
                  className="flex items-center w-fit gap-2 text-xs text-muted-foreground py-0.5 rounded mb-1 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => setIsRefDialogOpen(true)}
                >
                  <span className="inline-flex items-center gap-1 font-medium">
                    REF TYPE:{' '}
                    <span className="text-primary">{refType.shortName || refType.name}</span>
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="inline-flex items-center gap-1 font-medium">
                    REF DOC NUM: <span className="text-primary font-semibold">{refDoc.code}</span>
                  </span>
                  <ExternalLink size={14} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="font-semibold text-[18px]">{title}</div>
                {/* trạng thái hủy phiếu*/}
                {workItem?.workItemStatus?.eStatus === WorkItemStatusEn.Cancelled ? (
                  <WorkItemStatusBadge status={workItem.workItemStatus} variant="div" />
                ) : (
                  status
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-1 text-[13px] text-muted-foreground">
                {workItem?.code && (
                  <>
                    <span>Mã:</span>
                    <span className="font-semibold text-foreground">#{workItem.code}</span>
                    <span className="mx-1">•</span>
                  </>
                )}
                {workItem?.createdByUser && (
                  <>
                    <span>Người tạo:</span>
                    <span className="font-semibold text-foreground">{workItem.createdByUser}</span>
                    <span className="mx-1">•</span>
                  </>
                )}
                {workItem?.createdDate && (
                  <>
                    <span>Ngày tạo:</span>
                    <span className="font-semibold text-foreground">
                      {format(new Date(workItem.createdDate), 'dd/MM/yyyy HH:mm')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
        {/* Body */}
        <div ref={bodyRef} className="flex w-full group" style={{ minHeight: 200 }}>
          <div
            className="grid grid-rows-[auto_1fr] min-w-0 shrink-0 overflow-hidden"
            style={{
              width: `calc((100% - ${RESIZER_HIT_WIDTH}px) * ${leftPercent} / 100)`,
            }}
          >
            {tabs && tabs.length > 0 && (
              <div
                className="bg-[#FAFAFA] rounded-md border p-1 sticky mb-3 grid gap-4 items-center"
                style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
              >
                {tabs.map((tab) => (
                  <Button
                    key={tab.path}
                    className={cn(
                      'transition-all',
                      isTabActive(tab.path)
                        ? 'bg-white text-primary shadow-sm'
                        : 'bg-transparent text-muted-foreground',
                    )}
                    onClick={() => navigate({ to: tab.route })}
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            )}
            {children}
          </div>
          <div
            role="separator"
            aria-orientation="vertical"
            className={cn(
              'shrink-0 cursor-col-resize select-none flex items-stretch justify-center transition-opacity',
              'hover:opacity-100 active:opacity-100',
              isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
            style={{ width: RESIZER_HIT_WIDTH, zIndex: 10 }}
            onMouseDown={handleResizerMouseDown}
          >
            <div
              className={cn(
                'h-full rounded-full transition-colors bg-transparent shrink-0',
                'hover:bg-black/5 group-hover:bg-black/5',
                isResizing && 'bg-black/10',
              )}
              style={{ width: RESIZER_LINE_WIDTH }}
            />
          </div>
          <div className={cn('sticky min-w-0 flex-1 overflow-hidden flex flex-col gap-4')}>
            {/* Timeline Card */}
            <div className="bg-white rounded-md shadow shrink-0 flex flex-col min-h-0">
              {/* Header */}
              <div className="border-b p-[10px] pl-3 pr-2 flex items-center justify-between">
                <h5 className="text-[16px] font-semibold">Quy trình xử lý</h5>
                <div id="process-timeline-header-actions" />
              </div>
              {/* Timeline content should handle its own overflow if it's too long */}
              <div className="overflow-y-auto">{stepTimeline}</div>
            </div>

            {/* Extra Sidebar Content (e.g. LeaveCalendar) */}
            {sidebarExtra}
          </div>
        </div>
        {/* Ref Document Dialog */}
        {refType && refDoc && (
          <RefDocumentDialog
            open={isRefDialogOpen}
            onOpenChange={setIsRefDialogOpen}
            refType={refType}
            refDoc={refDoc}
            refDetailUrl={refDetailUrl}
            permissionModule={permissionModule}
          />
        )}
      </div>
    </WorkItemDetailContext.Provider>
  );
}

export default WorkItemDetailLayout;
