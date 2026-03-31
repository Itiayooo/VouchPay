import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { logger } from '../utils/logger';

// ─── Validation middleware ────────────────────────────────────────────────────

export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: (e as any).path, message: e.msg })),
    });
    return;
  }
  next();
};

// ─── 404 handler ─────────────────────────────────────────────────────────────

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

// ─── Global error handler ─────────────────────────────────────────────────────

export const errorHandler = (
  err: Error & { statusCode?: number; code?: number },
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error(`${req.method} ${req.path} → ${err.message}`, {
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  // Mongoose duplicate key
  if (err.code === 11000) {
    res.status(409).json({ success: false, error: 'Duplicate entry — resource already exists' });
    return;
  }

  // Mongoose validation
  if (err.name === 'ValidationError') {
    res.status(422).json({ success: false, error: err.message });
    return;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({ success: false, error: 'Invalid token' });
    return;
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message,
  });
};
