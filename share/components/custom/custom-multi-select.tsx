import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../../ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { cn } from '../../lib/utils';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { useState, useRef } from 'react';

export interface MultiSelectOption {
  label: string;
  value: string;
  code?: string;
}

interface CustomMultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  /** Render extra actions in the selected summary bar */
  renderActions?: (selectedIds: string[]) => React.ReactNode;
}

export function CustomMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  className,
  disabled = false,
  loading = false,
  renderActions,
}: CustomMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleUnselect = (value: string) => {
    onChange(selected.filter((s) => s !== value));
  };

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      handleUnselect(value);
    } else {
      onChange([...selected, value]);
    }
  };

  const selectedOptions = options.filter((option) => selected.includes(option.value));

  return (
    <div className={cn('relative w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between min-h-10 h-auto py-1.5 hover:bg-background font-normal shadow-none flex items-center gap-2 text-left',
              selected.length > 0 && 'border-primary/50',
            )}
            disabled={disabled || loading}
          >
            <div className="flex flex-wrap gap-1.5 items-center flex-1 min-w-0 max-h-[72px] overflow-y-auto pr-2">
              {selectedOptions.length === 0 ? (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              ) : (
                selectedOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant="secondary"
                    className="pl-2 pr-1 py-0.5 gap-1 text-xs font-normal hover:bg-secondary/80 transition-colors shrink-0"
                  >
                    <span className="truncate max-w-[120px]">
                      {option.code ? `${option.code}` : option.label}
                    </span>
                    {!disabled && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleUnselect(option.value);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </span>
                    )}
                  </Badge>
                ))
              )}
            </div>
            <div className="flex items-center shrink-0 gap-1 ml-auto">
              {renderActions?.(selected)}
              {!disabled && selected.length > 1 && (
                <span
                  role="button"
                  tabIndex={0}
                  className="rounded-full p-1 hover:bg-foreground/10 transition-colors cursor-pointer text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    onChange([]);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </span>
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 z-[60]"
          align="start"
          style={{ width: triggerRef.current?.getBoundingClientRect().width }}
        >
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList onWheel={(e) => e.stopPropagation()}>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const isSelected = selected.includes(option.value);
                  return (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.code ?? ''}`}
                      onSelect={() => handleSelect(option.value)}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        isSelected && 'bg-primary/5',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors',
                          isSelected
                            ? 'bg-primary border-primary text-primary-foreground'
                            : 'border-muted-foreground/40 [&_svg]:invisible',
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm">{option.label}</div>
                        {option.code && (
                          <div className="truncate text-xs text-muted-foreground">
                            {option.code}
                          </div>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              {selected.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => onChange([])}
                      className="justify-center text-center text-sm text-muted-foreground"
                    >
                      Clear all
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
