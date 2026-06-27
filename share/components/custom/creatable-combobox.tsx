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
import { Plus, Check, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';


export type CreatableComboboxProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  onAddNew?: (value: string) => Promise<void> | void;
  onDeleteOption?: (value: string) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
  emptyHint?: string;
  addNewText?: string;
  className?: string;
  containerClassName?: string;
  getOptionIcon?: (value: string) => React.ComponentType<{ className?: string }> | null | undefined;
};

export function CreatableCombobox({
  value,
  onValueChange,
  options,
  onAddNew,
  onDeleteOption,
  placeholder,
  disabled = false,
  emptyHint,
  addNewText,
  className,
  containerClassName,
  getOptionIcon,
}: CreatableComboboxProps) {

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
          {(() => {
            const ActiveIcon = getOptionIcon && value ? getOptionIcon(value) : null;
            return ActiveIcon ? <ActiveIcon className="ml-3 h-4 w-4 text-slate-500 shrink-0" /> : null;
          })()}
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (!disabled) setOpen(true);
            }}
            placeholder={placeholder ?? 'Nhập giá trị...'}
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
              {filteredSuggestions.map((s) => {
                const IconComponent = getOptionIcon ? getOptionIcon(s) : null;
                return (
                  <CommandItem
                    key={s}
                    value={s}
                    onSelect={() => handleSelect(s)}
                    className="flex items-center justify-between group/item w-full"
                  >
                    <div className="flex items-center flex-1 min-w-0">
                      <Check
                        className={cn('mr-2 h-4 w-4 shrink-0', inputValue === s ? 'opacity-100' : 'opacity-0')}
                      />
                      {IconComponent && <IconComponent className="mr-2 h-4 w-4 text-slate-500 shrink-0" />}
                      <span className="truncate">{s}</span>
                    </div>
                    {onDeleteOption && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          void onDeleteOption(s);
                        }}
                        className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-rose-50 hover:text-rose-600 rounded transition-all text-slate-400 shrink-0"
                        title="Xóa"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {(!inputValue || (!isValueInSuggestions && inputValue && onAddNew)) && (
            <div className="border-t border-border/40 bg-muted/20">
              {!inputValue && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                  {emptyHint ?? 'Nhập để tạo mới nếu chưa có'}
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
                    {addNewText ?? 'Thêm mới'}: "{inputValue}"
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
