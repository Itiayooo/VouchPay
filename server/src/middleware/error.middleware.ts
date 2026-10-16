import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export function notFound(req: Request, _res: Response, next: NextFunction) {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ success: false, message: err.message, code: err.code });
    }
    console.error(err);
    res.status(500).json({
        success: false,
        message: 'Something went wrong',
        ...(process.env.NODE_ENV === 'development' && { detail: String(err) }),
    });
}