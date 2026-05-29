import { useMemo } from 'react';
import { Combobox } from '@shared/ui/combobox';
import { useTranslation } from 'react-i18next';

interface TimeSelectProps {
  readonly value?: string;
  readonly onChangeValue?: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly step?: number; // minutes, default 15
}

export function TimeSelect({
  value,
  onChangeValue,
  placeholder,
  disabled,
  step = 15,
}: TimeSelectProps) {
  const { t } = useTranslation(['common']);
  const options = useMemo(() => {
    const opts = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += step) {
        const h = hour.toString().padStart(2, '0');
        const m = min.toString().padStart(2, '0');
        const time = `${h}:${m}`;
        opts.push({
          label: time,
          value: time,
        });
      }
    }
    return opts;
  }, [step]);

  return (
    <Combobox
      options={options}
      value={value ? [value] : []}
      onValueChange={(val) => onChangeValue?.(String(val[0] ?? ''))}
      placeholder={placeholder ?? t('common:component.placeholder.select')}
      searchPlaceholder={t('common:component.placeholder.search')}
      disabled={disabled}
      className="w-full"
    />
  );
}
