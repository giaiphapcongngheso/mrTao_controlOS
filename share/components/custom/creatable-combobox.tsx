import { useState, useRef, useMemo, useEffect } from 'react';
import {
  Input,
  Popover,
  PopoverContent,
  PopoverAnchor,
  Command,
  CommandList,
  CommandGroup,
  CommandItem,
} from '../../ui';
import { Plus, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

export type CreatableComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  onAddNew?: (value: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  emptyHint?: string;
  addNewText?: string;
  className?: string;
  containerClassName?: string;
};

export function CreatableCombobox({
  value,
  onValueChange,
  options,
  onAddNew,
  placeholder,
  disabled = false,
  emptyHint,
  addNewText,
  className,
  containerClassName,
}: CreatableComboboxProps) {
  const { t } = useTranslation(['common', 'action']);
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue) return options;
    const lower = String(inputValue ?? '').toLowerCase();
    return options.filter((s) =>
      String(s ?? '')
        .toLowerCase()
        .includes(lower),
    );
  }, [options, inputValue]);

  const isValueInSuggestions = useMemo(() => {
    const lowerInput = String(inputValue ?? '').toLowerCase();
    return options.some((s) => String(s ?? '').toLowerCase() === lowerInput);
  }, [options, inputValue]);

  const handleSelect = (val: string) => {
    setInputValue(val);
    onValueChange(val);
    setOpen(false);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    onValueChange(val);
    if (!open && val) setOpen(true);
  };

  const handleAddNew = async (val: string) => {
    if (!val) return;
    try {
      if (onAddNew) {
        await onAddNew(val);
      }
      setInputValue(val);
      onValueChange(val);
      setOpen(false);
    } catch (error) {
      // Failed to add new, do not update value or close
    }
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div
          ref={wrapperRef}
          className={cn(
            'flex items-center w-full min-h-8 border border-border rounded-sm focus-within:ring-1 focus-within:ring-primary/50 transition-all bg-background',
            disabled && 'opacity-50 cursor-not-allowed',
            containerClassName,
          )}
          onMouseDown={(e) => {
            if (document.activeElement !== inputRef.current && !disabled) {
              e.preventDefault();
              inputRef.current?.focus();
            }
          }}
        >
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (!disabled) setOpen(true);
            }}
            placeholder={placeholder ?? t('common:component.placeholder.enter', 'Nhập giá trị...')}
            disabled={disabled}
            className={cn(
              'h-8 border-0 bg-transparent ring-0 focus-visible:ring-0 text-sm',
              className,
            )}
            autoComplete="off"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-0 overflow-hidden"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onFocusOutside={(e) => {
          if (document.activeElement === inputRef.current) {
            e.preventDefault();
          }
        }}
        onInteractOutside={(e) => {
          if (wrapperRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
        style={{ width: inputRef.current?.getBoundingClientRect().width }}
      >
        <Command className="w-full flex flex-col" shouldFilter={false}>
          <CommandList
            className="max-h-[200px] overflow-y-auto"
            onWheel={(e) => e.stopPropagation()}
          >
            <CommandGroup>
              {filteredSuggestions.map((s) => (
                <CommandItem key={s} value={s} onSelect={() => handleSelect(s)}>
                  <Check
                    className={cn('mr-2 h-4 w-4', inputValue === s ? 'opacity-100' : 'opacity-0')}
                  />
                  {s}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {(!inputValue || (!isValueInSuggestions && inputValue && onAddNew)) && (
            <div className="border-t border-border/40 bg-muted/20">
              {!inputValue && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  {emptyHint ?? t('common:message.typeToCreate', 'Nhập để tạo mới nếu chưa có')}
                </div>
              )}
              {!isValueInSuggestions && inputValue && onAddNew && (
                <CommandGroup className="p-1">
                  <CommandItem
                    value={`--add-new-${inputValue}`}
                    onSelect={() => handleAddNew(inputValue)}
                    className="text-primary font-medium"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addNewText ?? t('action:add-new', 'Thêm mới')}: "{inputValue}"
                  </CommandItem>
                </CommandGroup>
              )}
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
