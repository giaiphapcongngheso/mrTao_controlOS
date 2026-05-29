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
import { CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ActionConfirmDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title?: string;
  readonly description?: string;
  readonly onConfirm: () => void;
  readonly loading?: boolean;
  readonly variant?: 'complete' | 'confirm' | 'submit' | 'close';
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

        <div className="bg-primary/10 border border-primary/20 rounded-md p-3 flex gap-3">
          <CheckCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-primary/90">Vui lòng xác nhận để tiếp tục</p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => onOpenChange(false)}>
            {t('common:cancel', 'Hủy')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
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
