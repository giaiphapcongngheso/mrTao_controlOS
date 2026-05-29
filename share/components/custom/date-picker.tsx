import { Button } from '../../ui/button';
import { Calendar } from '../../ui/calendar';
import { Input } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { cn } from '../../lib/utils';

import { format, parse } from 'date-fns';
import { vi } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface DateTimePickerProps {
  value?: Date | undefined;
  onChange?: (date: Date | undefined) => void;
  size?: 'sm' | 'md' | 'lg';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  disabledDate?: (date: Date) => boolean;
  showTime?: boolean;
  timeOnly?: boolean;
  clearable?: boolean;
}

export function DatePicker({
  value,
  onChange,
  showTime = false,
  timeOnly = false,
  placeholder = timeOnly ? 'HH:mm' : (showTime ? 'dd/mm/yyyy HH:mm' : 'dd/mm/yyyy'),
  disabled = false,
  size,
  className,
  disabledDate,
  clearable = true,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const [tempDateTime, setTempDateTime] = useState<Date | null>(value ?? new Date());

  const getFormatString = () => {
    if (timeOnly) return 'HH:mm';
    return showTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';
  };

  const [inputValue, setInputValue] = useState<string>(
    value ? format(value, getFormatString(), { locale: vi }) : '',
  );

  useEffect(() => {
    if (value) {
      setInputValue(format(value, getFormatString(), { locale: vi }));
      setTempDateTime(value);
    } else {
      setInputValue('');
    }
  }, [value, showTime, timeOnly]);

  const validateDate = (formatted: string) => {
    try {
      const parsed = parse(formatted, getFormatString(), new Date());
      const compareFormat = getFormatString();

      if (!isNaN(parsed.getTime()) && format(parsed, compareFormat) === formatted) {
        setTempDateTime(parsed);
        onChange?.(parsed);
      } else {
        onChange?.(undefined);
      }
    } catch {
      onChange?.(undefined);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    let numbers = input.value.replace(/\D/g, '');

    if (timeOnly) {
      numbers = numbers.slice(0, 4);
      let formatted = '';
      if (numbers.length <= 2) {
        formatted = numbers;
      } else {
        formatted = `${numbers.slice(0, 2)}:${numbers.slice(2)}`;
      }
      setInputValue(formatted);
      if (formatted.length === 5) {
        validateDate(formatted);
      } else {
        onChange?.(undefined);
      }
      return;
    }

    // auto prepend 0 cho ngày
    if (numbers.length === 1) {
      const firstDay = Number(numbers[0]);
      if (firstDay > 3) {
        numbers = `0${firstDay}`;
      }
    }

    // auto prepend 0 cho tháng
    if (numbers.length === 3) {
      const monthFirst = Number(numbers[2]);
      if (monthFirst > 1) {
        numbers = numbers.slice(0, 2) + `0${monthFirst}`;
      }
    }

    numbers = showTime ? numbers.slice(0, 12) : numbers.slice(0, 8);
    let formatted = '';

    if (showTime) {
      if (numbers.length <= 2) {
        formatted = numbers;
      } else if (numbers.length <= 4) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
      } else if (numbers.length <= 8) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
      } else if (numbers.length <= 10) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(
          2,
          4,
        )}/${numbers.slice(4, 8)} ${numbers.slice(8)}`;
      } else {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(
          2,
          4,
        )}/${numbers.slice(4, 8)} ${numbers.slice(8, 10)}:${numbers.slice(10, 12)}`;
      }
    } else {
      if (numbers.length <= 2) {
        formatted = numbers;
      } else if (numbers.length <= 4) {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
      } else {
        formatted = `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
      }
    }

    setInputValue(formatted);

    requestAnimationFrame(() => {
      const position = formatted.length;
      if (
        position === 2 ||
        position === 5 ||
        (showTime && position === 10) ||
        (showTime && position === 13)
      ) {
        input.setSelectionRange(position + 1, position + 1);
      }
    });

    if ((!showTime && formatted.length === 10) || (showTime && formatted.length === 16)) {
      validateDate(formatted);
    } else {
      onChange?.(undefined);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const newDate = new Date(date);

    if (tempDateTime && (showTime || timeOnly)) {
      newDate.setHours(tempDateTime.getHours());
      newDate.setMinutes(tempDateTime.getMinutes());
    }

    setTempDateTime(newDate);
  };

  const handleTimeChange = (type: 'hour' | 'minute' | 'meridiem', newValue: string) => {
    let newDate = tempDateTime ? new Date(tempDateTime) : new Date();

    if (type === 'hour') {
      const hour = parseInt(newValue) || 0;
      const meridiem = newDate.getHours() >= 12 ? 'PM' : 'AM';
      const adjustedHour =
        meridiem === 'PM' && hour !== 12 ? hour + 12 : meridiem === 'AM' && hour === 12 ? 0 : hour;
      newDate.setHours(adjustedHour);
    } else if (type === 'minute') {
      const minute = parseInt(newValue) || 0;
      newDate.setMinutes(minute);
    } else if (type === 'meridiem') {
      const currentHour = newDate.getHours();
      const newHour =
        newValue === 'PM'
          ? currentHour < 12
            ? currentHour + 12
            : currentHour
          : currentHour >= 12
            ? currentHour - 12
            : currentHour;
      newDate.setHours(newHour);
    }

    setTempDateTime(newDate);
  };

  const handleSet = () => {
    if (tempDateTime) {
      const formatted = format(tempDateTime, getFormatString(), {
        locale: vi,
      });

      setInputValue(formatted);
      onChange?.(tempDateTime);
      setOpen(false);
    }
  };

  const handleCancel = () => {
    setTempDateTime(value ?? null);
    setInputValue(
      value ? format(value, getFormatString(), { locale: vi }) : '',
    );
    setOpen(false);
  };

  const displayHour = (tempDateTime?.getHours() ?? 0) % 12 || 12;
  const displayMeridiem = (tempDateTime?.getHours() ?? 0) >= 12 ? 'PM' : 'AM';
  const displayMinute = (tempDateTime?.getMinutes() ?? 0).toString().padStart(2, '0');

  return (
    <div className={cn('relative flex w-full min-w-0 items-center gap-2 group', className)}>
      <div className="relative min-w-0 flex-1">
        <Input
          type="text"
          size={size}
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          clearable={false}
          className="w-full min-w-0 pr-12"
        />

        <div className="absolute top-1/2 right-2 -translate-y-1/2 flex items-center gap-1.5 z-10">
          {!disabled && clearable && !!inputValue && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setInputValue('');
                setTempDateTime(null);
                onChange?.(undefined);
              }}
              className={cn(
                'w-4 h-4 flex items-center justify-center cursor-pointer bg-white rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 focus-within:opacity-100 focus-within:scale-100',
              )}
              tabIndex={-1}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={disabled}
                aria-disabled={disabled}
                className={cn(
                  'cursor-pointer p-0.5 rounded-sm hover:bg-muted text-foreground/70 transition-colors',
                  {
                    'pointer-events-none cursor-not-allowed bg-[#FAFAFA] text-[#A3A3A3]': disabled,
                  },
                )}
              >
                <CalendarIcon className="h-4 w-4 opacity-70" />
              </button>
            </PopoverTrigger>

            <PopoverContent className="p-4" align="end" side="right" sideOffset={10}>
              <div className="space-y-4">
                {!timeOnly && (
                  <Calendar
                    mode="single"
                    className="w-full p-0"
                    captionLayout="dropdown"
                    selected={tempDateTime ?? undefined}
                    onSelect={handleDateSelect}
                    disabled={disabledDate}
                  />
                )}

                {(showTime || timeOnly) && (
                  <div className={cn("pt-4", !timeOnly && "border-t border-border")}>
                    <div className="flex items-center justify-center gap-2">
                      <div className="flex flex-col items-start">
                        <label className="mb-1 text-xs text-muted-foreground">Hour</label>
                        <input
                          type="number"
                          min="1"
                          max="12"
                          value={displayHour.toString().padStart(2, '0')}
                          onChange={(e) => handleTimeChange('hour', e.target.value)}
                          className="w-[50px] rounded border border-input px-2 py-1 text-center text-sm font-semibold"
                        />
                      </div>

                      <div className="pt-4 text-lg font-bold">:</div>

                      <div className="flex flex-col items-start">
                        <label className="mb-1 text-xs text-muted-foreground">Minute</label>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={displayMinute}
                          onChange={(e) => handleTimeChange('minute', e.target.value)}
                          className="w-[50px] rounded border border-input px-2 py-1 text-center text-sm font-semibold"
                        />
                      </div>

                      <div className="flex flex-col items-start gap-1">
                        <label className="text-xs text-muted-foreground">Meridiem</label>
                        <select
                          value={displayMeridiem}
                          onChange={(e) => handleTimeChange('meridiem', e.target.value)}
                          className="cursor-pointer rounded border border-input px-2 py-1 text-sm font-semibold"
                        >
                          <option value="AM">AM</option>
                          <option value="PM">PM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 border-t border-border pt-2">
                  <Button variant="outline" onClick={handleCancel} className="flex-1" size="sm">
                    Cancel
                  </Button>

                  <Button onClick={handleSet} className="flex-1" size="sm">
                    Set
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
