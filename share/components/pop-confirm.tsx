import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui';
import { cn } from '../lib/utils';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { ReactElement, useState } from 'react';

type ConfirmVariant = 'default' | 'destructive' | 'warning' | 'success';

type PopConfirmProps = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  warningLabel?: string;
  warningMessage?: string;
  onConfirm: () => void;
  loading?: boolean;
  variant?: ConfirmVariant;
  children: (onClick: () => void) => ReactElement;
};

export function PopConfirm({
  title = 'Confirm Action',
  description = 'Are you sure you want to perform this action?',
  warningLabel,
  warningMessage,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  loading = false,
  variant = 'default',
  children,
}: PopConfirmProps) {
  const [open, setOpen] = useState(false);

  const getAttribute = () => {
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
          defaultLabel: 'Success',
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

  const attribute = getAttribute();
  const label = warningLabel ?? attribute.defaultLabel;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children(() => setOpen(true))}</AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-[425px]" onEscapeKeyDown={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {warningMessage && (
          <div className={cn('border rounded-md p-3 flex gap-3', attribute.bgColor)}>
            {attribute.icon}
            <div className="flex-1">
              <p className={cn('text-sm font-semibold mb-1', attribute.iconColor)}>{label}</p>
              <p className={cn('text-sm', `${attribute.iconColor}/90`)}>{warningMessage}</p>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => setOpen(false)}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
            disabled={loading}
            className={attribute.buttonClass}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
