import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { cn } from '../../lib/utils';
import { ChevronsUpDownIcon, X } from 'lucide-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

type Option<T = unknown> = {
  label: string | React.ReactNode;
  value: string | number;
  count?: number;
  optionData?: T;
};

type CustomSelectProps<T = unknown> = {
  options: Option<T>[];
  value?: string | number;
  onChangeValue?: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  clearable?: boolean;
  containerClassName?: string;
  disableSorting?: boolean;
  size?: 'sm' | 'default';
};

export function CustomSelect<T = unknown>({
  options,
  placeholder,
  value,
  onChangeValue,
  disabled = false,
  className,
  readOnly,
  loading = false,
  clearable = true,
  containerClassName,
  size,
}: CustomSelectProps<T>) {
  const { t } = useTranslation(['common']);
  const hasMounted = React.useRef(false);

  const handleChange = (val: string) => {
    // Chặn onChange khi Select mount mà value bị "" (bug của Radix)
    if (!hasMounted.current) {
      hasMounted.current = true;
      if (val === '' || val == null) {
        console.log('[CustomSelect] Ignored empty mount change');
        return;
      }
    }

    if (val === '' || val == null) return;
    onChangeValue?.(val);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault(); // ✅ Chặn default behavior
    e.stopPropagation(); // ✅ Chặn bubble
    onChangeValue?.('');
  };

  const hasValue = !!value && value !== undefined && value !== null && String(value).trim() !== '';
  const showClearButton = clearable && hasValue && !disabled && !loading;

  return (
    <div className={cn('relative w-full flex group', containerClassName)}>
      <Select
        value={value !== undefined && value !== null ? String(value) : ''}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectTrigger
          size={size}
          className={cn(
            '[&>svg]:hidden font-normal flex-1 truncate pr-7 w-full',
            {
              'text-foreground opacity-100 pointer-events-none': readOnly,
            },
            !hasValue && '!text-gray-400 font-light hover:text-gray-400',
            className,
          )}
          title={
            typeof options.find((opt) => opt.value === value)?.label === 'string'
              ? (options.find((opt) => opt.value === value)?.label as string)
              : undefined
          }
        >
          <SelectValue placeholder={placeholder ?? t('common:component.placeholder.select')} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              <div className="flex items-center justify-between w-full gap-2 pr-2">
                <span
                  className="truncate"
                  title={typeof opt.label === 'string' ? opt.label : undefined}
                >
                  {opt.label}
                </span>
                {opt.count !== undefined && opt.count > 0 && (
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 rounded-sm shrink-0">
                    {opt.count}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* ✅ Clear button ngoài SelectTrigger */}
      {showClearButton && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleClear(e);
          }}
          className={cn(
            'absolute w-4 h-4 right-2 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer bg-white z-20',
            'opacity-0 scale-90 group-focus-within:opacity-100 group-focus-within:scale-100 group-hover:opacity-100 group-hover:scale-100 transition-all',
          )}
          tabIndex={-1}
        >
          <div
            className={cn(
              'flex items-center justify-center p-[1px] transition-all',
              'rounded-full',
              'bg-gray-400 text-white',
              'hover:bg-gray-500',
            )}
          >
            <X className="!w-3 !h-3" />
          </div>
        </div>
      )}
      <ChevronsUpDownIcon className="h-4 w-4 opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
    </div>
  );
}
