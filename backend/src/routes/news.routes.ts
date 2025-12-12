import { Router } from 'express';
import { body, param, query } from 'express-validator';
import * as newsController from '../controllers/news.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';

const router = Router();

router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('category').optional().isString().trim(),
    query('featured').optional().isBoolean().toBoolean(),
  ],
  validate,
  newsController.getArticles
);

router.get('/featured', newsController.getFeaturedArticles);

router.get('/categories', newsController.getCategories);

router.get(
  '/:slug',
  [param('slug').isString().trim().notEmpty()],
  validate,
  newsController.getArticleBySlug
);

router.post(
  '/',
  authenticate,
  requireAdmin,
  [
    body('title').isString().trim().notEmpty(),
    body('summary').isString().trim().notEmpty(),
    body('content').isString().trim().notEmpty(),
    body('category').isString().trim().notEmpty(),
    body('source').isString().trim().notEmpty(),
    body('sourceUrl').isURL(),
    body('imageUrl').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString().trim(),
    body('publishedAt').optional().isISO8601(),
    body('isFeatured').optional().isBoolean(),
  ],
  validate,
  newsController.createArticle
);

router.patch(
  '/:articleId',
  authenticate,
  requireAdmin,
  [
    param('articleId').isUUID(),
    body('title').optional().isString().trim().notEmpty(),
    body('summary').optional().isString().trim().notEmpty(),
    body('content').optional().isString().trim().notEmpty(),
    body('category').optional().isString().trim().notEmpty(),
    body('source').optional().isString().trim().notEmpty(),
    body('sourceUrl').optional().isURL(),
    body('imageUrl').optional().isString().trim(),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString().trim(),
    body('publishedAt').optional().isISO8601(),
    body('isFeatured').optional().isBoolean(),
  ],
  validate,
  newsController.updateArticle
);

router.delete(
  '/:articleId',
  authenticate,
  requireAdmin,
  [param('articleId').isUUID()],
  validate,
  newsController.deleteArticle
);

router.patch(
  '/:articleId/featured',
  authenticate,
  requireAdmin,
  [param('articleId').isUUID()],
  validate,
  newsController.toggleFeatured
);

export default router;