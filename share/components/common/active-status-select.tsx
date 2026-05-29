import { useTranslation } from 'react-i18next';
import { CustomSelect } from '../custom/custom-select';

interface ActiveStatusSelectProps {
  value: boolean;
  onChangeValue?: (value: boolean) => void;
}

const ActiveStatusSelect = ({ value, onChangeValue }: ActiveStatusSelectProps) => {
  const { t } = useTranslation('common');
  return (
    <CustomSelect
      value={value !== undefined ? String(value) : undefined}
      className="shadow-none"
      placeholder={t('isActive.placeholder')}
      options={[
        { label: t('isActive.active'), value: String(true) },
        { label: t('isActive.inactive'), value: String(false) },
      ]}
      onChangeValue={onChangeValue ? (val) => onChangeValue(val === 'true') : undefined}
    />
  );
};

export default ActiveStatusSelect;
