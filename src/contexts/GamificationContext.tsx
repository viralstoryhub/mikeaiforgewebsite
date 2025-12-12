import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// =====================================================
// GAMIFICATION SYSTEM - XP, Levels, Badges, Streaks
// =====================================================

// Level thresholds and names
export const LEVELS = [
    { level: 1, name: 'AI Curious', xpRequired: 0, icon: '🌱' },
    { level: 2, name: 'AI Explorer', xpRequired: 100, icon: '🔍' },
    { level: 3, name: 'AI Apprentice', xpRequired: 300, icon: '📚' },
    { level: 4, name: 'AI Builder', xpRequired: 600, icon: '🔧' },
    { level: 5, name: 'AI Creator', xpRequired: 1000, icon: '✨' },
    { level: 6, name: 'AI Innovator', xpRequired: 1500, icon: '💡' },
    { level: 7, name: 'AI Expert', xpRequired: 2500, icon: '🎯' },
    { level: 8, name: 'AI Master', xpRequired: 4000, icon: '🏆' },
    { level: 9, name: 'AI Sage', xpRequired: 6000, icon: '🧙' },
    { level: 10, name: 'AI Legend', xpRequired: 10000, icon: '👑' },
];

// XP rewards for actions
export const XP_REWARDS = {
    UTILITY_USE: 10,
    TOOL_REVIEW_READ: 5,
    WORKFLOW_DEPLOY: 25,
    FORUM_POST: 15,
    FORUM_REPLY: 10,
    DAILY_LOGIN: 20,
    COMPLETE_QUIZ: 50,
    SHARE_CONTENT: 15,
    FIRST_UTILITY: 50,
    STREAK_BONUS: 10, // per day of streak
};

// Badge definitions
export const BADGES = [
    { id: 'first_utility', name: 'First Steps', description: 'Use your first utility', icon: '🎉', xpBonus: 50 },
    { id: 'utility_master', name: 'Utility Master', description: 'Use 10 different utilities', icon: '⚡', xpBonus: 100 },
    { id: 'workflow_wizard', name: 'Workflow Wizard', description: 'Deploy 5 workflows', icon: '🔮', xpBonus: 150 },
    { id: 'forum_contributor', name: 'Forum Contributor', description: 'Make 10 forum posts', icon: '💬', xpBonus: 100 },
    { id: 'streak_week', name: 'Week Warrior', description: 'Login 7 days in a row', icon: '🔥', xpBonus: 100 },
    { id: 'streak_month', name: 'Monthly Master', description: 'Login 30 days in a row', icon: '⭐', xpBonus: 500 },
    { id: 'ai_scholar', name: 'AI Scholar', description: 'Read 20 tool reviews', icon: '📖', xpBonus: 100 },
    { id: 'early_adopter', name: 'Early Adopter', description: 'One of the first 100 members', icon: '🚀', xpBonus: 200 },
    { id: 'quiz_ace', name: 'Quiz Ace', description: 'Complete the AI Creator quiz', icon: '🎓', xpBonus: 75 },
    { id: 'social_butterfly', name: 'Social Butterfly', description: 'Share 5 pieces of content', icon: '🦋', xpBonus: 100 },
];

// Types
interface UserStats {
    totalXP: number;
    level: number;
    levelName: string;
    levelIcon: string;
    xpToNextLevel: number;
    xpProgress: number; // percentage
    streak: number;
    lastLoginDate: string;
    badges: string[];
    utilityUses: number;
    workflowDeploys: number;
    forumPosts: number;
    toolReviewsRead: number;
    shares: number;
}

interface GamificationContextType {
    stats: UserStats;
    addXP: (amount: number, reason: string) => void;
    checkAndAwardBadge: (badgeId: string) => boolean;
    recordAction: (action: keyof typeof XP_REWARDS) => void;
    showLevelUp: boolean;
    newLevel: number | null;
    dismissLevelUp: () => void;
    newBadge: typeof BADGES[0] | null;
    dismissNewBadge: () => void;
}

const defaultStats: UserStats = {
    totalXP: 0,
    level: 1,
    levelName: 'AI Curious',
    levelIcon: '🌱',
    xpToNextLevel: 100,
    xpProgress: 0,
    streak: 0,
    lastLoginDate: '',
    badges: [],
    utilityUses: 0,
    workflowDeploys: 0,
    forumPosts: 0,
    toolReviewsRead: 0,
    shares: 0,
};

const GamificationContext = createContext<GamificationContextType | null>(null);

// Calculate level from XP
function calculateLevel(xp: number): { level: number; name: string; icon: string; xpToNext: number; progress: number } {
    let currentLevel = LEVELS[0];
    let nextLevel = LEVELS[1];

    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].xpRequired) {
            currentLevel = LEVELS[i];
            nextLevel = LEVELS[i + 1] || LEVELS[i];
            break;
        }
    }

    const xpInCurrentLevel = xp - currentLevel.xpRequired;
    const xpNeededForNext = nextLevel.xpRequired - currentLevel.xpRequired;
    const progress = xpNeededForNext > 0 ? (xpInCurrentLevel / xpNeededForNext) * 100 : 100;

    return {
        level: currentLevel.level,
        name: currentLevel.name,
        icon: currentLevel.icon,
        xpToNext: nextLevel.xpRequired - xp,
        progress: Math.min(100, progress),
    };
}

// Storage key
const STORAGE_KEY = 'mikeforge_gamification';

export const GamificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stats, setStats] = useState<UserStats>(defaultStats);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [newLevel, setNewLevel] = useState<number | null>(null);
    const [newBadge, setNewBadge] = useState<typeof BADGES[0] | null>(null);

    // Load stats from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setStats(parsed);
            } catch {
                // Invalid data, use defaults
            }
        }

        // Check for daily login streak
        checkDailyStreak();
    }, []);

    // Save stats to localStorage whenever they change
    useEffect(() => {
        if (stats.totalXP > 0 || stats.badges.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
        }
    }, [stats]);

    // Check daily login streak
    const checkDailyStreak = useCallback(() => {
        const today = new Date().toDateString();
        const savedStats = localStorage.getItem(STORAGE_KEY);

        if (savedStats) {
            try {
                const parsed = JSON.parse(savedStats);
                const lastLogin = parsed.lastLoginDate;

                if (lastLogin === today) {
                    // Already logged in today, don't add XP
                    return;
                }

                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                let newStreak = 1;
                if (lastLogin === yesterday.toDateString()) {
                    // Continuing streak
                    newStreak = (parsed.streak || 0) + 1;
                }

                // Update stats with new streak and daily login XP
                setStats(prev => {
                    const dailyXP = XP_REWARDS.DAILY_LOGIN + (newStreak * XP_REWARDS.STREAK_BONUS);
                    const newXP = prev.totalXP + dailyXP;
                    const levelInfo = calculateLevel(newXP);

                    return {
                        ...prev,
                        totalXP: newXP,
                        level: levelInfo.level,
                        levelName: levelInfo.name,
                        levelIcon: levelInfo.icon,
                        xpToNextLevel: levelInfo.xpToNext,
                        xpProgress: levelInfo.progress,
                        streak: newStreak,
                        lastLoginDate: today,
                    };
                });
            } catch {
                // Set initial login
                setStats(prev => ({
                    ...prev,
                    lastLoginDate: today,
                    streak: 1,
                }));
            }
        } else {
            // First visit
            setStats(prev => ({
                ...prev,
                lastLoginDate: today,
                streak: 1,
            }));
        }
    }, []);

    // Add XP and check for level up
    const addXP = useCallback((amount: number, _reason: string) => {
        setStats(prev => {
            const newXP = prev.totalXP + amount;
            const levelInfo = calculateLevel(newXP);

            // Check for level up
            if (levelInfo.level > prev.level) {
                setShowLevelUp(true);
                setNewLevel(levelInfo.level);
            }

            return {
                ...prev,
                totalXP: newXP,
                level: levelInfo.level,
                levelName: levelInfo.name,
                levelIcon: levelInfo.icon,
                xpToNextLevel: levelInfo.xpToNext,
                xpProgress: levelInfo.progress,
            };
        });
    }, []);

    // Check and award badge
    const checkAndAwardBadge = useCallback((badgeId: string): boolean => {
        const badge = BADGES.find(b => b.id === badgeId);
        if (!badge) return false;

        setStats(prev => {
            if (prev.badges.includes(badgeId)) return prev;

            // Award badge
            setNewBadge(badge);

            // Add bonus XP
            const newXP = prev.totalXP + badge.xpBonus;
            const levelInfo = calculateLevel(newXP);

            return {
                ...prev,
                totalXP: newXP,
                level: levelInfo.level,
                levelName: levelInfo.name,
                levelIcon: levelInfo.icon,
                xpToNextLevel: levelInfo.xpToNext,
                xpProgress: levelInfo.progress,
                badges: [...prev.badges, badgeId],
            };
        });

        return true;
    }, []);

    // Record action and award XP
    const recordAction = useCallback((action: keyof typeof XP_REWARDS) => {
        const xp = XP_REWARDS[action];
        addXP(xp, action);

        // Update counters and check for badges
        setStats(prev => {
            const updated = { ...prev };

            switch (action) {
                case 'UTILITY_USE':
                    updated.utilityUses = (prev.utilityUses || 0) + 1;
                    if (updated.utilityUses === 1) checkAndAwardBadge('first_utility');
                    if (updated.utilityUses === 10) checkAndAwardBadge('utility_master');
                    break;
                case 'WORKFLOW_DEPLOY':
                    updated.workflowDeploys = (prev.workflowDeploys || 0) + 1;
                    if (updated.workflowDeploys === 5) checkAndAwardBadge('workflow_wizard');
                    break;
                case 'FORUM_POST':
                case 'FORUM_REPLY':
                    updated.forumPosts = (prev.forumPosts || 0) + 1;
                    if (updated.forumPosts === 10) checkAndAwardBadge('forum_contributor');
                    break;
                case 'TOOL_REVIEW_READ':
                    updated.toolReviewsRead = (prev.toolReviewsRead || 0) + 1;
                    if (updated.toolReviewsRead === 20) checkAndAwardBadge('ai_scholar');
                    break;
                case 'SHARE_CONTENT':
                    updated.shares = (prev.shares || 0) + 1;
                    if (updated.shares === 5) checkAndAwardBadge('social_butterfly');
                    break;
                case 'COMPLETE_QUIZ':
                    checkAndAwardBadge('quiz_ace');
                    break;
            }

            // Check streak badges
            if (prev.streak >= 7 && !prev.badges.includes('streak_week')) {
                checkAndAwardBadge('streak_week');
            }
            if (prev.streak >= 30 && !prev.badges.includes('streak_month')) {
                checkAndAwardBadge('streak_month');
            }

            return updated;
        });
    }, [addXP, checkAndAwardBadge]);

    const dismissLevelUp = useCallback(() => {
        setShowLevelUp(false);
        setNewLevel(null);
    }, []);

    const dismissNewBadge = useCallback(() => {
        setNewBadge(null);
    }, []);

    return (
        <GamificationContext.Provider value={{
            stats,
            addXP,
            checkAndAwardBadge,
            recordAction,
            showLevelUp,
            newLevel,
            dismissLevelUp,
            newBadge,
            dismissNewBadge,
        }}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamification = () => {
    const context = useContext(GamificationContext);
    if (!context) {
        throw new Error('useGamification must be used within a GamificationProvider');
    }
    return context;
};

export default GamificationContext;
