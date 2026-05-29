import { Button } from '../ui/button';
import { cn } from '../lib';
import { ActionCodeEn } from '../types';
import {
  CheckCircle,
  XCircle,
  CornerUpLeft,
  X,
  UserPlus,
  CircleCheck,
  Send,
  Lock,
  Loader2,
  type LucideIcon,
  Edit,
  ArrowRight,
} from 'lucide-react';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActionReasonDialog } from './action-reason-dialog';
import { ActionCommentDialog } from './action-comment-dialog';
import { ActionConfirmDialog } from './action-confirm-dialog';

type ActionButtonProps = Omit<ComponentProps<typeof Button>, 'children' | 'onClick'> & {
  readonly actionCode: ActionCodeEn;
  readonly label?: string;
  readonly loading?: boolean;
  /** If true, skip the built-in confirm/reason/comment dialog and call onClick directly */
  readonly skipConfirmDialog?: boolean;
  readonly onClick?: (
    actionCode: ActionCodeEn,
    data?: { reason?: string; comment?: string },
  ) => void;
};

const actionConfig: Partial<
  Record<
    ActionCodeEn,
    {
      label: string;
      className: string;
      icon: LucideIcon;
    }
  >
> = {
  [ActionCodeEn.TRANSFER]: {
    label: 'Chuyển tiếp',
    className: 'bg-transparent text-primary border border-primary hover:bg-primary/10',
    icon: ArrowRight,
  },
  [ActionCodeEn.APPROVE]: {
    label: 'Phê duyệt',
    className: '!bg-primary !hover:bg-primary/90 !text-white border-0',
    icon: CheckCircle,
  },
  [ActionCodeEn.REJECT]: {
    label: 'Từ chối',
    className:
      'bg-transparent text-red-600 border border-red-600 hover:bg-red-50 hover:text-red-700',
    icon: XCircle,
  },
  [ActionCodeEn.RETURN]: {
    label: 'Trả về',
    className:
      'bg-transparent text-orange-600 border border-orange-500 hover:bg-orange-50 hover:text-orange-700',
    icon: CornerUpLeft,
  },
  [ActionCodeEn.CANCEL]: {
    label: 'Hủy',
    className:
      'bg-transparent text-gray-600 border border-gray-400 hover:bg-gray-50 hover:text-gray-700',
    icon: X,
  },
  [ActionCodeEn.ASSIGN]: {
    label: 'Giao việc',
    className:
      'bg-transparent text-primary border border-primary hover:bg-green-50 hover:text-green-700',
    icon: UserPlus,
  },
  [ActionCodeEn.COMPLETE]: {
    label: 'Hoàn thành',
    className: '!bg-primary !hover:bg-primary/90 !text-white border-0',
    icon: CircleCheck,
  },
  [ActionCodeEn.CONFIRM]: {
    label: 'Xác nhận',
    className: '!bg-primary !hover:bg-primary/90 !text-white border-0',
    icon: CheckCircle,
  },
  [ActionCodeEn.SUBMIT]: {
    label: 'Gửi phê duyệt',
    className: '!bg-primary !hover:bg-primary/90 !text-white border-0',
    icon: Send,
  },
  [ActionCodeEn.CLOSE]: {
    label: 'Đóng',
    className: '!bg-primary !hover:bg-primary/90 !text-white border-0',
    icon: Lock,
  },
  [ActionCodeEn.EDIT]: {
    label: 'Chỉnh sửa',
    className:
      'bg-transparent text-gray-600 border border-gray-400 hover:bg-gray-50 hover:text-gray-700',
    icon: Edit,
  },
  [ActionCodeEn.PROCESSED]: {
    label: 'Đã xử lý',
    className:
      'bg-transparent text-primary border border-primary hover:bg-green-50 hover:text-green-700',
    icon: CheckCircle,
  },
};

export function ActionButton({
  actionCode,
  label,
  className,
  loading,
  skipConfirmDialog,
  onClick,
  disabled,
  ...props
}: ActionButtonProps) {
  const { t } = useTranslation('action');
  const config = actionConfig[actionCode];
  const isDisabled = disabled ?? loading;

  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleClick = () => {
    // If skipConfirmDialog is set, bypass all built-in dialogs
    if (skipConfirmDialog) {
      onClick?.(actionCode);
      return;
    }

    if (
      actionCode === ActionCodeEn.REJECT ||
      actionCode === ActionCodeEn.RETURN ||
      actionCode === ActionCodeEn.CANCEL
    ) {
      setReasonDialogOpen(true);
      return;
    }

    if (actionCode === ActionCodeEn.APPROVE) {
      setCommentDialogOpen(true);
      return;
    }

    if (
      actionCode === ActionCodeEn.COMPLETE ||
      actionCode === ActionCodeEn.CONFIRM ||
      actionCode === ActionCodeEn.SUBMIT ||
      actionCode === ActionCodeEn.CLOSE
    ) {
      setConfirmDialogOpen(true);
      return;
    }

    onClick?.(actionCode);
  };

  const Icon = loading ? Loader2 : config?.icon;
  const actionKey = actionCode.toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase());
  const translatedLabel = label ?? t(actionKey, config?.label || actionCode);

  return (
    <>
      <Button
        className={cn('flex items-center gap-2', config?.className, className)}
        onClick={handleClick}
        disabled={isDisabled}
        {...props}
      >
        {Icon && <Icon className={cn('h-4 w-4', loading && 'animate-spin')} />}
        {translatedLabel}
      </Button>

      {(actionCode === ActionCodeEn.REJECT ||
        actionCode === ActionCodeEn.RETURN ||
        actionCode === ActionCodeEn.CANCEL) && (
        <ActionReasonDialog
          open={reasonDialogOpen}
          onOpenChange={setReasonDialogOpen}
          variant={
            actionCode === ActionCodeEn.REJECT
              ? 'reject'
              : actionCode === ActionCodeEn.RETURN
                ? 'return'
                : 'cancel'
          }
          onConfirm={(reason) => {
            setReasonDialogOpen(false);
            onClick?.(actionCode, { reason });
          }}
        />
      )}

      {actionCode === ActionCodeEn.APPROVE && (
        <ActionCommentDialog
          open={commentDialogOpen}
          onOpenChange={setCommentDialogOpen}
          onConfirm={(comment) => {
            setCommentDialogOpen(false);
            onClick?.(actionCode, { comment });
          }}
        />
      )}

      {(actionCode === ActionCodeEn.COMPLETE ||
        actionCode === ActionCodeEn.CONFIRM ||
        actionCode === ActionCodeEn.SUBMIT ||
        actionCode === ActionCodeEn.CLOSE) && (
        <ActionConfirmDialog
          open={confirmDialogOpen}
          onOpenChange={setConfirmDialogOpen}
          variant={
            actionCode === ActionCodeEn.COMPLETE
              ? 'complete'
              : actionCode === ActionCodeEn.CONFIRM
                ? 'confirm'
                : actionCode === ActionCodeEn.SUBMIT
                  ? 'submit'
                  : 'close'
          }
          onConfirm={() => {
            setConfirmDialogOpen(false);
            onClick?.(actionCode);
          }}
        />
      )}
    </>
  );
}

export { actionConfig };
