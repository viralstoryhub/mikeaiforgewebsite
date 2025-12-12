import Parser from 'rss-parser';
import type { Item as RSSItem, Output as RSSOutput } from 'rss-parser';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

type ExtendedRSSItem = RSSItem & {
  contentEncoded?: string;
  'content:encoded'?: string;
  mediaContent?: { url?: string } | Array<{ url?: string }>;
  mediaThumbnail?: { url?: string };
  'media:content'?: { url?: string } | Array<{ url?: string }>;
  'media:thumbnail'?: { url?: string };
};

interface FeedMetadata {
  feedTitle?: string | null;
  feedUrl?: string | null;
}

export interface ParsedNewsArticle {
  title: string;
  slug: string;
  summary: string;
  content: string;
  imageUrl: string | null;
  source: string;
  sourceUrl: string;
  category: string;
  tags: string;
  publishedAt: Date;
  isFeatured: boolean;
}

interface FetchOptions {
  forceRefresh?: boolean;
  feedUrls?: string[];
}

const parser: Parser<ExtendedRSSItem> = new Parser({
  customFields: {
    item: [
      ['content:encoded', 'contentEncoded'],
      ['media:content', 'mediaContent'],
      ['media:thumbnail', 'mediaThumbnail'],
    ],
  },
});

const prisma = new PrismaClient();

const DEFAULT_CACHE_TTL_MS = parseDurationToMs(process.env.NEWS_RSS_CACHE_TTL) ?? 5 * 60 * 1000;
const RATE_LIMIT_DELAY_MS = resolveDelayMs(process.env.NEWS_RSS_REQUEST_DELAY_MS);

let rssCache: { timestamp: number; data: ParsedNewsArticle[] } | null = null;

export const parseArticle = (
  item: ExtendedRSSItem,
  metadata: FeedMetadata
): ParsedNewsArticle | null => {
  const title = item.title?.trim();
  const link = item.link?.trim();

  if (!title || !link) {
    return null;
  }

  const rawContent =
    item.contentEncoded ||
    item['content:encoded'] ||
    item.content ||
    item.summary ||
    item.contentSnippet ||
    '';

  const summary = truncateText(stripHtml(item.contentSnippet || rawContent || ''), 280);
  const content = rawContent || summary;
  const tagsArray = normalizeTags(item.categories);
  const tags = tagsArray.join(', ');
  const imageUrl = extractImageUrl(item, content);
  const publishedAt = resolvePublishedDate(item.isoDate || item.pubDate);
  const feedTitle = metadata.feedTitle ?? '';
  const category = determineCategory(feedTitle, tagsArray, `${title} ${summary} ${content}`);
  const source = resolveSourceName(link, feedTitle);

  return {
    title,
    slug: slugify(title),
    summary,
    content,
    imageUrl,
    source,
    sourceUrl: link,
    category,
    tags,
    publishedAt,
    isFeatured: false,
  };
};

export const fetchRSSFeeds = async (options?: FetchOptions): Promise<ParsedNewsArticle[]> => {
  const { forceRefresh = false, feedUrls = resolveFeedUrls() } = options ?? {};

  if (!feedUrls.length) {
    logger.warn('No RSS feeds configured. Set NEWS_RSS_FEEDS to enable news syncing.');
    return [];
  }

  if (!forceRefresh && rssCache && Date.now() - rssCache.timestamp < DEFAULT_CACHE_TTL_MS) {
    return rssCache.data;
  }

  logger.info('Fetching AI news from %d RSS sources', feedUrls.length);

  const feedPromises = feedUrls.map((url, index) =>
    (async () => {
      try {
        if (RATE_LIMIT_DELAY_MS > 0 && index > 0) {
          await delay(index * RATE_LIMIT_DELAY_MS);
        }

        const feed: RSSOutput<ExtendedRSSItem> = await parser.parseURL(url);
        const feedTitle = feed.title ?? null;
        const feedMeta: FeedMetadata = { feedTitle, feedUrl: feed.link ?? feed.feedUrl ?? null };

        return (feed.items ?? [])
          .map((item) => parseArticle(item, feedMeta))
          .filter((article): article is ParsedNewsArticle => Boolean(article));
      } catch (error) {
        logger.warn(
          'Failed to fetch or parse RSS feed %s: %s',
          url,
          (error as Error).message || error
        );
        return [];
      }
    })()
  );

  const articleGroups = await Promise.all(feedPromises);
  const allArticles = articleGroups.flat();

  const dedupedArticles = deduplicateArticles(allArticles);
  dedupedArticles.sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );

  rssCache = { timestamp: Date.now(), data: dedupedArticles };
  logger.info(
    'Fetched %d articles from RSS feeds (%d after deduplication)',
    allArticles.length,
    dedupedArticles.length
  );

  return dedupedArticles;
};

export const syncNewsArticles = async (): Promise<number> => {
  const articles = await fetchRSSFeeds({ forceRefresh: true });

  if (!articles.length) {
    logger.info('No articles fetched during news sync.');
    return 0;
  }

  const sourceUrls = articles.map((article) => article.sourceUrl);
  const existingSourceUrls = await prisma.newsArticle.findMany({
    where: { sourceUrl: { in: sourceUrls } },
    select: { sourceUrl: true },
  });

  const existingSourceUrlSet = new Set(existingSourceUrls.map((entry) => entry.sourceUrl));
  const newArticles = articles.filter(
    (article) => !existingSourceUrlSet.has(article.sourceUrl)
  );

  if (!newArticles.length) {
    logger.info('All fetched articles already exist. No new articles added.');
    return 0;
  }

  const reservedSlugs = new Set<string>();
  let createdCount = 0;

  for (const article of newArticles) {
    try {
      const uniqueSlug = await ensureUniqueSlug(article.slug, reservedSlugs);

      await prisma.newsArticle.create({
        data: {
          title: article.title,
          slug: uniqueSlug,
          summary: article.summary,
          content: article.content,
          imageUrl: article.imageUrl,
          source: article.source,
          sourceUrl: article.sourceUrl,
          category: article.category,
          tags: article.tags,
          publishedAt: article.publishedAt,
          isFeatured: article.isFeatured,
        },
      });

      reservedSlugs.add(uniqueSlug);
      createdCount += 1;
    } catch (error) {
      logger.error(
        'Failed to store article "%s": %s',
        article.title,
        (error as Error).message || error
      );
    }
  }

  logger.info(
    'News sync completed. %d total fetched, %d newly stored.',
    articles.length,
    createdCount
  );

  return createdCount;
};

function resolveFeedUrls(): string[] {
  const feeds = process.env.NEWS_RSS_FEEDS;
  if (!feeds) {
    return [];
  }

  return feeds
    .split(/[\n,]/)
    .map((feed) => feed.trim())
    .filter(Boolean);
}

function resolveDelayMs(input?: string): number {
  if (!input) {
    return 1000;
  }

  const parsed = Number(input);
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return 1000;
}

function parseDurationToMs(value?: string): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)?$/i.exec(trimmed);

  if (!match) {
    return null;
  }

  const amount = Number(match[1]);
  const unit = (match[2] || 'ms').toLowerCase();

  const unitMultiplier: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * (unitMultiplier[unit] ?? 1);
}

function normalizeTags(categories?: string[] | string | null): string[] {
  if (!categories) {
    return [];
  }

  if (Array.isArray(categories)) {
    return categories
      .map((category) => category?.trim())
      .filter((category): category is string => Boolean(category));
  }

  return categories
    .split(',')
    .map((category) => category?.trim())
    .filter((category): category is string => Boolean(category));
}

function deduplicateArticles(articles: ParsedNewsArticle[]): ParsedNewsArticle[] {
  const map = new Map<string, ParsedNewsArticle>();

  for (const article of articles) {
    const key = article.sourceUrl || article.slug;
    if (!map.has(key)) {
      map.set(key, article);
    }
  }

  return Array.from(map.values());
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trim()}…`;
}

function extractImageUrl(item: ExtendedRSSItem, content: string): string | null {
  const enclosureUrl = item.enclosure?.url;
  if (enclosureUrl) {
    return enclosureUrl;
  }

  if (Array.isArray(item.mediaContent)) {
    const media = item.mediaContent.find((entry) => entry.url);
    if (media?.url) {
      return media.url;
    }
  } else if (item.mediaContent && typeof item.mediaContent === 'object') {
    const url = (item.mediaContent as { url?: string }).url;
    if (url) {
      return url;
    }
  }

  const thumbnailUrl =
    (item.mediaThumbnail as { url?: string } | undefined)?.url ||
    (Array.isArray(item.mediaThumbnail)
      ? item.mediaThumbnail.find((entry) => entry?.url)?.url
      : undefined);

  if (thumbnailUrl) {
    return thumbnailUrl;
  }

  const match = /<img[^>]+src=["']([^"']+)["']/i.exec(content);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

function resolvePublishedDate(value?: string | null): Date {
  if (!value) {
    return new Date();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
}

function resolveSourceName(link: string, feedTitle?: string | null): string {
  if (feedTitle) {
    return feedTitle;
  }

  try {
    const url = new URL(link);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Source';
  }
}

function determineCategory(
  feedTitle: string | null | undefined,
  tags: string[],
  text: string
): string {
  const haystack = `${feedTitle ?? ''} ${tags.join(' ')} ${text}`.toLowerCase();

  if (
    haystack.includes('tutorial') ||
    haystack.includes('how to') ||
    haystack.includes('guide') ||
    haystack.includes('walkthrough')
  ) {
    return 'Tutorials';
  }

  if (
    haystack.includes('release') ||
    haystack.includes('update') ||
    haystack.includes('feature') ||
    haystack.includes('launch')
  ) {
    return 'Product Updates';
  }

  if (
    haystack.includes('research') ||
    haystack.includes('study') ||
    haystack.includes('paper') ||
    haystack.includes('science')
  ) {
    return 'Research';
  }

  if (
    haystack.includes('tool') ||
    haystack.includes('platform') ||
    haystack.includes('app') ||
    haystack.includes('software')
  ) {
    return 'AI Tools';
  }

  return 'Industry News';
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function ensureUniqueSlug(
  baseSlug: string,
  reserved: Set<string>
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!reserved.has(candidate)) {
      const existing = await prisma.newsArticle.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });

      if (!existing) {
        return candidate;
      }
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
