import { NextFunction, Request, Response } from 'express';
import { ZodType } from 'zod';
import { AppError } from '../utils/AppError';

export const validate = (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
        const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
        return next(new AppError(400, message, 'VALIDATION_ERROR'));
    }
    req.body = result.data;
    next();
};