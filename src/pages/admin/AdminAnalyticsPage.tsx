import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { User } from '../../types';
import * as authService from '../../services/authService';
import { UTILITIES_DATA } from '../../constants';

import apiClient from '../../services/apiClient';

/**
 * Existing simple BarChart component (kept as-is).
 */
const BarChart: React.FC<{ data: { label: string; value: number }[]; title: string }> = ({ data, title }) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow h-full">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            <div className="space-y-2">
                {data.length > 0 ? data.map(({ label, value }) => (
                    <div key={label}>
                        <div className="flex justify-between items-center text-sm">
                            <span className="truncate pr-2">{label}</span>
                            <span className="font-bold">{value}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                            <div
                                className="bg-brand-secondary h-2 rounded-full"
                                style={{ width: `${(value / maxValue) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No data to display.</p>
                )}
            </div>
        </div>
    );
};

/**
 * Minimal line chart for simple trends (sparkline-style with axes).
 * Expects points: { x: string (label), y: number }
 */
const LineChart: React.FC<{ data: { x: string; y: number }[]; height?: number; color?: string }> = ({ data, height = 80, color = '#2563EB' }) => {
    if (!data || data.length === 0) {
        return <div className="text-sm text-gray-500 dark:text-gray-400 p-4">No trend data</div>;
    }

    const values = data.map(d => d.y);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = ((max - d.y) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="w-full">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={`w-full`} style={{ height }}>
                <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth={1.6}
                    points={points}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>{data[0].x}</span>
                <span>{data[data.length - 1].x}</span>
            </div>
        </div>
    );
};

/**
 * DateRangePicker - local component to select presets or custom start/end.
 */
type DateRange = { startDate: string; endDate: string };

const formatDate = (d: Date) => d.toISOString().slice(0, 10);

const getPresetRange = (days: number): DateRange => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    return { startDate: formatDate(start), endDate: formatDate(end) };
};

const DateRangePicker: React.FC<{
    value: DateRange;
    onChange: (v: DateRange) => void;
    presets?: { label: string; days: number }[];
}> = ({ value, onChange, presets = [{ label: '7 days', days: 7 }, { label: '30 days', days: 30 }, { label: '90 days', days: 90 }] }) => {
    const [start, setStart] = useState(value.startDate);
    const [end, setEnd] = useState(value.endDate);

    useEffect(() => {
        setStart(value.startDate);
        setEnd(value.endDate);
    }, [value]);

    const applyCustom = () => {
        if (new Date(start) > new Date(end)) {
            // simple validation: start must be <= end
            return;
        }
        onChange({ startDate: start, endDate: end });
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center space-x-2">
                {presets.map(p => (
                    <button
                        key={p.label}
                        onClick={() => onChange(getPresetRange(p.days))}
                        className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm hover:opacity-90"
                    >
                        {p.label}
                    </button>
                ))}
                <div className="ml-4 flex items-center space-x-2">
                    <label className="text-sm text-gray-600 dark:text-gray-300">From</label>
                    <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="bg-white dark:bg-gray-800 border rounded px-2 py-1 text-sm" />
                    <label className="text-sm text-gray-600 dark:text-gray-300">To</label>
                    <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-white dark:bg-gray-800 border rounded px-2 py-1 text-sm" />
                    <button onClick={applyCustom} className="px-3 py-1 rounded bg-brand-secondary text-white text-sm">Apply</button>
                </div>
            </div>
        </div>
    );
};

/**
 * Helper: convert array of objects to CSV string.
 */
const toCSV = (rows: any[], columns?: string[]) => {
    if (!rows || rows.length === 0) return '';
    const headers = columns && columns.length ? columns : Object.keys(rows[0]);
    const esc = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const lines = [headers.join(',')].concat(
        rows.map(r => headers.map(h => esc(r[h])).join(','))
    );
    return lines.join('\n');
};

/**
 * Main AdminAnalyticsPage component
 */
const AdminAnalyticsPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const { tools, loading: loadingContent } = useData();

    // GA related states
    const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'engagement' | 'traffic'>('overview');
    const [dateRange, setDateRange] = useState<DateRange>(getPresetRange(30));
    const [gaLoading, setGaLoading] = useState(false);
    const [gaError, setGaError] = useState<string | null>(null);

    const [overviewMetrics, setOverviewMetrics] = useState<{
        totalUsers?: number;
        sessions?: number;
        pageViews?: number;
        avgSessionDuration?: number;
        bounceRate?: number;
        dailyTrend?: { date: string; users: number; sessions: number }[];
        topPages?: { path: string; views: number; avgTimeOnPage?: number }[];
    }>({});

    const [realtimeData, setRealtimeData] = useState<{
        activeUsers?: number;
        topPages?: { path: string; activeUsers: number }[];
    }>({});

    const [engagementData, setEngagementData] = useState<{
        eventsPerSession?: number;
        engagedSessions?: number;
        eventsBreakdown?: { name: string; count: number }[];
    }>({});

    const [trafficData, setTrafficData] = useState<{
        bySource?: { source: string; sessions: number }[];
        byCountry?: { country: string; sessions: number }[];
    }>({});

    // Fetch users for internal analytics
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            try {
                const fetchedUsers = await authService.getAllUsers();
                setUsers(fetchedUsers);
            } catch (error) {
                console.error("Failed to fetch users:", error);
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // GA fetchers
    const fetchGAOverview = useCallback(async (range: DateRange) => {
        setGaLoading(true);
        setGaError(null);
        try {
            const res = await apiClient.get('/analytics/google-analytics', {
                params: {
                    startDate: range.startDate,
                    endDate: range.endDate,
                    type: 'overview',
                },
            });
            const json = res?.data?.data ?? res?.data ?? {};
            // Expecting json shape with metrics & arrays - adapt if backend differs
            setOverviewMetrics({
                totalUsers: json.totalUsers,
                sessions: json.sessions,
                pageViews: json.pageViews,
                avgSessionDuration: json.avgSessionDuration,
                bounceRate: json.bounceRate,
                dailyTrend: json.dailyTrend || [],
                topPages: json.topPages || [],
            });
        } catch (err: any) {
            console.error('GA overview error', err);
            setGaError(err?.message || 'Failed to fetch Google Analytics overview. Ensure credentials are configured.');
            setOverviewMetrics({});
        } finally {
            setGaLoading(false);
        }
    }, []);

    const fetchGARealtime = useCallback(async () => {
        try {
            const res = await apiClient.get('/analytics/google-analytics/realtime');
            const json = res?.data?.data ?? res?.data ?? {};
            setRealtimeData({
                activeUsers: json.activeUsers,
                topPages: json.activePages || [],
            });
        } catch (err: any) {
            console.error('GA realtime error', err);
            setGaError(err?.message || 'Failed to fetch Google Analytics realtime data. Ensure credentials are configured.');
            setRealtimeData({});
        }
    }, []);

    const fetchGAEngagement = useCallback(async (range: DateRange) => {
        setGaLoading(true);
        setGaError(null);
        try {
            const res = await apiClient.get('/analytics/google-analytics', {
                params: {
                    startDate: range.startDate,
                    endDate: range.endDate,
                    type: 'engagement',
                },
            });
            const json = res?.data?.data ?? res?.data ?? {};
            setEngagementData({
                eventsPerSession: json.eventsPerSession,
                engagedSessions: json.engagedSessions,
                eventsBreakdown: json.eventsBreakdown || [],
            });
        } catch (err: any) {
            console.error('GA engagement error', err);
            setGaError(err?.message || 'Failed to fetch Google Analytics engagement data.');
            setEngagementData({});
        } finally {
            setGaLoading(false);
        }
    }, []);

    const fetchGATraffic = useCallback(async (range: DateRange) => {
        setGaLoading(true);
        setGaError(null);
        try {
            const res = await apiClient.get('/analytics/google-analytics', {
                params: {
                    startDate: range.startDate,
                    endDate: range.endDate,
                    type: 'traffic',
                },
            });
            const json = res?.data?.data ?? res?.data ?? {};
            setTrafficData({
                bySource: json.bySource || [],
                byCountry: json.byCountry || [],
            });
        } catch (err: any) {
            console.error('GA traffic error', err);
            setGaError(err?.message || 'Failed to fetch Google Analytics traffic data.');
            setTrafficData({});
        } finally {
            setGaLoading(false);
        }
    }, []);

    // Load GA data on mount and when dateRange changes for relevant tabs
    useEffect(() => {
        if (activeTab === 'overview') {
            fetchGAOverview(dateRange);
        } else if (activeTab === 'engagement') {
            fetchGAEngagement(dateRange);
        } else if (activeTab === 'traffic') {
            fetchGATraffic(dateRange);
        }
        // realtime handled separately
    }, [activeTab, dateRange, fetchGAOverview, fetchGAEngagement, fetchGATraffic]);

    // Realtime polling
    useEffect(() => {
        let interval: number | undefined;
        if (activeTab === 'realtime') {
            // fetch once immediately
            fetchGARealtime();
            interval = window.setInterval(() => {
                fetchGARealtime();
            }, 30 * 1000); // every 30 seconds
        }
        return () => {
            if (interval) {
                clearInterval(interval);
            }
        };
    }, [activeTab, fetchGARealtime]);

    // Internal analytics calculations (preserve existing functionality)
    const toolPopularity = useMemo(() => {
        const counts: { [toolId: string]: number } = {};
        users.forEach(user => {
            user.savedTools?.forEach(toolId => {
                counts[toolId] = (counts[toolId] || 0) + 1;
            });
        });

        return tools
            .map(tool => ({
                label: tool.name,
                value: counts[tool.id] || 0,
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10
    }, [users, tools]);

    const utilityUsage = useMemo(() => {
        const counts: { [slug: string]: number } = {};
        users.forEach(user => {
            if (user.utilityUsage) {
                Object.entries(user.utilityUsage).forEach(([slug, count]) => {
                    counts[slug] = (counts[slug] || 0) + (count as number);
                });
            }
        });

        return UTILITIES_DATA
            .map(utility => ({
                label: utility.name,
                value: counts[utility.slug] || 0,
            }))
            .filter(item => item.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10
    }, [users]);

    const topUsers = useMemo(() => {
        return users
            .map(user => {
                const totalUsage = user.utilityUsage ? Object.values(user.utilityUsage).reduce((sum: number, count: number) => sum + count, 0) : 0;
                return { ...user, totalUsage };
            })
            .sort((a, b) => b.totalUsage - a.totalUsage)
            .slice(0, 5); // Top 5
    }, [users]);

    // Loading guard for entire page
    if (loadingUsers || loadingContent) {
        return <div className="text-center p-8">Loading analytics data...</div>;
    }

    // Export handlers
    const exportOverviewCSV = () => {
        const rows = (overviewMetrics.topPages || []).map(p => ({
            path: p.path,
            views: p.views,
            avgTimeOnPage: p.avgTimeOnPage ?? '',
        }));
        const csv = toCSV(rows, ['path', 'views', 'avgTimeOnPage']);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ga_top_pages_${dateRange.startDate}_${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const exportTrendCSV = () => {
        const rows = (overviewMetrics.dailyTrend || []).map(d => ({
            date: d.date,
            users: d.users,
            sessions: d.sessions,
        }));
        const csv = toCSV(rows, ['date', 'users', 'sessions']);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ga_trend_${dateRange.startDate}_${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const printAsPDF = () => {
        window.print();
    };

    return (
        <div className="animate-fade-in-up">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">Analytics</h1>

            {/* Google Analytics Overview Section */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Google Analytics Overview</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">View metrics from your GA4 property (if configured).</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <DateRangePicker value={dateRange} onChange={setDateRange} />
                        <div className="flex items-center space-x-2 ml-4">
                            <button onClick={exportOverviewCSV} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Export CSV</button>
                            <button onClick={printAsPDF} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Export PDF</button>
                        </div>
                    </div>
                </div>

                <div className="mt-4">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                            <button onClick={() => setActiveTab('overview')} className={`pb-3 text-sm ${activeTab === 'overview' ? 'border-b-2 border-brand-secondary text-brand-secondary' : 'text-gray-500 dark:text-gray-400'}`}>Overview</button>
                            <button onClick={() => setActiveTab('realtime')} className={`pb-3 text-sm ${activeTab === 'realtime' ? 'border-b-2 border-brand-secondary text-brand-secondary' : 'text-gray-500 dark:text-gray-400'}`}>Real-time</button>
                            <button onClick={() => setActiveTab('engagement')} className={`pb-3 text-sm ${activeTab === 'engagement' ? 'border-b-2 border-brand-secondary text-brand-secondary' : 'text-gray-500 dark:text-gray-400'}`}>Engagement</button>
                            <button onClick={() => setActiveTab('traffic')} className={`pb-3 text-sm ${activeTab === 'traffic' ? 'border-b-2 border-brand-secondary text-brand-secondary' : 'text-gray-500 dark:text-gray-400'}`}>Traffic Sources</button>
                        </nav>
                    </div>

                    <div className="mt-4">
                        {/* Error / Not configured */}
                        {gaError && (
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded mb-4">
                                <p className="text-sm text-yellow-800 dark:text-yellow-100">Google Analytics data could not be loaded: {gaError}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                                    Follow the setup guide: <a className="text-brand-secondary underline" href="/docs/GOOGLE_ANALYTICS_SETUP.md" target="_blank" rel="noreferrer">GA Setup Guide</a>
                                </p>
                            </div>
                        )}

                        {/* Loading skeleton */}
                        {gaLoading && !gaError && (
                            <div className="animate-pulse space-y-4">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                        )}

                        {/* Tabs content */}
                        {!gaLoading && !gaError && activeTab === 'overview' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Users</p>
                                        <p className="text-2xl font-bold">{overviewMetrics.totalUsers ?? '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
                                        <p className="text-2xl font-bold">{overviewMetrics.sessions ?? '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Page Views</p>
                                        <p className="text-2xl font-bold">{overviewMetrics.pageViews ?? '-'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg Session Duration</p>
                                        <p className="text-lg font-semibold">{overviewMetrics.avgSessionDuration ? `${Math.round(overviewMetrics.avgSessionDuration)}s` : '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</p>
                                        <p className="text-lg font-semibold">{overviewMetrics.bounceRate ? `${Math.round(overviewMetrics.bounceRate)}%` : '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow flex flex-col justify-between">
                                        <div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Export</p>
                                            <div className="mt-2">
                                                <button onClick={exportTrendCSV} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Export Trend CSV</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                        <h4 className="text-sm font-semibold mb-2">Daily Users Trend</h4>
                                        <LineChart data={(overviewMetrics.dailyTrend || []).map(d => ({ x: d.date, y: d.users }))} height={120} color="#10B981" />
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                        <h4 className="text-sm font-semibold mb-2">Daily Sessions Trend</h4>
                                        <LineChart data={(overviewMetrics.dailyTrend || []).map(d => ({ x: d.date, y: d.sessions }))} height={120} color="#3B82F6" />
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-3">Top Pages</h4>
                                    {overviewMetrics.topPages && overviewMetrics.topPages.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 dark:text-gray-300">
                                                        <th className="pb-2">Page</th>
                                                        <th className="pb-2">Views</th>
                                                        <th className="pb-2">Avg Time on Page</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {overviewMetrics.topPages.map(p => (
                                                        <tr key={p.path} className="border-t border-gray-100 dark:border-gray-700">
                                                            <td className="py-2 pr-4"><code className="text-xs text-gray-700 dark:text-gray-200">{p.path}</code></td>
                                                            <td className="py-2">{p.views}</td>
                                                            <td className="py-2">{p.avgTimeOnPage ? `${Math.round(p.avgTimeOnPage)}s` : '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No page data available.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {!gaLoading && !gaError && activeTab === 'realtime' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Users Right Now</p>
                                        <p className="text-3xl font-bold">{realtimeData.activeUsers ?? '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow md:col-span-2">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Active Pages</p>
                                        {realtimeData.topPages && realtimeData.topPages.length > 0 ? (
                                            <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-700">
                                                {realtimeData.topPages.map(p => (
                                                    <li key={p.path} className="py-2 flex justify-between">
                                                        <span className="text-sm text-gray-800 dark:text-white truncate pr-4">{p.path}</span>
                                                        <span className="text-sm font-semibold">{p.activeUsers}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No realtime page activity.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!gaLoading && !gaError && activeTab === 'engagement' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Events / Session</p>
                                        <p className="text-2xl font-bold">{engagementData.eventsPerSession ?? '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Engaged Sessions</p>
                                        <p className="text-2xl font-bold">{engagementData.engagedSessions ?? '-'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Export</p>
                                        <div className="mt-2">
                                            <button onClick={() => {
                                                // export events breakdown
                                                const rows = (engagementData.eventsBreakdown || []).map(e => ({ event: e.name, count: e.count }));
                                                const csv = toCSV(rows, ['event', 'count']);
                                                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                                const url = URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `ga_events_${dateRange.startDate}_${dateRange.endDate}.csv`;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                URL.revokeObjectURL(url);
                                            }} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Export CSV</button>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-3">Events Breakdown</h4>
                                    {(engagementData.eventsBreakdown && engagementData.eventsBreakdown.length > 0) ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {(engagementData.eventsBreakdown || []).map(e => (
                                                <div key={e.name} className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-700 dark:text-gray-200">{e.name}</span>
                                                        <span className="font-semibold">{e.count}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No engagement events found for this period.</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {!gaLoading && !gaError && activeTab === 'traffic' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <h4 className="text-sm font-semibold mb-2">Traffic by Source</h4>
                                        {(trafficData.bySource && trafficData.bySource.length > 0) ? (
                                            <ul>
                                                {trafficData.bySource.map(s => (
                                                    <li key={s.source} className="flex justify-between py-1">
                                                        <span className="text-sm text-gray-700 dark:text-gray-200">{s.source}</span>
                                                        <span className="font-medium">{s.sessions}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-500 dark:text-gray-400">No traffic source data</p>}
                                    </div>
                                    <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                        <h4 className="text-sm font-semibold mb-2">Geographic Distribution</h4>
                                        {(trafficData.byCountry && trafficData.byCountry.length > 0) ? (
                                            <ul>
                                                {trafficData.byCountry.map(c => (
                                                    <li key={c.country} className="flex justify-between py-1">
                                                        <span className="text-sm text-gray-700 dark:text-gray-200">{c.country}</span>
                                                        <span className="font-medium">{c.sessions}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : <p className="text-sm text-gray-500 dark:text-gray-400">No geographic data</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Internal analytics (existing features) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChart data={toolPopularity} title="Most Saved Tools" />
                <BarChart data={utilityUsage} title="Most Used Utilities" />
            </div>

            <div className="mt-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Top Users by Utility Usage</h3>
                {topUsers.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                        {topUsers.map(user => (
                            <li key={user.id} className="py-3 flex justify-between items-center">
                                <div className="flex items-center">
                                    <img className="h-10 w-10 rounded-full" src={user.profilePictureUrl || `https://i.pravatar.cc/150?u=${user.id}`} alt="" />
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-brand-secondary">{user.totalUsage} uses</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No utility usage data available yet.</p>
                )}
            </div>
        </div>
    );
};

export default AdminAnalyticsPage;