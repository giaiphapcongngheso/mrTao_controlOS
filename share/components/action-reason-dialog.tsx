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
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

type ActionReasonDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title?: string;
  readonly description?: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly onConfirm: (reason: string) => void;
  readonly loading?: boolean;
  readonly variant?: 'reject' | 'return' | 'cancel';
};

export function ActionReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  onConfirm,
  loading = false,
  variant = 'reject',
}: ActionReasonDialogProps) {
  const { t } = useTranslation(['action', 'common']);
  const [reason, setReason] = useState('');

  const getVariantConfig = () => {
    switch (variant) {
      case 'reject':
        return {
          title: title ?? 'Từ chối',
          description: description ?? 'Vui lòng nhập lý do từ chối',
          label: label ?? 'Lý do từ chối',
          placeholder: placeholder ?? 'Nhập lý do từ chối...',
          buttonClass: 'bg-red-600 hover:bg-red-700',
        };
      case 'return':
        return {
          title: title ?? 'Trả về',
          description: description ?? 'Vui lòng nhập lý do trả về',
          label: label ?? 'Lý do trả về',
          placeholder: placeholder ?? 'Nhập lý do trả về...',
          buttonClass: 'bg-orange-500 hover:bg-orange-600',
        };
      case 'cancel':
        return {
          title: title ?? 'Hủy',
          description: description ?? 'Vui lòng nhập lý do hủy',
          label: label ?? 'Lý do hủy',
          placeholder: placeholder ?? 'Nhập lý do hủy...',
          buttonClass: 'bg-gray-500 hover:bg-gray-600',
        };
    }
  };

  const config = getVariantConfig();

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
      setReason('');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setReason('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{config.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {config.description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="reason">{config.label} *</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={config.placeholder}
            className="min-h-[100px]"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => handleOpenChange(false)}>
            {t('common:cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading || !reason.trim()}
            className={config.buttonClass}
          >
            {t('common:confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
