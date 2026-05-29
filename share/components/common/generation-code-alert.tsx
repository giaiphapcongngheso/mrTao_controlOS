import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../ui/alert-dialog';
import { IGenerationCodeInfo } from '@shared/types';
import { useTranslation } from 'react-i18next';

type GenerationCodeAlertProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationCodeInfo?: IGenerationCodeInfo | null;
  onCreateRule?: (info?: IGenerationCodeInfo | null) => void;
};

export function GenerationCodeAlert({
  open,
  onOpenChange,
  generationCodeInfo,
  onCreateRule,
}: GenerationCodeAlertProps) {
  const { t } = useTranslation(['message', 'action']);

  const handleCreateRule = () => {
    if (onCreateRule) {
      // onCreateRule sẽ tự xử lý việc đóng alert và mở form
      // Truyền generationCodeInfo dù có hay không để form có thể sử dụng thông tin targetTable, namespace nếu có
      onCreateRule(generationCodeInfo);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('message:generationCode.notConfigured')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('message:generationCode.pleaseCreateRule')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('action:cancel')}</AlertDialogCancel>
          {onCreateRule && (
            <AlertDialogAction onClick={handleCreateRule}>
              {t('action:createRule')}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
