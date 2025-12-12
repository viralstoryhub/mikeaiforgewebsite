import React from 'react';
import { Link } from 'react-router-dom';
import { useAnalytics } from '../hooks/useAnalytics';
import { useAuth } from '../contexts/AuthContext';
import { 
  ChartBarIcon, 
  StarIcon, 
  ClockIcon, 
  LightningIcon,
  TrendingUpIcon,
  FireIcon
} from '../components/icons/UtilityIcons';

const AnalyticsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const analytics = useAnalytics();

  if (!currentUser) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-light-primary mb-4">Analytics Dashboard</h1>
          <p className="text-light-secondary mb-6">Sign in to view your usage statistics</p>
          <Link
            to="/login"
            className="inline-block bg-brand-primary text-white px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const isPro = analytics.subscriptionTier === 'Pro';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in-up">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-light-primary mb-2">Analytics Dashboard</h1>
        <p className="text-light-secondary">Track your productivity and usage insights</p>
      </div>

      {/* Limit Warning Banner (Free Users Only) */}
      {!isPro && analytics.isNearLimit && (
        <div className="mb-6 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4 flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-yellow-200 font-semibold mb-1">Approaching Usage Limit</h3>
            <p className="text-yellow-100 text-sm mb-3">
              You have {analytics.remainingGenerations} generation{analytics.remainingGenerations !== 1 ? 's' : ''} remaining. Upgrade to Pro for unlimited access!
            </p>
            <Link
              to="/dashboard"
              className="inline-block bg-brand-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Generations */}
        <div className="bg-dark-secondary rounded-lg border border-border-dark p-6 hover:border-brand-primary/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
              <LightningIcon className="w-6 h-6 text-brand-primary" />
            </div>
            {!isPro && (
              <span className="text-xs text-gray-400">
                {analytics.remainingGenerations === Infinity ? '∞' : analytics.remainingGenerations} left
              </span>
            )}
          </div>
          <h3 className="text-2xl font-bold text-light-primary mb-1">{analytics.totalGenerations}</h3>
          <p className="text-sm text-light-secondary">Total Generations</p>
          <p className="text-xs text-gray-500 mt-2">All-time usage</p>
        </div>

        {/* Time Saved */}
        <div className="bg-dark-secondary rounded-lg border border-border-dark p-6 hover:border-green-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-light-primary mb-1">{analytics.estimatedTimeSavedFormatted}</h3>
          <p className="text-sm text-light-secondary">Time Saved</p>
          <p className="text-xs text-gray-500 mt-2">~15 min per generation</p>
        </div>

        {/* Favorites */}
        <div className="bg-dark-secondary rounded-lg border border-border-dark p-6 hover:border-yellow-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <StarIcon className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-light-primary mb-1">{analytics.totalFavorites}</h3>
          <p className="text-sm text-light-secondary">Favorite Utilities</p>
          <p className="text-xs text-gray-500 mt-2">Quick access tools</p>
        </div>

        {/* History Items */}
        <div className="bg-dark-secondary rounded-lg border border-border-dark p-6 hover:border-blue-500/50 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-light-primary mb-1">{analytics.totalHistoryItems}</h3>
          <p className="text-sm text-light-secondary">Saved Results</p>
          <p className="text-xs text-gray-500 mt-2">In history panel</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Utilities */}
        <div className="bg-dark-secondary rounded-lg border border-border-dark">
          <div className="p-4 border-b border-border-dark flex items-center space-x-3">
            <FireIcon className="w-6 h-6 text-orange-500" />
            <h3 className="text-lg font-bold text-light-primary">Top 5 Utilities</h3>
          </div>
          <div className="p-6">
            {analytics.topUtilities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-light-secondary mb-4">No usage data yet</p>
                <Link
                  to="/utilities"
                  className="inline-block text-brand-primary hover:underline text-sm"
                >
                  Explore Utilities →
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {analytics.topUtilities.map((utility, index) => {
                  const percentage = analytics.totalGenerations > 0
                    ? (utility.usageCount / analytics.totalGenerations) * 100
                    : 0;
                  
                  return (
                    <div key={utility.utilitySlug}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-500 font-mono text-sm">#{index + 1}</span>
                          <span className="text-sm font-medium text-light-primary">
                            {utility.utilityName}
                          </span>
                          {utility.isFavorite && (
                            <StarIcon className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        <span className="text-sm font-semibold text-brand-primary">
                          {utility.usageCount}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-brand-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Usage Trends */}
        <div className="bg-dark-secondary rounded-lg border border-border-dark">
          <div className="p-4 border-b border-border-dark flex items-center space-x-3">
            <TrendingUpIcon className="w-6 h-6 text-brand-primary" />
            <h3 className="text-lg font-bold text-light-primary">Usage Trends</h3>
          </div>
          <div className="p-6 space-y-6">
            {/* This Week */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-light-secondary">This Week</span>
                <span className="text-2xl font-bold text-brand-primary">
                  {analytics.generationsThisWeek}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-brand-primary to-purple-500 h-3 rounded-full"
                  style={{
                    width: analytics.totalGenerations > 0
                      ? `${Math.min((analytics.generationsThisWeek / analytics.totalGenerations) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
            </div>

            {/* This Month */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-light-secondary">This Month</span>
                <span className="text-2xl font-bold text-green-500">
                  {analytics.generationsThisMonth}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                  style={{
                    width: analytics.totalGenerations > 0
                      ? `${Math.min((analytics.generationsThisMonth / analytics.totalGenerations) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>

            {/* Most Used Favorite */}
            {analytics.mostUsedFavorite && (
              <div className="pt-4 border-t border-border-dark">
                <p className="text-xs text-gray-400 mb-2">⭐ Most Used Favorite</p>
                <Link
                  to={`/utilities/${analytics.mostUsedFavorite.utilitySlug}`}
                  className="flex items-center justify-between p-3 bg-dark-primary rounded-lg hover:bg-dark-primary/70 transition-colors group"
                >
                  <span className="text-sm font-medium text-light-primary group-hover:text-brand-primary">
                    {analytics.mostUsedFavorite.utilityName}
                  </span>
                  <span className="text-sm font-bold text-brand-primary">
                    {analytics.mostUsedFavorite.usageCount}
                  </span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Membership Status Card */}
      <div className="bg-gradient-to-r from-dark-secondary to-dark-primary rounded-lg border border-border-dark p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-light-primary mb-2">
              {isPro ? '🎉 Pro Member' : '📊 Free Tier'}
            </h3>
            {isPro ? (
              <p className="text-light-secondary">
                You have unlimited access to all utilities and features!
              </p>
            ) : (
              <div>
                <p className="text-light-secondary mb-3">
                  You're currently on the Free plan with {analytics.remainingGenerations === Infinity ? 'unlimited' : `${analytics.remainingGenerations} generation${analytics.remainingGenerations !== 1 ? 's' : ''} remaining`}.
                </p>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center bg-brand-primary text-white px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Upgrade to Pro
                </Link>
              </div>
            )}
          </div>
          {isPro && (
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to="/utilities"
          className="flex items-center space-x-3 p-4 bg-dark-secondary border border-border-dark rounded-lg hover:border-brand-primary/50 transition-colors group"
        >
          <div className="w-10 h-10 bg-brand-primary/20 rounded-lg flex items-center justify-center">
            <LightningIcon className="w-5 h-5 text-brand-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-light-primary group-hover:text-brand-primary">
              Explore Utilities
            </h4>
            <p className="text-xs text-gray-500">Find new tools to try</p>
          </div>
        </Link>

        <Link
          to="/dashboard"
          className="flex items-center space-x-3 p-4 bg-dark-secondary border border-border-dark rounded-lg hover:border-brand-primary/50 transition-colors group"
        >
          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-light-primary group-hover:text-brand-primary">
              My Dashboard
            </h4>
            <p className="text-xs text-gray-500">Manage your account</p>
          </div>
        </Link>

        <Link
          to="/workflows"
          className="flex items-center space-x-3 p-4 bg-dark-secondary border border-border-dark rounded-lg hover:border-brand-primary/50 transition-colors group"
        >
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-light-primary group-hover:text-brand-primary">
              Workflows
            </h4>
            <p className="text-xs text-gray-500">Automate your tasks</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AnalyticsPage;