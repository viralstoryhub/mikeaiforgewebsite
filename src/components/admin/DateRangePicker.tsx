import React from 'react';

type DateInputValue = string | null;

export interface DateRangeValue {
  startDate: DateInputValue;
  endDate: DateInputValue;
}

export interface PresetRange {
  label: string;
  value: {
    startDate: string;
    endDate: string;
  };
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (range: DateRangeValue) => void;
  presets?: PresetRange[];
  className?: string;
}

const DATE_DISPLAY_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const addDays = (date: Date, amount: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
};

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);

const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const createDefaultPresets = (today: Date): PresetRange[] => {
  const todayStr = formatDate(today);
  const last7Start = formatDate(addDays(today, -6));
  const last30Start = formatDate(addDays(today, -29));
  const last90Start = formatDate(addDays(today, -89));
  const thisMonthStart = formatDate(startOfMonth(today));
  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthStart = formatDate(startOfMonth(previousMonthDate));
  const lastMonthEnd = formatDate(endOfMonth(previousMonthDate));

  return [
    { label: 'Last 7 days', value: { startDate: last7Start, endDate: todayStr } },
    { label: 'Last 30 days', value: { startDate: last30Start, endDate: todayStr } },
    { label: 'Last 90 days', value: { startDate: last90Start, endDate: todayStr } },
    { label: 'This month', value: { startDate: thisMonthStart, endDate: todayStr } },
    { label: 'Last month', value: { startDate: lastMonthStart, endDate: lastMonthEnd } },
  ];
};

const parseDateString = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
};

const formatForDisplay = (dateString: DateInputValue, formatter: Intl.DateTimeFormat): string => {
  if (!dateString) {
    return '—';
  }
  return formatter.format(parseDateString(dateString));
};

const sanitizeRange = (range: DateRangeValue, maxDate: string): DateRangeValue => {
  let startDate = range.startDate ?? null;
  let endDate = range.endDate ?? null;

  if (startDate && startDate > maxDate) {
    startDate = maxDate;
  }

  if (endDate && endDate > maxDate) {
    endDate = maxDate;
  }

  if (startDate && endDate && endDate < startDate) {
    endDate = startDate;
  }

  return { startDate, endDate };
};

const validateRange = (range: DateRangeValue, maxDate: string): string | null => {
  if (range.startDate && range.startDate > maxDate) {
    return 'Start date cannot be in the future.';
  }

  if (range.endDate && range.endDate > maxDate) {
    return 'End date cannot be in the future.';
  }

  if (range.startDate && range.endDate && range.startDate > range.endDate) {
    return 'Start date cannot be later than end date.';
  }

  return null;
};

const rangesEqual = (a: DateRangeValue, b: DateRangeValue): boolean =>
  a.startDate === b.startDate && a.endDate === b.endDate;

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  presets,
  className,
}) => {
  const memoizedToday = React.useMemo(() => {
    const now = new Date();
    return { date: now, formatted: formatDate(now) };
  }, []);
  const today = memoizedToday.date;
  const todayStr = memoizedToday.formatted;

  const [error, setError] = React.useState<string | null>(null);

  const availablePresets = React.useMemo(
    () => (presets && presets.length > 0 ? presets : createDefaultPresets(today)),
    [presets, today],
  );

  const uniqueId = React.useId();
  const startInputId = `${uniqueId}-start`;
  const endInputId = `${uniqueId}-end`;
  const helperTextId = `${uniqueId}-helper`;
  const errorId = `${uniqueId}-error`;

  const presetButtonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const updateRange = React.useCallback(
    (nextRange: DateRangeValue) => {
      const sanitized = sanitizeRange(nextRange, todayStr);
      const validationResult = validateRange(sanitized, todayStr);
      setError(validationResult);
      if (!rangesEqual(sanitized, value)) {
        onChange(sanitized);
      }
    },
    [onChange, todayStr, value],
  );

  React.useEffect(() => {
    const sanitized = sanitizeRange(value, todayStr);
    if (!rangesEqual(sanitized, value)) {
      onChange(sanitized);
    }
  }, [onChange, todayStr, value.endDate, value.startDate]);

  React.useEffect(() => {
    setError(validateRange(value, todayStr));
  }, [value.startDate, value.endDate, todayStr]);

  React.useEffect(() => {
    if (availablePresets.length < presetButtonRefs.current.length) {
      presetButtonRefs.current = presetButtonRefs.current.slice(0, availablePresets.length);
    }
  }, [availablePresets.length]);

  const handlePresetSelect = React.useCallback(
    (presetValue: PresetRange['value']) => {
      updateRange(presetValue);
    },
    [updateRange],
  );

  const handlePresetKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (availablePresets.length === 0) return;

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = (index + 1) % availablePresets.length;
        presetButtonRefs.current[nextIndex]?.focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        const prevIndex = (index - 1 + availablePresets.length) % availablePresets.length;
        presetButtonRefs.current[prevIndex]?.focus();
      }
    },
    [availablePresets.length],
  );

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value ? event.target.value : null;
    updateRange({ startDate: inputValue, endDate: value.endDate });
  };

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value ? event.target.value : null;
    updateRange({ startDate: value.startDate, endDate: inputValue });
  };

  const formatter = React.useMemo(() => new Intl.DateTimeFormat(undefined, DATE_DISPLAY_FORMAT), []);

  const currentRangeDisplay = `${formatForDisplay(value.startDate, formatter)} – ${formatForDisplay(
    value.endDate,
    formatter,
  )}`;

  const sharedHelperDescribedBy = error ? `${helperTextId} ${errorId}` : helperTextId;

  const inputClasses = (hasError: boolean): string =>
    [
      'block w-full rounded-md border bg-white dark:bg-slate-900 px-3 py-2',
      'text-sm text-slate-900 dark:text-slate-100 shadow-sm transition-colors',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
      hasError
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
        : 'border-slate-300 dark:border-slate-700',
    ].join(' ');

  const containerClasses = [
    'rounded-lg border border-slate-200 dark:border-slate-700',
    'bg-white dark:bg-slate-800 p-4 shadow-sm',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return (
    <div className={containerClasses}>
      <div className="flex flex-col gap-4">
        <div>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Date range
          </span>
          <p
            id={helperTextId}
            className="mt-1 text-xs text-slate-500 dark:text-slate-400"
          >
            Select a preset or choose custom start and end dates to filter analytics.
          </p>
        </div>

        <div
          role="group"
          aria-label="Quick date ranges"
          className="flex flex-wrap gap-2"
        >
          {availablePresets.map((preset, index) => {
            const isSelected =
              value.startDate === preset.value.startDate &&
              value.endDate === preset.value.endDate;

            return (
              <button
                key={preset.label}
                type="button"
                ref={(el) => {
                  presetButtonRefs.current[index] = el;
                }}
                onClick={() => handlePresetSelect(preset.value)}
                onKeyDown={(event) => handlePresetKeyDown(event, index)}
                aria-pressed={isSelected}
                className={[
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500',
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
                ].join(' ')}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={startInputId}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              Start date
            </label>
            <input
              id={startInputId}
              type="date"
              value={value.startDate ?? ''}
              max={todayStr}
              onChange={handleStartChange}
              aria-describedby={sharedHelperDescribedBy}
              aria-invalid={Boolean(error)}
              className={inputClasses(Boolean(error))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor={endInputId}
              className="text-sm font-medium text-slate-700 dark:text-slate-200"
            >
              End date
            </label>
            <input
              id={endInputId}
              type="date"
              value={value.endDate ?? ''}
              max={todayStr}
              min={value.startDate ?? undefined}
              onChange={handleEndChange}
              aria-describedby={sharedHelperDescribedBy}
              aria-invalid={Boolean(error)}
              className={inputClasses(Boolean(error))}
            />
          </div>
        </div>

        <div className="rounded-md bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-700 dark:text-slate-200">Selected:</span>{' '}
          {currentRangeDisplay}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-red-600 dark:text-red-400"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>
    </div>
  );
};

export default DateRangePicker;
