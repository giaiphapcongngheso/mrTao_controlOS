/* eslint-disable react-refresh/only-export-components */
import { WorkItemStatusBadge } from '@shared/components';
import { WorkItemStatusEn, type IWorkItemInfo, IFlatItem } from '@shared/types';
import type { ComboboxOption } from '@shared/ui/combobox';
import { Label } from '@shared/ui/label';

export type InventoryDropdownOption = ComboboxOption<IFlatItem>;

export function CodeNameCell({ code, name }: { code?: string | null; name?: string | null }) {
  if (!code && !name) return <span>-</span>;

  return (
    <div className="flex min-w-0 flex-col leading-tight">
      {name ? <span className="font-medium text-foreground">{name}</span> : null}
      {code ? <span className="text-xs text-muted-foreground">{code}</span> : null}
    </div>
  );
}

export const mapFlatItems = (items?: IFlatItem[]): InventoryDropdownOption[] =>
  (items ?? []).map((item) => ({
    value: item.id,
    label: item.name,
    code: item.code,
    optionData: item,
    searchText: `${item.code} ${item.name}`,
  }));

export function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <Label htmlFor={htmlFor} className="inline-flex items-center gap-1">
      <span>{children}</span>
      <span className="text-destructive">*</span>
    </Label>
  );
}

export function WorkflowStatusCell({ workItemInfo }: { workItemInfo?: IWorkItemInfo | null }) {
  if (!workItemInfo) return <span>-</span>;

  const stepName = workItemInfo.currentStepName?.trim() ?? '';
  const normalizedStepName = stepName.toLowerCase();
  const isTerminalStep = ['kết thúc', 'hoàn thành', 'closed', 'completed', 'end'].some((keyword) =>
    normalizedStepName.includes(keyword),
  );
  const isFinalWorkItemStatus =
    workItemInfo.statusEnum === WorkItemStatusEn.Closed ||
    workItemInfo.statusEnum === WorkItemStatusEn.Cancelled;

  const normalizeStatusName = (value?: string | null, fallback = 'Chờ xử lý') => {
    const raw = value?.trim();
    if (!raw) return fallback;

    const lower = raw.toLowerCase();
    if (lower === 'draft') return 'Nháp';
    if (lower === 'open') return 'Đang xử lý';
    if (lower === 'closed') return 'Hoàn tất';
    if (lower === 'cancelled' || lower === 'canceled') return 'Đã hủy';
    if (lower === 'pending') return 'Chờ xử lý';
    if (lower === 'passed') return 'Đã duyệt';
    if (lower === 'returned') return 'Trả về';
    if (lower === 'rejected') return 'Từ chối';
    return raw;
  };

  const useOverallStatus = isTerminalStep || isFinalWorkItemStatus;
  const badgeStatus = useOverallStatus
    ? {
        name: normalizeStatusName(
          workItemInfo.statusName,
          (isFinalWorkItemStatus ? 'Hoàn tất' : workItemInfo.currentStepName) || 'Kết thúc',
        ),
        color: workItemInfo.statusColor || '#12B76A',
        icon: workItemInfo.statusIcon || 'CheckCircle2',
      }
    : {
        name: normalizeStatusName(workItemInfo.stepStatusName || workItemInfo.statusName),
        color: workItemInfo.stepStatusColor || workItemInfo.statusColor,
        icon: workItemInfo.stepStatusIcon || workItemInfo.statusIcon,
      };

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        className="truncate text-sm font-medium text-foreground"
        title={workItemInfo.currentStepName}
      >
        {stepName || '-'}
      </span>
      <WorkItemStatusBadge
        status={badgeStatus}
        defaultLabel="Chờ xử lý"
        variant="badge"
        className="w-fit h-6 rounded-full px-2.5 text-xs font-medium"
      />
    </div>
  );
}
