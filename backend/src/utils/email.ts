import sgMail from '@sendgrid/mail';
import logger from './logger';

const sendgridApiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'noreply@mikesaiforge.com';

// Only initialize SendGrid if API key is provided
if (sendgridApiKey) {
  sgMail.setApiKey(sendgridApiKey);
  logger.info('SendGrid email service initialized');
} else {
  logger.warn('SENDGRID_API_KEY not set - email functionality will be disabled');
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions) => {
  if (!sendgridApiKey) {
    logger.warn(`Email sending skipped (no API key): ${options.subject} to ${options.to}`);
    return;
  }
  
  try {
    await sgMail.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info(`Email sent to ${options.to}`);
  } catch (error: unknown) {
    logger.error('Email sending failed:', {
      error: error instanceof Error ? error.message : error,
    });
    throw (error instanceof Error ? error : new Error('Failed to send email'));
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  await sendEmail({
    to: email,
    subject: "Welcome to Mike's AI Forge!",
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for joining Mike's AI Forge. We're excited to have you on board.</p>
      <p>Get started by exploring our AI tools and utilities.</p>
    `,
    text: `Welcome ${name}!\n\nThank you for joining Mike's AI Forge. We're excited to have you on board.\n\nGet started by exploring our AI tools and utilities.`,
  });
};

export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  await sendEmail({
    to: email,
    subject: 'Password Reset Request',
    html: `
      <h1>Password Reset</h1>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    text: `Password Reset\n\nYou requested a password reset. Use the link below to reset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\nIf you didn't request this, please ignore this email.`,
  });
};

export const sendEmailVerification = async (email: string, verificationToken: string) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify Your Email',
    html: `
      <h1>Email Verification</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Email Verification\n\nPlease verify your email address using the link below:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};
