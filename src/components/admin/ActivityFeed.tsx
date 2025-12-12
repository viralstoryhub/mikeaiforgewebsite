import React, { useMemo } from 'react';

type ActivityIconKey =
  | 'user'
  | 'tool'
  | 'workflow'
  | 'news'
  | 'forum'
  | 'system'
  | 'default';

interface ActivityActor {
  id?: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

export interface ActivityEntry {
  id?: string | number;
  action?: string;
  description?: string;
  createdAt: string | number | Date;
  actor?: ActivityActor;
  resourceType?: string;
  resourceName?: string;
  status?: string;
  target?: string;
  icon?: React.ReactNode;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities?: ActivityEntry[];
  loading?: boolean;
  className?: string;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities = [],
  loading = false,
  className,
}) => {
  const groupedActivities = useMemo(() => {
    if (!activities.length) {
      return [];
    }

    const sorted = [...activities].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const groups: Record<string, ActivityEntry[]> = {};

    sorted.forEach((activity) => {
      const label = getDateGroupLabel(new Date(activity.createdAt));
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(activity);
    });

    const orderedLabels = ['Today', 'Yesterday', 'This Week', 'Earlier'];
    return orderedLabels
      .filter((label) => groups[label]?.length)
      .map((label) => ({
        label,
        items: groups[label],
      }));
  }, [activities]);

  const containerClassName = [
    'flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClassName}>
      <div className="max-h-[28rem] overflow-y-auto pr-1">
        {loading ? (
          <LoadingSkeleton />
        ) : !activities.length ? (
          <EmptyState />
        ) : (
          <div className="space-y-6">
            {groupedActivities.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {group.label}
                </p>
                <div className="mt-4 space-y-6">
                  {group.items.map((activity, index) => (
                    <TimelineItem
                      key={activity.id ?? `${group.label}-${index}`}
                      activity={activity}
                      isLast={index === group.items.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface TimelineItemProps {
  activity: ActivityEntry;
  isLast: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ activity, isLast }) => {
  const activityDate = new Date(activity.createdAt);
  const icon =
    activity.icon ??
    getActivityIcon(getActivityIconKey(activity.resourceType, activity.action));
  const actorName = activity.actor?.name ?? 'System';
  const description =
    activity.description ?? `${actorName} ${activity.action ?? 'performed an action'}`;
  const detailText =
    activity.resourceName ??
    activity.target ??
    extractMetadataDetail(activity.metadata);
  const relativeTime = formatRelativeTime(activityDate);

  return (
    <div className="relative pl-12">
      {!isLast && (
        <span className="absolute left-[21px] top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
      )}
      <span className="absolute left-0 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 ring-4 ring-white dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-gray-900">
        {icon}
      </span>

      <div className="flex items-start gap-3">
        <Avatar name={actorName} avatarUrl={activity.actor?.avatarUrl} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {description}
          </p>

          {detailText ? (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {detailText}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-gray-600 dark:text-gray-300">
              {actorName}
            </span>
            <span className="inline-flex h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <time
              dateTime={activityDate.toISOString()}
              title={activityDate.toLocaleString()}
            >
              {relativeTime}
            </time>
            {activity.status ? (
              <>
                <span className="inline-flex h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {activity.status}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

const Avatar: React.FC<{ name?: string; avatarUrl?: string }> = ({
  name,
  avatarUrl,
}) => {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ?? 'User avatar'}
        className="h-10 w-10 rounded-full border border-gray-200 object-cover dark:border-gray-700"
      />
    );
  }

  const initials = getInitials(name);

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold uppercase text-white dark:bg-indigo-500/80">
      {initials}
    </div>
  );
};

const LoadingSkeleton: React.FC = () => {
  const placeholders = Array.from({ length: 5 });
  return (
    <div className="space-y-6">
      {placeholders.map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="relative animate-pulse pl-12"
        >
          {index !== placeholders.length - 1 && (
            <span className="absolute left-[21px] top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
          )}
          <span className="absolute left-0 top-2 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-start gap-3">
            <span className="mt-2 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1 space-y-3">
              <span className="block h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
              <span className="block h-3 w-64 rounded bg-gray-100 dark:bg-gray-800" />
              <span className="block h-3 w-32 rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 py-10 text-center dark:border-gray-700 dark:bg-gray-800/40">
    <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-900">
      <svg
        className="h-6 w-6 text-gray-400 dark:text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.25 6.75H5.25M18.75 17.25H12.75M9 17.25C9 18.4926 7.99264 19.5 6.75 19.5C5.50736 19.5 4.5 18.4926 4.5 17.25C4.5 16.0074 5.50736 15 6.75 15C7.99264 15 9 16.0074 9 17.25ZM19.5 6.75C19.5 7.99264 18.4926 9 17.25 9C16.0074 9 15 7.99264 15 6.75C15 5.50736 16.0074 4.5 17.25 4.5C18.4926 4.5 19.5 5.50736 19.5 6.75Z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 6.75H3.75M3.75 6.75C3.75 5.50736 4.75736 4.5 6 4.5H6.75M6.75 4.5C8.82107 4.5 10.5 6.17893 10.5 8.25V15.75C10.5 17.8211 8.82107 19.5 6.75 19.5H6C4.75736 19.5 3.75 18.4926 3.75 17.25V6.75Z"
        />
      </svg>
    </span>
    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
      No recent activity
    </p>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
      Actions performed by users and admins will appear here.
    </p>
  </div>
);

const getDateGroupLabel = (date: Date): string => {
  const today = startOfDay(new Date());
  const target = startOfDay(date);

  if (today.getTime() === target.getTime()) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (yesterday.getTime() === target.getTime()) {
    return 'Yesterday';
  }

  if (isSameWeek(today, target)) {
    return 'This Week';
  }

  return 'Earlier';
};

const startOfDay = (date: Date): Date => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const isSameWeek = (dateA: Date, dateB: Date): boolean => {
  const getWeekStart = (date: Date) => {
    const normalized = startOfDay(date);
    const day = normalized.getDay();
    const diff = (day + 6) % 7;
    normalized.setDate(normalized.getDate() - diff);
    return normalized.getTime();
  };

  return getWeekStart(dateA) === getWeekStart(dateB);
};

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const absDiff = Math.abs(diffInSeconds);

  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ];

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const { unit, seconds } of units) {
    if (absDiff >= seconds || unit === 'second') {
      const value = Math.round(diffInSeconds / seconds);
      return formatter.format(value, unit);
    }
  }

  return 'just now';
};

const getActivityIconKey = (
  resourceType?: string,
  action?: string,
): ActivityIconKey => {
  const resource = (resourceType || '').toLowerCase();
  const actionText = (action || '').toLowerCase();

  if (resource.includes('user') || actionText.includes('user')) {
    return 'user';
  }

  if (resource.includes('tool') || actionText.includes('tool')) {
    return 'tool';
  }

  if (resource.includes('workflow') || actionText.includes('workflow')) {
    return 'workflow';
  }

  if (resource.includes('news') || actionText.includes('article')) {
    return 'news';
  }

  if (
    resource.includes('forum') ||
    resource.includes('thread') ||
    resource.includes('post') ||
    actionText.includes('forum')
  ) {
    return 'forum';
  }

  if (
    resource.includes('system') ||
    actionText.includes('system') ||
    actionText.includes('health') ||
    actionText.includes('login') ||
    actionText.includes('error')
  ) {
    return 'system';
  }

  return 'default';
};

const getActivityIcon = (key: ActivityIconKey): React.ReactNode => {
  const baseProps = {
    className: 'h-5 w-5',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.5,
  };

  switch (key) {
    case 'user':
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.121 17.804A6 6 0 0112 15a6 6 0 016.879 2.804M15 11a3 3 0 10-6 0 3 3 0 006 0z"
          />
        </svg>
      );
    case 'tool':
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197M16.5 9A4.5 4.5 0 117.5 9a4.5 4.5 0 019 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 20.25l5.197-5.197"
          />
        </svg>
      );
    case 'workflow':
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5.25 5.25h13.5M5.25 12h13.5M5.25 18.75h13.5"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 3v4.5M9 9.75v4.5M9 16.5v4.5"
          />
        </svg>
      );
    case 'news':
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 6.75V19.5A1.5 1.5 0 006 21h12a1.5 1.5 0 001.5-1.5V6.75"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 6.75A2.25 2.25 0 016.75 4.5h10.5A2.25 2.25 0 0119.5 6.75M7.5 9h9M7.5 12h9M7.5 15h4.5"
          />
        </svg>
      );
    case 'forum':
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7.5 8.25h9m-9 3h5.25M2.25 12a9.75 9.75 0 1117.614 5.511L21.75 20.25l-3.886-2.61A9.75 9.75 0 012.25 12z"
          />
        </svg>
      );
    case 'system':
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317a1.125 1.125 0 011.35 0l1.456 1.089a1.125 1.125 0 001.2.093l1.71-.856a1.125 1.125 0 011.62 1.2l-.326 1.908a1.125 1.125 0 00.324 1.002l1.297 1.27a1.125 1.125 0 010 1.606l-1.297 1.27a1.125 1.125 0 00-.324 1.002l.326 1.908a1.125 1.125 0 01-1.62 1.2l-1.71-.856a1.125 1.125 0 00-1.2.093l-1.456 1.089a1.125 1.125 0 01-1.35 0l-1.456-1.089a1.125 1.125 0 00-1.2-.093l-1.71.856a1.125 1.125 0 01-1.62-1.2l.326-1.908a1.125 1.125 0 00-.324-1.002l-1.297-1.27a1.125 1.125 0 010-1.606l1.297-1.27a1.125 1.125 0 00.324-1.002l-.326-1.908a1.125 1.125 0 011.62-1.2l1.71.856a1.125 1.125 0 001.2-.093l1.456-1.089z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z"
          />
        </svg>
      );
    case 'default':
    default:
      return (
        <svg {...baseProps}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6l3 3"
          />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

const getInitials = (name?: string): string => {
  if (!name) {
    return '??';
  }

  const parts = name.trim().split(' ');
  if (!parts.length) {
    return '??';
  }

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }

  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const extractMetadataDetail = (
  metadata?: Record<string, unknown>,
): string | undefined => {
  if (!metadata) {
    return undefined;
  }

  const preferredKeys = [
    'summary',
    'details',
    'description',
    'resourceName',
    'targetName',
    'message',
    'note',
    'info',
  ];

  for (const key of preferredKeys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length) {
      return value;
    }
  }

  return undefined;
};

export default ActivityFeed;
