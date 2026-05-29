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
import { cn } from '../lib/utils';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'success' | 'supply';

type ActionConfirmProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  warningMessage?: string;
  warningLabel?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: ConfirmVariant;
  dialogContentClassName?: string;
};

export function ActionConfirm({
  open,
  onOpenChange,
  title,
  description,
  warningMessage,
  warningLabel,
  confirmText,
  cancelText = 'Cancel',
  onConfirm,
  dialogContentClassName,
  loading = false,
  variant = 'default',
}: ActionConfirmProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          buttonClass: 'bg-destructive hover:bg-destructive/90',
          iconColor: 'text-destructive',
          bgColor: 'bg-destructive/10 border-destructive/20',
          icon: <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />,
          defaultLabel: 'Warning',
        };
      case 'warning':
        return {
          buttonClass: 'bg-yellow-600 hover:bg-yellow-700',
          iconColor: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          icon: <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />,
          defaultLabel: 'Note',
        };
      case 'success':
        return {
          buttonClass: 'bg-green-600 hover:bg-green-700',
          iconColor: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          icon: <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />,
          defaultLabel: 'Info',
        };
      default:
        return {
          buttonClass: 'bg-primary hover:bg-primary/90',
          iconColor: 'text-primary',
          bgColor: 'bg-primary/10 border-primary/20',
          icon: <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />,
          defaultLabel: 'Info',
        };
    }
  };

  const styles = getVariantStyles();
  const label = warningLabel ?? styles.defaultLabel;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className={cn('sm:max-w-[425px]', dialogContentClassName)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base max-h-[70vh] overflow-y-auto sm:max-h-[500px]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {warningMessage && (
          <div
            className={cn(
              'h-full max-h-[80vh] overflow-y-auto border rounded-md p-3 flex gap-3',
              styles.bgColor,
            )}
          >
            {styles.icon}
            <div className="flex-1">
              <p className={`text-sm font-semibold ${styles.iconColor} mb-1`}>{label}</p>
              <p className={`text-sm ${styles.iconColor}/90`}>{warningMessage}</p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelText}</AlertDialogCancel>
          {confirmText && (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                onConfirm();
              }}
              disabled={loading}
              className={styles.buttonClass}
            >
              {confirmText}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
