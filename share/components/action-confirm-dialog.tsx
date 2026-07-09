import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

type ActionConfirmDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title?: string;
  readonly description?: string;
  readonly onConfirm: () => void;
  readonly loading?: boolean;
  readonly variant?: 'complete' | 'confirm' | 'submit' | 'close' | 'danger';
};

export function ActionConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  loading = false,
  variant = 'complete',
}: ActionConfirmDialogProps) {
  const { t } = useTranslation(['action', 'common']);

  const getVariantConfig = () => {
    switch (variant) {
      case 'complete':
        return {
          title: title ?? t('action:confirmComplete', 'Xác nhận hoàn thành'),
          description:
            description ??
            t('action:confirmCompleteDesc', 'Bạn có chắc chắn muốn hoàn thành công việc này?'),
          buttonClass: 'bg-primary hover:bg-primary/90',
        };
      case 'submit':
        return {
          title: title ?? t('action:confirmSubmit', 'Xác nhận gửi'),
          description:
            description ??
            t(
              'action:confirmSubmitDesc',
              'Sau khi gửi sẽ không thể chỉnh sửa được nữa, bạn có chắc chắn muốn gửi đến bước tiếp theo?',
            ),
          buttonClass: 'bg-primary hover:bg-primary/90',
        };
      case 'confirm':
        return {
          title: title ?? t('action:confirmAction', 'Xác nhận'),
          description:
            description ?? t('action:confirmActionDesc', 'Bạn có chắc chắn muốn xác nhận?'),
          buttonClass: 'bg-primary hover:bg-primary/90',
        };
      case 'close':
        return {
          title: title ?? t('action:confirmClose', 'Xác nhận đóng'),
          description:
            description ??
            t('action:confirmCloseDesc', 'Bạn có chắc chắn muốn đóng công việc này?'),
          buttonClass: 'bg-primary hover:bg-primary/90',
        };
      case 'danger':
        return {
          title: title ?? 'Xác nhận xóa',
          description: description ?? 'Hành động này không thể hoàn tác, bạn có chắc chắn muốn xóa?',
          buttonClass: 'bg-[#C21A1A] hover:bg-[#A81515] text-white focus:ring-red-500',
        };
    }
  };

  const config = getVariantConfig();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className={cn(
          "border rounded-md p-3 flex gap-3",
          variant === 'danger' ? "bg-red-50 border-red-200" : "bg-primary/10 border-primary/20"
        )}>
          {variant === 'danger' ? (
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className={cn(
              "text-sm font-medium",
              variant === 'danger' ? "text-red-700" : "text-primary/90"
            )}>
              Vui lòng xác nhận để tiếp tục
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => onOpenChange(false)}>
            {t('common:cancel', 'Hủy')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
              onOpenChange(false);
            }}
            disabled={loading}
            className={config.buttonClass}
          >
            {t('common:confirm', 'Xác nhận')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
