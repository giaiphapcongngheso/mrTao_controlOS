import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckIcon,
  ChevronsUpDownIcon,
  Lightbulb,
  Plus,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';
import * as React from 'react';

import { CodeWithCopy } from '../components/code-with-copy';
import { Button, buttonVariants } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { cn, removeVietnameseTones } from '../lib/utils';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { VariantProps } from 'class-variance-authority';

export interface ComboboxOption<T> {
  value: string;
  label: string;
  /** Optional: pass code here or via optionData.code (when showCode is true) */
  code?: string;
  /** Optional: display a count badge (e.g. for number of items available) */
  count?: number;
  /** Dùng cho tìm kiếm khi có; nếu không có thì dùng label + code. Cho phép tìm theo nhiều trường (code, name, finishedGoodName, ...). */
  searchText?: string;
  optionData?: T;
}

/** Type for optionData that has code (e.g. IFlatItem) */
interface WithCode {
  code?: string;
}

export interface ComboboxProps<T = unknown> {
  options: ComboboxOption<T>[];
  loading?: boolean;
  value?: string | Array<string | number>;
  onValueChange?: (value: any) => void;
  onOpenChange?: (open: boolean, option?: ComboboxOption<T>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  /** Message to show when value doesn't match any option (e.g. deleted item) */
  notFoundMessage?: string;
  className?: string;
  disabled?: boolean;
  clearable?: boolean;
  popoverClassName?: string;
  popoverContentWidth?: number;
  /** Allow the user to drag-resize the popover width */
  popoverResizable?: boolean;
  popoverContentProps?: React.ComponentProps<typeof PopoverPrimitive.Content>;
  popoverProps?: React.ComponentProps<typeof PopoverPrimitive.Root>;
  buttonProps?: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    };
  suggestion?: string[];
  renderOption?: (option: ComboboxOption<T>, isSelected: boolean) => React.ReactNode;
  renderSelectedOption?: (option: ComboboxOption<T> | undefined) => React.ReactNode;
  allowCustom?: boolean;
  onCustomValue?: (value: string) => void;
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  excludes?: string[];
  itemClassName?: string;
  showCode?: boolean;
  codePrefix?: string;
  invalid?: boolean;
  t?: (key: string) => string;
  extraFooter?: React.ReactNode;
  extraHeader?: React.ReactNode;
  customValueLabel?: string;
}

export function Combobox<T>({
  options,
  loading = false,
  value: controlledValue,
  onValueChange,
  onOpenChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No option found.',
  notFoundMessage = 'Value not found or deleted',
  popoverClassName,
  popoverContentWidth = 400,
  popoverResizable = true,
  popoverContentProps = { side: 'bottom', align: 'start' },
  popoverProps,
  buttonProps,
  suggestion,
  disabled = false,
  clearable = true,
  renderOption,
  renderSelectedOption,
  allowCustom,
  onCustomValue,
  error,
  errorMessage,
  onRetry,
  excludes,
  itemClassName,
  invalid = false,
  className,
  showCode = true,
  codePrefix = '# ',
  t,
  extraFooter,
  extraHeader,
  customValueLabel = 'Add new',
}: ComboboxProps<T>) {
  const getCode = (option: ComboboxOption<T>): string | undefined => {
    if (option.code != null && option.code !== '') return option.code;
    const fromData = (option.optionData as WithCode | undefined)?.code;
    return fromData != null && fromData !== '' ? fromData : undefined;
  };

  const getOptionCode = (option: ComboboxOption<T>) => {
    if (!showCode) return undefined;
    const code = getCode(option);
    return code != null && code !== '' ? code : undefined;
  };
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [internalValue, setInternalValue] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [internalLoading, setInternalLoading] = React.useState(false);
  const prevLoadingRef = React.useRef(loading);

  // Combined loading: external prop OR internal (triggered by reload button)
  const isLoading = loading || internalLoading;

  // Clear internal loading only when external loading transitions true → false
  React.useEffect(() => {
    if (prevLoadingRef.current && !loading && internalLoading) {
      setInternalLoading(false);
    }
    prevLoadingRef.current = loading;
  }, [loading, internalLoading]);

  const [resizedWidth, setResizedWidth] = React.useState<number | undefined>(undefined);
  const popoverInnerRef = React.useRef<HTMLDivElement>(null);
  const effectiveWidth = resizedWidth ?? popoverContentWidth;

  const handleResizeMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const contentEl = popoverInnerRef.current?.closest(
      '[data-slot="popover-content"]',
    ) as HTMLElement | null;
    if (!contentEl) return;
    const startWidth = contentEl.getBoundingClientRect().width;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(200, startWidth + (moveEvent.clientX - startX));
      contentEl.style.width = `${newWidth}px`;
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setResizedWidth(contentEl.getBoundingClientRect().width);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // Use controlled value if provided, otherwise use internal state
  const rawValue = controlledValue !== undefined ? controlledValue : internalValue;
  const normalizedValue = Array.isArray(rawValue)
    ? String(rawValue[0] || '')
    : String(rawValue || '');
  const value = normalizedValue;

  const handleValueChange = (newValue: string) => {
    const finalValue = newValue === value ? '' : newValue;

    if (controlledValue === undefined) {
      setInternalValue(finalValue);
    }

    if (onValueChange) {
      if (Array.isArray(controlledValue)) {
        onValueChange(finalValue ? [finalValue] : []);
      } else {
        onValueChange(finalValue);
      }
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (controlledValue === undefined) {
      setInternalValue('');
    }

    if (onValueChange) {
      if (Array.isArray(controlledValue)) {
        onValueChange([]);
      } else {
        onValueChange('');
      }
    }
  };

  const filteredOptions = React.useMemo(() => {
    if (!open) return [];

    let filtered = options;

    if (excludes && excludes.length > 0) {
      filtered = filtered.filter((opt) => !excludes.includes(opt.value));
    }

    if (query) {
      const searchLower = removeVietnameseTones(query?.toLowerCase());
      filtered = filtered.filter((opt) => {
        const textToSearch = opt.searchText ?? [opt?.label, getCode(opt)].filter(Boolean).join(' ');
        return removeVietnameseTones(textToSearch.toLowerCase())?.includes(searchLower);
      });
    }

    return [...filtered].sort((a, b) => {
      const labelA = (a.label || '').toLowerCase().trim();
      const labelB = (b.label || '').toLowerCase().trim();

      const compareResult = labelA.localeCompare(labelB, undefined, {
        sensitivity: 'base',
        numeric: true,
        ignorePunctuation: true,
      });

      return sortOrder === 'asc' ? compareResult : -compareResult;
    });
  }, [options, query, sortOrder, excludes, open]);

  // Track previous options count for skeleton rows
  const prevOptionsCountRef = React.useRef(5);
  React.useEffect(() => {
    if (filteredOptions.length > 0 && !isLoading) {
      prevOptionsCountRef.current = Math.min(filteredOptions.length, 10);
    }
  }, [filteredOptions.length, isLoading]);

  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const renderOptionContent = (option: ComboboxOption<T>, isSelected: boolean) => {
    if (renderOption) {
      return renderOption(option, isSelected);
    }

    return (
      <>
        <CheckIcon className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
        <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
          <span className="truncate leading-tight">{option.label}</span>
          {option.count !== undefined && option.count > 0 && (
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 rounded-sm shrink-0">
              {option.count}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-0 min-w-0">
          {getOptionCode(option) != null && (
            <CodeWithCopy
              code={getOptionCode(option)!}
              prefix={codePrefix}
              size="sm"
              textClassName="text-muted-foreground"
              className="text-muted-foreground"
            />
          )}
        </div>
      </>
    );
  };

  const isValueNotFound = value && !selectedOption && !isLoading && options.length > 0;

  const renderSelectedOptionContent = () => {
    if (selectedOption) {
      if (renderSelectedOption) {
        return renderSelectedOption(selectedOption);
      }
      const selectedCode = getOptionCode(selectedOption);
      if (selectedCode != null) {
        return (
          <div className="flex flex-col gap-0 min-w-0 text-left">
            <span className="truncate leading-tight">{selectedOption.label}</span>
            <CodeWithCopy
              code={selectedCode}
              prefix={codePrefix}
              size="sm"
              textClassName="text-muted-foreground"
              className="text-muted-foreground"
              copyable={false}
            />
          </div>
        );
      }
      return <span className="truncate">{selectedOption.label}</span>;
    }

    if (isValueNotFound) {
      return (
        <span className="text-destructive italic flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5" />
          {notFoundMessage}
        </span>
      );
    }

    return <span className="font-light text-gray-400">{placeholder}</span>;
  };

  const showClearButton = clearable && value && !disabled && !isLoading;

  const getErrorMessage = () => {
    if (errorMessage) return errorMessage;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'An error occurred while loading data';
  };

  const handleRetry = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.nativeEvent) {
      e.nativeEvent.stopImmediatePropagation();
    }
    if (onRetry) {
      setInternalLoading(true);
      try {
        onRetry();
      } catch (err) {
        console.error('Error in retry:', err);
        setInternalLoading(false);
      }
    }
  };

  return (
    <Popover
      {...popoverProps}
      open={open}
      onOpenChange={(state) => {
        setOpen(state);
        onOpenChange?.(state);
      }}
    >
      <PopoverTrigger asChild className="hover:bg-white">
        <Button
          {...buttonProps}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          title={
            selectedOption
              ? [selectedOption.label, getCode(selectedOption)].filter(Boolean).join(' · ')
              : ((buttonProps?.title as string) ?? undefined)
          }
          className={cn(
            'combobox group relative h-9 pl-3 py-1 !pr-7',
            'justify-between cursor-default',
            'flex-1 text-left truncate font-normal',
            className,
            buttonProps?.className,
            selectedOption ? '' : 'text-gray-400 hover:text-gray-400',
            !value && 'text-muted-foreground',
            open && 'border-primary ring-primary/18 ring-[3px]',
          )}
        >
          <div className="truncate w-full">{renderSelectedOptionContent()}</div>

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
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
          ) : (
            <ChevronsUpDownIcon className="h-4 w-4 opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
          )}
        </Button>
      </PopoverTrigger>
      {open && (
        <PopoverContent
          {...popoverContentProps}
          className={cn('p-0', popoverResizable && 'relative overflow-visible', popoverClassName)}
          style={effectiveWidth ? { width: effectiveWidth } : {}}
        >
          <div ref={popoverInnerRef}>
            <Command shouldFilter={false}>
              <div className="flex items-center border-b w-full [&_[data-slot=command-input-wrapper]]:flex-1 [&_[data-slot=command-input-wrapper]]:border-0 [&_[data-slot=command-input-wrapper]]:w-full">
                <CommandInput
                  placeholder={searchPlaceholder}
                  value={query}
                  onValueChange={setQuery}
                  className="flex-1 w-full"
                />
              </div>
              {extraHeader && <div className="border-b p-2 bg-muted/10">{extraHeader}</div>}
              <CommandList>
                {/* Error state */}
                {error && !isLoading ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-6 py-6 text-center min-w-[300px]">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <p className="text-base font-semibold text-destructive">
                        {getErrorMessage()}
                      </p>
                      {onRetry && (
                        <Button
                          type="button"
                          variant="outline"
                          size="default"
                          onClick={handleRetry}
                          className="mt-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ) : isLoading ? (
                  /* Skeleton loading */
                  <div className="p-1 space-y-1">
                    {Array.from({ length: prevOptionsCountRef.current }).map((_, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-sm px-2 py-1.5">
                        <div className="h-4 w-4 shrink-0 rounded bg-accent animate-pulse" />
                        <div className="flex-1">
                          <div
                            className="h-3.5 rounded bg-accent animate-pulse"
                            style={{
                              width: `${[75, 60, 85, 50, 70][i % 5]}%`,
                              animationDelay: `${i * 75}ms`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredOptions.length === 0 ? (
                  /* Empty state */
                  allowCustom ? (
                    <CommandItem
                      value={query}
                      onSelect={() => {
                        onCustomValue?.(query);
                        setQuery('');
                        setOpen(false);
                      }}
                      className="text-blue-600 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      {customValueLabel}: "{query}"
                    </CommandItem>
                  ) : (
                    <CommandEmpty>{emptyMessage}</CommandEmpty>
                  )
                ) : (
                  /* Items list */
                  <>
                    {suggestion && (
                      <CommandGroup
                        heading={
                          <div className="flex items-center py-1 text-sm font-medium">
                            <Lightbulb className="h-4 w-4 text-yellow-500" />
                            {t ? t('common:suggestion') : 'Suggestions'}
                          </div>
                        }
                        onWheel={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {filteredOptions
                          ?.filter((option) => suggestion.includes(option.value))
                          ?.map((suggestionOption) => (
                            <CommandItem
                              key={`suggestion${suggestionOption.value}`}
                              value={suggestionOption.value}
                              onSelect={handleValueChange}
                              className={itemClassName}
                              title={suggestionOption.label}
                            >
                              <CheckIcon
                                className={cn(
                                  'h-4 w-4',
                                  value === suggestionOption.value ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              {renderOptionContent(
                                suggestionOption,
                                value === suggestionOption.value,
                              )}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    )}
                    <CommandGroup
                      onWheel={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      {filteredOptions.map((option) => {
                        const isSelected = value === option.value;
                        const optionTitle = [option.label, getCode(option)]
                          .filter(Boolean)
                          .join(' · ');
                        return (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={handleValueChange}
                            className={itemClassName}
                            title={optionTitle || undefined}
                          >
                            {renderOptionContent(option, isSelected)}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </>
                )}
              </CommandList>
              <div className="flex items-center justify-end border-t w-full p-1 bg-muted/10">
                {extraFooter && <div className="flex-1 px-1">{extraFooter}</div>}
                {onRetry && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 shrink-0 mr-1"
                    onClick={handleRetry}
                    disabled={isLoading}
                    title={t ? t('action:reload') : 'Reload'}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5')} />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  }}
                  title={sortOrder === 'asc' ? 'Sort A-Z' : 'Sort Z-A'}
                >
                  {sortOrder === 'asc' ? (
                    <ArrowUp className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </Command>
          </div>
          {popoverResizable && (
            <div
              role="separator"
              aria-orientation="vertical"
              tabIndex={0}
              className="absolute -right-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10 group flex items-center"
              onMouseDown={handleResizeMouseDown}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') setResizedWidth((w) => Math.max(200, (w ?? 288) + 10));
                if (e.key === 'ArrowLeft') setResizedWidth((w) => Math.max(200, (w ?? 288) - 10));
              }}
            >
              <div className="w-[3px] h-8 rounded-full bg-border opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </PopoverContent>
      )}
    </Popover>
  );
}
