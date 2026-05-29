import * as React from 'react';

import { Button, buttonVariants } from '../../ui/button';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { ScrollArea } from '../../ui/scroll-area';
import { cn } from '../../lib/utils';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { VariantProps } from 'class-variance-authority';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDownIcon,
  FolderX,
  Loader2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '../../ui/empty';

export type TreeOption = {
  id: string | number;
  label: string;
  children?: TreeOption[];
  disabled?: boolean;
};

type TreeSelectProps = {
  options: TreeOption[];
  value?: Array<string | number>;
  onValueChange?: (value: Array<string | number>) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  multiple?: boolean;
  className?: string;
  maxHeight?: number | string;
  disabled?: boolean;
  readOnly?: boolean;
  clearable?: boolean;
  buttonProps?: React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    };
  loading?: boolean;
  includeChildrenOnSelect?: boolean;
  popoverClassName?: string;
  popoverContentWidth?: number;
  popoverContentProps?: React.ComponentProps<typeof PopoverPrimitive.Content>;
  popoverProps?: React.ComponentProps<typeof PopoverPrimitive.Root>;
  error?: Error | string | null;
  errorMessage?: string;
  onRetry?: () => void;
  /** Message to show when value doesn't match any option (e.g. deleted item) */
  notFoundMessage?: string;
};

function buildMaps(options: TreeOption[]) {
  const nodes = new Map<string | number, TreeOption>();

  function walk(node: TreeOption) {
    nodes.set(node.id, node);
    node.children?.forEach(walk);
  }

  options.forEach(walk);
  return nodes;
}

export default function TreeSelect({
  options,
  value: valueProp,
  onValueChange,
  placeholder,
  searchPlaceholder,
  multiple = false,
  disabled,
  readOnly,
  className,
  maxHeight = 320,
  buttonProps,
  includeChildrenOnSelect = false,
  clearable = true,
  loading = false,
  popoverClassName,
  popoverContentWidth = 400,
  popoverContentProps = { side: 'bottom', align: 'start' },
  popoverProps,
  error,
  errorMessage,
  onRetry,
  notFoundMessage,
}: TreeSelectProps) {
  const { t } = useTranslation(['common', 'action']);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [localValue, setLocalValue] = React.useState<Array<string | number>>(valueProp ?? []);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [internalLoading, setInternalLoading] = React.useState(false);
  const prevLoadingRef = React.useRef(loading);

  const isLoading = loading || internalLoading;

  React.useEffect(() => {
    if (prevLoadingRef.current && !loading && internalLoading) {
      setInternalLoading(false);
    }
    prevLoadingRef.current = loading;
  }, [loading, internalLoading]);

  React.useEffect(() => {
    if (valueProp !== undefined) setLocalValue(valueProp);
  }, [valueProp]);

  const nodes = React.useMemo(() => buildMaps(options), [options]);

  const sortedOptions = React.useMemo(() => {
    function sortTree(nodesList: TreeOption[]): TreeOption[] {
      return [...nodesList]
        .sort((a, b) => {
          const res = (a.label || '').localeCompare(b.label || '', undefined, {
            numeric: true,
            sensitivity: 'base',
          });
          return sortOrder === 'asc' ? res : -res;
        })
        .map((n) => ({ ...n, children: n.children ? sortTree(n.children) : undefined }));
    }
    return sortTree(options);
  }, [options, sortOrder]);

  function getAllDescendantIds(node: TreeOption): Array<string | number> {
    const result: Array<string | number> = [];
    if (!node.children) return result;
    for (const child of node.children) {
      result.push(child.id);
      result.push(...getAllDescendantIds(child));
    }
    return result;
  }

  function toggleId(id: string | number) {
    const node = nodes.get(id);
    if (!node) return;

    if (multiple) {
      const selected = localValue.includes(id);
      let next: Array<string | number> = [];

      if (selected) {
        next = localValue.filter((v) => v !== id);
        if (includeChildrenOnSelect) {
          const allChildren = getAllDescendantIds(node);
          next = next.filter((v) => !allChildren.includes(v));
        }
      } else {
        next = [...localValue, id];
        if (includeChildrenOnSelect) {
          const allChildren = getAllDescendantIds(node);
          next = [...next, ...allChildren.filter((cid) => !next.includes(cid))];
        }
      }

      setLocalValue(next);
      onValueChange?.(next);
    } else {
      const next = localValue[0] === id ? [] : [id];
      setLocalValue(next);
      onValueChange?.(next);
      setOpen(false);
    }
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation(); // Ngăn mở popover
    setLocalValue([]);
    onValueChange?.([]);
  };

  function stateForNode(node: TreeOption) {
    const checked = localValue.includes(node.id);
    return { checked, indeterminate: false };
  }

  function filterNode(node: TreeOption): boolean {
    if (!query.trim()) return true;
    const q = query?.trim()?.toLowerCase();
    if (node?.label?.toLowerCase()?.includes(q)) return true;
    return node.children?.some((c) => filterNode(c)) ?? false;
  }

  function TreeNode({ node, depth = 0 }: { node: TreeOption; depth?: number }) {
    const { checked } = stateForNode(node);
    const [expanded, setExpanded] = React.useState(true);

    React.useEffect(() => {
      if (query.trim()) setExpanded(filterNode(node));
    }, [node]);

    if (!filterNode(node)) return null;

    return (
      <div className="w-full">
        <div
          className="flex items-center gap-2 p-1 rounded hover:bg-muted flex-wrap"
          style={{ paddingLeft: depth * 12 }}
        >
          {node.children && node.children.length > 0 ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-6 h-6 flex items-center justify-center cursor-pointer"
              aria-label={expanded ? 'collapse' : 'expand'}
              type="button"
            >
              {expanded ? (
                <ChevronDown size={16} strokeWidth={2.6} />
              ) : (
                <ChevronRight size={16} strokeWidth={2.6} />
              )}
            </button>
          ) : (
            <div style={{ width: 24 }} />
          )}

          <Checkbox
            checked={checked}
            onCheckedChange={() => toggleId(node.id)}
            disabled={node.disabled}
          />

          <button
            type="button"
            className="flex-1 text-left truncate text-sm"
            onClick={() => toggleId(node.id)}
            title={node.label}
          >
            {node.label}
          </button>
        </div>

        {node.children && node.children.length > 0 && expanded && (
          <div>
            {node.children.map((c) => (
              <TreeNode key={String(c.id)} node={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const selectedLabels = React.useMemo(() => {
    return localValue
      .map((id) => nodes.get(id))
      .filter(Boolean)
      .map((n) => (n as TreeOption).label);
  }, [localValue, nodes]);

  // Check if value exists but no matching option found (deleted/invalid item)
  // Điều kiện: có value nhưng không tìm thấy label nào và không đang loading
  const hasNotFoundValues = React.useMemo(() => {
    if (localValue.length === 0 || isLoading) return false;
    // Nếu có value nhưng selectedLabels rỗng → value không tồn tại trong options
    return selectedLabels.length === 0;
  }, [localValue, selectedLabels, isLoading]);

  const showClearButton =
    clearable && localValue.length > 0 && !disabled && !readOnly && !isLoading;

  const getErrorMessage = () => {
    if (errorMessage) return errorMessage;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'Đã xảy ra lỗi khi tải dữ liệu';
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
    <Popover {...popoverProps} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild className="hover:bg-white">
        <Button
          {...buttonProps}
          disabled={disabled}
          variant="outline"
          title={selectedLabels.join(', ')}
          className={cn(
            'tree-select group relative truncate h-9 px-3 py-1 !pr-7',
            'w-64 font-normal justify-between cursor-default',
            className,
            {
              'text-foreground opacity-100 pointer-events-none': readOnly,
            },
            open && 'border-primary ring-primary/18 ring-[3px]',
          )}
        >
          <div
            className={cn(
              'text-left truncate',
              selectedLabels.length > 0 ? '' : 'text-gray-400 font-normal',
              hasNotFoundValues && 'text-destructive italic !hover:text-destructive',
              buttonProps?.className,
            )}
          >
            {hasNotFoundValues ? (
              <span className="flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                {notFoundMessage ??
                  t('common:component.combobox.notFound', 'Giá trị không tồn tại hoặc đã bị xóa')}
              </span>
            ) : selectedLabels.length ? (
              selectedLabels.slice(0, 3).join(', ') +
              (selectedLabels.length > 3 ? ` +${selectedLabels.length - 3}` : '')
            ) : (
              (placeholder ?? t('common:component.placeholder.select'))
            )}
          </div>
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
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
          ) : (
            <ChevronsUpDownIcon className="h-4 w-4 opacity-50 absolute right-2 top-1/2 -translate-y-1/2" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        {...popoverContentProps}
        className={cn('p-0', popoverClassName)}
        style={popoverContentWidth ? { width: popoverContentWidth } : {}}
      >
        <div className="p-2 relative">
          <Input
            icon={<Search strokeWidth={2} size={16} color="#848484" />}
            position="left"
            placeholder={searchPlaceholder ?? t('common:component.placeholder.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ps-8"
          />
        </div>

        <ScrollArea
          style={{ height: maxHeight }}
          onWheel={(e) => {
            e.stopPropagation(); // ← Ngăn event bubble lên parent
          }}
          className="p-2 space-y-1"
        >
          {error && !isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 px-6 py-6 text-center min-w-[300px]">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-base font-semibold text-destructive">{getErrorMessage()}</p>
                {onRetry && (
                  <Button
                    type="button"
                    variant="outline"
                    size="default"
                    onClick={handleRetry}
                    className="mt-1"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {t('action:retry', 'Thử lại')}
                  </Button>
                )}
              </div>
            </div>
          ) : isLoading ? (
            <div className="p-1 space-y-1">
              {Array.from({ length: 5 }).map((_, i) => (
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
          ) : sortedOptions.length === 0 ? (
            <Empty className="md:p-2">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FolderX strokeWidth={0.8} />
                </EmptyMedia>
                <EmptyDescription>No option found.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            sortedOptions.map((opt) => <TreeNode key={String(opt.id)} node={opt} />)
          )}
        </ScrollArea>
        <div className="flex items-center justify-end border-t w-full p-1 bg-muted/10">
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 shrink-0 mr-1"
              onClick={handleRetry}
              disabled={isLoading}
              title={t('action:reload', 'Tải lại')}
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
      </PopoverContent>
    </Popover>
  );
}
