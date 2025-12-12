import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';

// Type guard to check if error is an instance of AppError
const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

// Type guard to check if error is an instance of Error
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Handle AppError instances
  if (isAppError(err)) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle standard Error instances
  if (isError(err)) {
    // Log unexpected errors
    logger.error('Unexpected error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });

    return res.status(500).json({
      status: 'error',
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Handle non-Error thrown values (strings, objects, etc.)
  logger.error('Non-Error value thrown:', {
    error: err,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      thrownValue: String(err) 
    }),
  });
};
