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

type ActionCommentDialogProps = {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title?: string;
  readonly description?: string;
  readonly label?: string;
  readonly placeholder?: string;
  readonly onConfirm: (comment: string) => void;
  readonly loading?: boolean;
};

export function ActionCommentDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder,
  onConfirm,
  loading = false,
}: ActionCommentDialogProps) {
  const { t } = useTranslation(['action', 'common']);
  const [comment, setComment] = useState('');

  const handleConfirm = () => {
    onConfirm(comment);
    setComment('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setComment('');
    }
    onOpenChange(newOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? 'Phê duyệt'}</AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            {description ?? 'Vui lòng nhập ý kiến/nhận xét (tùy chọn)'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="comment">{label ?? 'Ý kiến/nhận xét'}</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={placeholder ?? 'Nhập ý kiến/nhận xét...'}
            className="min-h-[100px]"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={() => handleOpenChange(false)}>
            {t('common:cancel', 'Hủy')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-primary hover:bg-primary/90"
          >
            {t('common:confirm', 'Xác nhận')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
