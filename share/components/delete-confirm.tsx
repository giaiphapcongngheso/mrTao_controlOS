import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui';
import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/utils';

type DeleteConfirmProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  warningTitle?: string;
  warningMessage?: string;
  onConfirm: () => void;
  loading?: boolean;
  className?: string;
  overlayClassName?: string;
}>;

export function DeleteConfirm({
  open,
  onOpenChange,
  title,
  description,
  warningTitle,
  warningMessage,
  confirmText,
  cancelText,
  onConfirm,
  loading = false,
  className,
  overlayClassName,
}: DeleteConfirmProps) {
  const { t } = useTranslation('action');

  const displayTitle = title ?? t('confirmDeleteTitle');
  const displayDescription = description ?? t('confirmDeleteDescription');
  const displayConfirmText = confirmText ?? t('delete');
  const displayCancelText = cancelText ?? t('cancel');

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn('sm:max-w-[425px]', className)} overlayClassName={overlayClassName}>
        <AlertDialogHeader>
          <AlertDialogTitle>{displayTitle}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {displayDescription}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {warningMessage && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {warningTitle && (
                <p className="text-sm font-semibold text-destructive mb-1">{warningTitle}</p>
              )}
              <p className="text-sm text-destructive/90">{warningMessage}</p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{displayCancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={loading}
            className="bg-destructive hover:bg-destructive/90"
          >
            {displayConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
