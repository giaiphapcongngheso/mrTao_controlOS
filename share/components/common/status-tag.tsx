import { useTranslation } from 'react-i18next';

type StatusTagProps = {
  status: number;
};

export default function StatusTag({ status }: StatusTagProps) {
  const { t } = useTranslation(['common']);

  return status === 1 ? (
    <span className="rounded bg-[#10b981]/10 text-[#10b981] hover:bg-[#10b981]/20 focus:bg-[#10b981]/20 active:bg-[#10b981]/25 px-2 py-0.5">
      {t('common:isActive.active')}
    </span>
  ) : (
    <span className="rounded bg-[#ff9800]/10 text-[#ff9800] hover:bg-[#ff9800]/20 focus:bg-[#ff9800]/20 active:bg-[#ff9800]/25 px-2 py-0.5">
      {t('common:isActive.inactive')}
    </span>
  );
}
