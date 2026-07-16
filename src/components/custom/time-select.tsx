import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '../../../share/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '../../../share/ui/popover';
import { useIsMobile } from '../../shared/hooks/use-is-mobile';

interface TimeSelectProps {
  readonly value?: string;
  readonly onChangeValue?: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly step?: number; // minutes, default 15
  readonly className?: string;
}

// Custom hook to support click-and-drag scrolling using the mouse on PC
function useDragToScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startY = useRef(0);
  const scrollTop = useRef(0);
  const hasDragged = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return; // Let native touch scroll handles it on mobile
    if (!ref.current) return;
    isDown.current = true;
    
    startY.current = e.pageY - ref.current.offsetTop;
    scrollTop.current = ref.current.scrollTop;
    hasDragged.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch' || !isDown.current || !ref.current) return;
    const y = e.pageY - ref.current.offsetTop;
    const diff = y - startY.current;
    
    if (Math.abs(diff) > 8) {
      hasDragged.current = true;
    }
    // Multiply by 1.5 for a lighter, more responsive drag scrolling feel on PC
    ref.current.scrollTop = scrollTop.current - diff * 1.5;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    isDown.current = false;
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (e.pointerType === 'touch') return;
    isDown.current = false;
  };

  return {
    ref,
    hasDragged,
    props: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}

export function TimeSelect({
  value = '',
  onChangeValue,
  placeholder = '08:00',
  disabled,
  step = 15,
  className,
}: TimeSelectProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');

  // Keep input value in sync with external value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Parse hour and minute from value
  const [selectedHour, selectedMinute] = useMemo(() => {
    if (!value) return ['', ''];
    const [h, m] = value.split(':');
    return [h || '', m || ''];
  }, [value]);

  // Generate 24 hours options (00 to 23)
  const hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  }, []);

  // Generate minutes options based on step
  const minutes = useMemo(() => {
    const mins: string[] = [];
    for (let m = 0; m < 60; m += step) {
      mins.push(m.toString().padStart(2, '0'));
    }
    // Ensure the current minute is in the options even if it doesn't align with step
    if (selectedMinute && !mins.includes(selectedMinute)) {
      mins.push(selectedMinute);
      mins.sort();
    }
    return mins;
  }, [step, selectedMinute]);

  const handleHourSelect = (h: string) => {
    const nextMinute = selectedMinute || '00';
    onChangeValue?.(`${h}:${nextMinute}`);
  };

  const handleMinuteSelect = (m: string) => {
    const nextHour = selectedHour || '08';
    onChangeValue?.(`${nextHour}:${m}`);
  };

  // Keyboard input changes for PC
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;
    const digits = inputVal.replace(/\D/g, '').slice(0, 4);
    
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    }
    setInputValue(formatted);

    // If fully entered, validate and update parent form state
    if (formatted.length === 5) {
      const [hStr, mStr] = formatted.split(':');
      const h = parseInt(hStr, 10);
      const m = parseInt(mStr, 10);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        onChangeValue?.(formatted);
      }
    }
  };

  const handleInputBlur = () => {
    if (inputValue.length !== 5) {
      setInputValue(value || '');
      return;
    }
    const [hStr, mStr] = inputValue.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      onChangeValue?.(inputValue);
    } else {
      setInputValue(value || '');
    }
  };

  // Drag to scroll hooks for both lists
  const hourDrag = useDragToScroll();
  const minuteDrag = useDragToScroll();

  // Scroll active elements into view when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (hourDrag.ref.current) {
          const activeBtn = hourDrag.ref.current.querySelector('[data-active="true"]');
          if (activeBtn) {
            activeBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
          }
        }
        if (minuteDrag.ref.current) {
          const activeBtn = minuteDrag.ref.current.querySelector('[data-active="true"]');
          if (activeBtn) {
            activeBtn.scrollIntoView({ block: 'center', behavior: 'auto' });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleHourClick = (h: string) => {
    if (hourDrag.hasDragged.current) return;
    handleHourSelect(h);
  };

  const handleMinuteClick = (m: string) => {
    if (minuteDrag.hasDragged.current) return;
    handleMinuteSelect(m);
  };

  // Scroll list Tailwind classes with custom scrollbar styles on hover
  const scrollListClass = cn(
    "flex-1 overflow-y-auto p-1.5 space-y-0.5 select-none cursor-grab active:cursor-grabbing",
    "scrollbar-thin [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-200/80 hover:[&::-webkit-scrollbar-thumb]:bg-slate-350 [&::-webkit-scrollbar-thumb]:rounded-full transition-all duration-150"
  );


  // 2. DESKTOP/PC RENDER (Visible Keyboard-friendly Input + Popover list)
  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} modal={true}>
      <PopoverTrigger asChild>
        <div
          className={cn(
            "relative inline-flex items-center group px-2.5 py-1 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 transition-all duration-200 w-[110px] h-8.5 cursor-pointer",
            "hover:border-slate-300 focus-within:border-slate-800 focus-within:ring-2 focus-within:ring-slate-800/10",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            className
          )}
        >
          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 pointer-events-none mr-1.5" />
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={isMobile}
            className="w-full bg-transparent border-none p-0 text-sm font-semibold text-slate-800 outline-none focus:outline-none focus:ring-0 tabular-nums"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[240px] bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-[9999]"
        align="center"
      >
        {/* Header */}
        <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
            Chọn giờ (24h)
          </span>
          <span className="text-xs font-black text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-0.5 tabular-nums">
            {selectedHour || '08'}:{selectedMinute || '00'}
          </span>
        </div>

        {/* Hour / Minute Lists */}
        <div className="flex h-[200px] border-b border-slate-100">
          {/* Hours List */}
          <div
            ref={hourDrag.ref}
            {...hourDrag.props}
            className={cn(scrollListClass, "border-r border-slate-100")}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-wider py-1 pointer-events-none">Giờ</div>
            {hours.map((h) => {
              const isActive = h === selectedHour;
              return (
                <button
                  key={h}
                  type="button"
                  data-active={isActive}
                  onClick={() => handleHourClick(h)}
                  className={cn(
                    "w-full text-center py-1.5 rounded-lg text-sm font-semibold transition-all select-none",
                    isActive
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  {h}
                </button>
              );
            })}
          </div>

          {/* Minutes List */}
          <div
            ref={minuteDrag.ref}
            {...minuteDrag.props}
            className={scrollListClass}
            onWheel={(e) => e.stopPropagation()}
          >
            <div className="text-[9px] font-bold text-center text-slate-400 uppercase tracking-wider py-1 pointer-events-none">Phút</div>
            {minutes.map((m) => {
              const isActive = m === selectedMinute;
              return (
                <button
                  key={m}
                  type="button"
                  data-active={isActive}
                  onClick={() => handleMinuteClick(m)}
                  className={cn(
                    "w-full text-center py-1.5 rounded-lg text-sm font-semibold transition-all select-none",
                    isActive
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                  )}
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick presets */}
        <div className="p-2 bg-slate-50/50 flex gap-1.5 flex-wrap justify-center">
          {['08:00', '12:00', '14:00', '18:00', '22:00'].map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                onChangeValue?.(time);
                setIsOpen(false);
              }}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all border select-none",
                value === time
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-350 hover:bg-slate-50"
              )}
            >
              {time}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
