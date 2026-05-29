import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, InputProps } from '../../ui/input';

type Props = Omit<InputProps, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
};

export default function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  placeholder,
  ...props
}: Props) {
  const [value, setValue] = useState<string>('');
  const { t } = useTranslation('action');

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // khi đổi page ở customTable => DebouncedInput bị re-render
      // => value !== initialValue => onChange được gọi => lại đổi page => vòng lặp
      // => vì thế cần thêm check value !== initialValue
      if (value !== initialValue) {
        onChange(value);
      }
    }, debounce);

    return () => clearTimeout(timeout);
  }, [debounce, onChange, value, initialValue]);

  return (
    <Input
      {...props}
      placeholder={placeholder ?? t('action:search')}
      size={props.size || 'md'}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
