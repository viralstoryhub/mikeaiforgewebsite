import React, { useCallback, useEffect, useMemo, useState, useId } from 'react';
import apiClient from '../../services/apiClient';


type ChartType = 'line' | 'bar' | 'pie';

export interface DateRange {
    startDate: string;
    endDate: string;
}

interface GoogleAnalyticsWidgetProps {
    metric: string;
    dateRange?: DateRange;
    chartType?: ChartType;
    title?: string;
    className?: string;
    description?: string;
}

type ChartPoint = {
    label: string;
    value: number;
    date?: string;
    raw?: unknown;
};

type AnalyticsWidgetData = {
    value: number | null;
    change: number | null;
    timeSeries: ChartPoint[];
    breakdown: ChartPoint[];
    raw: unknown;
};

const DEFAULT_LOOKBACK_DAYS = 7;
const CATEGORY_BAR_LIMIT = 8;
const PIE_SLICE_LIMIT = 6;
const LINE_POINT_LIMIT = 60;
const CHART_COLORS = ['#6366f1', '#22c55e', '#f97316', '#14b8a6', '#ec4899', '#818cf8', '#facc15', '#8b5cf6', '#06b6d4', '#f43f5e'];

const toISODateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const truncateDate = (date: Date): Date => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const getDefaultDateRange = (days: number): DateRange => {
    const end = truncateDate(new Date());
    const start = truncateDate(new Date());
    start.setDate(end.getDate() - (days - 1));
    return {
        startDate: toISODateString(start),
        endDate: toISODateString(end),
    };
};

const ensureDateRange = (range?: DateRange): DateRange => {
    if (!range?.startDate || !range?.endDate) {
        return getDefaultDateRange(DEFAULT_LOOKBACK_DAYS);
    }
    const start = truncateDate(new Date(range.startDate));
    const end = truncateDate(new Date(range.endDate));
    if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) {
        return getDefaultDateRange(DEFAULT_LOOKBACK_DAYS);
    }
    if (start > end) {
        return {
            startDate: toISODateString(end),
            endDate: toISODateString(start),
        };
    }
    return {
        startDate: toISODateString(start),
        endDate: toISODateString(end),
    };
};

const numberFrom = (value: unknown): number | null => {
    if (value == null) return null;
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return null;
        const numeric = Number(trimmed.replace(/,/g, ''));
        return Number.isFinite(numeric) ? numeric : null;
    }
    if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
        return numberFrom((value as Record<string, unknown>).value);
    }
    return null;
};

const firstNumber = (...values: unknown[]): number | null => {
    for (const value of values) {
        if (Array.isArray(value)) {
            for (const nested of value) {
                const numeric = numberFrom(nested);
                if (numeric != null) return numeric;
            }
        } else {
            const numeric = numberFrom(value);
            if (numeric != null) return numeric;
        }
    }
    return null;
};

const isLikelyDateLabel = (label: string): boolean => {
    if (!label) return false;
    const trimmed = label.trim();
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(trimmed)) return true;
    if (/^\d{8}$/.test(trimmed)) return true;
    if (/^\d{6}$/.test(trimmed)) return true;
    const replaced = trimmed.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
    const parsed = Date.parse(replaced || trimmed);
    return !Number.isNaN(parsed);
};

const normalizeDateLabel = (label?: string): string | undefined => {
    if (!label) return undefined;
    const trimmed = label.trim();
    if (/^\d{4}[-/]\d{2}[-/]\d{2}$/.test(trimmed)) {
        return trimmed.replace(/\//g, '-');
    }
    if (/^\d{8}$/.test(trimmed)) {
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`;
    }
    if (/^\d{6}$/.test(trimmed)) {
        return `${trimmed.slice(0, 4)}-${trimmed.slice(4)}-01`;
    }
    const replaced = trimmed.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
    const parsed = Date.parse(replaced || trimmed);
    if (!Number.isNaN(parsed)) {
        return toISODateString(new Date(parsed));
    }
    return undefined;
};

const convertItemToPoint = (item: unknown): ChartPoint | null => {
    if (item == null) return null;

    if (Array.isArray(item)) {
        if (!item.length) return null;
        const label = item[0] != null ? String(item[0]) : '';
        const value = firstNumber(item.slice(1));
        if (value == null) return null;
        const date = normalizeDateLabel(label);
        return { label, value, raw: item, ...(date ? { date } : {}) };
    }

    if (typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const labelCandidates: unknown[] = [
            obj.label,
            obj.dimension,
            obj.name,
            obj.page,
            obj.pagePath,
            obj.pathname,
            obj.title,
            obj.category,
            obj.source,
            obj.medium,
            obj.channel,
            obj.country,
            obj.region,
            obj.city,
            obj.event,
            obj.date,
            obj.day,
            obj.dimensionValue,
            (obj.dimensionValues as any)?.[0]?.value,
            (obj.dimensionValues as any)?.[1]?.value,
            (obj.row as any)?.dimensionValues?.[0]?.value,
            (obj.row as any)?.dimensionValues?.[1]?.value,
        ];
        let label = labelCandidates.find((candidate) => candidate != null && `${candidate}`.trim().length > 0);
        if (label == null) {
            const keys = Object.keys(obj);
            if (keys.length > 0) {
                label = keys[0];
            }
        }
        const valueCandidates: unknown[] = [
            obj.value,
            obj.metricValue,
            obj.metric,
            obj.count,
            obj.total,
            obj.users,
            obj.sessions,
            obj.pageviews,
            obj.views,
            obj.newUsers,
            obj.engagedSessions,
            (obj.metricValues as any)?.[0]?.value,
            (obj.metrics as any)?.[0]?.value,
            (obj.row as any)?.metricValues?.[0]?.value,
            (obj.row as any)?.metrics?.[0]?.value,
        ];
        if (Array.isArray(obj.metricValues)) {
            obj.metricValues.forEach((val) => valueCandidates.push((val as any)?.value ?? val));
        }
        if (Array.isArray(obj.metrics)) {
            obj.metrics.forEach((val) => valueCandidates.push((val as any)?.value ?? val));
        }
        const value = firstNumber(...valueCandidates);
        if (value == null) return null;
        const labelString = String(label ?? '');
        const date = normalizeDateLabel(labelString) ?? normalizeDateLabel((obj.date as string) ?? (obj.day as string));
        return { label: labelString, value, raw: item, ...(date ? { date } : {}) };
    }

    return null;
};

const collectPoints = (source: unknown): ChartPoint[] => {
    if (!source) return [];
    if (Array.isArray(source)) {
        return source
            .map((item) => convertItemToPoint(item))
            .filter((point): point is ChartPoint => Boolean(point));
    }
    if (typeof source === 'object') {
        const obj = source as Record<string, unknown>;
        return Object.entries(obj).reduce<ChartPoint[]>((acc, [key, value]) => {
            const numericValue = numberFrom(value);
            if (numericValue != null) {
                const date = normalizeDateLabel(key);
                acc.push({ label: key, value: numericValue, raw: value, ...(date ? { date } : {}) });
            } else if (Array.isArray(value)) {
                acc.push(...collectPoints(value));
            } else if (typeof value === 'object') {
                const point = convertItemToPoint({ label: key, ...(value as Record<string, unknown>) });
                if (point) acc.push(point);
            }
            return acc;
        }, []);
    }
    return [];
};

const gatherAllPoints = (data: any): ChartPoint[] => {
    if (!data) return [];
    const candidates: unknown[] = [
        data.timeSeries,
        data.timeseries,
        data.trend,
        data.series,
        data.timeline,
        data.points,
        data.values,
        data.breakdown,
        data.byDimension,
        data.topPages,
        data.topRows,
        data.categories,
        data.items,
    ];

    if (Array.isArray(data.rows)) {
        const fromRows = data.rows
            .map((row: any) => {
                if (row == null) return null;
                if (row.dimensionValues || row.metricValues) {
                    const label =
                        row.dimensionValues?.[0]?.value ??
                        row.dimensionValues?.[1]?.value ??
                        row.dimensionValue?.value ??
                        row.dimension ?? '';
                    const value =
                        firstNumber(
                            row.metricValues?.map((metric: any) => metric?.value),
                            row.metricValues,
                            row.metrics?.map((metric: any) => metric?.value),
                        ) ?? numberFrom(row.value);
                    if (value == null) return null;
                    const date = normalizeDateLabel(label);
                    return { label, value, raw: row, ...(date ? { date } : {}) };
                }
                return convertItemToPoint(row);
            })
            .filter((point): point is ChartPoint => Boolean(point));
        candidates.push(fromRows);
    }

    const points = candidates
        .map((candidate) => collectPoints(candidate))
        .flat()
        .filter((point): point is ChartPoint => Boolean(point));

    if (!points.length && typeof data === 'object') {
        points.push(...collectPoints(data));
    }

    const deduped: ChartPoint[] = [];
    const seen = new Set<string>();
    points.forEach((point) => {
        const key = `${point.label}|${point.date ?? ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            deduped.push(point);
        }
    });

    return deduped;
};

const dateValue = (point: ChartPoint): number => {
    const labelDate = point.date ?? normalizeDateLabel(point.label ?? '');
    if (!labelDate) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(labelDate);
    return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
};

const separatePoints = (points: ChartPoint[]) => {
    const timeSeries: ChartPoint[] = [];
    const categories: ChartPoint[] = [];

    points.forEach((point) => {
        const potentialDate = point.date ?? (isLikelyDateLabel(point.label) ? normalizeDateLabel(point.label) : undefined);
        if (potentialDate) {
            timeSeries.push({ ...point, date: potentialDate });
        } else {
            categories.push(point);
        }
    });

    const sortedTimeSeries = [...timeSeries].sort((a, b) => dateValue(a) - dateValue(b));
    return { timeSeries: sortedTimeSeries, breakdown: categories };
};

const parseAnalyticsResponse = (raw: unknown): AnalyticsWidgetData => {
    const data = (raw as any)?.data ?? (raw as any)?.result ?? raw ?? {};
    const totals = (data as any)?.totals;
    const totalsValue = Array.isArray(totals)
        ? firstNumber(
              ...totals.map((entry: any) => [
                  entry?.value,
                  entry?.metricValue,
                  entry?.total,
                  entry?.metricValues?.map((metric: any) => metric?.value),
              ]),
          )
        : firstNumber(
              totals?.value,
              totals?.metricValue,
              totals?.total,
              (totals?.metricValues ?? []).map((metric: any) => metric?.value),
          );

    let value =
        firstNumber(
            (data as any)?.metricValue,
            (data as any)?.value,
            (data as any)?.total,
            (data as any)?.summary?.value,
            totalsValue,
        ) ?? null;

    let change =
        firstNumber(
            (data as any)?.change,
            (data as any)?.delta,
            (data as any)?.deltaPercentage,
            (data as any)?.changePercentage,
            (data as any)?.changePercent,
            (data as any)?.comparison?.percent,
            (data as any)?.comparison?.percentage,
            (data as any)?.summary?.change,
            (data as any)?.summary?.changePercent,
            (data as any)?.summary?.changePercentage,
            totals?.change,
        ) ?? null;

    const allPoints = gatherAllPoints(data);
    const { timeSeries, breakdown } = separatePoints(allPoints);

    if (value == null) {
        if (timeSeries.length) {
            value = timeSeries[timeSeries.length - 1].value;
        } else if (breakdown.length) {
            value = breakdown.reduce((sum, point) => sum + point.value, 0);
        }
    }

    if ((change == null || Number.isNaN(change)) && timeSeries.length >= 2) {
        const previous = timeSeries[timeSeries.length - 2]?.value ?? 0;
        const latest = timeSeries[timeSeries.length - 1]?.value ?? 0;
        if (previous !== 0) {
            change = ((latest - previous) / Math.abs(previous)) * 100;
        } else if (latest !== 0) {
            change = 100;
        } else {
            change = 0;
        }
    }

    return {
        value: value == null || Number.isNaN(value) ? null : value,
        change: change == null || Number.isNaN(change) ? null : change,
        timeSeries,
        breakdown,
        raw: data,
    };
};

const formatCompactNumber = (value: number): string => {
    if (Math.abs(value) >= 1000) {
        return new Intl.NumberFormat(undefined, {
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(value);
    }
    if (Math.abs(value) >= 1) {
        return new Intl.NumberFormat(undefined, {
            maximumFractionDigits: 1,
        }).format(value);
    }
    return value.toFixed(2);
};

const formatDisplayDate = (value: string): string => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) return value;
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(parsed));
};

const formatLabelForAxis = (label: string): string => {
    if (isLikelyDateLabel(label)) {
        const normalized = normalizeDateLabel(label);
        return normalized ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(normalized)) : label;
    }
    return label.length > 12 ? `${label.slice(0, 11)}…` : label;
};

const formatPercent = (value: number): string => {
    const magnitude = Math.abs(value);
    const decimals = magnitude >= 10 ? 0 : magnitude >= 1 ? 1 : 2;
    return `${value > 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

interface MetricMapping {
    metrics: string[];
    dimensions?: string[];
    supported: boolean;
    fallbackMessage?: string;
}

const GA_METRIC_MAPPINGS: Record<string, MetricMapping> = {
    activeUsers: { metrics: ['activeUsers'], supported: true },
    sessions: { metrics: ['sessions'], supported: true },
    screenPageViews: { metrics: ['screenPageViews'], supported: true },
    averageSessionDuration: { metrics: ['averageSessionDuration'], supported: true },
    bounceRate: { metrics: ['bounceRate'], supported: true },
    newUsers: { metrics: ['newUsers'], supported: true },
    engagementRate: { metrics: ['engagementRate'], supported: true },
    usersBySource: {
        metrics: ['activeUsers'],
        dimensions: ['sessionSource'],
        supported: true,
    },
    usersByDevice: {
        metrics: ['activeUsers'],
        dimensions: ['deviceCategory'],
        supported: true,
    },
    topPages: {
        metrics: ['screenPageViews'],
        dimensions: ['pagePath'],
        supported: true,
    },
};

const resolveMetricMapping = (metricId: string): MetricMapping => {
    const mapping = GA_METRIC_MAPPINGS[metricId];
    if (mapping) {
        return mapping;
    }
    return {
        metrics: [metricId],
        supported: false,
        fallbackMessage: `Metric "${metricId}" is not supported. Please configure a valid GA4 metric.`,
    };
};

const LoadingSkeleton: React.FC = () => (
    <div className="h-44 w-full overflow-hidden rounded-md bg-gray-100 dark:bg-gray-700">
        <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-gray-200/80 to-transparent dark:via-gray-600/50" />
    </div>
);

const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
    <div className="flex h-44 w-full flex-col items-center justify-center rounded-md border border-dashed border-red-300 bg-red-50 text-center text-sm text-red-500 dark:border-red-500/40 dark:bg-red-500/10">
        <p className="px-6">{message}</p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center rounded-md bg-red-100 px-3 py-1 text-xs font-medium text-red-600 transition hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30"
            >
                Retry
            </button>
        )}
    </div>
);

const ChangeIndicator: React.FC<{ change: number }> = ({ change }) => {
    const isPositive = change > 0;
    const isNegative = change < 0;
    const colorClass = isPositive ? 'text-emerald-500 dark:text-emerald-400' : isNegative ? 'text-rose-500 dark:text-rose-400' : 'text-gray-500 dark:text-gray-400';
    const formatted = formatPercent(change);
    return (
        <span className={`inline-flex items-center space-x-1 text-sm font-medium ${colorClass}`} aria-label={`Change ${formatted}`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {isPositive && <path d="M12 5l5.5 7h-11L12 5z" />}
                {isNegative && <path d="M12 19l-5.5-7h11L12 19z" />}
                {!isPositive && !isNegative && <path d="M6 11.25h12v1.5H6z" />}
            </svg>
            <span>{formatted}</span>
        </span>
    );
};

const ChartEmptyState: React.FC<{ message?: string }> = ({ message }) => (
    <div className="flex h-44 w-full flex-col items-center justify-center rounded-md border border-dashed border-gray-200 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
        <p>{message ?? 'No data available for the selected period.'}</p>
    </div>
);

const LineChart: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
    const gradientInstanceId = useId();
    const gradientId = useMemo(() => {
        const sanitized = gradientInstanceId.replace(/[^a-zA-Z0-9_-]/g, '');
        return sanitized ? `ga-line-gradient-${sanitized}` : 'ga-line-gradient-default';
    }, [gradientInstanceId]);
    const width = 400;
    const height = 180;
    const chartHeight = height - 30;
    const values = data.map((point) => point.value);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 1);
    const range = maxValue - minValue || 1;
    const points = data.map((point, index) => {
        const x = data.length === 1 ? width / 2 : (index / (data.length - 1)) * width;
        const normalized = (point.value - minValue) / range;
        const y = height - 15 - normalized * chartHeight;
        return { x, y, label: point.label, value: point.value };
    });
    const pathD = points.map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${pt.x},${pt.y}`).join(' ');
    const areaD = points.length
        ? `M0,${height} ${points.map((pt) => `L${pt.x},${pt.y}`).join(' ')} L${width},${height} Z`
        : '';

    const firstLabel = data[0]?.label ?? '';
    const lastLabel = data[data.length - 1]?.label ?? '';

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full text-indigo-500 dark:text-indigo-400">
            <defs>
                <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={`M0 ${height - 15} H${width}`} stroke="rgba(148, 163, 184, 0.3)" strokeWidth={1} fill="none" />
            <path d={areaD} fill={`url(#${gradientId})`} />
            <path d={pathD} stroke="currentColor" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((pt, idx) => (
                <circle key={`point-${idx}`} cx={pt.x} cy={pt.y} r={3.5} fill="white" stroke="currentColor" strokeWidth={1.5} />
            ))}
            <text x={0} y={height - 2} className="fill-gray-500 text-[10px] dark:fill-gray-400">
                {formatLabelForAxis(firstLabel)}
            </text>
            <text x={width} y={height - 2} textAnchor="end" className="fill-gray-500 text-[10px] dark:fill-gray-400">
                {formatLabelForAxis(lastLabel)}
            </text>
        </svg>
    );
};

const BarChart: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
    const width = 400;
    const height = 180;
    const chartHeight = height - 40;
    const values = data.map((point) => point.value);
    const maxValue = Math.max(...values, 1);
    const gap = 12;
    const barWidth = Math.max(16, (width - gap * (data.length + 1)) / data.length);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
            <path d={`M0 ${height - 25} H${width}`} stroke="rgba(148, 163, 184, 0.3)" strokeWidth={1} fill="none" />
            {data.map((point, index) => {
                const barHeight = (point.value / maxValue) * chartHeight;
                const x = gap + index * (barWidth + gap);
                const y = height - 25 - barHeight;
                const color = CHART_COLORS[index % CHART_COLORS.length];
                return (
                    <g key={`bar-${point.label ?? index}`}>
                        <rect x={x} y={y} width={barWidth} height={barHeight} rx={4} fill={color} />
                        <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="fill-gray-500 text-[10px] dark:fill-gray-400">
                            {formatLabelForAxis(point.label)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

const PieChart: React.FC<{ data: ChartPoint[] }> = ({ data }) => {
    const radius = 65;
    const centerX = 85;
    const centerY = 85;
    const total = data.reduce((sum, point) => sum + (Number.isFinite(point.value) ? point.value : 0), 0) || 1;
    let cumulative = 0;

    const slices = data.map((point, index) => {
        const value = Number.isFinite(point.value) ? point.value : 0;
        const startAngle = (cumulative / total) * Math.PI * 2;
        const endAngle = ((cumulative + value) / total) * Math.PI * 2;
        cumulative += value;
        const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);

        const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${startX} ${startY}`,
            `A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`,
            'Z',
        ].join(' ');

        const color = CHART_COLORS[index % CHART_COLORS.length];

        return {
            pathData,
            color,
            point,
        };
    });

    return (
        <div className="flex h-44 w-full flex-col gap-4 sm:flex-row sm:items-center">
            <svg viewBox="0 0 180 180" className="h-36 w-36 self-center sm:self-auto">
                {slices.map(({ pathData, color }, index) => (
                    <path key={`slice-${index}`} d={pathData} fill={color} stroke="white" strokeWidth={1} />
                ))}
            </svg>
            <div className="grid flex-1 grid-cols-1 gap-2 text-xs">
                {data.map((point, index) => {
                    const color = CHART_COLORS[index % CHART_COLORS.length];
                    const percentage = total ? ((point.value / total) * 100).toFixed(1) : '0.0';
                    return (
                        <div key={`legend-${point.label ?? index}`} className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 dark:border-gray-700/70">
                            <div className="flex items-center space-x-2">
                                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="font-medium text-gray-700 dark:text-gray-200">{point.label}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
                                <span>{formatCompactNumber(point.value)}</span>
                                <span className="text-gray-400">({percentage}%)</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const GoogleAnalyticsWidget: React.FC<GoogleAnalyticsWidgetProps> = ({
    metric,
    dateRange,
    chartType = 'line',
    title,
    className,
    description,
}) => {
    const resolvedRange = useMemo(() => ensureDateRange(dateRange), [dateRange?.endDate, dateRange?.startDate]);
    const [data, setData] = useState<AnalyticsWidgetData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(
        async (signal?: AbortSignal) => {
            setLoading(true);
            setError(null);

            const mapping = resolveMetricMapping(metric);

            if (!mapping.supported) {
                setLoading(false);
                setError(mapping.fallbackMessage ?? 'Unsupported metric');
                setData(null);
                return;
            }

            try {
                const params = new URLSearchParams();
                mapping.metrics.forEach(m => params.append('metrics', m));
                if (mapping.dimensions) {
                    mapping.dimensions.forEach(d => params.append('dimensions', d));
                }
                params.set('startDate', resolvedRange.startDate);
                params.set('endDate', resolvedRange.endDate);

                const { data: resData } = await apiClient.get('/analytics/google-analytics', {
                    params,
                    signal,
                    headers: { Accept: 'application/json' },
                });

                const json = resData?.data ?? resData ?? {};
                const parsed = parseAnalyticsResponse(json);
                if (signal?.aborted) return;
                setData(parsed);
            } catch (err: any) {
                const isCanceled = err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled';
                if (isCanceled || signal?.aborted) return;
                console.error('[GoogleAnalyticsWidget] load error:', err);
                setError(err?.message ?? 'Unable to load analytics data.');
                setData(null);
            } finally {
                if (!signal?.aborted) {
                    setLoading(false);
                }
            }
        },
        [chartType, metric, resolvedRange.endDate, resolvedRange.startDate],
    );

    useEffect(() => {
        const controller = new AbortController();
        fetchData(controller.signal);
        return () => controller.abort();
    }, [fetchData]);

    const handleRetry = useCallback(() => {
        fetchData();
    }, [fetchData]);

    const primaryValue = data?.value ?? null;
    const changeValue = data?.change ?? null;

    const basePoints = useMemo(() => {
        if (!data) return [];
        if (chartType === 'line') {
            return data.timeSeries.length ? data.timeSeries : data.breakdown;
        }
        if (chartType === 'pie' || chartType === 'bar') {
            return data.breakdown.length ? data.breakdown : data.timeSeries;
        }
        return [];
    }, [chartType, data]);

    const chartData = useMemo(() => {
        if (chartType === 'line') {
            const limited = basePoints.slice(-LINE_POINT_LIMIT);
            return limited;
        }
        if (chartType === 'pie') {
            if (basePoints.length <= PIE_SLICE_LIMIT) return basePoints;
            const visible = basePoints.slice(0, PIE_SLICE_LIMIT - 1);
            const remainder = basePoints.slice(PIE_SLICE_LIMIT - 1).reduce((sum, point) => sum + point.value, 0);
            if (remainder > 0) {
                return [...visible, { label: 'Other', value: remainder }];
            }
            return visible;
        }
        if (chartType === 'bar') {
            return basePoints.slice(0, CATEGORY_BAR_LIMIT);
        }
        return basePoints;
    }, [basePoints, chartType]);

    const rangeLabel = useMemo(
        () => `${formatDisplayDate(resolvedRange.startDate)} – ${formatDisplayDate(resolvedRange.endDate)}`,
        [resolvedRange.endDate, resolvedRange.startDate],
    );

    const hasData = chartData.length > 0;

    return (
        <section
            className={`flex flex-col rounded-xl border border-gray-100 bg-white p-6 shadow-sm transition dark:border-gray-800 dark:bg-gray-900 ${className ?? ''}`}
            role="region"
            aria-label={title ?? `Google Analytics ${metric}`}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    {title && <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">{title}</p>}
                    <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
                        <span className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
                            {primaryValue != null ? formatCompactNumber(primaryValue) : '—'}
                        </span>
                        {changeValue != null && <ChangeIndicator change={changeValue} />}
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{rangeLabel}</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                    {metric.replace(/[_-]/g, ' ')}
                </span>
            </div>

            <div className="mt-6 flex-1">
                {loading && <LoadingSkeleton />}
                {!loading && error && <ErrorState message={error} onRetry={handleRetry} />}
                {!loading && !error && !hasData && <ChartEmptyState />}
                {!loading && !error && hasData && (
                    <div className="w-full">
                        {chartType === 'line' && <LineChart data={chartData} />}
                        {chartType === 'bar' && <BarChart data={chartData} />}
                        {chartType === 'pie' && <PieChart data={chartData} />}
                    </div>
                )}
            </div>

            {description && <p className="mt-4 text-xs leading-5 text-gray-500 dark:text-gray-400">{description}</p>}
        </section>
    );
};

export default GoogleAnalyticsWidget;
