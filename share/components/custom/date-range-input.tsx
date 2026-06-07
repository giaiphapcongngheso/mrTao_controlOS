import { Calendar } from '../../ui/calendar';
import { Input, type InputProps } from '../../ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/popover';
import { format, parse } from 'date-fns';
import type { DateRange, DayPicker } from 'react-day-picker';
import type { Button } from '../../ui/button';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';

type DateRangeInputProps = {
  inputProps?: InputProps;
  calendarProps?: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>['variant'];
  };
  value: DateRange | undefined;
  onChange?: (range: DateRange, text: string) => void;
};

export default function DateRangeInput({
  inputProps,
  calendarProps,
  onChange,
  value,
}: DateRangeInputProps) {
  const { t } = useTranslation('common');
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      onChange?.({ from: undefined, to: undefined }, '');
      return;
    }

    const [fromStr, toStr] = value.split('-').map((s) => s.trim());
    const from = parse(fromStr, 'dd/MM/yyyy', new Date());
    const to = parse(toStr, 'dd/MM/yyyy', new Date());

    const newRange =
      !isNaN(from.getTime()) && !isNaN(to.getTime())
        ? { from, to }
        : { from: undefined, to: undefined };

    onChange?.(newRange, value);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="w-full">
          <Input
            placeholder={inputProps?.placeholder ?? t('common:rangeDate')}
            {...inputProps}
            className={cn('w-full', inputProps?.className || '')}
            value={
              value?.from && value?.to
                ? `${format(value.from, 'dd/MM/yyyy')} - ${format(value.to, 'dd/MM/yyyy')}`
                : ''
            }
            onChange={handleChange}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-fit z-[70]" align="start">
        <Calendar
          {...calendarProps}
          mode="range"
          selected={value || undefined}
          onSelect={(r) => {
            if (r?.from && r?.to) {
              const newText = `${format(r.from, 'dd/MM/yyyy')} - ${format(r.to, 'dd/MM/yyyy')}`;
              onChange?.(r, newText); // Gọi callback khi chọn trên calendar
            }
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
