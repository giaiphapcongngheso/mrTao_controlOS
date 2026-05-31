import React, { useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from './button';
import { cn } from '@shared/lib/utils';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = React.memo(function SearchInput({
  value,
  onChange,
  onClear,
  placeholder = "Tìm kiếm...",
  className,
  containerClassName,
  ...props
}: SearchInputProps) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handleClear = useCallback(() => {
    onChange('');
    if (onClear) onClear();
  }, [onChange, onClear]);

  return (
    <div className={cn("relative flex-1 w-full", containerClassName)}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className={cn(
          "w-full text-xs font-medium pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/90 focus:outline-[#C21A1A] focus:ring-1 focus:ring-[#C21A1A] bg-white transition-all shadow-2xs",
          className
        )}
        {...props}
      />
      {value && (
        <Button 
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 h-7 w-7 rounded-lg border-none"
          title="Xóa tìm kiếm"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </Button>
      )}
    </div>
  );
});
