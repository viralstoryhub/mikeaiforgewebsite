import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth.middleware';
import logger from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia' as Stripe.LatestApiVersion,
});
const prisma = new PrismaClient();

export const createCheckoutSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRO_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard?canceled=true`,
      metadata: {
        userId: user.id,
      },
    });

    res.json({ status: 'success', data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    next(error);
  }
};

export const createPortalSession = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    if (!user?.stripeCustomerId) {
      throw new AppError('No subscription found', 404);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`,
    });

    res.json({ status: 'success', data: { url: session.url } });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          let paymentMethodLast4: string | undefined;
          let paymentMethodBrand: string | undefined;

          if (typeof subscription.default_payment_method === 'string') {
            const paymentMethod = await stripe.paymentMethods.retrieve(
              subscription.default_payment_method
            );
            paymentMethodLast4 = paymentMethod.card?.last4;
            paymentMethodBrand = paymentMethod.card?.brand;
          } else if (subscription.default_payment_method && 'card' in subscription.default_payment_method) {
            paymentMethodLast4 = subscription.default_payment_method.card?.last4;
            paymentMethodBrand = subscription.default_payment_method.card?.brand;
          }

          await prisma.user.update({
            where: { id: userId },
            data: {
              subscriptionTier: 'PRO',
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              paymentMethodLast4,
              paymentMethodBrand,
            },
          });

          logger.info(`Subscription activated for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionTier: 'FREE',
            stripeSubscriptionId: null,
          },
        });
        logger.info(`Subscription canceled: ${subscription.id}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;

        await prisma.user.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            subscriptionTier: status === 'active' ? 'PRO' : 'FREE',
          },
        });
        break;
      }
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook error:', error);
    next(error);
  }
};