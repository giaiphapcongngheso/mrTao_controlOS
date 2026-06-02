import * as React from 'react';

import { cn } from '../lib/utils';
import { X } from 'lucide-react';

export type InputProps = Omit<React.ComponentProps<'input'>, 'size'> & {
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  position?: 'left' | 'right';
  clearable?: boolean;
  containerClassName?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
};

function Input({
  className,
  type,
  size = 'md',
  icon,
  position,
  clearable = true,
  value,
  containerClassName,
  onChange,
  prefix,
  suffix,
  ...props
}: InputProps) {
  const iconClass = position === 'left' ? 'left-3' : 'right-3';

  const padding = position === 'left' ? 'pl-8' : 'pr-8';
  const sizeClass =
    size === 'sm'
      ? 'h-8 text-sm px-2'
      : size === 'lg'
        ? 'h-11 text-base px-4'
        : 'h-9 text-base px-3';

  const prefixPadding = prefix ? 'pl-8' : '';
  const suffixPadding = suffix ? 'pr-10' : '';

  const handleClear = () => {
    if (onChange) {
      onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (type === 'number') {
      const value = e.target.value;

      if (value === '') {
        onChange?.(e);
        return;
      }

      const numericValue = Number(value);

      if (Number.isNaN(numericValue)) return;

      let nextValue = numericValue;

      if (props.min !== undefined) {
        const min = Number(props.min);
        if (nextValue < min) nextValue = min;
      }

      if (props.max !== undefined) {
        const max = Number(props.max);
        if (nextValue > max) nextValue = max;
      }

      if (nextValue !== numericValue) {
        const newEvent = {
          ...e,
          target: {
            ...e.target,
            value: String(nextValue),
          },
        } as React.ChangeEvent<HTMLInputElement>;

        onChange?.(newEvent);
        return;
      }
    }

    onChange?.(e);
  };

  const showClearButton =
    !props?.readOnly && !props?.disabled && !!clearable && !!value && String(value).length > 0;

  return (
    <div className={cn('relative w-full group', containerClassName)}>
      {icon && (
        <span className={`absolute ${iconClass} top-1/2 -translate-y-1/2 text-[#A3A3A3]`}>
          {icon}
        </span>
      )}
      {prefix && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {prefix}
        </span>
      )}
      <input
        type={type}
        data-slot="input"
        className={cn(
          'font-sans file:text-foreground placeholder:font-light placeholder:text-gray-400 dark:placeholder:text-[#fff]/30 [&[type=number]]:pr-2 selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-[#fff] px-3 py-1 text-[#141414] dark:text-[#fff] shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#FAFAFA] disabled:text-[#A3A3A3] md:text-sm read-only:bg-[#FAFAFA] read-only:text-[#141414]',
          'focus-visible:border-primary focus-visible:ring-primary/18 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          suffix &&
            '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          sizeClass,
          icon ? padding : '',
          prefixPadding,
          suffixPadding,
          showClearButton && !suffix ? 'pr-7' : '',
          className,
        )}
        value={value}
        onChange={handleChange}
        {...props}
      />
      {suffix && (
        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-secondary px-2 py-1 rounded-sm pointer-events-none z-10">
          {suffix}
        </span>
      )}
      {props?.readOnly ||
        props?.disabled ||
        (showClearButton && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
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
          </button>
        ))}
    </div>
  );
}

export { Input };
