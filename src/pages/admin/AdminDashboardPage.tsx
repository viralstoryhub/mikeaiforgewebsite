import React, { useEffect, useState, useMemo, useCallback } from 'react';
import * as authService from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { useData } from '../../contexts/DataContext';
import { User } from '../../types';
import StatCard from '../../components/admin/StatCard';
import { UTILITIES_DATA } from '../../constants';
import UserSignupChart from '../../components/admin/UserSignupChart';

type DashboardStats = {
    totalUsers?: number;
    proUsers?: number;
    freeUsers?: number;
    totalTools?: number;
    totalWorkflows?: number;
    totalNewsArticles?: number;
    totalForumPosts?: number;
    totalUtilityUsage?: number;
    avgUsagePerUser?: number;
    mrr?: number;
    totalRevenue?: number;
    newUsersThisWeek?: number;
    newUsersThisMonth?: number;
    [key: string]: any;
};

type AuditLogEntry = {
    id: string;
    userId?: string | null;
    userName?: string | null;
    userAvatar?: string | null;
    action: string;
    resource?: string | null;
    details?: string | null;
    createdAt: string;
    [key: string]: any;
};

type SystemHealth = {
    database?: { status: 'connected' | 'disconnected' | 'unknown'; latencyMs?: number };
    api?: { avgResponseTimeMs?: number; errorRatePercent?: number };
    uptimeSeconds?: number;
    lastUpdated?: string;
    [key: string]: any;
};

const AdminDashboardPage: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const { tools, workflows, loading: loadingContent } = useData();

    // New states for enhanced dashboard
    const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState<string | null>(null);

    const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [activityError, setActivityError] = useState<string | null>(null);

    const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
    const [healthLoading, setHealthLoading] = useState(false);
    const [healthError, setHealthError] = useState<string | null>(null);

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

    // Fetch dashboard stats
    const fetchDashboardStats = useCallback(async () => {
        setStatsLoading(true);
        setStatsError(null);
        try {
            const res = await apiClient.get('/admin/stats');
            const payload = res?.data?.data ?? res?.data ?? {};
            const stats = payload?.stats ?? payload ?? null;
            setDashboardStats(stats);
        } catch (err: any) {
            console.error('Failed to fetch dashboard stats:', err);
            setStatsError('Unable to load dashboard statistics. Check backend or try again.');
            setDashboardStats(null);
        } finally {
            setStatsLoading(false);
        }
    }, []);

    // Fetch recent activity (audit logs)
    const fetchRecentActivity = useCallback(async () => {
        setActivityLoading(true);
        setActivityError(null);
        try {
            const res = await apiClient.get('/admin/audit-logs', { params: { limit: 10 } });
            const payload = res?.data?.data ?? res?.data ?? {};
            const entries: AuditLogEntry[] = payload?.logs ?? payload ?? [];
            setRecentActivity(Array.isArray(entries) ? entries : []);
        } catch (err: any) {
            console.error('Failed to fetch recent activity:', err);
            setActivityError('Unable to load recent activity.');
            setRecentActivity([]);
        } finally {
            setActivityLoading(false);
        }
    }, []);

    // Fetch system health
    const fetchSystemHealth = useCallback(async () => {
        setHealthLoading(true);
        setHealthError(null);
        try {
            const res = await apiClient.get('/admin/system-health');
            const payload = res?.data?.data ?? res?.data ?? {};
            const health: SystemHealth = payload?.health ?? payload ?? {};
            health.lastUpdated = new Date().toISOString();
            setSystemHealth(health);
        } catch (err: any) {
            console.error('Failed to fetch system health:', err);
            setHealthError('Unable to load system health metrics.');
            setSystemHealth(null);
        } finally {
            setHealthLoading(false);
        }
    }, []);

    useEffect(() => {
        // Load stats, recent activity, and system health after initial render.
        fetchDashboardStats();
        fetchRecentActivity();
        fetchSystemHealth();

        // Optionally poll system health every 60s
        const interval = setInterval(() => {
            fetchSystemHealth();
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchDashboardStats, fetchRecentActivity, fetchSystemHealth]);

    const safeUsers = Array.isArray(users) ? users : [];
    const proUsers = safeUsers.filter(u => (u.subscriptionTier ?? '').toString().toLowerCase() === 'pro').length;
    const freeUsers = safeUsers.length - proUsers;
    const proPercentage = safeUsers.length > 0 ? (proUsers / safeUsers.length) * 100 : 0;

    const totalUtilityUsage = safeUsers.reduce((total, user) => {
        if (!user.utilityUsage) return total;
        // Fix: Explicitly type reduce accumulators and values as numbers to prevent 'unknown' type errors.
        return total + Object.values(user.utilityUsage).reduce((sum: number, count: number) => sum + count, 0);
    }, 0);

    const utilityUsageCounts = useMemo(() => {
        return UTILITIES_DATA.map(utility => {
            const count = safeUsers.reduce((total, user) => {
                return total + (user.utilityUsage?.[utility.slug] || 0);
            }, 0);
            return { name: utility.name, count };
        }).sort((a, b) => b.count - a.count);
    }, [users]);

    const maxUsage = useMemo(() => Math.max(...utilityUsageCounts.map(u => u.count), 0), [utilityUsageCounts]);

    // Helpers
    const formatCurrency = (num?: number | null) => {
        if (num == null || Number.isNaN(num)) return '—';
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
    };

    const formatNumber = (num?: number | null) => {
        if (num == null || Number.isNaN(num)) return '—';
        return new Intl.NumberFormat().format(num);
    };

    const timeAgo = (dateStr?: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
        if (diffSec < 60) return `${diffSec}s ago`;
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return `${Math.floor(diffSec / 86400)}d ago`;
    };

    const statusColor = (status?: string) => {
        if (!status) return 'bg-gray-300';
        if (status === 'connected' || status === 'healthy' || status === 'ok') return 'bg-green-500';
        if (status === 'degraded' || status === 'warning') return 'bg-yellow-400';
        return 'bg-red-500';
    };

    // Group recentActivity by day label (Today, Yesterday, Date)
    const groupedActivity = useMemo(() => {
        const groups: Record<string, AuditLogEntry[]> = {};
        const getLabel = (iso?: string) => {
            if (!iso) return 'Unknown';
            const d = new Date(iso);
            const today = new Date();
            const diff = Math.floor((today.setHours(0, 0, 0, 0) - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
            if (diff === 0) return 'Today';
            if (diff === 1) return 'Yesterday';
            const label = d.toLocaleDateString();
            return label;
        };
        for (const entry of recentActivity) {
            const label = getLabel(entry.createdAt);
            if (!groups[label]) groups[label] = [];
            groups[label].push(entry);
        }
        // Keep order: Today, Yesterday, others by date desc
        const orderedKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'Today') return -1;
            if (b === 'Today') return 1;
            if (a === 'Yesterday') return -1;
            if (b === 'Yesterday') return 1;
            return new Date(groups[b][0].createdAt).getTime() - new Date(groups[a][0].createdAt).getTime();
        });
        const ordered: Record<string, AuditLogEntry[]> = {};
        orderedKeys.forEach(k => ordered[k] = groups[k]);
        return ordered;
    }, [recentActivity]);

    // SKELETON helpers
    const ActivitySkeleton = () => (
        <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="py-3 flex items-start space-x-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );

    // Independent loading indicator for main view: show minimal while users/content are loading
    if (loadingUsers || loadingContent) {
        return <div>Loading dashboard data...</div>;
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => { fetchDashboardStats(); fetchRecentActivity(); fetchSystemHealth(); }}
                        className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                        aria-label="Refresh dashboard"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <StatCard title="Total Users" value={dashboardStats?.totalUsers ?? safeUsers.length} />
                <StatCard title="Pro Subscribers" value={dashboardStats?.proUsers ?? proUsers} />
                <StatCard title="Total Tools" value={dashboardStats?.totalTools ?? tools.length} />
                <StatCard title="Total Workflows" value={dashboardStats?.totalWorkflows ?? workflows.length} />
            </div>

            {/* Quick Actions Widget */}
            <div className="mt-6 bg-gradient-to-r from-purple-600/10 to-brand-primary/10 border border-purple-500/20 p-6 rounded-lg shadow">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Quick Actions
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <a href="#/admin/users" className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md group">
                        <svg className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Manage Users</span>
                    </a>
                    <a href="#/admin/tools" className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md group">
                        <svg className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Add Tool</span>
                    </a>
                    <a href="#/admin/workflows" className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md group">
                        <svg className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Add Workflow</span>
                    </a>
                    <a href="#/admin/news" className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md group">
                        <svg className="w-8 h-8 text-orange-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Post News</span>
                    </a>
                    <a href="#/admin/forum" className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md group">
                        <svg className="w-8 h-8 text-cyan-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Moderate Forum</span>
                    </a>
                    <a href="#/admin/analytics" className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition shadow-sm hover:shadow-md group">
                        <svg className="w-8 h-8 text-pink-500 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        <span className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">View Analytics</span>
                    </a>
                </div>
            </div>

            {/* Additional stat cards: Revenue, Engagement, Content, Growth */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue (MRR)</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white" title={dashboardStats?.mrr != null ? String(dashboardStats.mrr) : undefined}>
                        {dashboardStats?.mrr != null ? formatCurrency(dashboardStats.mrr) : '—'}
                    </p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total Revenue: {dashboardStats?.totalRevenue != null ? formatCurrency(dashboardStats.totalRevenue) : '—'}</p>
                    {statsLoading && <p className="text-xs text-gray-400 mt-2">Loading revenue...</p>}
                    {statsError && <p className="text-xs text-red-500 mt-2">{statsError}</p>}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Engagement</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats?.totalUtilityUsage ?? totalUtilityUsage}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Avg per user: {dashboardStats?.avgUsagePerUser != null ? formatNumber(dashboardStats.avgUsagePerUser) : (safeUsers.length ? Math.round(totalUtilityUsage / safeUsers.length) : '—')}</p>
                    <p className="mt-2 text-xs text-gray-400">Shows total usage of utilities across all users. Hover bars below to see details.</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Content</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats?.totalForumPosts ?? '—'}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">News articles: {dashboardStats?.totalNewsArticles ?? '—'}</p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Growth</h3>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{dashboardStats?.newUsersThisWeek ?? '—'}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">New this month: {dashboardStats?.newUsersThisMonth ?? '—'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Signups Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Recent Signups</h2>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{statsLoading ? 'Refreshing...' : 'Last 30 days'}</div>
                    </div>
                    <div className="h-64" title="User signup trends (hover to see details)">
                        <UserSignupChart users={safeUsers} />
                    </div>
                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Tip: Hover chart points to see daily signup counts.</p>
                </div>

                {/* Subscription Tiers */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Subscription Tiers</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span>Pro Subscribers</span>
                            <span className="font-bold">{dashboardStats?.proUsers ?? proUsers}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Free Users</span>
                            <span className="font-bold">{dashboardStats?.freeUsers ?? freeUsers}</span>
                        </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mt-4 overflow-hidden" aria-hidden>
                        <div
                            className="bg-green-500 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${proPercentage}%` }}
                            title={`Pro Users: ${proPercentage.toFixed(1)}%`}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Utility Usage</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Total uses across all users: <strong>{dashboardStats?.totalUtilityUsage ?? totalUtilityUsage}</strong></p>
                <div className="space-y-3">
                    {utilityUsageCounts.map(utility => (
                        <div key={utility.name}>
                            <div className="flex justify-between text-sm mb-1">
                                <span className="truncate max-w-[70%]" title={utility.name}>{utility.name}</span>
                                <span className="font-medium">{utility.count}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5" aria-hidden>
                                <div
                                    className="bg-brand-secondary h-2.5 rounded-full transition-all duration-500"
                                    style={{ width: maxUsage > 0 ? `${(utility.count / maxUsage) * 100}%` : '0%' }}
                                    title={`${utility.count} uses`}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Activity + System Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                {/* Recent Activity Feed */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Recent Activity</h2>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={fetchRecentActivity}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                                aria-label="Refresh recent activity"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {activityLoading && <div className="text-sm text-gray-500"><ActivitySkeleton /></div>}
                    {activityError && <div className="text-sm text-red-500">{activityError}</div>}

                    {!activityLoading && recentActivity.length === 0 && !activityError && (
                        <div className="text-sm text-gray-500">No recent activity</div>
                    )}

                    {!activityLoading && recentActivity.length > 0 && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {Object.keys(groupedActivity).map(groupLabel => (
                                <div key={groupLabel} className="py-2">
                                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">{groupLabel}</div>
                                    <div className="space-y-2">
                                        {groupedActivity[groupLabel].map((entry) => (
                                            <div key={entry.id} className="py-3 flex items-start space-x-3">
                                                <img
                                                    src={entry.userAvatar ? entry.userAvatar : `https://i.pravatar.cc/40?u=${entry.userId ?? entry.id}`}
                                                    alt={entry.userName ?? 'User avatar'}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = `https://i.pravatar.cc/40?u=${entry.userId ?? entry.id}`; }}
                                                />
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-sm">
                                                                <span className="font-medium">{entry.userName ?? 'Unknown User'}</span>
                                                                <span className="text-gray-500 dark:text-gray-400"> — {entry.action}</span>
                                                            </p>
                                                            {entry.details && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{entry.details}</p>}
                                                        </div>
                                                        <div className="text-xs text-gray-400">{timeAgo(entry.createdAt)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Health Card */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">System Health</h2>
                        <div>
                            <button
                                onClick={fetchSystemHealth}
                                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-sm"
                                aria-label="Refresh system health"
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {healthLoading && <div className="text-sm text-gray-500">Checking system...</div>}
                    {healthError && <div className="text-sm text-red-500 mb-2">{healthError}</div>}

                    {!systemHealth && !healthLoading && !healthError && (
                        <div className="text-sm text-gray-500">No health data available.</div>
                    )}

                    {systemHealth && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className={`inline-block w-3 h-3 rounded-full ${statusColor(systemHealth.database?.status)}`} />
                                    <div>
                                        <div className="text-sm font-medium">Database</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{systemHealth.database?.status ?? 'unknown'}</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">{systemHealth.database?.latencyMs ? `${systemHealth.database.latencyMs} ms` : '—'}</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className="inline-block w-3 h-3 rounded-full bg-blue-400" />
                                    <div>
                                        <div className="text-sm font-medium">API Response Time</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Average</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">{systemHealth.api?.avgResponseTimeMs ? `${Math.round(systemHealth.api.avgResponseTimeMs)} ms` : '—'}</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <span className="inline-block w-3 h-3 rounded-full bg-red-400" />
                                    <div>
                                        <div className="text-sm font-medium">Error Rate</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Last minute</div>
                                    </div>
                                </div>
                                <div className="text-sm text-gray-500">{systemHealth.api?.errorRatePercent != null ? `${systemHealth.api.errorRatePercent}%` : '—'}</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium">Uptime</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">{systemHealth.uptimeSeconds ? `${Math.floor(systemHealth.uptimeSeconds / 3600)}h ${Math.floor((systemHealth.uptimeSeconds % 3600) / 60)}m` : '—'}</div>
                                </div>
                                <div className="text-xs text-gray-400">{systemHealth.lastUpdated ? new Date(systemHealth.lastUpdated).toLocaleString() : ''}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardPage;