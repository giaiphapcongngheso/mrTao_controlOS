import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown, X } from 'lucide-react';
import { cn } from '../../../share/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────
interface TimeSelectProps {
  readonly value?: string;
  readonly onChangeValue?: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly step?: number; // minutes, default 15
  readonly className?: string;
}

// ─── Scroll Wheel Column ─────────────────────────────────────────────
interface ScrollColumnProps {
  items: string[];
  selectedValue: string;
  onSelect: (val: string) => void;
  label: string;
}

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 5;

const ScrollColumn = React.memo(function ScrollColumn({
  items,
  selectedValue,
  onSelect,
  label,
}: ScrollColumnProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to selected item on mount and when value changes
  useEffect(() => {
    const idx = items.indexOf(selectedValue);
    if (idx >= 0 && listRef.current && !isScrollingRef.current) {
      listRef.current.scrollTop = idx * ITEM_HEIGHT;
    }
  }, [selectedValue, items]);

  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    isScrollingRef.current = true;

    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      if (!listRef.current) return;
      const scrollTop = listRef.current.scrollTop;
      const idx = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIdx = Math.max(0, Math.min(idx, items.length - 1));

      // Snap to nearest item
      listRef.current.scrollTo({ top: clampedIdx * ITEM_HEIGHT, behavior: 'smooth' });
      onSelect(items[clampedIdx]);
      isScrollingRef.current = false;
    }, 80);
  }, [items, onSelect]);

  const handleItemClick = useCallback((val: string) => {
    const idx = items.indexOf(val);
    if (idx >= 0 && listRef.current) {
      listRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
    }
    onSelect(val);
  }, [items, onSelect]);

  const handleIncrement = useCallback(() => {
    const idx = items.indexOf(selectedValue);
    const nextIdx = idx > 0 ? idx - 1 : items.length - 1;
    handleItemClick(items[nextIdx]);
  }, [items, selectedValue, handleItemClick]);

  const handleDecrement = useCallback(() => {
    const idx = items.indexOf(selectedValue);
    const nextIdx = idx < items.length - 1 ? idx + 1 : 0;
    handleItemClick(items[nextIdx]);
  }, [items, selectedValue, handleItemClick]);

  // Padding items to center the list
  const paddingTop = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;
  const paddingBottom = Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-400 select-none">
        {label}
      </span>

      <button
        type="button"
        onClick={handleIncrement}
        className="w-full flex items-center justify-center h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        tabIndex={-1}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      <div
        className="relative overflow-hidden"
        style={{ height: VISIBLE_ITEMS * ITEM_HEIGHT }}
      >
        {/* Selection highlight band */}
        <div
          className="absolute inset-x-0 pointer-events-none rounded-xl bg-gradient-to-r from-slate-900/[0.06] via-slate-900/[0.08] to-slate-900/[0.06] border border-slate-200/80"
          style={{
            top: Math.floor(VISIBLE_ITEMS / 2) * ITEM_HEIGHT,
            height: ITEM_HEIGHT,
          }}
        />
        {/* Fade masks */}
        <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white via-white/80 to-transparent pointer-events-none z-[1]" />
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none z-[1]" />

        <div
          ref={listRef}
          className="h-full overflow-y-auto scrollbar-none"
          onScroll={handleScroll}
          style={{
            scrollSnapType: 'y mandatory',
            scrollBehavior: 'auto',
          }}
        >
          <div style={{ height: paddingTop }} />
          {items.map((item) => {
            const isSelected = item === selectedValue;
            return (
              <button
                key={item}
                type="button"
                onClick={() => handleItemClick(item)}
                className={cn(
                  'w-full flex items-center justify-center transition-all duration-150 select-none',
                  isSelected
                    ? 'text-slate-900 font-black text-lg'
                    : 'text-slate-400 font-semibold text-sm hover:text-slate-600',
                )}
                style={{
                  height: ITEM_HEIGHT,
                  scrollSnapAlign: 'start',
                }}
                tabIndex={-1}
              >
                {item}
              </button>
            );
          })}
          <div style={{ height: paddingBottom }} />
        </div>
      </div>

      <button
        type="button"
        onClick={handleDecrement}
        className="w-full flex items-center justify-center h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
        tabIndex={-1}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

// ─── Main TimeSelect Component ───────────────────────────────────────
export function TimeSelect({
  value,
  onChangeValue,
  placeholder,
  disabled,
  step = 15,
  className,
}: TimeSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [selectedHour, selectedMinute] = useMemo(() => {
    if (!value) return ['08', '00'];
    const [h, m] = value.split(':');
    return [h || '08', m || '00'];
  }, [value]);

  // Generate hour/minute options
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  }, []);

  const minutes = useMemo(() => {
    const mins: string[] = [];
    for (let m = 0; m < 60; m += step) {
      mins.push(m.toString().padStart(2, '0'));
    }
    return mins;
  }, [step]);

  const handleHourChange = useCallback((h: string) => {
    onChangeValue?.(`${h}:${selectedMinute}`);
  }, [onChangeValue, selectedMinute]);

  const handleMinuteChange = useCallback((m: string) => {
    onChangeValue?.(`${selectedHour}:${m}`);
  }, [onChangeValue, selectedHour]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChangeValue?.('');
    setIsOpen(false);
  }, [onChangeValue]);

  const handleToggle = useCallback(() => {
    if (!disabled) setIsOpen((prev) => !prev);
  }, [disabled]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Position dropdown — 2-phase: render hidden → measure → place
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    // Check if the trigger is inside a dialog (z-9999)
    const dialogEl = containerRef.current.closest('[data-slot="dialog-content"]');
    const zIndex = dialogEl ? 10000 : 9999;

    // Phase 1: place offscreen to measure
    setDropdownStyle({
      position: 'fixed',
      left: -9999,
      top: -9999,
      zIndex,
      visibility: 'hidden',
      width: 'auto',
    });

    // Phase 2: after render, measure actual height then position
    const frameId = requestAnimationFrame(() => {
      if (!containerRef.current || !dropdownRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const actualHeight = dropdownRect.height;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;

      // Determine max available space and direction
      const openAbove = spaceBelow < actualHeight && spaceAbove > spaceBelow;

      if (openAbove) {
        setDropdownStyle({
          position: 'fixed',
          left: rect.left,
          bottom: window.innerHeight - rect.top + 6,
          zIndex,
          width: 'auto',
          maxHeight: Math.min(spaceAbove, actualHeight),
          overflowY: spaceAbove < actualHeight ? 'auto' : undefined,
          visibility: 'visible',
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          left: rect.left,
          top: rect.bottom + 6,
          zIndex,
          width: 'auto',
          maxHeight: Math.min(spaceBelow, actualHeight),
          overflowY: spaceBelow < actualHeight ? 'auto' : undefined,
          visibility: 'visible',
        });
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [isOpen]);

  const displayValue = value || '';
  const hasValue = Boolean(value);

  return (
    <>
      {/* Trigger */}
      <div ref={containerRef} className={cn('relative inline-flex', className)}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={disabled}
          className={cn(
            'group inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-sm font-semibold transition-all duration-200 outline-none select-none',
            'bg-white hover:bg-slate-50/80',
            isOpen
              ? 'border-slate-800 ring-2 ring-slate-800/10 shadow-sm'
              : 'border-slate-200 hover:border-slate-300',
            disabled && 'opacity-50 cursor-not-allowed',
            hasValue ? 'text-slate-800' : 'text-slate-400',
          )}
        >
          <Clock className={cn(
            'w-3.5 h-3.5 transition-colors shrink-0',
            isOpen ? 'text-slate-700' : 'text-slate-400',
          )} />
          <span className="tabular-nums tracking-wide">
            {hasValue ? displayValue : (placeholder || 'HH:MM')}
          </span>
          {hasValue && !disabled && (
            <div
              onClick={handleClear}
              className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-200/80 text-slate-500 hover:bg-slate-400 hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
              tabIndex={-1}
            >
              <X className="w-2.5 h-2.5" />
            </div>
          )}
        </button>
      </div>

      {/* Dropdown rendered via Portal */}
      {isOpen && (
        <div
          ref={dropdownRef}
          style={dropdownStyle}
          className="animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-600">
                    Chọn giờ
                  </span>
                </div>
                <div className="text-sm font-black text-slate-800 tabular-nums bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                  {selectedHour}:{selectedMinute}
                </div>
              </div>
            </div>

            {/* Scroll Wheels */}
            <div className="flex items-stretch px-3 py-2 gap-0">
              <div className="flex-1 min-w-[72px]">
                <ScrollColumn
                  items={hours}
                  selectedValue={selectedHour}
                  onSelect={handleHourChange}
                  label="Giờ"
                />
              </div>

              {/* Separator */}
              <div className="flex items-center justify-center w-6 self-center">
                <span className="text-xl font-black text-slate-300 select-none">:</span>
              </div>

              <div className="flex-1 min-w-[72px]">
                <ScrollColumn
                  items={minutes}
                  selectedValue={selectedMinute}
                  onSelect={handleMinuteChange}
                  label="Phút"
                />
              </div>
            </div>

            {/* Quick Select */}
            <div className="px-3 pb-3">
              <div className="flex gap-1.5 flex-wrap">
                {['06:00', '08:00', '12:00', '14:00', '18:00', '22:00'].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      onChangeValue?.(time);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border',
                      value === time
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
