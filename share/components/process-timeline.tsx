import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { IWorkItem, IWorkItemHistory, IWorkItemProcess, WorkItemProcessStep } from '../types';
import { AssigneeTypeEn, WorkItemStepStatusEn } from '../types';
import { cn, getSharedApi } from '../lib';
import { format } from 'date-fns';
import * as LucideIcons from 'lucide-react';
import type { ComponentType } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { useStepAssignees, type AssigneeResolverServices, type INamedEntity } from '../hooks';
import { useWorkItemDetailContext } from './work-item-detail-layout';
import {
  sharedEmployeeService,
  sharedOrganizationExtendedService,
  sharedWorkItemService,
} from '../services/default-services';

// ── Re-export service types for backward compatibility ───────────────────────

export type { INamedEntity, AssigneeResolverServices };
export type ProcessTimelineServices = AssigneeResolverServices;

// ── Component Props ──────────────────────────────────────────────────────────

export interface ProcessTimelineProps {
  readonly histories?: IWorkItemHistory[];
  readonly steps?: WorkItemProcessStep[];
  readonly currentStep?: WorkItemProcessStep;
  readonly onReassign?: (step: WorkItemProcessStep) => void;
  readonly emptyMessage?: string;
  readonly isLoading?: boolean;
  readonly services?: ProcessTimelineServices;
  /** WorkItem data — needed for createdOrganizationId, createdById, id */
  readonly workItem?: IWorkItem;
  /** The WorkItemProcess snapshot applied to this work item — used for version comparison */
  readonly workItemProcess?: IWorkItemProcess;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitial(name: string): string {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const first = (parts[0] ?? '')[0] ?? '';
    const last = (parts[parts.length - 1] ?? '')[0] ?? '';
    return (first + last).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

// ── StepAssigneeDisplay ──────────────────────────────────────────────────────
// Sub-component that resolves and renders assignee names using useStepAssignees.

interface StepAssigneeDisplayProps {
  step: WorkItemProcessStep;
  prevStep: WorkItemProcessStep | null;
  isCurrent: boolean;
  onReassign?: (step: WorkItemProcessStep) => void;
  services: ProcessTimelineServices;
  workItem?: IWorkItem;
  histories?: IWorkItemHistory[];
}

function StepAssigneeDisplay({
  step,
  prevStep,
  isCurrent,
  onReassign,
  services,
  workItem,
  histories,
}: StepAssigneeDisplayProps) {
  const { assignees, loading } = useStepAssignees({
    step,
    prevStep,
    workItem,
    histories,
    services,
  });

  // While loading: show fallback from assignment rule names if available
  if (loading) {
    const fallbackNames =
      step.assignmentRules
        ?.filter((r) => r.assignee?.name)
        .map((r) => ({
          kind: (r.assigneeType === AssigneeTypeEn.DEPARTMENT ? 'org' : 'employee') as
            | 'org'
            | 'employee',
          name: r.assignee.name,
        })) ?? [];

    if (fallbackNames.length > 0) {
      return (
        <AssigneeList
          items={fallbackNames.map((f) => ({ ...f, id: '' }))}
          isCurrent={isCurrent}
          onReassign={onReassign}
          step={step}
        />
      );
    }
    return null;
  }

  if (assignees.length === 0) return null;

  return (
    <AssigneeList items={assignees} isCurrent={isCurrent} onReassign={onReassign} step={step} />
  );
}

// ── AssigneeList (pure render) ───────────────────────────────────────────────

interface AssigneeListProps {
  items: { kind: 'employee' | 'org'; name: string; id?: string }[];
  isCurrent: boolean;
  onReassign?: (step: WorkItemProcessStep) => void;
  step: WorkItemProcessStep;
}

function AssigneeList({ items, isCurrent, onReassign, step }: AssigneeListProps) {
  const uniqueItems = Array.from(
    new Map(items.map((item) => [`${item.kind}-${item.name}`, item])).values(),
  );
  const count = uniqueItems.length;
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {count === 1 ? (
        <span className="inline-flex items-center gap-1.5 text-sm font-normal text-gray-700">
          {uniqueItems[0].kind === 'employee' ? (
            <LucideIcons.User2 className="w-4 h-4 text-muted-foreground" />
          ) : (
            <LucideIcons.Building2 className="w-4 h-4 text-muted-foreground" />
          )}
          <span>{uniqueItems[0].name}</span>
        </span>
      ) : (
        <>
          <div className="flex -space-x-2">
            {uniqueItems.slice(0, 3).map((item, i) => (
              <div
                key={`${item.name}-${i}`}
                className="w-6 h-6 rounded-full bg-gray-300 border border-white flex items-center justify-center text-[10px] font-medium text-gray-700 shrink-0"
                title={item.name}
              >
                {getInitial(item.name)}
              </div>
            ))}
          </div>
          {count > 3 && <span className="text-sm font-normal text-gray-700">+{count - 3}</span>}
        </>
      )}
      {isCurrent && onReassign && (
        <button
          type="button"
          className="w-5 h-5 text-gray-400 hover:text-[#6941C6] bg-[#F9F5FF] ml-1 rounded flex items-center justify-center shrink-0"
          onClick={() => onReassign(step)}
        >
          <svg
            className="w-3.5 h-3.5 text-[#6941C6]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Default Services (built from shared API registry) ────────────────────────

function createDefaultAssigneeServices(): AssigneeResolverServices {
  return {
    getEmployeesByIds: sharedEmployeeService.getByIds,
    getOrganizationsByIds: async (ids: string[]) => {
      if (ids.length === 0) return [];
      const api = getSharedApi();
      const res = await api.post<{ data: INamedEntity[] }>('/hr/organizations/ids', ids);
      return res.data?.data ?? [];
    },
    getLeadersByOrgId: sharedOrganizationExtendedService.getLeadersByOrgId,
    getEmployeeById: async (empId: string) => {
      const res = await sharedEmployeeService.getById({ id: empId, includes: 'Organization' });
      const emp = res?.data as
        | { id: string; name: string; organization?: { id: string } }
        | undefined;
      if (!emp) return null;
      return { id: emp.id, name: emp.name, organizationId: emp.organization?.id };
    },
    getAssignments: async (workItemId: string) => {
      const res = await sharedWorkItemService.getAssignments(workItemId);
      return res?.data ?? [];
    },
  };
}

let _defaultServices: AssigneeResolverServices | null = null;
function getDefaultServices(): AssigneeResolverServices {
  if (!_defaultServices) _defaultServices = createDefaultAssigneeServices();
  return _defaultServices;
}

// ── ProcessVersionInfo ───────────────────────────────────────────────────────
// Sub-component to compare the applied process version vs. latest from API.

interface ProcessVersionInfoProps {
  workItemProcess: IWorkItemProcess;
}

function ProcessVersionInfo({ workItemProcess }: ProcessVersionInfoProps) {
  const isLatestVersion = (workItemProcess.latestVersion ?? 0) <= (workItemProcess.version ?? 0);

  const appliedStepsCount = workItemProcess?.steps?.length ?? 0;

  const content = (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:bg-muted rounded-full"
            title="Xem quy trình áp dụng"
          >
            <LucideIcons.Info className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0 shadow-xl" align="end">
          <div className="p-3">
            <div className="flex items-center justify-between gap-2 border-b pb-2 mb-2">
              <span className="text-sm font-semibold text-gray-800 truncate">
                Thông tin quy trình
              </span>
              {isLatestVersion ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-medium text-green-700 shrink-0">
                  <LucideIcons.CheckCircle2 className="w-3 h-3" />
                  Mới nhất
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-medium text-amber-700 shrink-0">
                  <LucideIcons.AlertTriangle className="w-3 h-3" />
                  Phiên bản cũ
                </span>
              )}
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              {/* Applied process info */}
              <div>
                <p className="font-semibold text-gray-700 text-xs mb-1 flex items-center gap-1">
                  <LucideIcons.FileText className="w-3.5 h-3.5" />
                  Quy trình đang áp dụng
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5">
                  <span className="text-gray-500">Mã:</span>
                  <span className="font-medium text-gray-700">{workItemProcess.code ?? '—'}</span>
                  <span className="text-gray-500">Tên:</span>
                  <span className="font-medium text-gray-700">{workItemProcess.name ?? '—'}</span>
                  <span className="text-gray-500">Số bước:</span>
                  <span className="font-medium text-gray-700">{appliedStepsCount}</span>
                  <span className="text-gray-500">Phiên bản:</span>
                  <span className="font-medium text-gray-700">
                    {workItemProcess.version ?? '—'}
                  </span>
                  {(workItemProcess.lastModifiedDate ?? workItemProcess.createdDate) && (
                    <>
                      <span className="text-gray-500">Cập nhật:</span>
                      <span className="font-medium text-gray-700">
                        {format(
                          new Date(workItemProcess.lastModifiedDate ?? workItemProcess.createdDate),
                          'dd/MM/yyyy HH:mm',
                        )}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {!isLatestVersion && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 rounded px-2 py-1 border-t pt-2">
                  <LucideIcons.AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Quy trình đã có phiên bản mới (v{workItemProcess.latestVersion}), đang áp dụng v
                    {workItemProcess.version}
                  </span>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const portalNode = document.getElementById('process-timeline-header-actions');
  return portalNode ? createPortal(content, portalNode) : content;
}

// ── Main Component ───────────────────────────────────────────────────────────

export function ProcessTimeline({
  histories,
  steps,
  currentStep,
  onReassign,
  emptyMessage = 'Không có dữ liệu quy trình',
  isLoading,
  services: servicesProp,
  workItem,
  workItemProcess,
}: ProcessTimelineProps) {
  const services = servicesProp ?? getDefaultServices();
  // Fallback to context workItem when prop is not provided
  const contextWorkItem = useWorkItemDetailContext();
  const resolvedWorkItem = workItem ?? contextWorkItem;
  const [employees, setEmployees] = useState<INamedEntity[]>([]);

  const sortedSteps = useMemo(() => {
    if (!steps || steps.length === 0) return [];
    return [...steps].sort((a, b) => a.order - b.order);
  }, [steps]);

  // Collect approvalIds from histories for completed step display
  const approvalIds = useMemo(() => {
    const ids = new Set<string>();
    histories?.forEach((h) => {
      if (h.approvalId) ids.add(h.approvalId);
    });
    if (resolvedWorkItem?.createdById) {
      ids.add(resolvedWorkItem.createdById);
    }
    return Array.from(ids);
  }, [histories, resolvedWorkItem?.createdById]);

  useEffect(() => {
    let cancelled = false;
    if (approvalIds.length > 0) {
      services.getEmployeesByIds(approvalIds).then((list) => {
        if (!cancelled) setEmployees(list);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [approvalIds, services]);

  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  const historyMap = useMemo(() => {
    const map = new Map<number, IWorkItemHistory[]>();
    histories?.forEach((h) => {
      if (typeof h.step !== 'number') return;
      const list = map.get(h.step) ?? [];
      list.push(h);
      map.set(h.step, list);
    });
    return map;
  }, [histories]);

  const getLatestHistoryForStep = (stepOrder: number): IWorkItemHistory | undefined => {
    const list = historyMap.get(stepOrder);
    if (!list || list.length === 0) return undefined;
    return list.reduce((latest, item) => (item.version > latest.version ? item : latest), list[0]);
  };

  const isStepCompletedByHistory = (stepOrder: number): boolean => {
    const eStatus = getLatestHistoryForStep(stepOrder)?.stepStatus?.eStatus;
    if (eStatus == null) return false;
    return eStatus === WorkItemStepStatusEn.Passed;
  };

  const hasHistory = Boolean(histories && histories.length > 0);
  // Ưu tiên currentStep prop (từ API) → fallback sang history-based detection khi không có currentStep.
  const currentStepOrder =
    currentStep?.order ??
    (hasHistory
      ? (sortedSteps.find((s) => !isStepCompletedByHistory(s.order))?.order ?? null)
      : null);

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-3 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-40 rounded bg-muted animate-pulse" />
        <div className="h-3 w-28 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (sortedSteps.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="flex flex-col gap-0 relative">
      {/* Process Version Info */}
      {workItemProcess && <ProcessVersionInfo workItemProcess={workItemProcess} />}

      <div className="flex flex-col gap-3 p-4">
        {/* Virtual "Tạo phiếu" step — always completed */}
        {resolvedWorkItem && (
          <div className="flex items-stretch gap-2 flex-[1_0_0] relative min-w-0">
            <div className="relative flex flex-col items-center shrink-0 w-[34px] self-stretch overflow-visible">
              <div className="w-[2px] flex-1 bg-transparent" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative shrink-0 flex items-center justify-center rounded-full z-10 my-1 cursor-default bg-[#079455] p-[6px] w-7 h-7">
                    <div
                      className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: '#12B76A' }}
                    >
                      <LucideIcons.CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Đã tạo phiếu
                </TooltipContent>
              </Tooltip>
              <div className="w-[2px] flex-1 bg-[#12B76A]" />
              <div
                className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-[#12B76A]"
                style={{ bottom: -12, height: 12 }}
              />
            </div>

            <div className="flex-1 min-w-0 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <p className="font-semibold leading-5 self-stretch text-gray-900 font-medium">
                  Tạo phiếu
                </p>
              </div>
              {resolvedWorkItem.createdById && (
                <p className="text-sm font-normal text-gray-700 flex items-center gap-1.5">
                  <LucideIcons.User2 className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {employeeMap.get(resolvedWorkItem.createdById)?.name ||
                      resolvedWorkItem.createdByUser}
                  </span>
                </p>
              )}
              {resolvedWorkItem.createdDate && (
                <p className="text-xs font-normal text-muted-foreground self-stretch">
                  {format(new Date(resolvedWorkItem.createdDate), 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>
          </div>
        )}

        {sortedSteps.map((step, index) => {
          const latestHistory = getLatestHistoryForStep(step.order);
          const stepDisplayDate = latestHistory?.createdDate ?? latestHistory?.lastModifiedDate;

          // Các bước trước currentStep coi là completed (kể cả bị skip, không có history)
          const isCompleted = step.order < (currentStepOrder ?? 0);
          const isCurrent = (currentStepOrder ?? -1) === step.order;

          const isNext = !isCompleted && !isCurrent && step.order === (currentStepOrder ?? 0) + 1;
          const isLast = index === sortedSteps.length - 1;
          // When workItem exists, a virtual "Tạo phiếu" step is rendered above → index 0 is no longer visually first
          const isFirst = index === 0 && !resolvedWorkItem;

          const prevStep = index > 0 ? sortedSteps[index - 1] : null;
          let isPrevCompleted = false;
          if (prevStep) {
            isPrevCompleted = hasHistory
              ? isStepCompletedByHistory(prevStep.order)
              : prevStep.order < (currentStepOrder ?? 0);
          } else if (index === 0 && resolvedWorkItem) {
            // Virtual "Tạo phiếu" step is always completed
            isPrevCompleted = true;
          }
          const prevHistory = prevStep ? getLatestHistoryForStep(prevStep.order) : undefined;

          const defaultCompletedColor = '#12B76A';
          const defaultPendingColor = '#0BA5EC';
          const defaultSkippedColor = '#98A2B3';

          const isSkipped = isCompleted && !latestHistory;

          let stepStatusColor = latestHistory?.stepStatus?.color;
          if (!stepStatusColor) {
            if (isSkipped) {
              stepStatusColor = defaultSkippedColor;
            } else if (isCurrent || (isFirst && !isCompleted)) {
              stepStatusColor = defaultPendingColor;
            } else {
              stepStatusColor = defaultCompletedColor;
            }
          }

          const prevStatusColor = prevHistory?.stepStatus?.color || stepStatusColor;

          const statusIconName = latestHistory?.stepStatus?.icon;
          const iconModule = LucideIcons as unknown as Record<
            string,
            ComponentType<{ className?: string }>
          >;
          let StatusIcon: ComponentType<{ className?: string }>;

          if (isSkipped) {
            StatusIcon = LucideIcons.SkipForward;
          } else if (statusIconName && iconModule[statusIconName]) {
            StatusIcon = iconModule[statusIconName];
          } else if (isCurrent || (isFirst && !isCompleted)) {
            StatusIcon = LucideIcons.Clock;
          } else {
            StatusIcon = LucideIcons.CheckCircle;
          }

          const renderIcon = () => {
            if (isCurrent)
              return (
                <div className="relative w-[34px] h-[34px] flex items-center justify-center shrink-0">
                  <svg
                    className="absolute inset-0"
                    width={34}
                    height={34}
                    viewBox="0 0 34 34"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <circle
                      cx="17"
                      cy="17"
                      r="16"
                      stroke={stepStatusColor}
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div
                    className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center z-10 relative"
                    style={{ backgroundColor: stepStatusColor }}
                  >
                    <StatusIcon className="w-4 h-4 text-white" />
                  </div>
                </div>
              );

            if (latestHistory || (isFirst && !isCompleted) || isCompleted) {
              return (
                <div
                  className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: stepStatusColor }}
                >
                  <StatusIcon className="w-4 h-4 text-white" />
                </div>
              );
            }

            return null;
          };

          const getDotStyles = () => {
            if (isCompleted) return 'bg-[#079455] p-[6px] w-7 h-7 shrink-0';
            if (isCurrent) return 'bg-transparent';
            return 'bg-[#F2F4F7] border w-7 h-7 shrink-0';
          };

          const tooltipLabel = latestHistory?.stepStatus?.name ?? 'Chờ xử lý';

          const getTextStyles = () => {
            if (isCompleted) return 'text-gray-900 font-medium';
            if (isCurrent) return 'text-gray-900 font-bold';
            return 'text-gray-900';
          };

          const getTopLineColor = () => {
            if (isFirst) return 'bg-transparent';
            if (isPrevCompleted) return 'bg-[#12B76A]';
            if (isCompleted) return 'bg-[#12B76A]';
            if (isCurrent || isNext) return 'bg-[#EAECF0]';
            return 'bg-[#EAECF0]';
          };

          const getBottomLineColor = () => {
            if (isLast) return 'bg-transparent';
            if (isCompleted) return 'bg-[#12B76A]';
            if (isCurrent) return 'bg-[#EAECF0]';
            return 'bg-[#EAECF0]';
          };

          // Determine what to show in the assignee area
          const stepStatus = latestHistory?.stepStatus?.eStatus;
          const isPendingOrUnresolved =
            stepStatus === WorkItemStepStatusEn.Pending || stepStatus == null;

          return (
            <div className="flex items-stretch gap-2 flex-[1_0_0] relative min-w-0" key={step.id}>
              <div className="relative flex flex-col items-center shrink-0 w-[34px] self-stretch overflow-visible">
                <div
                  className={cn('w-[2px] flex-1', getTopLineColor())}
                  style={
                    isPrevCompleted || isCompleted
                      ? { backgroundColor: prevStatusColor }
                      : undefined
                  }
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        'relative shrink-0 flex items-center justify-center rounded-full z-10 my-1 cursor-default',
                        getDotStyles(),
                      )}
                    >
                      {renderIcon()}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {tooltipLabel}
                  </TooltipContent>
                </Tooltip>
                <div
                  className={cn('w-[2px] flex-1', getBottomLineColor())}
                  style={isCompleted ? { backgroundColor: stepStatusColor } : undefined}
                />
                {!isLast && (
                  <div
                    className={cn(
                      'absolute left-1/2 -translate-x-1/2 w-[2px]',
                      getBottomLineColor(),
                    )}
                    style={
                      isCompleted
                        ? { bottom: -12, height: 12, backgroundColor: stepStatusColor }
                        : { bottom: -12, height: 12 }
                    }
                  />
                )}
              </div>

              <div
                className={cn(
                  'flex-1 min-w-0 rounded-lg bg-gray-50/80 dark:bg-gray-800/50 px-3 py-2.5',
                  isCurrent && 'border-2',
                )}
                style={isCurrent ? { borderColor: stepStatusColor } : undefined}
              >
                <div className="flex items-center gap-2">
                  <p className={cn('font-semibold leading-5 self-stretch', getTextStyles())}>
                    {step.name}
                  </p>
                  {stepStatus === WorkItemStepStatusEn.Cancell && (
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                      Đã hủy
                    </span>
                  )}
                </div>

                {/* Assignee display */}
                {isPendingOrUnresolved ? (
                  <StepAssigneeDisplay
                    step={step}
                    prevStep={prevStep}
                    isCurrent={isCurrent}
                    onReassign={onReassign}
                    services={services}
                    workItem={resolvedWorkItem}
                    histories={histories}
                  />
                ) : (
                  // Completed steps: show approver from history
                  (() => {
                    if (
                      stepStatus === WorkItemStepStatusEn.Passed ||
                      stepStatus === WorkItemStepStatusEn.Returned ||
                      stepStatus === WorkItemStepStatusEn.Rejected ||
                      stepStatus === WorkItemStepStatusEn.Cancell
                    ) {
                      const approvalId = latestHistory?.approvalId;
                      if (!approvalId) return null;
                      const approver = employeeMap.get(approvalId);
                      if (!approver?.name) return null;
                      return (
                        <p className="text-sm font-normal text-gray-700 flex items-center gap-1.5">
                          <LucideIcons.User2 className="w-4 h-4 text-muted-foreground" />
                          <span>{approver.name}</span>
                        </p>
                      );
                    }
                    return null;
                  })()
                )}

                {stepDisplayDate && !isCurrent && (
                  <p className="text-xs font-normal text-muted-foreground self-stretch">
                    {format(new Date(stepDisplayDate), 'dd/MM/yyyy HH:mm')}
                  </p>
                )}
                {latestHistory?.comment?.trim() && (
                  <div className="flex items-start gap-1.5 mt-0.5">
                    <LucideIcons.MessageSquare className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-xs font-normal text-muted-foreground self-stretch">
                      {latestHistory.comment.trim()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
