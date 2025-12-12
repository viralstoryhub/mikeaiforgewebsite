import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFavorites } from './useFavorites';
import { useUtilityHistory } from './useUtilityHistory';
import { UTILITIES_DATA } from '../constants';

export interface UtilityStats {
  utilityId: string;
  utilityName: string;
  utilitySlug: string;
  usageCount: number;
  historyCount: number;
  isFavorite: boolean;
  lastUsed?: number;
}

export interface AnalyticsData {
  // Overview Stats
  totalGenerations: number;
  totalHistoryItems: number;
  totalFavorites: number;
  
  // Usage Stats
  topUtilities: UtilityStats[];
  recentUtilities: UtilityStats[];
  mostUsedFavorite?: UtilityStats;
  
  // Time-based Stats
  generationsThisWeek: number;
  generationsThisMonth: number;
  
  // Tier & Limits
  subscriptionTier: 'Free' | 'Pro';
  remainingGenerations: number; // For Free users
  isNearLimit: boolean; // Free users approaching limit
  
  // Value Metrics
  estimatedTimeSaved: number; // in minutes
  estimatedTimeSavedFormatted: string;
}

const FREE_TIER_LIMIT = 3; // Per utility
const MINUTES_SAVED_PER_GENERATION = 15; // Conservative estimate

export const useAnalytics = (): AnalyticsData => {
  const { currentUser } = useAuth();
  const { favorites, favoritesCount } = useFavorites();
  const { history, getTotalHistoryCount } = useUtilityHistory();

  const analyticsData = useMemo((): AnalyticsData => {
    const totalHistoryItems = getTotalHistoryCount();
    
    // Calculate total generations from user's utilityUsage
    const utilityUsage = currentUser?.utilityUsage || {};
    const totalGenerations: number = Object.values(utilityUsage).reduce((sum: number, count: number) => sum + count, 0) as number;
    
    // Build utility stats for each utility
    const utilityStats: UtilityStats[] = UTILITIES_DATA.map(utility => {
      const usageCount = utilityUsage[utility.slug] || 0;
      const historyItems = history[utility.slug] || [];
      const historyCount = historyItems.length;
      const isFavorite = favorites.includes(utility.slug);
      const lastUsed = historyItems.length > 0 ? historyItems[0].timestamp : undefined;
      
      return {
        utilityId: utility.id,
        utilityName: utility.name,
        utilitySlug: utility.slug,
        usageCount,
        historyCount,
        isFavorite,
        lastUsed,
      };
    });
    
    // Sort by usage count to get top utilities
    const topUtilities = [...utilityStats]
      .filter(u => u.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
    
    // Sort by last used to get recent utilities
    const recentUtilities = [...utilityStats]
      .filter(u => u.lastUsed !== undefined)
      .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
      .slice(0, 5);
    
    // Find most used favorite
    const mostUsedFavorite = utilityStats
      .filter(u => u.isFavorite && u.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)[0];
    
    // Time-based calculations
    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
    
    let generationsThisWeek = 0;
    let generationsThisMonth = 0;
    
    Object.values(history).forEach((items: any) => {
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          if (item.timestamp >= oneWeekAgo) generationsThisWeek++;
          if (item.timestamp >= oneMonthAgo) generationsThisMonth++;
        });
      }
    });
    
    // Subscription tier and limits
    const subscriptionTier = currentUser?.subscriptionTier || 'Free';
    const isFreeUser = subscriptionTier === 'Free';
    
    // Calculate remaining generations (for Free users)
    let remainingGenerations: number = 0;
    if (isFreeUser) {
      // Find the utility with the most usage
      const usageValues = Object.values(utilityUsage) as number[];
      const maxUsage = usageValues.length > 0 ? Math.max(...usageValues) : 0;
      remainingGenerations = Math.max(0, FREE_TIER_LIMIT - maxUsage);
    } else {
      remainingGenerations = Infinity; // Pro users have unlimited
    }
    
    const isNearLimit = isFreeUser && remainingGenerations <= 1;
    
    // Calculate estimated time saved
    const estimatedTimeSaved = totalGenerations * MINUTES_SAVED_PER_GENERATION;
    const estimatedTimeSavedFormatted = formatTimeSaved(estimatedTimeSaved);
    
    return {
      totalGenerations,
      totalHistoryItems,
      totalFavorites: favoritesCount,
      topUtilities,
      recentUtilities,
      mostUsedFavorite,
      generationsThisWeek,
      generationsThisMonth,
      subscriptionTier,
      remainingGenerations,
      isNearLimit,
      estimatedTimeSaved,
      estimatedTimeSavedFormatted,
    };
  }, [currentUser, favorites, favoritesCount, history, getTotalHistoryCount]);
  
  return analyticsData;
};

function formatTimeSaved(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}