import { schedule, ScheduledTask, ScheduleOptions } from 'node-cron';
import logger from '../utils/logger';
import { syncNewsArticles } from '../services/rssService';

const DEFAULT_CRON_EXPRESSION = '0 */6 * * *';
const DISABLE_VALUES = new Set(['off', 'disabled', 'none', 'false', '0']);
const CRON_FIELD_SEPARATOR = /\s+/;

let newsSyncTask: ScheduledTask | null = null;
let isSyncRunning = false;
let activeCronExpression: string | null = null;

const normalizeNewArticlesCount = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value && typeof value === 'object') {
    const result = value as Record<string, unknown>;

    const numericKeys = ['newArticles', 'count', 'created', 'added', 'inserted'];
    for (const key of numericKeys) {
      const candidate = result[key];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return candidate;
      }
    }

    const articles = result.articles;
    if (Array.isArray(articles)) {
      return articles.length;
    }
  }

  return 0;
};

const resolveCronExpression = (value?: string | null): string | null => {
  if (!value) {
    return DEFAULT_CRON_EXPRESSION;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_CRON_EXPRESSION;
  }

  const lower = trimmed.toLowerCase();

  if (DISABLE_VALUES.has(lower)) {
    logger.warn(
      '[NewsSyncJob] NEWS_FETCH_INTERVAL set to "%s"; scheduled news sync will be disabled.',
      trimmed
    );
    return null;
  }

  if (trimmed.startsWith('@')) {
    return trimmed;
  }

  const fields = trimmed.split(CRON_FIELD_SEPARATOR);
  if (fields.length === 5 || fields.length === 6) {
    return trimmed;
  }

  const durationMatch = /^(\d+)\s*(ms|s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i.exec(
    trimmed
  );

  if (!durationMatch) {
    logger.warn(
      '[NewsSyncJob] Unable to parse NEWS_FETCH_INTERVAL value "%s". Falling back to default schedule "%s".',
      trimmed,
      DEFAULT_CRON_EXPRESSION
    );
    return DEFAULT_CRON_EXPRESSION;
  }

  const amount = Number(durationMatch[1]);
  if (!Number.isFinite(amount) || amount <= 0) {
    logger.warn(
      '[NewsSyncJob] NEWS_FETCH_INTERVAL must be greater than zero. Using default schedule "%s".',
      DEFAULT_CRON_EXPRESSION
    );
    return DEFAULT_CRON_EXPRESSION;
  }

  const unit = durationMatch[2].toLowerCase();

  if (unit.startsWith('m') && !unit.startsWith('ms')) {
    return amount === 1 ? '* * * * *' : `*/${amount} * * * *`;
  }

  if (unit.startsWith('h')) {
    if (amount >= 24 && amount % 24 === 0) {
      const days = Math.max(1, Math.floor(amount / 24));
      return days === 1 ? '0 0 * * *' : `0 0 */${days} * *`;
    }
    return amount === 1 ? '0 * * * *' : `0 */${amount} * * *`;
  }

  if (unit.startsWith('d')) {
    return amount === 1 ? '0 0 * * *' : `0 0 */${amount} * *`;
  }

  logger.warn(
    '[NewsSyncJob] NEWS_FETCH_INTERVAL unit "%s" is unsupported. Using default schedule "%s".',
    unit,
    DEFAULT_CRON_EXPRESSION
  );
  return DEFAULT_CRON_EXPRESSION;
};

const runSync = async (
  origin: 'manual' | 'scheduled',
  rethrowOnError: boolean
): Promise<number> => {
  if (isSyncRunning) {
    const message = `[NewsSyncJob] ${origin} sync requested while another sync is in progress.`;
    logger.warn(message);
    if (rethrowOnError) {
      const error = new Error('News synchronization is already running');
      error.name = 'NewsSyncInProgressError';
      throw error;
    }
    return 0;
  }

  isSyncRunning = true;
  const startedAt = Date.now();

  logger.info('[NewsSyncJob] Starting %s news synchronization...', origin);

  try {
    const result = await syncNewsArticles();
    const newArticles = normalizeNewArticlesCount(result);
    const durationMs = Date.now() - startedAt;

    logger.info(
      '[NewsSyncJob] Completed %s news synchronization in %dms. New articles added: %d',
      origin,
      durationMs,
      newArticles
    );

    return newArticles;
  } catch (error) {
    logger.error('[NewsSyncJob] %s news synchronization failed.', origin, { error });

    if (rethrowOnError) {
      throw error instanceof Error ? error : new Error(String(error));
    }

    return 0;
  } finally {
    isSyncRunning = false;
  }
};

export const syncNewsJob = (): Promise<number> => runSync('scheduled', false);

export const triggerNewsSync = (): Promise<number> => runSync('manual', true);

export const registerNewsSyncJob = (): void => {
  if (newsSyncTask) {
    logger.warn('[NewsSyncJob] Attempted to register news sync job multiple times. Skipping.');
    return;
  }

  const cronExpression = resolveCronExpression(process.env.NEWS_FETCH_INTERVAL);
  activeCronExpression = cronExpression;

  if (!cronExpression) {
    logger.info('[NewsSyncJob] News sync scheduling is disabled. Manual triggers only.');
    logger.info('[NewsSyncJob] Triggering initial news sync run.');
    void syncNewsJob();
    return;
  }

  const timezone = process.env.CRON_TIMEZONE || process.env.TZ || undefined;
  const options: ScheduleOptions = {};
  if (timezone) {
    options.timezone = timezone;
  }

  try {
    newsSyncTask = schedule(
      cronExpression,
      () => {
        void syncNewsJob();
      },
      options
    );

    logger.info(
      '[NewsSyncJob] Scheduled news sync job with cron expression "%s"%s.',
      cronExpression,
      timezone ? ` (timezone: ${timezone})` : ''
    );
  } catch (error) {
    newsSyncTask = null;
    activeCronExpression = null;
    logger.error('[NewsSyncJob] Failed to schedule news sync job.', { error });
  }

  logger.info('[NewsSyncJob] Triggering initial news sync run.');
  void syncNewsJob();
};

export const getNewsSyncSchedule = (): string | null => activeCronExpression;

export const isNewsSyncRunning = (): boolean => isSyncRunning;