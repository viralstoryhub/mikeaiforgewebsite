import React, { useCallback, useEffect, useState } from 'react';
import GoogleAnalyticsWidget, { DateRange } from '../../components/admin/GoogleAnalyticsWidget';
import DateRangePicker from '../../components/admin/DateRangePicker';

import apiClient from '../../services/apiClient';

/**
 * Small inline LineChart for trends (simple SVG polyline).
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
 * Small BarChart for simple breakdowns.
 */
const MiniBarChart: React.FC<{ items: { label: string; value: number }[] }> = ({ items }) => {
    const max = Math.max(...items.map(i => i.value), 1);
    return (
        <div className="space-y-2">
            {items.map(it => (
                <div key={it.label}>
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="truncate pr-2">{it.label}</span>
                        <span className="font-bold">{it.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-brand-secondary h-2 rounded-full"
                            style={{ width: `${(it.value / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
};

type OverviewMetrics = {
    users?: number;
    sessions?: number;
    pageViews?: number;
    avgSessionDuration?: number;
    bounceRate?: number;
    dailyTrend?: { date: string; users: number; sessions: number }[];
    topPages?: { path: string; views: number; avgTimeOnPage?: number }[];
};

type RealtimeData = {
    activeUsers?: number;
    activePages?: { path: string; activeUsers: number }[];
    events?: { name: string; timestamp: string }[]; // simple event stream
};

type EngagementData = {
    eventsPerSession?: number;
    engagedSessions?: number;
    eventsBreakdown?: { name: string; count: number }[];
    sessionDurationBuckets?: { label: string; count: number }[];
};

type AcquisitionData = {
    bySource?: { source: string; sessions: number }[];
    byMedium?: { medium: string; sessions: number }[];
    campaigns?: { campaign: string; sessions: number }[];
};

const formatDate = (d: Date) => d.toISOString().slice(0, 10);

const defaultRange = (): DateRange => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);
    return { startDate: formatDate(start), endDate: formatDate(end) };
};

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
 * Admin Google Analytics Page
 */
const AdminGoogleAnalyticsPage: React.FC = () => {
    const [dateRange, setDateRange] = useState<DateRange>(defaultRange);
    const [activeTab, setActiveTab] = useState<'overview' | 'realtime' | 'engagement' | 'acquisition'>('overview');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [overview, setOverview] = useState<OverviewMetrics>({});
    const [realtime, setRealtime] = useState<RealtimeData>({});
    const [engagement, setEngagement] = useState<EngagementData>({});
    const [acquisition, setAcquisition] = useState<AcquisitionData>({});

    // Generic fetcher for GA Data endpoint with type param
    const fetchGAData = useCallback(async (type: string, range: DateRange) => {
        setLoading(true);
        setError(null);
        try {
            const res = await apiClient.get('/analytics/google-analytics', {
                params: {
                    startDate: range.startDate,
                    endDate: range.endDate,
                    type,
                },
            });
            const json = res?.data?.data ?? res?.data ?? {};

            if (type === 'overview') {
                setOverview({
                    users: json.totalUsers ?? json.users,
                    sessions: json.sessions,
                    pageViews: json.pageViews ?? json.screenPageViews,
                    avgSessionDuration: json.avgSessionDuration,
                    bounceRate: json.bounceRate,
                    dailyTrend: json.dailyTrend || [],
                    topPages: json.topPages || [],
                });
            } else if (type === 'realtime') {
                setRealtime({
                    activeUsers: json.activeUsers ?? json.active,
                    activePages: json.activePages || json.topPages || [],
                    events: json.events || [],
                });
            } else if (type === 'engagement') {
                setEngagement({
                    eventsPerSession: json.eventsPerSession,
                    engagedSessions: json.engagedSessions,
                    eventsBreakdown: json.eventsBreakdown || [],
                    sessionDurationBuckets: json.sessionDurationBuckets || [],
                });
            } else if (type === 'acquisition') {
                setAcquisition({
                    bySource: json.bySource || [],
                    byMedium: json.byMedium || [],
                    campaigns: json.campaigns || [],
                });
            }
        } catch (err: any) {
            console.error('GA fetch error', err);
            setError(err?.message || 'Failed to load Google Analytics data. Ensure credentials and property are configured.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data for active tab when dateRange or activeTab changes
    useEffect(() => {
        fetchGAData(activeTab, dateRange);
    }, [activeTab, dateRange, fetchGAData]);

    // Realtime polling when realtime tab active
    useEffect(() => {
        let intervalId: number | undefined;
        if (activeTab === 'realtime') {
            // initial fetch already happens in effect above, but fetch once more to ensure fresh
            fetchGAData('realtime', dateRange);
            intervalId = window.setInterval(() => {
                fetchGAData('realtime', dateRange);
            }, 30 * 1000); // 30 seconds
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [activeTab, dateRange, fetchGAData]);

    const handleRefresh = () => {
        fetchGAData(activeTab, dateRange);
    };

    // Export helpers
    const exportOverviewTopPagesCSV = () => {
        const rows = (overview.topPages || []).map(p => ({
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
        const rows = (overview.dailyTrend || []).map(d => ({
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

    const exportEngagementCSV = () => {
        const rows = (engagement.eventsBreakdown || []).map(e => ({ event: e.name, count: e.count }));
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
    };

    const exportAcquisitionCSV = () => {
        const rows = (acquisition.bySource || []).map(s => ({ source: s.source, sessions: s.sessions }));
        const csv = toCSV(rows, ['source', 'sessions']);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ga_sources_${dateRange.startDate}_${dateRange.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="animate-fade-in-up">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Google Analytics</h1>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        View your GA4 property data in the admin dashboard. Requires backend GA Data API credentials.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <DateRangePicker value={dateRange} onChange={(r) => setDateRange(r)} />
                    <div className="flex items-center space-x-2">
                        <button onClick={handleRefresh} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Refresh</button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Google Analytics Dashboard</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Switch between Overview, Real-time, Engagement and Acquisition views.</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button onClick={() => setActiveTab('overview')} className={`px-3 py-1 rounded ${activeTab === 'overview' ? 'bg-brand-secondary text-white' : 'bg-gray-100 dark:bg-gray-700 text-sm'}`}>Overview</button>
                        <button onClick={() => setActiveTab('realtime')} className={`px-3 py-1 rounded ${activeTab === 'realtime' ? 'bg-brand-secondary text-white' : 'bg-gray-100 dark:bg-gray-700 text-sm'}`}>Real-time</button>
                        <button onClick={() => setActiveTab('engagement')} className={`px-3 py-1 rounded ${activeTab === 'engagement' ? 'bg-brand-secondary text-white' : 'bg-gray-100 dark:bg-gray-700 text-sm'}`}>Engagement</button>
                        <button onClick={() => setActiveTab('acquisition')} className={`px-3 py-1 rounded ${activeTab === 'acquisition' ? 'bg-brand-secondary text-white' : 'bg-gray-100 dark:bg-gray-700 text-sm'}`}>Acquisition</button>
                    </div>
                </div>

                <div className="mt-4">
                    {error && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded mb-4">
                            <p className="text-sm text-yellow-800 dark:text-yellow-100">Google Analytics data could not be loaded: {error}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
                                Follow the setup guide: <a className="text-brand-secondary underline" href="/docs/GOOGLE_ANALYTICS_SETUP.md" target="_blank" rel="noreferrer">GA Setup Guide</a>
                            </p>
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {loading && !error && (
                        <div className="animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            </div>
                            <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    )}

                    {/* Overview */}
                    {!loading && !error && activeTab === 'overview' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Users</p>
                                    <p className="text-2xl font-bold">{overview.users ?? '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Sessions</p>
                                    <p className="text-2xl font-bold">{overview.sessions ?? '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Page Views</p>
                                    <p className="text-2xl font-bold">{overview.pageViews ?? '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Avg Session Duration</p>
                                    <p className="text-lg font-semibold">{overview.avgSessionDuration ? `${Math.round(overview.avgSessionDuration)}s` : '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</p>
                                    <p className="text-lg font-semibold">{overview.bounceRate ? `${Math.round(overview.bounceRate)}%` : '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Export</p>
                                        <div className="mt-2 flex space-x-2">
                                            <button onClick={exportOverviewTopPagesCSV} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Top Pages CSV</button>
                                            <button onClick={exportTrendCSV} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Trend CSV</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-2">Daily Users Trend</h4>
                                    <LineChart data={(overview.dailyTrend || []).map(d => ({ x: d.date, y: d.users }))} height={140} color="#10B981" />
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-2">Daily Sessions Trend</h4>
                                    <LineChart data={(overview.dailyTrend || []).map(d => ({ x: d.date, y: d.sessions }))} height={140} color="#3B82F6" />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                <h4 className="text-sm font-semibold mb-3">Top Pages</h4>
                                {(overview.topPages && overview.topPages.length > 0) ? (
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
                                                {overview.topPages!.map(p => (
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
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No page data available for this period.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Realtime */}
                    {!loading && !error && activeTab === 'realtime' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-900 p-6 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Users Right Now</p>
                                    <p className="text-4xl font-bold">{realtime.activeUsers ?? '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow md:col-span-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Pages</p>
                                    {(realtime.activePages && realtime.activePages.length > 0) ? (
                                        <ul className="mt-2 divide-y divide-gray-100 dark:divide-gray-700">
                                            {realtime.activePages.map(p => (
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

                            <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                <h4 className="text-sm font-semibold mb-2">Realtime Events Stream</h4>
                                {(realtime.events && realtime.events.length > 0) ? (
                                    <ul className="divide-y divide-gray-100 dark:divide-gray-700 max-h-40 overflow-y-auto">
                                        {realtime.events.map((e, idx) => (
                                            <li key={`${e.name}-${idx}`} className="py-2">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{e.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(e.timestamp).toLocaleString()}</p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No realtime events available.</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Engagement */}
                    {!loading && !error && activeTab === 'engagement' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Events / Session</p>
                                    <p className="text-2xl font-bold">{engagement.eventsPerSession ?? '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Engaged Sessions</p>
                                    <p className="text-2xl font-bold">{engagement.engagedSessions ?? '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Export</p>
                                        <div className="mt-2">
                                            <button onClick={exportEngagementCSV} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Export CSV</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-3">Events Breakdown</h4>
                                    {(engagement.eventsBreakdown && engagement.eventsBreakdown.length > 0) ? (
                                        <MiniBarChart items={(engagement.eventsBreakdown || []).map(e => ({ label: e.name, value: e.count }))} />
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No engagement events found for this period.</p>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-3">Session Duration Distribution</h4>
                                    {(engagement.sessionDurationBuckets && engagement.sessionDurationBuckets.length > 0) ? (
                                        <MiniBarChart items={(engagement.sessionDurationBuckets || []).map(b => ({ label: b.label, value: b.count }))} />
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No session duration data available.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Acquisition */}
                    {!loading && !error && activeTab === 'acquisition' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Top Sources</p>
                                    <p className="text-2xl font-bold">{(acquisition.bySource && acquisition.bySource.length) ? acquisition.bySource[0].source : '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Top Medium</p>
                                    <p className="text-2xl font-bold">{(acquisition.byMedium && acquisition.byMedium.length) ? acquisition.byMedium[0].medium : '-'}</p>
                                </div>
                                <div className="bg-white dark:bg-gray-900 p-4 rounded shadow flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">Export</p>
                                        <div className="mt-2">
                                            <button onClick={exportAcquisitionCSV} className="px-3 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm">Export CSV</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-3">Traffic by Source</h4>
                                    {(acquisition.bySource && acquisition.bySource.length > 0) ? (
                                        <MiniBarChart items={(acquisition.bySource || []).map(s => ({ label: s.source, value: s.sessions }))} />
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No source data available.</p>
                                    )}
                                </div>

                                <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
                                    <h4 className="text-sm font-semibold mb-3">Campaign Performance</h4>
                                    {(acquisition.campaigns && acquisition.campaigns.length > 0) ? (
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead>
                                                    <tr className="text-left text-gray-500 dark:text-gray-300">
                                                        <th className="pb-2">Campaign</th>
                                                        <th className="pb-2">Sessions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {acquisition.campaigns!.map(c => (
                                                        <tr key={c.campaign} className="border-t border-gray-100 dark:border-gray-700">
                                                            <td className="py-2 pr-4"><span className="text-sm text-gray-700 dark:text-gray-200">{c.campaign}</span></td>
                                                            <td className="py-2">{c.sessions}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">No campaign data available.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Reusable metric widgets (keeps compatibility with existing components) */}
            <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <GoogleAnalyticsWidget metric="activeUsers" dateRange={dateRange} chartType="line" title="Active Users" />
                <GoogleAnalyticsWidget metric="sessions" dateRange={dateRange} chartType="line" title="Sessions" />
                <GoogleAnalyticsWidget metric="screenPageViews" dateRange={dateRange} chartType="line" title="Page Views" />
            </div>
        </div>
    );
};

export default AdminGoogleAnalyticsPage;