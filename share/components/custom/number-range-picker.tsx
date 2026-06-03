import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { NumericInput } from '../../ui/numeric-input';

interface NumberRangePickerProps {
  value?: [number, number] | undefined;
  onChange?: (value: [number, number] | undefined) => void;
  placeholderFrom?: string;
  placeholderTo?: string;
  className?: string;
}

export function NumberRangePicker({
  value,
  onChange,
  placeholderFrom = 'Từ',
  placeholderTo = 'Đến',
  className,
}: NumberRangePickerProps) {
  const [fromVal, setFromVal] = useState<number | undefined>(undefined);
  const [toVal, setToVal] = useState<number | undefined>(undefined);

  // Sync state with parent value changes
  useEffect(() => {
    if (value) {
      setFromVal(value[0]);
      setToVal(value[1]);
    } else {
      setFromVal(undefined);
      setToVal(undefined);
    }
  }, [value]);

  const handleFromChange = (val: number | undefined) => {
    setFromVal(val);
    if (val === undefined && toVal === undefined) {
      onChange?.(undefined);
    } else {
      onChange?.([val as number, toVal as number]);
    }
  };

  const handleToChange = (val: number | undefined) => {
    setToVal(val);
    if (fromVal === undefined && val === undefined) {
      onChange?.(undefined);
    } else {
      onChange?.([fromVal as number, val as number]);
    }
  };

  const handleClear = () => {
    setFromVal(undefined);
    setToVal(undefined);
    onChange?.(undefined);
  };

  const hasValue = fromVal !== undefined || toVal !== undefined;

  return (
    <div
      className={cn(
        'flex items-center w-full h-8 border border-slate-200 rounded-lg bg-white divide-x divide-slate-100/80 transition-all duration-200 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 overflow-hidden relative group',
        className
      )}
    >
      <NumericInput
        allowDecimal={false}
        placeholder={placeholderFrom}
        value={fromVal}
        onValueChange={handleFromChange}
        className="w-1/2 h-full text-xs px-2 border-0 bg-transparent text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none text-right font-medium"
      />
      <NumericInput
        allowDecimal={false}
        placeholder={placeholderTo}
        value={toVal}
        onValueChange={handleToChange}
        className={cn(
          'w-1/2 h-full text-xs px-2 border-0 bg-transparent text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none text-right font-medium',
          hasValue ? 'pr-6' : ''
        )}
      />
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all border border-slate-100 shadow-3xs cursor-pointer z-20"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
