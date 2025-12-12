import React from 'react';

type BadgeVariant = 'admin' | 'moderator' | 'pro' | 'op' | 'user' | 'staff';

interface UserBadgeProps {
    role?: string;
    subscriptionTier?: string;
    isOP?: boolean;
    size?: 'sm' | 'md';
}

const getBadgeConfig = (role?: string, subscriptionTier?: string) => {
    const normalizedRole = role?.toLowerCase() ?? '';
    const normalizedTier = subscriptionTier?.toLowerCase() ?? '';

    const badges: { variant: BadgeVariant; label: string }[] = [];

    // Role badges
    if (['admin', 'superadmin', 'owner'].includes(normalizedRole)) {
        badges.push({ variant: 'admin', label: 'Admin' });
    } else if (['moderator', 'mod'].includes(normalizedRole)) {
        badges.push({ variant: 'moderator', label: 'Mod' });
    } else if (['staff', 'support', 'editor'].includes(normalizedRole)) {
        badges.push({ variant: 'staff', label: 'Staff' });
    }

    // Subscription badge
    if (['pro', 'premium', 'paid'].includes(normalizedTier)) {
        badges.push({ variant: 'pro', label: 'Pro' });
    }

    return badges;
};

const badgeStyles: Record<BadgeVariant, string> = {
    admin: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400/50 shadow-purple-500/30',
    moderator: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-blue-400/50 shadow-blue-500/30',
    staff: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white border-green-400/50 shadow-green-500/30',
    pro: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400/50 shadow-amber-500/30',
    op: 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white border-brand-primary/50 shadow-brand-primary/30',
    user: 'bg-dark-secondary/70 text-light-secondary border-border-dark',
};

const badgeIcons: Record<BadgeVariant, JSX.Element> = {
    admin: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
    ),
    moderator: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001z" clipRule="evenodd" />
        </svg>
    ),
    staff: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
        </svg>
    ),
    pro: (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
    ),
    op: (
        <span className="text-[10px] font-bold">OP</span>
    ),
    user: <></>,
};

export const UserBadge: React.FC<{ variant: BadgeVariant; label: string; size?: 'sm' | 'md' }> = ({
    variant,
    label,
    size = 'sm'
}) => {
    const sizeClasses = size === 'sm'
        ? 'px-1.5 py-0.5 text-[10px] gap-0.5'
        : 'px-2 py-1 text-xs gap-1';

    return (
        <span className={`inline-flex items-center font-bold rounded-full border shadow-sm ${sizeClasses} ${badgeStyles[variant]}`}>
            {badgeIcons[variant]}
            {variant !== 'op' && label}
        </span>
    );
};

export const UserBadges: React.FC<UserBadgeProps> = ({
    role,
    subscriptionTier,
    isOP = false,
    size = 'sm'
}) => {
    const badges = getBadgeConfig(role, subscriptionTier);

    return (
        <div className="flex flex-wrap items-center gap-1 mt-1">
            {isOP && <UserBadge variant="op" label="OP" size={size} />}
            {badges.map((badge, index) => (
                <UserBadge key={index} variant={badge.variant} label={badge.label} size={size} />
            ))}
        </div>
    );
};

export default UserBadges;
