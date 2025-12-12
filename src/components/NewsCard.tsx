import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { NewsArticle } from '../types';
import { useTiltEffect } from '../hooks/useTiltEffect';

interface NewsCardProps {
  article: NewsArticle;
  featured?: boolean;
  compact?: boolean;
}

const categoryColorMap: Record<string, string> = {
  'ai tools': 'border border-sky-500/30 bg-sky-500/10 text-sky-300',
  'industry news': 'border border-amber-500/30 bg-amber-500/10 text-amber-200',
  tutorials: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'product updates': 'border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-300',
  research: 'border border-violet-500/30 bg-violet-500/10 text-violet-300',
};

const formatPublishedDate = (value: string): string => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

const createLineClampStyle = (lines: number): React.CSSProperties => ({
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

const NewsCard: React.FC<NewsCardProps> = ({ article, featured = false, compact = false }) => {
  const tiltRef = useTiltEffect<HTMLDivElement>();

  const publishedDate = useMemo(() => formatPublishedDate(article.publishedAt), [article.publishedAt]);

  const categoryBadgeClasses = useMemo(() => {
    const key = article.category?.toLowerCase().trim() ?? '';
    return categoryColorMap[key] ?? 'border border-brand-primary/40 bg-brand-primary/10 text-brand-primary';
  }, [article.category]);

  const visibleTags = useMemo(() => (article.tags ?? []).filter(Boolean).slice(0, featured ? 4 : 3), [article.tags, featured]);

  const titleClampStyle = useMemo(
    () => createLineClampStyle(compact ? 2 : featured ? 3 : 2),
    [compact, featured],
  );

  const summaryClampStyle = useMemo(() => createLineClampStyle(featured ? 5 : 3), [featured]);

  const wrapperClasses = ['relative', 'group'];
  if (!compact) {
    wrapperClasses.push('tilt-card', 'h-full');
  }

  const linkClasses = [
    'block',
    'bg-dark-secondary/90',
    'border',
    'border-border-dark',
    'rounded-2xl',
    'overflow-hidden',
    'transition-all',
    'duration-300',
    'hover:border-brand-primary/60',
    'hover:shadow-glow-blue',
    'focus:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-brand-primary/70',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-dark-primary',
  ];

  if (compact) {
    linkClasses.push('flex', 'items-center', 'gap-4', 'p-4');
  } else if (featured) {
    linkClasses.push('h-full', 'md:grid', 'md:grid-cols-5');
  } else {
    linkClasses.push('h-full', 'flex', 'flex-col');
  }

  const imageWrapperClasses = [
    'relative',
    'overflow-hidden',
    'bg-gradient-to-br',
    'from-brand-primary/15',
    'via-brand-secondary/10',
    'to-purple-900/20',
  ];

  if (compact) {
    imageWrapperClasses.push('w-24', 'h-24', 'rounded-xl', 'flex-shrink-0');
  } else if (featured) {
    imageWrapperClasses.push('w-full', 'h-56', 'md:h-full', 'md:col-span-2', 'md:rounded-none', 'md:rounded-l-2xl');
  } else {
    imageWrapperClasses.push('w-full', 'h-48', 'rounded-t-2xl');
  }

  const contentClasses = ['flex', 'flex-col', 'gap-3', 'text-left'];
  if (compact) {
    contentClasses.push('flex-1', 'min-w-0');
  } else if (featured) {
    contentClasses.push('p-6', 'md:p-8', 'md:col-span-3', 'h-full');
  } else {
    contentClasses.push('p-6', 'h-full');
  }

  const titleClasses = compact
    ? 'text-sm font-semibold text-light-primary'
    : featured
      ? 'text-2xl md:text-3xl font-extrabold text-light-primary'
      : 'text-xl font-semibold text-light-primary';

  const summaryClasses = featured ? 'text-base text-light-secondary/90' : 'text-sm text-light-secondary';
  const metadataClasses = compact ? 'text-[11px] text-light-secondary/80' : 'text-xs text-light-secondary/80';

  const fallbackInitial = article.title ? article.title.charAt(0).toUpperCase() : 'A';
  const showFeaturedPill = article.isFeatured && !featured;

  return (
    <div ref={tiltRef} className={wrapperClasses.join(' ')}>
      <Link to={`/news/${article.slug}`} className={linkClasses.join(' ')} aria-label={article.title}>
        <div className={imageWrapperClasses.join(' ')}>
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt={article.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-light-primary/60">
              {fallbackInitial}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-secondary/80 via-dark-secondary/15 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        </div>

        <div className={contentClasses.join(' ')}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${categoryBadgeClasses}`}
            >
              {article.category}
            </span>
            {showFeaturedPill && (
              <span className="inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                Featured
              </span>
            )}
          </div>

          <h3 className={titleClasses} style={titleClampStyle}>
            {article.title}
          </h3>

          {!compact && article.summary && (
            <p className={summaryClasses} style={summaryClampStyle}>
              {article.summary}
            </p>
          )}

          <div className={`mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 ${metadataClasses}`}>
            <span className="font-semibold text-light-primary/90">{article.source}</span>
            {publishedDate && (
              <>
                <span className="text-border-dark">•</span>
                <time dateTime={article.publishedAt}>{publishedDate}</time>
              </>
            )}
          </div>

          {!compact && visibleTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {visibleTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-dark bg-dark-secondary/70 px-2.5 py-1 text-xs font-medium text-gray-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
};

export default NewsCard;