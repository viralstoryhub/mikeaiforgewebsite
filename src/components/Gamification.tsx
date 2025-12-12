import React from 'react';
import { useGamification, LEVELS, BADGES } from '../contexts/GamificationContext';

// =====================================================
// XP Progress Bar Component
// =====================================================
export const XPProgressBar: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
    const { stats } = useGamification();

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-lg">{stats.levelIcon}</span>
                <div className="flex-1 h-2 bg-dark-secondary rounded-full overflow-hidden min-w-[60px]">
                    <div
                        className="h-full bg-gradient-to-r from-brand-primary to-purple-500 transition-all duration-500"
                        style={{ width: `${stats.xpProgress}%` }}
                    />
                </div>
                <span className="text-xs text-light-tertiary">{stats.totalXP} XP</span>
            </div>
        );
    }

    return (
        <div className="bg-dark-secondary border border-border-dark rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{stats.levelIcon}</span>
                    <div>
                        <div className="font-bold text-light-primary">{stats.levelName}</div>
                        <div className="text-xs text-light-tertiary">Level {stats.level}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="font-bold text-brand-primary">{stats.totalXP} XP</div>
                    <div className="text-xs text-light-tertiary">
                        {stats.xpToNextLevel > 0 ? `${stats.xpToNextLevel} to next level` : 'Max level!'}
                    </div>
                </div>
            </div>
            <div className="h-3 bg-dark-primary rounded-full overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-brand-primary via-purple-500 to-pink-500 transition-all duration-500"
                    style={{ width: `${stats.xpProgress}%` }}
                />
            </div>
            {stats.streak > 0 && (
                <div className="mt-2 flex items-center gap-1 text-sm text-orange-400">
                    <span>🔥</span>
                    <span>{stats.streak} day streak!</span>
                </div>
            )}
        </div>
    );
};

// =====================================================
// Level Badge Component
// =====================================================
export const LevelBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
    const { stats } = useGamification();

    const sizeClasses = {
        sm: 'w-6 h-6 text-sm',
        md: 'w-8 h-8 text-lg',
        lg: 'w-12 h-12 text-2xl',
    };

    return (
        <div
            className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-brand-primary to-purple-600 flex items-center justify-center`}
            title={`Level ${stats.level}: ${stats.levelName}`}
        >
            {stats.levelIcon}
        </div>
    );
};

// =====================================================
// Badge Display Component
// =====================================================
export const BadgeDisplay: React.FC<{ badgeId: string; earned?: boolean; showName?: boolean }> = ({
    badgeId,
    earned = false,
    showName = true
}) => {
    const badge = BADGES.find(b => b.id === badgeId);
    if (!badge) return null;

    return (
        <div
            className={`flex flex-col items-center p-3 rounded-lg border transition-all ${earned
                    ? 'bg-dark-secondary border-brand-primary/50'
                    : 'bg-dark-primary/50 border-border-dark opacity-50 grayscale'
                }`}
            title={badge.description}
        >
            <span className="text-3xl mb-1">{badge.icon}</span>
            {showName && (
                <>
                    <span className="text-sm font-medium text-light-primary">{badge.name}</span>
                    <span className="text-xs text-light-tertiary text-center">{badge.description}</span>
                </>
            )}
        </div>
    );
};

// =====================================================
// Badges Grid Component
// =====================================================
export const BadgesGrid: React.FC = () => {
    const { stats } = useGamification();

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {BADGES.map(badge => (
                <BadgeDisplay
                    key={badge.id}
                    badgeId={badge.id}
                    earned={stats.badges.includes(badge.id)}
                />
            ))}
        </div>
    );
};

// =====================================================
// Level Up Modal
// =====================================================
export const LevelUpModal: React.FC = () => {
    const { showLevelUp, newLevel, dismissLevelUp } = useGamification();

    if (!showLevelUp || !newLevel) return null;

    const levelInfo = LEVELS.find(l => l.level === newLevel);
    if (!levelInfo) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-secondary border border-brand-primary rounded-2xl p-8 text-center max-w-sm mx-4 animate-scale-in">
                <div className="text-6xl mb-4 animate-bounce">{levelInfo.icon}</div>
                <h2 className="text-2xl font-bold text-light-primary mb-2">Level Up!</h2>
                <p className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-purple-500 mb-2">
                    Level {newLevel}
                </p>
                <p className="text-xl text-light-primary mb-4">{levelInfo.name}</p>
                <p className="text-light-secondary mb-6">
                    Keep using utilities and engaging with the community to reach the next level!
                </p>
                <button
                    onClick={dismissLevelUp}
                    className="bg-brand-primary text-white font-semibold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
                >
                    Awesome! 🎉
                </button>
            </div>
        </div>
    );
};

// =====================================================
// New Badge Modal
// =====================================================
export const NewBadgeModal: React.FC = () => {
    const { newBadge, dismissNewBadge } = useGamification();

    if (!newBadge) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-dark-secondary border border-yellow-500/50 rounded-2xl p-8 text-center max-w-sm mx-4 animate-scale-in">
                <div className="text-6xl mb-4">{newBadge.icon}</div>
                <h2 className="text-2xl font-bold text-light-primary mb-2">Badge Unlocked!</h2>
                <p className="text-xl font-bold text-yellow-400 mb-2">{newBadge.name}</p>
                <p className="text-light-secondary mb-4">{newBadge.description}</p>
                <p className="text-brand-primary font-bold mb-6">+{newBadge.xpBonus} XP</p>
                <button
                    onClick={dismissNewBadge}
                    className="bg-yellow-500 text-black font-semibold px-8 py-3 rounded-lg hover:bg-yellow-400 transition-colors"
                >
                    Collect Badge
                </button>
            </div>
        </div>
    );
};

// =====================================================
// XP Toast Notification (for inline feedback)
// =====================================================
export const XPToast: React.FC<{ amount: number; reason: string; onDismiss: () => void }> = ({
    amount,
    reason,
    onDismiss
}) => {
    React.useEffect(() => {
        const timer = setTimeout(onDismiss, 2000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="fixed bottom-20 right-4 z-40 animate-slide-up">
            <div className="bg-brand-primary/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <span className="font-bold">+{amount} XP</span>
                <span className="text-sm opacity-80">{reason}</span>
            </div>
        </div>
    );
};

// =====================================================
// User Stats Summary Card
// =====================================================
export const UserStatsSummary: React.FC = () => {
    const { stats } = useGamification();

    return (
        <div className="bg-dark-secondary border border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-bold text-light-primary mb-4">Your Stats</h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-brand-primary">{stats.utilityUses}</div>
                    <div className="text-xs text-light-tertiary">Utilities Used</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">{stats.workflowDeploys}</div>
                    <div className="text-xs text-light-tertiary">Workflows Deployed</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{stats.forumPosts}</div>
                    <div className="text-xs text-light-tertiary">Forum Posts</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">{stats.streak}</div>
                    <div className="text-xs text-light-tertiary">Day Streak</div>
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border-dark">
                <div className="text-sm text-light-secondary mb-2">Badges Earned: {stats.badges.length}/{BADGES.length}</div>
                <div className="flex gap-1 flex-wrap">
                    {stats.badges.map(badgeId => {
                        const badge = BADGES.find(b => b.id === badgeId);
                        return badge ? <span key={badgeId} className="text-xl" title={badge.name}>{badge.icon}</span> : null;
                    })}
                </div>
            </div>
        </div>
    );
};

export default XPProgressBar;
