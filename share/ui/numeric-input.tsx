import * as React from 'react';

import { cn, formatIntegerPart } from '../lib/utils';
import { Input, type InputProps } from './input';

const NORMALIZED_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

type ParsedCurrencyInput = {
  display: string;
  normalized: string;
  numericValue: number | undefined;
};

export type NumericInputProps = Omit<
  InputProps,
  'type' | 'value' | 'defaultValue' | 'onChange' | 'inputMode'
> & {
  value?: string | number | null;
  defaultValue?: string | number;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  onValueChange?: (value: number | undefined) => void;
  allowDecimal?: boolean;
  allowNegative?: boolean;
  decimalScale?: number;
};

function parseCurrencyInput(
  rawValue: string,
  options: Pick<NumericInputProps, 'allowDecimal' | 'allowNegative' | 'decimalScale'>,
): ParsedCurrencyInput {
  const cleaned = rawValue.replace(/\s+/g, '');
  if (!cleaned) {
    return { display: '', normalized: '', numericValue: undefined };
  }

  let sign = '';
  let body = cleaned;

  if (options.allowNegative && body.startsWith('-')) {
    sign = '-';
    body = body.slice(1);
  }
  body = body.replace(/-/g, '');

  const hasTrailingComma = !!options.allowDecimal && body.endsWith(',');

  let integerPartRaw = body;
  let decimalPartRaw: string | undefined;

  if (options.allowDecimal) {
    const [intPart, ...decimalParts] = body.split(',');
    integerPartRaw = intPart;
    decimalPartRaw = decimalParts.length > 0 ? decimalParts.join('') : undefined;
  }

  const integerDigits = integerPartRaw.replace(/\D/g, '');
  let decimalDigits = decimalPartRaw?.replace(/\D/g, '');

  if (options.allowDecimal && options.decimalScale !== undefined && decimalDigits !== undefined) {
    decimalDigits = decimalDigits.slice(0, Math.max(0, options.decimalScale));
  }

  const hasValue =
    integerDigits.length > 0 ||
    (decimalDigits !== undefined && decimalDigits.length > 0) ||
    hasTrailingComma;

  if (!hasValue) {
    return sign
      ? { display: '-', normalized: '', numericValue: undefined }
      : { display: '', normalized: '', numericValue: undefined };
  }

  const normalizedInteger = integerDigits.replace(/^0+(?=\d)/, '');
  const safeInteger = normalizedInteger || (options.allowDecimal ? '0' : '');
  const formattedInteger = safeInteger ? formatIntegerPart(safeInteger) : '';

  const display =
    options.allowDecimal && (decimalDigits !== undefined || hasTrailingComma)
      ? `${sign}${formattedInteger},${decimalDigits ?? ''}`
      : `${sign}${formattedInteger}`;

  const normalizedDecimal =
    options.allowDecimal && decimalDigits && decimalDigits.length > 0 ? `.${decimalDigits}` : '';
  const normalized = formattedInteger ? `${sign}${safeInteger}${normalizedDecimal}` : '';

  const numericValue = normalized ? Number(normalized) : undefined;

  return {
    display,
    normalized,
    numericValue:
      numericValue !== undefined && Number.isNaN(numericValue) ? undefined : numericValue,
  };
}

function formatDisplayFromValue(
  value: string | number | null | undefined,
  options: Pick<NumericInputProps, 'allowDecimal' | 'allowNegative' | 'decimalScale'>,
): string {
  if (value === undefined || value === null || value === '') return '';

  const raw = String(value).trim();
  if (!raw) return '';

  if (raw === '-' && options.allowNegative) return '-';

  if (NORMALIZED_NUMBER_PATTERN.test(raw)) {
    return formatIntegerPart(raw);
  }

  return parseCurrencyInput(raw, options).display;
}

function buildSyntheticChangeEvent(
  event: React.ChangeEvent<HTMLInputElement>,
  value: string,
  fallbackName?: string,
): React.ChangeEvent<HTMLInputElement> {
  const target = {
    ...(event.target || {}),
    value,
    name: event.target?.name ?? fallbackName ?? '',
  };

  const currentTarget = {
    ...(event.currentTarget || {}),
    value,
    name: event.currentTarget?.name ?? fallbackName ?? '',
  };

  return {
    ...event,
    target,
    currentTarget,
  } as React.ChangeEvent<HTMLInputElement>;
}

function NumericInput({
  value,
  defaultValue,
  onChange,
  onBlur,
  onValueChange,
  allowDecimal = true,
  allowNegative = false,
  decimalScale,
  name,
  ...props
}: NumericInputProps) {
  const parseOptions = React.useMemo(
    () => ({ allowDecimal, allowNegative, decimalScale }),
    [allowDecimal, allowNegative, decimalScale],
  );

  const [displayValue, setDisplayValue] = React.useState(() =>
    formatDisplayFromValue(value ?? defaultValue, parseOptions),
  );

  React.useEffect(() => {
    if (value === undefined) return;
    setDisplayValue(formatDisplayFromValue(value, parseOptions));
  }, [value, parseOptions]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseCurrencyInput(event.target.value, parseOptions);
    setDisplayValue(parsed.display);
    onValueChange?.(parsed.numericValue);

    if (onChange) {
      onChange(buildSyntheticChangeEvent(event, parsed.normalized, name));
    }
  };

  return (
    <Input
      {...props}
      className={cn('text-right', props.className)}
      name={name}
      type="text"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleChange}
      onBlur={onBlur}
    />
  );
}

export { NumericInput };
