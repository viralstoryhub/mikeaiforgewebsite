import React, { useCallback, useEffect, useRef, useState } from 'react';

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface StatusGroup {
    status?: string | null;
    connected?: boolean;
    message?: string;
    avgResponseTimeMs?: number;
    responseTimeMs?: number;
    rate?: number;
    seconds?: number;
    statusMessage?: string;
}

interface SystemHealthApiResponse {
    database?: StatusGroup;
    databaseConnected?: boolean;
    databaseStatus?: string;
    api?: StatusGroup;
    apiResponseTimeMs?: number;
    apiResponseStatus?: string;
    errors?: StatusGroup;
    errorRatePercent?: number;
    errorRateStatus?: string;
    uptime?: StatusGroup;
    uptimeSeconds?: number;
    uptimeStatus?: string;
    metrics?: {
        databaseStatus?: string;
        apiResponseTimeMs?: number;
        apiResponseStatus?: string;
        errorRatePercent?: number;
        errorRateStatus?: string;
        uptimeSeconds?: number;
        uptimeStatus?: string;
    };
    status?: {
        database?: string;
        api?: string;
        errors?: string;
        uptime?: string;
    };
    lastUpdated?: string;
    lastChecked?: string;
    timestamp?: string;
    [key: string]: unknown;
}

const REFRESH_INTERVAL = 60_000;

const statusDotClassMap: Record<HealthStatus, string> = {
    healthy: 'bg-emerald-500',
    warning: 'bg-amber-500',
    critical: 'bg-rose-500',
};

const statusBadgeClassMap: Record<HealthStatus, string> = {
    healthy:
        'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/70 dark:border-emerald-500/20',
    warning:
        'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-100/70 dark:border-amber-500/20',
    critical:
        'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100/70 dark:border-rose-500/20',
};

const statusTextMap: Record<HealthStatus, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
};

/**
 * Normalizes common backend status descriptors into the three canonical health states.
 * This keeps the UI consistent even if the API terminology differs.
 */
const statusSynonymMap: Record<string, HealthStatus> = {
    ok: 'healthy',
    connected: 'healthy',
    operational: 'healthy',
    available: 'healthy',
    up: 'healthy',
    running: 'healthy',
    stable: 'healthy',
    nominal: 'healthy',
    success: 'healthy',
    'in service': 'healthy',
    passing: 'healthy',
    good: 'healthy',
    green: 'healthy',
    active: 'healthy',
    // Warning-level descriptors
    degraded: 'warning',
    slow: 'warning',
    caution: 'warning',
    yellow: 'warning',
    intermittent: 'warning',
    maintenance: 'warning',
    overloaded: 'warning',
    'partial outage': 'warning',
    'minor outage': 'warning',
    issues: 'warning',
    // Critical descriptors
    down: 'critical',
    offline: 'critical',
    disconnected: 'critical',
    failed: 'critical',
    failure: 'critical',
    error: 'critical',
    outage: 'critical',
    red: 'critical',
    'major outage': 'critical',
};

const parseNumber = (value: unknown): number | undefined => {
    if (value === null || value === undefined) {
        return undefined;
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const toHealthStatus = (value: unknown): HealthStatus | undefined => {
    if (!value) {
        return undefined;
    }
    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'healthy' || normalized === 'warning' || normalized === 'critical') {
        return normalized as HealthStatus;
    }
    const alias = statusSynonymMap[normalized];
    return alias;
};

const computeApiStatus = (value: number): HealthStatus => {
    if (value <= 400) {
        return 'healthy';
    }
    if (value <= 800) {
        return 'warning';
    }
    return 'critical';
};

const computeErrorStatus = (value: number): HealthStatus => {
    if (value <= 1) {
        return 'healthy';
    }
    if (value <= 3) {
        return 'warning';
    }
    return 'critical';
};

const computeUptimeStatus = (value: number): HealthStatus => {
    if (value >= 86_400) {
        return 'healthy';
    }
    if (value >= 3_600) {
        return 'warning';
    }
    return 'critical';
};

const formatResponseTime = (value?: number): string => {
    if (value === undefined || Number.isNaN(value)) {
        return 'Unknown';
    }
    if (value >= 1000) {
        const seconds = value / 1000;
        return `${Math.round(value)} ms (${seconds.toFixed(2)} s)`;
    }
    return `${Math.round(value)} ms`;
};

const formatErrorRate = (value?: number): string => {
    if (value === undefined || Number.isNaN(value)) {
        return 'Unknown';
    }
    const formatted = value < 1 ? value.toFixed(2) : value < 10 ? value.toFixed(1) : value.toFixed(0);
    return `${formatted}%`;
};

const formatDuration = (value?: number): string => {
    if (value === undefined || Number.isNaN(value)) {
        return 'Unknown';
    }

    const totalSeconds = Math.max(0, Math.floor(value));
    if (totalSeconds < 60) {
        return `${totalSeconds}s`;
    }

    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) {
        const seconds = totalSeconds % 60;
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        const remainingMinutes = minutes % 60;
        return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

const formatFullDateTime = (date: Date): string =>
    new Intl.DateTimeFormat(undefined, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
    }).format(date);

const getRelativeTimeLabel = (date: Date): string => {
    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.round(diffMs / 1000);

    if (diffSeconds < 60) {
        return `${diffSeconds}s ago`;
    }
    const diffMinutes = Math.round(diffSeconds / 60);
    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }
    const diffWeeks = Math.round(diffDays / 7);
    if (diffWeeks < 5) {
        return `${diffWeeks}w ago`;
    }
    const diffMonths = Math.round(diffDays / 30);
    if (diffMonths < 12) {
        return `${diffMonths}mo ago`;
    }
    const diffYears = Math.round(diffDays / 365);
    return `${diffYears}y ago`;
};

interface MetricCardRowProps {
    label: string;
    status: HealthStatus;
    value: string;
    helperText?: string;
}

const MetricCardRow: React.FC<MetricCardRowProps> = ({ label, status, value, helperText }) => (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-4 dark:border-gray-700/60 dark:bg-gray-900/40">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-100">
                    <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${statusDotClassMap[status]}`}
                        aria-hidden="true"
                    />
                    <span className="sr-only">{`${label} status is ${statusTextMap[status]}`}</span>
                    <span>{label}</span>
                    <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${statusBadgeClassMap[status]}`}
                        role="status"
                        aria-live="polite"
                    >
                        {statusTextMap[status]}
                    </span>
                </div>
                {helperText ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
                ) : null}
            </div>
            <div className="text-base font-semibold text-gray-900 dark:text-gray-50">{value}</div>
        </div>
    </div>
);

const SystemHealthCard: React.FC = () => {
    const [healthData, setHealthData] = useState<SystemHealthApiResponse | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const fetchHealth = useCallback(async (options: { silent?: boolean } = {}) => {
        if (!options.silent) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        try {
            const response = await fetch('/api/admin/system-health', {
                credentials: 'include',
                headers: {
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const data = (await response.json()) as SystemHealthApiResponse;

            if (!isMountedRef.current) {
                return;
            }

            setHealthData(data);
            setError(null);

            const timestampValue = data.lastUpdated ?? data.lastChecked ?? data.timestamp;
            const candidateDate = timestampValue ? new Date(timestampValue) : new Date();
            setLastUpdated(Number.isNaN(candidateDate.getTime()) ? new Date() : candidateDate);
        } catch (err) {
            if (!isMountedRef.current) {
                return;
            }
            const message =
                err instanceof Error ? err.message : 'Unable to retrieve system health information.';
            setError(message);
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setIsRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchHealth();

        const intervalId = window.setInterval(() => {
            fetchHealth({ silent: true }).catch(() => {
                // Errors are handled inside fetchHealth; suppress unhandled rejection.
            });
        }, REFRESH_INTERVAL);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [fetchHealth]);

    const databaseConnected = (() => {
        if (typeof healthData?.database?.connected === 'boolean') {
            return healthData.database.connected;
        }
        if (typeof healthData?.databaseConnected === 'boolean') {
            return healthData.databaseConnected;
        }
        return undefined;
    })();

    const databaseStatus: HealthStatus =
        toHealthStatus(healthData?.database?.status) ??
        toHealthStatus(healthData?.databaseStatus) ??
        toHealthStatus(healthData?.metrics?.databaseStatus) ??
        toHealthStatus(healthData?.status?.database) ??
        (databaseConnected === false ? 'critical' : databaseConnected === true ? 'healthy' : 'warning');

    const apiResponseTime = parseNumber(
        healthData?.apiResponseTimeMs ??
            healthData?.api?.avgResponseTimeMs ??
            healthData?.api?.responseTimeMs ??
            healthData?.metrics?.apiResponseTimeMs,
    );

    const apiStatus: HealthStatus =
        toHealthStatus(healthData?.api?.status) ??
        toHealthStatus(healthData?.apiResponseStatus) ??
        toHealthStatus(healthData?.metrics?.apiResponseStatus) ??
        toHealthStatus(healthData?.status?.api) ??
        (apiResponseTime !== undefined ? computeApiStatus(apiResponseTime) : 'warning');

    const errorRateRaw = parseNumber(
        healthData?.errorRatePercent ?? healthData?.errors?.rate ?? healthData?.metrics?.errorRatePercent,
    );

    const errorRatePercent =
        errorRateRaw !== undefined
            ? errorRateRaw > 1 && errorRateRaw <= 100
                ? errorRateRaw
                : errorRateRaw * 100
            : undefined;

    const errorStatus: HealthStatus =
        toHealthStatus(healthData?.errors?.status) ??
        toHealthStatus(healthData?.errorRateStatus) ??
        toHealthStatus(healthData?.metrics?.errorRateStatus) ??
        toHealthStatus(healthData?.status?.errors) ??
        (errorRatePercent !== undefined ? computeErrorStatus(errorRatePercent) : 'warning');

    const uptimeSeconds = parseNumber(
        healthData?.uptimeSeconds ?? healthData?.uptime?.seconds ?? healthData?.metrics?.uptimeSeconds,
    );

    const uptimeStatus: HealthStatus =
        toHealthStatus(healthData?.uptime?.status) ??
        toHealthStatus(healthData?.uptimeStatus) ??
        toHealthStatus(healthData?.metrics?.uptimeStatus) ??
        toHealthStatus(healthData?.status?.uptime) ??
        (uptimeSeconds !== undefined ? computeUptimeStatus(uptimeSeconds) : 'warning');

    const databaseLabel =
        databaseConnected === true ? 'Connected' : databaseConnected === false ? 'Disconnected' : 'Unknown';
    const databaseHelper = healthData?.database?.message;

    const apiHelper = healthData?.api?.message ?? healthData?.api?.statusMessage;

    const errorHelper = healthData?.errors?.message ?? healthData?.errors?.statusMessage;

    const uptimeHelper = healthData?.uptime?.message ?? healthData?.uptime?.statusMessage;

    const lastUpdatedLabel = lastUpdated ? formatFullDateTime(lastUpdated) : undefined;
    const relativeLastUpdated = lastUpdated ? getRelativeTimeLabel(lastUpdated) : undefined;

    const disableRefresh = loading || isRefreshing;

    return (
        <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Health</h2>
                    <p
                        className="text-xs text-gray-500 dark:text-gray-400"
                        title={lastUpdatedLabel}
                        aria-live="polite"
                    >
                        {relativeLastUpdated && lastUpdatedLabel
                            ? `Last updated ${relativeLastUpdated} (${lastUpdatedLabel})`
                            : loading && !healthData
                              ? 'Fetching latest status...'
                              : 'Last updated: —'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        Auto-refreshes every 60 seconds
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => fetchHealth()}
                    disabled={disableRefresh}
                    className={`inline-flex items-center gap-2 rounded-lg border border-transparent bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-indigo-400/70`}
                >
                    <span className="inline-flex h-4 w-4 items-center justify-center">
                        {isRefreshing || loading ? (
                            <svg
                                className="h-4 w-4 animate-spin text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                role="status"
                                aria-hidden="true"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4l5-5-5-5v4a12 12 0 00-12 12h4z"
                                />
                            </svg>
                        ) : (
                            <svg
                                className="h-4 w-4 text-white"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <path d="M21 2v6h-6" />
                                <path d="M3 12a9 9 0 0115-6.7L21 8" />
                                <path d="M3 22v-6h6" />
                                <path d="M21 12a9 9 0 01-15 6.7L3 16" />
                            </svg>
                        )}
                    </span>
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mt-4 rounded-lg border border-rose-500/40 bg-rose-50/80 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {error}
                </div>
            )}

            <div className="mt-6 flex-1">
                {loading && !healthData ? (
                    <div className="space-y-3">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="h-[82px] animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700/60"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        <MetricCardRow
                            label="Database"
                            status={databaseStatus}
                            value={databaseLabel}
                            helperText={databaseHelper}
                        />
                        <MetricCardRow
                            label="API Response Time"
                            status={apiStatus}
                            value={formatResponseTime(apiResponseTime)}
                            helperText={apiHelper}
                        />
                        <MetricCardRow
                            label="Error Rate"
                            status={errorStatus}
                            value={formatErrorRate(errorRatePercent)}
                            helperText={errorHelper}
                        />
                        <MetricCardRow
                            label="Uptime"
                            status={uptimeStatus}
                            value={formatDuration(uptimeSeconds)}
                            helperText={uptimeHelper}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemHealthCard;
