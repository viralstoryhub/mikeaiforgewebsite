import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
  trackEvent,
  getAnalyticsSummary,
  getGoogleAnalyticsData,
  getRealtimeData,
  getStoredEvents,
} from '../controllers/analytics.controller';

const router = Router();

// Helper to wrap async route handlers and forward errors to Express error handler
const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Public endpoint for tracking events from the frontend (no authentication required for anonymous page views).
 * Expects JSON body with eventName, properties, userId (optional), sessionId, page, referrer, userAgent, ipAddress, etc.
 */
router.post('/track', asyncHandler(trackEvent));

/**
 * Admin-only endpoint returning aggregated analytics summary (from stored events or aggregated sources).
 */
router.get('/summary', authenticate, requireAdmin, asyncHandler(getAnalyticsSummary));

/**
 * Admin-only proxy to Google Analytics Data API (GA4).
 * Accepts query parameters such as startDate, endDate, metrics, dimensions, limit, etc.
 */
router.get('/google-analytics', authenticate, requireAdmin, asyncHandler(getGoogleAnalyticsData));

/**
 * Admin-only endpoint to fetch real-time GA4 data (active users, top pages).
 */
router.get('/google-analytics/realtime', authenticate, requireAdmin, asyncHandler(getRealtimeData));

/**
 * Admin-only endpoint to export Google Analytics data as CSV or PDF.
 * Query params: format (csv|pdf), startDate, endDate
 */
router.get('/google-analytics/export', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Analytics export functionality is not yet implemented. This endpoint is planned for a future release.',
  });
}));

/**
 * Admin-only endpoint to list stored analytics events with pagination and filtering.
 * Query params supported: eventName, userId, startDate, endDate, page, limit, sort
 */
router.get('/events', authenticate, requireAdmin, asyncHandler(getStoredEvents));

export default router;
