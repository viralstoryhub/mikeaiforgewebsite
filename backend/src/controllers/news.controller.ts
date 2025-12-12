import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

const ensureAdmin = (req: AuthRequest) => {
  if (!req.user) {
    throw new AppError('Authentication required', 401);
  }
  if (req.user.role !== 'ADMIN') {
    throw new AppError('Admin access required', 403);
  }
};

const buildSlugBase = (input: string): string => {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `article-${Date.now()}`;
};

const generateUniqueSlug = async (title: string, excludeId?: string) => {
  const baseSlug = buildSlugBase(title);
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const existing = await prisma.newsArticle.findUnique({ where: { slug: candidate } });
    if (!existing || (excludeId && existing.id === excludeId)) {
      break;
    }
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

const normalizeTags = (input: unknown): string => {
  if (Array.isArray(input)) {
    return input.map((tag) => String(tag).trim()).filter(Boolean).join(', ');
  }

  if (typeof input === 'string') {
    return input
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(', ');
  }

  return '';
};

const toDate = (value: unknown, fieldName: string): Date => {
  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${fieldName}`, 400);
  }
  return date;
};

export const getArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page = '1', limit = '10', category, featured } = req.query;

    const pageNumber = Math.max(parseInt(page as string, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit as string, 10) || 10, 1), 100);

    const filters: Prisma.NewsArticleWhereInput = {};

    if (category) {
      const categoryValue = Array.isArray(category) ? category[0] : category;
      filters.category = categoryValue;
    }

    if (typeof featured !== 'undefined') {
      const featuredValue = Array.isArray(featured) ? featured[0] : featured;
      filters.isFeatured = featuredValue === 'true';
    }

    const [items, total] = await Promise.all([
      prisma.newsArticle.findMany({
        where: filters,
        orderBy: { publishedAt: 'desc' },
        skip: (pageNumber - 1) * perPage,
        take: perPage,
      }),
      prisma.newsArticle.count({ where: filters }),
    ]);

    // Transform tags from string to array for frontend
    const transformedItems = items.map(item => ({
      ...item,
      tags: item.tags ? item.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }));

    res.json({
      status: 'success',
      data: {
        items: transformedItems,
        pagination: {
          page: pageNumber,
          limit: perPage,
          total,
          totalPages: total > 0 ? Math.ceil(total / perPage) : 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getArticleBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;

    const article = await prisma.newsArticle.findUnique({
      where: { slug },
    });

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    res.json({
      status: 'success',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limitParam = req.query.limit;
    const limit = Math.min(Math.max(parseInt((limitParam as string) ?? '5', 10) || 5, 1), 10);

    const articles = await prisma.newsArticle.findMany({
      where: { isFeatured: true },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    res.json({
      status: 'success',
      data: articles,
    });
  } catch (error) {
    next(error);
  }
};

export const createArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ensureAdmin(req);

    const {
      title,
      summary,
      content,
      imageUrl,
      source,
      sourceUrl,
      category,
      tags,
      publishedAt,
      isFeatured = false,
    } = req.body;

    if (!title || !summary || !content || !source || !category) {
      throw new AppError('Title, summary, content, source, and category are required', 400);
    }

    const slug = await generateUniqueSlug(title);
    const publishedAtDate = publishedAt ? toDate(publishedAt, 'publishedAt') : new Date();
    const tagsArray = normalizeTags(tags);

    const article = await prisma.newsArticle.create({
      data: {
        title,
        slug,
        summary,
        content,
        imageUrl: imageUrl ?? null,
        source,
        sourceUrl: sourceUrl ?? null,
        category,
        tags: tagsArray,
        publishedAt: publishedAtDate,
        isFeatured: Boolean(isFeatured),
      },
    });

    res.status(201).json({
      status: 'success',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

export const updateArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ensureAdmin(req);

    const { articleId } = req.params;
    const existing = await prisma.newsArticle.findUnique({ where: { id: articleId } });

    if (!existing) {
      throw new AppError('Article not found', 404);
    }

    const {
      title,
      summary,
      content,
      imageUrl,
      source,
      sourceUrl,
      category,
      tags,
      publishedAt,
      isFeatured,
    } = req.body;

    const updateData: Prisma.NewsArticleUpdateInput = {};

    if (title && title !== existing.title) {
      updateData.title = title;
      updateData.slug = await generateUniqueSlug(title, existing.id);
    } else if (title) {
      updateData.title = title;
    }

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (content !== undefined) {
      updateData.content = content;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl ?? null;
    }

    if (source !== undefined) {
      updateData.source = source;
    }

    if (sourceUrl !== undefined) {
      updateData.sourceUrl = sourceUrl ?? null;
    }

    if (category !== undefined) {
      updateData.category = category;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'tags')) {
      updateData.tags = normalizeTags(tags);
    }

    if (publishedAt !== undefined) {
      updateData.publishedAt = toDate(publishedAt, 'publishedAt');
    }

    if (typeof isFeatured === 'boolean') {
      updateData.isFeatured = isFeatured;
    }

    const updatedArticle = await prisma.newsArticle.update({
      where: { id: articleId },
      data: updateData,
    });

    res.json({
      status: 'success',
      data: updatedArticle,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteArticle = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ensureAdmin(req);

    const { articleId } = req.params;

    const existing = await prisma.newsArticle.findUnique({ where: { id: articleId } });

    if (!existing) {
      throw new AppError('Article not found', 404);
    }

    await prisma.newsArticle.delete({ where: { id: articleId } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const toggleFeatured = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    ensureAdmin(req);

    const { articleId } = req.params;

    const article = await prisma.newsArticle.findUnique({ where: { id: articleId } });

    if (!article) {
      throw new AppError('Article not found', 404);
    }

    const updated = await prisma.newsArticle.update({
      where: { id: articleId },
      data: { isFeatured: !article.isFeatured },
    });

    res.json({
      status: 'success',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const groups = await prisma.newsArticle.groupBy({
      by: ['category'],
      _count: { _all: true },
    });

    const categories = groups
      .filter((group) => Boolean(group.category))
      .map((group) => ({
        category: group.category,
        articleCount: group._count._all,
      }))
      .sort((a, b) => a.category.localeCompare(b.category));

    res.json({
      status: 'success',
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
