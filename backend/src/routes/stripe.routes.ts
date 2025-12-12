import { Router } from 'express';
import express from 'express';
import * as stripeController from '../controllers/stripe.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/create-checkout-session', authenticate, stripeController.createCheckoutSession);
router.post('/create-portal-session', authenticate, stripeController.createPortalSession);

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeController.handleWebhook
);

export default router;